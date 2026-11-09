// Draws the launcher icons, adaptive-icon foregrounds, splash screens and the 512px store icon
// from HTML (Vazirmatn + Twemoji) with the pre-installed Playwright Chromium.
// Run: node scripts/make-icons.mjs   (the car art comes from scripts/icon-car.html; see PROGRESS.md)
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require(execSync('npm root -g').toString().trim() + '/playwright'); }
const root = fileURLToPath(new URL('..', import.meta.url));
const res = root + 'android/app/src/main/res/';
const font = root + 'node_modules/vazirmatn/fonts/webfonts/';

const hero = `file://${root}scripts/art/hero-taxi.png`;
const css = `
@font-face { font-family: V; src: url('file://${font}Vazirmatn-Black.woff2'); font-weight: 900; }
@font-face { font-family: V; src: url('file://${font}Vazirmatn-Bold.woff2'); font-weight: 700; }
* { margin: 0; box-sizing: border-box; }
body { font-family: V; direction: rtl; }
/* A Tehran road from above: asphalt, a yellow center line, a zebra crossing. */
.tile { position: absolute; inset: 0; overflow: hidden;
  background:
    radial-gradient(circle at 50% 42%, rgba(255,255,255,.22), transparent 55%),
    linear-gradient(180deg, #2f8f55, #16613a); }
.car { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -52%); filter: drop-shadow(0 4% 6% rgba(0,0,0,.35)); }
`;

function iconHtml({ size, shape, transparent, scale }) {
  const d = Math.round(size * scale * 1.5);
  const bg = transparent ? '' : `<div class="tile" style="border-radius:${shape === 'round' ? '50%' : shape === 'square' ? '0' : '22%'}"></div>`;
  return `<html><head><style>${css} body{width:${size}px;height:${size}px;position:relative;overflow:hidden;background:transparent}</style></head><body>
  ${bg}<img class="car" src="${hero}" style="width:${d}px"></body></html>`;
}

/** The Android launch splash: the web loading screen's own markup (index.html), drawn at the drawable's size. */
function splashHtml(w, h) {
  const page = readFileSync(root + 'index.html', 'utf8');
  const markup = page.slice(page.indexOf('<div id="splash">'), page.indexOf('<div id="app">'))
    .replace('<div id="splash">', '<div id="splash" class="native">')
    .replace('/hero-taxi.webp', `file://${root}public/hero-taxi.webp`)
    .replace("url('/fonts/", `url('file://${root}public/fonts/`);
  return `<html dir="rtl"><head><style>
    @font-face { font-family: Vazirmatn; src: url('file://${font}Vazirmatn-Medium.woff2'); font-weight: 500; }
    * { margin: 0; box-sizing: border-box; } body { width: ${w}px; height: ${h}px; position: relative; overflow: hidden; }
  </style></head><body>${markup}</body></html>`;
}
function splashHtmlOld(w, h) {
  const s = Math.min(w, h);
  return `<html><head><style>${css} body{width:${w}px;height:${h}px;position:relative;overflow:hidden}</style></head><body>
  <div class="tile"></div>
  <img class="car" src="${hero}" style="width:${Math.round(s * 0.95)}px;top:${Math.round(h * 0.4)}px">
  <div style="position:absolute;left:0;right:0;top:${Math.round(h * 0.64)}px;text-align:center">
    <div style="display:inline-block;font-weight:900;font-size:${Math.round(s * 0.15)}px;line-height:1.25;color:#fff;padding:0 ${Math.round(s * 0.05)}px ${Math.round(s * 0.015)}px;border:${Math.round(s * 0.012)}px solid #fff;border-radius:${Math.round(s * 0.04)}px;background:#0f5f33;transform:rotate(-3deg)">راه‌بندون</div>
    <div style="margin-top:${Math.round(s * 0.04)}px;font-weight:700;font-size:${Math.round(s * 0.045)}px;color:#fff;opacity:.9">ترافیک تهران، تو دستای تو</div>
  </div></body></html>`;
}

const tmp = root + 'node_modules/.cache/icons/';
mkdirSync(tmp, { recursive: true });
const browser = await playwright.chromium.launch();
const page = await browser.newPage();

async function render(html, w, h, file, transparent = true) {
  const f = tmp + 'page.html';
  writeFileSync(f, html);
  await page.setViewportSize({ width: w, height: h });
  await page.goto('file://' + f);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(50);
  await page.screenshot({ path: file, omitBackground: transparent, clip: { x: 0, y: 0, width: w, height: h } });
}
/** The splash as WebP at quality 90 (Chromium's encoder): 0.3 MB for all eleven instead of 4.7 MB of PNG, no visible
 *  difference on the navy gradient; Android reads WebP drawables from API 18 (minSdk is 24). Replaces any old PNG. */
async function renderWebp(html, w, h, file) {
  const png = tmp + 'shot.png';
  await render(html, w, h, png, false);
  const url = await page.evaluate(async ([d, w, h]) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + d; await img.decode();
    const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0);
    return c.toDataURL('image/webp', 0.9);
  }, [readFileSync(png).toString('base64'), w, h]);
  if (!url.startsWith('data:image/webp')) throw new Error('this Chromium cannot encode WebP');
  writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
  rmSync(file.replace(/\.webp$/, '.png'), { force: true });
}

const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const splashOnly = process.argv.includes('--splash');
for (const [d, k] of Object.entries(dens)) {
  if (splashOnly) break;
  const dir = res + `mipmap-${d}/`;
  const s = Math.round(48 * k);
  await render(iconHtml({ size: s, shape: 'rounded', scale: 0.62 }), s, s, dir + 'ic_launcher.png');
  await render(iconHtml({ size: s, shape: 'round', scale: 0.6 }), s, s, dir + 'ic_launcher_round.png');
  const f = Math.round(108 * k);
  // Adaptive foreground: keep the art inside the 72/108 safe zone.
  await render(iconHtml({ size: f, transparent: true, scale: 0.4 }), f, f, dir + 'ic_launcher_foreground.png');
}
const sizeOf = (orient, d) => {
  const base = { mdpi: [320, 480], hdpi: [480, 800], xhdpi: [720, 1280], xxhdpi: [960, 1600], xxxhdpi: [1280, 1920] }[d];
  return orient === 'land' ? [base[1], base[0]] : base;
};
for (const dir of readdirSync(res)) {
  const m = dir.match(/^drawable-(port|land)-(\w+)$/);
  if (!m) continue;
  const [w, h] = sizeOf(m[1], m[2]);
  await renderWebp(splashHtml(w, h), w, h, res + dir + '/splash.webp');
}
await renderWebp(splashHtml(480, 800), 480, 800, res + 'drawable/splash.webp');
if (!existsSync(root + 'store')) mkdirSync(root + 'store');
if (!splashOnly) await render(iconHtml({ size: 512, shape: 'square', scale: 0.62 }), 512, 512, root + 'store/icon-512.png', false);
await browser.close();
console.log('icons written');
