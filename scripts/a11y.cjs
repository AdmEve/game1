// Screen-reader names and structure (axe-core, WCAG 2 A/AA) on the screens a player goes through: home, play, pause
// and settings, level select, win card, shop, garage. The 3D board itself is a picture to a screen reader; what has to
// be right is every control around it saying what it is. Two rules are left out on purpose: the viewport may not be
// zoomed (a game's pinch gesture must not zoom the page), and colour contrast is measured separately (colorsep.cjs).
//   npm i --no-save axe-core@4.10.3 && npx vite preview --port 4173 & URL=http://127.0.0.1:4173/ node scripts/a11y.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const URL = process.env.URL || 'http://127.0.0.1:4173/';
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const SEEN = ['help-bay', 'help-crane', 'help-whistle', 'spot', 'cover', 'broken', 'vip', 'oddEven', 'courier', 'ch2'];
const SCREENS = [
  ['home', (r) => r.cards.home()],
  ['play (level 30)', (r) => { r.save.level = 29; r.startLevel(29, undefined, false); }],
  ['pause and settings', (r) => { r.save.level = 29; r.startLevel(29, undefined, false); r.cards.pause(); }],
  ['level select', (r) => r.cards.levels()],
  ['win card', (r) => { r.save.level = 29; r.startLevel(29, undefined, false); document.querySelectorAll('.modal-back').forEach((m) => m.remove()); r.cards.win(); }],
  ['shop', (r) => r.cards.shop()],
  ['garage', (r) => r.cards.garage()],
  ['privacy', (r) => r.cards.privacy()],
];
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 360, height: 640 }, userAgent: 'Mozilla/5.0 (Linux; Android 13) Mobile' });
  await p.goto(URL + '?play&shot', { waitUntil: 'load' });
  await p.waitForFunction(() => document.title === 'ready', null, { timeout: 300000 });
  await p.addScriptTag({ content: AXE });
  let total = 0;
  for (const [name, open] of SCREENS) {
    const v = await p.evaluate(async ([seen, src]) => {
      const r = window.__rb;
      document.querySelectorAll('.modal-back').forEach((m) => m.remove()); document.body.classList.remove('at-home');
      r.save.seen = Object.fromEntries(seen.map((k) => [k, true])); for (let k = 0; k < 400; k++) r.save.seen['boss' + k] = true;
      (0, eval)(`(${src})`)(r);
      await new Promise((x) => setTimeout(x, 600));
      const res = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, rules: { 'meta-viewport': { enabled: false }, 'color-contrast': { enabled: false } } });
      return res.violations.map((x) => ({ id: x.id, impact: x.impact, n: x.nodes.length, nodes: x.nodes.slice(0, 4).map((nd) => nd.target.join(' ') + (nd.html ? ' ' + nd.html.slice(0, 70) : '')) }));
    }, [SEEN, open.toString()]);
    total += v.reduce((a, x) => a + x.n, 0);
    console.log(`${v.length ? 'FAIL' : 'ok  '} ${name}${v.length ? ':' : ''}`);
    for (const x of v) { console.log(`       ${x.id} (${x.impact}, ${x.n})`); for (const nd of x.nodes) console.log(`         ${nd}`); }
  }
  // And the names say what each control does (axe only checks that there is one).
  await p.evaluate(() => { document.querySelectorAll('.modal-back').forEach((m) => m.remove()); window.__rb.cards.home(); });
  await p.waitForTimeout(500);
  for (const [role, name] of [['button', 'مکث و تنظیمات'], ['button', /^کارت بلیت/], ['button', /^افتخارات/], ['button', /سکه، خرید از دکه$/]]) {
    const n = await p.getByRole(role, { name }).count();
    if (!n) total++;
    console.log(`${n ? 'ok  ' : 'FAIL'} home: a ${role} named ${name}`);
  }
  await p.evaluate(() => { document.querySelectorAll('.modal-back').forEach((m) => m.remove()); window.__rb.cards.pause(); });
  await p.waitForTimeout(500);
  for (const [role, name] of [['switch', 'لرزش'], ['switch', /متن بزرگ‌تر/], ['switch', /^چپ‌دست/], ['slider', 'موسیقی'], ['slider', 'صداها']]) {
    const n = await p.getByRole(role, { name }).count();
    if (!n) total++;
    console.log(`${n ? 'ok  ' : 'FAIL'} settings: a ${role} named ${name}`);
  }
  console.log(total ? `${total} problem(s)` : 'all ok');
  await b.close();
  process.exit(total ? 1 : 0);
})();
