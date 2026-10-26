// Procedural Iranian cars. Units are meters; each car faces +x with its origin on the ground at its center.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// ───── Curves ─────
// Monotone cubic through [x, y] points: smooth, no overshoot, keeps flats flat.
export function curve(pts) {
  const n = pts.length, xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const d = [], m = new Array(n);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0; while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}
const k = (v) => (typeof v === 'function' ? v : () => v);

// A point on the perimeter of a rounded rectangle (half sizes w × h), t ∈ [0,1) from bottom center toward +z.
function rrPoint(t, w, h, rt, rb) {
  rt = Math.min(rt, w, h * 2); rb = Math.min(rb, w, h * 2);
  if (rt + rb > 2 * h) { const s = (2 * h) / (rt + rb); rt *= s; rb *= s; }
  const q = Math.PI / 2;
  const segs = [
    [w - rb, (u) => [u * (w - rb), -h]],
    [q * rb, (u) => { const a = -q + u * q; return [w - rb + Math.cos(a) * rb, -h + rb + Math.sin(a) * rb]; }],
    [2 * h - rb - rt, (u) => [w, -h + rb + u * (2 * h - rb - rt)]],
    [q * rt, (u) => { const a = u * q; return [w - rt + Math.cos(a) * rt, h - rt + Math.sin(a) * rt]; }],
    [2 * (w - rt), (u) => [w - rt - u * 2 * (w - rt), h]],
    [q * rt, (u) => { const a = q + u * q; return [-(w - rt) + Math.cos(a) * rt, h - rt + Math.sin(a) * rt]; }],
    [2 * h - rb - rt, (u) => [-w, h - rt - u * (2 * h - rb - rt)]],
    [q * rb, (u) => { const a = 2 * q + u * q; return [-(w - rb) + Math.cos(a) * rb, -h + rb + Math.sin(a) * rb]; }],
    [w - rb, (u) => [-(w - rb) + u * (w - rb), -h]],
  ];
  const total = segs.reduce((s, g) => s + g[0], 0);
  let d = t * total;
  for (const [len, f] of segs) { if (d <= len || len === 0 && d <= 0) return f(len ? d / len : 0); d -= len; }
  return [0, -h];
}

