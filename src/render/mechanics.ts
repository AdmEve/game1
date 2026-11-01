/** 3D pieces for the special mechanics: car covers, broken-car props, plate badges, VIP markers. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { curve, loft } from './cars.js';
import { fbm } from './surfaces';

const fa = (n: number | string) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// ───── «چادر ماشین»: a silver car cover draped over the car's shape ─────
let fabric: THREE.MeshPhysicalMaterial | null = null;
function fabricMat() {
  if (fabric) return fabric;
  // Wrinkles: long soft folds running down the sides, from a stretched noise height field.
  const S = 256, n = fbm(S, 5, 3, 91), f = fbm(S, 22, 2, 93);
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d')!, img = g.createImageData(S, S);
  const h = (x: number, y: number) => { const xx = (x + S) % S, yy = (y + S) % S; return n[yy * S + xx] * 0.7 + f[yy * S + ((xx * 3) % S)] * 0.3; };
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = (h(x + 1, y) - h(x - 1, y)) * 9, dy = (h(x, y + 1) - h(x, y - 1)) * 2.5, l = Math.hypot(dx, dy, 1), i = (y * S + x) * 4;
    img.data[i] = (-dx / l * 0.5 + 0.5) * 255; img.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; img.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const nm = new THREE.CanvasTexture(c); nm.wrapS = nm.wrapT = THREE.RepeatWrapping; nm.colorSpace = THREE.NoColorSpace;
  fabric = new THREE.MeshPhysicalMaterial({ color: 0xaab1b9, roughness: 0.48, metalness: 0.25, sheen: 0.7, sheenColor: new THREE.Color(0xe8eef5), sheenRoughness: 0.45, normalMap: nm, normalScale: new THREE.Vector2(0.9, 0.9) });
  fabric.userData.keep = true;
  return fabric;
}
const hemMat = new THREE.MeshStandardMaterial({ color: 0x23272d, roughness: 0.8 });
hemMat.userData.keep = true;

/** UVs projected from the side and the top, so the folds run down the flanks and lie flat on the roof. */
function projectUv(geo: THREE.BufferGeometry) {
  const p = geo.getAttribute('position'), n = geo.getAttribute('normal'), uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const up = Math.abs(n.getY(i)) > 0.7;
    uv[i * 2] = p.getX(i) * 0.9; uv[i * 2 + 1] = up ? p.getZ(i) * 0.9 : p.getY(i) * 0.9 + p.getZ(i) * 0.2;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

/** A cover sized for a vehicle of length L (along −z when the vehicle faces up); `top` = its roof height. */
export function carCover(L: number, top = 0.95): THREE.Group {
  const g = new THREE.Group();
  const box = top > 1.0, H = Math.max(0.8, top + 0.04), hl = L / 2 + (box ? 0.12 : 0.04), half = box ? 0.6 : 0.56;
  // A sedan's silhouette (trunk, rear window, roof, windscreen, hood) or a van/bus box.
  const prof = box
    ? [[-1, 0.9], [-0.97, 0.99], [-0.85, 1], [0.6, 1], [0.86, 0.9], [0.97, 0.7], [1, 0.55]]
    : [[-1, 0.52], [-0.95, 0.68], [-0.72, 0.72], [-0.42, 0.97], [-0.18, 1], [0.16, 1], [0.42, 0.74], [0.86, 0.64], [0.97, 0.56], [1, 0.42]];
  const top0 = curve(prof.map(([u, y]) => [u * hl, y * H]) as [number, number][]);
  const geo = loft({ x0: -hl, x1: hl, nx: 56, nr: 40, planExp: 6, bot: 0.1, top: top0, half, rt: 0.22, rb: 0.04, tumble: box ? 0.06 : 0.22 });
  geo.computeVertexNormals();
  projectUv(geo);
  const body = new THREE.Mesh(geo, fabricMat()); body.castShadow = true; body.receiveShadow = true;
  // The elastic hem that holds it under the bumpers.
  const hem = new THREE.Mesh(loft({ x0: -hl - 0.012, x1: hl + 0.012, nx: 40, nr: 24, planExp: 6, bot: 0.09, top: 0.15, half: half + 0.012, rt: 0.02, rb: 0.02 }), hemMat);
  const shape = new THREE.Group(); shape.add(body, hem); shape.rotation.y = Math.PI / 2;
  g.userData.top = H + 0.01;
  g.add(shape);
  return g;
}

/** The cover flies off with the wind. */
export function blowOff(cover: THREE.Object3D, tween: (d: number, f: (k: number) => void) => Promise<void>): Promise<void> {
  const p0 = cover.position.clone(), dir = Math.random() < 0.5 ? -1 : 1;
  cover.traverse((m) => { const mm = m as THREE.Mesh; if (mm.isMesh) { mm.material = (mm.material as THREE.Material).clone(); (mm.material as THREE.Material).transparent = true; } });
  return tween(0.9, (k) => {
    cover.position.set(p0.x + dir * k * 1.6, p0.y + Math.sin(k * Math.PI) * 1.6 + k * 0.8, p0.z - k * 0.6);
    cover.rotation.set(-k * 1.2, dir * k * 2.2, dir * k * 0.8);
    cover.scale.set(1 + k * 0.3, 1 - k * 0.5, 1 + k * 0.2);
    cover.traverse((m) => { const mm = m as THREE.Mesh; if (mm.isMesh) (mm.material as THREE.Material).opacity = 1 - k * k; });
  });
}

// ───── Badges (sprites that always face the camera) ─────
function badge(draw: (g: CanvasRenderingContext2D) => void, w = 0.62, h = 0.36) {
  const tex = canvasTex(256, 148, draw);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.renderOrder = 12;
  s.scale.set(w, h, 1);
  return s;
}

/** A wrench badge with how many cars must leave before a broken car is fixed. */
export function brokenBadge(left: number): THREE.Sprite {
  const s = badge(() => {});
  setBrokenBadge(s, left);
  return s;
}
export function setBrokenBadge(s: THREE.Sprite, left: number) {
  const tex = s.material.map as THREE.CanvasTexture;
  const g = (tex.image as HTMLCanvasElement).getContext('2d')!;
  g.clearRect(0, 0, 256, 148);
  g.fillStyle = '#f59e0b'; g.strokeStyle = '#78350f'; g.lineWidth = 8;
  g.beginPath(); g.roundRect(14, 14, 228, 120, 40); g.fill(); g.stroke();
  // A wrench, then the count.
  g.save(); g.translate(78, 74); g.rotate(-0.8); g.fillStyle = '#3b1d00';
  g.fillRect(-7, -6, 14, 52); g.beginPath(); g.arc(0, -16, 20, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#f59e0b'; g.fillRect(-7, -40, 14, 24); g.restore();
  g.fillStyle = '#3b1d00'; g.font = '900 78px Vazirmatn'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(fa(left), 168, 82);
  tex.needsUpdate = true;
}

/** A small plate showing the plate's last digit, dimmed when that parity may not leave. */
export function plateBadge(digit: number): THREE.Sprite {
  const s = badge(() => {}, 0.5, 0.29);
  setPlateBadge(s, digit, true);
  return s;
}
export function setPlateBadge(s: THREE.Sprite, digit: number, allowed: boolean) {
  const tex = s.material.map as THREE.CanvasTexture;
  const g = (tex.image as HTMLCanvasElement).getContext('2d')!;
  g.clearRect(0, 0, 256, 148);
  g.fillStyle = '#111'; g.beginPath(); g.roundRect(8, 20, 240, 108, 16); g.fill();
  g.fillStyle = allowed ? '#f7f7f2' : '#9ca3af'; g.beginPath(); g.roundRect(16, 28, 224, 92, 10); g.fill();
  g.fillStyle = '#0a3d91'; g.beginPath(); g.roundRect(16, 28, 44, 92, [10, 0, 0, 10]); g.fill();
  g.fillStyle = digit % 2 ? '#c2410c' : '#1d4ed8'; g.font = '900 78px Vazirmatn'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(fa(digit), 150, 80);
  if (!allowed) { g.strokeStyle = '#dc2626'; g.lineWidth = 12; g.beginPath(); g.moveTo(40, 120); g.lineTo(220, 30); g.stroke(); }
  tex.needsUpdate = true;
  s.material.opacity = allowed ? 1 : 0.85;
}

/** Hazard triangle on the ground behind a broken car. */
export function hazard(): THREE.Mesh {
  const tri = new THREE.Shape(); tri.moveTo(0, 0.3); tri.lineTo(0.26, -0.15); tri.lineTo(-0.26, -0.15); tri.closePath();
  const inner = new THREE.Path(); inner.moveTo(0, 0.17); inner.lineTo(0.14, -0.08); inner.lineTo(-0.14, -0.08); inner.closePath();
  tri.holes.push(inner);
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.03, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: 0xff3b30, emissive: 0x661010, roughness: 0.4 }));
  m.castShadow = true;
  return m;
}

