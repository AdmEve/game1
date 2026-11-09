// First session: the ramp (levels 1–8) can't be lost on full bays (a careless player gets Mash Rahim's extra bay
// instead of the lose card) and level 9 brings the first lose card; the win card shows how far the next chest is.
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
  // Play a level carelessly (cars nobody at the front wants, first): on the ramp (levels 1–8) a would-be loss on full
  // bays opens Mash Rahim's extra bay instead; from level 9 the lose card comes (GDD §9, game/helps.ts MERCY_LEVELS).
  const careless = (n) => p.evaluate(async (n) => {
    const r = window.__rb; document.querySelectorAll('.modal-back').forEach((m) => m.remove());
    r.save.seen = { 'help-bay': true, 'help-crane': true, 'help-whistle': true, spot: true, cover: true, broken: true }; r.save.level = n; r.startLevel(n, undefined, false);
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
  }, n);
  for (const n of [2, 7]) {
    const c = await careless(n);
    check(`level ${n + 1}: a would-be loss opens another bay instead`, c.rahim && c.bays > c.bays0, c);
    check(`level ${n + 1}: a lose card only once no bay is left to open`, !c.loseCard || c.bays >= 6, c);
  }
  const nine = await careless(8);
  check('level 9: the first real loss (lose card, no extra bay)', nine.loseCard && !nine.rahim && nine.bays === nine.bays0, nine);
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