// A body made of rounded-rectangle sections swept along x. classify(centroid, normal) picks a material slot per triangle.
export function loft(o) {
  const { x0, x1, nx = 120, nr = 72, planExp = 0, classify, uniform = false } = o;
  const cx0 = o.cx0 ?? x0, cx1 = o.cx1 ?? x1;
  const bot = k(o.bot), top = k(o.top), half = k(o.half), rt = k(o.rt ?? 0.08), rb = k(o.rb ?? 0.04), tumble = k(o.tumble ?? 0);
  const mid = (x0 + x1) / 2, hl = (x1 - x0) / 2;
  const width = (x) => {
    let w = half(x);
    if (planExp) { const u = Math.min(1, Math.abs(x - mid) / hl); w *= Math.pow(Math.max(0, 1 - Math.pow(u, planExp)), 1 / planExp); }
    return w;
  };
  const xs = [];
  for (let i = 0; i <= nx; i++) xs.push(uniform ? cx0 + (cx1 - cx0) * i / nx : cx0 + (cx1 - cx0) * (0.5 - 0.5 * Math.cos(Math.PI * (0.15 * i / nx + 0.85 * (0.5 - 0.5 * Math.cos(Math.PI * i / nx))))));
  const pos = [];
  for (const x of xs) {
    const w = Math.max(width(x), 1e-4), yb = bot(x), yt = Math.max(top(x), yb + 1e-4), hh = (yt - yb) / 2, yc = (yt + yb) / 2, tb = tumble(x);
    for (let j = 0; j < nr; j++) {
      const [z, y0] = rrPoint(j / nr, w, hh, rt(x), rb(x));
      const y = yc + y0;
      pos.push(x, y, z * (1 - tb * (y - yb) / (yt - yb)));
    }
  }
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), n = new THREE.Vector3(), e = new THREE.Vector3(), c = new THREE.Vector3();
  const at = (v, i) => v.set(pos[3 * i], pos[3 * i + 1], pos[3 * i + 2]);
  const tris = [];
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < nr; j++) {
    const a = i * nr + j, b = (i + 1) * nr + j, cc = (i + 1) * nr + (j + 1) % nr, dd = i * nr + (j + 1) % nr;
    for (const tri of [[a, b, cc], [a, cc, dd]]) {
      at(A, tri[0]); at(B, tri[1]); at(C, tri[2]);
      n.subVectors(B, A).cross(e.subVectors(C, A));
      if (n.lengthSq() < 1e-16) continue;
      tris.push(tri);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (!o.split) {
    const groups = [[], [], [], [], []];
    for (const tri of tris) {
      at(A, tri[0]); at(B, tri[1]); at(C, tri[2]);
      n.subVectors(B, A).cross(e.subVectors(C, A)).normalize();
      c.copy(A).add(B).add(C).divideScalar(3);
      const gr = groups[classify ? classify(c, n) : 0]; gr.push(tri[0], tri[1], tri[2]);
    }
    const idx = []; let start = 0;
    groups.forEach((gr, m) => { if (gr.length) { g.addGroup(start, gr.length, m); for (const v of gr) idx.push(v); start += gr.length; } });
    g.setIndex(idx);
    g.computeVertexNormals();
    g.userData = { width, bot, top, tumble };
    return g;
  }
  // Exact material boundaries: evaluate a scalar field at the vertices and clip each triangle along
  // its iso-lines (marching triangles), so window and arch edges stay crisp at any mesh density.
  const idx0 = []; for (const t of tris) idx0.push(...t);
  g.setIndex(idx0);
  g.computeVertexNormals();
  const nrm = g.getAttribute('normal');
  const { field, cuts, mats, refine } = o.split;
  const outP = [[], [], [], [], []], outN = [[], [], [], [], []];
  const vtx = (i, fn) => {
    const p = new THREE.Vector3(pos[3 * i], pos[3 * i + 1], pos[3 * i + 2]), vn = new THREE.Vector3(nrm.getX(i), nrm.getY(i), nrm.getZ(i));
    return { p, n: vn, f: field(p, fn, vn) };
  };
  const lerpV = (a, b, t) => ({ p: a.p.clone().lerp(b.p, t), n: a.n.clone().lerp(b.n, t).normalize(), f: 0 });
  const cut = (poly, L) => {
    const up = [], dn = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length], ia = a.f >= L, ib = b.f >= L;
      (ia ? up : dn).push(a);
      if (ia !== ib) { const v = lerpV(a, b, (L - a.f) / (b.f - a.f)); v.f = L; up.push(v); dn.push(v); }
    }
    return [up, dn];
  };
  const emit = (poly, m, fn) => {
    if (poly.length < 3) return;
    if (refine) { c.set(0, 0, 0); for (const v of poly) c.add(v.p); c.divideScalar(poly.length); m = refine(c, fn, m); }
    for (let k = 1; k < poly.length - 1; k++) for (const v of [poly[0], poly[k], poly[k + 1]]) { outP[m].push(v.p.x, v.p.y, v.p.z); outN[m].push(v.n.x, v.n.y, v.n.z); }
  };
  for (const tri of tris) {
    at(A, tri[0]); at(B, tri[1]); at(C, tri[2]);
    const fn = new THREE.Vector3().subVectors(B, A).cross(e.subVectors(C, A)).normalize();
    let rest = tri.map((i) => vtx(i, fn));
    cuts.forEach((L, k) => { const [up, dn] = cut(rest, L); emit(up, mats[k], fn); rest = dn; });
    emit(rest, mats[cuts.length], fn);
  }
  const total = outP.reduce((a, x) => a + x.length, 0);
  const P = new Float32Array(total), N = new Float32Array(total);
  const out = new THREE.BufferGeometry();
  let off = 0;
  outP.forEach((arr, slot) => {
    if (!arr.length) return;
    out.addGroup(off / 3, arr.length / 3, slot);
    P.set(arr, off); N.set(outN[slot], off);
    off += arr.length;
  });
  out.setAttribute('position', new THREE.BufferAttribute(P, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  out.userData = { width, bot, top, tumble };
  g.dispose();
  return out;
}

// ───── Materials ─────
const tex = (w, h, draw) => {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
};
export const M = {
  glass: new THREE.MeshPhysicalMaterial({ color: 0x0d1620, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.78, clearcoat: 1, envMapIntensity: 1.6 }),
  glassDark: new THREE.MeshPhysicalMaterial({ color: 0x101a24, roughness: 0.04, metalness: 0.2, clearcoat: 1, envMapIntensity: 1.8 }),
  trim: new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.55 }),
  plastic: new THREE.MeshStandardMaterial({ color: 0x24272b, roughness: 0.7 }),
  under: new THREE.MeshStandardMaterial({ color: 0x0b0c0e, roughness: 0.9 }),
  chrome: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.08 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x9aa1a8, metalness: 0.85, roughness: 0.32 }),
  tire: new THREE.MeshStandardMaterial({ color: 0x1a1b1d, roughness: 0.88 }),
  lens: new THREE.MeshPhysicalMaterial({ color: 0xf4f7fb, roughness: 0.05, clearcoat: 1, emissive: 0xfff3d6, emissiveIntensity: 0.35 }),
  amber: new THREE.MeshPhysicalMaterial({ color: 0xff9a1a, roughness: 0.1, clearcoat: 1, emissive: 0xff7a00, emissiveIntensity: 0.25 }),
  red: new THREE.MeshPhysicalMaterial({ color: 0xc8101c, roughness: 0.1, clearcoat: 1, emissive: 0x8a0008, emissiveIntensity: 0.35 }),
  seat: new THREE.MeshStandardMaterial({ color: 0x3a3631, roughness: 0.9 }),
  seatBeige: new THREE.MeshStandardMaterial({ color: 0x9c8466, roughness: 0.9 }),
};
const paintCache = new Map();
export function paint(color, metallic = false) {
  const key = color + ':' + metallic;
  if (!paintCache.has(key)) paintCache.set(key, new THREE.MeshPhysicalMaterial({
    color, metalness: metallic ? 0.55 : 0.05, roughness: metallic ? 0.32 : 0.38, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.2,
  }));
  return paintCache.get(key);
}

// ───── Iranian licence plate ─────
const FA = (s) => String(s).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
export function plateTex({ a = 12, letter = 'ب', b = 365, city = 68, yellow = false } = {}) {
  return tex(520, 112, (g, w, h) => {
    g.fillStyle = '#222'; g.beginPath(); g.roundRect(0, 0, w, h, 14); g.fill();
    g.fillStyle = yellow ? '#f6c90e' : '#f7f7f2'; g.beginPath(); g.roundRect(5, 5, w - 10, h - 10, 10); g.fill();
    g.fillStyle = '#0a3d91'; g.beginPath(); g.roundRect(5, 5, 62, h - 10, [10, 0, 0, 10]); g.fill();
    for (const [i, c] of ['#239f40', '#ffffff', '#da0000'].entries()) { g.fillStyle = c; g.fillRect(18, 16 + i * 12, 36, 12); }
    g.fillStyle = '#fff'; g.font = '700 15px sans-serif'; g.textAlign = 'center'; g.fillText('I.R.', 36, 72); g.fillText('IRAN', 36, 92);
    g.fillStyle = '#111'; g.font = '800 70px V'; g.textBaseline = 'middle';
    g.fillText(FA(a), 112, 62); g.fillText(letter, 196, 58); g.fillText(FA(b), 300, 62);
    g.fillRect(392, 10, 3, h - 20);
    g.font = '700 20px V'; g.fillText('ایران', 452, 30); g.font = '800 54px V'; g.fillText(FA(city), 452, 74);
  });
}
const plateGeo = new THREE.PlaneGeometry(0.52, 0.112);