/** VIP «دربست» passenger: a gold halo on the ground and a label over the head. */
export function vipMarker(): THREE.Group {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.035, 8, 28), new THREE.MeshStandardMaterial({ color: 0xffc928, emissive: 0xb45309, emissiveIntensity: 0.6, metalness: 0.6, roughness: 0.3 }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03;
  const label = badge((c) => {
    c.fillStyle = '#111827'; c.beginPath(); c.roundRect(10, 30, 236, 88, 40); c.fill();
    c.strokeStyle = '#fbbf24'; c.lineWidth = 6; c.stroke();
    c.fillStyle = '#fbbf24'; c.font = '900 60px Vazirmatn'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('دربست', 128, 76);
  }, 0.62, 0.36);
  label.position.y = 1.55;
  g.add(ring, label);
  return g;
}

/** A small pill over a passenger who takes more than one seat. */
export function seatsBadge(n: number): THREE.Sprite {
  return badge((c) => {
    c.fillStyle = '#7c2d12'; c.beginPath(); c.roundRect(8, 26, 240, 96, 44); c.fill();
    c.strokeStyle = '#fde68a'; c.lineWidth = 6; c.stroke();
    c.fillStyle = '#fde68a'; c.font = '900 52px Vazirmatn'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.direction = 'rtl';
    c.fillText(`${fa(n)} صندلی`, 128, 78);
  }, 0.72, 0.42);
}

