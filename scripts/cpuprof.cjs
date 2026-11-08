// Sampling CPU profile of one scenario, summarised by self time per function:
//   node scripts/cpuprof.cjs [scenario=traffic|home|startup] [level=60] [dpr=1]
const { chromium } = require('playwright');
(async () => {
  const [scenario = 'traffic', level = '60', dpr = '1'] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: +dpr, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36' });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  p.on('pageerror', (e) => console.log('err:', e.message));
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
  if (scenario === 'startup') await cdp.send('Profiler.start');
  await p.goto('http://127.0.0.1:5173/');
  await p.waitForFunction(() => document.title === 'ready', null, { timeout: 600000 });
  if (scenario === 'home') { await cdp.send('Profiler.start'); await p.waitForTimeout(5000); }
  if (scenario === 'traffic') {
    await p.evaluate((n) => {
      const r = window.__rb;
      document.querySelectorAll('.modal-back').forEach((m) => m.remove());
      const seen = r.save.seen; for (const k of ['cover', 'broken', 'vip', 'oddEven', 'courier', 'officer', 'cart', 'wedding', 'granny', 'tunnel']) seen[k] = true;
      for (let k = 1; k < 9; k++) seen['ch' + k] = true; for (let k = 0; k < 400; k++) seen['boss' + k] = true;
      r.save.level = Math.max(r.save.level, n); r.startLevel(n);
    }, +level - 1);
    await p.waitForTimeout(2500);
    await cdp.send('Profiler.start');
    await p.evaluate(() => {
      const s = window.__rb.session();
      window.__tapper = setInterval(() => { if (s.s.over) return; const h = s.hint(); if (h >= 0) s.tap(h); }, 140);
    });
    await p.waitForTimeout(8000);
  }
  const { profile } = await cdp.send('Profiler.stop');
  const self = new Map(), byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const dt = profile.timeDeltas; let total = 0;
  profile.samples.forEach((id, i) => {
    const n = byId.get(id), f = n.callFrame;
    const key = `${f.functionName || '(anon)'} ${(f.url || '').split('/').pop().split('?')[0]}:${f.lineNumber + 1}`;
    self.set(key, (self.get(key) ?? 0) + (dt[i] ?? 0)); total += dt[i] ?? 0;
  });
  const top = [...self].sort((a, b) => b[1] - a[1]).slice(0, 40);
  console.log(`total ${(total / 1000).toFixed(0)} ms`);
  for (const [k, v] of top) console.log(`${(v / 1000).toFixed(0).padStart(7)} ms ${(100 * v / total).toFixed(1).padStart(5)}%  ${k}`);
  await b.close();
})();
