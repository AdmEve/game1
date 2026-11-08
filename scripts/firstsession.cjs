// First session: levels 1-3 can't be lost (a careless player gets Mash Rahim's extra bay instead of the lose
// card), and the win card shows how far the next reward chest is.
//   node scripts/firstsession.cjs [out.png]
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://127.0.0.1:5173/';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, userAgent: 'Mozilla/5.0 (Linux; Android 12) Mobile' });
  const errors = []; p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(URL + '?play&shot', { waitUntil: 'load' });
  await p.waitForFunction(() => document.title === 'ready', null, { timeout: 120000 });
  let fails = 0; const check = (name, ok, info) => { if (!ok) fails++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : ' ' + JSON.stringify(info)}`); };
  const careless = await p.evaluate(async () => {
    const r = window.__rb; r.save.seen = { spot: true }; r.save.level = 2; r.startLevel(2, undefined, false);
    document.querySelectorAll('.modal-back').forEach((m) => m.remove());
    const s = r.session(), bays0 = s.s.bays.length, toasts = [];
    new MutationObserver(() => toasts.push(document.querySelector('.hud .toast').textContent)).observe(document.querySelector('.hud .toast'), { childList: true, characterData: true, subtree: true });
    const stuck = new Set();
    for (let k = 0; k < 80 && !document.querySelector('.result'); k++) {
      const want = s.s.queue[s.s.q];
      const i = s.level.vehicles.findIndex((v, j) => s.s.inLot[j] && v.color !== want && !stuck.has(j));
      if (i < 0) break;
      s.tap(i); await r.advance(0.4, false);
      if (s.s.inLot[i]) { stuck.add(i); continue; }
      stuck.clear();
    }
    for (let k = 0; k < 10 && !document.querySelector('.result'); k++) await r.advance(0.5, false);
    return { bays0, bays: s.s.bays.length, rahim: toasts.some((t) => t.includes('مش‌رحیم')), loseCard: !!document.querySelector('.result.lose'), over: s.s.over };
  });
  check('level 3: a would-be loss opens another bay instead', careless.rahim && careless.bays > careless.bays0, careless);
  check('level 3: a lose card only once no bay is left to open', !careless.loseCard || careless.bays >= 6, careless);
  const win = await p.evaluate(async () => {
    const r = window.__rb; document.querySelectorAll('.modal-back').forEach((m) => m.remove());
    r.save.level = 2; r.startLevel(2, undefined, false); document.querySelectorAll('.modal-back').forEach((m) => m.remove());
    const s = r.session();
    for (const m of r.solve(s.level)) { s.tap(m); await r.advance(0.7, false); }
    for (let k = 0; k < 60 && !document.querySelector('.result'); k++) await r.advance(0.5, false);
    await r.advance(0.1);
    return document.querySelector('.result.win .chest-note')?.textContent ?? null;
  });
  check('win card: chest progress', !!win && win.includes('۲'), win);
  if (process.argv[2]) await p.screenshot({ path: process.argv[2] });
  if (errors.length) { fails++; console.log('page errors', errors.slice(0, 3)); }
  await b.close();
  if (fails) process.exitCode = 1;
})();
