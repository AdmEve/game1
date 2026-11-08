// Win streak and last-bay checks: a streak of 2 gives a free extra bay and a free crane on the next new level;
// the free crane is used without touching the inventory; a win raises the streak (and the card says so);
// restarting a played level asks first and resets it; the last free bay is outlined.
//   node scripts/streak.cjs [out-prefix]
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://127.0.0.1:5173/';
const out = process.argv[2];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, userAgent: 'Mozilla/5.0 (Linux; Android 12) Mobile' });
  const errors = []; p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(URL + '?play&shot', { waitUntil: 'load' });
  await p.waitForFunction(() => document.title === 'ready', null, { timeout: 120000 });
  let fails = 0; const check = (name, ok, info) => { if (!ok) fails++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : ' ' + JSON.stringify(info)}`); };
  const st = await p.evaluate(() => {
    const r = window.__rb; Object.assign(r.save, { level: 4, streak: 2 }); r.save.seen = { spot: true };
    const bays0 = r.levels[4].bays ?? 5;
    r.startLevel(4, undefined, false); document.querySelectorAll('.modal-back').forEach((m) => m.remove());
    const s = r.session();
    return { bays0, bays: s.s.bays.length, free: [...document.querySelectorAll('.bst .cnt.free')].map((e) => e.closest('.bst').className), crane: r.save.boosters.crane };
  });
  check('streak 2: an extra bay from the start', st.bays === Math.min(6, st.bays0 + 1), st);
  check('streak 2: the crane is free', st.free.length === 1 && st.free[0].includes('bst-crane'), st);
  if (out) await p.screenshot({ path: out + '-free.png' });
  // Use the free crane on a car.
  const cr = await p.evaluate(async () => {
    const r = window.__rb, s = r.session();
    document.querySelector('.bst-crane').click();
    const i = s.s.inLot.findIndex(Boolean), q = s.anchor(i).project(r.camera), cv = r.renderer.domElement;
    const o = { clientX: ((q.x + 1) / 2) * innerWidth, clientY: ((1 - q.y) / 2) * innerHeight, bubbles: true, pointerId: 1, isPrimary: true };
    cv.dispatchEvent(new PointerEvent('pointerdown', o)); cv.dispatchEvent(new PointerEvent('pointerup', o));
    await r.advance(1.5);
    return { crane: r.save.boosters.crane, inLot: s.s.inLot[i], freeLeft: document.querySelectorAll('.bst .cnt.free').length };
  });
  check('free crane used, inventory untouched', cr.crane === st.crane && cr.inLot === false && cr.freeLeft === 0, cr);
  // Win the level (solver from the current state is not available; restart without the crane and play the solution).
  const win = await p.evaluate(async () => {
    const r = window.__rb; r.startLevel(4, undefined, false); document.querySelectorAll('.modal-back').forEach((m) => m.remove());
    const s = r.session(); const { solve } = await import('/src/game/solver.ts');
    for (const m of solve(s.level).solution) { s.tap(m); await r.advance(0.7); }
    for (let k = 0; k < 120 && !document.querySelector('.result'); k++) await r.advance(0.5);
    return { streak: r.save.streak, note: document.querySelector('.result .streak-note')?.textContent ?? null, stats: r.save.lvStats['5'] };
  });
  check('win raises the streak to 3 and the card says so', win.streak === 3 && !!win.note, win);
  if (out) await p.screenshot({ path: out + '-win.png' });
  // Restart a played new level from the pause card: asked first; "keep going" keeps it, "give up" resets it.
  const gu = await p.evaluate(async () => {
    const r = window.__rb; document.querySelectorAll('.modal-back').forEach((m) => m.remove());
    r.save.level = 5; r.startLevel(5, undefined, false); document.querySelectorAll('.modal-back').forEach((m) => m.remove());
    const s = r.session(); s.tap(s.s.inLot.findIndex(Boolean)); await r.advance(0.3);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await new Promise((x) => setTimeout(x, 300));
    document.querySelector('.pause-row .btn').click();
    await new Promise((x) => setTimeout(x, 300));
    const asked = !!document.querySelector('.modal-back:not(.out) .confirm');
    document.querySelector('.modal-back:not(.out) .confirm [data-back]').click();
    await new Promise((x) => setTimeout(x, 300));
    const kept = r.save.streak;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await new Promise((x) => setTimeout(x, 300));
    document.querySelector('.pause-row .btn').click();
    await new Promise((x) => setTimeout(x, 300));
    [...document.querySelectorAll('.modal-back:not(.out) .confirm .btn')].find((x) => x.textContent.includes('ول کن')).click();
    await new Promise((x) => setTimeout(x, 300));
    return { asked, kept, after: r.save.streak };
  });
  check('giving up asks first, then resets the streak', gu.asked && gu.kept === 3 && gu.after === 0, gu);
  // Last free bay: a careless player sends cars nobody at the front of the queue wants, until one bay is left.
  const warn = await p.evaluate(async () => {
    const r = window.__rb; await new Promise((x) => setTimeout(x, 2500)); document.querySelectorAll('.modal-back').forEach((m) => m.remove());
    r.save.streak = 0; Object.assign(r.save.seen, { spot: true, cover: true, broken: true, vip: true, oddEven: true, courier: true, officer: true, cart: true, wedding: true, granny: true, tunnel: true, ch2: true });
    r.startLevel(40, undefined, false); document.querySelectorAll('.modal-back').forEach((m) => m.remove());
    const s = r.session();
    let seen = 0, wrong = 0, toast = '', minFree = 9;
    const red = () => { let v = false; s.group.traverse((o) => { if (o.isMesh && o.visible && o.material?.color?.getHex?.() === 0xff4a3d) v = true; }); return v; };
    const toasts = [];
    new MutationObserver(() => toasts.push(document.querySelector('.hud .toast').textContent)).observe(document.querySelector('.hud .toast'), { childList: true, characterData: true, subtree: true });
    const stuck = new Set();
    for (let k = 0; k < 80 && !s.s.over; k++) {
      const want = s.s.queue[s.s.q];
      const i = s.level.vehicles.findIndex((v, j) => s.s.inLot[j] && v.color !== want && v.kind !== 'bike' && !stuck.has(j));
      if (i < 0) break;
      s.tap(i); await r.advance(0.2);
      if (s.s.inLot[i]) { stuck.add(i); continue; } // blocked: try another car
      stuck.clear();
      const free = s.s.bays.filter((x) => !x).length, on = red();
      minFree = Math.min(minFree, free);
      if (on) seen++;
      if (on !== (free === 1 && s.s.inLot.some(Boolean) && !s.s.over)) wrong++;
      if (free === 1 && seen) break;
    }
    await new Promise((x) => setTimeout(x, 50));
    toast = toasts.filter((t) => t.includes('آخرین')).join(' | ');
    return { seen, wrong, toast, minFree, toasts: toasts.slice(-4) };
  });
  check('last free bay outlined exactly when one bay is left', warn.seen > 0 && warn.wrong === 0, warn);
  check('last-bay toast once', warn.toast.includes('آخرین'), warn);
  if (errors.length) { console.log('page errors:', errors.slice(0, 5)); fails++; }
  await b.close();
  if (fails) process.exitCode = 1;
})();
