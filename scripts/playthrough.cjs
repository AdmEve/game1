// Plays levels in the real client with the solver's moves and checks they end on the win screen.
//   node scripts/playthrough.cjs 1 7 11 16 21 30 y5 n3   (yN / nN = night or day N of the «شب یلدا» / «نوروز» events)
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
    const res = await p.evaluate(async (n) => {
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
      for (const m of sol) { s.tap(m); await r.advance(0.7); }
      for (let k = 0; k < 40 && !document.querySelector('.result'); k++) await r.advance(0.5);
      const won = !!document.querySelector('.result.win');
      return { n, moves: sol.length, won, over: s.s.over, yalda: r.save.yalda.done, nowruz: r.save.nowruz.done };
    }, n);
    console.log(JSON.stringify(res));
    if (!res.won) failed++;
  }
  if (errors.length) console.log('errors:', errors.slice(0, 5));
  await b.close();
  process.exit(failed || errors.length ? 1 : 0);
})();