// ───── Wheels ─────
function rimTex(style) {
  return tex(256, 256, (g, w) => {
    const c = w / 2;
    const ring = (r, col) => { g.fillStyle = col; g.beginPath(); g.arc(c, c, r, 0, Math.PI * 2); g.fill(); };
    if (style === 'hubcap') { // Peykan: domed chrome hubcap on a black steel wheel
      ring(128, '#2a2c2f'); ring(112, '#d9dde2'); ring(100, '#9aa2ab'); ring(92, '#eef1f4'); ring(46, '#b8bfc7'); ring(38, '#f4f6f8');
      g.strokeStyle = '#7b838c'; g.lineWidth = 3; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.beginPath(); g.moveTo(c + Math.cos(a) * 52, c + Math.sin(a) * 52); g.lineTo(c + Math.cos(a) * 88, c + Math.sin(a) * 88); g.stroke(); }
    } else if (style === 'steel') { // Pride: black steel wheel, small cap
      ring(128, '#26292c'); ring(110, '#3a3e43'); ring(70, '#2f3337');
      g.fillStyle = '#16181a'; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; g.beginPath(); g.ellipse(c + Math.cos(a) * 88, c + Math.sin(a) * 88, 16, 9, a, 0, Math.PI * 2); g.fill(); }
      ring(34, '#c9ced4'); ring(26, '#8b939b');
    } else if (style === 'cover') { // 405: silver plastic wheel cover with slots
      ring(128, '#2a2d30'); ring(114, '#c3c8ce'); ring(108, '#9ea5ad');
      g.fillStyle = '#2b2f33'; for (let i = 0; i < 14; i++) { const a = i * Math.PI * 2 / 14; g.save(); g.translate(c + Math.cos(a) * 80, c + Math.sin(a) * 80); g.rotate(a); g.fillRect(-14, -5, 28, 10); g.restore(); }
      ring(52, '#d5dade'); ring(24, '#7d858d');
    } else { // alloy five-spoke
      ring(128, '#2a2d30'); ring(114, '#b7bec6'); ring(104, '#1c1f22');
      g.fillStyle = '#c9d0d7'; for (let i = 0; i < 5; i++) { g.save(); g.translate(c, c); g.rotate(i * Math.PI * 2 / 5); g.beginPath(); g.moveTo(-14, 0); g.lineTo(-20, -104); g.lineTo(20, -104); g.lineTo(14, 0); g.fill(); g.restore(); }
      ring(36, '#dfe4e9'); ring(16, '#80888f');
    }
  });
}
const rimMats = {};
function wheel(R, wd, style, Q = 1) {
  const seg = Math.max(12, Math.round(40 * Q));
  const g = new THREE.Group();
  const c = Math.min(0.06, wd * 0.35), r0 = R * 0.66, pts = [];
  pts.push(new THREE.Vector2(r0, -wd / 2));
  for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 + (i / 6) * Math.PI / 2; pts.push(new THREE.Vector2(R - c + Math.cos(a) * c, -wd / 2 + c + Math.sin(a) * c)); }
  for (let i = 0; i <= 6; i++) { const a = (i / 6) * Math.PI / 2; pts.push(new THREE.Vector2(R - c + Math.cos(a) * c, wd / 2 - c + Math.sin(a) * c)); }
  pts.push(new THREE.Vector2(r0, wd / 2));
  const tire = new THREE.Mesh(new THREE.LatheGeometry(pts, seg), M.tire);
  tire.rotation.x = Math.PI / 2;
  rimMats[style] ??= new THREE.MeshStandardMaterial({ map: rimTex(style), metalness: 0.75, roughness: 0.28 });
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(r0, r0, wd * 0.9, seg), [M.under, rimMats[style], rimMats[style]]);
  rim.rotation.x = Math.PI / 2;
  g.add(tire, rim);
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  return g;
}

// ───── Decals stuck onto the body by raycasting ─────
const ray = new THREE.Raycaster();
function stick(target, from, dir, obj, lift = 0.004) {
  ray.set(from, dir.clone().normalize());
  const hit = ray.intersectObject(target, false)[0];
  if (!hit) return null;
  const n = hit.face.normal.clone().transformDirection(target.matrixWorld);
  obj.position.copy(hit.point).addScaledVector(n, lift);
  obj.lookAt(hit.point.clone().add(n));
  return obj;
}
function rrShape(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  r = Math.min(r, w / 2, h / 2);
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
const slab = (w, h, r, d = 0.012) => new THREE.ExtrudeGeometry(rrShape(w, h, r), { depth: d, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2, curveSegments: 6 });
// A lamp: a bezel with a glossy lens inside.
function lamp(w, h, r, lensMat, bezel = M.trim) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(slab(w, h, r, 0.01), bezel));
  const l = new THREE.Mesh(slab(w * 0.86, h * 0.76, r * 0.8, 0.012), lensMat); l.position.z = 0.006; g.add(l);
  return g;
}
function grille(w, h, bars, barMat = M.chrome, base = M.trim) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(slab(w, h, Math.min(0.03, h / 3), 0.012), base));
  for (let i = 0; i < bars; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, h * 0.12 / Math.max(1, bars / 4), 0.012), barMat);
    b.position.set(0, -h * 0.38 + (i / Math.max(1, bars - 1)) * h * 0.76, 0.012); g.add(b);
  }
  return g;
}

