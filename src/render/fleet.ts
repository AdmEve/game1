/**
 * Game-ready vehicles: each model/color is built once from the parametric car builder, then baked
 * into a handful of merged meshes (one per material family) so a full lot stays cheap to draw.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CARS, buildBenzBus, buildBus, buildCar, buildJeep, buildVanet, buildZamyad, curve } from './cars.js';
import { KIND, type Color, type Kind } from '../game/rules';
import { courierBike } from './mechanics';

export const PAINT: Record<Color, number> = {
  red: 0xc8141c, yellow: 0xf5b400, blue: 0x1857c9, green: 0x138a3f, purple: 0x6a2bc2, orange: 0xe85a0c, white: 0xeeeeea, pink: 0xe0508c, silver: 0x9aa3ad, black: 0x1c1f24,
};
export const CELL = 1.25;

// Vertex-colored stand-ins for the many small dark/plain materials.
const misc = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0.05 });
export const lightsMaterial = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.08, clearcoat: 1, emissive: 0xffffff, emissiveIntensity: 0.32 });
const lights = lightsMaterial;
lights.onBeforeCompile = (sh) => {
  sh.fragmentShader = sh.fragmentShader.replace('vec3 totalEmissiveRadiance = emissive;', 'vec3 totalEmissiveRadiance = emissive * vColor;');
};

function extract(geo: THREE.BufferGeometry, start: number, count: number, keepUv: boolean) {
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', ...(keepUv ? ['uv'] : [])]) {
    const a = geo.getAttribute(name) as THREE.BufferAttribute | undefined;
    if (!a) continue;
    out.setAttribute(name, new THREE.BufferAttribute((a.array as Float32Array).slice(start * a.itemSize, (start + count) * a.itemSize), a.itemSize));
  }
  if (keepUv && !out.getAttribute('uv')) out.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
  return out;
}

/** Merge every mesh under root into one mesh per material family. */
export function bake(root: THREE.Object3D, opts: { shadows?: boolean } = {}): THREE.Group {
  root.updateMatrixWorld(true);
  const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const casts = new Set<THREE.Material>();
  let caster = false;
  const put = (m: THREE.Material, g: THREE.BufferGeometry) => { if (!buckets.has(m)) buckets.set(m, []); buckets.get(m)!.push(g); if (caster) casts.add(m); };
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const src = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry;
    // A part only casts if it (or its ancestors' policy) says so; flat ground never does.
    caster = mesh.castShadow;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const ranges = mesh.geometry.groups.length ? mesh.geometry.groups : [{ start: 0, count: src.getAttribute('position').count, materialIndex: 0 }];
    for (const r of ranges) {
      const mat = (Array.isArray(mesh.material) ? mats[r.materialIndex ?? 0] : mesh.material) as THREE.MeshStandardMaterial;
      if (!mat || !r.count) continue;
      const hasMap = !!mat.map;
      const g = extract(src, r.start, r.count, hasMap);
      g.applyMatrix4(mesh.matrixWorld);
      // Flat-shaded parts (foliage, rocks) keep their facets: per-face normals on the unindexed copy.
      if (mat.flatShading) g.computeVertexNormals();
      const physical = (mat as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial;
      const plain = !hasMap && !mat.transparent && mat.metalness < 0.9;
      if (plain && mat.emissiveIntensity > 0 && mat.emissive && mat.emissive.getHex() !== 0 && physical && (mat as THREE.MeshPhysicalMaterial).clearcoat > 0 && mat.roughness < 0.2) {
        tint(g, mat.color); put(lights, g);
      } else if (plain && !physical) {
        tint(g, mat.color); put(misc, g);
      } else put(mat, g);
    }
  });
  const out = new THREE.Group();
  for (const [mat, geos] of buckets) {
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    merged.userData.keep = true;
    const m = new THREE.Mesh(merged, mat);
    m.castShadow = (opts.shadows ?? true) && casts.has(mat) && !(mat as THREE.Material).transparent;
    m.receiveShadow = true;
    out.add(m);
  }
  return out;
}

function tint(g: THREE.BufferGeometry, c: THREE.Color) {
  const n = g.getAttribute('position').count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
}

interface Template { mesh: THREE.Group; length: number; width: number; roofX: number; roofY: number; tilt: number; }
const cache = new Map<string, Template>();
const QUALITY = 0.32;

