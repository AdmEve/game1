/**
 * Weather for each map, built to read like footage rather than a cartoon:
 *  - rain: thousands of fine, motion-blurred streaks (one batched mesh, two depth layers), ripples on the tarmac,
 *    puddles on the wet ground (see `wetten`), low fog banks;
 *  - snow: soft flakes in three sizes that tumble and drift, snow settling on car roofs (see `setSnow` in cars.js);
 *  - storm: rain plus lightning (the game flashes the light through `flash`);
 *  - mist: drifting ground fog and fireflies; dust: a warm haze of motes; leaves/petals: tumbling textured leaves.
 * One `Weather` lives in the session's group; the game calls `update` every frame.
 */
import * as THREE from 'three';
import { fbm } from './surfaces';
import { profile } from './profile';
/** Phones get fewer particles. */
const K = (n: number) => Math.round(n * (profile.lite ? 0.45 : 1));

export type WeatherKind = 'clear' | 'leaves' | 'rain' | 'storm' | 'snow' | 'dust' | 'petals' | 'mist';

/** What the weather does to the scene light, so the game can dim, tint and thicken the fog. */
export interface WeatherMood {
  /** Multiplies the sun and hemisphere light (1 = untouched). */
  light: number;
  /** Fog distances: the scene's fog is pulled toward these. */
  fogNear: number; fogFar: number;
  /** A tint mixed into the fog color (0xrrggbb) and how much of it. */
  tint: number; tintAmount: number;
  /** Overcast sky for reflections (null = keep the chapter's sky). */
  overcast?: { turbidity: number; rayleigh: number } | null;
  /** Color grade on top of the chapter's. */
  grade?: { saturation?: number; contrast?: number; shadows?: [number, number, number]; highlights?: [number, number, number]; bloom?: number };
}

export const MOODS: Record<WeatherKind, WeatherMood> = {
  clear: { light: 1, fogNear: 40, fogFar: 95, tint: 0xffffff, tintAmount: 0 },
  leaves: { light: 1, fogNear: 40, fogFar: 95, tint: 0xffd9a0, tintAmount: 0.08 },
  rain: { light: 0.75, fogNear: 36, fogFar: 88, tint: 0x7a8696, tintAmount: 0.55, overcast: { turbidity: 16, rayleigh: 0.25 }, grade: { saturation: 0.86, contrast: 1.08, shadows: [0, 0.012, 0.03], highlights: [-0.005, 0.005, 0.02] } },
  storm: { light: 0.62, fogNear: 30, fogFar: 82, tint: 0x1b2433, tintAmount: 0.5, overcast: { turbidity: 18, rayleigh: 0.2 }, grade: { saturation: 0.82, contrast: 1.1, shadows: [0, 0.01, 0.04] } },
  snow: { light: 0.8, fogNear: 32, fogFar: 88, tint: 0xe4ebf2, tintAmount: 0.5, overcast: { turbidity: 20, rayleigh: 0.15 }, grade: { saturation: 0.9, contrast: 1.02, shadows: [0, 0.008, 0.03], highlights: [0, 0.006, 0.02] } },
  dust: { light: 0.95, fogNear: 38, fogFar: 92, tint: 0xd9b27a, tintAmount: 0.3, grade: { saturation: 0.85, highlights: [0.05, 0.03, 0.0] } },
  petals: { light: 1, fogNear: 40, fogFar: 95, tint: 0xfff0f5, tintAmount: 0.1 },
  mist: { light: 0.85, fogNear: 26, fogFar: 80, tint: 0x6a6898, tintAmount: 0.45, grade: { saturation: 0.9 } },
};

const rnd = (i: number, k: number) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };

let dotTex: THREE.Texture | null = null;
function dot(): THREE.Texture {
  if (dotTex) return dotTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d')!, gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return (dotTex = new THREE.CanvasTexture(c));
}
let fogTex: THREE.Texture | null = null;
/** Soft, tileable billows for fog banks. */
function fogBillows(): THREE.Texture {
  if (fogTex) return fogTex;
  const S = 256, n = fbm(S, 4, 4, 401), c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d')!, img = g.createImageData(S, S);
  for (let i = 0; i < n.length; i++) { const a = Math.max(0, Math.min(1, (n[i] - 0.38) * 2.4)); img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = 255; img.data[i * 4 + 3] = a * a * 255; }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return (fogTex = t);
}
let leafTex: THREE.Texture | null = null;
function leafSprite(): THREE.Texture {
  if (leafTex) return leafTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff'; g.beginPath(); g.moveTo(4, 32); g.quadraticCurveTo(32, 2, 60, 32); g.quadraticCurveTo(32, 62, 4, 32); g.fill();
  g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 2; g.beginPath(); g.moveTo(6, 32); g.lineTo(58, 32); g.stroke();
  for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(14 + k * 11, 32); g.lineTo(20 + k * 11, 22); g.moveTo(14 + k * 11, 32); g.lineTo(20 + k * 11, 42); g.stroke(); }
  return (leafTex = new THREE.CanvasTexture(c));
}

export class Weather {
  readonly object = new THREE.Group();
  private t = 0;
  private box: { x0: number; x1: number; z0: number; z1: number; y1: number };
  // Rain
  private rain: THREE.Mesh | null = null;
  private drops!: Float32Array; private dropSpeed!: Float32Array;
  private ripples: THREE.Mesh | null = null;
  private rip: { x: number; z: number; age: number; life: number }[] = [];
  private rippleBox = { x0: 0, x1: 0, z0: 0, z1: 0 };
  // Snow, dust, fireflies
  private flakes: { pts: THREE.Points; pos: Float32Array; seed: Float32Array; fall: number; sway: number; wind: number }[] = [];
  private fireflies: THREE.Points | null = null;
  // Fog banks and tumbling leaves
  private banks: THREE.Mesh[] = [];
  private leaves: THREE.InstancedMesh | null = null;
  private leafState: { p: THREE.Vector3; r: THREE.Euler; w: THREE.Vector3; ph: number }[] = [];
  /** Seconds until the next lightning strike (storm only). */
  private nextBolt = 5 + Math.random() * 6;
  private boltLeft = 0;
  /** 0..1 flash strength, read by the game to flash the light. */
  flash = 0;
  /** Called when a bolt strikes (for thunder). */
  onThunder: (() => void) | null = null;

  constructor(readonly kind: WeatherKind, lotW: number, lotH: number) {
    this.box = { x0: -lotW / 2 - 10, x1: lotW / 2 + 10, z0: -12, z1: lotH + 10, y1: 16 };
    this.rippleBox = { x0: -lotW / 2 - 3, x1: lotW / 2 + 3, z0: -4, z1: lotH + 3 };
    if (kind === 'rain' || kind === 'storm') {
      this.makeRain(K(kind === 'storm' ? 2600 : 2000));
      this.makeRipples(K(kind === 'storm' ? 120 : 90));
      this.makeBanks(0x9aa6b4, 0.32, 3);
    } else if (kind === 'snow') {
      this.makeFlakes(K(1400), 0.1, 0.95, 0.75, 0.45, 0.6);
      this.makeFlakes(K(500), 0.2, 0.9, 1.0, 0.6, 0.8);
      this.makeFlakes(70, 0.42, 0.55, 1.3, 0.8, 1.0);
      this.makeBanks(0xe8eef4, 0.22, 2);
    } else if (kind === 'dust') {
      this.makeFlakes(K(260), 0.07, 0.55, -0.05, 0.3, 1.4, 0xf3d6a0);
      this.makeBanks(0xd9b27a, 0.28, 2);
    } else if (kind === 'mist') {
      this.makeBanks(0xa8a6d8, 0.5, 4);
      this.makeFireflies();
    } else if (kind === 'leaves') this.makeLeaves(K(120), [0xc8741d, 0xa9521a, 0xd8a02b, 0x8a3d16], 0.16);
    else if (kind === 'petals') this.makeLeaves(K(150), [0xffc6d9, 0xffffff, 0xf7a8c6], 0.1);
    else if (kind === 'clear') this.makeFlakes(50, 0.05, 0.6, -0.02, 0.4, 0.3, 0xfff4cc, true);
    this.update(0.0001); // lay everything out so the very first frame already shows the weather
  }