// ───── Car builder ─────
/*
  spec:
    L, W, R, tireW, wheels [xF, xR], rim, track
    top: body top profile [[x,y]...] (front = +x), bot (clearance), belt (y where cabin sits; derived from top)
    cab: { xA, xRF, xRR, xC, roof, half, tumble, rt, roofPts? }
    windows: [[xFrontEdge, xRearEdge], ...] side glass in x
*/
export function buildCar(spec, color, opts = {}) {
  const Q = opts.q ?? 1;
  const car = new THREE.Group();
  const P = typeof color === 'object' && color.isMaterial ? color : paint(color, spec.metallic);
  const roofMat = opts.roofColor != null ? paint(opts.roofColor) : P;
  const hl = spec.L / 2, hw = spec.W / 2;
  const top = curve(spec.top);
  const clear = spec.clear ?? 0.22;
  const archR = spec.R + 0.055;
  const bot = (x) => {
    let y = clear + Math.max(0, Math.abs(x) - (hl - 0.32)) * 0.45;
    for (const wx of spec.wheels) { const d = Math.abs(x - wx); if (d < archR) y = Math.max(y, spec.R + Math.sqrt(archR * archR - d * d) * 0.97); }
    return y;
  };
  const bodyGeo = loft({ x0: -hl, x1: hl, nx: Math.round(170 * Q), nr: Math.round(80 * Q), planExp: spec.planExp ?? 7, bot, top, half: hw, rt: spec.bodyRt ?? 0.09, rb: 0.05, tumble: 0.05,
    split: { field: (p, fn, vn) => -vn.y - 0.55, cuts: [0], mats: [4, 0] } });
  const body = new THREE.Mesh(bodyGeo, [P, M.glass, M.trim, roofMat, M.under]);
  body.castShadow = body.receiveShadow = true;
  car.add(body);

  // Cabin: one swept shell split into roof/pillars (paint), glass and black trim.
  const cb = spec.cab;
  const roofPts = cb.roofPts ?? [[cb.xC, top(cb.xC)], [cb.xRR, cb.roof], [cb.xRF, cb.roof], [cb.xA, top(cb.xA)]];
  const roofY = curve(roofPts);
  const cabBot = (x) => top(x) - 0.03;
  const cabHalf = typeof cb.half === 'function' ? cb.half : () => cb.half;
  const cabTumble = cb.tumble ?? 0.2;
  const widthAt = (x, y) => cabHalf(x) * (1 - cabTumble * Math.max(0, (y - cabBot(x)) / Math.max(1e-3, roofY(x) - cabBot(x))));
  const TRIM = 0.022;
  const glassMargin = (p, n) => {
    const belt = top(p.x);
    if (n.y > 0.94) return -1;
    if (Math.abs(n.z) > 0.42) {
      let best = -1;
      for (const [xs, xe] of spec.windows) best = Math.max(best, Math.min(p.y - (belt + 0.035), roofY(p.x) - 0.06 - p.y, xs - p.x, p.x - xe));
      return best;
    }
    const wz = widthAt(p.x, p.y) * 0.84 - Math.abs(p.z);
    if (n.x > 0.15 && p.x > (cb.xRF + cb.xA) / 2 - 0.6) return Math.min(wz, p.y - (belt + 0.03), p.x - (cb.xRF + 0.03));
    if (n.x < -0.15) return Math.min(wz, p.y - (belt + 0.04), (cb.xRR - 0.03) - p.x);
    return -1;
  };
  const cabGeo = loft({
    x0: cb.xC - 0.01, x1: cb.xA + 0.01, nx: Math.round((cb.xA - cb.xC) * 70 * Q), nr: Math.round(110 * Q), uniform: true, bot: cabBot, top: (x) => Math.max(roofY(x), cabBot(x) + 0.004), half: cabHalf, rt: cb.rt ?? 0.1, rb: 0, tumble: cabTumble,
    split: {
      field: (p, fn) => glassMargin(p, fn),
      cuts: [0, -TRIM],
      mats: [1, 2, 0],
      refine: (c, n, m) => (m === 0 && c.y > roofY(c.x) - 0.035 && n.y > 0.6 ? 3 : m),
    },
  });
  const cab = new THREE.Mesh(cabGeo, [P, M.glass, spec.chromeTrim ? M.chrome : M.trim, roofMat, M.under]);
  cab.castShadow = true;
  car.add(cab);

  // Interior seen through the glass.
  const seatMat = spec.beige ? M.seatBeige : M.seat;
  const belt0 = top((cb.xA + cb.xC) / 2);
  const seat = (x, z, w) => { const s = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.5, w, 3, 0.08), seatMat); s.position.set(x, belt0 - 0.2, z); car.add(s);
    const b = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.5, w, 3, 0.06), seatMat); b.position.set(x - 0.26, belt0 - 0.04, z); b.rotation.z = 0.18; car.add(b); };
  if (!spec.noSeats) {
    const xf = cb.xRF - 0.28, xr = spec.rearSeatX ?? cb.xRR + 0.05;
    seat(xf, hw * 0.45, 0.5); seat(xf, -hw * 0.45, 0.5); if (spec.rearSeat !== false) seat(xr, 0, hw * 1.6);
    const dash = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.12, hw * 1.6, 3, 0.04), M.plastic); dash.position.set(cb.xA - 0.42, belt0 - 0.04, 0); car.add(dash);
    const sw = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.025, 8, 24), M.plastic); sw.position.set(cb.xA - 0.62, belt0 + 0.06, hw * 0.45); sw.rotation.y = Math.PI / 2; sw.rotation.x = 0.5; car.add(sw);
  }

  car.updateMatrixWorld(true);
  const F = new THREE.Vector3(-1, 0, 0), Bk = new THREE.Vector3(1, 0, 0), S = new THREE.Vector3(0, 0, -1);
  const front = (obj, y, z, lift) => { if (stick(body, new THREE.Vector3(hl + 1, y, z), F, obj, lift)) car.add(obj); return obj; };
  const rear = (obj, y, z, lift) => { if (stick(body, new THREE.Vector3(-hl - 1, y, z), Bk, obj, lift)) car.add(obj); return obj; };
  const side = (obj, x, y, sgn, lift) => { if (stick(body, new THREE.Vector3(x, y, sgn * (hw + 1)), S.clone().multiplyScalar(sgn), obj, lift)) car.add(obj); return obj; };

  // Bumpers: bands that wrap the nose and tail.
  for (const b of spec.bumpers ?? []) {
    const mat = b.mat === 'chrome' ? M.chrome : b.mat === 'body' ? P : b.mat === 'gray' ? M.steel : M.plastic;
    const ex = b.grow ?? 0.035;
    for (const end of b.ends ?? [1, -1]) {
      const g = loft({ x0: -hl - ex, x1: hl + ex, cx0: end > 0 ? hl - (b.depth ?? 0.45) : -hl - ex, cx1: end > 0 ? hl + ex : -hl + (b.depth ?? 0.45), nx: Math.round(40 * Q), nr: Math.round(40 * Q), planExp: spec.planExp ?? 7,
        bot: b.y0, top: b.y1, half: hw + ex * 0.5, rt: Math.min(0.04, (b.y1 - b.y0) / 2), rb: Math.min(0.04, (b.y1 - b.y0) / 2) });
      const m = new THREE.Mesh(g, mat); m.castShadow = true; car.add(m);
    }
  }
  // Side rubbing strips.
  for (const s of spec.strips ?? []) {
    const g = loft({ x0: -hl + 0.02, x1: hl - 0.02, cx0: s.x0, cx1: s.x1, nx: 80, nr: 24, planExp: spec.planExp ?? 7, bot: s.y0, top: s.y1, half: hw + 0.012, rt: 0.01, rb: 0.01 });
    const m = new THREE.Mesh(g, s.mat === 'chrome' ? M.chrome : M.trim); car.add(m);
  }

  // Lights, grille, badge, plates.
  for (const l of spec.headlights) for (const sg of [1, -1]) front(lamp(l.w, l.h, l.r ?? 0.02, M.lens, l.bezel === 'chrome' ? M.chrome : M.trim), l.y, sg * l.z, 0.003);
  for (const l of spec.indicators ?? []) for (const sg of [1, -1]) front(lamp(l.w, l.h, l.r ?? 0.01, M.amber), l.y, sg * l.z, 0.004);
  if (spec.grille) front(grille(spec.grille.w, spec.grille.h, spec.grille.bars ?? 4, spec.grille.barMat === 'trim' ? M.plastic : M.chrome), spec.grille.y, 0, 0.003);
  if (spec.badge) front(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.01, 20).rotateX(Math.PI / 2), M.chrome), spec.badge.y, 0, 0.012);
  for (const l of spec.taillights) for (const sg of [1, -1]) {
    const g = new THREE.Group();
    g.add(lamp(l.w, l.h, l.r ?? 0.015, M.red));
    if (l.amber) { const a = new THREE.Mesh(slab(l.w * 0.3, l.h * 0.7, 0.01, 0.014), M.amber); a.position.set(sg * l.w * 0.28, 0, 0.008); g.add(a); }
    rear(g, l.y, sg * l.z, 0.003);
  }
  const plate = opts.plate ?? plateTex({ yellow: opts.taxi });
  const plateMat = new THREE.MeshStandardMaterial({ map: plate, roughness: 0.5, metalness: 0.2 });
  const plateLift = (y) => { for (const b of spec.bumpers ?? []) if (y > b.y0 - 0.06 && y < b.y1 + 0.06) return (b.grow ?? 0.035) + 0.02; return 0.012; };
  if (spec.plateF != null) front(new THREE.Mesh(plateGeo, plateMat), spec.plateF, 0.013, plateLift(spec.plateF));
  if (spec.plateR != null) rear(new THREE.Mesh(plateGeo, plateMat), spec.plateR, 0.013, plateLift(spec.plateR));

  // Door handles, mirrors.
  for (const x of spec.handles ?? []) for (const sg of [1, -1]) side(new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.028, 0.02, 2, 0.008), spec.chromeTrim ? M.chrome : M.trim), x, top(x) - 0.09, sg, 0.006);
  const mx = spec.mirrorX ?? cb.xA - 0.12;
  for (const sg of [1, -1]) {
    const mg = new THREE.Group();
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.12), M.trim); arm.position.z = sg * 0.03; mg.add(arm);
    const head = new THREE.Mesh(new RoundedBoxGeometry(0.07, 0.11, 0.15, 3, 0.03), spec.mirrorPaint ? P : M.trim); head.position.z = sg * 0.13; mg.add(head);
    mg.position.set(mx, top(mx) + 0.06, sg * (cabHalf(mx) - 0.03)); mg.traverse((m) => { if (m.isMesh) m.castShadow = true; }); car.add(mg);
  }

  // Wheels.
  const track = spec.track ?? hw - spec.tireW * 0.5 - 0.035;
  for (const wx of spec.wheels) for (const sg of [1, -1]) {
    const w = wheel(spec.R, spec.tireW, spec.rim, Q); w.position.set(wx, spec.R, sg * track); if (sg < 0) w.rotation.y = Math.PI; car.add(w);
  }
  // Wipers.
  for (const sg of [0.25, -0.25]) {
    const wp = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.012, hw * 0.75), M.trim); wp.position.set(cb.xA - 0.06, top(cb.xA) + 0.035, sg * hw); wp.rotation.y = 0.35; car.add(wp);
  }

  if (opts.taxi) taxiDress(car, spec, top, roofY, P);
  if (spec.extra) spec.extra(car, { top, roofY, P, front, rear, side, body });
  car.userData.spec = spec;
  return car;
}

