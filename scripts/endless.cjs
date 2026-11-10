// Endless Tehran (BEST_IN_MARKET_PLAN C10): with every Journey level won, home's Play goes on to level 241 in Tajrish;
// winning pays and offers «مرحله‌ی بعد ۲۴۲»; losing costs no life and the lose card restarts the same level; the
// Journey's levels stay a tap away from the finish note.
//   npx vite preview --port 4173 & URL=http://127.0.0.1:4173/ node scripts/endless.cjs [out-dir]
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
  await p.evaluate(() => {
    const rb = window.__rb;
    rb.save.seen = Object.fromEntries(['help-bay', 'help-crane', 'help-whistle', 'spot', 'cover', 'broken', 'vip', 'oddEven', 'courier', 'officer', 'cart', 'wedding', 'granny', 'tunnel', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8', 'finale', 'starterOffer'].map((k) => [k, true]));
    for (let k = 0; k < 400; k++) rb.save.seen['boss' + k] = true;
    rb.save.level = 240; rb.save.endless = 0; rb.save.lives = { n: 5, next: 0 };
    window.__plate = () => document.querySelector('.plate')?.textContent.replace(/\s+/g, ' ').trim() ?? '';
    // Until the level shows the wanted number on its plate and nothing covers it.
    window.__on = async (num) => { for (let k = 0; k < 600 && (!window.__plate().includes(num) || rb.swooping() || document.querySelector('.veil.on') || document.querySelector('.modal-back:not(.out)')); k++) await new Promise((r) => setTimeout(r, 100)); return window.__plate(); };
  });
  const home = await p.evaluate(async () => {
    document.querySelectorAll('.modal-back').forEach((m) => m.remove());
    window.__rb.cards.home(); await new Promise((r) => setTimeout(r, 1000));
    return { play: document.querySelector('.home-card .btn.primary.huge')?.textContent.replace(/\s+/g, ' ').trim(), replay: !!document.querySelector('.finale-note .replay-link') };
  });
  report(/تهران بی‌پایان/.test(home.play) && /۲۴۱/.test(home.play) && /تجریش/.test(home.play) && home.replay, `finished home: Play is Endless Tehran, level 241 in Tajrish; the levels a tap away (${JSON.stringify(home)})`);
  if (out) await p.screenshot({ path: `${out}/endless-home.png` });
  const plate = await p.evaluate(async () => { document.querySelector('.home-card .btn.primary.huge').click(); return window.__on('۲۴۱'); });
  report(plate.includes('۲۴۱'), `Play: level 241 (${plate})`);
  if (out) await p.screenshot({ path: `${out}/endless-level.png` });
  const win = await p.evaluate(async () => {
    const rb = window.__rb, s = rb.session(), sol = rb.solve(s.level), c0 = rb.save.coins, l0 = rb.save.lives.n;
    for (const m of sol) { s.tap(m); await rb.advance(0.7, false); }
    for (let k = 0; k < 80 && !document.querySelector('.result.win'); k++) { await rb.advance(0.3, false); await new Promise((r) => setTimeout(r, 50)); }
    await new Promise((r) => setTimeout(r, 600));
    const card = document.querySelector('.result.win');
    return { text: card?.querySelector('p')?.textContent, buttons: [...(card?.querySelectorAll('.btn') ?? [])].map((x) => x.textContent.trim()), endless: rb.save.endless, coins: rb.save.coins - c0, lives: rb.save.lives.n - l0 };
  });
  report(/مرحله‌ی ۲۴۱/.test(win.text ?? '') && win.buttons.includes('مرحله‌ی بعد ۲۴۲') && win.endless === 1 && win.coins >= 60 && win.lives === 0, `won: paid, «مرحله‌ی بعد ۲۴۲» (${JSON.stringify(win)})`);
  if (out) await p.screenshot({ path: `${out}/endless-win.png` });
  const next = await p.evaluate(async () => { [...document.querySelectorAll('.result.win .btn')].find((x) => x.textContent.includes('مرحله‌ی بعد')).click(); return window.__on('۲۴۲'); });
  report(next.includes('۲۴۲'), `next: level 242 (${next})`);
  const lose = await p.evaluate(async () => {
    const rb = window.__rb, s = rb.session(), l0 = rb.save.lives.n;
    for (let k = 0; k < 60 && !s.s.over && !document.querySelector('.result'); k++) { const i = s.s.inLot.findIndex((v, j) => v && rb.route(j).end === 'out'); if (i < 0) break; s.tap(i); await rb.advance(0.6, false); }
    for (let k = 0; k < 40 && !document.querySelector('.result'); k++) { await rb.advance(0.3, false); await new Promise((r) => setTimeout(r, 50)); }
    const card = document.querySelector('.result.lose');
    const restart = [...(card?.querySelectorAll('.btn') ?? [])].find((x) => x.textContent.trim().startsWith('از اول'));
    const costs = !!card?.querySelector('.life-cost');
    restart?.click();
    return { lost: !!card, costs, lives: rb.save.lives.n - l0 };
  });
  const again = await p.evaluate(() => window.__on('۲۴۲'));
  report(lose.lost && !lose.costs && lose.lives === 0 && again.includes('۲۴۲'), `lost: no life asked or taken; «از اول» is level 242 again (${JSON.stringify(lose)}, ${again})`);
  report(!errors.length, `no page errors${errors.length ? ': ' + [...new Set(errors)].slice(0, 2).join(' | ') : ''}`);
  console.log(fails ? `${fails} failure(s)` : 'all ok');
  await b.close();
  process.exit(fails ? 1 : 0);
})();
