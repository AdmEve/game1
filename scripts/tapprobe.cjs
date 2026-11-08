// Tap accuracy probe. Samples screen points over every car in the lot and compares the car the game picks
// with the car actually drawn there (the first real car mesh the ray hits; `?noinst` keeps real meshes).
// The old ground-cell pick is measured alongside for comparison.
//   node scripts/tapprobe.cjs            (dev server on 127.0.0.1:5173)
//   URL=http://127.0.0.1:4173/ LEVELS=5,200 node scripts/tapprobe.cjs
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://127.0.0.1:5173/';
const LEVELS = (process.env.LEVELS || '5,30,60,120,200,239').split(',').map(Number);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 1, userAgent: 'Mozilla/5.0 (Linux; Android 12) Mobile' });
  await p.goto(URL + '?play&shot&noinst', { waitUntil: 'load' });
  await p.waitForFunction(() => document.title === 'ready', null, { timeout: 120000 });
  const q = await b.newPage({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 1, userAgent: 'Mozilla/5.0 (Linux; Android 12) Mobile' });
  await q.goto(URL + '?play&shot', { waitUntil: 'load' });
  await q.waitForFunction(() => document.title === 'ready', null, { timeout: 120000 });
  let fails = 0;
  for (const L of LEVELS) {
    await p.evaluate((L) => window.__rb.startLevel(L, undefined, false), L);
    const r = await p.evaluate(() => {
      const rb = window.__rb, s = rb.session(), cam = rb.camera;
      rb.scene.updateMatrixWorld(true); cam.updateMatrixWorld();
      const V = cam.position.constructor;
      const W = innerWidth, H = innerHeight;
      const cars = s.cars;
      const rc = new rb.Raycaster();
      let Mesh = null; rb.scene.traverse((o) => { if (!Mesh && o.isMesh && !o.isInstancedMesh) Mesh = o.constructor; });
      const rayAt = (x, y) => { rc.setFromCamera({ x: (x / W) * 2 - 1, y: -(y / H) * 2 + 1 }, cam); return rc.ray; };
      // The old pick: the lot cell under the point where the ray meets y = 0.45.
      const oldPick = (x, y) => {
        const r = rayAt(x, y), t = (0.45 - r.origin.y) / r.direction.y;
        return t < 0 ? -1 : s.vehicleAt(r.origin.clone().addScaledVector(r.direction, t));
      };
      // What is drawn there: the nearest car mesh hit (body, cover, arrow, badges; not the shadow blob).
      const truth = (x, y) => {
        rayAt(x, y);
        let best = -1, bd = Infinity;
        cars.forEach((c, i) => {
          if (!s.s.inLot[i]) return;
          const meshes = [];
          c.root.traverseVisible((o) => {
            if (o.userData.noPick) return;
            if (o.isMesh || o.isSprite) meshes.push(o);
            // Parts that are always drawn instanced (covers): test them as the mesh they stand for.
            else if (o.isSlot) { const m = new Mesh(o.batch.geometry, o.batch.material); m.matrixWorld.copy(o.matrixWorld); m.matrixAutoUpdate = false; m.matrixWorldAutoUpdate = false; meshes.push(m); }
          });
          const h = rc.intersectObjects(meshes, false)[0];
          if (h && h.distance < bd) { bd = h.distance; best = i; }
        });
        return best;
      };
      const tally = () => ({ ok: 0, wrong: 0, none: 0 });
      const now = tally(), was = tally();
      let n = 0; const pts = [];
      cars.forEach((c, i) => {
        if (!s.s.inLot[i]) return;
        for (let a = 0; a < 6; a++) for (let q = 0; q < 6; q++) for (let k = 0; k < 3; k++) {
          const lp = new V(
            c.box.min.x + (c.box.max.x - c.box.min.x) * (0.05 + 0.9 * a / 5),
            c.box.min.y + (c.box.max.y - c.box.min.y) * (0.15 + 0.85 * k / 2),
            c.box.min.z + (c.box.max.z - c.box.min.z) * (0.05 + 0.9 * q / 5));
          const wp = lp.applyMatrix4(c.body.matrixWorld).project(cam);
          const x = ((wp.x + 1) / 2) * W, y = ((1 - wp.y) / 2) * H;
          if (truth(x, y) !== i) continue; // not drawn here (gap, or another car in front)
          n++; pts.push([x, y, i]);
          for (const [pick, t] of [[rb.pick(x, y), now], [oldPick(x, y), was]]) {
            if (pick === i) t.ok++; else if (pick < 0) t.none++; else t.wrong++;
          }
        }
      });
      const pc = (t) => ({ ok: 100 * t.ok / n, wrong: 100 * t.wrong / n, none: 100 * t.none / n });
      return { n, cars: cars.length, now: pc(now), was: pc(was), pts };
    });
    const f = (t) => `right ${t.ok.toFixed(1)}%  wrong ${t.wrong.toFixed(1)}%  nothing ${t.none.toFixed(1)}%`;
    console.log(`L${L + 1} (${r.cars} cars, ${r.n} points)\n  now: ${f(r.now)}\n  old: ${f(r.was)}`);
    // The same points in the normal (instanced) build: its pick tests slots, not real meshes.
    await q.evaluate((L) => window.__rb.startLevel(L, undefined, false), L);
    const inst = await q.evaluate((pts) => {
      const rb = window.__rb; rb.scene.updateMatrixWorld(true); rb.camera.updateMatrixWorld();
      let ok = 0; const t0 = performance.now();
      for (const [x, y, i] of pts) if (rb.pick(x, y) === i) ok++;
      return { ok: 100 * ok / pts.length, ms: (performance.now() - t0) / pts.length };
    }, r.pts);
    console.log(`  instanced build: right ${inst.ok.toFixed(1)}%  (${inst.ms.toFixed(2)} ms per pick)`);
    if (r.now.ok < 98 || r.now.wrong > 1 || inst.ok < 98) fails++;
  }
  await b.close();
  if (fails) { console.log(`${fails} level(s) below 98% right / above 1% wrong`); process.exitCode = 1; }
})();
