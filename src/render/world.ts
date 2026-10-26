/**
 * The Tajrish diorama around a level: the parking lot, the ring road, the pickup bays, the bus stop
 * sidewalk with its queue, and the city behind. Also owns the coordinate helpers the game uses.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CELL, bake } from './fleet';

export const ROAD = 1.8; // ring road width
export const CURB = 0.22;
export const BAY_W = 1.36;
export const BAY_D = 2.7;
export const LOT_Y = 0.092;

export interface Layout {
  w: number; h: number;
  lotX0: number; lotZ0: number; // top-left corner of the lot
  lotW: number; lotH: number;
  topRoadZ: number; bottomRoadZ: number; leftRoadX: number; rightRoadX: number;
  bayZ: number; bayX: number[];
  walkZ: number; queueX0: number;
  cell(c: number, r: number): THREE.Vector3;
  /** The world-space bounds that must stay visible. */
  focus: THREE.Box3;
}

export function layout(w: number, h: number, bays: number): Layout {
  const lotW = w * CELL, lotH = h * CELL;
  const lotX0 = -lotW / 2, lotZ0 = 0;
  const topRoadZ = -CURB - ROAD / 2;
  const bottomRoadZ = lotH + CURB + ROAD / 2;
  const leftRoadX = lotX0 - CURB - ROAD / 2;
  const rightRoadX = -lotX0 + CURB + ROAD / 2;
  const bayZ = -CURB - ROAD - 0.1 - BAY_D / 2;
  const bayX = Array.from({ length: bays }, (_, i) => ((bays - 1) / 2 - i) * BAY_W * 1.06);
  const walkZ = bayZ - BAY_D / 2 - 0.95;
  const sideX = Math.max(-lotX0 + CURB + ROAD * 0.45, bayX[0] + BAY_W * 0.6);
  const focus = new THREE.Box3(new THREE.Vector3(-sideX, 0, walkZ - 0.6), new THREE.Vector3(sideX, 0.6, lotH + CURB + 0.15));
  return {
    w, h, lotX0, lotZ0, lotW, lotH, topRoadZ, bottomRoadZ, leftRoadX, rightRoadX, bayZ, bayX, walkZ, queueX0: bayX[0] + 0.9, focus,
    cell: (c, r) => new THREE.Vector3(lotX0 + (c + 0.5) * CELL, 0, lotZ0 + (r + 0.5) * CELL),
  };
}

// ───── Procedural textures ─────
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, rep = 1, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function speckle(g: CanvasRenderingContext2D, w: number, h: number, base: string, spots: string[], n: number, size = 1.6) {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) { g.globalAlpha = Math.random() * 0.35; g.fillStyle = spots[i % spots.length]; g.fillRect(Math.random() * w, Math.random() * h, size, size); }
  g.globalAlpha = 1;
}
const asphaltTex = () => canvasTex(512, 512, (g) => {
  speckle(g, 512, 512, '#474d57', ['#3a3f47', '#5a616c', '#636a75', '#2f343b'], 14000);
  // Patches and cracks: Tehran asphalt is never new.
  for (let i = 0; i < 7; i++) { g.globalAlpha = 0.12; g.fillStyle = Math.random() < 0.5 ? '#2a2e34' : '#5d636d'; g.beginPath(); g.ellipse(Math.random() * 512, Math.random() * 512, 30 + Math.random() * 60, 20 + Math.random() * 40, Math.random() * 3, 0, Math.PI * 2); g.fill(); }
  g.globalAlpha = 0.35; g.strokeStyle = '#25292e'; g.lineWidth = 1.2;
  for (let i = 0; i < 6; i++) { g.beginPath(); let x = Math.random() * 512, y = Math.random() * 512; g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (Math.random() - 0.5) * 40; y += (Math.random() - 0.5) * 40; g.lineTo(x, y); } g.stroke(); }
  g.globalAlpha = 1;
}, 1);
const pavingTex = () => canvasTex(256, 256, (g) => {
  speckle(g, 256, 256, '#d9cdb5', ['#c9bb9e', '#e6dcc8', '#b8a98b'], 3000);
  g.strokeStyle = 'rgba(120,100,70,.35)'; g.lineWidth = 2;
  for (let y = 0; y <= 256; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); for (let x = (y / 32) % 2 ? 0 : 32; x <= 256; x += 64) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 32); g.stroke(); } }
}, 1);
const grassTex = () => canvasTex(256, 256, (g) => speckle(g, 256, 256, '#6aa84f', ['#5a9a42', '#7dbb5c', '#4e8a3a', '#8cc66a'], 9000, 2), 1);

