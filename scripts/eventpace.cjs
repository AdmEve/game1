// Event pacing: with the clock in Yalda week, a night won today keeps the next one for tomorrow (the banner
// says so and a tap only explains); a night won yesterday leaves the next one open.
//   node scripts/eventpace.cjs
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://127.0.0.1:5173/';
(async () => {
  const b = await chromium.launch();
  let fails = 0;
  for (const [last, wantOpen] of [['2026-12-20', false], ['2026-12-19', true]]) {
    const p = await b.newPage({ viewport: { width: 360, height: 740 }, userAgent: 'Mozilla/5.0 (Linux; Android 12) Mobile' });
    await p.clock.install({ time: new Date('2026-12-20T17:30:00Z') });
    await p.addInitScript((last) => { localStorage.setItem('rahbandoon.save.v1', JSON.stringify({ level: 40, coins: 500, seen: { spot: true }, yalda: { year: 2026, done: 2, last }, daily: { day: '2026-12-20', streak: 1 } })); }, last);
    await p.goto(URL, { waitUntil: 'load' });
    await p.clock.runFor(1000);
    await p.waitForFunction(() => document.title === 'ready', null, { timeout: 120000, polling: 500 }).catch(async () => { for (let k = 0; k < 120 && (await p.title()) !== 'ready'; k++) await p.clock.runFor(1000); });
    const sub = await p.evaluate(() => document.querySelector('.yalda-btn small')?.textContent ?? null);
    await p.click('.yalda-btn');
    await p.clock.runFor(1500);
    const r = await p.evaluate(() => ({ note: document.querySelector('.note')?.textContent ?? null, home: !!document.querySelector('.modal-back:not(.out) .home-card') }));
    const opened = !r.home; // tapping an open night closes home and starts the level
    const ok = opened === wantOpen && (wantOpen || !!r.note);
    if (!ok) fails++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} last win ${last}: banner «${sub}» → ${opened ? 'night started' : 'stays home, note: ' + r.note}`);
    await p.close();
  }
  await b.close();
  if (fails) process.exitCode = 1;
})();
