//   node scripts/draws.cjs [0,59,239]   (0-based level indices)
// Draw calls and triangles per level (phone 'lite' profile), and how many come from sprites (badges).
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 360, height: 740 }, userAgent: 'Mozilla/5.0 (Linux; Android 12) Mobile' });
  await p.goto('http://127.0.0.1:5173/?play&shot', { waitUntil: 'load' });
  await p.waitForFunction(() => document.title === 'ready', null, { timeout: 120000 });
  for (const L of (process.argv[2] || '0,21,59,92,121,152,182,212,239').split(',').map(Number)) {
    const r = await p.evaluate(async (L) => {
      const rb = window.__rb; rb.startLevel(L, undefined, false); document.querySelectorAll('.modal-back').forEach((m) => m.remove());
      await rb.advance(0.1);
      rb.renderer.info.autoReset = false; rb.renderer.info.reset();
      rb.post.render(rb.scene, rb.camera, 1 / 30);
      const info = rb.renderer.info.render;
      let sprites = 0, spriteVis = 0; rb.scene.traverseVisible((o) => { if (o.isSprite) spriteVis++; });
      rb.renderer.info.autoReset = true;
      return { calls: info.calls, tris: Math.round(info.triangles / 1000), sprites: spriteVis, cars: rb.session().level.vehicles.length };
    }, L);
    console.log(`L${L + 1}: ${r.calls} draws, ${r.tris}k tris, ${r.sprites} sprites, ${r.cars} cars`);
  }
  await b.close();
})();