const mstd = (color: number, o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o });

/** A Honda 125 «موتور هوندا», the courier's workhorse. */
export function motorbike(color: number): THREE.Group {
  const g = new THREE.Group();
  const tire = mstd(0x1a1b1d), body = mstd(color, { roughness: 0.35, metalness: 0.2 }), chrome = mstd(0xdfe3e8, { metalness: 0.9, roughness: 0.2 });
  for (const x of [-0.42, 0.42]) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.05, 6, 14), tire); w.position.set(x, 0.2, 0); g.add(w); }
  const tank = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.18, 0.2, 2, 0.06), body); tank.position.set(0.05, 0.52, 0); g.add(tank);
  const seat = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.08, 0.2, 2, 0.04), mstd(0x111111)); seat.position.set(-0.28, 0.58, 0); g.add(seat);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 0.06), chrome); frame.position.set(0, 0.34, 0); frame.rotation.z = -0.15; g.add(frame);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 6), chrome); bar.rotation.x = Math.PI / 2; bar.position.set(0.36, 0.72, 0); g.add(bar);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), mstd(0xfff6dc, { emissive: 0xfff0c0, emissiveIntensity: 0.3 })); lamp.position.set(0.46, 0.62, 0); g.add(lamp);
  const box = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.26, 0.3, 2, 0.03), mstd(0xf59e0b, { roughness: 0.5 })); box.position.set(-0.5, 0.74, 0); g.add(box); // delivery box
  g.traverse((m) => { m.castShadow = true; });
  return g;
}