function taxiDress(car, spec, top, roofY, P) {
  const cb = spec.cab, x = (cb.xRF + cb.xRR) / 2 + 0.05;
  const sign = new THREE.Group();
  const signTex = tex(256, 72, (g, w, h) => {
    g.fillStyle = '#fbfbf7'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#0b7a3b'; g.fillRect(0, h - 12, w, 12);
    g.fillStyle = '#111'; g.font = '900 46px V'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('تاکسی', w / 2, h / 2 - 5);
  });
  const sm = new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.35, emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 0.25 });
  const box = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.16, 0.66, 3, 0.04), [new THREE.MeshStandardMaterial({ color: 0xf6f6f0, roughness: 0.4 }), new THREE.MeshStandardMaterial({ color: 0xf6f6f0 }), new THREE.MeshStandardMaterial({ color: 0xf6f6f0 }), new THREE.MeshStandardMaterial({ color: 0xf6f6f0 }), sm, sm]);
  box.rotation.y = Math.PI / 2;
  box.position.set(x, roofY(x) + 0.1, 0); box.castShadow = true;
  sign.add(box);
  car.add(sign);
}

// ───── The cars ─────
export const CARS = {
  // Paykan (Hillman Hunter), 1967–2005: long flat hood, chrome bumpers, twin rectangular lamps, beige interior.
  peykan: {
    name: 'پیکان', L: 4.28, W: 1.6, R: 0.3, tireW: 0.17, wheels: [1.23, -1.27], rim: 'hubcap', planExp: 9, bodyRt: 0.07, beige: true, chromeTrim: true,
    top: [[-2.14, 0.6], [-2.11, 0.79], [-1.98, 0.86], [-1.36, 0.88], [0.8, 0.875], [1.9, 0.835], [2.09, 0.79], [2.14, 0.6]],
    cab: { xA: 0.84, xRF: 0.14, xRR: -0.86, xC: -1.38, roof: 1.4, half: 0.75, tumble: 0.17, rt: 0.08 },
    windows: [[0.66, -0.04], [-0.14, -1.0]],
    bumpers: [{ y0: 0.37, y1: 0.47, mat: 'chrome', depth: 0.3, grow: 0.045 }],
    headlights: [{ w: 0.3, h: 0.16, z: 0.56, y: 0.67, r: 0.015, bezel: 'chrome' }],
    indicators: [{ w: 0.12, h: 0.05, z: 0.6, y: 0.53 }],
    grille: { w: 0.66, h: 0.15, y: 0.67, bars: 5 },
    taillights: [{ w: 0.28, h: 0.13, z: 0.56, y: 0.71, amber: true }],
    plateF: 0.42, plateR: 0.58, handles: [0.16, -0.62],
    strips: [{ y0: 0.6, y1: 0.615, mat: 'chrome', x0: -2.05, x1: 2.05 }],
    extra(car, { top }) { // fender antenna
      const a = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.006, 0.8, 6), M.chrome); a.position.set(1.4, top(1.4) + 0.4, 0.7); a.rotation.z = -0.25; car.add(a);
    },
  },
  // Pride / Saipa 131: small three-box sedan, short sloping hood, thick black bumpers.
  pride: {
    name: 'پراید', L: 3.93, W: 1.6, R: 0.28, tireW: 0.165, wheels: [1.13, -1.23], rim: 'steel', planExp: 7, bodyRt: 0.08,
    top: [[-1.965, 0.58], [-1.93, 0.84], [-1.8, 0.905], [-1.32, 0.92], [0.95, 0.9], [1.72, 0.775], [1.93, 0.72], [1.965, 0.56]],
    cab: { xA: 0.98, xRF: 0.26, xRR: -0.74, xC: -1.34, roof: 1.44, half: 0.74, tumble: 0.2, rt: 0.09 },
    windows: [[0.8, 0.0], [-0.08, -0.98]],
    bumpers: [{ y0: 0.3, y1: 0.52, mat: 'plastic', depth: 0.32, grow: 0.04 }],
    headlights: [{ w: 0.34, h: 0.15, z: 0.52, y: 0.66, r: 0.02 }],
    grille: { w: 0.3, h: 0.08, y: 0.67, bars: 2, barMat: 'trim' },
    badge: { y: 0.67 },
    taillights: [{ w: 0.32, h: 0.14, z: 0.53, y: 0.77, amber: true }],
    plateF: 0.4, plateR: 0.42, handles: [0.18, -0.6],
    strips: [{ y0: 0.56, y1: 0.6, x0: -1.85, x1: 1.85 }],
  },
  // Peugeot 405 GLX: wedge profile, slim headlamps, high tail.
  p405: {
    name: '۴۰۵', L: 4.41, W: 1.69, R: 0.3, tireW: 0.185, wheels: [1.3, -1.37], rim: 'cover', planExp: 8, bodyRt: 0.08, metallic: true,
    top: [[-2.205, 0.64], [-2.18, 0.92], [-2.05, 0.965], [-1.56, 0.965], [0.86, 0.88], [1.9, 0.725], [2.16, 0.68], [2.205, 0.52]],
    cab: { xA: 0.89, xRF: 0.06, xRR: -0.97, xC: -1.6, roof: 1.39, half: 0.79, tumble: 0.2, rt: 0.09 },
    windows: [[0.68, -0.03], [-0.13, -1.32]],
    bumpers: [{ y0: 0.3, y1: 0.46, mat: 'plastic', depth: 0.3, grow: 0.035 }],
    headlights: [{ w: 0.42, h: 0.12, z: 0.55, y: 0.63, r: 0.012 }],
    grille: { w: 0.34, h: 0.1, y: 0.63, bars: 3 },
    badge: { y: 0.635 },
    taillights: [{ w: 0.46, h: 0.15, z: 0.49, y: 0.84 }],
    plateF: 0.38, plateR: 0.62, handles: [0.2, -0.66],
    strips: [{ y0: 0.5, y1: 0.56, x0: -2.0, x1: 2.0 }],
  },
  // IKCO Samand: rounded body, big chrome grille; Tehran's yellow taxi.
  samand: {
    name: 'سمند', L: 4.52, W: 1.73, R: 0.31, tireW: 0.19, wheels: [1.33, -1.4], rim: 'alloy', planExp: 6, bodyRt: 0.12,
    top: [[-2.26, 0.6], [-2.22, 0.92], [-2.06, 0.985], [-1.6, 0.99], [0.93, 0.9], [1.9, 0.77], [2.18, 0.7], [2.26, 0.5]],
    cab: { xA: 0.95, xRF: 0.16, xRR: -0.84, xC: -1.64, roof: 1.45, half: 0.81, tumble: 0.22, rt: 0.14,
      roofPts: [[-1.64, 0.99], [-1.2, 1.3], [-0.84, 1.44], [-0.3, 1.46], [0.16, 1.44], [0.55, 1.2], [0.95, 0.9]] },
    windows: [[0.74, 0.0], [-0.12, -1.28]],
    bumpers: [{ y0: 0.3, y1: 0.5, mat: 'body', depth: 0.34, grow: 0.025 }],
    headlights: [{ w: 0.42, h: 0.17, z: 0.57, y: 0.67, r: 0.07 }],
    grille: { w: 0.4, h: 0.13, y: 0.65, bars: 3 },
    badge: { y: 0.66 },
    taillights: [{ w: 0.42, h: 0.16, z: 0.52, y: 0.84, r: 0.05 }],
    plateF: 0.38, plateR: 0.6, handles: [0.2, -0.68],
  },
  // Zamyad (Nissan Junior) pickup: built separately below.
};

