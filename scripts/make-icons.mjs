// Draws the launcher icons, adaptive-icon foregrounds, splash screens and the 512px store icon
// from HTML (Vazirmatn + Twemoji) with the pre-installed Playwright Chromium.
// Run: node scripts/make-icons.mjs   (needs public/emoji, i.e. run `npm run build` once first)
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require(execSync('npm root -g').toString().trim() + '/playwright'); }
const root = fileURLToPath(new URL('..', import.meta.url));
const res = root + 'android/app/src/main/res/';
const font = root + 'node_modules/vazirmatn/fonts/webfonts/';
const emoji = (code) => `file://${root}public/emoji/${code}.svg`;

const css = `
@font-face { font-family: V; src: url('file://${font}Vazirmatn-Black.woff2'); font-weight: 900; }
@font-face { font-family: V; src: url('file://${font}Vazirmatn-Bold.woff2'); font-weight: 700; }
* { margin: 0; box-sizing: border-box; }
body { width: 1024px; height: 1024px; font-family: V; direction: rtl; }
.tile { position: absolute; inset: 0; background: #1f6f6b;
  background-image:
    radial-gradient(circle at 50% 50%, rgba(255,255,255,.10) 0 22%, transparent 23%),
    conic-gradient(from 45deg, rgba(255,255,255,.06) 0 25%, transparent 0 50%, rgba(255,255,255,.06) 0 75%, transparent 0);
  background-size: 100% 100%, 128px 128px; }
.medal { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #ffd77a, #f0a12e 58%, #c97a0d);
  box-shadow: inset 0 -26px 0 rgba(0,0,0,.14), 0 18px 40px rgba(0,0,0,.25);
  display: flex; flex-direction: column; align-items: center; justify-content: center; color: #3b2300; }
.plus { font-weight: 900; line-height: .9; }
.sal { font-weight: 700; line-height: 1; }
.e { position: absolute; }
`;

function iconHtml({ size, shape, transparent, scale }) {
  // scale: medal diameter relative to the canvas.
  const d = Math.round(size * scale);
  const bg = transparent ? '' : `<div class="tile" style="border-radius:${shape === 'round' ? '50%' : shape === 'square' ? '0' : '22%'}"></div>`;
  return `<html><head><style>${css} body{width:${size}px;height:${size}px;position:relative;overflow:hidden;background:transparent}</style></head><body>
  ${bg}
  <div class="medal" style="width:${d}px;height:${d}px">
    <div class="plus" dir="ltr" style="font-size:${Math.round(d * 0.46)}px">+۱</div>
    <div class="sal" style="font-size:${Math.round(d * 0.19)}px">سال</div>
  </div>
  <img class="e" src="${emoji('1f476-1f3fc')}" style="width:${Math.round(d * 0.3)}px;left:${Math.round(size / 2 - d * 0.62)}px;top:${Math.round(size / 2 - d * 0.62)}px">
  <img class="e" src="${emoji('1f474-1f3fd')}" style="width:${Math.round(d * 0.3)}px;left:${Math.round(size / 2 + d * 0.32)}px;top:${Math.round(size / 2 + d * 0.3)}px">
  </body></html>`;
}

function splashHtml(w, h) {
  const s = Math.min(w, h);
  return `<html><head><style>${css} body{width:${w}px;height:${h}px;position:relative;overflow:hidden}</style></head><body>
  <div class="tile" style="background-image:conic-gradient(from 45deg, rgba(255,255,255,.06) 0 25%, transparent 0 50%, rgba(255,255,255,.06) 0 75%, transparent 0);background-size:128px 128px"></div>
  <div style="position:absolute;left:0;right:0;top:${Math.round(h * 0.36)}px;text-align:center;color:#fff">
    <div style="display:flex;justify-content:center;gap:${Math.round(s * 0.02)}px;margin-bottom:${Math.round(s * 0.03)}px">
      ${['1f476', '1f392', '1f393', '1f48d', '1f474'].map((c) => `<img src="${emoji(c)}" style="width:${Math.round(s * 0.1)}px">`).join('')}
    </div>
    <div style="font-weight:900;font-size:${Math.round(s * 0.13)}px;line-height:1.3;text-shadow:0 ${Math.round(s * 0.008)}px 0 rgba(0,0,0,.2)">زندگی ایرونی</div>
    <div style="font-weight:700;font-size:${Math.round(s * 0.045)}px;opacity:.9">شبیه‌ساز زندگی ایرانی</div>
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

const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [d, k] of Object.entries(dens)) {
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
  await render(splashHtml(w, h), w, h, res + dir + '/splash.png', false);
}
await render(splashHtml(480, 800), 480, 800, res + 'drawable/splash.png', false);
if (!existsSync(root + 'store')) mkdirSync(root + 'store');
await render(iconHtml({ size: 512, shape: 'square', scale: 0.62 }), 512, 512, root + 'store/icon-512.png', false);
await browser.close();
console.log('icons written');