  // ───── Rain ─────
  /** Each drop is a thin streak (a quad from head to tail with a fading tail); far drops are fainter. */
  private makeRain(n: number) {
    const { x0, x1, z0, z1, y1 } = this.box;
    this.drops = new Float32Array(n * 3); this.dropSpeed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      this.drops.set([x0 + rnd(i, 1) * (x1 - x0), rnd(i, 2) * y1, z0 + rnd(i, 3) * (z1 - z0)], i * 3);
      this.dropSpeed[i] = 0.8 + rnd(i, 4) * 0.4;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 12), 3));
    const col = new Float32Array(n * 16), idx: number[] = [];
    for (let i = 0; i < n; i++) {
      const a = 0.14 + rnd(i, 6) * 0.2;
      col.set([0.78, 0.84, 0.92, a, 0.78, 0.84, 0.92, a, 0.78, 0.84, 0.92, 0, 0.78, 0.84, 0.92, 0], i * 16);
      idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 1, i * 4 + 3, i * 4 + 2);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 4)); geo.setIndex(idx);
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, fog: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
    this.rain = new THREE.Mesh(geo, mat);
    this.rain.frustumCulled = false; this.rain.renderOrder = 3;
    this.object.add(this.rain);
  }
  private makeRipples(n: number) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d')!; g.strokeStyle = '#fff';
    g.lineWidth = 2.2; g.beginPath(); g.arc(32, 32, 27, 0, Math.PI * 2); g.stroke();
    g.globalAlpha = 0.5; g.lineWidth = 1.5; g.beginPath(); g.arc(32, 32, 17, 0, Math.PI * 2); g.stroke();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 12), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 16).fill(1), 4));
    const uv = new Float32Array(n * 8), idx: number[] = [];
    for (let i = 0; i < n; i++) { uv.set([0, 0, 1, 0, 1, 1, 0, 1], i * 8); idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3); this.rip.push({ x: 0, z: 0, age: 99, life: 1 }); }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx);
    const mat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), vertexColors: true, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending });
    this.ripples = new THREE.Mesh(geo, mat); this.ripples.frustumCulled = false; this.ripples.renderOrder = 2;
    this.object.add(this.ripples);
  }
  private updateRain(dt: number) {
    const storm = this.kind === 'storm', { x0, x1, z0, z1, y1 } = this.box;
    const gust = 1 + 0.6 * Math.sin(this.t * 0.45) * Math.sin(this.t * 0.17 + 1);
    const speed = storm ? 26 : 20, slant = (storm ? -7 : -3.5) * gust, len = storm ? 0.9 : 0.75, hw = 0.011;
    const p = this.drops, n = this.dropSpeed.length, q = this.rain!.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < n; i++) {
      const k = i * 3, s = this.dropSpeed[i];
      let x = p[k] + slant * dt * s, y = p[k + 1] - speed * dt * s, z = p[k + 2];
      if (y < 0) { y += y1; x = x0 + Math.random() * (x1 - x0); z = z0 + Math.random() * (z1 - z0); }
      if (x < x0) x += x1 - x0;
      p[k] = x; p[k + 1] = y; p[k + 2] = z;
      // The tail trails behind along the fall direction (motion blur).
      const tl = len * s, tx = x - (slant / speed) * tl, ty = y + tl;
      q.setXYZ(i * 4, x - hw, y, z); q.setXYZ(i * 4 + 1, x + hw, y, z); q.setXYZ(i * 4 + 2, tx - hw, ty, z); q.setXYZ(i * 4 + 3, tx + hw, ty, z);
    }
    q.needsUpdate = true;
    if (this.ripples) {
      const m = this.ripples, pos = m.geometry.getAttribute('position') as THREE.BufferAttribute, col = m.geometry.getAttribute('color') as THREE.BufferAttribute, b = this.rippleBox;
      for (let i = 0; i < this.rip.length; i++) {
        const r = this.rip[i]; r.age += dt;
        if (r.age > r.life) { r.x = b.x0 + Math.random() * (b.x1 - b.x0); r.z = b.z0 + Math.random() * (b.z1 - b.z0); r.age = 0; r.life = 0.35 + Math.random() * 0.3; }
        const kk = r.age / r.life, sz = 0.03 + kk * 0.2, a = (1 - kk) * 0.32;
        pos.setXYZ(i * 4, r.x - sz, 0.17, r.z - sz); pos.setXYZ(i * 4 + 1, r.x + sz, 0.17, r.z - sz); pos.setXYZ(i * 4 + 2, r.x + sz, 0.17, r.z + sz); pos.setXYZ(i * 4 + 3, r.x - sz, 0.17, r.z + sz);
        for (let v = 0; v < 4; v++) col.setXYZW(i * 4 + v, 0.8, 0.86, 0.95, a);
      }
      pos.needsUpdate = true; col.needsUpdate = true;
    }
    if (storm) this.lightning(dt);
  }

  // ───── Flakes / motes ─────
  private makeFlakes(n: number, size: number, opacity: number, fall: number, sway: number, wind: number, color = 0xffffff, additive = false) {
    const { x0, x1, z0, z1, y1 } = this.box;
    const pos = new Float32Array(n * 3), seed = new Float32Array(n);
    for (let i = 0; i < n; i++) { pos.set([x0 + rnd(i + n, 1) * (x1 - x0), rnd(i + n, 2) * y1, z0 + rnd(i + n, 3) * (z1 - z0)], i * 3); seed[i] = rnd(i + n, 4) * 6.28; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ size, map: dot(), color, transparent: true, opacity, depthWrite: false, sizeAttenuation: true, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, fog: true });
    const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 3;
    this.object.add(pts);
    this.flakes.push({ pts, pos, seed, fall, sway, wind });
  }
  private updateFlakes(dt: number) {
    const { x0, x1, z0, z1, y1 } = this.box, t = this.t;
    const gust = 1 + 0.5 * Math.sin(t * 0.3);
    for (const f of this.flakes) {
      const p = f.pos;
      for (let i = 0; i < f.seed.length; i++) {
        const k = i * 3, ph = f.seed[i];
        p[k] += (f.wind * gust + Math.sin(t * 0.8 + ph) * f.sway) * dt;
        p[k + 1] -= f.fall * dt * (0.75 + 0.5 * Math.abs(Math.sin(ph)));
        p[k + 2] += Math.cos(t * 0.6 + ph * 1.3) * f.sway * 0.7 * dt;
        if (p[k] > x1) p[k] = x0; else if (p[k] < x0) p[k] = x1;
        if (p[k + 2] > z1) p[k + 2] = z0; else if (p[k + 2] < z0) p[k + 2] = z1;
        if (p[k + 1] < 0) p[k + 1] += y1; else if (p[k + 1] > y1) p[k + 1] = 0.2;
      }
      (f.pts.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    }
  }

  // ───── Fog banks: big horizontal sheets of soft billows that drift ─────
  private makeBanks(color: number, opacity: number, layers: number) {
    const { x0, x1, z0, z1 } = this.box;
    // A faint veil over everything, thicker banks only beyond the street so the lot stays readable.
    for (let l = profile.lite ? 1 : 0; l < (profile.lite ? Math.min(2, layers) : layers); l++) {
      const tex = fogBillows().clone(); tex.needsUpdate = true; tex.repeat.set(2.2 + l * 0.6, 2 + l * 0.5);
      const full = l === 0, w = x1 - x0 + 40, d = full ? z1 - z0 + 30 : 34;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, opacity: full ? opacity * 0.2 : opacity * (1 - l * 0.12), depthWrite: false, fog: true }));
      m.position.set((x0 + x1) / 2, full ? 1.6 : 0.6 + l * 0.8, full ? (z0 + z1) / 2 - 8 : z0 - 15 + l * 2); m.renderOrder = 4 + l; m.frustumCulled = false;
      m.userData.drift = [0.004 + l * 0.003, 0.002 - l * 0.001];
      this.banks.push(m); this.object.add(m);
    }
  }

  // ───── Leaves and petals: textured quads that tumble in 3D ─────
  private makeLeaves(n: number, colors: number[], size: number) {
    const geo = new THREE.PlaneGeometry(size * 1.6, size);
    const mat = new THREE.MeshStandardMaterial({ map: leafSprite(), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.7 });
    const im = new THREE.InstancedMesh(geo, mat, n); im.frustumCulled = false;
    const { x0, x1, z0, z1, y1 } = this.box, c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      this.leafState.push({ p: new THREE.Vector3(x0 + rnd(i, 1) * (x1 - x0), rnd(i, 2) * y1 * 0.6, z0 + rnd(i, 3) * (z1 - z0)), r: new THREE.Euler(rnd(i, 4) * 6, rnd(i, 5) * 6, rnd(i, 6) * 6), w: new THREE.Vector3(1 + rnd(i, 7) * 2, 0.6 + rnd(i, 8), 1 + rnd(i, 9) * 2), ph: rnd(i, 10) * 6.28 });
      im.setColorAt(i, c.setHex(colors[i % colors.length]).offsetHSL(0, 0, (rnd(i, 11) - 0.5) * 0.1));
    }
    this.leaves = im; this.object.add(im);
  }
  private updateLeaves(dt: number) {
    const im = this.leaves!, m = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), { x0, x1, z0, z1, y1 } = this.box, t = this.t;
    for (let i = 0; i < this.leafState.length; i++) {
      const s = this.leafState[i];
      s.p.x += (0.8 + Math.sin(t * 0.7 + s.ph) * 0.9) * dt; s.p.y -= (0.5 + Math.sin(t * 2 + s.ph) * 0.25) * dt; s.p.z += Math.cos(t * 0.5 + s.ph) * 0.5 * dt;
      s.r.x += s.w.x * dt; s.r.y += s.w.y * dt; s.r.z += s.w.z * dt * 0.5;
      if (s.p.y < 0.15) { s.p.y = y1 * 0.6; s.p.x = x0 + Math.random() * (x1 - x0); }
      if (s.p.x > x1) s.p.x = x0; if (s.p.z > z1) s.p.z = z0; if (s.p.z < z0) s.p.z = z1;
      im.setMatrixAt(i, m.compose(s.p, q.setFromEuler(s.r), one));
    }
    im.instanceMatrix.needsUpdate = true;
  }

  /** Warm little lights drifting over the lot at dusk. */
  private makeFireflies() {
    const n = 36, p = new Float32Array(n * 3), { x0, x1, z0, z1 } = this.box;
    for (let i = 0; i < n; i++) { p[i * 3] = x0 + 14 + rnd(i, 7) * (x1 - x0 - 28); p[i * 3 + 1] = 0.6 + rnd(i, 8) * 2.6; p[i * 3 + 2] = z0 + 8 + rnd(i, 9) * (z1 - z0 - 16); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const mat = new THREE.PointsMaterial({ size: 0.2, map: dot(), color: new THREE.Color(3, 2.6, 1.2), transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    this.fireflies = new THREE.Points(geo, mat);
    this.fireflies.frustumCulled = false;
    this.object.add(this.fireflies);
  }

  update(dt: number) {
    this.t += dt;
    if (this.rain) this.updateRain(dt);
    if (this.flakes.length) this.updateFlakes(dt);
    if (this.leaves) this.updateLeaves(dt);
    for (const b of this.banks) { const tex = (b.material as THREE.MeshBasicMaterial).map!; const [u, v] = b.userData.drift as [number, number]; tex.offset.x += u * dt * 10; tex.offset.y += v * dt * 10; }
    if (this.fireflies) {
      const f = this.fireflies.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < f.count; i++) {
        f.setX(i, f.getX(i) + Math.sin(this.t * 0.6 + i) * 0.5 * dt);
        f.setY(i, 0.9 + (i % 5) * 0.5 + Math.sin(this.t * 0.9 + i * 1.7) * 0.4);
        f.setZ(i, f.getZ(i) + Math.cos(this.t * 0.5 + i * 0.9) * 0.5 * dt);
      }
      f.needsUpdate = true;
      (this.fireflies.material as THREE.PointsMaterial).opacity = 0.65 + Math.sin(this.t * 2.2) * 0.3;
    }
  }

  private lightning(dt: number) {
    this.nextBolt -= dt;
    if (this.nextBolt <= 0) { this.nextBolt = 6 + Math.random() * 9; this.boltLeft = 0.42; setTimeout(() => this.onThunder?.(), 350 + Math.random() * 900); }
    if (this.boltLeft > 0) {
      this.boltLeft -= dt;
      // A real strike flickers: a bright stroke, a dip, one or two return strokes.
      const k = this.boltLeft;
      this.flash = k > 0.34 ? 1 : k > 0.28 ? 0.2 : k > 0.22 ? 0.85 : k > 0.16 ? 0.1 : k > 0.1 ? 0.5 : 0.05;
    } else this.flash = 0;
  }

  dispose() {
    this.object.traverse((o) => {
      const m = o as THREE.Mesh | THREE.Points;
      m.geometry?.dispose();
      (m.material as THREE.Material | undefined)?.dispose();
    });
  }
}

/** Rain leaves the ground dark and wet: puddles that mirror the sky on the tarmac and paving, damp everywhere else. */
let wetRough: THREE.Texture | null = null;
function puddleRoughness(): THREE.Texture {
  if (wetRough) return wetRough;
  const S = 256, n = fbm(S, 3, 4, 333), d = fbm(S, 40, 1, 335), c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d')!, img = g.createImageData(S, S);
  for (let i = 0; i < n.length; i++) {
    const puddle = n[i] > 0.6 ? Math.min(1, (n[i] - 0.6) * 12) : 0;
    const v = (0.55 + d[i] * 0.2) * (1 - puddle) + 0.03 * puddle;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v * 255; img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  wetRough = new THREE.CanvasTexture(c); wetRough.wrapS = wetRough.wrapT = THREE.RepeatWrapping; wetRough.colorSpace = THREE.NoColorSpace;
  return wetRough;
}
export function wetten(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    const m = mesh.material as THREE.MeshStandardMaterial | undefined;
    if (!m || !m.isMeshStandardMaterial || m.userData.wet || m.transparent) return;
    const g = mesh.geometry; if (!g) return;
    g.computeBoundingBox();
    const flat = g.boundingBox!.max.y - g.boundingBox!.min.y < 0.45 * Math.max(1, o.getWorldScale(new THREE.Vector3()).y);
    if (!flat || o.position.y > 0.6 || m.metalness > 0.2) return;
    m.userData.wet = true;
    if (m.roughnessMap) {
      // PBR ground: puddles in the low spots, damp elsewhere; the surface darkens as it soaks.
      const rep = m.roughnessMap.repeat.clone();
      const r = puddleRoughness().clone(); r.needsUpdate = true; r.repeat.copy(rep).multiplyScalar(0.35);
      m.roughnessMap = r; m.roughness = 1;
      m.color.multiplyScalar(0.62); m.envMapIntensity = 1.7;
      if (m.normalScale) m.normalScale.multiplyScalar(0.6);
      m.needsUpdate = true;
      return;
    }
    const lum = m.color.r * 0.3 + m.color.g * 0.59 + m.color.b * 0.11;
    if (m.roughness < 0.6 || lum > 0.5) return;
    m.roughness = 0.34; m.color.multiplyScalar(0.72); m.envMapIntensity = Math.max(m.envMapIntensity ?? 1, 1.6);
  });
}
