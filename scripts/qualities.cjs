// Every graphics quality setting must boot, render a full level and play a few taps without errors; reports the
// render profile, pixel ratio, draw calls and triangles each one costs (phone user agent).
//   node scripts/qualities.cjs
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://127.0.0.1:5173/';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  let fails = 0;
  for (const q of ['auto', 'high', 'balanced', 'low']) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 13) Mobile' });
    const p = await ctx.newPage();
    const errors = []; p.on('pageerror', (e) => errors.push(e.message));
    await p.addInitScript((q) => localStorage.setItem('rahbandoon.save.v1', JSON.stringify({ level: 59, coins: 500, seen: { spot: true, ch2: true }, settings: { quality: q } })), q);
    await p.goto(URL + '?play', { waitUntil: 'load' }); // not ?shot: screenshot mode keeps a fixed 3x ratio
    const ok = await p.waitForFunction(() => document.title === 'ready', null, { timeout: 240000 }).then(() => true).catch(() => false);
    if (!ok) { fails++; console.log(`FAIL ${q}: did not boot`, errors.slice(0, 2)); await ctx.close(); continue; }
    const r = await p.evaluate(async () => {
      const rb = window.__rb; document.querySelectorAll('.modal-back').forEach((m) => m.remove());
      const s = rb.session(), moves = rb.solve(s.level);
      for (const m of moves.slice(0, 4)) { s.tap(m); await rb.advance(0.6, false); }
      const R = rb.renderer; R.info.autoReset = false; R.info.reset(); rb.post.render(rb.scene, rb.camera, 1 / 30);
      const info = { calls: R.info.render.calls, tris: Math.round(R.info.render.triangles / 1000), pr: +R.getPixelRatio().toFixed(2), shadows: R.shadowMap.enabled, lite: document.body.classList.contains('lite') };
      R.info.autoReset = true;
      return info;
    });
    const bad = errors.length > 0;
    if (bad) fails++;
    console.log(`${bad ? 'FAIL' : 'ok  '} ${q.padEnd(9)} ${r.lite ? 'lite' : 'full'} profile, pixel ratio ${r.pr}, shadows ${r.shadows ? 'on' : 'off'}, ${r.calls} draws, ${r.tris}k tris${bad ? '  errors: ' + errors.slice(0, 2).join(' | ') : ''}`);
    await ctx.close();
  }
  await b.close();
  if (fails) process.exitCode = 1;
})();
