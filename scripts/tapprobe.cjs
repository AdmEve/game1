// Tap accuracy probe: for each car, sample screen points on its visible body; compare what the game's
// ground-cell pick returns with the car the ray actually hits first (car boxes as the visible shape).
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://127.0.0.1:5173/';
const LEVELS = (process.env.LEVELS || '5,30,60,120,200,239').split(',').map(Number);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 1, userAgent: 'Mozilla/5.0 (Linux; Android 12) Mobile' });
  await p.goto(URL + '?play&shot', { waitUntil: 'load' });
  await p.waitForFunction(() => document.title === 'ready', null, { timeout: 120000 });
  for (const L of LEVELS) {
    await p.evaluate((L) => window.__rb.startLevel(L, undefined, false), L);
    const r = await p.evaluate((mode) => {
      const rb = window.__rb, s = rb.session(), cam = rb.camera;
      cam.updateMatrixWorld();
      const V = cam.position.constructor, M = cam.matrixWorld.constructor;
      const W = innerWidth, H = innerHeight;
      const cars = s.cars;
      const groundPick = (x, y) => {
        const o = new V().setFromMatrixPosition(cam.matrixWorld);
        const d = new V((x / W) * 2 - 1, -(y / H) * 2 + 1, 0.5).unproject(cam).sub(o).normalize();
        const t = (0.45 - o.y) / d.y; if (t < 0) return -1;
        return s.vehicleAt(o.clone().addScaledVector(d, t));
      };
      const boxHit = (x, y) => {
        const o = new V().setFromMatrixPosition(cam.matrixWorld);
        const d = new V((x / W) * 2 - 1, -(y / H) * 2 + 1, 0.5).unproject(cam).sub(o).normalize();
        let best = -1, bt = Infinity;
        cars.forEach((c, i) => {
          if (!s.s.inLot[i]) return;
          c.root.updateMatrixWorld();
          const inv = new M().copy(c.root.matrixWorld).invert();
          const lo = o.clone().applyMatrix4(inv), ld = o.clone().add(d).applyMatrix4(inv).sub(lo);
          let t0 = -Infinity, t1 = Infinity;
          for (const k of ['x', 'y', 'z']) {
            const a = (c.box.min[k] - lo[k]) / ld[k], bb = (c.box.max[k] - lo[k]) / ld[k];
            t0 = Math.max(t0, Math.min(a, bb)); t1 = Math.min(t1, Math.max(a, bb));
          }
          if (t1 >= t0 && t0 > 0 && t0 < bt) { bt = t0; best = i; }
        });
        return best;
      };
      let n = 0, ok = 0, miss = 0, wrong = 0;
      cars.forEach((c, i) => {
        if (!s.s.inLot[i]) return;
        // Sample a 5x5 grid over the projected box (shrunk to its inner 70%) and keep points whose first hit is this car.
        const pts = [];
        for (let a = 0; a < 5; a++) for (let bq = 0; bq < 5; bq++) for (let cq = 0; cq < 3; cq++) {
          const lp = new V(
            c.box.min.x + (c.box.max.x - c.box.min.x) * (0.15 + 0.7 * a / 4),
            c.box.min.y + (c.box.max.y - c.box.min.y) * (0.2 + 0.8 * cq / 2),
            c.box.min.z + (c.box.max.z - c.box.min.z) * (0.15 + 0.7 * bq / 4));
          const wp = lp.applyMatrix4(c.root.matrixWorld).project(cam);
          pts.push([((wp.x + 1) / 2) * W, ((1 - wp.y) / 2) * H]);
        }
        for (const [x, y] of pts) {
          if (boxHit(x, y) !== i) continue; // hidden behind another car
          n++;
          const g = groundPick(x, y);
          if (g === i) ok++; else if (g < 0) miss++; else wrong++;
        }
      });
      return { n, ok, miss, wrong, cars: cars.length };
    });
    console.log(`L${L + 1}: cars=${r.cars} samples=${r.n} right=${(100 * r.ok / r.n).toFixed(1)}% nothing=${(100 * r.miss / r.n).toFixed(1)}% WRONG car=${(100 * r.wrong / r.n).toFixed(1)}%`);
  }
  await b.close();
})();
