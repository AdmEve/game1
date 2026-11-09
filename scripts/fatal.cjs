// When the game can't start it must say so, not sit on the splash forever: with WebGL unavailable (a blocklisted GPU
// driver, an old System WebView) and with a failure while loading, the splash shows what's wrong, the card fits the
// screen, and its button reloads. CI runs this next to the smoke test.
//   npx vite preview --port 4173 & URL=http://127.0.0.1:4173/ node scripts/fatal.cjs [out-dir]
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://127.0.0.1:4173/';
const out = process.argv[2];
const GL = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
// A failure while loading: no 2D canvas, so building the first textures throws.
const break2d = () => { const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (k, ...a) { return k === '2d' ? null : g.call(this, k, ...a); }; };
const CASES = [
  { name: 'no WebGL, 360x640', args: ['--disable-3d-apis', '--disable-webgl'], vp: { width: 360, height: 640 }, title: 'گرافیک' },
  { name: 'no WebGL, 412x915', args: ['--disable-3d-apis', '--disable-webgl'], vp: { width: 412, height: 915 }, title: 'گرافیک' },
  { name: 'failure while loading', args: GL, init: break2d, vp: { width: 360, height: 640 }, title: 'باز نشد' },
];
(async () => {
  let fails = 0;
  for (const c of CASES) {
    const b = await chromium.launch({ args: c.args });
    const p = await b.newPage({ viewport: c.vp, deviceScaleFactor: 1, userAgent: 'Mozilla/5.0 (Linux; Android 13) Mobile' });
    if (c.init) await p.addInitScript(c.init);
    await p.goto(URL, { waitUntil: 'load' });
    const title = await p.waitForFunction(() => document.title === 'fatal' || document.title === 'ready', null, { timeout: 120000 }).then(() => p.title(), () => 'timeout');
    await p.waitForTimeout(500);
    const r = await p.evaluate(() => {
      const box = document.querySelector('#splash .fatal-box'), btn = box?.querySelector('button');
      if (!box || !btn) return null;
      const a = box.getBoundingClientRect(), k = btn.getBoundingClientRect();
      return { heading: box.querySelector('h2').textContent, top: a.top, bottom: a.bottom, left: a.left, right: a.right, btn: k.bottom, bar: getComputedStyle(document.querySelector('#splash .bar')).display };
    });
    const problems = [];
    if (title !== 'fatal') problems.push(`page ended as "${title}"`);
    if (!r) problems.push('no message card');
    else {
      if (!r.heading.includes(c.title)) problems.push(`wrong message: ${r.heading}`);
      if (r.top < 0 || r.bottom > c.vp.height || r.left < 0 || r.right > c.vp.width) problems.push('card off screen');
      if (r.btn > c.vp.height) problems.push('button off screen');
      if (r.bar !== 'none') problems.push('loading bar still shown');
      if (out) await p.screenshot({ path: `${out}/fatal-${c.name.replace(/\W+/g, '-')}.png` });
      const nav = p.waitForEvent('framenavigated', { timeout: 5000 }).then(() => true, () => false);
      await p.click('#splash .fatal-box button');
      if (!(await nav)) problems.push('retry did not reload');
    }
    console.log(`${problems.length ? 'FAIL' : 'ok  '} ${c.name}${problems.length ? ': ' + problems.join('; ') : ''}`);
    fails += problems.length ? 1 : 0;
    await b.close();
  }
  console.log(fails ? `${fails} failure(s)` : 'all ok');
  process.exit(fails ? 1 : 0);
})();
