/**
 * The Tajrish diorama around a level: the parking lot, the ring road, the pickup bays, the bus stop
 * sidewalk with its queue, and the city behind. Also owns the coordinate helpers the game uses.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CELL, bake } from './fleet';
import { motorbike } from './mechanics';

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
// Noise textures are the same every level: paint each once, hand out clones (they share the image).
const texCache = new Map<string, THREE.Texture>();
function shared(key: string, make: () => THREE.Texture): THREE.Texture {
  if (!texCache.has(key)) texCache.set(key, make());
  const t = texCache.get(key)!.clone();
  t.needsUpdate = true;
  return t;
}
const asphaltTex = () => shared('asphalt', () => canvasTex(512, 512, (g) => {
  speckle(g, 512, 512, '#474d57', ['#3a3f47', '#5a616c', '#636a75', '#2f343b'], 14000);
  // Patches and cracks: Tehran asphalt is never new.
  for (let i = 0; i < 7; i++) { g.globalAlpha = 0.12; g.fillStyle = Math.random() < 0.5 ? '#2a2e34' : '#5d636d'; g.beginPath(); g.ellipse(Math.random() * 512, Math.random() * 512, 30 + Math.random() * 60, 20 + Math.random() * 40, Math.random() * 3, 0, Math.PI * 2); g.fill(); }
  g.globalAlpha = 0.35; g.strokeStyle = '#25292e'; g.lineWidth = 1.2;
  for (let i = 0; i < 6; i++) { g.beginPath(); let x = Math.random() * 512, y = Math.random() * 512; g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (Math.random() - 0.5) * 40; y += (Math.random() - 0.5) * 40; g.lineTo(x, y); } g.stroke(); }
  g.globalAlpha = 1;
}, 1));
const pavingTex = () => shared('paving', () => canvasTex(256, 256, (g) => {
  speckle(g, 256, 256, '#d9cdb5', ['#c9bb9e', '#e6dcc8', '#b8a98b'], 3000);
  g.strokeStyle = 'rgba(120,100,70,.35)'; g.lineWidth = 2;
  for (let y = 0; y <= 256; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); for (let x = (y / 32) % 2 ? 0 : 32; x <= 256; x += 64) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 32); g.stroke(); } }
}, 1));
const grassTex = () => shared('grass', () => canvasTex(256, 256, (g) => speckle(g, 256, 256, '#6aa84f', ['#5a9a42', '#7dbb5c', '#4e8a3a', '#8cc66a'], 9000, 2), 1));

export function sky(stops: [number, string][] = [[0, '#4b93dd'], [0.5, '#9dcff7'], [0.85, '#e8eef2'], [1, '#f7e7cf']]): THREE.Texture {
  return canvasTex(4, 512, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 512);
    for (const [o, c] of stops) gr.addColorStop(o, c);
    g.fillStyle = gr; g.fillRect(0, 0, 4, 512);
  }, 1);
}

export interface WorldOpts { stop?: string; night?: boolean; snow?: boolean; landmark?: 'milad' | 'azadi' | 'both' | 'tochal' | 'bazaar' | 'darband' | 'tabiat'; autumn?: boolean; /** «شب یلدا» decorations. */ yalda?: boolean; boulevard?: boolean; /** Restored garage classics that may stand in for sedans. */ skins?: string[]; colorblind?: boolean; }

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
function chenar(s: number, snow = false, autumn = false): THREE.Group {
  const t = new THREE.Group();
  const bark = std(0xb9ae94, { roughness: 0.9 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 1.6, 8), bark); trunk.position.y = 0.8; t.add(trunk);
  const fall = [0xd97706, 0xb45309, 0xeab308, 0xb91c1c][Math.floor(s * 97) % 4];
  const leafA = std(snow ? 0xe3ebe8 : autumn ? fall : 0x4f8f3a, { roughness: 0.8, flatShading: true }), leafB = std(snow ? 0xc8d6cf : autumn ? 0xf59e0b : 0x6aa848, { roughness: 0.8, flatShading: true });
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
function apartment(w: number, floors: number, tone: string, style: Style, rnd: () => number, night = false, snow = false): THREE.Group {
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
  const roof = snow ? std(0xf4f8fb, { roughness: 0.9 }) : std(0xffffff, { map: isogamTex(), roughness: 0.45, metalness: 0.35 });
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

/**
 * The Grand Bazaar of Tehran: a long brick arcade with pointed arches and lit shops, rows of domes
 * with skylights on the roof, and the tiled entrance portal.
 */
function bazaarRow(z: number, rnd: () => number): THREE.Group {
  const g = new THREE.Group();
  const len = 40, h = 2.6, d = 2.4;
  const face = canvasTex(1024, 128, (c) => {
    c.fillStyle = '#c99a62'; c.fillRect(0, 0, 1024, 128);
    for (let y = 0; y < 128; y += 4) for (let x = (y / 4) % 2 ? -6 : 0; x < 1024; x += 12) { c.fillStyle = `rgba(${120 + rnd() * 40},${80 + rnd() * 30},${40 + rnd() * 20},.25)`; c.fillRect(x + 1, y + 1, 10, 2); }
    for (let k = 0; k < 16; k++) {
      const x = k * 64 + 8, w = 48;
      // Pointed arch shop front.
      c.fillStyle = '#5a3a22'; c.beginPath(); c.moveTo(x, 124); c.lineTo(x, 60); c.quadraticCurveTo(x, 34, x + w / 2, 22); c.quadraticCurveTo(x + w, 34, x + w, 60); c.lineTo(x + w, 124); c.fill();
      const gr = c.createLinearGradient(0, 40, 0, 124); gr.addColorStop(0, '#ffcf7a'); gr.addColorStop(1, '#d98b3a');
      c.fillStyle = gr; c.beginPath(); c.moveTo(x + 4, 124); c.lineTo(x + 4, 62); c.quadraticCurveTo(x + 4, 40, x + w / 2, 30); c.quadraticCurveTo(x + w - 4, 40, x + w - 4, 62); c.lineTo(x + w - 4, 124); c.fill();
      // Goods: carpets, spices, copper.
      const goods = ['#b91c1c', '#1e3a8a', '#d97706', '#065f46', '#7c2d12'];
      for (let j = 0; j < 4; j++) { c.fillStyle = goods[Math.floor(rnd() * goods.length)]; c.fillRect(x + 8 + j * 9, 84 + (j % 2) * 6, 7, 40 - (j % 2) * 6); }
      c.strokeStyle = '#e9d5b5'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 2, 124); c.lineTo(x - 2, 60); c.quadraticCurveTo(x - 2, 30, x + w / 2, 18); c.quadraticCurveTo(x + w + 2, 30, x + w + 2, 60); c.lineTo(x + w + 2, 124); c.stroke();
    }
    // Turquoise tile frieze.
    c.fillStyle = '#0e7490'; c.fillRect(0, 4, 1024, 10);
    for (let x = 0; x < 1024; x += 16) { c.fillStyle = '#fbbf24'; c.beginPath(); c.arc(x + 8, 9, 3, 0, Math.PI * 2); c.fill(); }
  });
  face.wrapS = THREE.RepeatWrapping; face.repeat.set(2, 1);
  const brick = std(0xc99a62, { roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(len, h, d), [brick, brick, brick, brick, std(0xffffff, { map: face, roughness: 0.85 }), brick]);
  body.position.set(0, h / 2, z); body.castShadow = body.receiveShadow = true; g.add(body);
  // Rows of domes and barrel vaults with skylights.
  const domeMat = std(0xb98950, { roughness: 0.85 }), sky = std(0xe9e2d0, { roughness: 0.6 });
  for (let x = -len / 2 + 1; x < len / 2; x += 1.6) {
    for (const dz of [-0.6, 0.6]) {
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.62, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
      dome.position.set(x, h, z + dz); dome.castShadow = true; g.add(dome);
      const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.16, 8), sky); lantern.position.set(x, h + 0.66, z + dz); g.add(lantern);
    }
  }
  // The entrance portal «سردر» with tilework.
  const portalTex = canvasTex(256, 320, (c) => {
    c.fillStyle = '#c99a62'; c.fillRect(0, 0, 256, 320);
    c.fillStyle = '#0e7490'; c.fillRect(16, 16, 224, 288);
    for (let i = 0; i < 120; i++) { c.fillStyle = ['#fbbf24', '#f8fafc', '#164e63', '#22d3ee'][i % 4]; const x = 24 + (i % 12) * 18, y = 24 + Math.floor(i / 12) * 18; c.beginPath(); c.moveTo(x + 7, y); c.lineTo(x + 14, y + 7); c.lineTo(x + 7, y + 14); c.lineTo(x, y + 7); c.fill(); }
    c.fillStyle = '#3b2412'; c.beginPath(); c.moveTo(64, 320); c.lineTo(64, 170); c.quadraticCurveTo(64, 110, 128, 90); c.quadraticCurveTo(192, 110, 192, 170); c.lineTo(192, 320); c.fill();
    c.fillStyle = '#f8fafc'; c.font = '900 30px Vazirmatn'; c.textAlign = 'center'; c.fillText('بازار بزرگ', 128, 66);
  });
  const portal = new THREE.Mesh(new THREE.BoxGeometry(3.2, 4.2, 0.6), [brick, brick, brick, brick, std(0xffffff, { map: portalTex, roughness: 0.6 }), brick]);
  portal.position.set(-2.5, 2.1, z + d / 2 + 0.05); portal.castShadow = true; g.add(portal);
  return g;
}

