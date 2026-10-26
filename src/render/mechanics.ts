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
  const bh = Math.max(0.8, top * 0.82);
  const body = new THREE.Mesh(new RoundedBoxGeometry(1.12, bh, L + 0.1, 4, 0.3), fabricMat());
  body.position.y = bh / 2 + 0.02; body.castShadow = true;
  // The cover drapes over the cabin: a second softer hump.
  const hump = new THREE.Mesh(new RoundedBoxGeometry(0.98, 0.42, L * 0.7, 4, 0.2), fabricMat());
  hump.position.set(0, Math.max(0.78, top - 0.12), L * 0.02); hump.castShadow = true;
  const strap = new THREE.Mesh(new THREE.BoxGeometry(1.1, bh + 0.04, 0.07), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 }));
  strap.position.set(0, bh / 2 + 0.02, -L * 0.2);
  g.userData.top = Math.max(0.78, top - 0.12) + 0.21;
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
