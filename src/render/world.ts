/**
 * The Tajrish diorama around a level: the parking lot, the ring road, the pickup bays, the bus stop
 * sidewalk with its queue, and the city behind. Also owns the coordinate helpers the game uses.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CELL } from './fleet';

export const ROAD = 1.8; // ring road width
export const CURB = 0.22;
export const BAY_W = 1.36;
export const BAY_D = 2.7;
export const LOT_Y = 0.08;

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

export function sky(): THREE.Texture {
  return canvasTex(4, 512, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0, '#4b93dd'); gr.addColorStop(0.5, '#9dcff7'); gr.addColorStop(0.85, '#e8eef2'); gr.addColorStop(1, '#f7e7cf');
    g.fillStyle = gr; g.fillRect(0, 0, 4, 512);
  }, 1);
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

/** A Tehran apartment block: stone facade, window bands, balconies with railings, rooftop tanks. */
function apartment(w: number, floors: number, tone: string, rnd: () => number): THREE.Group {
  const g = new THREE.Group();
  const fh = 0.62, h = floors * fh + 0.3, d = 1.8;
  const facade = canvasTex(256, 64 * floors, (c) => {
    c.fillStyle = tone; c.fillRect(0, 0, 256, 64 * floors);
    for (let i = 0; i < 1200; i++) { c.globalAlpha = 0.08; c.fillStyle = rnd() < 0.5 ? '#000' : '#fff'; c.fillRect(rnd() * 256, rnd() * 64 * floors, 3, 2); }
    c.globalAlpha = 1;
    for (let f = 0; f < floors; f++) {
      const y = f * 64;
      const ground = f === floors - 1;
      if (ground) {
        // Shops: a roller shutter and a lit sign.
        c.fillStyle = '#5b6470'; c.fillRect(14, y + 18, 110, 44); c.fillStyle = '#c9ccd1'; for (let k = 0; k < 9; k++) c.fillRect(14, y + 20 + k * 5, 110, 2);
        c.fillStyle = '#20324a'; c.fillRect(140, y + 18, 100, 44); c.fillStyle = 'rgba(255,230,160,.85)'; c.fillRect(146, y + 24, 88, 32);
        c.fillStyle = ['#0b7a3b', '#b3261e', '#1d4ed8'][Math.floor(rnd() * 3)]; c.fillRect(8, y + 4, 240, 12);
      } else {
        for (let k = 0; k < 3; k++) {
          const x = 14 + k * 80;
          c.fillStyle = '#3d4f63'; c.fillRect(x, y + 12, 62, 38);
          c.fillStyle = rnd() < 0.35 ? '#f6dfa0' : '#8fb3d2'; c.fillRect(x + 3, y + 15, 27, 32); c.fillRect(x + 32, y + 15, 27, 32);
          if (rnd() < 0.3) { c.fillStyle = '#e7e2d6'; c.fillRect(x + 3, y + 15, 27, 16); } // curtain
        }
      }
    }
  });
  facade.wrapS = facade.wrapT = THREE.ClampToEdgeWrapping;
  const side = std(0xffffff, { color: new THREE.Color(tone).multiplyScalar(0.85) });
  const front = std(0xffffff, { map: facade });
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, std(0xd8d2c4), side, front, side]);
  body.position.y = h / 2; body.castShadow = body.receiveShadow = true; g.add(body);
  // Balconies on alternating floors.
  const rail = std(0x39424d, { metalness: 0.4, roughness: 0.5 });
  for (let f = 1; f < floors - 1; f++) {
    if (rnd() < 0.45) continue;
    const y = (floors - 1 - f) * fh + 0.3;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w * 0.42, 0.05, 0.35), std(0xcfc8b8)); slab.position.set((rnd() - 0.5) * w * 0.3, y, d / 2 + 0.17); g.add(slab);
    const r = new THREE.Mesh(new THREE.BoxGeometry(w * 0.42, 0.22, 0.02), rail); r.position.set(slab.position.x, y + 0.13, d / 2 + 0.34); g.add(r);
    if (rnd() < 0.5) { const pot = new THREE.Mesh(new THREE.IcosahedronGeometry(0.09, 0), std(0x4f8f3a, { flatShading: true })); pot.position.set(slab.position.x + 0.2, y + 0.1, d / 2 + 0.22); g.add(pot); }
  }
  // Rooftop: water tank, cooler «کولر آبی», satellite dish.
  const roofY = h;
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.4, 12), std(0xd9dde2, { metalness: 0.5, roughness: 0.4 })); tank.rotation.z = Math.PI / 2; tank.position.set(-w * 0.25, roofY + 0.2, 0); g.add(tank);
  const cooler = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 0.34), std(0xb7bdc4, { metalness: 0.3 })); cooler.position.set(w * 0.2, roofY + 0.15, 0.2); g.add(cooler);
  if (rnd() < 0.6) { const dish = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 6, 0, Math.PI * 2, 0, 0.9), std(0xeeeeee)); dish.rotation.x = -1.0; dish.position.set(w * 0.3, roofY + 0.25, -0.3); g.add(dish); }
  g.traverse((m) => { (m as THREE.Mesh).castShadow = true; });
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

