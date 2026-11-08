// Real-loop frame rate under variations, to find what holds the frame back:
//   node scripts/fpsprobe.cjs [level=60] [dpr=1]
const { chromium } = require('playwright');
(async () => {
  const [level = '60', dpr = '1'] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: +dpr, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36' });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('err:', e.message));
  p.on('console', (m) => console.log('console:', m.text()));
  await p.goto('http://127.0.0.1:5173/?play');
  await p.waitForFunction(() => document.title === 'ready', null, { timeout: 600000 });
  await p.evaluate((n) => { const r = window.__rb; document.querySelectorAll('.modal-back').forEach((m) => m.remove()); r.save.level = Math.max(r.save.level, n); r.startLevel(n); }, +level - 1);
  await p.waitForTimeout(3000);
  const fps = (setup) => p.evaluate(async (setup) => {
    const r = window.__rb; const undo = new Function('r', setup)(r);
    await new Promise((ok) => setTimeout(ok, 300));
    let n = 0, t0 = 0; const ts = [];
    await new Promise((ok) => { const f = (t) => { ts.push(t); if (++n < 40) requestAnimationFrame(f); else ok(); }; requestAnimationFrame(f); });
    if (typeof undo === 'function') undo();
    const d = ts.slice(1).map((t, i) => t - ts[i]).sort((a, b) => a - b);
    return `p50 ${d[d.length >> 1].toFixed(1)} ms  max ${d[d.length - 1].toFixed(0)}`;
  }, setup);
  const cases = {
    normal: '',
    'no render': 'const f = r.post.render; r.post.render = () => {}; return () => { r.post.render = f; };',
    'no hud': 'document.querySelector(".hud").style.display = "none"; return () => { document.querySelector(".hud").style.display = ""; };',
    'no vignette': 'document.body.classList.remove("lite"); return () => document.body.classList.add("lite");',
    'no shadows': 'r.renderer.shadowMap.enabled = false; r.scene.traverse((o) => o.material && (o.material.needsUpdate = true)); return () => { r.renderer.shadowMap.enabled = true; r.scene.traverse((o) => o.material && (o.material.needsUpdate = true)); };',
    'no world': 'const w = r.session().worldGroup; w.visible = false; return () => (w.visible = true);',
    'no cars': 'const c = r.session().cars.map((x) => x.root); c.forEach((x) => (x.visible = false)); return () => c.forEach((x) => (x.visible = true));',
    'half res': 'const pr = r.renderer.getPixelRatio(); r.renderer.setPixelRatio(pr / 2); return () => r.renderer.setPixelRatio(pr);',
  };
  for (const [k, v] of Object.entries(cases)) console.log(k.padEnd(12), await fps(v));
  const info = await p.evaluate(() => { const r = window.__rb; return { pr: r.renderer.getPixelRatio(), size: [r.renderer.domElement.width, r.renderer.domElement.height], post: r.post.enabled, lite: document.body.classList.contains('lite') }; });
  console.log(JSON.stringify(info));
  await b.close();
})();
