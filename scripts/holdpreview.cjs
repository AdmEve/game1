// Hold to see the way out (BEST_IN_MARKET_PLAN D4), with real pointer events through the tap pick:
// a quick tap never shows the route; a finger held on a free car shows a clear route ending past the edge;
// sliding off hides it and cancels the tap; a held blocked car shows red; a route through a tunnel shows both legs;
// a covered car shows nothing. Screenshots of each go to the out dir.
//   npx vite preview --port 4173 & URL=http://127.0.0.1:4173/ node scripts/holdpreview.cjs [out-dir]
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://127.0.0.1:4173/';
const out = process.argv[2];
let fails = 0;
const report = (ok, msg) => { if (!ok) fails++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); };
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, userAgent: 'Mozilla/5.0 (Linux; Android 13) Mobile' });
  const errors = []; p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(URL + '?play', { waitUntil: 'load' });
  await p.waitForFunction(() => document.title === 'ready', null, { timeout: 300000 });
  await p.evaluate(() => {
    const rb = window.__rb;
    rb.save.seen = Object.fromEntries(['help-bay', 'help-crane', 'help-whistle', 'spot', 'cover', 'broken', 'vip', 'oddEven', 'courier', 'tunnel', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8'].map((k) => [k, true])); for (let k = 0; k < 400; k++) rb.save.seen['boss' + k] = true;
    // Where a car is on screen, and what the lane preview shows now.
    window.__screen = (i) => { const q = rb.session().anchor(i).project(rb.camera); return [((q.x + 1) / 2) * innerWidth, ((1 - q.y) / 2) * innerHeight]; };
    window.__lane = () => { const k = []; rb.scene.traverse((o) => { if (o.visible && o.userData.lane) k.push(o.userData.lane); }); return k; };
    window.__ptr = (type, x, y) => rb.renderer.domElement.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, bubbles: true, pointerId: 1, isPrimary: true }));
  });
  const level = async (n) => p.evaluate(async (n) => {
    const rb = window.__rb;
    document.querySelectorAll('.modal-back').forEach((m) => m.remove()); document.body.classList.remove('at-home');
    rb.save.level = n; await rb.goLevel(n, undefined, false);
    document.querySelectorAll('.modal-back').forEach((m) => m.remove());
    for (let k = 0; k < 40 && rb.swooping(); k++) await new Promise((r) => setTimeout(r, 100));
    document.querySelectorAll('.hud .toast, .hand, .spot, .mark').forEach((e) => (e.style.visibility = 'hidden'));
    const s = rb.session(), cars = s.s.inLot.map((_, i) => i).filter((i) => s.s.inLot[i]);
    const r = (i) => rb.route(i);
    return {
      free: cars.find((i) => s.s.revealed[i] && r(i).end === 'out' && !r(i).hold && r(i).legs.length >= 1),
      blocked: cars.find((i) => s.s.revealed[i] && r(i).end === 'blocked' && r(i).legs.length >= 1),
      tunnel: cars.find((i) => s.s.revealed[i] && r(i).legs.length >= 2),
      covered: cars.find((i) => !s.s.revealed[i]),
    };
  }, n);
  const hold = async (i, ms = 450) => { const [x, y] = await p.evaluate((i) => window.__screen(i), i); await p.evaluate(([x, y]) => window.__ptr('pointerdown', x, y), [x, y]); await p.waitForTimeout(ms); return [x, y]; };
  const lane = () => p.evaluate(() => window.__lane());
  const shot = (name) => out ? p.screenshot({ path: `${out}/hold-${name}.png`, timeout: 120000 }) : null;

  // A dense board: free and blocked cars.
  let c = await level(59);
  if (c.free === undefined || c.blocked === undefined) report(false, `level 60: no free/blocked car found (${JSON.stringify(c)})`);
  else {
    // A quick tap: the route never shows (the car does go). Done inside the page on timers, released (90 ms) before
    // the preview's own timer is due (150 ms): timers fire in that order however slow the machine, where round trips
    // from here once stretched a "quick" tap past 150 ms on a slow CI runner.
    const during = await p.evaluate((i) => new Promise((done) => {
      const [x, y] = window.__screen(i), seen = [];
      window.__ptr('pointerdown', x, y);
      setTimeout(() => seen.push(window.__lane().length), 40);
      setTimeout(() => {
        seen.push(window.__lane().length);
        window.__ptr('pointerup', x, y);
        setTimeout(() => { seen.push(window.__lane().length); done(seen); }, 300);
      }, 90);
    }), c.free);
    report(during.every((n) => n === 0), `quick tap (90 ms): route never shows (${during.join(',')})`);
    c = await level(59);
    // Held on a free car: a clear route.
    const [hx, hy] = await hold(c.free);
    let k = await lane();
    report(k.length >= 2 && k.every((x) => x === 'go'), `held on a free car: clear route (${k.join(',')})`);
    await shot('free');
    // Sliding off: hidden, and the tap is cancelled.
    await p.evaluate(([x, y]) => window.__ptr('pointermove', x + 40, y), [hx, hy]);
    k = await lane();
    await p.evaluate(([x, y]) => window.__ptr('pointerup', x + 40, y), [hx, hy]);
    await p.waitForTimeout(300);
    const stayed = await p.evaluate((i) => window.__rb.session().s.inLot[i], c.free);
    report(k.length === 0 && stayed, `slide off: route hidden (${k.length} left), car stays put (${stayed})`);
    // Held on a blocked car: red, then released (the tap goes through as a bump), route gone.
    const [bx, by] = await hold(c.blocked);
    k = await lane();
    report(k.length >= 2 && k.every((x) => x === 'stop'), `held on a blocked car: red route to the blocker (${k.join(',')})`);
    await shot('blocked');
    await p.evaluate(([x, y]) => window.__ptr('pointerup', x, y), [bx, by]);
    await p.waitForTimeout(200);
    report((await lane()).length === 0, 'released: route gone');
  }
  // A tunnel route: both legs.
  // (The first tunnel levels where some car's way out goes through a tunnel from the start.)
  const tunnelLevels = await p.evaluate(() => window.__rb.levels.map((l, n) => ((l.obstacles || []).some((o) => o.kind === 'tunnel') ? n : -1)).filter((n) => n >= 0));
  for (const n of tunnelLevels) { c = await level(n); if (c.tunnel !== undefined) break; }
  if (c.tunnel === undefined) report(false, 'no level with a car routed through a tunnel at the start');
  else {
    const [tx, ty] = await hold(c.tunnel);
    const k = await lane();
    report(k.filter((x) => x !== null).length >= 3, `held on a car whose way goes through a tunnel: ${k.length} pieces (${k.join(',')})`);
    await shot('tunnel');
    await p.evaluate(([x, y]) => window.__ptr('pointermove', x + 40, y), [tx, ty]);
    await p.evaluate(([x, y]) => window.__ptr('pointerup', x + 40, y), [tx, ty]);
  }
  // A covered car: nothing (its way would give it away).
  const coverLevel = await p.evaluate(() => window.__rb.levels.findIndex((l) => l.vehicles.some((v) => v.covered)));
  c = await level(coverLevel);
  if (c.covered !== undefined) {
    const [cx, cy] = await hold(c.covered);
    const k = await lane();
    report(k.length === 0, `held on a covered car: nothing shown (${k.length})`);
    await p.evaluate(([x, y]) => window.__ptr('pointermove', x + 40, y), [cx, cy]);
    await p.evaluate(([x, y]) => window.__ptr('pointerup', x + 40, y), [cx, cy]);
  }
  report(!errors.length, `no page errors${errors.length ? ': ' + [...new Set(errors)].slice(0, 2).join(' | ') : ''}`);
  console.log(fails ? `${fails} failure(s)` : 'all ok');
  await b.close();
  process.exit(fails ? 1 : 0);
})();