/** The courier: a Honda 125 with its rider (orange jacket, helmet) and a delivery box. Faces +x. */
export function courierBike(): THREE.Group {
  const g = motorbike(0xb91c1c);
  const jacket = mstd(0xf97316, { roughness: 0.6 }), dark = mstd(0x1f2937);
  const legs = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.3, 4, 8), dark); legs.position.set(-0.12, 0.62, 0); legs.rotation.z = 1.2; g.add(legs);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.22, 6, 12), jacket); torso.position.set(-0.18, 0.92, 0); torso.rotation.z = -0.35; g.add(torso);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), mstd(0xfacc15, { roughness: 0.3, metalness: 0.2 })); helmet.position.set(-0.08, 1.2, 0); g.add(helmet);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.152, 16, 8, -0.6, 1.2, 1.1, 0.6), mstd(0x111827, { roughness: 0.1, metalness: 0.5 })); visor.position.copy(helmet.position); g.add(visor);
  for (const z of [-0.12, 0.12]) { const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.3, 4, 8), jacket); arm.position.set(0.1, 0.92, z); arm.rotation.z = -1.1; g.add(arm); }
  g.traverse((m) => { m.castShadow = true; });
  return g;
}

// ───── Colour-blind symbols: one distinct shape per colour ─────
const SHAPES: Record<string, (g: CanvasRenderingContext2D) => void> = {
  red: (g) => { g.beginPath(); g.moveTo(64, 26); g.lineTo(100, 96); g.lineTo(28, 96); g.closePath(); g.fill(); },
  yellow: (g) => { g.beginPath(); g.arc(64, 64, 34, 0, Math.PI * 2); g.fill(); },
  blue: (g) => { g.fillRect(32, 32, 64, 64); },
  green: (g) => { g.beginPath(); g.moveTo(64, 24); g.lineTo(104, 64); g.lineTo(64, 104); g.lineTo(24, 64); g.closePath(); g.fill(); },
  purple: (g) => { g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 16 : 40, a = -Math.PI / 2 + (i * Math.PI) / 5; g.lineTo(64 + Math.cos(a) * r, 66 + Math.sin(a) * r); } g.closePath(); g.fill(); },
  orange: (g) => { g.fillRect(52, 26, 24, 76); g.fillRect(26, 52, 76, 24); },
  white: (g) => { g.lineWidth = 14; g.beginPath(); g.arc(64, 64, 30, 0, Math.PI * 2); g.stroke(); },
  pink: (g) => { g.beginPath(); g.moveTo(64, 100); g.bezierCurveTo(10, 64, 30, 20, 64, 46); g.bezierCurveTo(98, 20, 118, 64, 64, 100); g.fill(); },
};
const symbolCache = new Map<string, THREE.SpriteMaterial>();
/** A small badge with the colour's shape, for colour-blind players. */
export function colorSymbol(color: string, size = 0.42): THREE.Sprite {
  if (!symbolCache.has(color)) {
    const tex = canvasTex(128, 128, (g) => {
      g.fillStyle = 'rgba(15,23,42,.85)'; g.beginPath(); g.arc(64, 64, 60, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 6; g.stroke();
      g.fillStyle = '#fff'; g.strokeStyle = '#fff';
      (SHAPES[color] ?? SHAPES.yellow)(g);
    });
    const sm = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }); sm.userData.keep = true;
    symbolCache.set(color, sm);
  }
  const s = new THREE.Sprite(symbolCache.get(color)!);
  s.renderOrder = 11;
  s.scale.setScalar(size);
  return s;
}

