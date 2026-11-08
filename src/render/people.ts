/** Passengers: small stylised Tehranis whose coat color is their ride color. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Color } from '../game/rules';
import { PAINT, bake } from './fleet';
import { profile } from './profile';
import { toSlots } from './instancer';

const SKIN = [0xf1c9a0, 0xe0b088, 0xd29b72, 0xc4895f, 0xf3d2b3];
const HAIR = [0x231a14, 0x3b2a20, 0x111111, 0x5a3825, 0x8a8a8a];
const SCARF = [0x1f2937, 0x6b4f3a, 0x334155, 0x7c2d12, 0x3f3f46, 0xe7e1d6];
const PANTS = [0x283447, 0x1f2937, 0x3b3b46, 0x4a3b2c];

// Real proportions: about 7½ heads tall. Units match the cars (a 4.4 m sedan is ~2.2 here), but people are
// drawn a little larger than true scale so the queue stays readable on a phone.
const geo = {
  leg: new THREE.CylinderGeometry(0.036, 0.03, 0.44, 8).translate(0, -0.22, 0),
  shoe: new RoundedBoxGeometry(0.06, 0.035, 0.11, 2, 0.012),
  hips: new THREE.CylinderGeometry(0.085, 0.09, 0.1, 12),
  torso: new THREE.CylinderGeometry(0.11, 0.085, 0.32, 14),
  shoulders: new THREE.CapsuleGeometry(0.05, 0.14, 4, 10).rotateZ(Math.PI / 2),
  coat: new THREE.CylinderGeometry(0.105, 0.15, 0.56, 16, 1, true),
  arm: new THREE.CylinderGeometry(0.03, 0.025, 0.34, 8).translate(0, -0.17, 0),
  hand: new THREE.SphereGeometry(0.026, 8, 6),
  neck: new THREE.CylinderGeometry(0.028, 0.032, 0.05, 8),
  head: new THREE.SphereGeometry(0.068, 18, 14).scale(0.92, 1.12, 1),
  hair: new THREE.SphereGeometry(0.072, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.52).scale(0.94, 1.1, 1.02),
  scarf: new THREE.SphereGeometry(0.083, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.7).scale(0.94, 1.12, 1),
  drape: new THREE.ConeGeometry(0.1, 0.16, 14, 1, true),
  bag: new RoundedBoxGeometry(0.11, 0.13, 0.05, 2, 0.015),
};
const mats = new Map<number, THREE.Material>();
const mat = (c: number, o: THREE.MeshStandardMaterialParameters = {}) => {
  const k = c * 7 + (o.roughness ?? 0.85) * 1000;
  if (!mats.has(k)) { const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o }); m.userData.keep = true; mats.set(k, m); }
  return mats.get(k)!;
};
/**
 * Clothes in the ride color: matte fabric, a touch less saturated than car paint. Passengers are built once per
 * look with a stand-in material for the clothes; every passenger drawn is an instance tinted with its color.
 */
const CLOTH_MARK = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.88, side: THREE.DoubleSide, name: 'cloth-mark' });
CLOTH_MARK.userData.paint = true; CLOTH_MARK.userData.keep = true;
const cloth = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.88, side: THREE.DoubleSide, name: 'cloth' });
cloth.userData.keep = true;
const clothTint = new Map<Color, THREE.Color>();
const tintOf = (c: Color) => { if (!clothTint.has(c)) clothTint.set(c, new THREE.Color(PAINT[c]).offsetHSL(0, -0.04, 0.05)); return clothTint.get(c)!; };

export interface Person { root: THREE.Group; body: THREE.Group; color: Color; userData?: { vip: boolean; gran: boolean } }

/** How many distinct passenger looks there are (men in jackets, women in manteau and rusari, with or without a bag). */
export const LOOKS = 8;
const looks = new Map<number, THREE.Group>();

/** Build look `i` once: legs, coat, arms, head and hair or scarf, merged into a couple of meshes. */
function look(i: number): THREE.Group {
  const hit = looks.get(i);
  if (hit) return hit;
  const body = new THREE.Group();
  const woman = i % 2 === 1;
  const add = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = !profile.lite; body.add(o); return o; };
  const pants = mat(PANTS[i % PANTS.length]), top = CLOTH_MARK, skin = mat(SKIN[i % SKIN.length], { roughness: 0.6 });
  for (const sx of [-1, 1]) {
    add(geo.leg, pants, sx * 0.045, 0.47, (i % 2 ? 0.01 : -0.01) * sx);
    add(geo.shoe, mat(0x1b1b1d, { roughness: 0.5 }), sx * 0.045, 0.018, 0.02);
  }
  add(geo.hips, pants, 0, 0.5);
  if (woman) add(geo.coat, top, 0, 0.52 + 0.28 - 0.02); // manteau down to the knees
  add(geo.torso, top, 0, 0.7);
  add(geo.shoulders, top, 0, 0.84);
  for (const sx of [-1, 1]) {
    const a = add(geo.arm, top, sx * 0.13, 0.86); a.rotation.z = sx * 0.09; a.rotation.x = (i % 3 - 1) * 0.08 * sx;
    add(geo.hand, skin, sx * 0.16, 0.53);
  }
  add(geo.neck, skin, 0, 0.9);
  add(geo.head, skin, 0, 0.97);
  if (woman) {
    add(geo.scarf, mat(SCARF[i % SCARF.length], { roughness: 0.9 }), 0, 0.975, -0.008).rotation.x = -0.3;
    add(geo.drape, mat(SCARF[i % SCARF.length], { roughness: 0.9 }), 0, 0.87, -0.015);
  } else add(geo.hair, mat(HAIR[i % HAIR.length], { roughness: 0.9 }), 0, 0.985, -0.006).rotation.x = -0.25;
  if (i % 3 === 2) { const b = add(geo.bag, mat(0x5e3b22, { roughness: 0.55 }), 0.17, 0.55); b.rotation.y = 0.3; }
  const baked = bake(body);
  looks.set(i, baked);
  return baked;
}