/**
 * Darband: a mountain stream in a rocky bed, and terraces climbing the slope with teahouse «تخت»s
 * (wooden daybeds with red kilims and bolsters), awnings strung with lights, samovars and autumn trees.
 */
function darbandSlope(z: number, rnd: () => number, night: boolean): THREE.Group {
  const g = new THREE.Group();
  const len = 44;
  const rockTex = canvasTex(256, 256, (c) => speckle(c, 256, 256, '#8c7f72', ['#6f6458', '#a39586', '#5c524a', '#b3a798'], 5000, 3), 1);
  rockTex.repeat.set(10, 1);
  const rock = std(0xffffff, { map: rockTex, roughness: 0.95 });
  // The stream: water in a stony bed, boulders along both banks.
  const water = std(0x5fa3c4, { roughness: 0.08, metalness: 0.35, emissive: 0x0b3a52, emissiveIntensity: 0.25 });
  g.add(box(len, 0.12, 1.3, rock, 0, -0.02, z + 0.2));
  g.add(plane(len, 0.95, water, 0, 0.05, z + 0.2));
  const boulder = std(0x9a8f84, { roughness: 0.95, flatShading: true });
  for (let k = 0; k < 46; k++) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14 + rnd() * 0.22, 0), boulder);
    b.position.set(-len / 2 + rnd() * len, 0.05, z + 0.2 + (rnd() < 0.5 ? -0.55 : 0.55) + (rnd() - 0.5) * 0.2);
    b.scale.y = 0.6; b.rotation.set(rnd() * 3, rnd() * 3, 0); b.castShadow = true; g.add(b);
  }
  // Wooden footbridges over the stream.
  const wood = std(0x7c4a21, { roughness: 0.8 }), woodDark = std(0x5a3416, { roughness: 0.85 });
  for (const x of [-9, 4.5]) {
    g.add(box(1.0, 0.08, 1.6, wood, x, 0.2, z + 0.2, 0.02));
    for (const sx of [-0.48, 0.48]) g.add(box(0.05, 0.3, 1.6, woodDark, x + sx, 0.38, z + 0.2));
  }
  // Terraces: stone retaining walls stepping up the hill.
  const tiers = [{ dz: -1.6, h: 0.7 }, { dz: -4.4, h: 1.8 }, { dz: -7.2, h: 3.0 }];
  const kilim = canvasTex(256, 128, (c) => {
    c.fillStyle = '#9f1d1d'; c.fillRect(0, 0, 256, 128);
    c.strokeStyle = '#1e3a8a'; c.lineWidth = 10; c.strokeRect(8, 8, 240, 112);
    c.fillStyle = '#f5deb3';
    for (let x = 30; x < 240; x += 40) { c.beginPath(); c.moveTo(x, 64 - 26); c.lineTo(x + 16, 64); c.lineTo(x, 64 + 26); c.lineTo(x - 16, 64); c.fill(); }
    c.fillStyle = '#d97706'; for (let x = 30; x < 240; x += 40) { c.beginPath(); c.moveTo(x, 64 - 10); c.lineTo(x + 6, 64); c.lineTo(x, 64 + 10); c.lineTo(x - 6, 64); c.fill(); }
  });
  const kilimMat = std(0xffffff, { map: kilim, roughness: 0.9 });
  const bolsters = [0xb91c1c, 0xb45309, 0x7c2d12];
  const bulbCols = [0xfff1b8, 0xffb4a0, 0xb8f0ff, 0xfff1b8];
  tiers.forEach((t, ti) => {
    const tz = z + t.dz;
    g.add(box(len, t.h, 2.8, rock, 0, t.h / 2, tz - 0.4));
    // Teahouse daybeds along the terrace edge.
    for (let x = -len / 2 + 2 + rnd() * 2; x < len / 2 - 2; x += 2.6 + rnd() * 1.4) {
      if (ti === 0 && Math.abs(x + 9) < 1.3) continue;
      const tk = new THREE.Group();
      tk.add(box(1.5, 0.08, 0.95, wood, 0, 0.32, 0, 0.02));
      for (const lx of [-0.68, 0.68]) for (const lz of [-0.4, 0.4]) tk.add(box(0.07, 0.3, 0.07, woodDark, lx, 0.15, lz));
      const rug = plane(1.42, 0.88, kilimMat, 0, 0.365, 0); tk.add(rug);
      for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.3, 4, 8), std(bolsters[(k + ti) % 3])); b.rotation.z = Math.PI / 2; b.position.set(-0.45 + k * 0.45, 0.44, -0.36); tk.add(b); }
      if (rnd() < 0.5) {
        // A brass samovar and tea glasses.
        const brass = std(0xd4a017, { metalness: 0.8, roughness: 0.3 });
        const sam = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.22, 10), brass); sam.position.set(0.5, 0.48, 0.1); tk.add(sam);
        const lid = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), brass); lid.position.set(0.5, 0.62, 0.1); tk.add(lid);
        for (let k = 0; k < 3; k++) { const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.015, 0.05, 6), std(0x9a3412, { roughness: 0.2 })); gl.position.set(0.1 + k * 0.08, 0.39, 0.15); tk.add(gl); }
      }
      // Awning on four poles with a string of lights.
      for (const lx of [-0.75, 0.75]) for (const lz of [-0.48, 0.48]) tk.add(box(0.04, 1.4, 0.04, woodDark, lx, 0.7, lz));
      const roofCol = [0x0f766e, 0xb91c1c, 0x1e3a8a, 0xca8a04][Math.floor(rnd() * 4)];
      tk.add(box(1.7, 0.05, 1.15, std(roofCol, { roughness: 0.7 }), 0, 1.42, 0, 0.02));
      for (let k = 0; k < 7; k++) {
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), std(bulbCols[k % 4], { emissive: bulbCols[k % 4], emissiveIntensity: night ? 3 : 0.6 }));
        bulb.position.set(-0.75 + k * 0.25, 1.33 - Math.sin((k / 6) * Math.PI) * 0.1, 0.5); tk.add(bulb);
      }
      tk.position.set(x, t.h, tz + 0.55);
      tk.rotation.y = (rnd() - 0.5) * 0.1;
      g.add(tk);
      if (night) { const p = lightPool(1.3, 0xffd9a0, 0.5); p.position.set(x, t.h + 0.02, tz + 0.55); g.add(p); }
    }
    // Autumn trees behind each terrace's teahouses.
    for (let x = -len / 2 + rnd() * 3; x < len / 2; x += 3 + rnd() * 3) {
      const tr = chenar(0.8 + rnd() * 0.45, false, true); tr.position.set(x, t.h, tz - 1.0 - rnd() * 0.6); g.add(tr);
    }
  });
  // The «دربند» sign at the foot of the path.
  const sign = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 0.08), [wood, wood, wood, wood, std(0xffffff, { map: label('دربند', '#7c2d12', '#fde68a') }), wood]);
  sign.position.set(-9, 1.5, z + 1.1); g.add(sign);
  for (const sx of [-1.0, 1.0]) g.add(box(0.08, 1.5, 0.08, woodDark, -9 + sx, 0.75, z + 1.1));
  g.traverse((m) => { const mm = m as THREE.Mesh; if (mm.isMesh && mm.material !== water) { mm.castShadow = true; mm.receiveShadow = true; } });
  return g;
}