function template(kind: Kind, color: Color, skin?: string): Template {
  const key = kind + color + (skin ?? '');
  const hit = cache.get(key);
  if (hit) return hit;
  let raw: THREE.Object3D, length: number, width: number, roofX: number, roofY: number, tilt = 0;
  if (kind === 'bike') { raw = courierBike(); length = 1.2; width = 0.45; roofX = -0.55; roofY = 1.2; }
  else if (kind === 'bus' && skin === 'benz') { raw = buildBenzBus(PAINT[color], { q: QUALITY, roofColor: PAINT[color] }); length = 7.4; width = 2.0; roofX = -1.8; roofY = 2.82; }
  else if (kind === 'bus') { raw = buildBus(PAINT[color], { dest: 'تجریش', q: QUALITY, roofColor: PAINT[color] }); length = 7.4; width = 2.0; roofX = -1.8; roofY = 2.98; }
  else if (kind === 'zamyad' && skin === 'vanet') { raw = buildVanet(PAINT[color], { q: QUALITY }); length = 4.97; width = 1.68; roofX = 0.62; roofY = 1.45; }
  else if (kind === 'zamyad') { raw = buildZamyad(PAINT[color], { q: QUALITY }); length = 4.97; width = 1.68; roofX = 0.62; roofY = 1.7; }
  else if (skin === 'jeep') { raw = buildJeep(PAINT[color], { q: QUALITY }); length = 3.5; width = 1.57; roofX = 1.05; roofY = 1.12; }
  else {
    const spec = CARS[skin ?? kind];
    raw = buildCar(spec, PAINT[color], { taxi: kind === 'samand', q: QUALITY });
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
  const t = { mesh: bake(raw), length, width, roofX, roofY, tilt };
  cache.set(key, t);
  return t;
}

const arrowShape = new THREE.Shape();
arrowShape.moveTo(0, 0.42); arrowShape.lineTo(0.3, 0.06); arrowShape.lineTo(0.12, 0.06); arrowShape.lineTo(0.12, -0.32); arrowShape.lineTo(-0.12, -0.32); arrowShape.lineTo(-0.12, 0.06); arrowShape.lineTo(-0.3, 0.06); arrowShape.closePath();
const arrowGeo = new THREE.ShapeGeometry(arrowShape).rotateX(-Math.PI / 2).rotateY(-Math.PI / 2).center();
arrowGeo.userData.keep = true;
const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const arrowEdge = new THREE.MeshBasicMaterial({ color: 0x0b1220, transparent: true, opacity: 0.45 });

/**
 * A vehicle as placed in the game: the root faces board "up" (−z) at rotation 0, sits on the ground,
 * and has a `body` child to tilt for suspension effects.
 */
export interface VehicleObj { root: THREE.Group; body: THREE.Group; arrow: THREE.Group; length: number; }

export function makeVehicle(kind: Kind, color: Color, skin?: string, opts: { arrow?: boolean } = {}): VehicleObj {
  const t = template(kind, color, skin);
  const L = KIND[kind].len * CELL - 0.26;
  const s = L / t.length, sz = Math.min(s, 0.98 / t.width);
  const body = new THREE.Group();
  const model = t.mesh.clone();
  model.scale.set(s, s, sz);
  body.add(model);
  const arrow = new THREE.Group();
  const a = new THREE.Mesh(arrowGeo, arrowMat);
  const e = new THREE.Mesh(arrowGeo, arrowEdge);
  e.scale.setScalar(1.22); e.position.y = -0.006;
  arrow.add(e, a);
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
  return { root, body, arrow, length: L };
}

/** A standalone direction arrow pointing "up" (−z), e.g. for the top of a car cover. */
export function makeArrow(scale = 0.88): THREE.Group {
  const g = new THREE.Group();
  const a = new THREE.Mesh(arrowGeo, arrowMat), e = new THREE.Mesh(arrowGeo, arrowEdge);
  e.scale.setScalar(1.22); e.position.y = -0.006;
  g.add(e, a);
  g.rotation.y = Math.PI / 2;
  g.scale.setScalar(scale);
  return g;
}

/** Pre-build every template so the first level does not hitch. */
export function warmFleet(pairs: [Kind, Color][]) {
  for (const [k, c] of pairs) template(k, c);
}
