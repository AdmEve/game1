/** Particles: tire smoke puffs, coin bursts and confetti. */
import * as THREE from 'three';
import { ease, tween } from './anim';

function dot(color: string, glow = false) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, color); gr.addColorStop(glow ? 0.35 : 0.55, color); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const smokeMat = new THREE.SpriteMaterial({ map: dot('rgba(225,228,232,.9)'), transparent: true, depthWrite: false });
const coinTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const gr = g.createLinearGradient(0, 0, 64, 64); gr.addColorStop(0, '#fff3b0'); gr.addColorStop(0.5, '#f5b400'); gr.addColorStop(1, '#b97800');
  g.fillStyle = gr; g.beginPath(); g.arc(32, 32, 28, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#8a5a00'; g.lineWidth = 3; g.stroke();
  g.fillStyle = '#8a5a00'; g.font = '900 30px Vazirmatn, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$', 32, 34);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const coinMat = new THREE.SpriteMaterial({ map: coinTex, transparent: true, depthTest: false });

export function puff(parent: THREE.Object3D, at: THREE.Vector3, size = 0.6) {
  const s = new THREE.Sprite(smokeMat.clone());
  s.position.copy(at).add(new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.15, (Math.random() - 0.5) * 0.4));
  parent.add(s);
  const y0 = s.position.y;
  void tween(0.7, (k) => {
    s.scale.setScalar(size * (0.4 + k));
    s.position.y = y0 + k * 0.5;
    s.material.opacity = 0.8 * (1 - k);
  }, ease.out).then(() => { parent.remove(s); s.material.dispose(); });
}

export function coinBurst(parent: THREE.Object3D, at: THREE.Vector3, n = 6) {
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(coinMat); s.renderOrder = 20;
    s.scale.setScalar(0.38);
    parent.add(s);
    const a = (i / n) * Math.PI * 2, r = 0.5 + Math.random() * 0.4;
    void tween(0.75 + Math.random() * 0.2, (k) => {
      s.position.set(at.x + Math.cos(a) * r * k, at.y + Math.sin(k * Math.PI) * 1.4 + k * 0.6, at.z + Math.sin(a) * r * k);
      s.material.rotation = k * 6;
      s.scale.setScalar(0.38 * (1 - k * 0.5));
    }, ease.out).then(() => parent.remove(s));
  }
}

const CONFETTI = [0xff4d4f, 0xffc31a, 0x4b8bff, 0x2fc26b, 0xa66bff, 0xff8a3d, 0xffffff];
export function confetti(parent: THREE.Object3D, at: THREE.Vector3, n = 140) {
  const geo = new THREE.PlaneGeometry(0.16, 0.26);
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: CONFETTI[i % CONFETTI.length], side: THREE.DoubleSide }));
    parent.add(m);
    const vx = (Math.random() - 0.5) * 14, vz = (Math.random() - 0.5) * 12, vy = 4 + Math.random() * 6, spin = new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8);
    const life = 2 + Math.random();
    void tween(life, (k) => {
      const t = k * life;
      m.position.set(at.x + vx * t * 0.6, at.y + vy * t - 4.9 * t * t * 0.55, at.z + vz * t * 0.6);
      m.rotation.set(spin.x * t, spin.y * t, spin.z * t);
    }, ease.linear).then(() => { parent.remove(m); (m.material as THREE.Material).dispose(); });
  }
}
