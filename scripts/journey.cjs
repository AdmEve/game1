// A new player's first session, end to end through the real flow: a fresh install (straight into level 1), each level won
// with the solver's moves, the win card's «مرحله‌ی بعد», on to level 12. Every card that opens on the way is logged
// against the level it came with (and closed the way a player would), so pile-ups and early interruptions show.
//   npx vite preview --port 4173 & URL=http://127.0.0.1:4173/ node scripts/journey.cjs [levels=12] [out-dir]
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://127.0.0.1:4173/';
const LEVELS = Number(process.argv[2] || 12), out = process.argv[3];
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: out ? 2 : 1, userAgent: 'Mozilla/5.0 (Linux; Android 13) Mobile' });
  const p = await ctx.newPage();
  const errors = []; p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(URL + '?shot', { waitUntil: 'load' }); // a fresh browser profile: a fresh save
  await p.waitForFunction(() => document.title === 'ready', null, { timeout: 300000 });
  // The open card (not the win card), its title, and a press of the button a player would take.
  const card = () => p.evaluate(() => {
    const c = [...document.querySelectorAll('.modal-back:not(.out) .card')].pop();
    if (!c) return null;
    const title = (c.querySelector('h2')?.textContent || c.querySelector('h3')?.textContent || '').trim();
    return { cls: c.className.replace('card ', '').replace('pop ', ''), title: title.slice(0, 40) };
  });
  const closeCard = () => p.evaluate(() => {
    const c = [...document.querySelectorAll('.modal-back:not(.out) .card')].pop();
    // An offer to buy (the starter pack): a player in this run says no, as most do.
    const btn = c.querySelector('.starter-offer') ? c.querySelector('[data-back]') : c.querySelector('.btn.primary.big, .btn.primary, .btn.gold.big, [data-back]');
    btn?.click();
  });
  const log = [];
  let shot = 0;
  const note = async (level, where) => {
    // Cards can open a moment after the last one closes (a tip after the chest): look twice before taking none for none.
    for (let k = 0, quiet = 0; k < 8 && quiet < 2; k++) {
      await p.waitForTimeout(500);
      const c = await card();
      if (!c || c.cls.includes('result') || c.cls.includes('home-card')) { quiet++; continue; }
      quiet = 0;
      log.push({ level, where, ...c });
      if (out) await p.screenshot({ path: `${out}/journey-${String(++shot).padStart(2, '0')}-L${level}.png` });
      await closeCard();
    }
  };
  // A fresh save starts in level 1; an older build showed home first (then Play).
  await note(0, 'launch');
  const home = await p.$('.modal-back:not(.out) .home-card');
  log.push({ level: 0, where: 'launch', cls: home ? 'home-card' : 'straight into level 1', title: home ? '(home)' : '' });
  if (home) await p.click('.home-card .btn.primary.huge');
  for (let n = 1; n <= LEVELS; n++) {
    await note(n, 'start');
    await p.evaluate(async () => { const r = window.__rb; for (let k = 0; k < 30 && r.swooping(); k++) await new Promise((x) => setTimeout(x, 100)); });
    // Win it.
    const won = await p.evaluate(async () => {
      const r = window.__rb, s = r.session();
      for (const m of r.solve(s.level)) { s.tap(m); await r.advance(0.7, false); }
      for (let k = 0; k < 60 && !document.querySelector('.result'); k++) await r.advance(0.5, false);
      return !!document.querySelector('.result.win');
    });
    if (!won) { log.push({ level: n, where: 'play', cls: 'NOT WON', title: '' }); break; }
    log.push({ level: n, where: 'end', cls: 'result win', title: '(win card)' });
    await p.evaluate(() => [...document.querySelectorAll('.result.win .btn.primary.big')].pop().click());
    await note(n, 'after');
  }
  let level = -1;
  for (const e of log) {
    if (e.level !== level) { level = e.level; console.log(level ? `level ${level}` : 'launch'); }
    console.log(`  ${e.where.padEnd(6)} ${e.cls.padEnd(22)} ${e.title}`);
  }
  if (errors.length) console.log('page errors:', [...new Set(errors)].slice(0, 3));
  await b.close();
})();
