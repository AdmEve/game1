// Plays three whole lives through the real UI (answering events and mini-games at random) and reports
// page errors. Needs the game served on :5180 (npx vite --port 5180); run with NODE_PATH=$(npm root -g).
const { chromium } = require('playwright');
// Answers whatever is on screen, including the mini-games.
async function settle(p) {
  for (let k = 0; k < 40; k++) {
    await p.waitForTimeout(150);
    const top = p.locator('.backdrop.in').last();
    if (!(await top.count())) return;
    // Quiz-style modals (konkur, driving rules, TV show).
    const qa = top.locator('.quiz-a:not([disabled])');
    if (await qa.count()) { await qa.first().click(); await p.waitForTimeout(950); continue; }
    // Timing strips: tap at once.
    const gold = top.locator('.drive .btn.gold, .haggle .btn.gold');
    const prim = top.locator('.btn.primary');
    if (await top.locator('.drive-road').count() && await gold.count()) { await gold.first().click(); await p.waitForTimeout(950); continue; }
    if (await top.locator('.haggle').count()) { await top.locator('.haggle .btn.primary').first().click(); await p.waitForTimeout(300); continue; }
    const ch = top.locator('.event-modal .choice:not(.off)');
    if (await ch.count()) { const n = await ch.count(); await ch.nth(Math.floor(Math.random() * n)).click({ timeout: 3000 }).catch(() => {}); continue; }
    if (await prim.count()) { await prim.first().click({ timeout: 3000 }).catch(() => {}); continue; }
    const btns = top.locator('.btn');
    if (await btns.count()) { await btns.first().click({ timeout: 3000 }).catch(() => {}); continue; }
    return;
  }
}
(async () => {
  const b = await chromium.launch();
  const errs = [];
  for (let life = 0; life < 3; life++) {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    p.on('pageerror', (e) => errs.push(`life ${life}: ${e}`));
    p.on('console', (m) => { if (m.type() === 'error' && !/emoji|Failed to load resource/.test(m.text())) errs.push(`life ${life} console: ${m.text()}`); });
    await p.goto('http://localhost:5180/?debug');
    await p.evaluate(() => localStorage.clear());
    await p.reload();
    await p.waitForTimeout(800);
    await settle(p);
    await p.locator('.home-btns .btn').first().click(); await p.waitForTimeout(300);
    await p.locator('.sheet .btn.big.wide').click(); await p.waitForTimeout(400);
    await settle(p);
    let years = 0;
    for (; years < 110; years++) {
      if (await p.locator('.death-modal').count()) break;
      const age = p.locator('.age-btn');
      if (!(await age.count())) break;
      await age.click({ timeout: 5000 }).catch(() => {});
      await settle(p);
      // Now and then do an activity (buy a car, take the driving test, the TV show…).
      if (years % 7 === 3) {
        await p.evaluate(() => window.__z.currentLife() && (window.__z.currentLife().money += 5e9 * window.__z.currentLife().econ.price));
        const evs = [['driving_test', {}], ['haggle', { kind: 'car', ref: 'pride', price: 0 }], ['tv_quiz', {}], ['khastegari_session', { k: { first: 'سارا', last: 'کریمی', gender: 'f', age: 24, job: 'معلم', rich: 2, looks: 60, smarts: 60, trait: 'مهربون', via: 'آشنایی' } }], ['job_interview', { job: 'dev', A: 50 }]];
        const [id, prm] = evs[(years / 7 | 0) % evs.length];
        await p.evaluate(([id, prm]) => { const L = window.__z.currentLife(); if (!L || L.dead || L.age < 18) return; if (id === 'haggle') prm.price = Math.round(500e6 * L.econ.car); window.__z.event(id, prm); }, [id, prm]);
        await settle(p);
      }
    }
    console.log(`life ${life}: ${years} years, dead=${await p.locator('.death-modal').count()}`);
    await p.close();
  }
  console.log('errors', errs.slice(0, 10));
  await b.close();
})();