/** «پلیس راهور»: a traffic officer in olive uniform, white cap and gloves. Arms show the open direction. */
export function trafficOfficer(): THREE.Group {
  const g = new THREE.Group();
  const uni = mstd(0x4d5b3a, { roughness: 0.7 }), white = mstd(0xf8fafc, { roughness: 0.5 }), skin = mstd(0xe0b088, { roughness: 0.6 });
  const legs = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.3, 4, 10), mstd(0x2f3a24)); legs.position.y = 0.3; g.add(legs);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.28, 6, 14), uni); torso.position.y = 0.68; g.add(torso);
  const vest = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.19, 0.2, 14, 1, true), mstd(0xd9f99d, { emissive: 0x4d7c0f, emissiveIntensity: 0.3 })); vest.position.y = 0.7; g.add(vest);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), skin); head.position.y = 1.05; g.add(head);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.09, 16), white); cap.position.y = 1.16; g.add(cap);
  const peak = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.2), mstd(0x111111)); peak.position.set(0.13, 1.12, 0); g.add(peak);
  const arm = (side: number) => {
    const pivot = new THREE.Group(); pivot.position.set(0, 0.86, side * 0.2);
    const a = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.36, 4, 8), uni); a.position.y = -0.2; pivot.add(a);
    const glove = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), white); glove.position.y = -0.42; pivot.add(glove);
    g.add(pivot);
    return pivot;
  };
  g.userData.armL = arm(1); g.userData.armR = arm(-1);
  g.traverse((m) => { m.castShadow = true; });
  return g;
}

/** Point the officer's arms along the open axis ('v' = up/down the lot, 'h' = left/right). */
export function poseOfficer(o: THREE.Group, axis: 'v' | 'h', k = 1) {
  const L = o.userData.armL as THREE.Group, R = o.userData.armR as THREE.Group;
  // 'h': arms straight out to the sides; 'v': one arm forward, one back.
  const tL = axis === 'h' ? { x: -Math.PI / 2, z: 0 } : { x: 0, z: Math.PI / 2 };
  const tR = axis === 'h' ? { x: Math.PI / 2, z: 0 } : { x: 0, z: -Math.PI / 2 };
  L.rotation.x += (tL.x - L.rotation.x) * k; L.rotation.z += (tL.z - L.rotation.z) * k;
  R.rotation.x += (tR.x - R.rotation.x) * k; R.rotation.z += (tR.z - R.rotation.z) * k;
}

/** «گاری میوه»: a wooden barrow heaped with pomegranates and oranges, with an umbrella. */
export function fruitCart(): THREE.Group {
  const g = new THREE.Group();
  const wood = mstd(0x9a6b3f, { roughness: 0.8 }), dark = mstd(0x5b3a1e);
  const tray = new THREE.Mesh(new RoundedBoxGeometry(0.95, 0.16, 0.65, 2, 0.03), wood); tray.position.y = 0.5; g.add(tray);
  for (const sg of [1, -1]) {
    const wheelM = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.04, 6, 14), dark); wheelM.position.set(0, 0.22, sg * 0.36); g.add(wheelM);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 0.05), wood); leg.position.set(-0.4, 0.28, sg * 0.25); g.add(leg);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 6), wood); handle.rotation.z = Math.PI / 2 - 0.3; handle.position.set(-0.68, 0.62, sg * 0.25); g.add(handle);
  }
  const fruitG = new THREE.SphereGeometry(0.07, 10, 8);
  const mats = [mstd(0xb91c1c, { roughness: 0.4 }), mstd(0xf97316, { roughness: 0.45 }), mstd(0xdc2626, { roughness: 0.4 })];
  for (let i = 0; i < 26; i++) {
    const f = new THREE.Mesh(fruitG, mats[i % 3]);
    const a = (i / 26) * Math.PI * 6, r = 0.08 + (i % 7) * 0.035;
    f.position.set(Math.cos(a) * r * 1.4, 0.64 + (1 - r / 0.3) * 0.12, Math.sin(a) * r);
    g.add(f);
  }
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 6), dark); pole.position.set(0.35, 0.95, 0); g.add(pole);
  const umb = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.25, 8, 1, true), mstd(0xfacc15, { roughness: 0.6, side: THREE.DoubleSide })); umb.position.set(0.35, 1.45, 0); g.add(umb);
  g.traverse((m) => { m.castShadow = true; });
  return g;
}

