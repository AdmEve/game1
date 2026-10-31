/**
 * Weather for each map: drifting particles and a mood on the light. One `Weather` lives in the session's
 * group; the game calls `update` every frame. Everything is a single Points/LineSegments object, so it
 * costs a draw call or two and a few hundred vertices updated on the CPU.
 */
import * as THREE from 'three';

export type WeatherKind = 'clear' | 'leaves' | 'rain' | 'storm' | 'snow' | 'dust' | 'petals' | 'mist';

/** What the weather does to the scene light, so the game can dim, tint and thicken the fog. */
export interface WeatherMood {
  /** Multiplies the sun and hemisphere light (1 = untouched). */
  light: number;
  /** Fog distances: the scene's fog is pulled toward these. */
  fogNear: number; fogFar: number;
  /** A tint mixed into the fog color (0xrrggbb) and how much of it. */
  tint: number; tintAmount: number;
}

export const MOODS: Record<WeatherKind, WeatherMood> = {
  clear: { light: 1, fogNear: 40, fogFar: 95, tint: 0xffffff, tintAmount: 0 },
  leaves: { light: 1, fogNear: 40, fogFar: 95, tint: 0xffd9a0, tintAmount: 0.08 },
  rain: { light: 0.85, fogNear: 42, fogFar: 90, tint: 0x7f8ea3, tintAmount: 0.3 },
  storm: { light: 0.85, fogNear: 42, fogFar: 88, tint: 0x1c2740, tintAmount: 0.3 },
  snow: { light: 0.97, fogNear: 42, fogFar: 92, tint: 0xf2f6fb, tintAmount: 0.3 },
  dust: { light: 0.95, fogNear: 42, fogFar: 90, tint: 0xe9c88f, tintAmount: 0.3 },
  petals: { light: 1, fogNear: 40, fogFar: 95, tint: 0xfff0f5, tintAmount: 0.1 },
  mist: { light: 0.95, fogNear: 42, fogFar: 88, tint: 0x8a86c2, tintAmount: 0.3 },
};

let spriteTex: THREE.Texture | null = null;
/** A soft round dot. */
function dot(): THREE.Texture {
  if (spriteTex) return spriteTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d')!, gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return (spriteTex = new THREE.CanvasTexture(c));
}
let leafTex: THREE.Texture | null = null;
/** A small leaf / petal shape. */
function leaf(): THREE.Texture {
  if (leafTex) return leafTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff'; g.beginPath(); g.ellipse(32, 32, 26, 14, 0.6, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2; g.beginPath(); g.moveTo(10, 46); g.lineTo(54, 18); g.stroke();
  return (leafTex = new THREE.CanvasTexture(c));
}

interface Spec {
  count: number; size: number; opacity: number;
  /** Fall velocity (y), wind (x) and sideways sway amplitude. */
  fall: number; wind: number; sway: number;
  colors: number[]; additive?: boolean; sprite: 'dot' | 'leaf'; rise?: boolean;
}

const SPECS: Partial<Record<WeatherKind, Spec>> = {
  snow: { count: 900, size: 0.4, opacity: 0.95, fall: 1.5, wind: 1.1, sway: 0.5, colors: [0xffffff, 0xeaf3ff], sprite: 'dot' },
  leaves: { count: 110, size: 0.55, opacity: 0.95, fall: 0.9, wind: 0.9, sway: 1.1, colors: [0xe8a317, 0xd9741a, 0xf2c14e, 0xb5521b], sprite: 'leaf' },
  petals: { count: 140, size: 0.46, opacity: 0.95, fall: 0.7, wind: 0.7, sway: 1.0, colors: [0xffc1d6, 0xffffff, 0xf9a8c9], sprite: 'leaf' },
  dust: { count: 150, size: 1.7, opacity: 0.22, fall: -0.15, wind: 1.4, sway: 0.3, colors: [0xf0d49a, 0xe3b975], sprite: 'dot' },
  mist: { count: 26, size: 6, opacity: 0.2, fall: 0, wind: 0.5, sway: 0.4, colors: [0xb8b4ee, 0x9ba0e0], sprite: 'dot' },
  clear: { count: 60, size: 0.16, opacity: 0.7, fall: -0.05, wind: 0.3, sway: 0.4, colors: [0xfff4cc], additive: true, sprite: 'dot' },
};

