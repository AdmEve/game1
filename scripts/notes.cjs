// Start-of-level notes reach the player: launch to the home screen on a timed level, press play, and the
// "N seconds" warning must show once the opening camera move is over (it used to fire, unseen, behind home).
//   node scripts/notes.cjs
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://127.0.0.1:5173/';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 360, height: 740 }, userAgent: 'Mozilla/5.0 (Linux; Android 12) Mobile' });
  const errors = []; p.on('pageerror', (e) => errors.push(e.message));
  await p.addInitScript(() => { if (!localStorage.getItem('rahbandoon.save.v1')) localStorage.setItem('rahbandoon.save.v1', JSON.stringify({ level: 11, coins: 900, seen: { spot: true } })); });
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForFunction(() => document.title === 'ready', null, { timeout: 120000 });
  const limit = await p.evaluate(() => window.__rb.levels[11].time);
  await p.waitForTimeout(4000); // the note would have fired (and been lost) by now
  const before = await p.evaluate(() => document.querySelector('.hud .toast').textContent);
  await p.click('.home-card .btn.primary.huge');
  await p.evaluate(() => document.querySelectorAll('.modal-back .card [data-back]').forEach((x) => x.click()));
  const seen = await p.waitForFunction(() => { const t = document.querySelector('.hud .toast'); return t.classList.contains('show') && t.textContent.includes('ثانیه') ? t.textContent : false; }, null, { timeout: 120000 }).then((h) => h.jsonValue()).catch(() => null);
  const swooping = await p.evaluate(() => window.__rb.swooping());
  console.log(JSON.stringify({ level: 12, time: limit, toastBeforePlay: before || '(none)', shownAfterPlay: seen, swoopingWhenShown: swooping }));
  if (errors.length) console.log('page errors:', errors.slice(0, 3));
  await b.close();
  if (!seen || errors.length) process.exitCode = 1;
})();
