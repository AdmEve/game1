const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
  p.on('console', (m) => console.log('console:', m.text()));
  p.on('pageerror', (e) => console.log('err:', e.message));
  await p.goto('http://localhost:8777/index.html' + (process.argv[2] || ''));
  await p.waitForFunction(() => document.title === 'ready', null, { timeout: 120000 });
  await p.waitForTimeout(800);
  await p.screenshot({ path: process.argv[3] || 'rahbandoon-3d.png' });
  await b.close();
  console.log('ok');
})();
