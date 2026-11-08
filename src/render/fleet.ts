/**
 * Game-ready vehicles: each model/color is built once from the parametric car builder, then baked
 * into a handful of merged meshes (one per material family) so a full lot stays cheap to draw.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { profile } from './profile';
import { CARS, buildBenzBus, buildBus, buildCar, buildJeep, buildVanet, buildZamyad, curve, paint } from './cars.js';
import { KIND, type Color, type Kind } from '../game/rules';
import { courierBike } from './mechanics';
import { slot, toSlots } from './instancer';

/** Real automotive paints (still far apart in hue so every color reads at a glance). */
export const PAINT: Record<Color, number> = {
  red: 0xa3121a, yellow: 0xe2a400, blue: 0x1c58b8, green: 0x1a6e3f, purple: 0x5b2c86, orange: 0xd2561a, white: 0xe8e8e4, pink: 0xc44a7e, silver: 0x9aa3ad, black: 0x16181c,
};
export const CELL = 1.25;

// Vertex-colored stand-ins for the many small dark/plain materials.
const misc = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0.05 });
export const lightsMaterial = profile.lite
  ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.1, emissive: 0xffffff, emissiveIntensity: 0.32 })
  : new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.08, clearcoat: 1, emissive: 0xffffff, emissiveIntensity: 0.32 });
const lights = lightsMaterial;
lights.onBeforeCompile = (sh) => {
  sh.fragmentShader = sh.fragmentShader.replace('vec3 totalEmissiveRadiance = emissive;', 'vec3 totalEmissiveRadiance = emissive * vColor;');
};

/**
 * The part of `geo` that one material group covers, as its own geometry. Indexed sources stay indexed (only the
 * vertices the group uses are copied, renumbered), so merged models share vertices without a slow re-welding
 * pass; non-indexed sources (and flat-shaded parts, which need per-face normals) come out as plain triangles.
 */
function extract(geo: THREE.BufferGeometry, start: number, count: number, keepUv: boolean, flat: boolean) {
  const out = new THREE.BufferGeometry();
  const names = ['position', 'normal', ...(keepUv ? ['uv'] : [])];
  const index = geo.index;
  if (index && !flat) {
    const ia = index.array, remap = new Int32Array(geo.getAttribute('position').count).fill(-1), order: number[] = [];
    const idx = new Uint32Array(count);
    for (let i = 0; i < count; i++) {
      const v = ia[start + i];
      if (remap[v] < 0) { remap[v] = order.length; order.push(v); }
      idx[i] = remap[v];
    }
    for (const name of names) {
      const a = geo.getAttribute(name) as THREE.BufferAttribute | undefined;
      if (!a) continue;
      const k = a.itemSize, src = a.array as Float32Array, dst = new Float32Array(order.length * k);
      for (let j = 0; j < order.length; j++) for (let c = 0; c < k; c++) dst[j * k + c] = src[order[j] * k + c];
      out.setAttribute(name, new THREE.BufferAttribute(dst, k));
    }
    if (keepUv && !out.getAttribute('uv')) out.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(order.length * 2), 2));
    out.setIndex(new THREE.BufferAttribute(order.length > 65535 ? idx : new Uint16Array(idx), 1));
    return out;
  }
  const src = index ? geo.toNonIndexed() : geo;
  for (const name of names) {
    const a = src.getAttribute(name) as THREE.BufferAttribute | undefined;
    if (!a) continue;
    out.setAttribute(name, new THREE.BufferAttribute((a.array as Float32Array).slice(start * a.itemSize, (start + count) * a.itemSize), a.itemSize));
  }
  if (keepUv && !out.getAttribute('uv')) out.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
  return out;
}

/**
 * The paint marker: models are built once per kind with this stand-in for the body color. Baking keeps the
 * painted parts apart, and each placed car draws them with its own color (an instance color, or a colored
 * copy of the paint material for the few cars drawn on their own).
 */
export const PAINT_MARK = new THREE.MeshStandardMaterial({ color: 0xff00ff, name: 'paint-mark' });
PAINT_MARK.userData.paint = true;
PAINT_MARK.userData.keep = true;

