// Freed-but-still-used check: everything a level frees when it ends (and what it removed while playing: badges,
// covers, crane parts, departed cars, boarded passengers) must belong to that level alone. A shared geometry,
// material or texture freed by mistake is silently uploaded again by the next level (a stall), or shows broken.
// Plays levels with every mechanic back to back (colour-blind symbols on, crane and whistle used), and after each
// level starts lists anything in the scene that was already freed.
//   npx vite preview --port 4173 & URL=http://127.0.0.1:4173/ node scripts/reuse.cjs
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://127.0.0.1:4173/';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 1, userAgent: 'Mozilla/5.0 (Linux; Android 13) Mobile' });
  const errors = []; p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(URL + '?play&shot', { waitUntil: 'load' });
  await p.waitForFunction(() => document.title === 'ready', null, { timeout: 300000 });
  // Two levels of each mechanic, in level order, so each is played after another of its kind.
  const seq = await p.evaluate(() => {
    const L = window.__rb.levels, has = {
      covered: (l) => l.vehicles.some((v) => v.covered), broken: (l) => l.vehicles.some((v) => v.wait), wedding: (l) => l.vehicles.some((v) => v.wedding),
      oddEven: (l) => !!l.oddEven, officer: (l) => !!l.officer, vip: (l) => !!l.vip?.length, granny: (l) => !!l.granny?.length,
      bike: (l) => l.vehicles.some((v) => v.kind === 'bike'), tunnel: (l) => (l.obstacles || []).some((o) => o.kind === 'tunnel'), cart: (l) => (l.obstacles || []).some((o) => o.kind === 'cart'),
    };
    const out = [];
    for (const [k, f] of Object.entries(has)) { const idx = L.map((l, i) => (f(l) ? i : -1)).filter((i) => i >= 0).slice(0, 2); for (const i of idx) out.push([k, i]); }
    return out;
  });
  // Mark resources as they are freed (the prototypes come from live objects: the build's names are minified).
  await p.evaluate(() => {
    const rb = window.__rb;
    let mesh = null; rb.scene.traverse((o) => { if (!mesh && o.isMesh && o.material?.map) mesh = o; });
    const owner = (obj) => { for (let q = Object.getPrototypeOf(obj); q; q = Object.getPrototypeOf(q)) if (Object.prototype.hasOwnProperty.call(q, 'dispose')) return q; return null; };
    window.__level = 'boot';
    for (const proto of [owner(mesh.geometry), owner(Array.isArray(mesh.material) ? mesh.material[0] : mesh.material), owner(mesh.material.map)]) {
      const orig = proto.dispose;
      proto.dispose = function () { (this.userData ??= {}).__freedIn = window.__level; return orig.call(this); };
    }
  });
  let fails = 0;
  for (const [kind, n] of seq) {
    const r = await p.evaluate(async ([kind, n]) => {
      const rb = window.__rb;
      rb.save.settings.colorblind = true;
      rb.save.seen = Object.fromEntries(['spot', 'cover', 'broken', 'vip', 'oddEven', 'courier', 'wedding', 'officer', 'granny', 'tunnel', 'cart', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8'].map((k) => [k, true])); for (let k = 0; k < 400; k++) rb.save.seen['boss' + k] = true;
      document.querySelectorAll('.modal-back, .wallet-float').forEach((m) => m.remove());
      rb.save.level = n;
      await rb.goLevel(n, undefined, false);
      document.querySelectorAll('.modal-back').forEach((m) => m.remove());
      await rb.advance(0.5, true);
      // What is in the scene now that an earlier level freed.
      const used = [];
      const look = (o, what, res) => { const f = res?.userData?.__freedIn; if (f) used.push(`${what} of ${o.type}${o.name ? ' "' + o.name + '"' : ''} (freed in ${f})`); };
      rb.scene.traverse((o) => {
        if (o.geometry) look(o, 'geometry', o.geometry);
        for (const m of [].concat(o.material || [])) {
          look(o, 'material', m);
          for (const [k, v] of Object.entries(m)) if (v && v.isTexture) look(o, `${k} texture`, v);
          for (const u of Object.values(m.uniforms || {})) if (u?.value?.isTexture) look(o, 'uniform texture', u.value);
        }
      });
      for (const t of [rb.scene.environment, rb.scene.background]) if (t?.userData?.__freedIn) used.push(`scene texture (freed in ${t.userData.__freedIn})`);
      // Play it out: the crane on the first car, the whistle once, then the solver's moves.
      window.__level = `level ${n + 1} (${kind})`;
      const s = rb.session(), sol = rb.solve(s.level);
      let cranes = 0;
      for (const [k, m] of sol.entries()) {
        if (k === 0 && s.crane(m)) { cranes++; await rb.advance(1.2, false); continue; }
        if (k === 2) { s.whistle(); await rb.advance(0.6, false); }
        s.tap(m); await rb.advance(0.7, false);
      }
      for (let k = 0; k < 40 && !s.s.over; k++) await rb.advance(0.5, false);
      await rb.advance(2, false);
      return { used: [...new Set(used)], over: s.s.over, cranes };
    }, [kind, n]);
    if (r.used.length) { fails++; console.log(`FAIL level ${n + 1} (${kind}) starts with ${r.used.length} freed resource(s):\n    ` + r.used.slice(0, 8).join('\n    ')); }
    else console.log(`ok   level ${n + 1} (${kind}): nothing freed in use; played to ${r.over || 'unfinished'}${r.cranes ? ', crane used' : ''}`);
  }
  if (errors.length) { fails++; console.log('page errors:', [...new Set(errors)].slice(0, 4)); }
  console.log(fails ? `${fails} failure(s)` : 'all ok');
  await b.close();
  process.exit(fails ? 1 : 0);
})();
