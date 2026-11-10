// Daily missions (BEST_IN_MARKET_PLAN P4): home's «امروز» opens today's rush and Ms. Sabouri's three missions; wins
// count towards them (the win card says when one is done), the badge counts rewards waiting, claims pay, and the
// rush still starts from the card.
//   npx vite preview --port 4173 & URL=http://127.0.0.1:4173/ node scripts/missions.cjs
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://127.0.0.1:4173/';
let fails = 0;
const report = (ok, msg) => { if (!ok) fails++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); };
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 1, userAgent: 'Mozilla/5.0 (Linux; Android 13) Mobile' });
  const errors = []; p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(URL + '?play', { waitUntil: 'load' });
  await p.waitForFunction(() => document.title === 'ready', null, { timeout: 300000 });
  const r = await p.evaluate(async () => {
    const rb = window.__rb;
    rb.save.seen = Object.fromEntries(['help-bay','help-crane','help-whistle','spot','cover','broken','vip','oddEven','courier','officer','ch2'].map((k) => [k, true])); for (let k = 0; k < 400; k++) rb.save.seen['boss' + k] = true;
    rb.save.level = 40; rb.save.lives = { n: 5, next: 0 }; rb.save.rated = true; rb.save.notifyAsked = true; rb.save.seen.starterOffer = true;
    // A known set for the test: win 2, combo 3, the rush.
    const day = new Date().toISOString().slice(0, 10);
    rb.save.missions = { day, bonus: false, list: [{ kind: 'win', goal: 2, got: 0, claimed: false }, { kind: 'combo', goal: 3, got: 0, claimed: false }, { kind: 'rush', goal: 1, got: 0, claimed: false }] };
    document.querySelectorAll('.modal-back').forEach((m) => m.remove());
    rb.cards.home(); await new Promise((x) => setTimeout(x, 600));
    const btn = document.querySelector('.today-btn');
    return { label: btn?.textContent.replace(/\s+/g, ' ').trim() };
  });
  report(/امروز/.test(r.label) && /مأموریت‌ها: ۰\/۳/.test(r.label), `home: «امروز» with today's missions (${r.label})`);
  // Win two levels: missions count, the win card says so.
  const wins = [];
  for (const n of [40, 41]) {
    wins.push(await p.evaluate(async (n) => {
      const rb = window.__rb;
      document.querySelectorAll('.modal-back').forEach((m) => m.remove());
      rb.save.level = n; await rb.goLevel(n);
      for (let k = 0; k < 300 && (rb.swooping() || document.querySelector('.veil.on') || document.querySelector('.modal-back:not(.out)')); k++) await new Promise((x) => setTimeout(x, 100));
      const s = rb.session(), sol = rb.solve(s.level);
      for (const m of sol) { s.tap(m); await rb.advance(0.5, false); }
      for (let k = 0; k < 80 && !document.querySelector('.result.win'); k++) { await rb.advance(0.3, false); await new Promise((x) => setTimeout(x, 50)); }
      return { notes: [...document.querySelectorAll('.result.win .mission-note')].map((x) => x.textContent.trim()), got: rb.save.missions.list.map((m) => m.got) };
    }, n));
  }
  report(wins[0].notes.some((t) => /کمبو/.test(t)) && wins[1].notes.some((t) => /۲ مرحله ببر/.test(t)) && wins[1].got.join() === '2,3,0', `two wins: the combo and the wins missions done, each said on its win card (${JSON.stringify(wins)})`);
  const card = await p.evaluate(async () => {
    const rb = window.__rb;
    document.querySelectorAll('.modal-back').forEach((m) => m.remove());
    rb.cards.home(); await new Promise((x) => setTimeout(x, 500));
    const badge = document.querySelector('.today-btn .badge')?.textContent;
    document.querySelector('.today-btn').click(); await new Promise((x) => setTimeout(x, 600));
    const rows = [...document.querySelectorAll('.today .mission')].map((x) => x.textContent.replace(/\s+/g, ' ').trim());
    return { badge, rows };
  });
  report(card.badge === '۲' && card.rows.length === 4, `home's badge counts the two rewards; the card lists three missions and the bonus (${JSON.stringify(card)})`);
  const claim = await p.evaluate(async () => {
    const rb = window.__rb, c0 = rb.save.coins;
    for (const b of [...document.querySelectorAll('.today .mission .claim')]) { b.click(); await new Promise((x) => setTimeout(x, 200)); }
    return { coins: rb.save.coins - c0, claimed: rb.save.missions.list.map((m) => m.claimed), bonusBtn: !!document.querySelector('.today .mission.bonus .claim') };
  });
  report(claim.coins === 120 && claim.claimed.join() === 'true,true,false' && !claim.bonusBtn, `claimed: 60 + 60 coins; no bonus before all three (${JSON.stringify(claim)})`);
  // The rush starts from the card.
  const rush = await p.evaluate(async () => {
    const rb = window.__rb;
    document.querySelectorAll('.modal-back').forEach((m) => m.remove());
    rb.save.rush = { day: '', streak: 0 };
    rb.cards.home(); await new Promise((x) => setTimeout(x, 500));
    document.querySelector('.today-btn').click(); await new Promise((x) => setTimeout(x, 500));
    document.querySelector('.today .rush-row').click();
    for (let k = 0; k < 600 && !(document.querySelector('.plate')?.textContent.includes('چالش') && !document.querySelector('.veil.on')); k++) await new Promise((x) => setTimeout(x, 100));
    return { plate: document.querySelector('.plate')?.textContent.replace(/\s+/g, ' ').trim(), cards: document.querySelectorAll('.modal-back:not(.out)').length };
  });
  report(/چالش روزانه/.test(rush.plate) && !rush.cards, `the rush starts from «امروز» (${JSON.stringify(rush)})`);
  report(!errors.length, `no page errors${errors.length ? ': ' + [...new Set(errors)].slice(0, 2).join(' | ') : ''}`);
  console.log(fails ? `${fails} failure(s)` : 'all ok');
  await b.close();
  process.exit(fails ? 1 : 0);
})();
