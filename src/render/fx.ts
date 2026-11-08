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

/**
 * Tire smoke: a fixed pool of sprites, each with its own (never disposed) material, so a puff never creates or
 * frees anything during play (a freed material can take its compiled shader with it, and the next puff would
 * stall a frame recompiling it).
 */
const PUFFS = 40;
const puffPool: { s: THREE.Sprite; busy: boolean; t: number }[] = [];
for (let i = 0; i < PUFFS; i++) {
  const m = smokeMat.clone(); m.userData.keep = true;
  const s = new THREE.Sprite(m); s.visible = false;
  puffPool.push({ s, busy: false, t: 0 });
}
let puffClock = 0;
export function puff(parent: THREE.Object3D, at: THREE.Vector3, size = 0.6) {
  // A free sprite, or the oldest one when every sprite is in the air.
  let slot = puffPool.find((p) => !p.busy);
  if (!slot) slot = puffPool.reduce((a, b) => (a.t < b.t ? a : b));
  const p = slot, s = p.s, token = ++puffClock;
  p.busy = true; p.t = token;
  s.removeFromParent();
  s.visible = true;
  s.position.set(at.x + (Math.random() - 0.5) * 0.4, at.y + 0.15, at.z + (Math.random() - 0.5) * 0.4);
  parent.add(s);
  const y0 = s.position.y;
  void tween(0.7, (k) => {
    if (p.t !== token) return; // taken over by a newer puff
    s.scale.setScalar(size * (0.4 + k));
    s.position.y = y0 + k * 0.5;
    s.material.opacity = 0.8 * (1 - k);
  }, ease.out).then(() => { if (p.t !== token) return; s.visible = false; s.removeFromParent(); p.busy = false; });
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

/**
 * Tap ring: a soft outline on the ground around the car under the finger, the instant it lands (before the
 * car has moved), so every tap is acknowledged. One mesh, reused; a new tap restarts it.
 */
const ringMat = (() => {
  const W = 128, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  g.strokeStyle = '#fff'; g.lineWidth = 10; g.shadowColor = '#fff'; g.shadowBlur = 12;
  g.beginPath(); g.roundRect(14, 14, W - 28, H - 28, 30); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, color: 0xffe7a8, opacity: 0 });
  m.userData.keep = true; return m;
})();
const ringGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
ringGeo.userData.keep = true;
const ring = new THREE.Mesh(ringGeo, ringMat);
ring.renderOrder = 1; ring.visible = false; ring.userData.noPick = true;
let ringToken = 0;
/** `w` and `l` are the car's footprint (width across, length along its heading `rotY`). */
export function tapRing(parent: THREE.Object3D, at: THREE.Vector3, rotY: number, w: number, l: number) {
  const token = ++ringToken;
  ring.removeFromParent(); parent.add(ring);
  ring.position.set(at.x, at.y + 0.03, at.z); ring.rotation.y = rotY; ring.visible = true;
  // The outline sits just clear of the body and widens a little as it fades.
  void tween(0.5, (k) => {
    if (token !== ringToken) return;
    const grow = 0.55 + 0.3 * ease.out(k);
    ring.scale.set(w + grow * 2, 1, l + grow * 2);
    ringMat.opacity = 0.95 * Math.min(1, k * 8) * (1 - k) ** 1.5;
  }, ease.linear).then(() => { if (token === ringToken) { ring.visible = false; ring.removeFromParent(); } });
}

/**
 * One object per effect material, for compiling their shaders at load time with the real (kept) materials, so
 * the first puff, coin or confetti burst of a level never stalls a frame.
 */
export function fxWarmObjects(): THREE.Object3D[] {
  const coin = new THREE.Sprite(coinMat);
  const conf = new THREE.InstancedMesh(confettiGeo, confettiMat, 1);
  conf.setColorAt(0, new THREE.Color(1, 1, 1));
  const r = new THREE.Mesh(ringGeo, ringMat);
  return [puffPool[0].s, coin, conf, r];
}