/** Merge every mesh under root into one mesh per material family. */
const outlineMat = new THREE.MeshBasicMaterial({ color: 0x101826, side: THREE.BackSide });
outlineMat.userData.keep = true;

/** A copy of `g` pushed out along its normals: drawn back-faces only, it shows as a dark outline around the paint. */
function inflated(g: THREE.BufferGeometry, by: number): THREE.BufferGeometry {
  const o = g.clone();
  const p = o.getAttribute('position') as THREE.BufferAttribute, n = o.getAttribute('normal') as THREE.BufferAttribute;
  // Vertices at the same spot share one averaged normal, so hard edges don't tear open when pushed outward.
  const sums = new Map<string, THREE.Vector3>();
  const key = (i: number) => `${Math.round(p.getX(i) * 400)},${Math.round(p.getY(i) * 400)},${Math.round(p.getZ(i) * 400)}`;
  for (let i = 0; i < p.count; i++) { const k = key(i); const v = sums.get(k) ?? new THREE.Vector3(); v.x += n.getX(i); v.y += n.getY(i); v.z += n.getZ(i); sums.set(k, v); }
  const tmp = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { tmp.copy(sums.get(key(i))!).normalize(); p.setXYZ(i, p.getX(i) + tmp.x * by, p.getY(i) + tmp.y * by, p.getZ(i) + tmp.z * by); }
  o.deleteAttribute('uv'); o.deleteAttribute('color'); o.deleteAttribute('normal');
  o.userData.keep = true;
  return o;
}

export function bake(root: THREE.Object3D, opts: { shadows?: boolean; outline?: number } = {}): THREE.Group {
  root.updateMatrixWorld(true);
  const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const casts = new Set<THREE.Material>();
  let caster = false;
  const put = (m: THREE.Material, g: THREE.BufferGeometry) => { if (!buckets.has(m)) buckets.set(m, []); buckets.get(m)!.push(g); if (caster) casts.add(m); };
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const src = mesh.geometry;
    // A part only casts if it (or its ancestors' policy) says so; flat ground never does.
    caster = mesh.castShadow;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const ranges = src.groups.length ? src.groups : [{ start: 0, count: src.index ? src.index.count : src.getAttribute('position').count, materialIndex: 0 }];
    for (const r of ranges) {
      const mat = (Array.isArray(mesh.material) ? mats[r.materialIndex ?? 0] : mesh.material) as THREE.MeshStandardMaterial;
      if (!mat || !r.count) continue;
      const hasMap = !!mat.map;
      const g = extract(src, r.start, Math.min(r.count, (src.index ? src.index.count : src.getAttribute('position').count) - r.start), hasMap, !!mat.flatShading);
      g.applyMatrix4(mesh.matrixWorld);
      // Flat-shaded parts (foliage, rocks) keep their facets: per-face normals on the unindexed copy.
      if (mat.flatShading) g.computeVertexNormals();
      const physical = (mat as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial;
      const plain = !hasMap && !mat.transparent && mat.metalness < 0.9;
      if (mat.userData.paint) put(mat, g);
      else if (plain && mat.emissiveIntensity > 0 && mat.emissive && mat.emissive.getHex() !== 0 && mat.roughness < 0.2 && !mat.emissiveMap) {
        tint(g, mat.color); put(lights, g);
      } else if (plain && !physical) {
        tint(g, mat.color); put(misc, g);
      } else put(mat, g);
    }
  });
  atlas(buckets, casts);
  const out = new THREE.Group();
  for (const [mat, geos] of buckets) {
    // Merging needs all parts indexed or none: plain-triangle parts get a trivial index.
    if (geos.some((g) => g.index)) for (const g of geos) if (!g.index) { const n = g.getAttribute('position').count; const ix = n > 65535 ? new Uint32Array(n) : new Uint16Array(n); for (let i = 0; i < n; i++) ix[i] = i; g.setIndex(new THREE.BufferAttribute(ix, 1)); }
    // Mixed 16/32-bit indices can't be merged as they are: widen them all when any part needs 32 bits.
    if (geos.some((g) => g.index && g.index.array instanceof Uint32Array)) for (const g of geos) if (g.index && !(g.index.array instanceof Uint32Array)) g.setIndex(new THREE.BufferAttribute(Uint32Array.from(g.index.array as Uint16Array), 1));
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    merged.userData.keep = true;
    const m = new THREE.Mesh(merged, mat);
    m.castShadow = (opts.shadows ?? true) && casts.has(mat) && !(mat as THREE.Material).transparent;
    m.receiveShadow = true;
    out.add(m);
    const ph = mat as THREE.MeshPhysicalMaterial;
    if (opts.outline && ph.isMeshPhysicalMaterial && ph.clearcoat === 1 && !ph.transparent && ph.roughness >= 0.2) out.add(new THREE.Mesh(inflated(merged, opts.outline), outlineMat));
  }
  return out;
}

