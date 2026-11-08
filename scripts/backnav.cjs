// Back navigation (Escape stands in for Android's back button): home → play → pause → resume, pause → home,
// cards closing in order, and the win card's Home. Saves a screenshot of the pause card.
//   node scripts/backnav.cjs [out.png]
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://127.0.0.1:5173/';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, userAgent: 'Mozilla/5.0 (Linux; Android 12) Mobile' });
  const errors = []; p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForFunction(() => document.title === 'ready', null, { timeout: 120000 });
  const state = () => p.evaluate(() => ({
    cards: [...document.querySelectorAll('.modal-back:not(.out) .card')].map((c) => c.className.replace('card ', '')),
    note: !!document.querySelector('.note.show'),
  }));
  const wait = (ms) => p.waitForTimeout(ms);
  const checks = [];
  const check = (name, ok, info) => { checks.push([name, ok]); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : ' ' + JSON.stringify(info)}`); };
  let s = await state();
  check('boots to home', s.cards.some((c) => c.includes('home-card')), s);
  await p.keyboard.press('Escape'); await wait(100);
  s = await state(); check('back on home: stays, shows a note', s.note && s.cards.some((c) => c.includes('home-card')), s);
  // Play.
  await p.click('.home-card .btn.primary.huge'); await wait(900);
  s = await state(); if (s.cards.length) { await p.evaluate(() => document.querySelectorAll('.modal-back .card [data-back]').forEach((x) => x.click())); await wait(400); s = await state(); }
  check('play: no card', s.cards.length === 0, s);
  await p.keyboard.press('Escape'); await wait(400);
  s = await state(); check('back in play: pause card', s.cards.some((c) => c.includes('pause-card')), s);
  if (process.argv[2]) await p.screenshot({ path: process.argv[2] });
  await p.keyboard.press('Escape'); await wait(400);
  s = await state(); check('back on pause: resumes', s.cards.length === 0, s);
  // Coming back from another app mid-level opens the pause card.
  await p.evaluate(async () => {
    const s = window.__rb.session(); s.tap(s.s.inLot.findIndex(Boolean)); await window.__rb.advance(0.3);
    let hidden = true; Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
    document.dispatchEvent(new Event('visibilitychange')); hidden = false; document.dispatchEvent(new Event('visibilitychange'));
  });
  await wait(400);
  s = await state(); check('back from another app mid-level: pause card', s.cards.some((c) => c.includes('pause-card')), s);
  await p.keyboard.press('Escape'); await wait(400);
  // Pause → levels → back closes levels.
  await p.keyboard.press('Escape'); await wait(400);
  await p.click('.pause-row .btn:nth-child(2)'); await wait(400);
  s = await state(); check('levels from pause', s.cards.some((c) => c.includes('levels-card')), s);
  await p.keyboard.press('Escape'); await wait(400);
  s = await state(); check('back closes levels', s.cards.length === 0, s);
  // Pause → home.
  await p.keyboard.press('Escape'); await wait(400);
  await p.click('.pause-row .btn:nth-child(3)'); await wait(1500);
  s = await state(); check('home from pause', s.cards.some((c) => c.includes('home-card')), s);
  // Win card → Home.
  await p.click('.home-card .btn.primary.huge'); await wait(900);
  await p.evaluate(async () => {
    document.querySelectorAll('.modal-back .card [data-back]').forEach((x) => x.click());
    const r = window.__rb, s = r.session(); const { solve } = await import('/src/game/solver.ts');
    for (const m of solve(s.level).solution) { s.tap(m); await r.advance(0.7); }
    for (let k = 0; k < 120 && !document.querySelector('.result'); k++) await r.advance(0.5);
  });
  await wait(400);
  s = await state(); check('win card', s.cards.some((c) => c.includes('pop')) && !!(await p.$('.result.win')), s);
  await p.keyboard.press('Escape'); await wait(2500);
  s = await state();
  // A chest or rating card may come first; back takes those too.
  for (let k = 0; k < 3 && !s.cards.some((c) => c.includes('home-card')); k++) { await p.keyboard.press('Escape'); await wait(1500); s = await state(); }
  check('back on win card: home', s.cards.some((c) => c.includes('home-card')), s);
  if (errors.length) console.log('page errors:', errors.slice(0, 5));
  await b.close();
  if (checks.some(([, ok]) => !ok) || errors.length) process.exitCode = 1;
})();
