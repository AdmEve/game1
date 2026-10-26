// Random rapid taps (including boosters) on several levels: no page errors, the game must end,
// and the people shown at the front of the queue must match the rules' queue.
//   node scripts/stress.cjs 12 30 55 90
const { chromium } = require('playwright');
(async () => {
  const levels = process.argv.slice(2).map(Number);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto('http://127.0.0.1:5173/?shot&play');
  await p.waitForFunction(() => document.title === 'ready', null, { timeout: 240000 });
  let bad = 0;
  for (const n of levels) {
    const res = await p.evaluate(async (n) => {
      const r = window.__rb;
      document.querySelectorAll('.modal-back').forEach((m) => m.remove());
      r.save.seen = { cover: true, broken: true, vip: true, oddEven: true, courier: true, ch2: true, ch3: true };
      r.save.level = n - 1; r.startLevel();
      const s = r.session();
      let rnd = n * 9301;
      const rand = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);
      let taps = 0, whistles = 0, mismatches = 0;
      for (let k = 0; k < 400 && !s.s.over; k++) {
        const alive = s.level.vehicles.map((_, i) => i).filter((i) => s.s.inLot[i]);
        if (!alive.length) break;
        s.tap(alive[Math.floor(rand() * alive.length)]); taps++;
        if (rand() < 0.04 && s.whistle()) whistles++;
        await r.advance(0.12 + rand() * 0.2);
      }
      for (let k = 0; k < 60 && !document.querySelector('.result'); k++) await r.advance(0.5);
      // After everything settles, the visible queue must mirror the rules' queue.
      const q = s.queue ?? [];
      q.forEach((p, k) => { if (p && p.color !== s.s.queue[s.vq + k]) mismatches++; });
      return { n, taps, whistles, over: s.s.over, modal: document.querySelector('.result')?.className ?? null, mismatches, vq: s.vq, q: s.s.q };
    }, n);
    console.log(JSON.stringify(res));
    if (!res.modal || res.mismatches || (res.over === 'won' && res.vq !== res.q)) bad++;
  }
  if (errors.length) console.log('errors:', [...new Set(errors)].slice(0, 5));
  await b.close();
  process.exit(bad || errors.length ? 1 : 0);
})();