export class Weather {
  readonly object = new THREE.Group();
  private pts: THREE.Points | null = null;
  private rain: THREE.Mesh | null = null;
  private fireflies: THREE.Points | null = null;
  /** Ripples where drops hit the tarmac: flat quads that grow and fade. */
  private ripples: THREE.Mesh | null = null;
  private rip: { x: number; z: number; age: number; life: number }[] = [];
  private pos!: Float32Array;
  private seed!: Float32Array;
  private spec: Spec | null;
  private t = 0;
  /** Seconds until the next lightning strike (storm only). */
  private nextBolt = 6 + Math.random() * 8;
  private boltLeft = 0;
  /** 0..1 flash strength, read by the game to flash the light. */
  flash = 0;
  /** Called when a bolt strikes (for thunder). */
  onThunder: (() => void) | null = null;
  private box: { x0: number; x1: number; z0: number; z1: number; y1: number };

  constructor(readonly kind: WeatherKind, lotW: number, lotH: number) {
    this.box = { x0: -lotW / 2 - 9, x1: lotW / 2 + 9, z0: -10, z1: lotH + 9, y1: 14 };
    this.spec = SPECS[kind] ?? null;
    if (kind === 'rain' || kind === 'storm') { this.makeRain(kind === 'storm' ? 900 : 640); this.makeRipples(kind === 'storm' ? 70 : 48, lotW, lotH); }
    else if (this.spec) this.makePoints(this.spec);
    if (kind === 'mist') this.makeFireflies();
    if (this.rain) this.update(0.0001); // lay the first drops out so the very first frame already rains
  }

