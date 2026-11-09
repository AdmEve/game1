// Slow-motion pop check: plays levels' solutions in 1/30 s steps and tracks every car (position, heading,
// body tilt) and every queued passenger (position, scale). A "pop" is a one-step jump far bigger than the
// steps either side of it (or a heading flip): the kind of discontinuity the eye catches as a glitch.
//   node scripts/popcheck.cjs [levels…]   (1-based)
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://127.0.0.1:5173/';
const LEVELS = process.argv.slice(2).map(Number);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 360, height: 740 }, userAgent: 'Mozilla/5.0 (Linux; Android 12) Mobile' });
  const errors = []; p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(URL + '?play&shot', { waitUntil: 'load' });
  if (process.env.CTX) await p.addInitScript(() => { window.__popctxOn = true; });
  if (process.env.CTX) await p.reload({ waitUntil: 'load' });
  await p.waitForFunction(() => document.title === 'ready', null, { timeout: 120000 });
  let total = 0;
  for (const L of LEVELS.length ? LEVELS : [5, 22, 64, 124, 161]) {
    const r = await p.evaluate(async (L) => {
      const rb = window.__rb; window.__popctx = !!window.__popctxOn;
      rb.save.seen = Object.fromEntries(['help-bay', 'help-crane', 'help-whistle', 'spot', 'cover', 'broken', 'vip', 'oddEven', 'courier', 'officer', 'cart', 'wedding', 'granny', 'tunnel', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8'].map((k) => [k, true]));
      for (let k = 0; k < 400; k++) rb.save.seen['boss' + k] = true;
      rb.save.level = L - 1; rb.startLevel(L - 1, undefined, false); document.querySelectorAll('.modal-back').forEach((m) => m.remove());
      const s = rb.session(); const { solve } = await import('/src/game/solver.ts');
      const tracks = new Map(); // id → { kind, pos: [], yaw: [], tilt: [], scale: [] }
      const V = rb.camera.position.constructor; const w = new V();
      const sample = (step) => {
        const seen = new Set();
        s.cars.forEach((c, i) => {
          const id = 'car' + i; seen.add(id);
          let t = tracks.get(id); if (!t) tracks.set(id, (t = { kind: 'car ' + s.level.vehicles[i].kind, pts: [] }));
          c.root.getWorldPosition(w);
          t.pts.push({ step, x: w.x, y: w.y, z: w.z, yaw: c.root.rotation.y, tilt: Math.abs(c.body.rotation.x) + Math.abs(c.body.rotation.z), sc: c.root.scale.x, bk: s.backlog ?? 0 });
        });
        (s.queue || []).forEach((q) => {
          const id = 'p' + q.root.id; seen.add(id);
          let t = tracks.get(id); if (!t) tracks.set(id, (t = { kind: 'passenger', pts: [] }));
          q.root.getWorldPosition(w);
          t.pts.push({ step, x: w.x, y: w.y, z: w.z, yaw: q.root.rotation.y, tilt: Math.abs(q.body.rotation.z), sc: q.root.scale.x });
        });
      };
      let step = 0;
      const run = async (sec) => { for (let t = 0; t < sec; t += 1 / 30) { await rb.advance(1 / 30, false); sample(step++); } };
      sample(step++);
      for (const m of solve(s.level).solution) { s.tap(m); await run(0.7); }
      for (let k = 0; k < 40 && !document.querySelector('.result'); k++) await run(0.5);
      // Pops: per track, consecutive samples only.
      const pops = [];
      const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
      for (const [id, t] of tracks) {
        const P = t.pts;
        for (let k = 2; k < P.length - 1; k++) {
          const a = P[k - 2], b = P[k - 1], c = P[k], d = P[k + 1];
          if (c.step !== b.step + 1 || b.step !== a.step + 1 || d.step !== c.step + 1) continue;
          const dist = (u, v) => Math.hypot(u.x - v.x, u.y - v.y, u.z - v.z);
          const jump = dist(b, c), before = dist(a, b), after = dist(c, d);
          if (jump > 0.45 && jump > 4 * Math.max(before, after, 0.02)) pops.push({ id, kind: t.kind, step: c.step, what: 'position', jump: +jump.toFixed(2), before: +before.toFixed(2), after: +after.toFixed(2), ...(window.__popctx ? { ctx: P.slice(Math.max(0, k - 3), k + 3).map((q) => [q.step, +q.x.toFixed(2), +q.y.toFixed(2), +q.z.toFixed(2), +q.yaw.toFixed(2)]) } : {}) });
          const dy = Math.abs(wrap(c.yaw - b.yaw)), dyb = Math.abs(wrap(b.yaw - a.yaw)), dya = Math.abs(wrap(d.yaw - c.yaw));
          if (t.kind !== 'passenger' && dy > 0.5 && dy > 4 * Math.max(dyb, dya, 0.02)) pops.push({ id, kind: t.kind, step: c.step, what: 'heading', jump: +dy.toFixed(2), before: +dyb.toFixed(2), after: +dya.toFixed(2), backlog: c.bk, ...(window.__popctx ? { ctx: P.slice(Math.max(0, k - 3), k + 3).map((q) => [q.step, +q.x.toFixed(2), +q.z.toFixed(2), +q.yaw.toFixed(2)]) } : {}) });
          const dt = Math.abs(c.tilt - b.tilt);
          if (dt > 0.12 && dt > 4 * Math.max(Math.abs(b.tilt - a.tilt), Math.abs(d.tilt - c.tilt), 0.01)) pops.push({ id, kind: t.kind, step: c.step, what: 'tilt', jump: +dt.toFixed(2) });
          const ds = Math.abs(c.sc - b.sc);
          if (ds > 0.35 && ds > 4 * Math.max(Math.abs(b.sc - a.sc), Math.abs(d.sc - c.sc), 0.02)) pops.push({ id, kind: t.kind, step: c.step, what: 'scale', jump: +ds.toFixed(2) });
        }
      }
      // While taps are piling up the game plays faster on purpose (catch-up, up to 2.3×): jumps then are time-lapse.
      const lapse = pops.filter((x) => (x.backlog ?? 0) > 2);
      return { L, steps: step, tracks: tracks.size, won: !!document.querySelector('.result.win'), pops: pops.filter((x) => !((x.backlog ?? 0) > 2)), lapse: lapse.length };
    }, L);
    total += r.pops.length;
    console.log(`L${r.L}: ${r.steps} steps, ${r.tracks} tracks, won=${r.won}, pops=${r.pops.length}${r.lapse ? ` (+${r.lapse} during catch-up fast-forward)` : ''}`);
    for (const x of r.pops.slice(0, 12)) console.log('   ', JSON.stringify(x));
  }
  if (errors.length) console.log('page errors:', errors.slice(0, 5));
  await b.close();
  if (total) process.exitCode = 1;
})();
