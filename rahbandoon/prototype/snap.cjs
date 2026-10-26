const { chromium } = require('playwright');
(async () => {
  const [url, out, w = 1600, h = 1000] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: +w, height: +h } });
  p.on('console', (m) => console.log('console:', m.text()));
  p.on('pageerror', (e) => console.log('err:', e.message));
  await p.goto('http://localhost:8777/' + url);
  await p.waitForFunction(() => document.title === 'ready', null, { timeout: 300000 });
  await p.screenshot({ path: out });
  await b.close();
  console.log('ok', out);
})();
