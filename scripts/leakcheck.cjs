// Long-session leak check: plays level after level (winning each, going on through the real goLevel path, across
// chapter changes and back), and records GPU-side objects (geometries, textures, programs), scene size, DOM nodes
// and JS heap after each. Within a chapter they must stay flat; across chapters, bounded by the two-world cache.
//   node scripts/leakcheck.cjs
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://127.0.0.1:5173/';
const SEQ = (process.env.LEVELS || '1,2,3,4,5,6,30,31,32,33,1,2,3,4,5,6,31,32,33,34').split(',').map(Number);
(async () => {
  const b = await chromium.launch({ args: ['--js-flags=--expose-gc', '--enable-precise-memory-info'] });
  const p = await b.newPage({ viewport: { width: 360, height: 640 }, userAgent: 'Mozilla/5.0 (Linux; Android 12) Mobile' });
  const errors = []; p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(URL + '?play&shot', { waitUntil: 'load' });
  await p.waitForFunction(() => document.title === 'ready', null, { timeout: 120000 });
  const rows = [];
  for (const L of SEQ) {
    const r = await p.evaluate(async (L) => {
      const rb = window.__rb;
      rb.save.seen = Object.fromEntries(['spot', 'cover', 'broken', 'vip', 'oddEven', 'courier', 'ch2'].map((k) => [k, true])); for (let k = 0; k < 400; k++) rb.save.seen['boss' + k] = true;
      document.querySelectorAll('.modal-back').forEach((m) => m.remove());
      rb.save.level = L - 1;
      await rb.goLevel(L - 1, undefined, false);
      document.querySelectorAll('.modal-back').forEach((m) => m.remove());
      const s = rb.session();
      for (const m of rb.solve(s.level)) { s.tap(m); await rb.advance(0.7, false); }
      for (let k = 0; k < 60 && !document.querySelector('.result'); k++) await rb.advance(0.5, false);
      await rb.advance(3, false);
      // The win card's own buttons close its wallet pill (pay.close()); removing the card directly must too.
      document.querySelectorAll('.modal-back, .wallet-float').forEach((m) => m.remove());
      rb.post.render(rb.scene, rb.camera, 1 / 30);
      if (window.gc) window.gc();
      await new Promise((x) => setTimeout(x, 100));
      const m = rb.renderer.info.memory, progs = rb.renderer.info.programs?.length ?? 0;
      let nodes = 0; rb.scene.traverse(() => nodes++);
      return { L, won: !!document.querySelector('.result.win') || s.s.over === 'won', geo: m.geometries, tex: m.textures, progs, nodes, dom: document.getElementsByTagName('*').length, top: [...document.body.children].map((e) => e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : '')).reduce((a, k) => (a[k] = (a[k] || 0) + 1, a), {}), heap: Math.round(performance.memory.usedJSHeapSize / 1e6) };
    }, L);
    rows.push(r);
    console.log(`L${String(r.L).padStart(3)}  geometries ${String(r.geo).padStart(4)}  textures ${String(r.tex).padStart(3)}  programs ${String(r.progs).padStart(3)}  scene nodes ${String(r.nodes).padStart(5)}  DOM ${String(r.dom).padStart(4)}  heap ${r.heap} MB`);
  }
  // Compare the second visit of the same levels with the first (after chapter 1 → 2 → 1 → 2): growth means a leak.
  const first = rows.slice(0, 10), second = rows.slice(10);
  const grow = (k) => Math.max(...second.map((r) => r[k])) - Math.max(...first.map((r) => r[k]));
  console.log(`growth on the second round: geometries ${grow('geo')}, textures ${grow('tex')}, programs ${grow('progs')}, scene nodes ${grow('nodes')}, DOM ${grow('dom')}, heap ${grow('heap')} MB`);
  console.log('body children, first level:', JSON.stringify(rows[0].top));
  console.log('body children, last level: ', JSON.stringify(rows[rows.length - 1].top));
  if (errors.length) console.log('page errors:', [...new Set(errors)].slice(0, 3));
  await b.close();
})();