/** A blossoming tree for spring: pink or white puffs on a dark trunk. */
function blossom(s: number, white = false): THREE.Group {
  const t = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, 1.3, 7), std(0x5b4636, { roughness: 0.9 })); trunk.position.y = 0.65; t.add(trunk);
  const a = std(white ? 0xfdf2f8 : 0xf9a8d4, { roughness: 0.75, flatShading: true }), b = std(white ? 0xffffff : 0xfbcfe8, { roughness: 0.75, flatShading: true });
  for (const [x, y, z, r, k] of [[0, 1.6, 0, 0.7, 0], [0.45, 1.4, 0.15, 0.5, 1], [-0.42, 1.45, -0.1, 0.52, 1], [0.05, 1.95, 0.05, 0.48, 0]]) {
    const p = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), k ? b : a); p.position.set(x, y, z); t.add(p);
  }
  t.traverse((m) => { m.castShadow = true; });
  t.scale.setScalar(s);
  return t;
}

/**
 * «پل طبیعت»: Tehran's Tabiat Bridge, a curving two-deck steel and timber walkway on branching
 * tree-like columns, spanning the Modares highway between two parks.
 */
function tabiatBridge(z0: number, rnd: () => number): THREE.Group {
  const g = new THREE.Group();
  const steel = std(0xdfe3e8, { metalness: 0.55, roughness: 0.35 }), timber = std(0xb08a5a, { roughness: 0.7 }), dark = std(0x8b949e, { metalness: 0.5, roughness: 0.4 });
  const N = 40, span = 40;
  const path = (u: number, level: number) => new THREE.Vector3(-span / 2 + u * span, level, z0 + Math.sin(u * Math.PI * 1.6 + 0.4) * 2.2);
  for (const [level, from, to, wdt] of [[5.2, 0, 1, 2.4], [3.2, 0.18, 0.82, 2.0]] as const) {
    for (let k = 0; k < N; k++) {
      const u0 = k / N, u1 = (k + 1) / N;
      if (u1 < from || u0 > to) continue;
      const a = path(u0, level), b = path(u1, level), mid = a.clone().add(b).multiplyScalar(0.5), len = a.distanceTo(b);
      const yaw = Math.atan2(-(b.z - a.z), b.x - a.x);
      const seg = new THREE.Group(); seg.position.copy(mid); seg.rotation.y = yaw;
      seg.add(box(len + 0.05, 0.14, wdt, timber, 0, 0, 0));
      seg.add(box(len + 0.05, 0.3, wdt + 0.2, steel, 0, -0.22, 0));
      // Truss railings: a top rail and diagonals.
      for (const sz of [-wdt / 2, wdt / 2]) {
        seg.add(box(len + 0.05, 0.06, 0.06, steel, 0, 1.0, sz));
        const d = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.15, 0.05), dark); d.position.set(0, 0.5, sz); d.rotation.z = k % 2 ? 0.6 : -0.6; seg.add(d);
      }
      g.add(seg);
    }
  }
  // Canopy on the top deck at the middle, and planters.
  const c0 = path(0.5, 5.2);
  const canopy = box(6, 0.12, 3.2, std(0xf1f5f9, { roughness: 0.4 }), c0.x, 7.4, c0.z); g.add(canopy);
  for (const dx of [-2.6, 2.6]) for (const dz of [-1.3, 1.3]) g.add(box(0.1, 2.2, 0.1, steel, c0.x + dx, 6.3, c0.z + dz));
  // Branching "tree" columns.
  for (let k = 1; k < 8; k++) {
    const u = k / 8, top = path(u, 5.0), base = new THREE.Vector3(top.x, 0, top.z);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 2.2, 10), steel); trunk.position.set(base.x, 1.1, base.z); g.add(trunk);
    for (let b = 0; b < 4; b++) {
      const a = (b / 4) * Math.PI * 2 + 0.4, end = new THREE.Vector3(top.x + Math.cos(a) * 1.4, top.y - 0.35, top.z + Math.sin(a) * 1.0), st = new THREE.Vector3(base.x, 2.1, base.z);
      const dir = end.clone().sub(st), br = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, dir.length(), 8), steel);
      br.position.copy(st.clone().add(end).multiplyScalar(0.5)); br.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()); g.add(br);
    }
  }
  // Ramps down to the parks at both ends.
  for (const u of [0, 1]) {
    const p = path(u, 0), r2 = box(3, 0.2, 2.4, timber, p.x + (u ? 1.4 : -1.4), 2.6, p.z); r2.rotation.z = u ? -0.9 : 0.9; g.add(r2);
  }
  // The highway underneath, with traffic.
  const hw = new THREE.Mesh(new THREE.PlaneGeometry(6, 16), std(0x3d4249, { roughness: 0.95 })); hw.rotation.x = -Math.PI / 2; hw.position.set(2, 0.04, z0 - 5); g.add(hw);
  const carCols = [0xffffff, 0xd32f2f, 0xf2c230, 0x1565c0, 0x9e9e9e];
  for (let k = 0; k < 6; k++) { const c = box(0.8, 0.5, 1.7, std(carCols[k % 5], { roughness: 0.4, metalness: 0.3 }), 2 + (k % 2 ? 1.3 : -1.3), 0.3, z0 - 12 + k * 2.6 + rnd(), 0.12); g.add(c); }
  // The parks: lawns and blossoms.
  for (let k = 0; k < 22; k++) {
    const x = -20 + rnd() * 40;
    if (Math.abs(x - 2) < 4) continue;
    const t = rnd() < 0.55 ? blossom(0.9 + rnd() * 0.5, rnd() < 0.35) : chenar(0.9 + rnd() * 0.4);
    t.position.set(x, 0, z0 + (rnd() < 0.5 ? 3.2 : -3.5) - rnd() * 3); g.add(t);
  }
  g.traverse((m) => { const mm = m as THREE.Mesh; if (mm.isMesh) { mm.castShadow = true; mm.receiveShadow = true; } });
  return g;
}

