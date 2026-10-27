// Plays levels by tapping every free car in quick succession and checks, frame by frame, that no two
// cars on the road overlap (oriented-rectangle test).   node scripts/overlap.cjs 5 41 95
const { chromium } = require('playwright');
(async () => {
  const levels = process.argv.slice(2).map(Number);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.goto('http://127.0.0.1:5173/?shot&play');
  await p.waitForFunction(() => document.title === 'ready', null, { timeout: 240000 });
  let bad = 0;
  for (const n of levels) {
    const res = await p.evaluate(async (n) => {
      const r = window.__rb;
      document.querySelectorAll('.modal-back').forEach((m) => m.remove());
      r.save.seen = new Proxy({}, { get: () => true });
      r.save.level = n - 1; r.startLevel();
      const s = r.session();
      const { solve } = await import('/src/game/solver.ts');
      const sol = solve(s.level).solution;
      const rect = (o, len) => { const c = Math.cos(o.root.rotation.y), sn = Math.sin(o.root.rotation.y); return { x: o.root.position.x, z: o.root.position.z, ax: [-sn, -c], ay: [c, -sn], hl: len / 2 - 0.12, hw: 0.4 }; };
      const overlap = (a, b) => {
        for (const ax of [a.ax, a.ay, b.ax, b.ay]) {
          const proj = (q) => Math.abs(q.ax[0] * ax[0] + q.ax[1] * ax[1]) * q.hl + Math.abs(q.ay[0] * ax[0] + q.ay[1] * ax[1]) * q.hw;
          const d = Math.abs((b.x - a.x) * ax[0] + (b.z - a.z) * ax[1]);
          if (d > proj(a) + proj(b)) return false;
        }
        return true;
      };
      let worst = 0, frames = 0;
      // Tap the solution moves 0.25 s apart: a fast player.
      for (let k = 0; k < sol.length + 60; k++) {
        if (k < sol.length) s.tap(sol[k]);
        for (let f = 0; f < 8; f++) {
          await r.advance(1 / 30);
          const moving = s.cars.map((o, i) => ({ o, i })).filter(({ i }) => !s.s.inLot[i] && s.cars[i].root.parent && s.cars[i].root.position.y < 0.05);
          let hits = 0;
          for (let a = 0; a < moving.length; a++) for (let c = a + 1; c < moving.length; c++) if (overlap(rect(moving[a].o, moving[a].o.length), rect(moving[c].o, moving[c].o.length))) hits++;
          worst = Math.max(worst, hits); frames += hits ? 1 : 0;
        }
        if (s.s.over && k >= sol.length) break;
      }
      return { n, moves: sol.length, overlapFrames: frames, worst, over: s.s.over };
    }, n);
    console.log(JSON.stringify(res));
    if (res.overlapFrames) bad++;
  }
  await b.close();
  process.exit(bad ? 1 : 0);
})();
