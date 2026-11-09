// GPU context loss: Android WebViews drop the WebGL context when the GPU process restarts or memory runs short
// (often after the app sat in the background). The game must come back looking the same: the same frame before
// the loss and after the restore, in play (sky reflections, static shadows) and in the garage, with no errors.
//   node scripts/ctxloss.cjs            (dev server on 5173; URL= to point elsewhere)
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://127.0.0.1:5173/';
const OUT = process.env.OUT || '';
const log = (s) => { if (process.env.VERBOSE) console.log('  · ' + s); };
const LEVELS = (process.env.LEVELS ?? '1,31,91').split(',').filter(Boolean).map(Number);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 1, userAgent: 'Mozilla/5.0 (Linux; Android 13) Mobile' });
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  if (process.env.VERBOSE) p.on('console', (m) => { if (/webgl|context|three/i.test(m.text())) console.log(`  · [${m.type()}] ${m.text().slice(0, 160)}`); });
  p.on('console', (m) => { if (m.type() === 'error' && !/GL Driver|favicon|CONTEXT_LOST/i.test(m.text())) errors.push('console: ' + m.text()); });
  await p.goto(URL + '?play&shot', { waitUntil: 'load' });
  log('loaded');
  await p.waitForFunction(() => document.title === 'ready', null, { timeout: 300000 });
  log('booted');
  // Mean absolute difference (0–255) between two PNG screenshots, over the board area (between the HUD bars).
  const diff = async (a, c, f0 = 0.2, f1 = 0.8) => p.evaluate(async ([a, c, f0, f1]) => {
    const load = (s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + s; });
    const [ia, ic] = await Promise.all([load(a), load(c)]);
    const px = (im) => { const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height; const g = cv.getContext('2d'); g.drawImage(im, 0, 0); return g.getImageData(0, 0, im.width, im.height).data; };
    const da = px(ia), dc = px(ic), y0 = Math.round(ia.height * f0) * ia.width * 4, y1 = Math.round(ia.height * f1) * ia.width * 4;
    let s = 0, n = 0, la = 0, lc = 0;
    for (let i = y0; i < y1; i += 4) { for (let k = 0; k < 3; k++) s += Math.abs(da[i + k] - dc[i + k]); n += 3; la += da[i] + da[i + 1] + da[i + 2]; lc += dc[i] + dc[i + 1] + dc[i + 2]; }
    return { mad: s / n, before: la / n, after: lc / n };
  }, [a.toString('base64'), c.toString('base64'), f0, f1]);
  const freeze = () => p.evaluate(async () => { const rb = window.__rb; await rb.advance(0.05, true); });
  // Lose the context of a canvas (the main view by default), let the game run a moment, restore it.
  // Returns what went wrong, or '' when the context came back.
  const loseAndRestore = (sel) => p.evaluate(async (sel) => {
    const rb = window.__rb, cv = sel ? document.querySelector(sel) : rb.renderer.domElement;
    if (!cv) return 'no canvas';
    const gl = sel ? (cv.getContext('webgl2') || cv.getContext('webgl')) : rb.renderer.getContext(), ext = gl?.getExtension('WEBGL_lose_context');
    if (!ext) return 'no WEBGL_lose_context';
    const within = (ev, ms) => new Promise((r) => { const t = setTimeout(() => r(false), ms); cv.addEventListener(ev, () => { clearTimeout(t); r(true); }, { once: true }); });
    const lost = within('webglcontextlost', 5000);
    ext.loseContext();
    if (!(await lost)) return 'no contextlost event';
    // Chrome records that restoring is allowed (three.js called preventDefault) only after the lost event's dispatch
    // returns: restoring from a microtask inside it is refused, so give it a task first.
    await new Promise((r) => setTimeout(r, 50));
    if (!sel) await rb.advance(0.3, true); // the game keeps running (and drawing) while the context is gone
    const back = within('webglcontextrestored', 10000);
    ext.restoreContext();
    if (!(await back)) return 'no contextrestored event';
    await new Promise((r) => setTimeout(r, 300));
    return gl.isContextLost() ? 'still lost' : '';
  }, sel);
  let fails = 0;
  const check = (name, d, max = 6) => { const ok = d.mad <= max; if (!ok) fails++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: mean diff ${d.mad.toFixed(1)} (max ${max}), brightness ${d.before.toFixed(0)} -> ${d.after.toFixed(0)}`); };
  for (const L of LEVELS) {
    await p.evaluate(async (L) => {
      const rb = window.__rb;
      rb.save.seen = Object.fromEntries(['spot', 'cover', 'broken', 'vip', 'oddEven', 'courier', 'ch2', 'ch3', 'ch4', 'ch5'].map((k) => [k, true])); for (let k = 0; k < 400; k++) rb.save.seen['boss' + k] = true;
      document.querySelectorAll('.modal-back').forEach((m) => m.remove());
      await rb.goLevel(L - 1, undefined, false);
      document.querySelectorAll('.modal-back').forEach((m) => m.remove());
      await rb.advance(2, true);
      // The idle hint's hand and spotlight would differ between the two shots: keep them out of the comparison.
      document.querySelectorAll('.hand, .spot, .mark').forEach((e) => (e.style.visibility = 'hidden'));
    }, L);
    log(`L${L} ready`);
    await freeze();
    const a = await p.screenshot();
    log('lose');
    const why = await loseAndRestore();
    log('restored');
    if (why) { fails++; console.log(`FAIL L${L}: ${why}`); continue; }
    await freeze();
    const c = await p.screenshot();
    if (OUT) { require('fs').writeFileSync(`${OUT}/ctx_L${L}_before.png`, a); require('fs').writeFileSync(`${OUT}/ctx_L${L}_after.png`, c); }
    check(`level ${L} after a context loss`, await diff(a, c));
  }
  // The garage's turntable has its own renderer (shared with the agency yard) and its own sky reflections.
  const g = await p.evaluate(async () => {
    const rb = window.__rb;
    document.querySelectorAll('.modal-back').forEach((m) => m.remove());
    rb.cards.garage();
    await new Promise((r) => setTimeout(r, 1000));
    document.querySelectorAll('.hand, .spot, .mark').forEach((e) => (e.style.visibility = 'hidden'));
    return !!document.querySelector('.garage .stage canvas');
  });
  log('garage open: ' + g);
  if (g) {
    const redraw = () => p.evaluate(async () => { const n = document.querySelectorAll('.garage .gnav button'); n[1].click(); n[0].click(); await new Promise((r) => setTimeout(r, 300)); });
    await redraw();
    const box = await (await p.$('.garage .stage canvas')).boundingBox();
    const a = await p.screenshot({ clip: box });
    log('garage: lose');
    const why = await loseAndRestore('.garage .stage canvas');
    log('garage: ' + (why || 'restored'));
    if (why) { fails++; console.log(`FAIL garage: ${why}`); }
    await redraw();
    const c = await p.screenshot({ clip: box });
    if (OUT) { require('fs').writeFileSync(`${OUT}/ctx_garage_before.png`, a); require('fs').writeFileSync(`${OUT}/ctx_garage_after.png`, c); }
    check('garage after a context loss', await diff(a, c, 0, 1), 6);
  } else { fails++; console.log('FAIL garage view not found'); }
  const logged = await p.evaluate(() => window.__rb.errors?.() ?? []);
  if (errors.length || logged.length) { fails++; console.log('errors:', [...new Set(errors)].slice(0, 5), logged.slice(0, 5)); }
  // A context that never comes back: the game reloads from the save within a few seconds (instead of a dead screen).
  await p.evaluate(() => document.querySelectorAll('.modal-back').forEach((m) => m.remove()));
  const t0 = Date.now();
  const nav = p.waitForEvent('framenavigated', { timeout: 20000 }).then(() => true, () => false);
  await p.evaluate(() => { window.__lost = window.__rb.renderer.getContext().getExtension('WEBGL_lose_context'); window.__lost.loseContext(); });
  const reloaded = await nav;
  if (!reloaded) fails++;
  console.log(`${reloaded ? 'ok  ' : 'FAIL'} context never restored: ${reloaded ? `reloaded after ${((Date.now() - t0) / 1000).toFixed(1)} s` : 'no reload in 20 s'}`);
  console.log(fails ? `${fails} failure(s)` : 'all ok');
  await b.close();
  process.exit(fails ? 1 : 0);
})();