/**
 * Texture atlas: parts with their own small canvas texture (plates, badges, building facades) but otherwise the
 * same material are drawn as one mesh, with their canvases packed side by side in one texture. Only textures
 * mapped once (no tiling) are packed; everything else keeps its own material.
 */
const ATLAS = 2048, PAD = 4;
const plainCompile = THREE.Material.prototype.onBeforeCompile;
function atlasKey(m: THREE.Material, geos: THREE.BufferGeometry[]): string | null {
  const s = m as THREE.MeshStandardMaterial;
  if (!s.isMeshStandardMaterial || (s as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial || s.transparent || s.alphaTest || !s.map) return null;
  if (s.onBeforeCompile !== plainCompile || s.normalMap || s.roughnessMap || s.metalnessMap || s.aoMap || s.alphaMap || s.bumpMap || s.lightMap) return null;
  const t = s.map, img = t.image as HTMLCanvasElement | undefined;
  if (!img || !img.width || !img.height || img.width > 1024 || img.height > 1024) return null;
  if (t.repeat.x !== 1 || t.repeat.y !== 1 || t.offset.x || t.offset.y || t.rotation || !t.flipY) return null;
  if (s.emissiveMap && (s.emissiveMap.image?.width !== img.width || s.emissiveMap.image?.height !== img.height || !s.emissiveMap.flipY)) return null;
  // Every vertex must sample inside the image (no wrapping across the tile's edge).
  for (const g of geos) {
    const uv = g.getAttribute('uv') as THREE.BufferAttribute | undefined;
    if (!uv) return null;
    const a = uv.array as Float32Array;
    for (let i = 0; i < a.length; i++) if (a[i] < -0.002 || a[i] > 1.002) return null;
  }
  return [s.color.getHex(), s.roughness.toFixed(2), s.metalness.toFixed(2), s.emissive.getHex(), s.emissiveIntensity.toFixed(2), !!s.emissiveMap, s.side, s.envMapIntensity, s.flatShading, s.vertexColors, s.polygonOffset, s.polygonOffsetFactor, s.depthWrite, s.fog, t.colorSpace].join('|');
}
function atlas(buckets: Map<THREE.Material, THREE.BufferGeometry[]>, casts: Set<THREE.Material>) {
  const groups = new Map<string, THREE.MeshStandardMaterial[]>();
  for (const [m, geos] of buckets) {
    const k = atlasKey(m, geos);
    if (!k) continue;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(m as THREE.MeshStandardMaterial);
  }
  for (const mats of groups.values()) {
    // Shelf-pack the largest first; whatever doesn't fit one atlas stays as it was.
    const list = [...new Set(mats)].sort((a, b) => (b.map!.image as HTMLCanvasElement).height - (a.map!.image as HTMLCanvasElement).height);
    while (list.length > 1) {
      const placed: { m: THREE.MeshStandardMaterial; x: number; y: number; w: number; h: number }[] = [];
      let x = 0, y = 0, row = 0, W = 0;
      const rest: THREE.MeshStandardMaterial[] = [];
      for (const m of list) {
        const img = m.map!.image as HTMLCanvasElement, w = img.width + PAD * 2, h = img.height + PAD * 2;
        if (x + w > ATLAS) { x = 0; y += row; row = 0; }
        if (y + h > ATLAS) { rest.push(m); continue; }
        placed.push({ m, x: x + PAD, y: y + PAD, w: img.width, h: img.height });
        x += w; row = Math.max(row, h); W = Math.max(W, x);
      }
      if (placed.length < 2) break;
      const H = y + row;
      const AW = THREE.MathUtils.ceilPowerOfTwo(W), AH = THREE.MathUtils.ceilPowerOfTwo(H);
      const draw = (get: (m: THREE.MeshStandardMaterial) => THREE.Texture | null) => {
        const c = document.createElement('canvas'); c.width = AW; c.height = AH;
        const g = c.getContext('2d')!;
        for (const p of placed) {
          const img = get(p.m)?.image as CanvasImageSource | undefined;
          if (!img) continue;
          g.drawImage(img, p.x, p.y);
          // Bleed the edge pixels into the padding so mipmaps don't pick up the neighbours.
          g.drawImage(img, 0, 0, p.w, 1, p.x, p.y - PAD, p.w, PAD); g.drawImage(img, 0, p.h - 1, p.w, 1, p.x, p.y + p.h, p.w, PAD);
          g.drawImage(c, p.x, p.y - PAD, 1, p.h + PAD * 2, p.x - PAD, p.y - PAD, PAD, p.h + PAD * 2); g.drawImage(c, p.x + p.w - 1, p.y - PAD, 1, p.h + PAD * 2, p.x + p.w, p.y - PAD, PAD, p.h + PAD * 2);
        }
        const t = new THREE.CanvasTexture(c); const src = get(placed[0].m)!;
        t.colorSpace = src.colorSpace; t.anisotropy = src.anisotropy; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
        return t;
      };
      const first = placed[0].m;
      const mat = first.clone();
      mat.map = draw((m) => m.map);
      if (first.emissiveMap) mat.emissiveMap = draw((m) => m.emissiveMap);
      const geos: THREE.BufferGeometry[] = [];
      for (const p of placed) {
        for (const g of buckets.get(p.m)!) {
          const uv = g.getAttribute('uv') as THREE.BufferAttribute, a = uv.array as Float32Array;
          for (let i = 0; i < a.length; i += 2) {
            a[i] = (p.x + a[i] * p.w) / AW;
            a[i + 1] = 1 - (p.y + (1 - a[i + 1]) * p.h) / AH;
          }
          uv.needsUpdate = true;
          geos.push(g);
        }
        buckets.delete(p.m);
      }
      buckets.set(mat, geos);
      if (placed.some((p) => casts.has(p.m))) casts.add(mat);
      list.splice(0, list.length, ...rest);
    }
  }
}

function tint(g: THREE.BufferGeometry, c: THREE.Color) {
  const n = g.getAttribute('position').count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
}

interface Template { mesh: THREE.Group; length: number; width: number; roofX: number; roofY: number; tilt: number; box: THREE.Box3; }
const cache = new Map<string, Template>();
let QUALITY = 0.3;
/** Mesh density of the car models (phones use a little less; at play distance the difference is invisible). */
export function setCarQuality(q: number) { QUALITY = q; }

/** One model per kind (and garage skin), shared by every color. */
function template(kind: Kind, skin?: string): Template {
  const key = kind + (skin ?? '');
  const hit = cache.get(key);
  if (hit) return hit;
  const P = PAINT_MARK;
  let raw: THREE.Object3D, length: number, width: number, roofX: number, roofY: number, tilt = 0;
  if (kind === 'bike') { raw = courierBike(); length = 1.2; width = 0.45; roofX = -0.55; roofY = 1.2; }
  else if (kind === 'bus' && skin === 'benz') { raw = buildBenzBus(P, { q: QUALITY, roofColor: undefined }); length = 7.4; width = 2.0; roofX = -1.8; roofY = 2.82; }
  else if (kind === 'bus') { raw = buildBus(P, { dest: 'تجریش', q: QUALITY, roofColor: undefined }); length = 7.4; width = 2.0; roofX = -1.8; roofY = 2.98; }
  else if (kind === 'zamyad' && skin === 'vanet') { raw = buildVanet(P, { q: QUALITY }); length = 4.97; width = 1.68; roofX = 0.62; roofY = 1.45; }
  else if (kind === 'zamyad') { raw = buildZamyad(P, { q: QUALITY }); length = 4.97; width = 1.68; roofX = 0.62; roofY = 1.7; }
  else if (skin === 'jeep') { raw = buildJeep(P, { q: QUALITY }); length = 3.5; width = 1.57; roofX = 1.05; roofY = 1.12; }
  else {
    const spec = CARS[skin ?? kind];
    raw = buildCar(spec, P, { taxi: kind === 'samand', q: QUALITY });
    length = spec.L; width = spec.W;
    const taxi = kind === 'samand';
    roofX = taxi ? (spec.cab.xA + spec.L / 2) / 2 + 0.05 : (spec.cab.xRF + spec.cab.xRR) / 2;
    const top = curve(spec.top);
    roofY = taxi ? top(roofX) + 0.03 : spec.cab.roof;
    // The taxi wears its arrow on the hood (the roof carries the تاکسی sign): follow the hood's slope.
    if (taxi) tilt = Math.atan((top(roofX + 0.15) - top(roofX - 0.15)) / 0.3);
  }
  // Zamyad's model is offset: its cab sits forward of the origin.
  if (kind === 'zamyad') raw.position.x = -0.04;
  const mesh = bake(raw);
  const t = { mesh, length, width, roofX, roofY, tilt, box: new THREE.Box3().setFromObject(mesh) };
  cache.set(key, t);
  return t;
}

/** Body paint per color for cars drawn on their own (the instanced ones tint one shared paint). */
const solidPaint = new Map<string, THREE.Material>();
const metallicOf = (color: Color) => color !== 'yellow' && color !== 'white';
function paintFor(color: Color): THREE.Material {
  const k = color;
  if (!solidPaint.has(k)) { const m = paint(PAINT[color], metallicOf(color)); m.userData.keep = true; solidPaint.set(k, m); }
  return solidPaint.get(k)!;
}
/** The shared white paint that instance colors tint (metallic or solid). */
function instancePaint(color: Color): THREE.Material {
  const m = paint(0xffffff, metallicOf(color)); m.userData.keep = true; return m;
}
/** Draw cars instanced (the default); `?noinst` draws each car on its own, for comparison. */
const INSTANCED = typeof location === 'undefined' || !new URLSearchParams(location.search).has('noinst');

const arrowShape = new THREE.Shape();
// A slim navigation arrow: narrow stem, crisp head.
arrowShape.moveTo(0, 0.4); arrowShape.lineTo(0.25, 0.12); arrowShape.lineTo(0.075, 0.12); arrowShape.lineTo(0.075, -0.3); arrowShape.quadraticCurveTo(0.075, -0.33, 0.045, -0.33);
arrowShape.lineTo(-0.045, -0.33); arrowShape.quadraticCurveTo(-0.075, -0.33, -0.075, -0.3); arrowShape.lineTo(-0.075, 0.12); arrowShape.lineTo(-0.25, 0.12); arrowShape.closePath();
const arrowGeo = new THREE.ShapeGeometry(arrowShape).rotateX(-Math.PI / 2).rotateY(-Math.PI / 2).center();
arrowGeo.userData.keep = true;
// Slightly over-bright so it reads as clean white after the filmic tone curve.
const arrowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.7, 1.7, 1.66), transparent: true, opacity: 0.94 });
const arrowEdge = new THREE.MeshBasicMaterial({ color: 0x05080d, transparent: true, opacity: 0.35 });
arrowMat.userData.keep = true; arrowEdge.userData.keep = true;

