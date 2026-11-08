// Car colour separation per chapter: two cars of each colour on a test board under the chapter's light and
// weather; the rendered colour of each (trunk and hood, away from the arrow) is read back and the smallest
// CIE76 ΔE between any two colours is reported. Below ~20 two colours start to look alike at a glance.
//   node scripts/colorsep.cjs
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://127.0.0.1:5173/';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 1, userAgent: 'Mozilla/5.0 (Linux; Android 12) Mobile' });
  await p.goto(URL + '?play&shot', { waitUntil: 'load' });
  await p.waitForFunction(() => document.title === 'ready', null, { timeout: 120000 });
  const res = await p.evaluate(async () => {
    const rb = window.__rb, COLORS = ['red', 'yellow', 'blue', 'green', 'purple', 'orange', 'white'];
    const lab = ([r, g, b]) => {
      const f = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
      const [R, G, B] = [f(r), f(g), f(b)];
      const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047, Y = R * 0.2126 + G * 0.7152 + B * 0.0722, Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
      const t = (v) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116);
      return [116 * t(Y) - 16, 500 * (t(X) - t(Y)), 200 * (t(Y) - t(Z))];
    };
    const out = [];
    rb.save.seen = Object.fromEntries(['spot', 'cover', 'broken', 'vip', 'oddEven', 'courier', 'officer', 'cart', 'wedding', 'granny', 'tunnel', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8'].map((k) => [k, true]));
    for (const from of [0, 30, 60, 90, 120, 150, 180, 210]) {
      const orig = rb.levels[from];
      const vehicles = [];
      COLORS.forEach((color, i) => { vehicles.push({ kind: 'pride', color, col: i, row: 1, dir: 'up' }); vehicles.push({ kind: 'pride', color, col: i, row: 5, dir: 'down' }); });
      rb.levels[from] = { w: 7, h: 8, vehicles, queue: orig.queue, bays: 5 };
      rb.startLevel(from, undefined, false);
      document.querySelectorAll('.modal-back').forEach((m) => m.remove());
      await rb.advance(0.1);
      const s = rb.session(), cam = rb.camera, R = rb.renderer, gl = R.getContext(), cv = R.domElement;
      rb.scene.updateMatrixWorld(true);
      rb.post.render(rb.scene, cam, 1 / 30);
      const k = cv.width / innerWidth, px = new Uint8Array(4), V = cam.position.constructor;
      const sum = {};
      s.cars.forEach((c, i) => {
        const color = vehicles[i].color, bx = c.box;
        for (const fx of [0.13, 0.87]) for (const fz of [0.4, 0.5, 0.6]) {
          const w = new V(bx.min.x + (bx.max.x - bx.min.x) * fx, bx.min.y + (bx.max.y - bx.min.y) * 0.62, bx.min.z + (bx.max.z - bx.min.z) * fz).applyMatrix4(c.body.matrixWorld).project(cam);
          const x = Math.round(((w.x + 1) / 2) * cv.width), y = Math.round(((w.y + 1) / 2) * cv.height);
          gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
          (sum[color] ??= []).push([px[0], px[1], px[2]]);
        }
      });
      const mean = {};
      for (const [c, l] of Object.entries(sum)) {
        // median per channel (robust to a stray glint or the windscreen edge)
        const med = (ch) => l.map((v) => v[ch]).sort((a, b) => a - b)[Math.floor(l.length / 2)];
        mean[c] = [med(0), med(1), med(2)];
      }
      let min = Infinity, pair = '';
      const cs = Object.keys(mean);
      for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
        const a = lab(mean[cs[i]]), bb = lab(mean[cs[j]]);
        const d = Math.hypot(a[0] - bb[0], a[1] - bb[1], a[2] - bb[2]);
        if (d < min) { min = d; pair = `${cs[i]}/${cs[j]}`; }
      }
      out.push({ chapter: from / 30 + 1, min: Math.round(min), pair, rgb: Object.fromEntries(Object.entries(mean).map(([c, v]) => [c, '#' + v.map((x) => x.toString(16).padStart(2, '0')).join('')])) });
      rb.levels[from] = orig;
    }
    return out;
  });
  for (const r of res) console.log(`chapter ${r.chapter}: min ΔE ${r.min} (${r.pair})  ${JSON.stringify(r.rgb)}`);
  await b.close();
})();
