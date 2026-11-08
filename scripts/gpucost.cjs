// What each part of the scene costs to draw: SwiftShader renders on the CPU, so render+gl.finish() time is a
// rough stand-in for a weak phone GPU. Hides one group at a time and reports the time saved.
//   node scripts/gpucost.cjs [level=60] [dpr=1] [query=]
const { chromium } = require('playwright');
(async () => {
  const [level = '60', dpr = '1', query = ''] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: +dpr, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36' });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('err:', e.message));
  await p.goto(`http://127.0.0.1:5173/?shot&play&${query}`);
  await p.waitForFunction(() => document.title === 'ready', null, { timeout: 600000 });
  const out = await p.evaluate(async (n) => {
    const r = window.__rb;
    document.querySelectorAll('.modal-back').forEach((m) => m.remove());
    r.save.level = Math.max(r.save.level, n); r.startLevel(n);
    await r.advance(0.5);
    const gl = r.renderer.getContext();
    const time = (k = 6) => { r.post.render(r.scene, r.camera); gl.finish(); const t = performance.now(); for (let i = 0; i < k; i++) r.post.render(r.scene, r.camera); gl.finish(); return (performance.now() - t) / k; };
    r.renderer.info.autoReset = false; r.renderer.info.reset(); r.post.render(r.scene, r.camera);
    const info = { calls: r.renderer.info.render.calls, tris: r.renderer.info.render.triangles, programs: r.renderer.info.programs.length, geos: r.renderer.info.memory.geometries, tex: r.renderer.info.memory.textures };
    r.renderer.info.autoReset = true;
    const base = time();
    const s = r.session(), world = s.worldGroup;
    const rows = [];
    const test = (name, objs) => { const was = objs.map((o) => o.visible); objs.forEach((o) => (o.visible = false)); const t = time(); objs.forEach((o, i) => (o.visible = was[i])); rows.push([name, base - t]); };
    // Top-level world parts, by name or type.
    world.children.forEach((c, i) => test(`world[${i}] ${c.name || c.type}${c.isMesh ? ' ' + (c.material?.type ?? '') : ''} (${c.children?.length ?? 0})`, [c]));
    const cars = s.cars.map((c) => c.root);
    test('cars', cars);
    test('session other', s.group.children.filter((c) => c !== world && !cars.includes(c)));
    const sh = r.renderer.shadowMap.enabled; r.renderer.shadowMap.enabled = false; r.scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; }); const tn = time(); r.renderer.shadowMap.enabled = sh; r.scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; }); time(); rows.push(['shadow receive', base - tn]);
    return { base, info, rows: rows.filter((x) => Math.abs(x[1]) > base * 0.01).sort((a, b) => b[1] - a[1]) };
  }, +level - 1);
  console.log(`frame ${out.base.toFixed(1)} ms  ${JSON.stringify(out.info)}`);
  for (const [k, v] of out.rows) console.log(`${v.toFixed(1).padStart(7)} ms ${(100 * v / out.base).toFixed(0).padStart(4)}%  ${k}`);
  await b.close();
})();
