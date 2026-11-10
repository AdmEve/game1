/**
 * When the game can't start, say so on the splash (it would otherwise sit there forever with its loading bar):
 * no WebGL (a blocklisted GPU driver, or an old Android System WebView), or a failure while booting. The player gets
 * what to do and a retry; the save is never touched. Kept free of the game's own modules so it works when they fail
 * (config.ts, for the store's name, has none of its own).
 */
import { SplashScreen } from '@capacitor/splash-screen';
import { STORE } from '../config';

export type Fatal = 'webgl' | 'boot';

const TEXT: Record<Fatal, { title: string; body: string; steps: string[] }> = {
  webgl: {
    title: 'گرافیک گوشیت در دسترس نیست',
    body: 'راه‌بندون سه‌بعدیه و برای اجرا به WebGL نیاز داره، که الان روی این گوشی خاموشه یا پشتیبانی نمی‌شه.',
    // The app names stay in English (that is how they are listed in the stores), isolated from the Persian around them.
    steps: [`برنامه‌های <bdi>Android System WebView</bdi> و <bdi>Chrome</bdi> رو از ${STORE.name} یا گوگل‌پلی به‌روز کن.`, 'گوشی رو یه بار خاموش و روشن کن.'],
  },
  boot: {
    title: 'بازی درست باز نشد',
    body: 'یه مشکلی موقع آماده شدن بازی پیش اومد. پیشرفتت سر جاشه.',
    steps: ['اگه باز هم باز نشد، گوشی رو یه بار خاموش و روشن کن.'],
  },
};

const CSS = `
#splash.fatal .hero { top: 20%; width: min(48vw, 26vh); animation: none; }
#splash.fatal .logo { top: 33%; }
#splash.fatal .bar, #splash.fatal .tip { display: none; }
#splash .fatal-box { position: absolute; left: 50%; top: 47%; width: min(86vw, 380px); transform: translateX(-50%); box-sizing: border-box;
  padding: 18px 18px 16px; border-radius: 18px; background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.12);
  font-family: Vazirmatn, system-ui, sans-serif; text-align: right; line-height: 1.75; }
#splash .fatal-box h2 { margin: 0 0 6px; font-size: 18px; font-weight: 900; color: #f2b124; }
#splash .fatal-box p { margin: 0 0 8px; font-size: 14px; font-weight: 400; opacity: .9; }
#splash .fatal-box ol { margin: 0 0 14px; padding: 0 20px 0 0; font-size: 14px; font-weight: 700; list-style: persian; }
#splash .fatal-box p.step { font-weight: 700; margin-bottom: 14px; }
#splash .fatal-box bdi { font-weight: 800; }
#splash .fatal-box button { display: block; width: 100%; padding: 12px; border: 0; border-radius: 14px; font: 900 16px Vazirmatn, system-ui, sans-serif;
  color: #1a1206; background: linear-gradient(180deg, #ffd36b, #f2b124); box-shadow: 0 4px 0 #b9811a; }
#splash .fatal-box button:active { transform: translateY(2px); box-shadow: 0 2px 0 #b9811a; }
#splash .fatal-box code { display: block; margin-top: 10px; font: 11px/1.4 ui-monospace, monospace; opacity: .45; direction: ltr; text-align: left;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
`;

// An uncaught error before main.ts has finished loading means the game can't start (its top-level code stopped):
// later errors are left to boot's own catch and the error log, since many are harmless.
let loaded = false;
/** main.ts calls this once its top-level code has run, just before it boots. */
export function mainLoaded(): void { loaded = true; }
addEventListener('error', (e) => { if (!loaded) showFatal('boot', String(e.error?.message ?? e.message)); });

/** The WebView's Chrome version (0 if not Chrome-based). */
const chrome = +(/(?:Chrome|Chromium)\/(\d+)/.exec(navigator.userAgent)?.[1] ?? 0);
const faDigits = (n: number) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);

let shown = false;
/** Replace the splash's loading bar with what went wrong and a retry. `detail` is a short code for support. */
export function showFatal(kind: Fatal, detail = ''): void {
  if (shown) return;
  shown = true;
  // A failure on an old WebView is most likely the WebView's: say to update it rather than just to restart.
  if (kind === 'boot' && chrome > 0 && chrome < 110) detail = `WebView ${chrome} · ${detail}`;
  SplashScreen.hide().catch(() => {});
  let host = document.getElementById('splash');
  if (!host) { host = document.createElement('div'); host.id = 'splash'; document.body.append(host); }
  host.classList.remove('gone');
  host.classList.add('fatal');
  const style = document.createElement('style'); style.textContent = CSS; document.head.append(style);
  const t = kind === 'boot' && chrome > 0 && chrome < 110
    ? { ...TEXT.boot, steps: [`برنامه‌ی <bdi>Android System WebView</bdi> گوشیت قدیمیه (نسخه‌ی ${faDigits(chrome)}). از ${STORE.name} یا گوگل‌پلی به‌روزش کن (یا <bdi>Chrome</bdi> رو).`, 'بعد بازی رو دوباره باز کن.'] }
    : TEXT[kind];
  const box = document.createElement('div'); box.className = 'fatal-box'; box.dir = 'rtl'; box.setAttribute('role', 'alert');
  const h = document.createElement('h2'); h.textContent = t.title;
  const p = document.createElement('p'); p.textContent = t.body;
  // Steps are this module's own fixed strings (with <bdi> marks), never error text.
  let steps: HTMLElement;
  if (t.steps.length > 1) { steps = document.createElement('ol'); for (const s of t.steps) { const li = document.createElement('li'); li.innerHTML = s; steps.append(li); } }
  else { steps = document.createElement('p'); steps.className = 'step'; steps.innerHTML = t.steps[0]; }
  const b = document.createElement('button'); b.type = 'button'; b.textContent = 'دوباره امتحان کن'; b.addEventListener('click', () => location.reload());
  box.append(h, p, steps, b);
  if (detail) { const c = document.createElement('code'); c.textContent = detail.slice(0, 160); box.append(c); }
  host.append(box);
  document.title = 'fatal';
}
