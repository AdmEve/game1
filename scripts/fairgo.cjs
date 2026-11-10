// A fair continue (BEST_IN_MARKET_PLAN C9): lose levels for real (sensible-ish random play until the bays fill) and
// check the lose card against the solver's word on one more bay: still winnable → the paid continue, with
// «با یه جای پارک دیگه هنوز می‌شه برد!»; hopeless → no paid continue, an honest note, «از اول» the main button.
//   npx vite preview --port 4173 & URL=http://127.0.0.1:4173/ node scripts/fairgo.cjs [out-dir]
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://127.0.0.1:4173/';
const out = process.argv[2];
let fails = 0;
const report = (ok, msg) => { if (!ok) fails++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); };
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: out ? 2 : 1, userAgent: 'Mozilla/5.0 (Linux; Android 13) Mobile' });
  const errors = []; p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(URL + '?play', { waitUntil: 'load' });
  await p.waitForFunction(() => document.title === 'ready', null, { timeout: 300000 });
  const seen = { true: 0, false: 0 };
  for (let attempt = 0; attempt < 24 && (!seen.true || !seen.false); attempt++) {
    const n = [12, 19, 43, 70, 101, 133][attempt % 6];
    const r = await p.evaluate(async ([n, seed]) => {
      const rb = window.__rb; let k = seed * 7919 + 13; const rnd = () => ((k = (k * 16807) % 2147483647) / 2147483647);
      rb.save.seen = Object.fromEntries(['help-bay', 'help-crane', 'help-whistle', 'spot', 'cover', 'broken', 'vip', 'oddEven', 'courier', 'officer', 'cart', 'wedding', 'granny', 'tunnel', 'ch2', 'ch3', 'ch4', 'ch5'].map((x) => [x, true]));
      for (let j = 0; j < 400; j++) rb.save.seen['boss' + j] = true;
      document.querySelectorAll('.modal-back').forEach((m) => m.remove());
      rb.save.level = n; rb.save.lives = { n: 5, next: 0 }; rb.startLevel(n, undefined, false);
      document.querySelectorAll('.modal-back').forEach((m) => m.remove());
      const s = rb.session();
      if (s.level.time || s.level.moves) return { skip: true };
      for (let t = 0; t < 120 && !document.querySelector('.result'); t++) {
        const lot = s.s.inLot.map((x, i) => (x ? i : -1)).filter((i) => i >= 0);
        const free = lot.filter((i) => rb.route(i).end === 'out');
        if (!lot.length) break;
        const pick = (free.length ? free : lot)[Math.floor(rnd() * (free.length || lot.length))];
        s.tap(pick); await rb.advance(0.5, false);
        if (s.s.over) for (let w = 0; w < 30 && !document.querySelector('.result'); w++) await rb.advance(0.3, false);
      }
      const card = document.querySelector('.modal-back:not(.out) .result.lose');
      if (!card) return { skip: true, why: document.querySelector('.result')?.className ?? 'none' };
      for (let w = 0; w < 40 && s.continueKnown === undefined; w++) await new Promise((x) => setTimeout(x, 100));
      await new Promise((x) => setTimeout(x, 200));
      const btns = [...card.querySelectorAll('.btn')].map((x) => ({ t: x.textContent.trim(), cls: x.className }));
      return { level: n + 1, known: s.continueKnown, bays: s.s.bays.length, offer: btns.some((x) => x.t.includes('یه جای پارک دیگه')), note: card.querySelector('.continue-note')?.textContent ?? null, restartMain: btns.some((x) => x.t.startsWith('از اول') && x.cls.includes('primary')) };
    }, [n, attempt]);
    if (r.skip || r.known === null || r.known === undefined || r.bays >= 6) continue;
    if (seen[r.known]) continue;
    seen[r.known]++;
    if (r.known) report(r.offer && /هنوز می‌شه برد/.test(r.note ?? '') && !r.restartMain, `level ${r.level}, still winnable with one more bay: the paid continue, and it says so (${JSON.stringify(r)})`);
    else report(!r.offer && /راهی نمی‌مونه/.test(r.note ?? '') && r.restartMain, `level ${r.level}, hopeless even with one more bay: no paid continue, an honest note, «از اول» first (${JSON.stringify(r)})`);
    if (out) await p.screenshot({ path: `${out}/fair-${r.known ? 'still' : 'hopeless'}.png`, timeout: 180000 });
  }
  report(seen.true && seen.false, `found both cases (winnable ${seen.true}, hopeless ${seen.false})`);
  report(!errors.length, `no page errors${errors.length ? ': ' + [...new Set(errors)].slice(0, 2).join(' | ') : ''}`);
  console.log(fails ? `${fails} failure(s)` : 'all ok');
  await b.close();
  process.exit(fails ? 1 : 0);
})();
