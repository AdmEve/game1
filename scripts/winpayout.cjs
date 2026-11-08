// Win payout check: wins level 1 and captures the coins in flight (<out>-flight.png); prints reward, wallet
// and saved coins (the wallet must end on the saved total).
//   node scripts/winpayout.cjs /tmp/win
const { chromium } = require('playwright');
const out = process.argv[2];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, userAgent: 'Mozilla/5.0 (Linux; Android 12) Mobile' });
  const errors = []; p.on('pageerror', (e) => errors.push(e.message));
  await p.goto('http://127.0.0.1:5173/?play&shot', { waitUntil: 'load' });
  await p.waitForFunction(() => document.title === 'ready', null, { timeout: 120000 });
  await p.evaluate(async () => {
    const r = window.__rb; r.save.seen = { spot: true }; r.save.level = 0; r.startLevel(0, undefined, false);
    document.querySelectorAll('.modal-back').forEach((m) => m.remove());
    const s = r.session(); const { solve } = await import('/src/game/solver.ts');
    for (const m of solve(s.level).solution) { s.tap(m); await r.advance(0.7); }
    for (let k = 0; k < 120 && !document.querySelector('.result'); k++) await r.advance(0.5);
  });
  // Mid-flight and after.
  const shots = [];
  await p.waitForFunction(() => document.querySelectorAll('.flycoin').length > 0, null, { timeout: 20000 });
  await p.evaluate(() => { for (const el of document.querySelectorAll('.flycoin')) for (const a of el.getAnimations()) { a.pause(); a.currentTime = a.effect.getTiming().delay + 330 + Math.random() * 120; } });
  await p.screenshot({ path: `${out}-flight.png` });
  await p.evaluate(() => { for (const el of document.querySelectorAll('.flycoin')) for (const a of el.getAnimations()) a.play(); });
  for (const [i, ms] of [[0, 700], [1, 1400]]) {
    await p.waitForTimeout(ms - (i ? 700 : 0));
    await p.screenshot({ path: `${out}-${i}.png` });
    shots.push(await p.evaluate(() => ({ reward: document.querySelector('.result .reward b')?.textContent, wallet: document.querySelector('.wallet-float b')?.textContent, flying: document.querySelectorAll('.flycoin').length, coins: window.__rb.save.coins })));
  }
  console.log(JSON.stringify(shots));
  if (errors.length) console.log('errors', errors);
  await b.close();
})();