/** Build every look ahead of time (at load), so no passenger is ever built during play. */
export function warmPeople() { for (let k = 0; k < LOOKS; k++) look(k); }

/** Passenger number i (its look and height vary with i), dressed in the ride color. */
export function person(color: Color, i: number): Person {
  const root = new THREE.Group();
  const tall = 0.96 + ((i * 37) % 9) * 0.012;
  const merged = toSlots(look(i % LOOKS), { castShadow: !profile.lite, tint: tintOf(color), paint: (m) => (m === CLOTH_MARK ? cloth : null) }) as THREE.Group;
  root.add(merged);
  root.scale.setScalar(1.18 * tall);
  return { root, body: merged, color };
}

/** A floral prayer chador «چادر نماز» in a light tint of the ride color, shared per color. */
const chadors = new Map<Color, THREE.Material>();
function chadorMat(color: Color) {
  if (chadors.has(color)) return chadors.get(color)!;
  const base = new THREE.Color(PAINT[color]).offsetHSL(0, -0.05, 0.12);
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = `#${base.getHexString()}`; g.fillRect(0, 0, 128, 128);
  for (let k = 0; k < 60; k++) {
    const x = Math.random() * 128, y = Math.random() * 128;
    g.fillStyle = 'rgba(255,255,255,.85)';
    for (let p = 0; p < 5; p++) { g.beginPath(); g.arc(x + Math.cos(p * 1.256) * 2.6, y + Math.sin(p * 1.256) * 2.6, 2, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#fde047'; g.beginPath(); g.arc(x, y, 1.4, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2);
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.75, side: THREE.DoubleSide });
  m.userData.keep = true; chadors.set(color, m);
  return m;
}

/** «حاج‌خانم با خرید»: a grandma in a floral chador with two full shopping bags (she takes two seats). */
export function granny(color: Color, i: number): Person {
  const key = color + (i % 5);
  let baked = grannies.get(key);
  if (!baked) { baked = buildGranny(color, i); grannies.set(key, baked); }
  const root = new THREE.Group();
  const merged = baked.clone();
  root.add(merged);
  root.scale.setScalar(1.12);
  return { root, body: merged, color };
}
const grannies = new Map<string, THREE.Group>();
function buildGranny(color: Color, i: number): THREE.Group {
  const body = new THREE.Group();
  const add = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = !profile.lite; body.add(o); return o; };
  const ch = chadorMat(color);
  // The chador falls from the head to the ground; she leans forward a little.
  add(new THREE.CylinderGeometry(0.16, 0.3, 0.86, 16), ch, 0, 0.43);
  // The hood is open at the front (+z) so her face shows.
  const hood = new THREE.SphereGeometry(0.17, 16, 12, Math.PI * 0.85, Math.PI * 1.3, 0, Math.PI * 0.7);
  add(hood, ch, 0, 0.9, -0.02);
  add(geo.head, mat(SKIN[(i + 1) % SKIN.length], { roughness: 0.55 }), 0, 0.89, 0.02).scale.setScalar(0.88);
  add(new THREE.SphereGeometry(0.055, 8, 6), mat(0xe5e7eb, { roughness: 0.8 }), 0, 0.99, 0.08).scale.set(1.6, 0.5, 0.6); // white hair at the hood's edge
  // Two string bags «زنبیل»: herbs and a long «سنگک» bread on one side, oranges on the other.
  const bag = mat(0x2f6b3a, { roughness: 0.8 }), bag2 = mat(0x8b5a2b, { roughness: 0.8 });
  add(new THREE.CylinderGeometry(0.1, 0.085, 0.2, 10), bag, -0.3, 0.3);
  add(new THREE.IcosahedronGeometry(0.08, 0), mat(0x4caf50, { roughness: 0.7 }), -0.3, 0.45);
  add(new RoundedBoxGeometry(0.05, 0.36, 0.14, 2, 0.02), mat(0xc8935a, { roughness: 0.8 }), -0.36, 0.5).rotation.z = 0.25;
  add(new THREE.CylinderGeometry(0.1, 0.085, 0.2, 10), bag2, 0.3, 0.3);
  for (let k = 0; k < 3; k++) add(new THREE.SphereGeometry(0.05, 8, 6), mat(0xf59e0b, { roughness: 0.5 }), 0.27 + (k % 2) * 0.06, 0.43 + (k === 2 ? 0.05 : 0), (k - 1) * 0.04);
  for (const s of [-1, 1]) add(new THREE.TorusGeometry(0.07, 0.01, 4, 10, Math.PI), mat(0x3f3f46), s * 0.3, 0.42).rotation.y = Math.PI / 2;
  const baked = bake(body);
  baked.rotation.x = 0.06;
  baked.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.geometry.userData.keep = true; (m.material as THREE.Material).userData.keep = true; } });
  return baked;
}