/**
 * A vehicle as placed in the game: the root faces board "up" (−z) at rotation 0, sits on the ground,
 * and has a `body` child to tilt for suspension effects. `box` is the body's bounds in its own frame.
 */
export interface VehicleObj { root: THREE.Group; body: THREE.Group; arrow: THREE.Group; length: number; box: THREE.Box3; }

/** A soft dark blob under a car: grounds it on the asphalt where the real shadow map is too coarse. */
let blobMat: THREE.MeshBasicMaterial | null = null;
const blobGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
blobGeo.userData.keep = true;
function blobShadow(w: number, d: number): THREE.Object3D {
  if (!blobMat) {
    // Ambient occlusion under the body: a dark core the shape of the car with a soft falloff.
    const c = document.createElement('canvas'); c.width = 64; c.height = 128;
    const g = c.getContext('2d')!;
    g.filter = 'blur(7px)'; g.fillStyle = 'rgba(0,0,0,0.62)'; g.beginPath(); g.roundRect(14, 16, 36, 96, 12); g.fill();
    g.filter = 'blur(3px)'; g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.roundRect(18, 22, 28, 84, 10); g.fill();
    blobMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false });
    blobMat.userData.keep = true;
  }
  const m = INSTANCED ? slot(blobGeo, blobMat, { renderOrder: 1 }) : new THREE.Mesh(blobGeo, blobMat);
  m.renderOrder = 1;
  m.scale.set(w, 1, d); m.position.y = 0.014;
  return m;
}

