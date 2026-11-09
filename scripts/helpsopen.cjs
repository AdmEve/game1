// Helps one at a time (BEST_IN_MARKET_PLAN J4): as a new player, no help bar on levels 1–5; on 6 Mash Rahim's card
// for the parking help, once, then only it is open (the crane and whistle wait dimmed with their level, and a tap on
// them says when they open); the crane opens on 9 and the whistle on 12; a win streak only gives helps that are
// open; a player further on has all three and no cards.
//   npx vite preview --port 4173 & URL=http://127.0.0.1:4173/ node scripts/helpsopen.cjs [out-dir]
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
  // Start level n (1-based) with `progress` levels finished, every other card already seen.
  const start = (n, progress = n - 1, streak = 0) => p.evaluate(async ([n, progress, streak]) => {
    const rb = window.__rb;
    document.querySelectorAll('.modal-back').forEach((m) => m.remove()); document.body.classList.remove('at-home');
    const helps = Object.fromEntries(Object.entries(rb.save.seen).filter(([k]) => k.startsWith('help-')));
    rb.save.seen = { ...helps, spot: true, cover: true, broken: true, vip: true, oddEven: true, courier: true, ch2: true }; for (let k = 0; k < 400; k++) rb.save.seen['boss' + k] = true;
    rb.save.level = progress; rb.save.streak = streak;
    rb.startLevel(n - 1, undefined, false);
    await new Promise((r) => setTimeout(r, 300));
    const bar = document.querySelector('.hud .boosters');
    const btn = (id) => { const e = document.querySelector(`.hud .bst-${id}`); return { locked: e.classList.contains('locked'), cnt: e.querySelector('.cnt')?.textContent ?? '' }; };
    const card = document.querySelector('.modal-back:not(.out) .help-intro');
    return { bar: getComputedStyle(bar).display !== 'none', bay: btn('bay'), crane: btn('crane'), whistle: btn('whistle'), card: card ? card.querySelector('h2').textContent : null };
  }, [n, progress, streak]);
  const closeCard = () => p.evaluate(async () => { document.querySelector('.modal-back:not(.out) .help-intro')?.parentElement.querySelector('[data-back]')?.click(); await new Promise((r) => setTimeout(r, 400)); const e = document.querySelector('.hud .bst-bay'); return { pulse: [...document.querySelectorAll('.hud .bst.pulse')].map((x) => x.className.match(/bst-(\w+)/)[1]) }; });

  // A new player: nothing on levels 1–5.
  await p.evaluate(() => { for (const k of Object.keys(window.__rb.save.seen)) if (k.startsWith('help-')) delete window.__rb.save.seen[k]; });
  const early = [];
  for (let n = 1; n <= 5; n++) { const r = await start(n); early.push(r.bar || r.card ? `level ${n}: bar ${r.bar}, card ${r.card}` : ''); }
  report(early.every((x) => !x), `levels 1–5: no help bar, no card${early.filter(Boolean).length ? ' (' + early.filter(Boolean).join('; ') + ')' : ''}`);

  // Level 6: the parking help's card, then only it is open.
  let r = await start(6);
  report(r.card === 'جای پارک', `level 6: card for «${r.card}»`);
  if (out) await p.screenshot({ path: `${out}/helps-card-6.png` });
  const after = await closeCard();
  r = await p.evaluate(() => ({ bay: document.querySelector('.hud .bst-bay').classList.contains('locked'), crane: document.querySelector('.hud .bst-crane .cnt').textContent, whistle: document.querySelector('.hud .bst-whistle .cnt').textContent }));
  report(!r.bay && r.crane.includes('۹') && r.whistle.includes('۱۲') && after.pulse.includes('bay'), `after it: parking open and pulsing (${after.pulse.join(',')}), crane «${r.crane}», whistle «${r.whistle}»`);
  if (out) await p.screenshot({ path: `${out}/helps-bar-6.png` });
  const toast = await p.evaluate(async () => { document.querySelector('.hud .bst-crane').click(); await new Promise((x) => setTimeout(x, 200)); return document.querySelector('.hud .toast').textContent; });
  report(toast.includes('جرثقیل') && toast.includes('۹'), `tap on the locked crane: «${toast}»`);
  r = await start(6);
  report(!r.card, 'level 6 again: no card');

  // Levels 9 and 12.
  r = await start(9);
  report(r.card === 'جرثقیل' && !r.crane.locked && r.whistle.locked, `level 9: card for «${r.card}», crane open, whistle still waiting`);
  await closeCard();
  r = await start(12);
  report(r.card === 'سوت پلیس' && !r.whistle.locked, `level 12: card for «${r.card}», whistle open`);
  await closeCard();

  // A streak of 3 on level 7 (only parking open): the extra bay, but no free crane or whistle.
  r = await start(7, 6, 3);
  report(!r.card && r.crane.locked && r.whistle.locked && !r.crane.cnt.includes('مجانی'), `streak 3 on level 7: crane and whistle stay locked, not free (crane «${r.crane.cnt}»)`);

  // A player further on: everything open, no cards.
  await p.evaluate(() => { for (const k of Object.keys(window.__rb.save.seen)) if (k.startsWith('help-')) delete window.__rb.save.seen[k]; });
  r = await start(40, 120);
  report(r.bar && !r.card && !r.bay.locked && !r.crane.locked && !r.whistle.locked, `a save at level 121, replaying 40: all open, no card`);
  report(!errors.length, `no page errors${errors.length ? ': ' + [...new Set(errors)].slice(0, 2).join(' | ') : ''}`);
  console.log(fails ? `${fails} failure(s)` : 'all ok');
  await b.close();
  process.exit(fails ? 1 : 0);
})();