  private rnd(i: number, k: number) { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); }

  private makePoints(s: Spec) {
    const { x0, x1, z0, z1, y1 } = this.box;
    this.pos = new Float32Array(s.count * 3); this.seed = new Float32Array(s.count);
    const col = new Float32Array(s.count * 3), c = new THREE.Color();
    for (let i = 0; i < s.count; i++) {
      this.pos[i * 3] = x0 + this.rnd(i, 1) * (x1 - x0);
      this.pos[i * 3 + 1] = (this.kind === 'mist' ? 0.4 + this.rnd(i, 2) * 1.8 : this.rnd(i, 2) * y1);
      this.pos[i * 3 + 2] = z0 + this.rnd(i, 3) * (z1 - z0);
      this.seed[i] = this.rnd(i, 4) * 6.28;
      c.setHex(s.colors[i % s.colors.length]); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: s.size, map: s.sprite === 'leaf' ? leaf() : dot(), vertexColors: true, transparent: true, opacity: s.opacity,
      depthWrite: false, sizeAttenuation: true, blending: s.additive ? THREE.AdditiveBlending : THREE.NormalBlending, fog: false,
    });
    this.pts = new THREE.Points(geo, mat);
    this.pts.frustumCulled = false;
    this.object.add(this.pts);
  }

  /** Each drop is a thin camera-facing streak: a quad that is bright at the head and fades along its tail. */
  private makeRain(n: number) {
    const { x0, x1, z0, z1, y1 } = this.box;
    this.pos = new Float32Array(n * 3); this.seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      this.pos.set([x0 + this.rnd(i, 1) * (x1 - x0), this.rnd(i, 2) * y1, z0 + this.rnd(i, 3) * (z1 - z0)], i * 3);
      this.seed[i] = 0.75 + this.rnd(i, 4) * 0.5;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 12), 3));
    const col = new Float32Array(n * 16), idx: number[] = [];
    for (let i = 0; i < n; i++) {
      const a = 0.55 + (i % 5) * 0.08;
      col.set([0.84, 0.9, 1, a, 0.84, 0.9, 1, a, 0.84, 0.9, 1, 0, 0.84, 0.9, 1, 0], i * 16);
      idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 1, i * 4 + 3, i * 4 + 2);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 4)); geo.setIndex(idx);
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide });
    this.rain = new THREE.Mesh(geo, mat);
    this.rain.frustumCulled = false; this.rain.renderOrder = 3;
    this.object.add(this.rain);
  }

  private makeRipples(n: number, lotW: number, lotH: number) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d')!; g.strokeStyle = '#fff'; g.lineWidth = 3;
    g.beginPath(); g.arc(32, 32, 26, 0, Math.PI * 2); g.stroke(); g.lineWidth = 2; g.beginPath(); g.arc(32, 32, 14, 0, Math.PI * 2); g.stroke();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 12), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 16).fill(1), 4));
    const uv = new Float32Array(n * 8), idx: number[] = [];
    for (let i = 0; i < n; i++) { uv.set([0, 0, 1, 0, 1, 1, 0, 1], i * 8); idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3); this.rip.push({ x: 0, z: 0, age: 99, life: 1 }); }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx);
    const mat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), vertexColors: true, transparent: true, depthWrite: false, fog: false });
    this.ripples = new THREE.Mesh(geo, mat); this.ripples.frustumCulled = false; this.ripples.renderOrder = 2;
    this.rippleBox = { x0: -lotW / 2 - 3, x1: lotW / 2 + 3, z0: -4, z1: lotH + 3 };
    this.object.add(this.ripples);
  }
  private rippleBox = { x0: 0, x1: 0, z0: 0, z1: 0 };
  private updateRipples(dt: number) {
    const m = this.ripples!, pos = m.geometry.getAttribute('position') as THREE.BufferAttribute, col = m.geometry.getAttribute('color') as THREE.BufferAttribute, b = this.rippleBox;
    for (let i = 0; i < this.rip.length; i++) {
      const r = this.rip[i]; r.age += dt;
      if (r.age > r.life) { r.x = b.x0 + Math.random() * (b.x1 - b.x0); r.z = b.z0 + Math.random() * (b.z1 - b.z0); r.age = 0; r.life = 0.5 + Math.random() * 0.4; }
      const k = r.age / r.life, s = 0.08 + k * 0.5, a = (1 - k) * 0.55;
      pos.setXYZ(i * 4, r.x - s, 0.06, r.z - s); pos.setXYZ(i * 4 + 1, r.x + s, 0.06, r.z - s); pos.setXYZ(i * 4 + 2, r.x + s, 0.06, r.z + s); pos.setXYZ(i * 4 + 3, r.x - s, 0.06, r.z + s);
      for (let v = 0; v < 4; v++) col.setXYZW(i * 4 + v, 0.85, 0.92, 1, a);
    }
    pos.needsUpdate = true; col.needsUpdate = true;
  }

  /** Warm little lights drifting over the lot at dusk. */
  private makeFireflies() {
    const n = 36, p = new Float32Array(n * 3), { x0, x1, z0, z1 } = this.box;
    for (let i = 0; i < n; i++) { p[i * 3] = x0 + 14 + this.rnd(i, 7) * (x1 - x0 - 28); p[i * 3 + 1] = 0.6 + this.rnd(i, 8) * 2.6; p[i * 3 + 2] = z0 + 8 + this.rnd(i, 9) * (z1 - z0 - 16); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const mat = new THREE.PointsMaterial({ size: 0.28, map: dot(), color: 0xfff2a0, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    this.fireflies = new THREE.Points(geo, mat);
    this.fireflies.frustumCulled = false;
    this.object.add(this.fireflies);
  }

  update(dt: number) {
    this.t += dt;
    const { x0, x1, z0, z1, y1 } = this.box;
    if (this.rain) {
      const storm = this.kind === 'storm', speed = storm ? 22 : 16, gust = 1 + 0.55 * Math.sin(this.t * 0.45) * Math.sin(this.t * 0.17 + 1), slant = (storm ? -6 : -3) * gust, len = 0.95;
      if (this.ripples) this.updateRipples(dt);
      const p = this.pos, n = this.seed.length, q = this.rain.geometry.getAttribute('position') as THREE.BufferAttribute, hw = 0.022;
      for (let i = 0; i < n; i++) {
        const k = i * 3, s = this.seed[i];
        let x = p[k] + slant * dt * s, y = p[k + 1] - speed * dt * s, z = p[k + 2];
        if (y < 0) { y += y1; x = x0 + Math.random() * (x1 - x0); z = z0 + Math.random() * (z1 - z0); }
        p[k] = x; p[k + 1] = y; p[k + 2] = z;
        const tx = x - slant * 0.02 * 2, ty = y + len * s * 1.6;
        q.setXYZ(i * 4, x - hw, y, z); q.setXYZ(i * 4 + 1, x + hw, y, z); q.setXYZ(i * 4 + 2, tx - hw, ty, z); q.setXYZ(i * 4 + 3, tx + hw, ty, z);
      }
      q.needsUpdate = true;
      if (storm) this.lightning(dt);
    } else if (this.pts && this.spec) {
      const s = this.spec, p = this.pos, n = this.seed.length, t = this.t;
      for (let i = 0; i < n; i++) {
        const k = i * 3, ph = this.seed[i];
        p[k] += (s.wind + Math.sin(t * 0.7 + ph) * s.sway) * dt;
        p[k + 1] -= s.fall * dt * (0.7 + 0.6 * Math.abs(Math.sin(ph)));
        p[k + 2] += Math.cos(t * 0.5 + ph) * s.sway * 0.6 * dt;
        if (p[k] > x1) p[k] = x0; else if (p[k] < x0) p[k] = x1;
        if (p[k + 2] > z1) p[k + 2] = z0; else if (p[k + 2] < z0) p[k + 2] = z1;
        if (p[k + 1] < 0) p[k + 1] += y1; else if (p[k + 1] > y1) p[k + 1] = 0.2;
        if (this.kind === 'mist') p[k + 1] = 0.5 + Math.sin(t * 0.3 + ph) * 0.35 + (i % 4) * 0.5;
      }
      (this.pts.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    }
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
    if (this.nextBolt <= 0) { this.nextBolt = 7 + Math.random() * 10; this.boltLeft = 0.32; setTimeout(() => this.onThunder?.(), 350 + Math.random() * 900); }
    if (this.boltLeft > 0) {
      this.boltLeft -= dt;
      // Two quick flickers.
      const k = this.boltLeft;
      this.flash = k > 0.2 ? 1 : k > 0.14 ? 0.15 : k > 0.06 ? 0.85 : 0.1;
    } else this.flash = 0;
  }

  dispose() {
    this.object.traverse((o) => {
      const m = o as THREE.Mesh | THREE.Points | THREE.LineSegments;
      m.geometry?.dispose();
      (m.material as THREE.Material | undefined)?.dispose();
    });
  }
}

/** Rain leaves the ground dark and glossy: tarmac and paving take on a mirror-ish sheen (once per material). */
export function wetten(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
    if (!m || !m.isMeshStandardMaterial || m.userData.wet ) return;
    m.userData.wet = true;
    const lum = m.color.r * 0.3 + m.color.g * 0.59 + m.color.b * 0.11;
    const g = (o as THREE.Mesh).geometry; g.computeBoundingBox();
    const flat = g.boundingBox!.max.y - g.boundingBox!.min.y < 0.45 * Math.max(1, o.getWorldScale(new THREE.Vector3()).y);
    if (!flat || o.position.y > 0.6 || m.roughness < 0.6 || m.transparent || lum > 0.5 || m.metalness > 0.2) return;
    m.roughness = 0.34; m.color.multiplyScalar(0.72); m.envMapIntensity = Math.max(m.envMapIntensity ?? 1, 1.6);
  });
}
