// Headless screenshots of the running dev server: node scripts/shot.cjs "<query>" out.png [script-ms]
const { chromium } = require('playwright');
(async () => {
  const [query = 'play', out = 'shot.png', ms = '600', actions = ''] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true });
  p.on('console', (m) => { if (m.type() !== 'debug') console.log('console:', m.text()); });
  p.on('pageerror', (e) => console.log('err:', e.message));
  await p.goto(`http://127.0.0.1:5173/?shot&${query}`);
  await p.waitForFunction(() => document.title === 'ready', null, { timeout: 240000 });
  if (actions) await p.evaluate(actions);
  await p.evaluate((ms) => window.__rb.advance(ms / 1000), +ms);
  await p.screenshot({ path: out });
  await b.close();
  console.log('ok', out);
})();
