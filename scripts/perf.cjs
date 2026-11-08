// Frame-pacing profile on a throttled CPU (a stand-in for a mid-range phone):
//   node scripts/perf.cjs [cpuSlowdown=4] [level=60] [query=]
// Reports startup timings, long tasks, and per-scenario frame stats: home menu idle, play idle, and heavy
// traffic (a tap every 140 ms). "js" is main-thread script time per frame, "gpu" what's left of the frame
// (SwiftShader renders on the CPU, so it stands in for fill-rate cost).
const { chromium } = require('playwright');
(async () => {
  const [slow = '4', level = '60', query = ''] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-precise-memory-info'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: +(process.env.DPR || 2), hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36' });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Performance.enable');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: +slow });
  p.on('pageerror', (e) => console.log('err:', e.message));
  await p.addInitScript(() => {
    const w = window;
    w.__frames = []; w.__long = [];
    const raf = w.requestAnimationFrame.bind(w);
    w.requestAnimationFrame = (cb) => raf((t) => { w.__frames.push(t); cb(t); });
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) w.__long.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: 'longtask', buffered: true }); } catch {}
    // Heap growth between samples approximates garbage produced (GC pauses are what stutter on phones).
    w.__alloc = 0; let last = 0;
    setInterval(() => { const m = performance.memory; if (!m) return; const u = m.usedJSHeapSize; if (u > last) w.__alloc += u - last; last = u; }, 16);
  });
  const t0 = Date.now();
  await p.goto(`${process.env.URL || 'http://127.0.0.1:5173/'}?${query}`);
  await p.waitForFunction(() => document.title === 'ready', null, { timeout: 600000 });
  const ready = Date.now() - t0;
  const marks = await p.evaluate(() => performance.getEntriesByType('measure').map((m) => `${m.name}=${Math.round(m.duration)}`).join(' '));
  const longs = await p.evaluate(() => window.__long.slice());
  console.log(`startup: ready in ${ready} ms  ${marks}`);
  console.log(`  long tasks: ${longs.length}, worst ${Math.max(0, ...longs.map((l) => l[1]))} ms, total ${longs.reduce((a, l) => a + l[1], 0)} ms`);

  const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  async function measure(name, sec, during) {
    await p.evaluate(() => { window.__frames = []; window.__long = []; window.__alloc = 0; });
    const m0 = await metrics();
    const stop = during ? await during() : null;
    await p.waitForTimeout(sec * 1000);
    if (stop) await stop();
    const m1 = await metrics();
    const r = await p.evaluate(() => {
      const f = window.__frames, d = [];
      for (let i = 1; i < f.length; i++) d.push(f[i] - f[i - 1]);
      d.sort((a, b) => a - b);
      const q = (x) => d.length ? d[Math.min(d.length - 1, Math.floor(d.length * x))] : 0;
      const info = window.__rb?.renderer?.info?.render;
      return { n: d.length, avg: d.reduce((a, x) => a + x, 0) / Math.max(1, d.length), p50: q(0.5), p95: q(0.95), max: d[d.length - 1] ?? 0, over33: d.filter((x) => x > 34).length, over50: d.filter((x) => x > 50).length, long: window.__long.length, alloc: window.__alloc, calls: info?.calls, tris: info?.triangles };
    });
    const frames = Math.max(1, r.n);
    const js = ((m1.ScriptDuration - m0.ScriptDuration) * 1000) / frames;
    const style = ((m1.RecalcStyleDuration - m0.RecalcStyleDuration + m1.LayoutDuration - m0.LayoutDuration) * 1000) / frames;
    console.log(`${name.padEnd(12)} fps ${(1000 / r.avg).toFixed(1).padStart(5)}  p50 ${r.p50.toFixed(1)}  p95 ${r.p95.toFixed(1)}  max ${r.max.toFixed(0)}  >33ms ${r.over33}  >50ms ${r.over50}  long ${r.long}  js/f ${js.toFixed(1)}  style/f ${style.toFixed(2)}  garbage ${(r.alloc / 1e6 / sec).toFixed(1)} MB/s  calls ${r.calls} tris ${r.tris}`);
  }
  await measure('home', 4);
  await p.evaluate((n) => {
    const r = window.__rb;
    document.querySelectorAll('.modal-back').forEach((m) => m.remove());
    const seen = r.save.seen; for (const k of ['cover', 'broken', 'vip', 'oddEven', 'courier', 'officer', 'cart', 'wedding', 'granny', 'tunnel']) seen[k] = true;
    for (let k = 1; k < 9; k++) seen['ch' + k] = true; for (let k = 0; k < 400; k++) seen['boss' + k] = true;
    r.save.level = Math.max(r.save.level, n); r.startLevel(n);
  }, +level - 1);
  await p.waitForTimeout(2500);
  await measure('play-idle', 4);
  await measure('traffic', 8, async () => {
    await p.evaluate(() => {
      const s = window.__rb.session();
      let k = 0;
      window.__tapper = setInterval(() => {
        const alive = s.level.vehicles.map((_, i) => i).filter((i) => s.s.inLot[i]);
        if (!alive.length || s.s.over) return;
        // Prefer cars that can leave, so the lot keeps moving.
        const h = s.hint(); s.tap(h >= 0 ? h : alive[(k++ * 7) % alive.length]);
      }, 140);
    });
    return () => p.evaluate(() => clearInterval(window.__tapper));
  });
  await b.close();
})();
