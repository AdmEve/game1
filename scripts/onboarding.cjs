// Onboarding check: the level-1 spotlight (wrong car refused, suggested car accepted) and the marker after
// level 7's cover intro. Writes <out>-spot.png and <out>-mark.png.
//   node scripts/onboarding.cjs /tmp/ob
const { chromium } = require('playwright');
const out = process.argv[2];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, userAgent: 'Mozilla/5.0 (Linux; Android 12) Mobile' });
  const errors = []; p.on('pageerror', (e) => errors.push(e.message));
  await p.goto((process.env.URL || 'http://127.0.0.1:5173/'), { waitUntil: 'load' });
  await p.waitForFunction(() => document.title === 'ready', null, { timeout: 120000 });
  await p.click('.home-card .btn.primary.huge'); await p.waitForTimeout(800);
  await p.evaluate(() => document.querySelectorAll('.modal-back .card [data-back]').forEach((x) => x.click()));
  await p.waitForFunction(() => !window.__rb.swooping(), null, { timeout: 90000 }).catch(() => console.log("still swooping")); await p.waitForTimeout(400);
  await p.waitForFunction(() => document.querySelector('.spot').classList.contains('show'), null, { timeout: 20000 }).catch(() => console.log('no spot'));
  await p.waitForTimeout(500);
  const st = await p.evaluate(() => ({ spot: document.querySelector('.spot').classList.contains('show'), hand: document.querySelector('.hand').classList.contains('show') }));
  console.log('spotlight on level 1:', JSON.stringify(st));
  if (out) await p.screenshot({ path: out + '-spot.png' });
  // Tap a car that is not the suggested one: refused.
  const r = await p.evaluate(async () => {
    const rb = window.__rb, s = rb.session();
    const hintEl = document.querySelector('.hand');
    const hx = parseFloat(hintEl.style.left), hy = parseFloat(hintEl.style.top);
    const target = rb.pick(hx, hy);
    const other = s.s.inLot.findIndex((x, i) => x && i !== target); if (other < 0) return { target, inLot: s.s.inLot };
    const q = s.anchor(other).project(rb.camera), cv = rb.renderer.domElement;
    const o = { clientX: ((q.x + 1) / 2) * innerWidth, clientY: ((1 - q.y) / 2) * innerHeight, bubbles: true, pointerId: 1, isPrimary: true };
    cv.dispatchEvent(new PointerEvent('pointerdown', o)); cv.dispatchEvent(new PointerEvent('pointerup', o));
    const after1 = s.taps;
    const q2 = s.anchor(target).project(rb.camera);
    const o2 = { clientX: ((q2.x + 1) / 2) * innerWidth, clientY: ((1 - q2.y) / 2) * innerHeight, bubbles: true, pointerId: 1, isPrimary: true };
    cv.dispatchEvent(new PointerEvent('pointerdown', o2)); cv.dispatchEvent(new PointerEvent('pointerup', o2));
    return { target, other, tapsAfterWrong: after1, tapsAfterRight: s.taps };
  });
  console.log('refuse wrong, accept right:', JSON.stringify(r));
  // Mechanic pointer: level 7 introduces covers.
  await p.evaluate(() => { const rb = window.__rb; rb.save.level = 6; rb.save.seen = { 'help-bay': true, 'help-crane': true, 'help-whistle': true, ch1: true }; rb.startLevel(6, undefined, false); });
  await p.waitForTimeout(500);
  const hasIntro = await p.evaluate(() => !!document.querySelector('.modal-back .intro'));
  await p.addStyleTag({ content: '.mark, .mark * { transition: none !important; animation: none !important; }' });
  await p.evaluate(() => document.querySelector('.modal-back .intro [data-back]').click());
  await p.waitForTimeout(300);
  await p.evaluate(() => window.__rb.pointAt('cover', 60000));
  await p.waitForTimeout(300);
  const mk = await p.evaluate(() => ({ show: document.querySelector('.mark').classList.contains('show'), label: document.querySelector('.mark span').textContent, tf: document.querySelector('.mark').style.transform }));
  console.log('intro card:', hasIntro, 'marker:', JSON.stringify(mk));
  console.log(await p.evaluate(() => { const m = document.querySelector('.mark'), cs = getComputedStyle(m), r = m.querySelector('i').getBoundingClientRect(); return JSON.stringify({ op: cs.opacity, disp: cs.display, z: cs.zIndex, pos: cs.position, r: [r.x, r.y, r.width, r.height], parent: m.parentElement.tagName }); }));
  if (out) await p.screenshot({ path: out + '-mark.png' });
  if (errors.length) console.log('errors', errors);
  await b.close();
})();