export function sky(stops: [number, string][] = [[0, '#4b93dd'], [0.5, '#9dcff7'], [0.85, '#e8eef2'], [1, '#f7e7cf']]): THREE.Texture {
  return canvasTex(4, 512, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 512);
    for (const [o, c] of stops) gr.addColorStop(o, c);
    g.fillStyle = gr; g.fillRect(0, 0, 4, 512);
  }, 1);
}

export interface WorldOpts { stop?: string; night?: boolean; landmark?: 'milad' | 'azadi' | 'both'; boulevard?: boolean; /** Restored garage classics that may stand in for sedans. */ skins?: string[]; }

/** A soft pool of light on the ground (night scenes): an additive radial gradient. */
let poolTex: THREE.Texture | null = null;
function lightPool(r: number, color = 0xffd9a0, opacity = 0.55): THREE.Mesh {
  poolTex ??= canvasTex(128, 128, (g) => {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: poolTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  return m;
}

const std = (color: number, o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o });

function box(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, r = 0) {
  const m = new THREE.Mesh(r ? new RoundedBoxGeometry(w, h, d, 2, r) : new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true;
  return m;
}
function plane(w: number, d: number, mat: THREE.Material, x: number, y: number, z: number) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true;
  return m;
}
function label(text: string, bg: string, fg: string, w = 512, h = 112, fs = 64) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.font = `900 ${fs}px Vazirmatn`;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'rtl'; g.fillText(text, w / 2, h / 2 + 4);
  });
}

// ───── Props ─────
export function cone(): THREE.Group {
  const g = new THREE.Group();
  const cm = std(0xff6a00, { roughness: 0.5 });
  const base = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.08, 0.62, 2, 0.04), cm); base.position.y = 0.04; g.add(base);
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.8, 20), cm); body.position.y = 0.46; g.add(body);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.175, 0.13, 20), std(0xffffff)); band.position.y = 0.5; g.add(band);
  g.traverse((m) => { m.castShadow = true; });
  return g;
}

/** A Tehran plane tree «چنار»: a pale mottled trunk and a layered canopy. */
function chenar(s: number): THREE.Group {
  const t = new THREE.Group();
  const bark = std(0xb9ae94, { roughness: 0.9 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 1.6, 8), bark); trunk.position.y = 0.8; t.add(trunk);
  const leafA = std(0x4f8f3a, { roughness: 0.8, flatShading: true }), leafB = std(0x6aa848, { roughness: 0.8, flatShading: true });
  const puffs: [number, number, number, number][] = [[0, 2.0, 0, 0.85], [0.55, 1.75, 0.2, 0.6], [-0.5, 1.8, -0.15, 0.62], [0.1, 2.45, 0.1, 0.6], [-0.2, 1.7, 0.45, 0.5], [0.3, 2.2, -0.4, 0.55]];
  puffs.forEach(([x, y, z, r], i) => { const p = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), i % 2 ? leafB : leafA); p.position.set(x, y, z); p.rotation.set(i, i * 2, 0); t.add(p); });
  t.traverse((m) => { m.castShadow = true; });
  t.scale.setScalar(s);
  return t;
}

