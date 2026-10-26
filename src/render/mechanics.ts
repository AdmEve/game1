/** 3D pieces for the special mechanics: car covers, broken-car props, plate badges, VIP markers. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const fa = (n: number | string) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// ───── «چادر ماشین»: a fitted grey car cover with folds and a strap ─────
let fabric: THREE.MeshStandardMaterial | null = null;
function fabricMat() {
  if (fabric) return fabric;
  const tex = canvasTex(256, 256, (g) => {
    g.fillStyle = '#8f969e'; g.fillRect(0, 0, 256, 256);
    // Soft folds: long light and dark streaks.
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * 256, w = 6 + Math.random() * 18;
      const gr = g.createLinearGradient(x, 0, x + w, 0);
      const dark = Math.random() < 0.5;
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, dark ? 'rgba(40,45,52,.22)' : 'rgba(255,255,255,.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x, 0, w, 256);
    }
    for (let i = 0; i < 3000; i++) { g.globalAlpha = 0.08; g.fillStyle = Math.random() < 0.5 ? '#000' : '#fff'; g.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5); }
  });
  fabric = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, color: 0xd5d9de });
  return fabric;
}

/** A cover sized for a vehicle of length L (along −z when the vehicle faces up). */
export function carCover(L: number, top = 0.95): THREE.Group {
  const g = new THREE.Group();
  // Tall enough to hide the model underneath (`top` = its roof height).
  const bh = Math.max(0.8, top + 0.02);
  const body = new THREE.Mesh(new RoundedBoxGeometry(1.12, bh, L + 0.1, 4, 0.3), fabricMat());
  body.position.y = bh / 2 + 0.02; body.castShadow = true;
  // The cover drapes over the cabin: a second softer hump.
  const hump = new THREE.Mesh(new RoundedBoxGeometry(0.98, 0.42, L * 0.7, 4, 0.2), fabricMat());
  hump.position.set(0, bh - 0.06, L * 0.02); hump.castShadow = true;
  const strap = new THREE.Mesh(new THREE.BoxGeometry(1.1, bh + 0.04, 0.07), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 }));
  strap.position.set(0, bh / 2 + 0.02, -L * 0.2);
  g.userData.top = bh - 0.06 + 0.21;
  g.add(body, hump, strap);
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
    symbolCache.set(color, new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  }
  const s = new THREE.Sprite(symbolCache.get(color)!);
  s.renderOrder = 11;
  s.scale.setScalar(size);
  return s;
}
