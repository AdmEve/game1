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
// Shared between levels: the level cleanup must not free them.
smokeMat.userData.keep = true; coinMat.userData.keep = true;

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
const confettiGeo = new THREE.PlaneGeometry(0.16, 0.26);
const confettiMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
confettiMat.userData.keep = true;
/** A confetti burst: every piece is one instance of a single mesh, so it costs one draw call. */
export function confetti(parent: THREE.Object3D, at: THREE.Vector3, n = 140) {
  const mesh = new THREE.InstancedMesh(confettiGeo, confettiMat, n);
  mesh.frustumCulled = false;
  const col = new THREE.Color();
  const parts = Array.from({ length: n }, (_, i) => {
    mesh.setColorAt(i, col.setHex(CONFETTI[i % CONFETTI.length]));
    return { vx: (Math.random() - 0.5) * 14, vz: (Math.random() - 0.5) * 12, vy: 4 + Math.random() * 6, sx: Math.random() * 8, sy: Math.random() * 8, sz: Math.random() * 8, life: 2 + Math.random() };
  });
  parent.add(mesh);
  const o = new THREE.Object3D(), longest = Math.max(...parts.map((p) => p.life));
  void tween(longest, (k) => {
    const T = k * longest;
    parts.forEach((p, i) => {
      const t = Math.min(T, p.life);
      o.position.set(at.x + p.vx * t * 0.6, at.y + p.vy * t - 4.9 * t * t * 0.55, at.z + p.vz * t * 0.6);
      o.rotation.set(p.sx * t, p.sy * t, p.sz * t);
      // Pieces past their life shrink away.
      o.scale.setScalar(T < p.life ? 1 : 0);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, ease.linear).then(() => { parent.remove(mesh); mesh.dispose(); });
}