/** Tehran roofs are sealed with silver «ایزوگام» rolls: a shared texture. */
let isogam: THREE.Texture | null = null;
function isogamTex() {
  if (isogam) return isogam;
  isogam = canvasTex(256, 256, (c) => {
    c.fillStyle = '#b9bec4'; c.fillRect(0, 0, 256, 256);
    for (let x = 0; x < 256; x += 32) {
      const gr = c.createLinearGradient(x, 0, x + 32, 0); gr.addColorStop(0, '#c9ced4'); gr.addColorStop(0.5, '#aeb4bb'); gr.addColorStop(1, '#c2c7cd');
      c.fillStyle = gr; c.fillRect(x, 0, 32, 256);
      c.fillStyle = 'rgba(70,75,82,.35)'; c.fillRect(x + 30, 0, 2, 256);
    }
    for (let i = 0; i < 900; i++) { c.globalAlpha = 0.1; c.fillStyle = Math.random() < 0.5 ? '#000' : '#fff'; c.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
    c.globalAlpha = 1;
  }, 1);
  return isogam;
}

type Style = 'stone' | 'brick';
/**
 * A Tehran apartment block: travertine-stone or brick facade with framed windows, shop fronts with
 * awnings on the ground floor, balconies, bare cement side walls, an ایزوگام roof with a parapet and the
 * usual rooftop clutter (water tank, evaporative cooler, satellite dishes).
 */
function apartment(w: number, floors: number, tone: string, style: Style, rnd: () => number, night = false): THREE.Group {
  const g = new THREE.Group();
  const glow: [number, number, number, number, string][] = [];
  const fh = 0.62, h = floors * fh + 0.3, d = 1.8;
  const W = 384, FH = 96, cols = w > 2.8 ? 4 : 3;
  const facade = canvasTex(W, FH * floors, (c) => {
    if (style === 'brick') {
      c.fillStyle = tone; c.fillRect(0, 0, W, FH * floors);
      // Brick courses.
      for (let y = 0; y < FH * floors; y += 6) {
        for (let x = (y / 6) % 2 ? -8 : 0; x < W; x += 16) {
          c.fillStyle = `rgba(${90 + rnd() * 40},${40 + rnd() * 20},${25 + rnd() * 15},${0.25 + rnd() * 0.2})`;
          c.fillRect(x + 1, y + 1, 14, 4);
        }
      }
      c.fillStyle = 'rgba(240,230,210,.35)'; for (let y = 0; y < FH * floors; y += 6) c.fillRect(0, y, W, 1);
    } else {
      c.fillStyle = tone; c.fillRect(0, 0, W, FH * floors);
      // Travertine slabs with soft veining.
      for (let y = 0; y < FH * floors; y += 24) for (let x = (y / 24) % 2 ? -32 : 0; x < W; x += 64) {
        c.fillStyle = `rgba(${150 + rnd() * 60},${130 + rnd() * 50},${100 + rnd() * 40},.12)`; c.fillRect(x + 1, y + 1, 62, 22);
        c.strokeStyle = 'rgba(120,100,70,.18)'; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, 63, 23);
      }
    }
    for (let f = 0; f < floors; f++) {
      const y = f * FH;
      if (f === floors - 1) {
        // Ground floor: two shop fronts with rolling shutters or lit windows, and a sign band.
        for (let k = 0; k < 2; k++) {
          const x = 16 + k * (W / 2), sw = W / 2 - 32;
          const open = rnd() < 0.7;
          c.fillStyle = '#2a2f36'; c.fillRect(x, y + 30, sw, 62);
          if (open) {
            glow.push([x + 4, y + 34, sw - 8, 54, '#ffd98a']);
            const gr = c.createLinearGradient(0, y + 34, 0, y + 92); gr.addColorStop(0, '#ffe7a8'); gr.addColorStop(1, '#f2b866');
            c.fillStyle = gr; c.fillRect(x + 4, y + 34, sw - 8, 54);
            c.fillStyle = 'rgba(120,70,30,.5)'; for (let j = 0; j < 6; j++) c.fillRect(x + 10 + j * ((sw - 20) / 6), y + 60 + (j % 2) * 8, 14, 22);
          } else {
            c.fillStyle = '#9aa3ad'; c.fillRect(x + 4, y + 34, sw - 8, 54);
            c.fillStyle = '#7d8691'; for (let j = 0; j < 12; j++) c.fillRect(x + 4, y + 36 + j * 4.5, sw - 8, 1.5);
          }
          c.fillStyle = ['#0b7a3b', '#b3261e', '#1d4ed8', '#d97706', '#0f766e'][Math.floor(rnd() * 5)];
          c.fillRect(x - 6, y + 8, sw + 12, 18);
          c.fillStyle = '#fff'; c.fillRect(x + sw / 2 - 30, y + 13, 60, 8);
        }
      } else {
        for (let k = 0; k < cols; k++) {
          const cw = W / cols, x = k * cw + cw * 0.14, ww = cw * 0.72;
          // Stone surround and sill.
          c.fillStyle = style === 'brick' ? '#efe6d4' : 'rgba(255,255,255,.55)';
          c.fillRect(x - 5, y + 14, ww + 10, 62);
          c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(x - 7, y + 76, ww + 14, 5);
          c.fillStyle = '#334155'; c.fillRect(x, y + 18, ww, 54);
          const lit = rnd() < (night ? 0.55 : 0.3);
          if (lit) glow.push([x + 3, y + 21, ww - 6, 48, rnd() < 0.2 ? '#cfe3ff' : '#ffd88a']);
          const glass = c.createLinearGradient(x, y + 18, x + ww, y + 72);
          glass.addColorStop(0, lit ? '#ffe9b0' : '#a9c7e3'); glass.addColorStop(1, lit ? '#f7c870' : '#6e93b8');
          c.fillStyle = glass; c.fillRect(x + 3, y + 21, ww / 2 - 4, 48); c.fillRect(x + ww / 2 + 1, y + 21, ww / 2 - 4, 48);
          if (rnd() < 0.35) { c.fillStyle = ['#f1ece2', '#e9d8c0', '#d6e4ee'][Math.floor(rnd() * 3)]; c.fillRect(x + 3, y + 21, ww / 2 - 4, 20 + rnd() * 20); }
          if (rnd() < 0.15) { c.fillStyle = '#5b6b7a'; c.fillRect(x + ww - 22, y + 50, 18, 16); } // window AC unit
        }
      }
    }
  });
  facade.wrapS = facade.wrapT = THREE.ClampToEdgeWrapping;
  // Bare cement side walls: most Tehran blocks are only finished on the street side.
  const cement = std(0xa8a39a, { roughness: 0.95 });
  const roof = std(0xffffff, { map: isogamTex(), roughness: 0.45, metalness: 0.35 });
  const front = std(0xffffff, { map: facade, roughness: 0.8 });
  if (night) {
    const glowTex = canvasTex(W, FH * floors, (c) => { c.fillStyle = '#000'; c.fillRect(0, 0, W, FH * floors); for (const [x, y, ww, hh, col] of glow) { c.fillStyle = col; c.fillRect(x, y, ww, hh); } });
    glowTex.wrapS = glowTex.wrapT = THREE.ClampToEdgeWrapping;
    front.emissiveMap = glowTex; front.emissive = new THREE.Color(0xffffff); front.emissiveIntensity = 1.7;
  }
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [cement, cement, roof, cement, front, cement]);
  body.position.y = h / 2; g.add(body);
  // Parapet around the roof.
  const par = std(new THREE.Color(tone).multiplyScalar(0.92).getHex());
  for (const [pw, pd, px, pz] of [[w, 0.08, 0, d / 2 - 0.04], [w, 0.08, 0, -d / 2 + 0.04], [0.08, d, w / 2 - 0.04, 0], [0.08, d, -w / 2 + 0.04, 0]]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(pw, 0.16, pd), par); m.position.set(px, h + 0.08, pz); g.add(m);
  }
  // A cornice band between ground floor and the rest.
  const cornice = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, 0.06, 0.1), std(0xe8e0cf)); cornice.position.set(0, fh + 0.28, d / 2 + 0.03); g.add(cornice);
  // Striped shop awnings.
  const awn = canvasTex(64, 16, (c) => { const col = ['#dc2626', '#16a34a', '#2563eb', '#ea580c'][Math.floor(rnd() * 4)]; for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#ffffff' : col; c.fillRect(i * 8, 0, 8, 16); } });
  for (const sx of [-w / 4, w / 4]) {
    if (rnd() < 0.35) continue;
    const a = new THREE.Mesh(new THREE.BoxGeometry(w / 2 - 0.2, 0.03, 0.42), std(0xffffff, { map: awn }));
    a.position.set(sx, fh * 0.62, d / 2 + 0.2); a.rotation.x = 0.35; g.add(a);
  }
  // Balconies with railings and pot plants.
  const rail = std(0x39424d, { metalness: 0.4, roughness: 0.5 });
  for (let f = 1; f < floors - 1; f++) {
    if (rnd() < 0.5) continue;
    const y = (floors - 1 - f) * fh + 0.3;
    const bx = (rnd() - 0.5) * w * 0.3;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w * 0.42, 0.05, 0.35), std(0xd8d0bf)); slab.position.set(bx, y, d / 2 + 0.17); g.add(slab);
    const r = new THREE.Mesh(new THREE.BoxGeometry(w * 0.42, 0.22, 0.02), rail); r.position.set(bx, y + 0.13, d / 2 + 0.34); g.add(r);
    if (rnd() < 0.6) { const pot = new THREE.Mesh(new THREE.IcosahedronGeometry(0.09, 0), std(0x4f8f3a, { flatShading: true })); pot.position.set(bx + 0.2, y + 0.1, d / 2 + 0.22); g.add(pot); }
  }
  // Rooftop clutter.
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.42, 12), std(0xe3e6ea, { metalness: 0.5, roughness: 0.35 })); tank.rotation.z = Math.PI / 2; tank.position.set(-w * 0.25, h + 0.2, -0.2); g.add(tank);
  const cooler = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.32, 0.36), std(0xbfc5cc, { metalness: 0.3 })); cooler.position.set(w * 0.2, h + 0.16, 0.25); g.add(cooler);
  const duct = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.7), std(0xc9ced4, { metalness: 0.4 })); duct.position.set(w * 0.2, h + 0.08, 0.7); g.add(duct);
  for (let k = 0; k < 1 + Math.floor(rnd() * 3); k++) {
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 5, 0, Math.PI * 2, 0, 0.9), std(0xf1f1ee)); dish.rotation.x = -1.0; dish.position.set((rnd() - 0.5) * w * 0.7, h + 0.24, -0.5 + rnd() * 0.4); g.add(dish);
  }
  if (rnd() < 0.4) { // a penthouse setback
    const ph = new THREE.Mesh(new THREE.BoxGeometry(w * 0.45, 0.5, d * 0.5), [cement, cement, roof, cement, std(0xe9e2d3), cement]); ph.position.set(-w * 0.15, h + 0.25, -d * 0.2); g.add(ph);
  }
  g.traverse((m) => { m.castShadow = true; });
  return g;
}