export function buildWorld(w: number, h: number, bays: number, seed = 1): World {
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
  add(box(L.lotW + 2 * CURB, 0.12, L.lotH + 2 * CURB, curbMat, cx, LOT_Y - 0.06, lotCZ, 0.04));
  const lotTex = asphaltTex(); lotTex.repeat.set(L.lotW / 3, L.lotH / 3);
  add(plane(L.lotW, L.lotH, std(0xffffff, { map: lotTex, color: 0xb9bec8 }), cx, LOT_Y + 0.001, lotCZ));
  const gridMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16 });
  for (let i = 1; i < w; i++) add(plane(0.035, L.lotH - 0.1, gridMat, L.lotX0 + i * CELL, LOT_Y + 0.004, lotCZ));
  for (let i = 1; i < h; i++) add(plane(L.lotW - 0.1, 0.035, gridMat, cx, LOT_Y + 0.004, i * CELL));

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
  const sign = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.36, 0.06), [steel, steel, steel, steel, std(0xffffff, { map: label('ایستگاه تجریش', '#1e63d6', '#ffffff') }), steel]);
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
  const tones = ['#e6dccb', '#d9cbb3', '#cfd3d8', '#efe2c8', '#c9b9a0', '#e2d2bd'];
  for (let x = -18, i = 0; x < 18; i++) {
    const bw = 2.2 + rnd() * 1.4, floors = 4 + Math.floor(rnd() * 4);
    const b = apartment(bw, floors, tones[i % tones.length], rnd);
    b.position.set(x + bw / 2, 0, L.walkZ - 3.2 - rnd() * 0.6);
    add(b);
    x += bw + 0.15;
  }
  // Second row and the skyline.
  for (let x = -24, i = 0; x < 24; i++) {
    const bw = 2.6 + rnd() * 2, floors = 7 + Math.floor(rnd() * 6);
    const b = apartment(bw, floors, tones[(i + 3) % tones.length], rnd);
    b.position.set(x + bw / 2, 0, L.walkZ - 7.5 - rnd() * 2); add(b);
    x += bw + 0.4;
  }
  const milad = miladTower(); milad.scale.setScalar(0.9); milad.position.set(7, 0, L.walkZ - 26); add(milad);
  const azadi = azadiTower(); azadi.scale.setScalar(1.1); azadi.position.set(-8, 0, L.walkZ - 22); azadi.rotation.y = 0.35; add(azadi);
  const mtn = std(0x8fa5bf, { roughness: 1, flatShading: true }), snow = std(0xffffff, { roughness: 0.9, flatShading: true });
  for (const [x, hh, r] of [[-34, 18, 15], [-14, 24, 17], [6, 20, 15], [26, 26, 18], [46, 17, 13]]) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, hh, 7), mtn); m.position.set(x, hh / 2, L.walkZ - 52); g.add(m);
    const sn = new THREE.Mesh(new THREE.ConeGeometry(r * 0.34, hh * 0.34, 7), snow); sn.position.set(x, hh - hh * 0.17 + 0.05, L.walkZ - 52); g.add(sn);
  }
  // Trees on the grass around the lot.
  for (let i = 0; i < 18; i++) {
    const side = i % 2 ? 1 : -1, z = rnd() * (L.lotH + 6) - 1;
    const x = side * (L.lotW / 2 + CURB + ROAD + 1.2 + rnd() * 3.5);
    const t = chenar(0.8 + rnd() * 0.4); t.position.set(x, 0, z); add(t);
  }
  return { group: g, L };
}
