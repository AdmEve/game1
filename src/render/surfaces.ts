/**
 * Procedural PBR surfaces: tileable fBm noise drives an albedo map, a normal map (from a height field) and a
 * roughness map for each ground material, so the asphalt, grass and paving catch the light like the real thing
 * instead of reading as flat color. Every texture is painted once and shared.
 */
import * as THREE from 'three';

// ───── Tileable value noise ─────
function hash(x: number, y: number, s: number) { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
export function vnoise(x: number, y: number, period: number, seed: number) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const w = (a: number) => ((a % period) + period) % period;
  const a = hash(w(xi), w(yi), seed), b = hash(w(xi + 1), w(yi), seed), c = hash(w(xi), w(yi + 1), seed), d = hash(w(xi + 1), w(yi + 1), seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
/** Fractal noise over a tile of `size` px, base frequency `f` cells across the tile. 0..1. Each octave reads a
 * precomputed lattice, so a 512² map costs a few milliseconds per octave. */
export function fbm(size: number, f: number, octaves: number, seed: number, gain = 0.5): Float32Array {
  const out = new Float32Array(size * size);
  let amp = 1, total = 0;
  for (let o = 0; o < octaves; o++) {
    const fr = Math.max(1, Math.round(f * (1 << o))), lat = new Float32Array(fr * fr), sd = seed + o * 31;
    for (let y = 0; y < fr; y++) for (let x = 0; x < fr; x++) lat[y * fr + x] = hash(x, y, sd);
    const sx = new Int32Array(size), fx = new Float32Array(size);
    for (let x = 0; x < size; x++) { const u = (x / size) * fr, i = Math.floor(u), t = u - i; sx[x] = i % fr; fx[x] = t * t * (3 - 2 * t); }
    for (let y = 0; y < size; y++) {
      const y0 = sx[y] * fr, y1 = ((sx[y] + 1) % fr) * fr, v = fx[y];
      for (let x = 0; x < size; x++) {
        const x0 = sx[x], x1 = (x0 + 1) % fr, u = fx[x];
        const a = lat[y0 + x0], b = lat[y0 + x1], c = lat[y1 + x0], d = lat[y1 + x1];
        out[y * size + x] += (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * amp;
      }
    }
    total += amp; amp *= gain;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

function canvas(size: number) { const c = document.createElement('canvas'); c.width = c.height = size; return c; }
function tex(c: HTMLCanvasElement, srgb: boolean) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8;
  t.userData.keep = true;
  return t;
}
/** A tangent-space normal map from a height field (wrapping at the edges). */
function normalFrom(h: Float32Array, size: number, strength: number) {
  const c = canvas(size), g = c.getContext('2d')!, img = g.createImageData(size, size);
  const at = (x: number, y: number) => h[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (at(x + 1, y) - at(x - 1, y)) * strength, dy = (at(x, y + 1) - at(x, y - 1)) * strength;
    const l = Math.hypot(dx, dy, 1), i = (y * size + x) * 4;
    img.data[i] = (-dx / l * 0.5 + 0.5) * 255; img.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; img.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return tex(c, false);
}
function grey(v: Float32Array, size: number) {
  const c = canvas(size), g = c.getContext('2d')!, img = g.createImageData(size, size);
  for (let i = 0; i < v.length; i++) { const k = Math.max(0, Math.min(255, v[i] * 255)); img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = k; img.data[i * 4 + 3] = 255; }
  g.putImageData(img, 0, 0);
  return tex(c, false);
}
function rgb(size: number, f: (i: number, x: number, y: number) => [number, number, number]) {
  const c = canvas(size), g = c.getContext('2d')!, img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const i = y * size + x, [r, gg, b] = f(i, x, y); img.data[i * 4] = r; img.data[i * 4 + 1] = gg; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = 255; }
  g.putImageData(img, 0, 0);
  return { c, g };
}

export interface Surface { map: THREE.Texture; normalMap: THREE.Texture; roughnessMap: THREE.Texture; }
const cache = new Map<string, Surface>();
function once(key: string, make: () => Surface): Surface { if (!cache.has(key)) cache.set(key, make()); return cache.get(key)!; }
/** A material for a surface, with its own repeat (the images are shared). */
export function surfaceMat(s: Surface, repeat: [number, number], o: THREE.MeshStandardMaterialParameters = {}) {
  const cl = (t: THREE.Texture) => { const k = t.clone(); k.repeat.set(...repeat); k.needsUpdate = true; k.userData.keep = false; return k; };
  return new THREE.MeshStandardMaterial({ map: cl(s.map), normalMap: cl(s.normalMap), roughnessMap: cl(s.roughnessMap), roughness: 1, normalScale: new THREE.Vector2(0.8, 0.8), ...o });
}

/** Weathered Tehran asphalt: aggregate grain, darker patches, sealed cracks, oil stains, polished wheel paths. */
export function asphalt(tone = 1, seed = 3, snow = false): Surface {
  return once('asphalt' + tone + seed + snow, () => {
    const S = 512;
    const big = fbm(S, 4, 3, seed), grain = fbm(S, 170, 1, seed + 7), mid = fbm(S, 24, 2, seed + 3);
    const height = new Float32Array(S * S);
    for (let i = 0; i < height.length; i++) height[i] = grain[i] * 0.88 + mid[i] * 0.12;
    const { c, g } = rgb(S, (i) => {
      const stone = grain[i] > 0.72 ? (grain[i] - 0.72) * 2.2 : 0;
      const v = (0.21 + big[i] * 0.07 + mid[i] * 0.035 + stone * 0.16) * tone;
      return [v * 255 * 1.0, v * 255 * 1.01, v * 255 * 1.05];
    });
    // Sealed cracks: thin dark tar lines that wander.
    g.lineCap = 'round';
    for (let k = 0; k < 9; k++) {
      g.strokeStyle = `rgba(16,17,19,${0.25 + Math.random() * 0.2})`; g.lineWidth = 1.2 + Math.random() * 1.8;
      let x = Math.random() * S, y = Math.random() * S; g.beginPath(); g.moveTo(x, y);
      for (let s = 0; s < 14; s++) { x += (Math.random() - 0.5) * 50; y += (Math.random() - 0.3) * 30; g.lineTo(x, y); }
      g.stroke();
    }
    // Oil drips and patched squares.
    for (let k = 0; k < 10; k++) { const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1); gr.addColorStop(0, 'rgba(8,8,10,.35)'); gr.addColorStop(1, 'rgba(8,8,10,0)'); g.save(); g.translate(Math.random() * S, Math.random() * S); g.scale(18 + Math.random() * 30, 10 + Math.random() * 16); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 1, 0, Math.PI * 2); g.fill(); g.restore(); }
    for (let k = 0; k < 3; k++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '20,21,24' : '70,72,76'},.25)`; g.fillRect(Math.random() * S, Math.random() * S, 40 + Math.random() * 80, 30 + Math.random() * 60); }
    const rough = new Float32Array(S * S);
    for (let i = 0; i < rough.length; i++) rough[i] = 0.78 + grain[i] * 0.2 - (big[i] > 0.62 ? 0.12 : 0);
    if (snow) {
      // Packed snow and grey slush in drifts, wet black tarmac where the traffic has cleared it.
      const drift = fbm(S, 12, 3, seed + 50), img = g.getImageData(0, 0, S, S);
      for (let i = 0; i < drift.length; i++) {
        const k = Math.max(0, Math.min(1, (drift[i] - 0.4) * 3.5)), wv = 170 + grain[i] * 60, sl = k * 0.8;
        img.data[i * 4] = img.data[i * 4] * (1 - sl) + wv * sl; img.data[i * 4 + 1] = img.data[i * 4 + 1] * (1 - sl) + (wv + 4) * sl; img.data[i * 4 + 2] = img.data[i * 4 + 2] * (1 - sl) + (wv + 10) * sl;
        rough[i] = rough[i] * (1 - sl) + 0.7 * sl - (1 - sl) * 0.35;
        height[i] += sl * 0.6;
      }
      g.putImageData(img, 0, 0);
    }
    return { map: tex(c, true), normalMap: normalFrom(height, S, 3), roughnessMap: grey(rough, S) };
  });
}

/** Grass with clumps, dry patches and blade grain. */
export function grass(kind: 'green' | 'dry' | 'snow' = 'green', seed = 11): Surface {
  return once('grass' + kind + seed, () => {
    const S = 512;
    const big = fbm(S, 5, 3, seed), blades = fbm(S, 128, 1, seed + 5), clump = fbm(S, 18, 2, seed + 9);
    const base = kind === 'snow' ? [232, 238, 244] : kind === 'dry' ? [138, 124, 72] : [74, 104, 46];
    const dry = kind === 'snow' ? [205, 214, 224] : [142, 128, 76];
    const { c } = rgb(S, (i) => {
      const d = Math.max(0, big[i] - 0.55) * 2.2, b = 0.72 + blades[i] * 0.45 + clump[i] * 0.2;
      return [0, 1, 2].map((k) => Math.min(255, (base[k] * (1 - d) + dry[k] * d) * b)) as [number, number, number];
    });
    const h = new Float32Array(S * S); for (let i = 0; i < h.length; i++) h[i] = blades[i] * 0.6 + clump[i] * 0.4;
    const r = new Float32Array(S * S); for (let i = 0; i < r.length; i++) r[i] = kind === 'snow' ? 0.7 + blades[i] * 0.2 : 0.85 + blades[i] * 0.15;
    return { map: tex(c, true), normalMap: normalFrom(h, S, 5), roughnessMap: grey(r, S) };
  });
}

/** Square concrete sidewalk slabs with chipped joints and grime. */
export function paving(seed = 21, tile = 4): Surface {
  return once('paving' + seed + tile, () => {
    const S = 512, cell = S / tile;
    const big = fbm(S, 6, 3, seed), grain = fbm(S, 128, 1, seed + 2);
    const tint = Array.from({ length: tile * tile }, () => 0.9 + Math.random() * 0.14);
    const h = new Float32Array(S * S);
    const { c } = rgb(S, (i, x, y) => {
      const jx = Math.min(x % cell, cell - (x % cell)), jy = Math.min(y % cell, cell - (y % cell)), j = Math.min(jx, jy);
      const joint = j < 2.5 ? 0.55 + j * 0.12 : 1;
      h[i] = (j < 3 ? j / 3 : 1) * 0.8 + grain[i] * 0.2;
      const t = tint[Math.floor(y / cell) * tile + Math.floor(x / cell)], v = (0.62 + big[i] * 0.12 + grain[i] * 0.08) * t * joint;
      return [v * 255, v * 247, v * 232];
    });
    const r = new Float32Array(S * S); for (let i = 0; i < r.length; i++) r[i] = 0.82 + grain[i] * 0.16;
    return { map: tex(c, true), normalMap: normalFrom(h, S, 4), roughnessMap: grey(r, S) };
  });
}

/** Road paint that has seen a few winters: an alpha mask with chips and wear. */
let paintMask: THREE.Texture | null = null;
export function wornPaint(): THREE.Texture {
  if (paintMask) return paintMask;
  const S = 256, n = fbm(S, 10, 4, 77), fine = fbm(S, 64, 2, 79);
  const c = canvas(S), g = c.getContext('2d')!, img = g.createImageData(S, S);
  for (let i = 0; i < n.length; i++) { const a = n[i] * 0.8 + fine[i] * 0.4 > 0.42 ? 235 : 70; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = a; img.data[i * 4 + 3] = 255; }
  g.putImageData(img, 0, 0);
  return (paintMask = tex(c, false));
}

// ───── Foliage ─────
/** A cluster of leaves on a transparent background, for leaf cards. */
const leafCache = new Map<string, THREE.Texture>();
export function leafTexture(palette: string[], seed = 1, kind: 'broad' | 'needle' | 'blossom' = 'broad'): THREE.Texture {
  const key = palette.join() + seed + kind;
  if (leafCache.has(key)) return leafCache.get(key)!;
  const S = 256, c = canvas(S), g = c.getContext('2d')!;
  let s = seed * 9301 + 49297; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  // Twigs, then leaves densest in the middle, each a pointed blade with a lit and a shaded half.
  g.strokeStyle = 'rgba(70,52,34,.9)'; g.lineWidth = 2;
  for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(S / 2, S / 2); g.lineTo(S / 2 + (rnd() - 0.5) * S * 0.8, S / 2 + (rnd() - 0.5) * S * 0.8); g.stroke(); }
  const n = kind === 'needle' ? 700 : 430;
  for (let k = 0; k < n; k++) {
    const a = rnd() * Math.PI * 2, r = Math.pow(rnd(), 0.6) * S * 0.47, x = S / 2 + Math.cos(a) * r, y = S / 2 + Math.sin(a) * r;
    const len = kind === 'needle' ? 6 + rnd() * 6 : 14 + rnd() * 14, wid = kind === 'needle' ? 1.2 : len * (kind === 'blossom' ? 0.75 : 0.5);
    const col = palette[Math.floor(rnd() * palette.length)];
    g.save(); g.translate(x, y); g.rotate(rnd() * Math.PI * 2);
    g.fillStyle = col; g.beginPath(); g.moveTo(-len / 2, 0); g.quadraticCurveTo(0, -wid, len / 2, 0); g.quadraticCurveTo(0, wid, -len / 2, 0); g.fill();
    g.fillStyle = 'rgba(0,0,0,.07)'; g.beginPath(); g.moveTo(-len / 2, 0); g.quadraticCurveTo(0, wid, len / 2, 0); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,255,230,.12)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-len / 2, 0); g.lineTo(len / 2, 0); g.stroke();
    g.restore();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.userData.keep = true;
  leafCache.set(key, t);
  return t;
}

const foliageMats = new Map<string, THREE.MeshStandardMaterial>();
export function foliageMat(palette: string[], seed = 1, kind: 'broad' | 'needle' | 'blossom' = 'broad') {
  const key = palette.join() + seed + kind;
  if (!foliageMats.has(key)) {
    const m = new THREE.MeshStandardMaterial({ map: leafTexture(palette, seed, kind), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.75, metalness: 0 });
    // Both faces of a leaf card share the crown's outward normal (no flip on the back face), so the crown
    // shades as one volume instead of speckling dark wherever a card shows its back.
    m.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', THREE.ShaderChunk.normal_fragment_begin.replace('normal *= faceDirection;', ''));
    };
    m.customProgramCacheKey = () => 'foliage';
    m.userData.keep = true;
    foliageMats.set(key, m);
  }
  return foliageMats.get(key)!;
}

/**
 * Leaf cards scattered through an ellipsoid canopy. Normals point away from the canopy centre, so the crown
 * shades like a volume (lit side, shaded side) while the cutout leaves keep the silhouette ragged.
 */
export function canopy(rx: number, ry: number, rz: number, cards: number, mat: THREE.Material, rnd: () => number, cardSize = 0.7): THREE.Mesh {
  const pos: number[] = [], nor: number[] = [], uv: number[] = [];
  const q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < cards; i++) {
    // Denser toward the surface of the crown.
    const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, rr = Math.pow(rnd(), 0.35);
    const cx = Math.sqrt(1 - u * u) * Math.cos(th) * rr * rx, cy = u * rr * ry, cz = Math.sqrt(1 - u * u) * Math.sin(th) * rr * rz;
    e.set(rnd() * Math.PI, rnd() * Math.PI, rnd() * Math.PI); q.setFromEuler(e);
    const sz = cardSize * (0.7 + rnd() * 0.6);
    n.set((cx / rx) * 0.55, 0.6 + (cy / ry) * 0.5, (cz / rz) * 0.55).normalize();
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]];
    for (const [a, b] of corners) {
      v.set(a * sz * 0.5, b * sz * 0.5, 0).applyQuaternion(q).add(new THREE.Vector3(cx, cy, cz));
      pos.push(v.x, v.y, v.z); nor.push(n.x, n.y, n.z); uv.push((a + 1) / 2, (b + 1) / 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true;
  return m;
}

let barkMat: THREE.MeshStandardMaterial | null = null;
export function bark(): THREE.MeshStandardMaterial {
  if (barkMat) return barkMat;
  // Plane-tree bark: pale, peeling into olive and cream patches.
  const S = 256, n = fbm(S, 8, 4, 41), c = canvas(S), g = c.getContext('2d')!, img = g.createImageData(S, S);
  for (let i = 0; i < n.length; i++) {
    const k = n[i], p = k > 0.55 ? [196, 186, 150] : k > 0.42 ? [150, 142, 108] : [118, 110, 86];
    img.data[i * 4] = p[0]; img.data[i * 4 + 1] = p[1]; img.data[i * 4 + 2] = p[2]; img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  barkMat = new THREE.MeshStandardMaterial({ map: tex(c, true), roughness: 0.9 });
  barkMat.userData.keep = true;
  return barkMat;
}

/** A branch as a tapered cylinder from a to b. */
export function limb(a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number, mat: THREE.Material, seg = 6): THREE.Mesh {
  const d = b.clone().sub(a), len = d.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, len, seg, 1, true), mat);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  m.castShadow = true;
  return m;
}

/** Laid units (bricks, cobbles, slabs): each unit gets its own tint and a bevelled edge, mortar between. */
function units(key: string, S: number, cellOf: (x: number, y: number) => { id: number; edge: number }, palette: [number, number, number][], mortar: [number, number, number], seed: number, gloss = 0.85): Surface {
  return once(key, () => {
    const grain = fbm(S, 96, 1, seed), big = fbm(S, 5, 3, seed + 1);
    const h = new Float32Array(S * S), r = new Float32Array(S * S);
    const { c } = rgb(S, (i, x, y) => {
      const { id, edge } = cellOf(x, y);
      const bevel = Math.min(1, edge / 3);
      h[i] = bevel * 0.85 + grain[i] * 0.15;
      r[i] = edge < 1.5 ? 0.95 : gloss + grain[i] * 0.1;
      if (edge < 1.2) return [mortar[0] * (0.9 + grain[i] * 0.2), mortar[1] * (0.9 + grain[i] * 0.2), mortar[2] * (0.9 + grain[i] * 0.2)];
      const p = palette[Math.abs(id * 7919 + seed) % palette.length], k = (0.82 + ((id * 2654435761) >>> 0) % 1000 / 1000 * 0.3) * (0.85 + big[i] * 0.25) * (0.92 + grain[i] * 0.16) * (0.75 + bevel * 0.25);
      return [p[0] * k, p[1] * k, p[2] * k];
    });
    return { map: tex(c, true), normalMap: normalFrom(h, S, 5), roughnessMap: grey(r, S) };
  });
}
/** Old-Tehran clay brick in a running bond (the bazaar courtyards). */
export function bricks(): Surface {
  const S = 512, bw = 64, bh = 24;
  return units('bricks', S, (x, y) => {
    const row = Math.floor(y / bh), off = row % 2 ? bw / 2 : 0, col = Math.floor((x + off) / bw);
    const ex = Math.min((x + off) % bw, bw - ((x + off) % bw)), ey = Math.min(y % bh, bh - (y % bh));
    return { id: row * 97 + col, edge: Math.min(ex, ey) };
  }, [[168, 92, 60], [156, 82, 54], [182, 106, 70], [140, 74, 50], [176, 98, 66]], [196, 182, 160], 61, 0.88);
}
/** Mountain-village cobbles (Darband): irregular rounded stones from a jittered Voronoi grid. */
export function cobbles(): Surface {
  const S = 512, n = 12, cell = S / n;
  const pts: [number, number][] = [];
  let sd = 9; const rr = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) pts.push([(i + 0.2 + rr() * 0.6) * cell, (j + 0.2 + rr() * 0.6) * cell]);
  return units('cobbles', S, (x, y) => {
    const ci = Math.floor(x / cell), cj = Math.floor(y / cell);
    let d1 = 1e9, d2 = 1e9, id = 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const ii = (ci + di + n) % n, jj = (cj + dj + n) % n, p = pts[jj * n + ii];
      const px = p[0] + (ci + di - ii) * cell, py = p[1] + (cj + dj - jj) * cell, d = Math.hypot(x - px, y - py);
      if (d < d1) { d2 = d1; d1 = d; id = jj * n + ii; } else if (d < d2) d2 = d;
    }
    return { id, edge: (d2 - d1) * 0.9 };
  }, [[128, 122, 112], [112, 106, 98], [146, 138, 124], [98, 94, 88], [136, 126, 110]], [70, 64, 56], 67, 0.8);
}
/** A modern concrete deck: big slabs, saw-cut joints, a few rust and tyre stains (Tabiat, Milad). */
export function deck(): Surface {
  const S = 512, cell = 128;
  return units('deck', S, (x, y) => ({ id: Math.floor(y / cell) * 7 + Math.floor(x / cell), edge: Math.min(x % cell, cell - (x % cell), y % cell, cell - (y % cell)) * 1.6 }),
    [[178, 176, 170], [170, 168, 162], [186, 183, 176]], [92, 90, 86], 71, 0.82);
}
/** Large stone plaza tiles (Azadi square). */
export function plaza(): Surface {
  const S = 512, w = 128, hgt = 64;
  return units('plaza', S, (x, y) => {
    const row = Math.floor(y / hgt), off = row % 2 ? w / 3 : 0;
    return { id: row * 31 + Math.floor((x + off) / w), edge: Math.min((x + off) % w, w - ((x + off) % w), y % hgt, hgt - (y % hgt)) };
  }, [[196, 186, 168], [204, 194, 176], [186, 176, 160], [210, 200, 184]], [120, 112, 100], 73, 0.7);
}
