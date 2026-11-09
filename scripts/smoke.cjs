// Smoke test of a production build (CI runs it before publishing the APK): boot a fresh save straight into
// level 1, win it with real taps, back to home, open and close the garage's 3D view, with no page errors and nothing
// in the game's own error log.
//   npx vite preview --port 4173 & URL=http://127.0.0.1:4173/ node scripts/smoke.cjs
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://127.0.0.1:4173/';
const step = (s) => console.log(`[smoke] ${s}`);
(async () => {
  const t0 = Date.now();
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 1, userAgent: 'Mozilla/5.0 (Linux; Android 13) Mobile' });
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/GL Driver|WebGL|favicon/i.test(m.text())) errors.push('console: ' + m.text()); });
  const fail = async (why) => { console.log(`[smoke] FAIL: ${why}`); if (errors.length) console.log('[smoke] errors:', errors.slice(0, 8)); await p.screenshot({ path: 'smoke-fail.png' }).catch(() => {}); await b.close(); process.exit(1); };
  try {
    await p.goto(URL, { waitUntil: 'load' });
    await p.waitForFunction(() => document.title === 'ready', null, { timeout: 300000 });
    step(`booted in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    // A fresh save starts in level 1 (no home card first; home comes from the first win on).
    if (await p.$('.modal-back:not(.out) .home-card')) await fail('a fresh save opened on home instead of level 1');
    await p.waitForFunction(() => !window.__rb.swooping() && !document.querySelector('.modal-back') && window.__rb.session()?.level, null, { timeout: 120000 });
    step('in level 1');
    // Win level 1 like a new player: tap the car the hint suggests (the hint search runs in a worker, and on a fresh
    // save level 1's spotlight only accepts that car), with real pointer events through the tap pick.
    let taps = 0;
    for (let k = 0; k < 30 && !(await p.$('.result.win')); k++) {
      // (Returned as move + 1: car 0 is a real answer, and 0 would read as "not yet".)
      const m = await p.waitForFunction(() => { const s = window.__rb.session(); if (s.s.over) return -1; const h = s.hint(); return h >= 0 ? h + 1 : false; }, null, { timeout: 60000, polling: 200 }).then(async (h) => (await h.jsonValue()) - 1).catch(() => -3);
      if (m === -2) break;
      if (m < 0) await fail('no hint');
      await p.evaluate((m) => {
        const r = window.__rb, s = r.session(), q = s.anchor(m).project(r.camera), cv = r.renderer.domElement;
        const o = { clientX: ((q.x + 1) / 2) * innerWidth, clientY: ((1 - q.y) / 2) * innerHeight, bubbles: true, pointerId: 1, isPrimary: true };
        cv.dispatchEvent(new PointerEvent('pointerdown', o)); cv.dispatchEvent(new PointerEvent('pointerup', o));
      }, m);
      await p.waitForFunction((m) => !window.__rb.session().s.inLot[m], m, { timeout: 30000 }).catch(() => fail(`car ${m} did not leave`));
      taps++;
    }
    const moves = { length: taps };
    await p.waitForSelector('.result.win', { timeout: 180000 }).catch(() => fail('no win card'));
    step(`won level 1 (${moves.length} taps)`);
    // Back on the win card goes home (a chest or rating may come first).
    for (let k = 0; k < 4 && !(await p.$('.modal-back:not(.out) .home-card')); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(1500); }
    await p.waitForSelector('.modal-back:not(.out) .home-card', { timeout: 120000 }).catch(() => fail('back did not reach home'));
    step('back to home');
    await p.click('.garage-btn');
    await p.waitForSelector('.garage-card canvas', { timeout: 60000 }).catch(() => fail('garage did not open'));
    await p.waitForTimeout(1500);
    await p.keyboard.press('Escape');
    await p.waitForSelector('.modal-back:not(.out) .home-card', { timeout: 60000 }).catch(() => fail('garage did not close'));
    step('garage opened and closed');
    const logged = await p.evaluate(() => window.__rb.errors());
    if (logged.length) errors.push(...logged.map((e) => 'errlog: ' + e.m));
    if (errors.length) await fail('errors on the page');
    step(`ok in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    await b.close();
  } catch (e) { await fail(e.message); }
})();
