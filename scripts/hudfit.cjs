// HUD layout audit in play: on levels that show the most HUD at once (clock, tap budget, plate-rule or officer sign),
// at small and large phone sizes, with and without larger text: HUD pieces must not overlap each other or leave the
// screen, the top HUD must not cover any car (a tap there would hit the HUD instead), and toasts must not sit over cars.
//   node scripts/hudfit.cjs
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://127.0.0.1:5173/';
const SEEN = ['spot', 'cover', 'broken', 'vip', 'oddEven', 'courier', 'officer', 'cart', 'wedding', 'granny', 'tunnel', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8'];
(async () => {
  const b = await chromium.launch();
  let problems = 0;
  for (const [W, H] of [[360, 640], [412, 915]]) for (const big of [false, true]) {
    const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1, userAgent: 'Mozilla/5.0 (Linux; Android 12) Mobile' });
    await p.goto(URL + '?play&shot', { waitUntil: 'load' });
    await p.waitForFunction(() => document.title === 'ready', null, { timeout: 120000 });
    for (const L of [30, 120, 240]) {
      const r = await p.evaluate(async ([L, seen, big]) => {
        const rb = window.__rb;
        rb.save.seen = Object.fromEntries(seen.map((k) => [k, true])); for (let k = 0; k < 400; k++) rb.save.seen['boss' + k] = true;
        document.documentElement.classList.toggle('big-text', big);
        rb.save.level = L - 1; rb.startLevel(L - 1, undefined, false);
        document.querySelectorAll('.modal-back').forEach((m) => m.remove());
        window.dispatchEvent(new Event('resize'));
        await rb.advance(0.2);
        // A long toast, as the start-of-level notes show.
        const toast = document.querySelector('.hud .toast'); toast.textContent = 'این مرحله ۴۶ ثانیه وقت داره! ساعت از اولین ضربه شروع می‌شه.'; toast.classList.add('show');
        await new Promise((x) => setTimeout(x, 300));
        // (An earlier toast's own timer may have hidden ours meanwhile: measure it shown, without the slide-in.)
        toast.style.transition = 'none'; toast.classList.add('show');
        const vis = (el) => el && el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden' && el.getBoundingClientRect().width > 0;
        const parts = { gear: '.hud .gear', plate: '.hud .plate', coins: '.hud .coins', people: '.hud .people', limit: '.hud .limit', sign: '.hud .camsign:not(.cop)', cop: '.hud .camsign.cop', boosters: '.hud .boosters', toast: '.hud .toast' };
        const rects = {};
        for (const [k, sel] of Object.entries(parts)) { const el = document.querySelector(sel); if (vis(el)) { const q = el.getBoundingClientRect(); rects[k] = { l: q.left, t: q.top, r: q.right, b: q.bottom }; } }
        const over = [];
        const ks = Object.keys(rects);
        for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) {
          const a = rects[ks[i]], c = rects[ks[j]];
          if (a.l < c.r - 1 && c.l < a.r - 1 && a.t < c.b - 1 && c.t < a.b - 1) over.push(`${ks[i]}×${ks[j]}`);
        }
        const out = ks.filter((k) => rects[k].l < -1 || rects[k].r > innerWidth + 1 || rects[k].t < -1 || rects[k].b > innerHeight + 1);
        // Cars under the top HUD: the highest point of any car on screen vs the lowest top-HUD edge (toast aside: it fades).
        const s = rb.session(), cam = rb.camera, V = cam.position.constructor;
        let carTop = Infinity, carBottom = -Infinity;
        s.cars.forEach((c, i) => {
          if (!s.s.inLot[i]) return;
          c.body.updateWorldMatrix(true, false);
          for (let k = 0; k < 8; k++) {
            const q = new V(k & 1 ? c.box.max.x : c.box.min.x, k & 2 ? c.box.max.y : c.box.min.y, k & 4 ? c.box.max.z : c.box.min.z).applyMatrix4(c.body.matrixWorld).project(cam);
            const y = ((1 - q.y) / 2) * innerHeight; carTop = Math.min(carTop, y); carBottom = Math.max(carBottom, y);
          }
        });
        const hudBottom = Math.max(...['gear', 'plate', 'coins', 'people', 'limit', 'sign', 'cop'].filter((k) => rects[k]).map((k) => rects[k].b));
        const barTop = rects.boosters ? rects.boosters.t : innerHeight;
        return { over, out, carTop: Math.round(carTop), hudBottom: Math.round(hudBottom), carBottom: Math.round(carBottom), barTop: Math.round(barTop), shown: ks.join(','), toastTop: Math.round(rects.toast?.t ?? 9999), toastBottom: Math.round(rects.toast?.b ?? 9999) };
      }, [L, SEEN, big]);
      const covered = r.carTop < r.hudBottom - 2, underBar = r.carBottom > r.barTop + 2, toastOnCars = r.toastTop < r.carBottom - 2 && r.toastBottom > r.carTop + 2;
      const ok = !r.over.length && !r.out.length && !covered && !underBar && !toastOnCars;
      if (!ok) problems++;
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${W}×${H}${big ? ' big' : '    '} L${L}: HUD ${r.shown}${r.over.length ? `  OVERLAP ${r.over.join(' ')}` : ''}${r.out.length ? `  OFF-SCREEN ${r.out.join(',')}` : ''}  cars ${r.carTop}–${r.carBottom}px, top HUD ends ${r.hudBottom}px${covered ? ' (COVERS CARS)' : ''}, boosters start ${r.barTop}px${underBar ? ' (CARS UNDER BAR)' : ''}, toast ${r.toastTop}–${r.toastBottom}px${toastOnCars ? ' (TOAST OVER CARS)' : ''}`);
    }
    await p.close();
  }
  await b.close();
  if (problems) process.exitCode = 1;
})();
