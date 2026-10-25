// Takes the Cafe Bazaar store screenshots (1080×1920 with a caption band).
// Needs the built game served on :5180:  npm run build && npx vite preview --port 5180 &
// Then: node scripts/store-shots.cjs
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, '..');
const out = path.join(root, 'store');
const tmp = path.join(root, 'node_modules/.cache/shots');
fs.mkdirSync(tmp, { recursive: true });

async function answerAll(p, keep = false) {
  for (let k = 0; k < 12; k++) {
    await p.waitForTimeout(260);
    const ch = p.locator('.backdrop.in .event-modal .choice:not(.off)');
    if (await ch.count()) {
      if (keep) return;
      await ch.first().click();
      continue;
    }
    const c = p.locator('.backdrop.in .outcome .btn');
    if (await c.count()) { await c.first().click(); continue; }
    break;
  }
}

async function closeLayers(p) {
  for (let i = 0; i < 4; i++) {
    const x = p.locator('.backdrop.in .x');
    if (!(await x.count())) break;
    await x.last().click();
    await p.waitForTimeout(250);
  }
}

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 693 }, deviceScaleFactor: 2.77 });
  await p.goto('http://localhost:5180/?debug');
  await p.waitForTimeout(1000);
  const ok = p.locator('.backdrop.in .modal .btn.primary');
  if (await ok.count()) await ok.click();
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${tmp}/home.png` });
  await p.locator('.home-btns .btn').first().click();
  await p.waitForTimeout(400);
  await p.locator('.sheet .section .row .btn').first().click();
  await p.waitForTimeout(200);
  await p.locator('.sheet .btn.big.wide').click();
  await p.waitForTimeout(500);
  const tut = p.locator('.backdrop.in .tutorial .btn');
  if (await tut.count()) await tut.click();
  await p.waitForTimeout(300);
  for (let y = 0; y < 17; y++) {
    await p.locator('.age-btn').click();
    await answerAll(p);
  }
  await p.evaluate(() => { const L = window.__z.currentLife(); L.edu.track = 'tajrobi'; L.stats.smarts = 92; L.flags.kEffort = 9; });
  await p.evaluate(() => window.__z.event('m_konkur'));
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${tmp}/konkur.png` });
  await answerAll(p);
  for (let y = 0; y < 3; y++) { await p.locator('.age-btn').click(); await answerAll(p); }
  await p.screenshot({ path: `${tmp}/life.png` });
  await p.evaluate(() => window.__z.event('mehr_talk', { k: { first: 'نازنین', last: 'رحیمی', gender: 'f', age: 24, job: 'معمار', rich: 3, looks: 85, smarts: 80, trait: 'مهربون', via: 'دانشگاه' } }));
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${tmp}/mehr.png` });
  await answerAll(p);
  await p.evaluate(() => {
    const L = window.__z.currentLife();
    L.money += L.econ.coin * 60;
    L.assets.push({ id: 9001, kind: 'coin', ref: 'coin', name: 'سکه', qty: 24, paid: Math.round(L.econ.coin * 24 * 0.55), year: L.year - 3 });
    L.assets.push({ id: 9002, kind: 'dollar', ref: 'usd', name: 'دلار', qty: 12000, paid: Math.round(L.econ.dollar * 12000 * 0.7), year: L.year - 2 });
    L.assets.push({ id: 9003, kind: 'car', ref: '206', name: 'پژو ۲۰۶', qty: 1, paid: Math.round(1.9e9 * L.econ.car * 0.8), year: L.year - 1, cond: 90 });
    window.__z.refresh();
  });
  await p.locator('.nav-b').nth(2).click();
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${tmp}/assets.png` });
  await closeLayers(p);
  await p.evaluate(() => window.__z.kill());
  await p.waitForTimeout(1000);
  await p.screenshot({ path: `${tmp}/death.png` });

  // Compose with captions.
  const shots = [
    ['life', 'از تولد تا پیری؛ هر سال یه ماجرای جدید!'],
    ['konkur', 'کنکور بده، رتبه بیار، رشته انتخاب کن'],
    ['mehr', 'خواستگاری، مهریه، عروسی… کاملاً ایرونی!'],
    ['assets', 'دلار، سکه، خونه؛ تو تورم پولدار شو!'],
    ['death', 'آخرش اعلامیه‌ات رو برای رفقات بفرست!'],
    ['home', 'زندگی ایرونی؛ شبیه‌ساز زندگی ایرانی'],
  ];
  const font = path.join(root, 'node_modules/vazirmatn/fonts/webfonts/Vazirmatn-Black.woff2');
  const c = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  let i = 1;
  for (const [name, cap] of shots) {
    const img = fs.readFileSync(`${tmp}/${name}.png`).toString('base64');
    const html = `<html><head><style>
      @font-face { font-family: V; src: url('file://${font}'); }
      body { margin: 0; width: 1080px; height: 1920px; background: linear-gradient(180deg, #1f6f6b, #2d8f88); font-family: V; direction: rtl; overflow: hidden; }
      .cap { color: #fff; font-size: 74px; text-align: center; padding: 90px 60px 0; line-height: 1.45; text-shadow: 0 5px 0 rgba(0,0,0,.18); }
      .phone { position: absolute; left: 50%; top: 410px; transform: translateX(-50%); width: 860px; border-radius: 56px; overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,.35); border: 14px solid #10302e; }
      .phone img { display: block; width: 100%; }
    </style></head><body><div class="cap">${cap}</div><div class="phone"><img src="data:image/png;base64,${img}"></div></body></html>`;
    fs.writeFileSync(`${tmp}/frame.html`, html);
    await c.goto(`file://${tmp}/frame.html`);
    await c.evaluate(() => document.fonts.ready);
    await c.waitForTimeout(150);
    await c.screenshot({ path: `${out}/screenshot-${i}-${name}.png` });
    i++;
  }
  await b.close();
  console.log('store screenshots written');
})();