/** Phones draw cars without a shadow-map pass (the soft blob under each car stands in for it). */
let carShadows = true;
export function setCarShadows(on: boolean) { carShadows = on; }

/** The arrow's two layers: a soft dark edge under a bright head. */
function arrowParts(g: THREE.Group) {
  const a = INSTANCED ? slot(arrowGeo, arrowMat, { renderOrder: 3 }) : new THREE.Mesh(arrowGeo, arrowMat);
  const e = INSTANCED ? slot(arrowGeo, arrowEdge, { renderOrder: 2 }) : new THREE.Mesh(arrowGeo, arrowEdge);
  a.renderOrder = 3; e.renderOrder = 2;
  e.scale.setScalar(1.22); e.position.y = -0.006;
  g.add(e, a);
}

export function makeVehicle(kind: Kind, color: Color, skin?: string, opts: { arrow?: boolean } = {}): VehicleObj {
  const t = template(kind, skin);
  const L = KIND[kind].len * CELL - 0.26;
  const s = L / t.length, sz = Math.min(s, 0.98 / t.width);
  const body = new THREE.Group();
  let model: THREE.Object3D;
  if (INSTANCED) {
    model = toSlots(t.mesh, { castShadow: carShadows, tint: new THREE.Color(PAINT[color]), paint: (m) => (m === PAINT_MARK ? instancePaint(color) : null) });
  } else {
    model = t.mesh.clone();
    model.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && m.material === PAINT_MARK) m.material = paintFor(color); if (!carShadows) o.castShadow = false; });
  }
  model.scale.set(s, s, sz);
  body.add(model);
  const arrow = new THREE.Group();
  arrowParts(arrow);
  arrow.position.set(t.roofX * s, t.roofY * s + 0.02, 0);
  arrow.rotation.z = t.tilt;
  arrow.scale.setScalar(kind === 'bus' ? 1.25 : kind === 'bike' ? 0.7 : 0.88);
  if (opts.arrow !== false) body.add(arrow);
  // Model space faces +x; the game's "up" is −z.
  const turn = new THREE.Group();
  turn.rotation.y = Math.PI / 2;
  turn.add(body);
  const root = new THREE.Group();
  root.add(turn);
  if (kind !== 'bike') root.add(blobShadow(1.3, L * 1.12)); else root.add(blobShadow(0.7, L * 1.15));
  const box = t.box.clone().applyMatrix4(new THREE.Matrix4().makeScale(s, s, sz));
  return { root, body, arrow, length: L, box };
}

/** A standalone direction arrow pointing "up" (−z), e.g. for the top of a car cover. */
export function makeArrow(scale = 0.88): THREE.Group {
  const g = new THREE.Group();
  arrowParts(g);
  g.rotation.y = Math.PI / 2;
  g.scale.setScalar(scale);
  return g;
}

/** Pre-build the models of these kinds so the first level does not hitch. */
export function warmFleet(kinds: Kind[], skins: string[] = []) {
  for (const k of kinds) template(k);
  for (const sk of skins) template(sk === 'benz' ? 'bus' : sk === 'vanet' ? 'zamyad' : 'pride', sk);
}