/** «شب یلدا» fruit stand: a pyramid of pomegranates, watermelons (one cut open) and a lantern. */
function yaldaStand(rnd: () => number): THREE.Group {
  const g = new THREE.Group();
  const wood = std(0x8b5a2b, { roughness: 0.8 });
  g.add(box(1.3, 0.3, 0.7, wood, 0, 0.15, 0, 0.02));
  const skin = std(0xa3122a, { roughness: 0.45 }), crown = std(0x6b0f1a, { roughness: 0.6 });
  const pom = new THREE.SphereGeometry(0.085, 10, 8), crownGeo = new THREE.ConeGeometry(0.025, 0.04, 5);
  // Pomegranates stacked in a pyramid on the left half.
  for (let layer = 0; layer < 3; layer++) {
    const n = 3 - layer;
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) {
      const x = -0.5 + (a + layer * 0.5) * 0.16, z = -0.2 + (b + layer * 0.5) * 0.16, y = 0.38 + layer * 0.13;
      const p = new THREE.Mesh(pom, skin); p.position.set(x, y, z); p.scale.y = 0.92; g.add(p);
      const c = new THREE.Mesh(crownGeo, crown); c.position.set(x, y + 0.09, z); g.add(c);
    }
  }
  // A split pomegranate showing its seeds.
  const half = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), skin); half.rotation.x = Math.PI; half.position.set(-0.05, 0.4, 0.22); g.add(half);
  const seeds = new THREE.Mesh(new THREE.CircleGeometry(0.095, 14), std(0xd61f45, { roughness: 0.2, emissive: 0x5a0010, emissiveIntensity: 0.3 })); seeds.rotation.x = -Math.PI / 2; seeds.position.set(-0.05, 0.401, 0.22); g.add(seeds);
  // Watermelons on the right, one cut in half.
  const rind = canvasTex(128, 64, (c) => { c.fillStyle = '#2f6b2a'; c.fillRect(0, 0, 128, 64); c.fillStyle = '#4f9a3c'; for (let x = 0; x < 128; x += 16) { c.beginPath(); c.moveTo(x, 0); for (let y = 0; y <= 64; y += 8) c.lineTo(x + 4 + Math.sin(y * 0.4) * 3, y); c.lineTo(x + 8, 64); c.lineTo(x + 6, 0); c.fill(); } });
  const melon = std(0xffffff, { map: rind, roughness: 0.5 });
  for (const [x, z] of [[0.3, -0.12], [0.5, 0.1]]) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), melon); m.scale.set(1, 0.85, 1.15); m.position.set(x, 0.44, z); m.rotation.y = rnd() * 3; g.add(m); }
  const cut = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), melon); cut.rotation.x = Math.PI / 2; cut.position.set(0.18, 0.47, 0.18); g.add(cut);
  const flesh = new THREE.Mesh(new THREE.CircleGeometry(0.16, 16), std(0xe23b4a, { roughness: 0.4 })); flesh.position.set(0.18, 0.47, 0.181); g.add(flesh);
  // A hanging lantern.
  g.add(box(0.04, 1.1, 0.04, wood, 0.62, 0.85, -0.3));
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.18, 8), std(0xffb347, { emissive: 0xff7a1a, emissiveIntensity: 2.5, roughness: 0.3 }));
  lamp.position.set(0.62, 1.32, -0.3); g.add(lamp);
  g.traverse((m) => { m.castShadow = true; });
  return g;
}

