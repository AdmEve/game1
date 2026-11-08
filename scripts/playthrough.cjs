// Plays levels in the real client with the solver's moves and checks they end on the win screen.
//   node scripts/playthrough.cjs 1 7 11 16 21 30 y5 n3   (yN / nN = night or day N of the «شب یلدا» / «نوروز» events)
//   REAL=1 node scripts/playthrough.cjs 1 34   (taps go through pointer events and the tap pick, as a finger's would)
const { chromium } = require('playwright');
(async () => {
  const levels = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto('http://127.0.0.1:5173/?shot&play&yalda&nowruz');
  await p.waitForFunction(() => document.title === 'ready', null, { timeout: 240000 });
  let failed = 0;
  for (const n of levels) {
    const res = await p.evaluate(async ([n, real]) => {
      const r = window.__rb;
      document.querySelectorAll('.modal-back').forEach((m) => m.remove());
      r.save.seen = { cover: true, broken: true, vip: true, oddEven: true, courier: true, officer: true, cart: true, wedding: true, granny: true, tunnel: true, ch2: true, ch3: true, ch4: true, ch5: true, ch6: true, ch7: true, ch8: true }; for (let k = 0; k < 400; k++) r.save.seen['boss' + k] = true;
      if (n.startsWith('n')) {
        const day = Number(n.slice(1)) - 1;
        const { nowruzLevel } = await import('/src/game/events.ts');
        r.save.nowruz = { year: new Date().getFullYear(), done: day };
        r.startLevel(undefined, nowruzLevel(day), false, { kind: 'nowruz', i: day });
      } else if (n.startsWith('y')) {
        const night = Number(n.slice(1)) - 1;
        const { yaldaLevel } = await import('/src/game/events.ts');
        r.save.yalda = { year: new Date().getFullYear(), done: night };
        r.startLevel(undefined, yaldaLevel(night), false, { kind: 'yalda', i: night });
      } else { r.save.level = Number(n) - 1; r.startLevel(); }
      const s = r.session();
      const { solve } = await import('/src/game/solver.ts');
      const sol = solve(s.level).solution;
      // REAL=1: tap through the real input path (pointer events on the canvas at the car's screen position).
      const tapAt = (m) => {
        const q = s.anchor(m).project(r.camera), cv = r.renderer.domElement;
        const o = { clientX: ((q.x + 1) / 2) * innerWidth, clientY: ((1 - q.y) / 2) * innerHeight, bubbles: true, pointerId: 1, isPrimary: true };
        cv.dispatchEvent(new PointerEvent('pointerdown', o)); cv.dispatchEvent(new PointerEvent('pointerup', o));
      };
      for (const m of sol) { if (real) tapAt(m); else s.tap(m); await r.advance(0.7); }
      for (let k = 0; k < 120 && !document.querySelector('.result'); k++) await r.advance(0.5);
      const won = !!document.querySelector('.result.win');
      return { n, moves: sol.length, won, over: s.s.over, yalda: r.save.yalda.done, nowruz: r.save.nowruz.done };
    }, [n, !!process.env.REAL]);
    console.log(JSON.stringify(res));
    if (!res.won) failed++;
  }
  if (errors.length) console.log('errors:', errors.slice(0, 5));
  await b.close();
  process.exit(failed || errors.length ? 1 : 0);
})();