// ───── «ماشین عروس»: flowers on the hood, ribbons to the mirrors, a tulle bow ─────
/**
 * Wedding dressing for a sedan of length L facing −z: a heart of roses on the hood, satin ribbons
 * from the hood to the mirrors and a white bow on the roof, the way Tehran wedding cars are done.
 */
export function weddingDecor(front: number, hood = 0.6, roof = 0.82): THREE.Group {
  const L = -front * 2;
  const g = new THREE.Group();
  const petals = [0xe11d48, 0xffffff, 0xf9a8d4, 0xffffff, 0xbe123c];
  const rose = new THREE.IcosahedronGeometry(0.07, 1);
  const leaf = new THREE.MeshStandardMaterial({ color: 0x2f7d32, roughness: 0.7 });
  const flowers = new THREE.InstancedMesh(rose, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 }), 64);
  const z0 = -L / 2 + 0.42;
  let n = 0;
  const m = new THREE.Matrix4(), col = new THREE.Color();
  // A heart outline, then a fill, flat on the hood.
  for (let k = 0; k < 64; k++) {
    const t = (k / 40) * Math.PI * 2;
    let x: number, y: number;
    if (k < 40) { x = 16 * Math.sin(t) ** 3; y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t); }
    else { const a = (k - 40) * 2.4, r = Math.sqrt((k - 40) / 24) * 9; x = Math.cos(a) * r; y = Math.sin(a) * r + 1; }
    const s = 0.02;
    m.makeScale(1, 0.7, 1).setPosition(x * s, hood + 0.03, z0 - y * s);
    flowers.setMatrixAt(n, m);
    flowers.setColorAt(n, col.setHex(k < 40 ? (k % 3 ? 0xe11d48 : 0xffffff) : petals[k % petals.length]));
    n++;
  }
  flowers.castShadow = true;
  g.add(flowers);
  // Greenery under the heart.
  const bed = new THREE.Mesh(new THREE.CircleGeometry(0.3, 16), leaf);
  bed.rotation.x = -Math.PI / 2; bed.scale.set(1.05, 0.9, 1); bed.position.set(0, hood + 0.012, z0 - 0.02);
  g.add(bed);
  // Ribbons: from the heart to each front corner and back to the mirrors, gently sagging.
  const ribbon = new THREE.MeshStandardMaterial({ color: 0xfce7f3, roughness: 0.35, metalness: 0.1, side: THREE.DoubleSide });
  for (const sx of [-1, 1]) {
    const pts = [new THREE.Vector3(0, hood + 0.05, z0 - 0.05), new THREE.Vector3(sx * 0.22, hood + 0.03, z0 - 0.02), new THREE.Vector3(sx * 0.4, hood + 0.06, -L / 2 + 0.85)];
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.022, 5), ribbon);
    g.add(tube);
    const front = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([pts[0], new THREE.Vector3(sx * 0.18, hood + 0.02, -L / 2 + 0.16), new THREE.Vector3(sx * 0.36, hood - 0.04, -L / 2 + 0.08)]), 10, 0.02, 5), ribbon);
    g.add(front);
  }
  // A tulle bow on the roof.
  const tulle = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, transparent: true, opacity: 0.92 });
  const bow = new THREE.Group();
  for (const sx of [-1, 1]) {
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.05, 6, 12), tulle);
    loop.position.set(sx * 0.13, 0.06, 0); loop.rotation.y = sx * 0.4; loop.scale.set(1, 0.75, 0.6);
    bow.add(loop);
  }
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.5 }));
  knot.position.y = 0.035; bow.add(knot);
  bow.position.set(0, roof + 0.01, 0.05);
  g.add(bow);
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  return g;
}