/** Tehran's green street lamp. */
function streetLamp(night = false): THREE.Group {
  const g = new THREE.Group();
  const m = std(0x2f5d4a, { metalness: 0.5, roughness: 0.45 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.055, 2.6, 8), m); pole.position.y = 1.3; g.add(pole);
  const arm = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 6, 12, Math.PI / 2), m); arm.position.set(0.3, 2.6, 0); arm.rotation.z = Math.PI / 2; g.add(arm);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 0.12, 10), m); head.position.set(0.6, 2.86, 0); g.add(head);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 6), std(0xfff4d0, { emissive: 0xffe8a8, emissiveIntensity: night ? 4 : 0.4 })); bulb.position.set(0.6, 2.79, 0); g.add(bulb);
  g.traverse((m) => { m.castShadow = true; });
  return g;
}

/** A Honda 125 «موتور هوندا», the courier's workhorse. */
function motorbike(color: number): THREE.Group {
  const g = new THREE.Group();
  const tire = std(0x1a1b1d), body = std(color, { roughness: 0.35, metalness: 0.2 }), chrome = std(0xdfe3e8, { metalness: 0.9, roughness: 0.2 });
  for (const x of [-0.42, 0.42]) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.05, 6, 14), tire); w.position.set(x, 0.2, 0); g.add(w); }
  const tank = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.18, 0.2, 2, 0.06), body); tank.position.set(0.05, 0.52, 0); g.add(tank);
  const seat = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.08, 0.2, 2, 0.04), std(0x111111)); seat.position.set(-0.28, 0.58, 0); g.add(seat);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 0.06), chrome); frame.position.set(0, 0.34, 0); frame.rotation.z = -0.15; g.add(frame);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 6), chrome); bar.rotation.x = Math.PI / 2; bar.position.set(0.36, 0.72, 0); g.add(bar);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), std(0xfff6dc, { emissive: 0xfff0c0, emissiveIntensity: 0.3 })); lamp.position.set(0.46, 0.62, 0); g.add(lamp);
  const box = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.26, 0.3, 2, 0.03), std(0xf59e0b, { roughness: 0.5 })); box.position.set(-0.5, 0.74, 0); g.add(box); // delivery box
  g.traverse((m) => { m.castShadow = true; });
  return g;
}

