// Hints on request (BEST_IN_MARKET_PLAN C3): past the ramp nothing shows unasked (no hand after 12 s idle), a
// «راهنما؟» chip after 20 s, the hand on the hinted car once it's tapped, and both gone after a move; on the ramp
// (levels 1–8) the hand still comes by itself after 10 s.
//   npx vite preview --port 4173 & URL=http://127.0.0.1:4173/ node scripts/hintoffer.cjs [out-dir]
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://127.0.0.1:4173/';
const out = process.argv[2];
let fails = 0;
const report = (ok, msg) => { if (!ok) fails++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); };
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: out ? 2 : 1, userAgent: 'Mozilla/5.0 (Linux; Android 13) Mobile' });
  const errors = []; p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(URL + '?play&shot', { waitUntil: 'load' });
  await p.waitForFunction(() => document.title === 'ready', null, { timeout: 300000 });
  await p.evaluate(() => {
    const rb = window.__rb;
    window.__start = (n) => {
      document.querySelectorAll('.modal-back').forEach((m) => m.remove()); document.body.classList.remove('at-home');
      rb.save.seen = Object.fromEntries(['help-bay', 'help-crane', 'help-whistle', 'spot', 'cover', 'broken', 'vip', 'ch2'].map((k) => [k, true])); for (let k = 0; k < 400; k++) rb.save.seen['boss' + k] = true;
      rb.save.level = n; rb.startLevel(n, undefined, false);
      document.querySelectorAll('.modal-back').forEach((m) => m.remove());
    };
    // Pretend the player has been still for `ms`, then let the game look (updateHand runs in advance()).
    // (Both clocks: the last move, and how long the level has been in view.)
    window.__idle = async (ms) => { rb.idleFor(ms); await rb.advance(0.05, false); };
    window.__state = () => ({ hand: document.querySelector('.hand').classList.contains('show'), chip: document.querySelector('.hint-chip').classList.contains('show') });
  });
  const state = () => p.evaluate(() => window.__state());

  // Past the ramp: level 13.
  await p.evaluate(() => window.__start(12));
  let s = await p.evaluate(async () => { await window.__idle(12000); return window.__state(); });
  report(!s.hand && !s.chip, `level 13, 12 s idle: no hand, no chip (${JSON.stringify(s)})`);
  s = await p.evaluate(async () => { await window.__idle(21000); return window.__state(); });
  report(!s.hand && s.chip, `level 13, 21 s idle: the «راهنما؟» chip, still no hand (${JSON.stringify(s)})`);
  if (out) await p.screenshot({ path: `${out}/hint-chip.png` });
  // Ask: the hand comes (the search runs in a worker), on a car in the lot.
  const asked = await p.evaluate(async () => {
    const rb = window.__rb; document.querySelector('.hint-chip').click();
    let st = window.__state();
    for (let k = 0; k < 40 && !st.hand; k++) { await new Promise((r) => setTimeout(r, 100)); await rb.advance(0.05, false); st = window.__state(); }
    return { ...st, hint: rb.session().hint() };
  });
  report(asked.hand && !asked.chip && asked.hint >= 0, `tap on the chip: the hand shows on car ${asked.hint}, the chip goes (${JSON.stringify(asked)})`);
  if (out) await p.screenshot({ path: `${out}/hint-hand.png` });
  // A move: both gone, and the idle clock starts over.
  s = await p.evaluate(async (i) => { const rb = window.__rb; rb.session().tap(i); await rb.advance(0.3, false); return window.__state(); }, asked.hint);
  report(!s.hand && !s.chip, `after the move: no hand, no chip (${JSON.stringify(s)})`);

  // The ramp: level 8 still shows the hand by itself after 10 s.
  await p.evaluate(() => window.__start(7));
  s = await p.evaluate(async () => {
    const rb = window.__rb; await window.__idle(11000);
    let st = window.__state();
    for (let k = 0; k < 40 && !st.hand; k++) { await new Promise((r) => setTimeout(r, 100)); rb.idleFor(11000); await rb.advance(0.05, false); st = window.__state(); }
    return st;
  });
  report(s.hand && !s.chip, `level 8 (the ramp), 11 s idle: the hand by itself, no chip (${JSON.stringify(s)})`);

  // Time away from the board doesn't count: 25 s on the pause card (or behind home, the loading screen or the veil),
  // then back to the level, and no offer yet (it used to show the moment the level came back into view).
  await p.evaluate(() => window.__start(12));
  s = await p.evaluate(async () => {
    const rb = window.__rb; await rb.advance(0.05, false);
    rb.cards.pause(); await new Promise((r) => setTimeout(r, 300));
    rb.session().lastInput = performance.now() - 25000; await rb.advance(0.1, false);
    [...document.querySelectorAll('.modal-back:not(.out) .btn.primary')].pop().click(); // «ادامه»
    await new Promise((r) => setTimeout(r, 300)); await rb.advance(0.1, false);
    return { ...window.__state(), cards: document.querySelectorAll('.modal-back:not(.out)').length };
  });
  report(!s.chip && !s.cards, `level 13, 25 s on the pause card, back to the level: no chip yet (${JSON.stringify(s)})`);

  // Asked where no move wins any more, but one more bay would (86% of lost positions on levels 9+): it says so and
  // the parking help pulses, rather than «maybe start over» (that costs a life from level 13).
  const bay = await p.evaluate(async () => {
    const rb = window.__rb, wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const verdictOf = async () => { for (let k = 0; k < 60; k++) { const s = rb.session(); s.hint(); const v = s.hintVerdict(); if (v) return v; await wait(100); await rb.advance(0.02, false); } return null; };
    for (let k = 1; k < 8; k++) for (let w = 0; w < 6; w++) {
      window.__start(12);
      const s = rb.session(), sol = rb.solve(s.level);
      for (let j = 0; j < k && j < sol.length; j++) { s.tap(sol[j]); await rb.advance(0.9, false); }
      const wrong = s.s.inLot.map((x, i) => i).filter((i) => s.s.inLot[i] && i !== sol[k] && rb.route(i).end === 'out')[w];
      if (wrong === undefined) continue;
      s.tap(wrong); await rb.advance(1.2, false);
      if (s.s.over || document.querySelector('.result')) continue;
      if ((await verdictOf()) !== 'bay') continue;
      await window.__idle(21000);
      if (!window.__state().chip) return { found: true, chip: false };
      document.querySelector('.hint-chip').click();
      for (let t = 0; t < 30; t++) { await wait(100); await rb.advance(0.02, false); const tx = document.querySelector('.hud .toast.show')?.textContent; if (tx) return { found: true, chip: true, toast: tx, pulse: document.querySelector('.bst-bay')?.classList.contains('pulse'), hand: window.__state().hand }; }
      return { found: true, chip: true, toast: null };
    }
    return { found: false };
  });
  report(bay.found && /جای پارک/.test(bay.toast ?? '') && bay.pulse && !bay.hand, `level 13, lost without help but won with one more bay: the hint says so, the parking help pulses (${JSON.stringify(bay)})`);
  report(!errors.length, `no page errors${errors.length ? ': ' + [...new Set(errors)].slice(0, 2).join(' | ') : ''}`);
  console.log(fails ? `${fails} failure(s)` : 'all ok');
  await b.close();
  process.exit(fails ? 1 : 0);
})();
