// Store feature graphic (1024×500, the banner Cafe Bazaar and Myket show for featured apps), made from the game
// itself: Milad tower at dusk as the backdrop (the level-start camera's landmark shot), a phone with real play on it,
// the splash's yellow taxi in front, and the logo on the right (Persian reads from the right).
//   npx vite build && npx vite preview --port 4173 &  node scripts/store-feature.cjs   → store/feature-1024x500.jpg
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const URL = process.env.URL || 'http://127.0.0.1:4173/';
const seen = "window.__rb.save.seen={'help-bay':true,'help-crane':true,'help-whistle':true,spot:true,cover:true,broken:true,vip:true,oddEven:true,courier:true,officer:true,cart:true,wedding:true,granny:true,tunnel:true,ch2:true,ch3:true,ch4:true,ch5:true,ch6:true,ch7:true,ch8:true}; for (let k = 0; k < 400; k++) window.__rb.save.seen['boss' + k] = true;";
const hide = '.hud, .hand, .spot, .mark, .level-banner, .hint-chip, .toast { visibility: hidden !important; }';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  // The backdrop: Milad at dusk from the level-start camera, at twice the banner's size.
  let p = await b.newPage({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 2, userAgent: 'Mozilla/5.0 (Linux; Android 13) Mobile' });
  await p.goto(`${URL}?shot&play`);
  await p.waitForFunction(() => document.title === 'ready', null, { timeout: 240000 });
  await p.addStyleTag({ content: hide });
  await p.evaluate(`${seen} window.__rb.save.level=212; window.__rb.startLevel(); document.querySelectorAll('.modal-back').forEach((m) => m.remove());`);
  await p.evaluate(() => window.__rb.advance(0.8));
  await p.evaluate(() => window.__rb.swoop(0.3));
  const back = (await p.screenshot({ timeout: 240000 })).toString('base64');
  await p.close();
  // The phone: a busy Tajrish lot mid-play, as on the first store screenshot.
  p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, userAgent: 'Mozilla/5.0 (Linux; Android 13) Mobile' });
  await p.goto(`${URL}?shot&play`);
  await p.waitForFunction(() => document.title === 'ready', null, { timeout: 240000 });
  await p.evaluate(`${seen} window.__rb.save.level=11; window.__rb.startLevel(); document.querySelectorAll('.modal-back').forEach((m) => m.remove());`);
  await p.evaluate(async () => { const r = window.__rb, s = r.session(), sol = r.solve(s.level); s.tap(sol[0]); await r.advance(1.4); s.tap(sol[1]); await r.advance(0.9); s.tap(sol[2]); await r.advance(1.5); });
  await p.evaluate(() => document.querySelectorAll('.hud .toast, .hand, .spot, .mark').forEach((e) => (e.style.visibility = 'hidden')));
  const play = (await p.screenshot({ timeout: 240000 })).toString('base64');
  await p.close();
  const taxi = fs.readFileSync(path.join(root, 'public/hero-taxi.webp')).toString('base64');
  const font = path.join(root, 'node_modules/vazirmatn/fonts/webfonts/');
  // Compose at 2× and let the browser downscale once, for clean edges.
  p = await b.newPage({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 });
  await p.setContent(`<html dir="rtl"><head><style>
    @font-face { font-family: V; src: url('file://${font}Vazirmatn-Black.woff2'); font-weight: 900; }
    @font-face { font-family: V; src: url('file://${font}Vazirmatn-Bold.woff2'); font-weight: 700; }
    * { margin: 0; box-sizing: border-box; }
    body { width: 1024px; height: 500px; overflow: hidden; position: relative; font-family: V; background: #101c30; }
    .bg { position: absolute; inset: 0; background: url(data:image/png;base64,${back}) center / cover; filter: saturate(1.1); }
    /* Navy from the right (where the logo is) into the scene; a darker floor so the taxi and phone stand out. */
    .shade { position: absolute; inset: 0; background:
      linear-gradient(270deg, rgba(16, 28, 48, .97) 0%, rgba(16, 28, 48, .9) 34%, rgba(16, 28, 48, .35) 62%, rgba(16, 28, 48, .15) 100%),
      linear-gradient(0deg, rgba(8, 12, 20, .65), rgba(8, 12, 20, 0) 45%); }
    .logo { position: absolute; right: 64px; top: 118px; width: 420px; text-align: center; color: #fff; }
    .logo .sign { font-size: 104px; font-weight: 900; line-height: 1.05; letter-spacing: -2px; text-shadow: 0 6px 24px rgba(0, 0, 0, .45); }
    .logo .en { margin-top: 12px; display: flex; align-items: center; justify-content: center; gap: 14px; direction: ltr; white-space: nowrap; font: 600 16px/1 system-ui, 'Segoe UI', sans-serif; letter-spacing: 7px; color: #f2b124; }
    .logo .en i { width: 30px; height: 2px; background: rgba(242, 177, 36, .65); }
    .logo .tag { margin-top: 22px; font-size: 27px; font-weight: 700; color: rgba(255, 255, 255, .92); }
    .logo .chips { margin-top: 20px; display: flex; justify-content: center; gap: 10px; }
    .logo .chips span { font-size: 16px; font-weight: 700; color: #ffd166; border: 1.5px solid rgba(242, 177, 36, .55); background: rgba(242, 177, 36, .12); border-radius: 999px; padding: 4px 14px; }
    .phone { position: absolute; left: 150px; top: 44px; width: 216px; height: 467px; border-radius: 30px; overflow: hidden; border: 7px solid #0b1220;
      box-shadow: 0 30px 60px rgba(0, 0, 0, .55), 0 0 0 1px rgba(255, 255, 255, .08); transform: rotate(-7deg); }
    .phone img { width: 100%; height: 100%; object-fit: cover; object-position: top; }
    .taxi { position: absolute; left: 262px; top: 272px; width: 248px; filter: drop-shadow(0 22px 26px rgba(0, 0, 0, .55)); }
  </style></head><body>
    <div class="bg"></div><div class="shade"></div>
    <div class="phone"><img src="data:image/png;base64,${play}"></div>
    <img class="taxi" src="data:image/webp;base64,${taxi}">
    <div class="logo"><div class="sign">راه‌بندون</div><div class="en"><i></i><span>TEHRAN · GRIDLOCK</span><i></i></div><div class="tag">ترافیک تهران، تو دستای تو!</div>
      <div class="chips"><span>۲۴۰ مرحله</span><span>ماشین‌های ایرانی</span><span>۸ محله‌ی تهران</span></div></div>
  </body></html>`);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(200);
  const out = path.join(root, 'store/feature-1024x500.jpg');
  await p.screenshot({ path: out, type: 'jpeg', quality: 92 });
  console.log('wrote', out, fs.statSync(out).size, 'bytes');
  await b.close();
})();