/** A pink heart badge: how many more cars may leave (this one included) before the wedding car is late. */
export function weddingBadge(left: number): THREE.Sprite {
  const s = badge(() => {});
  setWeddingBadge(s, left);
  return s;
}
export function setWeddingBadge(s: THREE.Sprite, left: number) {
  const tex = s.material.map as THREE.CanvasTexture;
  const g = (tex.image as HTMLCanvasElement).getContext('2d')!;
  g.clearRect(0, 0, 256, 148);
  const late = left <= 0, urgent = left === 1;
  g.fillStyle = late ? '#9ca3af' : urgent ? '#e11d48' : '#fbcfe8'; g.strokeStyle = late ? '#374151' : '#9d174d'; g.lineWidth = 8;
  g.beginPath(); g.roundRect(14, 14, 228, 120, 40); g.fill(); g.stroke();
  // A heart, then the count.
  g.save(); g.translate(76, 78); g.scale(2.3, 2.3); g.fillStyle = late ? '#4b5563' : urgent ? '#fff' : '#e11d48';
  g.beginPath(); g.moveTo(0, 12); g.bezierCurveTo(-22, -2, -12, -20, 0, -9); g.bezierCurveTo(12, -20, 22, -2, 0, 12); g.fill(); g.restore();
  g.fillStyle = late ? '#1f2937' : urgent ? '#fff' : '#831843'; g.font = '900 78px Vazirmatn'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(late ? '×' : fa(left), 170, 82);
  tex.needsUpdate = true;
}

/** Pair colors for tunnel mouths, so you can tell which mouth leads where. */
export const TUNNEL_COLORS = [0xf59e0b, 0x22d3ee, 0xa855f7, 0x84cc16];

/**
 * «تونل نیایش» mouth: a tiled portal ramp sinking into darkness, ringed in its pair color, with a
 * little sign. Cars driving in from any side drop into it and come up out of its twin.
 */
export function tunnelMouth(color: number, label: string): THREE.Group {
  const g = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.6, 0.12, 28, 1, true), mstd(0x9ca3af, { roughness: 0.6 }));
  rim.position.y = 0.06; g.add(rim);
  const lip = new THREE.Mesh(new THREE.RingGeometry(0.44, 0.56, 28), mstd(0xb8bec6, { roughness: 0.6, side: THREE.DoubleSide }));
  lip.rotation.x = -Math.PI / 2; lip.position.y = 0.121; g.add(lip);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 8, 32), mstd(color, { emissive: color, emissiveIntensity: 0.9, roughness: 0.4 }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.125; g.add(ring);
  // The dark throat, with a hint of tunnel lights going down.
  const throat = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.3, 0.5, 24, 1, true), mstd(0x0b0f17, { side: THREE.BackSide, roughness: 1 }));
  throat.position.y = -0.12; g.add(throat);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(0.46, 24), new THREE.MeshBasicMaterial({ color: 0x05070c }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.118; g.add(floor);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2, l = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), mstd(0xffd27a, { emissive: 0xffb347, emissiveIntensity: 3 }));
    l.position.set(Math.cos(a) * 0.34, 0.1, Math.sin(a) * 0.34); g.add(l);
  }
  const sign = badge((c) => {
    c.fillStyle = '#1e3a8a'; c.beginPath(); c.roundRect(10, 30, 236, 88, 16); c.fill();
    c.strokeStyle = `#${color.toString(16).padStart(6, '0')}`; c.lineWidth = 10; c.stroke();
    c.fillStyle = '#fff'; c.font = '900 50px Vazirmatn'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.direction = 'rtl'; c.fillText(label, 128, 76);
  }, 0.62, 0.36);
  sign.position.y = 0.75; g.add(sign);
  g.traverse((m) => { if ((m as THREE.Mesh).isMesh) m.castShadow = false; });
  return g;
}