// Zamyad pickup: cab + open bed, often loaded with watermelons.
export function buildZamyad(color, opts = {}) {
  const spec = {
    name: 'زامیاد', L: 2.6, W: 1.68, R: 0.34, tireW: 0.19, wheels: [0.35], rim: 'steel', planExp: 6, bodyRt: 0.08, clear: 0.3,
    top: [[-1.3, 1.02], [0.2, 1.02], [1.12, 0.96], [1.28, 0.86], [1.3, 0.62]],
    cab: { xA: 0.25, xRF: -0.12, xRR: -0.95, xC: -1.12, roof: 1.68, half: 0.78, tumble: 0.12, rt: 0.08,
      roofPts: [[-1.12, 1.02], [-1.06, 1.66], [-0.95, 1.68], [-0.12, 1.68], [0.25, 1.02]] },
    windows: [[0.05, -0.75]],
    bumpers: [{ y0: 0.4, y1: 0.55, mat: 'chrome', depth: 0.25, grow: 0.04, ends: [1] }],
    headlights: [{ w: 0.24, h: 0.16, z: 0.6, y: 0.8, r: 0.02, bezel: 'chrome' }],
    grille: { w: 0.78, h: 0.2, y: 0.8, bars: 5 },
    taillights: [], plateF: 0.47, handles: [-0.5], rearSeat: false,
  };
  const g = new THREE.Group();
  const cab = buildCar(spec, color, opts);
  const Q = opts.q ?? 1;
  cab.position.x = 1.15;
  g.add(cab);
  const P = paint(color);
  const bedL = 2.35, x0 = 1.15 - 1.32, xb = x0 - bedL / 2;
  const bedBot = (x) => { let y = 0.36; const d = Math.abs(x - (-1.05 - xb)); if (d < 0.4) y = Math.max(y, 0.34 + Math.sqrt(0.4 * 0.4 - d * d)); return y; };
  const base = new THREE.Mesh(loft({ x0: -bedL / 2, x1: bedL / 2, nx: Math.round(90 * Q), nr: Math.round(48 * Q), planExp: 12, bot: (x) => bedBot(x), top: 0.78, half: 0.84, rt: 0.03, rb: 0.03, classify: (c, n) => (n.y < -0.55 ? 4 : 0) }), [P, M.glass, M.trim, P, M.under]);
  base.position.x = xb; base.castShadow = true; g.add(base);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(bedL - 0.1, 0.02, 1.58), new THREE.MeshStandardMaterial({ color: 0x3b3f44, roughness: 0.8 }));
  floor.position.set(xb, 0.79, 0); g.add(floor);
  const wall = (w, d, x, z) => { const m = new THREE.Mesh(new RoundedBoxGeometry(w, 0.3, d, 2, 0.015), P); m.position.set(x, 0.93, z); m.castShadow = true; g.add(m); };
  wall(bedL, 0.05, xb, 0.815); wall(bedL, 0.05, xb, -0.815); wall(0.05, 1.68, xb - bedL / 2 + 0.025, 0); wall(0.05, 1.68, xb + bedL / 2 - 0.025, 0);
  for (const sg of [1, -1]) {
    const w = wheel(0.34, 0.19, 'steel', opts.q ?? 1); w.position.set(-1.05, 0.34, sg * 0.69); if (sg < 0) w.rotation.y = Math.PI; g.add(w);
    const tl = lamp(0.1, 0.22, 0.015, M.red); tl.position.set(xb - bedL / 2 - 0.003, 0.62, sg * 0.7); tl.rotation.y = -Math.PI / 2; g.add(tl);
  }
  const pl = new THREE.Mesh(plateGeo, new THREE.MeshStandardMaterial({ map: plateTex({ a: 47, letter: 'ع', b: 812, city: 21, yellow: true }), roughness: 0.5 }));
  pl.position.set(xb - bedL / 2 - 0.004, 0.55, 0); pl.rotation.y = -Math.PI / 2; g.add(pl);
  if (opts.cargo !== false) { // watermelons
    const rind = tex(256, 128, (c, w, h) => { c.fillStyle = '#2f7d32'; c.fillRect(0, 0, w, h); c.fillStyle = '#1b4d1f'; for (let i = 0; i < 12; i++) { c.beginPath(); for (let y = 0; y <= h; y += 8) c.lineTo(i * w / 12 + Math.sin(y * 0.15 + i) * 5, y); c.lineTo(i * w / 12 + 8, h); c.lineTo(i * w / 12 + 8, 0); c.fill(); } });
    const wm = new THREE.MeshPhysicalMaterial({ map: rind, roughness: 0.35, clearcoat: 0.6 });
    const geo = new THREE.SphereGeometry(0.17, 14, 10); geo.scale(1.25, 1, 1);
    let s = 7;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let layer = 0; layer < 2; layer++) for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) {
      if (layer && rnd() < 0.35) continue;
      const m = new THREE.Mesh(geo, wm);
      m.position.set(xb - bedL / 2 + 0.3 + i * 0.44 + (layer ? 0.2 : 0), 0.97 + layer * 0.27, -0.6 + j * 0.4 + (layer ? 0.2 : 0));
      m.rotation.set(rnd() * 0.5, rnd() * 3, rnd() * 0.5); m.castShadow = true; g.add(m);
    }
  }
  return g;
}