/** Traffic light on a pole. */
function trafficLight(): THREE.Group {
  const g = new THREE.Group();
  const m = std(0x2b2f36, { metalness: 0.5, roughness: 0.4 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.0, 8), m); pole.position.y = 1.0; g.add(pole);
  const box = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.6, 0.18, 2, 0.04), m); box.position.y = 2.2; g.add(box);
  [[0xff3b30, 0.18, 0.15], [0xffcc00, 0, 0.05], [0x22c55e, -0.18, 0.9]].forEach(([c, y, e]) => {
    const l = new THREE.Mesh(new THREE.CircleGeometry(0.065, 12), std(c, { emissive: c, emissiveIntensity: e })); l.position.set(0, 2.2 + y, 0.095); g.add(l);
  });
  g.traverse((m) => { m.castShadow = true; });
  return g;
}

function miladTower(): THREE.Group {
  const g = new THREE.Group();
  const mm = std(0xdfe6ee, { roughness: 0.45, metalness: 0.2 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.65, 15, 16), mm); shaft.position.y = 7.5; g.add(shaft);
  const pod = new THREE.Mesh(new THREE.SphereGeometry(1.5, 24, 12), mm); pod.scale.set(1, 0.55, 1); pod.position.y = 14; g.add(pod);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.48, 1.3, 0.5, 24), std(0x26405a, { roughness: 0.1, metalness: 0.5 })); ring.position.y = 13.7; g.add(ring);
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.2, 6, 8), mm); spire.position.y = 18; g.add(spire);
  return g;
}

