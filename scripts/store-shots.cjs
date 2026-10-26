// Store screenshots for Cafe Bazaar / Myket: captures scenes from the dev server and composes them
// with Persian captions into 1242×2688 images in store/.
//   (dev server running on :5173)  node scripts/store-shots.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const out = path.join(root, 'store');
fs.mkdirSync(out, { recursive: true });
const seen = "window.__rb.save.seen={cover:true,broken:true,vip:true,oddEven:true,courier:true,ch2:true,ch3:true};";
const shots = [
  { name: '1-gameplay', caption: 'ترافیک تهران، تو دستای تو!', sub: 'ماشین‌ها رو آزاد کن، مسافرها رو برسون', setup: `${seen} window.__rb.save.level=11; window.__rb.startLevel(); (async () => { const s = window.__rb.session(); const { solve } = await import('/src/game/solver.ts'); const sol = solve(s.level).solution; s.tap(sol[0]); await window.__rb.advance(1.4); s.tap(sol[1]); await window.__rb.advance(0.9); s.tap(sol[2]); })()`, ms: 1500 },
  { name: '2-cars', caption: 'ماشین‌های واقعی ایرانی', sub: 'پیکان، پراید، ۴۰۵، سمند، زامیاد و اتوبوس تندرو', setup: `${seen} window.__rb.save.level=29; window.__rb.startLevel();`, ms: 300 },
  { name: '3-valiasr', caption: 'غروب خیابان ولیعصر', sub: 'از تجریش تا میدان آزادی، فصل به فصل', setup: `${seen} window.__rb.save.level=40; window.__rb.startLevel();`, ms: 300 },
  { name: '4-azadi', caption: 'شب‌های میدان آزادی', sub: '۹۰ مرحله‌ی هیجان‌انگیز و رو به افزایش', setup: `${seen} window.__rb.save.level=66; window.__rb.startLevel();`, ms: 300 },
  { name: '5-garage', caption: 'گاراژ من', sub: 'ژیان، پیکان جوانان و شورولت رو بازسازی کن', setup: `window.__rb.save.garage={keys:6,restored:['javanan']}; (async () => { const g = await import('/src/ui/garage.ts'); g.showGarage(() => {}); })()`, ms: 100 },
  { name: '6-home', caption: 'رادیو راه‌بندون و جایزه‌های روزانه', sub: 'هر روز یه هدیه، هر هفته یه سوئیچ', setup: `window.__rb.save.garage={keys:4,restored:[]}`, ms: 300, home: true },
];
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const s of shots) {
    const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
    await p.goto(`http://127.0.0.1:5173/?shot${s.home ? '' : '&play'}`);
    await p.waitForFunction(() => document.title === 'ready', null, { timeout: 240000 });
    await p.evaluate(s.setup);
    await p.waitForTimeout(400);
    await p.evaluate((ms) => window.__rb.advance(ms / 1000), s.ms);
    await p.screenshot({ path: `/tmp/raw-${s.name}.png` });
    await p.close();
  }
  // Compose: green road-sign backdrop, caption, the phone screen.
  const fontDir = path.join(root, 'node_modules/vazirmatn/fonts/webfonts/');
  const page = await b.newPage({ viewport: { width: 1242, height: 2688 } });
  for (const s of shots) {
    const img = fs.readFileSync(`/tmp/raw-${s.name}.png`).toString('base64');
    await page.setContent(`<html><head><style>
      @font-face { font-family: V; src: url('file://${fontDir}Vazirmatn-Black.woff2'); font-weight: 900; }
      @font-face { font-family: V; src: url('file://${fontDir}Vazirmatn-Bold.woff2'); font-weight: 700; }
      body { margin: 0; width: 1242px; height: 2688px; font-family: V; direction: rtl; overflow: hidden;
        background: radial-gradient(ellipse at 50% 20%, #3aa36a, #135c35 70%); color: #fff; text-align: center; }
      .cap { padding-top: 120px; }
      .cap h1 { display: inline-block; margin: 0; font-size: 104px; font-weight: 900; padding: 6px 54px 26px; border: 12px solid #fff; border-radius: 40px; background: #0f5f33; transform: rotate(-2deg); box-shadow: 0 30px 60px rgba(0,0,0,.35); }
      .cap p { font-size: 54px; font-weight: 700; margin: 46px 0 0; opacity: .95; }
      .phone { position: absolute; left: 50%; top: 640px; transform: translateX(-50%); width: 960px; height: 2078px; border-radius: 90px; overflow: hidden; border: 22px solid #0b1220; box-shadow: 0 50px 100px rgba(0,0,0,.45); }
      .phone img { width: 100%; height: 100%; object-fit: cover; object-position: top; }
    </style></head><body><div class="cap"><h1 style="font-size:${s.caption.length > 18 ? 78 : 104}px">${s.caption}</h1><p>${s.sub}</p></div><div class="phone"><img src="data:image/png;base64,${img}"></div></body></html>`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(out, `screenshot-${s.name}.png`) });
    console.log('wrote', s.name);
  }
  await b.close();
})();