// Tehran BRT bus (stylized, shortened): red body, white roof, destination board.
export function buildBus(color = 0xc4161c, opts = {}) {
  const L = 7.4, W = 2.0;
  const windows = [];
  for (let x = 2.7; x > -3.2; x -= 1.12) windows.push([x, x - 0.98]);
  const spec = {
    name: 'اتوبوس تندرو', L, W, R: 0.45, tireW: 0.26, wheels: [2.35, -2.3], rim: 'steel', planExp: 14, bodyRt: 0.12, clear: 0.32, noSeats: true,
    top: [[-3.7, 1.0], [-3.6, 1.1], [3.6, 1.1], [3.7, 1.0]],
    cab: { xA: 3.66, xRF: 3.45, xRR: -3.55, xC: -3.68, roof: 2.75, half: 0.98, tumble: 0.05, rt: 0.22,
      roofPts: [[-3.68, 1.1], [-3.62, 2.6], [-3.5, 2.75], [3.4, 2.75], [3.58, 2.55], [3.66, 1.1]] },
    windows: [[3.5, 3.0], ...windows],
    bumpers: [{ y0: 0.3, y1: 0.62, mat: 'plastic', depth: 0.3, grow: 0.03 }],
    headlights: [{ w: 0.36, h: 0.16, z: 0.75, y: 0.8, r: 0.03 }],
    taillights: [{ w: 0.18, h: 0.4, z: 0.85, y: 0.95, r: 0.03 }],
    plateF: 0.48, plateR: 0.5, mirrorX: 3.55, mirrorPaint: true,
  };
  const bus = buildCar(spec, color, { ...opts, roofColor: 0xf3f3ef, plate: plateTex({ a: 11, letter: 'ع', b: 274, city: 11, yellow: true }) });
  bus.traverse((m) => { if (m.isMesh && Array.isArray(m.material) && m.material[1] === M.glass) { m.material = m.material.slice(); m.material[1] = M.glassDark; } });
  // Destination board over the windscreen.
  const sign = tex(512, 96, (g, w, h) => { g.fillStyle = '#111'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffae1a'; g.font = '900 64px V'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(opts.dest ?? 'تجریش', w / 2, h / 2 + 2); });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.28), new THREE.MeshStandardMaterial({ map: sign, emissive: 0xffffff, emissiveMap: sign, emissiveIntensity: 0.6 }));
  board.position.set(3.69, 2.5, 0); board.rotation.y = Math.PI / 2; bus.add(board);
  // Side livery band and «تندرو» lettering.
  const liv = tex(1024, 96, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#ffffff'; g.font = '900 72px V'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('تندرو', w * 0.32, h / 2); g.font = '700 40px V'; g.fillText('شرکت واحد اتوبوسرانی تهران', w * 0.72, h / 2 + 4); });
  for (const sg of [1, -1]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.43), new THREE.MeshStandardMaterial({ map: liv, transparent: true, roughness: 0.4 }));
    p.position.set(0, 0.86, sg * (W / 2 + 0.006)); if (sg < 0) p.rotation.y = Math.PI; bus.add(p);
  }
  // Roof AC unit.
  const ac = new THREE.Mesh(new RoundedBoxGeometry(1.6, 0.22, 1.3, 3, 0.08), new THREE.MeshStandardMaterial({ color: 0xe9ebee, roughness: 0.5 }));
  ac.position.set(0.4, 2.86, 0); ac.castShadow = true; bus.add(ac);
  return bus;
}
