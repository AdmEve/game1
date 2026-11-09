// Leaving a level in play costs what losing it costs (C5): on level 13 and on, after a move, pause → restart, home or
// another level asks first and takes a life on «ول کن»; «ادامه می‌دم» keeps the level as it was. No move made, the
// ramp, and the lose card's own «از اول» (which says «یه جون») are checked too.
//   npx vite preview --port 4173 & URL=http://127.0.0.1:4173/ node scripts/quitcost.cjs
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://127.0.0.1:4173/';
let fails = 0;
const report = (ok, msg) => { if (!ok) fails++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); };
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 360, height: 640 }, userAgent: 'Mozilla/5.0 (Linux; Android 13) Mobile' });
  const errors = []; p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(URL + '?play', { waitUntil: 'load' });
  await p.waitForFunction(() => document.title === 'ready', null, { timeout: 300000 });
  await p.evaluate(() => {
    const rb = window.__rb;
    rb.save.seen = Object.fromEntries(['help-bay', 'help-crane', 'help-whistle', 'spot', 'cover', 'broken', 'vip', 'ch2'].map((k) => [k, true]));
    for (let k = 0; k < 400; k++) rb.save.seen['boss' + k] = true;
    window.__at = async (n, taps) => {
      // Through the real flow (goLevel), so the cards' state is the game's own; then the given number of moves.
      rb.save.level = n; rb.save.streak = 0; rb.save.lives = { n: 5, next: 0 };
      await rb.goLevel(n);
      for (let k = 0; k < 100 && (rb.swooping() || document.querySelector('.veil.on')); k++) await new Promise((r) => setTimeout(r, 100));
      const s = rb.session(), moves = rb.solve(s.level);
      for (let k = 0; k < taps; k++) { s.tap(moves[k]); await rb.advance(0.6, false); }
    };
    window.__card = () => { const c = [...document.querySelectorAll('.modal-back:not(.out) .card')].pop(); return c ? (c.querySelector('h2')?.textContent ?? c.className) : null; };
    window.__click = (sel, text) => { const c = [...document.querySelectorAll('.modal-back:not(.out) .card')].pop(); const btn = [...c.querySelectorAll(sel)].find((x) => !text || x.textContent.includes(text)); btn.click(); return !!btn; };
  });
  const st = () => p.evaluate(() => ({ lives: window.__rb.save.lives.n, taps: window.__rb.session().taps, card: window.__card() }));
  const pauseAnd = async (label) => { await p.evaluate(() => window.__rb.cards.pause()); await p.waitForTimeout(400); await p.evaluate((l) => window.__click('.pause-row .btn', l), label); await p.waitForTimeout(500); };

  // Level 13, one move: restart asks; staying keeps the move and the life.
  await p.evaluate(() => window.__at(12, 1));
  await pauseAnd('از اول');
  let s = await st();
  report(s.card === 'ول می‌کنی؟', `level 13 after a move: pause → از اول asks first (${JSON.stringify(s)})`);
  await p.evaluate(() => window.__click('.btn', 'ادامه می‌دم')); await p.waitForTimeout(500);
  s = await st();
  report(!s.card && s.lives === 5 && s.taps === 1, `«ادامه می‌دم»: back in the level, move and life kept (${JSON.stringify(s)})`);
  // Restart for real: a life goes and the level starts over.
  await pauseAnd('از اول');
  await p.evaluate(() => window.__click('.btn', 'ول کن'));
  await p.waitForFunction(() => window.__rb.session().taps === 0 && !document.querySelector('.veil.on'), null, { timeout: 60000 }).catch(() => {});
  s = await st();
  report(s.lives === 4 && s.taps === 0 && !s.card, `«ول کن»: a life gone (5 → ${s.lives}), the level starts over (${JSON.stringify(s)})`);
  // No move yet: restart is free and asks nothing.
  await pauseAnd('از اول');
  s = await st();
  report(!s.card && s.lives === 4, `no move yet: restart asks nothing, costs nothing (${JSON.stringify(s)})`);
  // Home after a move: asks; leaving takes a life and opens home.
  await p.evaluate(() => window.__at(12, 2));
  await pauseAnd('خونه');
  s = await st();
  report(s.card === 'ول می‌کنی؟', `pause → خونه after a move asks first (${JSON.stringify(s)})`);
  await p.evaluate(() => window.__click('.btn', 'ول کن'));
  await p.waitForFunction(() => !!document.querySelector('.modal-back:not(.out) .home-card'), null, { timeout: 60000 }).catch(() => {});
  s = await p.evaluate(() => ({ lives: window.__rb.save.lives.n, home: !!document.querySelector('.modal-back:not(.out) .home-card') }));
  report(s.home && s.lives === 4, `«ول کن»: home, a life gone (${JSON.stringify(s)})`);
  // Another level from the pause card: asks; on a no the level list stays open.
  await p.evaluate(() => { document.querySelector('.modal-back:not(.out) .home-card .btn.primary.huge').click(); });
  await p.waitForTimeout(800);
  await p.evaluate(() => window.__at(12, 1));
  await pauseAnd('مرحله‌ها');
  await p.evaluate(() => [...document.querySelectorAll('.modal-back:not(.out) .levels-card .lv')].find((x) => x.textContent.trim() === '۱۴').click());
  await p.waitForTimeout(500);
  s = await st();
  report(s.card === 'ول می‌کنی؟', `pause → مرحله‌ها → level 14 asks first (${JSON.stringify(s)})`);
  await p.evaluate(() => window.__click('.btn', 'ادامه می‌دم')); await p.waitForTimeout(500);
  s = await p.evaluate(() => ({ levels: !!document.querySelector('.modal-back:not(.out) .levels-card'), lives: window.__rb.save.lives.n }));
  report(s.levels && s.lives === 5, `on «ادامه می‌دم» the level list stays, nothing lost (${JSON.stringify(s)})`);
  // The ramp (level 5) is free: leaving asks nothing.
  await p.evaluate(() => { document.querySelectorAll('.modal-back').forEach((m) => m.remove()); });
  await p.evaluate(() => window.__at(4, 1));
  await pauseAnd('از اول');
  s = await st();
  report(!s.card && s.lives === 5, `level 5 (no lives yet): restart asks nothing (${JSON.stringify(s)})`);
  report(!errors.length, `no page errors${errors.length ? ': ' + [...new Set(errors)].slice(0, 2).join(' | ') : ''}`);
  console.log(fails ? `${fails} failure(s)` : 'all ok');
  await b.close();
  process.exit(fails ? 1 : 0);
})();