/** Pavement trade: a fruit cart, stacked carpets, spice sacks. */
function streetStall(kind: number): THREE.Group {
  const g = new THREE.Group();
  if (kind === 0) {
    const sacks = ['#c2410c', '#ca8a04', '#7c2d12', '#15803d'];
    sacks.forEach((col, i) => { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.36, 10), std(0xd6c3a0)); s.position.set(i * 0.42 - 0.6, 0.18, 0); g.add(s); const top = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), std(parseInt(col.slice(1), 16))); top.position.set(i * 0.42 - 0.6, 0.36, 0); g.add(top); });
  } else {
    const cols = [0x991b1b, 0x1e3a8a, 0x92400e, 0x065f46];
    for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.7), std(cols[i])); r.position.set(0, 0.04 + i * 0.08, 0); r.rotation.y = (i - 1.5) * 0.06; g.add(r); }
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
  const night = !!opts.night, snow = !!opts.snow;
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const L = layout(w, h, bays);
  const g = new THREE.Group();
  const add = <T extends THREE.Object3D>(o: T) => { g.add(o); return o; };
  const cx = 0, lotCZ = L.lotH / 2;

  // Ground.
  const grass = snow ? canvasTex(256, 256, (g2) => speckle(g2, 256, 256, '#eef3f7', ['#dfe7ee', '#ffffff', '#cdd8e2'], 6000, 2), 1) : grassTex(); grass.repeat.set(30, 30);
  add(plane(120, 120, std(0xffffff, { map: grass, roughness: snow ? 0.95 : 0.85 }), 0, -0.02, 0));
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
    const t = chenar(0.85 + rnd() * 0.3, snow, !!opts.autumn); t.position.set(x, 0.18, L.walkZ - 0.85 + rnd() * 0.2); add(t);
  }
  const tones = ['#e6dccb', '#d9cbb3', '#efe2c8', '#e2d2bd', '#d8d0c4'];
  const bricks = ['#a8613f', '#b5714d', '#9c5638', '#c07f5a'];
  const facadeOf = (i: number): [string, Style] => (rnd() < 0.4 ? [bricks[i % bricks.length], 'brick'] : [tones[i % tones.length], 'stone']);
  if (opts.landmark === 'bazaar') {
    add(bazaarRow(L.walkZ - 3.0, rnd));
    for (let k = 0; k < 4; k++) { const st = streetStall(k % 2); st.position.set(-9 + k * 2.6 + (k > 1 ? 6 : 0), 0.18, L.walkZ - 0.9); add(st); }
  }
  const darband = opts.landmark === 'darband', tabiat = opts.landmark === 'tabiat';
  if (tabiat) {
    // A lawn behind the sidewalk with a row of blossoms, the bridge beyond.
    const lawn = canvasTex(256, 256, (c) => speckle(c, 256, 256, '#6fae4f', ['#5f9a42', '#84c062', '#4f8a38'], 5000, 2), 1); lawn.repeat.set(10, 3);
    add(plane(60, 7, std(0xffffff, { map: lawn }), 0, 0.03, L.walkZ - 4.6));
    add(tabiatBridge(L.walkZ - 6.5, rnd));
  }
  if (darband) add(darbandSlope(L.walkZ - 1.9, rnd, night));
  for (let x = -18, i = 0; x < 18 && opts.landmark !== 'bazaar' && !darband && !tabiat; i++) {
    const bw = 2.2 + rnd() * 1.4, floors = 4 + Math.floor(rnd() * 4);
    const [tone, style] = facadeOf(i);
    const b = apartment(bw, floors, tone, style, rnd, night, snow);
    b.position.set(x + bw / 2, 0, L.walkZ - 3.2 - rnd() * 0.6);
    add(b);
    x += bw + 0.15;
  }
  // Second row and the skyline.
  for (let x = -24, i = 0; x < 24 && !darband; i++) {
    const bw = 2.6 + rnd() * 2, floors = 7 + Math.floor(rnd() * 6);
    const [tone, style] = facadeOf(i + 3);
    const b = apartment(bw, floors, tone, style, rnd, night, snow);
    b.position.set(x + bw / 2, 0, L.walkZ - (tabiat ? 21 : 7.5) - rnd() * 2); add(b);
    x += bw + 0.4;
  }
  const lm = opts.landmark ?? 'both';
  const milad = miladTower();
  if (lm === 'tochal' || lm === 'darband') milad.visible = false;
  if (lm === 'tabiat') { milad.scale.setScalar(1.1); milad.position.set(-12, 0, L.walkZ - 30); }
  if (lm === 'milad') { milad.scale.setScalar(1.25); milad.position.set(2.5, 0, L.walkZ - 24); } else { milad.scale.setScalar(0.9); milad.position.set(7, 0, L.walkZ - 26); }
  add(milad);
  const azadi = azadiTower();
  if (lm === 'azadi') { azadi.scale.setScalar(2.4); azadi.position.set(0, 0, L.walkZ - 19); azadi.rotation.y = 0; } else { azadi.scale.setScalar(1.1); azadi.position.set(-8, 0, L.walkZ - 22); azadi.rotation.y = 0.35; }
  add(azadi);
  if (lm === 'tabiat') azadi.visible = false;
  if (lm === 'darband') {
    azadi.visible = false;
    // The valley closes in: steep autumn slopes on both sides, the peaks behind.
    const slope = [0x8a6a3e, 0x9c6b2f, 0x7a5a35, 0xa57a3c];
    for (let k = 0; k < 9; k++) {
      const hh = 9 + rnd() * 8, rr = 7 + rnd() * 4;
      const m = new THREE.Mesh(new THREE.ConeGeometry(rr, hh, 7), std(slope[k % 4], { roughness: 1, flatShading: true }));
      m.position.set(-28 + k * 7 + rnd() * 2, hh / 2 - 0.5, L.walkZ - 18 - rnd() * 6); g.add(m);
      for (let j = 0; j < 5; j++) {
        const tr = chenar(1.4 + rnd(), false, true);
        const a = rnd() * Math.PI * 2, d = rr * (0.45 + rnd() * 0.4);
        tr.position.set(m.position.x + Math.cos(a) * d, (1 - d / rr) * hh - 0.6, m.position.z + Math.abs(Math.sin(a)) * d * 0.9);
        g.add(tr);
      }
    }
  }
  if (lm === 'tochal') {
    // Tochal: a big snowy peak with the cable car climbing to it.
    const peak = new THREE.Mesh(new THREE.ConeGeometry(18, 26, 9), std(0x9fb3c8, { roughness: 1, flatShading: true }));
    peak.position.set(6, 13, L.walkZ - 34); g.add(peak);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(10, 14.5, 9), std(0xffffff, { roughness: 0.9, flatShading: true }));
    cap.position.set(6, 19.6, L.walkZ - 34); g.add(cap);
    const a = new THREE.Vector3(-9, 0, L.walkZ - 12), b = new THREE.Vector3(4, 21, L.walkZ - 31);
    const towerMat = std(0x64748b, { metalness: 0.6, roughness: 0.4 });
    for (let k = 0; k <= 3; k++) {
      const p = a.clone().lerp(b, k / 3);
      const tw = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.25, p.y + 2.5, 6), towerMat); tw.position.set(p.x, (p.y + 2.5) / 2 - 0.5, p.z); g.add(tw);
    }
    const dir = b.clone().sub(a), len = dir.length();
    for (const off of [-0.25, 0.25]) {
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, len, 4), std(0x1f2937));
      cable.position.copy(a.clone().add(b).multiplyScalar(0.5)).add(new THREE.Vector3(off, 2, 0));
      cable.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()); g.add(cable);
    }
    for (let k = 1; k < 8; k++) {
      const p = a.clone().lerp(b, k / 8).add(new THREE.Vector3(0, 1.45, 0));
      const cab = new THREE.Mesh(new RoundedBoxGeometry(0.6, 0.55, 0.5, 2, 0.1), std(k % 2 ? 0xdc2626 : 0xf59e0b, { roughness: 0.4 }));
      cab.position.copy(p); g.add(cab);
    }
  }
  if (snow) {
    // Plowed snow piled along the kerbs.
    const pile = std(0xf8fbfd, { roughness: 0.95, flatShading: true });
    for (let k = 0; k < 26; k++) {
      const side = k % 2 ? 1 : -1, z = (k / 26) * (L.lotH + 2) - 1;
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45 + rnd() * 0.4, 1), pile);
      m.scale.set(1.4, 0.45, 1); m.position.set(side * (L.lotW / 2 + CURB + ROAD + 0.4 + rnd() * 0.4), 0.05, z); g.add(m);
    }
  }
  if (night) {
    // Floodlit monuments and pools of lamplight.
    const flood = (o: THREE.Object3D, r: number) => { const p = lightPool(r, 0x9fc4ff, 0.5); p.position.set(o.position.x, 0.05, o.position.z + 1); g.add(p); };
    flood(azadi, lm === 'azadi' ? 9 : 5); flood(milad, 4);
    azadi.traverse((m) => { const mm = m as THREE.Mesh; if (mm.isMesh) { const mat = (mm.material as THREE.MeshStandardMaterial).clone(); mat.emissive = new THREE.Color(0x7fa6ff); mat.emissiveIntensity = 0.35; mm.material = mat; } });
    milad.traverse((m) => { const mm = m as THREE.Mesh; if (mm.isMesh) { const mat = (mm.material as THREE.MeshStandardMaterial).clone(); mat.emissive = new THREE.Color(0xc9a3ff); mat.emissiveIntensity = 0.45; mm.material = mat; } });
  }
  const mtn = std(0x8fa5bf, { roughness: 1, flatShading: true }), snowCap = std(0xffffff, { roughness: 0.9, flatShading: true });
  for (const [x, hh, r] of [[-34, 18, 15], [-14, 24, 17], [6, 20, 15], [26, 26, 18], [46, 17, 13]]) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, hh, 7), mtn); m.position.set(x, hh / 2, L.walkZ - 52); g.add(m);
    const sn = new THREE.Mesh(new THREE.ConeGeometry(r * 0.34, hh * 0.34, 7), snowCap); sn.position.set(x, hh - hh * 0.17 + 0.05, L.walkZ - 52); g.add(sn);
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
  if (opts.yalda) {
    // Yalda night: fruit stands, a banner and strings of red and amber lights over the sidewalk.
    for (const x of [-11, -5.5, 6.5, 12]) { const st = yaldaStand(rnd); st.position.set(x, 0.18, L.walkZ - 0.25); st.rotation.y = (rnd() - 0.5) * 0.2; add(st); const p = lightPool(1.6, 0xffa060, 0.6); p.position.set(x, 0.2, L.walkZ + 0.1); g.add(p); }
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 0.8), std(0xffffff, { map: label('شب یلدا مبارک', '#7f1d1d', '#fde68a', 768, 112, 72), emissive: 0x3a0a0a, emissiveIntensity: 0.4, side: THREE.DoubleSide }));
    banner.position.set(0.5, 3.5, L.walkZ - 0.6); g.add(banner);
    for (const sx of [-2.8, 2.8]) add(box(0.07, 3.9, 0.07, std(0x3f2a1a), 0.5 + sx, 1.95, L.walkZ - 0.6));
    const bulbs = [0xff3b3b, 0xffb347, 0xff3b3b, 0xffe08a];
    for (let x = -16, k = 0; x < 16; x += 0.5, k++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), std(bulbs[k % 4], { emissive: bulbs[k % 4], emissiveIntensity: 3 }));
      b.position.set(x, 2.55 - Math.abs(Math.sin(((x + 16) / 4.2) * Math.PI)) * 0.35, L.walkZ - 0.7); g.add(b);
    }
  }
  const tl = trafficLight(); tl.position.set(L.bayX[0] + 3.0, 0.18, L.walkZ + 0.85); add(tl);

  if (opts.boulevard) {
    // Valiasr: a double row of old plane trees.
    for (let x = -16; x <= 16; x += 2.2 + rnd() * 0.6) { const t = chenar(1.15 + rnd() * 0.3, snow); t.position.set(x, 0, L.walkZ - 2.3 + rnd() * 0.3); add(t); }
  }
  if (night) {
    // Floodlights over the lot and the bays.
    for (const [x, z, r] of [[0, L.lotH / 2, Math.max(L.lotW, L.lotH) * 0.75], [0, L.bayZ, 5.5]] as const) { const p = lightPool(r, 0xffe6b8, 0.5); p.position.set(x, 0.13, z); g.add(p); }
  }

  // Trees on the grass around the lot.
  for (let i = 0; i < 18; i++) {
    const side = i % 2 ? 1 : -1, z = rnd() * (L.lotH + 6) - 1;
    const x = side * (L.lotW / 2 + CURB + ROAD + 1.2 + rnd() * 3.5);
    const t = chenar(0.8 + rnd() * 0.4, snow); t.position.set(x, 0, z); add(t);
  }
  // Everything here is static: merge it into one mesh per material to keep draw calls low.
  const baked = bake(g);
  baked.traverse((m) => { (m as THREE.Mesh).receiveShadow = true; });
  return { group: baked, L };
}