function azadiTower(): THREE.Group {
  const az = new THREE.Shape();
  az.moveTo(-2.2, 0); az.quadraticCurveTo(-1.2, 2.2, -0.7, 4.2); az.lineTo(0.7, 4.2); az.quadraticCurveTo(1.2, 2.2, 2.2, 0); az.lineTo(1.0, 0);
  az.quadraticCurveTo(0.8, 2.0, 0, 2.6); az.quadraticCurveTo(-0.8, 2.0, -1.0, 0); az.closePath();
  const mat = std(0xf3ead6, { roughness: 0.6 });
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.ExtrudeGeometry(az, { depth: 1.6, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08 }), mat));
  const top = new THREE.Mesh(new RoundedBoxGeometry(1.7, 0.5, 1.9, 2, 0.08), mat); top.position.set(0, 4.4, 0.8); g.add(top);
  return g;
}

export interface World { group: THREE.Group; L: Layout; }

export function buildWorld(w: number, h: number, bays: number, seed = 1, opts: WorldOpts = {}): World {
  const night = !!opts.night;
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const L = layout(w, h, bays);
  const g = new THREE.Group();
  const add = <T extends THREE.Object3D>(o: T) => { g.add(o); return o; };
  const cx = 0, lotCZ = L.lotH / 2;

  // Ground.
  const grass = grassTex(); grass.repeat.set(30, 30);
  add(plane(120, 120, std(0xffffff, { map: grass }), 0, -0.02, 0));
  // Ring road around the lot + the top road running across the whole scene.
  const asph = asphaltTex(); const ringW = L.lotW + 2 * (CURB + ROAD), ringH = L.lotH + 2 * (CURB + ROAD);
  asph.repeat.set(ringW / 4, ringH / 4);
  add(plane(ringW, ringH, std(0xffffff, { map: asph, roughness: 0.95 }), cx, 0.0, lotCZ));
  const asph2 = asphaltTex(); asph2.repeat.set(20, 0.5);
  add(plane(80, ROAD, std(0xffffff, { map: asph2, roughness: 0.95 }), 0, 0.002, L.topRoadZ));
  // Lane markings: dashed yellow center line on the top road, white edge lines on the ring.
  const yellow = std(0xffc928, { roughness: 0.6 }), whiteLine = std(0xf2f2ee, { roughness: 0.6 });
  for (let x = -40; x < 40; x += 1.5) add(plane(0.7, 0.07, yellow, x, 0.01, L.topRoadZ));
  // Zebra crossing to the bus stop.
  for (let i = 0; i < 7; i++) add(plane(0.22, ROAD - 0.2, whiteLine, L.bayX[0] + 1.9 + i * 0.4, 0.012, L.topRoadZ));

  // The lot: a raised slab with a curb and painted bays.
  const curbMat = std(0xd4d8dd, { roughness: 0.7 });
  add(box(L.lotW + 2 * CURB, 0.12, L.lotH + 2 * CURB, curbMat, cx, LOT_Y - 0.077, lotCZ, 0.04)).castShadow = false;
  const lotTex = asphaltTex(); lotTex.repeat.set(L.lotW / 3, L.lotH / 3);
  add(plane(L.lotW, L.lotH, std(0xffffff, { map: lotTex, color: 0xb9bec8 }), cx, LOT_Y, lotCZ));
  const gridMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16 });
  for (let i = 1; i < w; i++) add(plane(0.035, L.lotH - 0.1, gridMat, L.lotX0 + i * CELL, LOT_Y + 0.008, lotCZ));
  for (let i = 1; i < h; i++) add(plane(L.lotW - 0.1, 0.035, gridMat, cx, LOT_Y + 0.008, i * CELL));

  // Pickup bays: a darker strip with white separators and numbered pavement.
  const bayStrip = asphaltTex(); bayStrip.repeat.set(6, 1);
  const stripW = L.bayX.length * BAY_W * 1.06 + 0.6;
  add(plane(stripW, BAY_D + 0.2, std(0xffffff, { map: bayStrip, color: 0xa6adb8 }), 0, 0.006, L.bayZ));
  for (let i = 0; i <= L.bayX.length; i++) add(plane(0.06, BAY_D, whiteLine, (i - L.bayX.length / 2) * BAY_W * 1.06, 0.014, L.bayZ));
  // Sidewalk with its curb, then the city.
  const walkD = 2.2;
  const pav = pavingTex(); pav.repeat.set(40, 1.4);
  add(box(80, 0.18, walkD, std(0xffffff, { map: pav }), 0, 0.09, L.walkZ - 0.1));
  add(box(80, 0.22, 0.2, curbMat, 0, 0.11, L.walkZ + walkD / 2 - 0.05));
  // «جوی آب»: the open gutter between sidewalk and street, a Tehran signature.
  add(plane(80, 0.18, std(0x6b8fa8, { roughness: 0.15, metalness: 0.3 }), 0, 0.005, L.walkZ + walkD / 2 + 0.12));

  // Bus shelter at the queue head.
  const shelter = new THREE.Group();
  const steel = std(0x5d6b7e, { metalness: 0.6, roughness: 0.35 });
  const roofS = box(2.6, 0.12, 1.1, std(0x1e63d6, { roughness: 0.4 }), 0, 1.85, 0, 0.04); shelter.add(roofS);
  for (const x of [-1.2, 1.2]) for (const z of [-0.45, 0.4]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.8, 8), steel); p.position.set(x, 0.9, z); shelter.add(p); }
  const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.3, 0.04), new THREE.MeshPhysicalMaterial({ color: 0xbfe3ff, transparent: true, opacity: 0.45, roughness: 0.05 })); back.position.set(0, 1.0, -0.45); shelter.add(back);
  shelter.add(box(1.8, 0.08, 0.32, std(0xa0703c), 0, 0.45, -0.25, 0.03));
  const sign = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.36, 0.06), [steel, steel, steel, steel, std(0xffffff, { map: label(opts.stop ?? 'ایستگاه تجریش', '#1e63d6', '#ffffff') }), steel]);
  sign.position.set(0, 2.12, 0.2); shelter.add(sign);
  shelter.traverse((m) => { m.castShadow = true; m.receiveShadow = true; });
  shelter.position.set(L.queueX0 + 1.6, 0.18, L.walkZ - 0.3);
  add(shelter);
  // Newspaper kiosk «دکه» on the left end.
  const kiosk = new THREE.Group();
  kiosk.add(box(1.3, 1.4, 1.0, std(0x2e7d4f, { roughness: 0.5 }), 0, 0.7, 0, 0.05));
  kiosk.add(box(1.5, 0.08, 1.2, std(0x1f5a39), 0, 1.45, 0.05, 0.03));
  const mags = canvasTex(256, 96, (c) => { const cols = ['#e11d48', '#f59e0b', '#2563eb', '#16a34a', '#a855f7', '#0ea5e9']; for (let i = 0; i < 12; i++) { c.fillStyle = cols[i % 6]; c.fillRect((i % 6) * 42 + 4, Math.floor(i / 6) * 48 + 4, 36, 42); c.fillStyle = '#fff'; c.fillRect((i % 6) * 42 + 8, Math.floor(i / 6) * 48 + 10, 28, 6); } });
  const magPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.42), std(0xffffff, { map: mags })); magPlane.position.set(0, 0.95, 0.51); kiosk.add(magPlane);
  kiosk.position.set(L.bayX[L.bayX.length - 1] - 2.4, 0.18, L.walkZ - 0.25); kiosk.traverse((m) => { m.castShadow = true; });
  add(kiosk);

  // Plane trees along the sidewalk, apartments behind, landmarks on the horizon.
  for (let x = -16; x <= 16; x += 2.6 + rnd()) {
    if (Math.abs(x - shelter.position.x) < 1.8 || Math.abs(x - kiosk.position.x) < 1.3) continue;
    const t = chenar(0.85 + rnd() * 0.3); t.position.set(x, 0.18, L.walkZ - 0.85 + rnd() * 0.2); add(t);
  }
  const tones = ['#e6dccb', '#d9cbb3', '#efe2c8', '#e2d2bd', '#d8d0c4'];
  const bricks = ['#a8613f', '#b5714d', '#9c5638', '#c07f5a'];
  const facadeOf = (i: number): [string, Style] => (rnd() < 0.4 ? [bricks[i % bricks.length], 'brick'] : [tones[i % tones.length], 'stone']);
  for (let x = -18, i = 0; x < 18; i++) {
    const bw = 2.2 + rnd() * 1.4, floors = 4 + Math.floor(rnd() * 4);
    const [tone, style] = facadeOf(i);
    const b = apartment(bw, floors, tone, style, rnd, night);
    b.position.set(x + bw / 2, 0, L.walkZ - 3.2 - rnd() * 0.6);
    add(b);
    x += bw + 0.15;
  }
  // Second row and the skyline.
  for (let x = -24, i = 0; x < 24; i++) {
    const bw = 2.6 + rnd() * 2, floors = 7 + Math.floor(rnd() * 6);
    const [tone, style] = facadeOf(i + 3);
    const b = apartment(bw, floors, tone, style, rnd, night);
    b.position.set(x + bw / 2, 0, L.walkZ - 7.5 - rnd() * 2); add(b);
    x += bw + 0.4;
  }
  const lm = opts.landmark ?? 'both';
  const milad = miladTower();
  if (lm === 'milad') { milad.scale.setScalar(1.25); milad.position.set(2.5, 0, L.walkZ - 24); } else { milad.scale.setScalar(0.9); milad.position.set(7, 0, L.walkZ - 26); }
  add(milad);
  const azadi = azadiTower();
  if (lm === 'azadi') { azadi.scale.setScalar(2.4); azadi.position.set(0, 0, L.walkZ - 19); azadi.rotation.y = 0; } else { azadi.scale.setScalar(1.1); azadi.position.set(-8, 0, L.walkZ - 22); azadi.rotation.y = 0.35; }
  add(azadi);
  if (night) {
    // Floodlit monuments and pools of lamplight.
    const flood = (o: THREE.Object3D, r: number) => { const p = lightPool(r, 0x9fc4ff, 0.5); p.position.set(o.position.x, 0.05, o.position.z + 1); g.add(p); };
    flood(azadi, lm === 'azadi' ? 9 : 5); flood(milad, 4);
    azadi.traverse((m) => { const mm = m as THREE.Mesh; if (mm.isMesh) { const mat = (mm.material as THREE.MeshStandardMaterial).clone(); mat.emissive = new THREE.Color(0x7fa6ff); mat.emissiveIntensity = 0.35; mm.material = mat; } });
    milad.traverse((m) => { const mm = m as THREE.Mesh; if (mm.isMesh) { const mat = (mm.material as THREE.MeshStandardMaterial).clone(); mat.emissive = new THREE.Color(0xc9a3ff); mat.emissiveIntensity = 0.45; mm.material = mat; } });
  }
  const mtn = std(0x8fa5bf, { roughness: 1, flatShading: true }), snow = std(0xffffff, { roughness: 0.9, flatShading: true });
  for (const [x, hh, r] of [[-34, 18, 15], [-14, 24, 17], [6, 20, 15], [26, 26, 18], [46, 17, 13]]) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, hh, 7), mtn); m.position.set(x, hh / 2, L.walkZ - 52); g.add(m);
    const sn = new THREE.Mesh(new THREE.ConeGeometry(r * 0.34, hh * 0.34, 7), snow); sn.position.set(x, hh - hh * 0.17 + 0.05, L.walkZ - 52); g.add(sn);
  }
  // Street lamps along the sidewalk, bikes by the kiosk, a traffic light at the crossing.
  for (let x = -15; x <= 15; x += 4.2) {
    if (Math.abs(x - shelter.position.x) < 1.6) continue;
    const l = streetLamp(night); l.position.set(x + 1.3, 0.18, L.walkZ - 0.75); l.rotation.y = -Math.PI / 2; add(l);
    if (night) { const p = lightPool(2.2, 0xffd9a0, 0.75); p.position.set(x + 1.3, 0.2, L.walkZ - 0.15); g.add(p); }
  }
  [[0xb91c1c, 0], [0x1d4ed8, 0.55], [0x111827, 1.1]].forEach(([c, dx]) => {
    const m = motorbike(c); m.position.set(kiosk.position.x - 1.3 - dx, 0.18, L.walkZ + 0.15); m.rotation.y = Math.PI / 2 + 0.25; add(m);
  });
  const tl = trafficLight(); tl.position.set(L.bayX[0] + 3.0, 0.18, L.walkZ + 0.85); add(tl);

  if (opts.boulevard) {
    // Valiasr: a double row of old plane trees.
    for (let x = -16; x <= 16; x += 2.2 + rnd() * 0.6) { const t = chenar(1.15 + rnd() * 0.3); t.position.set(x, 0, L.walkZ - 2.3 + rnd() * 0.3); add(t); }
  }
  if (night) {
    // Floodlights over the lot and the bays.
    for (const [x, z, r] of [[0, L.lotH / 2, Math.max(L.lotW, L.lotH) * 0.75], [0, L.bayZ, 5.5]] as const) { const p = lightPool(r, 0xffe6b8, 0.5); p.position.set(x, 0.13, z); g.add(p); }
  }

  // Trees on the grass around the lot.
  for (let i = 0; i < 18; i++) {
    const side = i % 2 ? 1 : -1, z = rnd() * (L.lotH + 6) - 1;
    const x = side * (L.lotW / 2 + CURB + ROAD + 1.2 + rnd() * 3.5);
    const t = chenar(0.8 + rnd() * 0.4); t.position.set(x, 0, z); add(t);
  }
  // Everything here is static: merge it into one mesh per material to keep draw calls low.
  const baked = bake(g);
  baked.traverse((m) => { (m as THREE.Mesh).receiveShadow = true; });
  return { group: baked, L };
}
