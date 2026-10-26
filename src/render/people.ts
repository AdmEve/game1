/** Passengers: small stylised Tehranis whose coat color is their ride color. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Color } from '../game/rules';
import { PAINT, bake } from './fleet';

const SKIN = [0xf1c9a0, 0xe0b088, 0xd29b72, 0xc4895f, 0xf3d2b3];
const HAIR = [0x231a14, 0x3b2a20, 0x111111, 0x5a3825, 0x8a8a8a];
const SCARF = [0x1f2937, 0x6b4f3a, 0x334155, 0x7c2d12, 0x3f3f46, 0xe7e1d6];
const PANTS = [0x283447, 0x1f2937, 0x3b3b46, 0x4a3b2c];

const geo = {
  legs: new THREE.CapsuleGeometry(0.11, 0.24, 4, 10),
  torso: new THREE.CapsuleGeometry(0.16, 0.26, 6, 14),
  coat: new THREE.CylinderGeometry(0.15, 0.22, 0.52, 14),
  head: new THREE.SphereGeometry(0.135, 18, 14),
  hair: new THREE.SphereGeometry(0.142, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
  scarf: new THREE.SphereGeometry(0.16, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.72),
  drape: new THREE.ConeGeometry(0.17, 0.3, 14, 1, true),
  bag: new RoundedBoxGeometry(0.16, 0.18, 0.08, 2, 0.03),
  arm: new THREE.CapsuleGeometry(0.05, 0.26, 4, 8),
};
const mats = new Map<number, THREE.Material>();
const mat = (c: number, o: THREE.MeshStandardMaterialParameters = {}) => {
  const k = c * 7 + (o.roughness ?? 0.6) * 1000;
  if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...o }));
  return mats.get(k)!;
};
const shirt = (c: Color) => {
  const k = -PAINT[c] - 1;
  if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: new THREE.Color(PAINT[c]).offsetHSL(0, 0.05, 0.06), roughness: 0.5 }));
  return mats.get(k)!;
};

export interface Person { root: THREE.Group; body: THREE.Group; color: Color; }

/** i varies look (man / woman with headscarf, skin, hair, a bag). */
export function person(color: Color, i: number): Person {
  const root = new THREE.Group(), body = new THREE.Group();
  root.add(body);
  const woman = i % 5 === 1 || i % 5 === 3;
  const add = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; body.add(o); return o; };
  add(geo.legs, mat(PANTS[i % PANTS.length]), 0, 0.25);
  if (woman) add(geo.coat, shirt(color), 0, 0.56); // manteau
  else add(geo.torso, shirt(color), 0, 0.6);
  for (const s of [-1, 1]) { const a = add(geo.arm, shirt(color), s * 0.19, 0.58); a.rotation.z = s * 0.12; }
  add(geo.head, mat(SKIN[i % SKIN.length], { roughness: 0.55 }), 0, 0.97);
  if (woman) {
    add(geo.scarf, mat(SCARF[i % SCARF.length], { roughness: 0.8 }), 0, 0.985, -0.01).rotation.x = -0.35;
    add(geo.drape, mat(SCARF[i % SCARF.length], { roughness: 0.8 }), 0, 0.82, -0.04);
  } else add(geo.hair, mat(HAIR[i % HAIR.length], { roughness: 0.8 }), 0, 0.995).rotation.x = -0.3;
  if (i % 3 === 2) { const b = add(geo.bag, mat(0x7a4b2a, { roughness: 0.5 }), 0.24, 0.45); b.rotation.y = 0.3; }
  // One or two draw calls per person instead of eight.
  const baked = bake(body);
  root.remove(body);
  const merged = new THREE.Group();
  merged.add(...baked.children);
  root.add(merged);
  root.scale.setScalar(1.12);
  return { root, body: merged, color };
}
