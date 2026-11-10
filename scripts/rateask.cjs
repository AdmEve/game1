// The rating ask (K5) through real wins: none at level 7; the boss at 30 comes with its chest, so the ask waits for
// the next win (31) and names the boss; then not again for days.
//   npx vite --port 5173 & node scripts/rateask.cjs http://127.0.0.1:5173/
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 360, height: 640 }, userAgent: 'Mozilla/5.0 (Linux; Android 13) Mobile' });
  const errors = []; p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(process.argv[2] + '?play', { waitUntil: 'load' });
  await p.waitForFunction(() => document.title === 'ready', null, { timeout: 300000 });
  const play = (n, streak) => p.evaluate(async ([n, streak]) => {
    const rb = window.__rb;
    rb.save.seen = new Proxy({ starterOffer: true }, { get: () => true, has: () => true });
    rb.save.level = n; rb.save.lives = { n: 5, next: 0 }; rb.save.streak = streak;
    document.querySelectorAll('.modal-back').forEach((m) => m.remove());
    await rb.goLevel(n);
    for (let k = 0; k < 100 && (rb.swooping() || document.querySelector('.veil.on') || document.querySelector('.modal-back:not(.out)')); k++) {
      document.querySelector('.modal-back:not(.out) [data-back], .modal-back:not(.out) .btn.primary')?.click();
      await new Promise((x) => setTimeout(x, 100));
    }
    const s = rb.session();
    for (const m of rb.solve(s.level)) { s.tap(m); await rb.advance(0.7, false); }
    for (let k = 0; k < 60 && !document.querySelector('.result.win'); k++) await rb.advance(0.5, false);
    if (!document.querySelector('.result.win')) return { won: false };
    [...document.querySelectorAll('.result.win .btn.primary.big')].pop().click();
    let card = null;
    const others = [];
    for (let k = 0; k < 60 && !card; k++) {
      await new Promise((x) => setTimeout(x, 150));
      const c = document.querySelector('.modal-back:not(.out) .card.pop .rate');
      if (c) { card = c.textContent.replace(/\s+/g, ' ').slice(0, 60); break; }
      // Another card (the chest): closed as a player would.
      const o = [...document.querySelectorAll('.modal-back:not(.out) .card')].pop();
      if (o && !o.querySelector('.result')) { others.push(o.querySelector('h2')?.textContent ?? o.className); o.querySelector('.btn.primary, .btn.gold, [data-back]')?.click(); }
      if (rb.session()?.level && !document.querySelector('.modal-back:not(.out)') && !document.querySelector('.veil.on') && k > 20) break;
    }
    document.querySelector('.modal-back:not(.out) .rate')?.closest('.card').querySelector('[data-back]')?.click();
    return { won: true, card, asks: rb.save.rateAsks, others: [...new Set(others)] };
  }, [n, streak]);
  console.log('level 7, streak 6   ', JSON.stringify(await play(6, 6)));
  console.log('level 30 (boss)    ', JSON.stringify(await play(29, 1)), 'pending:', await p.evaluate(() => window.__rb.save.ratePending));
  console.log('level 31           ', JSON.stringify(await play(30, 2)));
  console.log('level 32, streak 9 ', JSON.stringify(await play(31, 9)), '(asked a moment ago: not again)');
  console.log('errors', errors);
  await b.close();
})();
