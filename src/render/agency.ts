/**
 * «آژانس آقاجون»: grandpa's run-down taxi agency in Tajrish, as a small diorama. Every renovation
 * the player buys swaps a "before" piece for an "after" one (dirty facade → fresh plaster, faded
 * board → neon sign, rusty Peykan → shiny one…). Real-world scale: metres, the street along +x.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CARS, buildCar, buildVanet } from './cars.js';

export interface Renovation { id: string; name: string; icon: string; cost: number; line: string }

/** In order: each one is unlocked after the previous. */
export const RENOVATIONS: Renovation[] = [
  { id: 'clean', name: 'جمع کردن آشغال‌ها', icon: '🧹', cost: 2, line: 'اول یه دستی به سر و روی پیاده‌رو بکشیم. آقاجون همیشه می‌گفت مشتری از دم در قضاوت می‌کنه!' },
  { id: 'paint', name: 'رنگ نمای ساختمون', icon: '🎨', cost: 3, line: 'نما رو کرم کردیم، درست مثل روزی که آقاجون آژانس رو باز کرد.' },
  { id: 'windows', name: 'شیشه‌های نو', icon: '🪟', cost: 3, line: 'دیگه باد از لای شیشه‌های شکسته نمی‌آد. خانم صبوری خیلی خوشحاله!' },
  { id: 'sign', name: 'تابلوی نئون', icon: '💡', cost: 4, line: '«آژانس آقاجون» حالا شب‌ها از سر تجریش هم دیده می‌شه!' },
  { id: 'awning', name: 'سایبون راه‌راه', icon: '⛱️', cost: 4, line: 'یه سایبون قرمز و سفید، که راننده‌ها زیرش چای بخورن.' },
  { id: 'bench', name: 'نیمکت و سماور', icon: '🫖', cost: 4, line: 'سماور آقاجون رو از انباری درآوردیم. چای تازه‌دم برای همه!' },
  { id: 'flowers', name: 'گلدون‌های شمعدونی', icon: '🌺', cost: 3, line: 'مادربزرگ عاشق شمعدونی بود. حالا جلوی در پر از گلدونه.' },
  { id: 'desk', name: 'میز و بی‌سیم', icon: '📻', cost: 5, line: 'یه بی‌سیم نو برای خانم صبوری. «ماشین سه، تجریش، یه مسافر دربستی!»' },
  { id: 'tree', name: 'چنار جلوی در', icon: '🌳', cost: 4, line: 'یه نهال چنار کاشتیم. صد سال دیگه سایه‌ش به نوه‌هات می‌رسه.' },
  { id: 'peykan', name: 'پیکان آقاجون', icon: '🚗', cost: 6, line: 'پیکان سفید آقاجون رو از نو رنگ کردیم. هنوز بوی صندلی‌هاش همونه!' },
  { id: 'lights', name: 'چراغ‌های ریسه', icon: '✨', cost: 4, line: 'ریسه‌ها روشن شدن. حالا آژانس شب‌ها هم شلوغه!' },
  { id: 'pride', name: 'یه پراید نو برای ناوگان', icon: '🚕', cost: 8, line: 'اولین ماشین نوی آژانس! آقای عجول از حسودی ترکید!' },
  // Phase 2: the neighbourhood around the agency.
  { id: 'mural', name: 'نقاشی دیواری', icon: '🖼️', cost: 5, line: 'بچه‌های محل رو دیوار همسایه دماوند رو کشیدن، با یه پیکان که داره می‌ره شمال!' },
  { id: 'bakery', name: 'نونوایی سنگکی', icon: '🥖', cost: 6, line: 'نونوایی کناری دوباره باز شد. صبح‌ها کل محل بوی سنگک تازه می‌ده!' },
  { id: 'saqqa', name: 'سقاخونه', icon: '🕯️', cost: 6, line: 'سقاخونه‌ی سر کوچه رو کاشی کردیم. شب‌های جمعه همسایه‌ها شمع روشن می‌کنن.' },
  { id: 'lamps', name: 'چراغ‌های خیابون', icon: '🏮', cost: 5, line: 'دو تا چراغ سبز قدیمی تهرون، درست مثل عکس‌های قدیمی آقاجون.' },
  { id: 'kiosk', name: 'دکه‌ی روزنامه‌فروشی', icon: '📰', cost: 6, line: 'آقا مهدی دکه‌ش رو آورد جلوی آژانس. راننده‌ها صبح‌ها روزنامه می‌خونن.' },
  { id: 'juice', name: 'آبمیوه‌فروشی', icon: '🍊', cost: 7, line: 'آب‌پرتقال و آب‌انار تازه! مسافرها تا ماشین برسه یه لیوان می‌زنن.' },
  { id: 'roof', name: 'باغچه‌ی پشت‌بوم', icon: '🍇', cost: 7, line: 'رو پشت‌بوم داربست انگور زدیم. تابستون‌ها اونجا شام می‌خوریم!' },
  { id: 'jube', name: 'جوی آب و پل‌چوبی', icon: '💧', cost: 6, line: 'جوی رو لایروبی کردیم و آب زلال راه افتاد. بچه‌ها توش قایق کاغذی می‌ندازن.' },
  { id: 'pigeons', name: 'کبوترها و آبخوری', icon: '🕊️', cost: 5, line: 'یه آبخوری کوچیک گذاشتیم. حالا کبوترهای تجریش مهمون همیشگی آژانسن.' },
  { id: 'samand', name: 'سمند زرد تاکسی', icon: '🚖', cost: 9, line: 'یه سمند زرد به ناوگان اضافه شد. مش‌رحیم می‌گه از پیکان بهتر نیست، ولی سوارش می‌شه!' },
  { id: 'bus', name: 'ایستگاه اتوبوس', icon: '🚏', cost: 7, line: 'شهرداری یه ایستگاه اتوبوس جلوی آژانس زد. مسافر بیشتر، کار بیشتر!' },
  { id: 'vanet', name: 'پیکان وانت', icon: '🛻', cost: 10, line: 'یه پیکان وانت برای اسباب‌کشی مشتری‌ها. آژانس آقاجون حالا همه‌کاره‌ست!' },
];

/** The renovations come in two phases: the agency itself, then its neighbourhood. */
export const PHASE1 = 12;

const std = (color: number, o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o });
function tex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function box(w: number, h: number, d: number, m: THREE.Material | THREE.Material[], x: number, y: number, z: number, r = 0) {
  const b = new THREE.Mesh(r ? new RoundedBoxGeometry(w, h, d, 2, r) : new THREE.BoxGeometry(w, h, d), m);
  b.position.set(x, y, z);
  return b;
}

const W = 7, H = 6.4, D = 5; // the building
const FRONT = D / 2; // its street face, at z = FRONT

/** A plaster facade: dirty and cracked, or fresh cream with brick bands. */
function facade(fresh: boolean) {
  return tex(512, 512, (g) => {
    g.fillStyle = fresh ? '#efe2c6' : '#8f8a82'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2500; i++) { g.globalAlpha = 0.06; g.fillStyle = Math.random() < 0.5 ? '#000' : '#fff'; g.fillRect(Math.random() * 512, Math.random() * 512, 2, 2); }
    g.globalAlpha = 1;
    if (fresh) {
      g.fillStyle = '#b5714d';
      for (const y of [0, 248, 492]) for (let x = 0; x < 512; x += 24) g.fillRect(x + 1, y + 1, 22, 9), g.fillRect(x + 13, y + 11, 22, 9);
    } else {
      // Streaks, stains and cracks.
      for (let i = 0; i < 18; i++) { const x = Math.random() * 512, gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, 'rgba(40,35,30,.25)'); gr.addColorStop(1, 'rgba(40,35,30,0)'); g.fillStyle = gr; g.fillRect(x, 0, 6 + Math.random() * 10, 200 + Math.random() * 300); }
      g.strokeStyle = 'rgba(30,28,25,.55)'; g.lineWidth = 2;
      for (let i = 0; i < 7; i++) { let x = Math.random() * 512, y = Math.random() * 512; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (Math.random() - 0.5) * 40; y += 10 + Math.random() * 20; g.lineTo(x, y); } g.stroke(); }
    }
  });
}

/** Grandpa's agency in its current state. Each renovation's group is named by its id. */
export function buildAgency(done: Set<string>, night = false): THREE.Group {
  const root = new THREE.Group();
  const has = (id: string) => done.has(id);
  const piece = (id: string) => { const g = new THREE.Group(); g.name = id; root.add(g); return g; };

  // Street, kerb, sidewalk.
  const asphalt = tex(256, 256, (g) => { g.fillStyle = '#3d4249'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 4000; i++) { g.fillStyle = Math.random() < 0.5 ? '#2f3338' : '#4a5058'; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); } });
  asphalt.wrapS = asphalt.wrapT = THREE.RepeatWrapping; asphalt.repeat.set(6, 2);
  const street = new THREE.Mesh(new THREE.PlaneGeometry(26, 7), std(0xffffff, { map: asphalt, roughness: 0.95 })); street.rotation.x = -Math.PI / 2; street.position.set(0, 0, FRONT + 6.5); street.receiveShadow = true; root.add(street);
  for (let x = -12; x < 12; x += 2) { const l = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.12), std(0xf4d03f)); l.rotation.x = -Math.PI / 2; l.position.set(x, 0.01, FRONT + 7.5); root.add(l); }
  const paving = tex(256, 256, (g) => { g.fillStyle = '#c9c1b2'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#a89f8f'; g.lineWidth = 3; for (let x = 0; x <= 256; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); g.beginPath(); g.moveTo(0, x); g.lineTo(256, x); g.stroke(); } });
  paving.wrapS = paving.wrapT = THREE.RepeatWrapping; paving.repeat.set(13, 2);
  const walk = box(26, 0.16, 3, std(0xffffff, { map: paving }), 0, 0.08, FRONT + 1.5); walk.receiveShadow = true; root.add(walk);
  root.add(box(26, 0.2, 0.2, std(0xbfc4ca), 0, 0.1, FRONT + 3.0));
  root.add(box(26, 0.02, 0.25, std(0x5b87a6, { roughness: 0.15, metalness: 0.3 }), 0, 0.01, FRONT + 3.25)); // «جوی»
  // Neighbours on both sides, so the agency sits in a street.
  for (const [x, w, h, c] of [[-W / 2 - 3.2, 6.2, 9, 0xd9cbb3], [W / 2 + 3.4, 6.6, 7.5, 0xa8613f]] as const) {
    const n = box(w, h, D, std(c), x, h / 2, 0); n.castShadow = n.receiveShadow = true; root.add(n);
    for (let fy = 1; fy < h / 2.6; fy++) for (let k = 0; k < 3; k++) root.add(box(1.0, 1.3, 0.06, std(0x3a4a5c, { roughness: 0.2, metalness: 0.4 }), x - w / 2 + 1.1 + k * (w - 2.2) / 2, fy * 2.6 + 0.4, FRONT + 0.03));
  }

  // The building itself.
  const fresh = has('paint');
  const wall = std(0xffffff, { map: facade(fresh) }), side = std(fresh ? 0xe3d4b5 : 0x847f78);
  const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), [side, side, std(0x9aa0a6), side, wall, side]);
  body.position.set(0, H / 2, 0); body.castShadow = body.receiveShadow = true; root.add(body);
  root.add(box(W + 0.3, 0.25, D + 0.3, std(fresh ? 0xb5714d : 0x6e6a64), 0, H + 0.12, 0)); // parapet
  root.add(box(W + 0.1, 0.18, 0.4, std(fresh ? 0xb5714d : 0x6e6a64), 0, 3.15, FRONT + 0.15)); // floor band
  // Roof: water tank, aerial.
  root.add(box(1.2, 0.9, 1.0, std(0x9ca3af, { metalness: 0.4 }), 2.2, H + 0.7, -1, 0.05));
  const aerial = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 6), std(0x4b5563)); aerial.position.set(-2.4, H + 0.9, -0.5); root.add(aerial);

  // Windows: two upstairs, the big shop window and the door downstairs.
  const win = piece('windows');
  const glass = has('windows') ? std(night ? 0xffd89a : 0x8fb8d6, { roughness: 0.08, metalness: 0.5, emissive: night ? 0xffb860 : 0x000000, emissiveIntensity: night ? 0.8 : 0 }) : std(0x2b2f35, { roughness: 0.6 });
  const crack = tex(128, 128, (g) => { g.fillStyle = '#2b2f35'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#a3a8ae'; g.lineWidth = 2; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(60, 50); g.lineTo(Math.random() * 128, Math.random() * 128); g.stroke(); } g.fillStyle = '#6b4f2a'; g.fillRect(10, 70, 60, 50); });
  const broken = std(0xffffff, { map: crack, roughness: 0.6 });
  const frame = std(fresh ? 0x2f5d4a : 0x5c5248);
  for (const x of [-1.7, 1.7]) {
    win.add(box(1.5, 1.6, 0.12, frame, x, 4.6, FRONT + 0.02));
    win.add(box(1.3, 1.4, 0.05, has('windows') ? glass : x < 0 ? broken : glass, x, 4.6, FRONT + 0.08));
    win.add(box(1.7, 0.1, 0.3, std(fresh ? 0xd8cbb0 : 0x6e6a64), x, 3.75, FRONT + 0.15)); // sill
    // A little balcony rail.
    const rail = std(0x1f2937, { metalness: 0.6, roughness: 0.4 });
    win.add(box(1.7, 0.05, 0.05, rail, x, 4.25, FRONT + 0.45));
    for (let k = 0; k < 7; k++) win.add(box(0.03, 0.5, 0.03, rail, x - 0.8 + k * 0.266, 4.0, FRONT + 0.45));
  }
  win.add(box(3.6, 2.0, 0.12, frame, -1.2, 1.5, FRONT + 0.02));
  win.add(box(3.4, 1.8, 0.05, has('windows') ? glass : broken, -1.2, 1.5, FRONT + 0.08));
  win.add(box(1.3, 2.4, 0.12, frame, 2.2, 1.2, FRONT + 0.02));
  win.add(box(1.1, 2.25, 0.05, std(fresh ? 0x7c4a21 : 0x4a3a2c, { roughness: 0.7 }), 2.2, 1.2, FRONT + 0.08));
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), std(0xd4a017, { metalness: 0.8, roughness: 0.3 })); knob.position.set(1.8, 1.15, FRONT + 0.14); win.add(knob);

  // The sign: a faded painted board, or the neon «آژانس آقاجون».
  const signG = piece('sign');
  const neon = has('sign');
  const signTex = tex(1024, 192, (g) => {
    g.fillStyle = neon ? '#0b1a2e' : '#a39a86'; g.fillRect(0, 0, 1024, 192);
    g.font = '900 120px Vazirmatn'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'rtl';
    if (neon) { g.shadowColor = '#ffcf4d'; g.shadowBlur = 30; g.fillStyle = '#ffe08a'; g.fillText('آژانس آقاجون', 512, 100); g.shadowBlur = 0; g.strokeStyle = '#38bdf8'; g.lineWidth = 8; g.shadowColor = '#38bdf8'; g.shadowBlur = 20; g.strokeRect(18, 18, 988, 156); }
    else { g.fillStyle = 'rgba(70,60,50,.55)'; g.fillText('آژ نس آقا ون', 512, 104); for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(120,110,95,.6)'; g.fillRect(Math.random() * 1024, Math.random() * 192, 30 + Math.random() * 60, 6); } }
  });
  const signMat = std(0xffffff, { map: signTex, emissive: neon ? 0xffffff : 0x000000, emissiveMap: neon ? signTex : null, emissiveIntensity: neon ? (night ? 1.6 : 0.7) : 0 });
  const board = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.05, 0.12), [frame, frame, frame, frame, signMat, frame]);
  board.position.set(0, 2.95 + 0.55, FRONT + 0.3); board.rotation.z = neon ? 0 : 0.04; signG.add(board);
  if (neon) for (const x of [-2.6, 2.6]) signG.add(box(0.06, 0.06, 0.4, std(0x4b5563, { metalness: 0.7 }), x, 3.5, FRONT + 0.15));

  // Before the clean-up: rubbish bags, boxes and graffiti.
  const mess = piece('clean');
  if (!has('clean')) {
    const bag = std(0x111827, { roughness: 0.4 });
    for (const [x, z, s] of [[3.6, FRONT + 0.6, 0.45], [3.9, FRONT + 1.0, 0.38], [-3.3, FRONT + 0.5, 0.42]]) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), bag); b.scale.y = 0.75; b.position.set(x, 0.16 + s * 0.6, z); b.castShadow = true; mess.add(b); }
    for (let k = 0; k < 3; k++) { const b = box(0.6, 0.45, 0.5, std(0xa47b4a), -2.6 + k * 0.4, 0.4 + (k === 2 ? 0.45 : 0), FRONT + 1.3 - (k === 2 ? 0.2 : 0)); b.rotation.y = k * 0.4; b.castShadow = true; mess.add(b); }
    const graff = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.0), new THREE.MeshBasicMaterial({ transparent: true, map: tex(256, 128, (g) => { g.font = '900 64px sans-serif'; g.fillStyle = '#7c3aed'; g.fillText('XYZ', 20, 80); g.strokeStyle = '#ef4444'; g.lineWidth = 6; g.beginPath(); g.arc(200, 60, 30, 0, 5); g.stroke(); }) }));
    graff.position.set(2.0, 4.1, FRONT + 0.02); graff.visible = !has('paint'); mess.add(graff);
  }

  // Striped awning over the shop window.
  if (has('awning')) {
    const aw = piece('awning');
    const stripes = tex(256, 64, (g) => { for (let x = 0; x < 256; x += 32) { g.fillStyle = (x / 32) % 2 ? '#f8fafc' : '#c62828'; g.fillRect(x, 0, 32, 64); } });
    const cloth = std(0xffffff, { map: stripes, side: THREE.DoubleSide, roughness: 0.8 });
    const a = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 1.4), cloth); a.position.set(-1.2, 2.75, FRONT + 0.65); a.rotation.x = -Math.PI / 2 + 0.55; a.castShadow = true; aw.add(a);
    for (let k = 0; k < 8; k++) { const sc = new THREE.Mesh(new THREE.CircleGeometry(0.25, 10, 0, Math.PI), std(k % 2 ? 0xf8fafc : 0xc62828, { side: THREE.DoubleSide })); sc.rotation.z = Math.PI; sc.position.set(-3.0 + k * 0.5 + 0.25, 2.18, FRONT + 1.25); aw.add(sc); }
  }

  // Bench with grandpa's samovar.
  if (has('bench')) {
    const bn = piece('bench');
    const wood = std(0x8b5a2b), iron = std(0x1f2937, { metalness: 0.6 });
    bn.add(box(2.0, 0.08, 0.5, wood, -1.3, 0.62, FRONT + 1.0, 0.02), box(2.0, 0.4, 0.06, wood, -1.3, 0.95, FRONT + 0.78, 0.02));
    for (const x of [-2.2, -0.4]) bn.add(box(0.06, 0.5, 0.45, iron, x, 0.4, FRONT + 1.0));
    const brass = std(0xd4a017, { metalness: 0.85, roughness: 0.25 });
    const sam = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.42, 14), brass); sam.position.set(0.3, 0.88 - 0.25, FRONT + 1.0);
    const table = box(0.5, 0.5, 0.5, wood, 0.3, 0.41, FRONT + 1.0, 0.03);
    sam.position.y = 0.66 + 0.21; const pot = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), std(0xf8fafc, { roughness: 0.3 })); pot.position.set(0.3, 1.18, FRONT + 1.0);
    bn.add(table, sam, pot);
    for (let k = 0; k < 2; k++) { const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.09, 8), std(0x9a3412, { roughness: 0.15 })); gl.position.set(0.12 + k * 0.36, 0.71, FRONT + 1.2); bn.add(gl); }
  }

  // Geranium pots along the wall and in the windows.
  if (has('flowers')) {
    const fl = piece('flowers');
    const pot = std(0xb45309), leaf = std(0x2f7d32), red = std(0xe11d48);
    const add = (x: number, y: number, z: number) => {
      fl.add(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.13, 0.28, 10), pot).translateX(x).translateY(y + 0.14).translateZ(z));
      const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 1), leaf); bush.position.set(x, y + 0.38, z); fl.add(bush);
      for (let k = 0; k < 5; k++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), red); f.position.set(x + Math.cos(k * 1.3) * 0.15, y + 0.5 + (k % 2) * 0.05, z + Math.sin(k * 1.3) * 0.15); fl.add(f); }
    };
    for (const x of [-3.2, 0.95, 3.1]) add(x, 0.16, FRONT + 0.35);
    for (const x of [-2.2, -1.2, 1.2, 2.2]) add(x, 3.8, FRONT + 0.2);
  }

  // The dispatcher's desk and radio behind the shop window.
  if (has('desk')) {
    const dk = piece('desk');
    dk.add(box(2.0, 0.8, 0.8, std(0x7c4a21), -1.2, 0.4, FRONT - 0.7, 0.03));
    dk.add(box(0.5, 0.3, 0.3, std(0x111827), -1.6, 0.95, FRONT - 0.7, 0.03));
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.6, 5), std(0x111827)); ant.position.set(-1.45, 1.35, FRONT - 0.7); dk.add(ant);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 6), std(0xfff1c1, { emissive: 0xffd27a, emissiveIntensity: 1.2 })); lamp.position.set(-0.5, 1.1, FRONT - 0.7); dk.add(lamp);
    dk.add(box(0.06, 0.3, 0.06, std(0x111827), -0.5, 0.9, FRONT - 0.7));
  }

  // A young plane tree in a grate.
  if (has('tree')) {
    const tr = piece('tree');
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 2.6, 8), std(0xb9ae94)); trunk.position.set(4.6, 1.45, FRONT + 2.2); tr.add(trunk);
    const leafA = std(0x4f8f3a, { flatShading: true }), leafB = std(0x6aa848, { flatShading: true });
    for (const [x, y, z, r] of [[0, 3.1, 0, 1.0], [0.6, 2.8, 0.2, 0.7], [-0.6, 2.9, -0.1, 0.75], [0.1, 3.6, 0.1, 0.7]]) { const p = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), x > 0 ? leafB : leafA); p.position.set(4.6 + x, y, FRONT + 2.2 + z); tr.add(p); }
    tr.add(box(1.0, 0.02, 1.0, std(0x374151, { metalness: 0.5 }), 4.6, 0.17, FRONT + 2.2));
  }

  // Grandpa's Peykan at the kerb: rusty, or repainted white.
  const pk = piece('peykan');
  const rust = std(0x7a5236, { roughness: 0.95, metalness: 0.15, flatShading: true });
  const peykan = buildCar(CARS.peykan, has('peykan') ? 0xf4f1ea : rust, { q: 0.7 });
  peykan.position.set(-1.6, 0, FRONT + 4.4); pk.add(peykan);
  if (!has('peykan')) { peykan.rotation.z = 0.025; peykan.position.y = -0.05; }

  // Strings of lights from the sign to the tree and the lamp post.
  if (has('lights')) {
    const lt = piece('lights');
    const cols = [0xfff1b8, 0xffb4a0, 0xb8f0ff, 0xc4f5b0];
    for (let k = 0; k <= 22; k++) {
      const u = k / 22, x = -3.4 + u * 7.8, y = 3.0 - Math.sin(u * Math.PI) * 0.5 + (u > 0.7 ? (u - 0.7) * 1.5 : 0);
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), std(cols[k % 4], { emissive: cols[k % 4], emissiveIntensity: night ? 3 : 1 }));
      b.position.set(x, y, FRONT + 1.8 + u * 0.4); lt.add(b);
    }
  }

  // The fleet's new Pride.
  if (has('pride')) {
    const pr = piece('pride');
    const car = buildCar(CARS.pride, 0xf2c230, { q: 0.7 });
    car.position.set(4.0, 0, FRONT + 4.4); pr.add(car);
  }

  buildNeighbourhood(root, has, piece, night);
  root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return root;
}

/** Stars earned for winning level `n` (0-based) the first time: more for hard and boss levels. */
export const starsFor = (tag?: string) => (tag === 'boss' ? 3 : tag === 'hard' ? 2 : 1);

/** Phase 2: the street around the agency. The neighbours stand at x ≈ −6.7 (left) and +6.9 (right). */
function buildNeighbourhood(root: THREE.Group, has: (id: string) => boolean, piece: (id: string) => THREE.Group, night: boolean) {
  const LX = -W / 2 - 3.2, RX = W / 2 + 3.4;
  if (has('mural')) {
    const m = piece('mural');
    const art = tex(512, 384, (g) => {
      const sky = g.createLinearGradient(0, 0, 0, 384); sky.addColorStop(0, '#3b82f6'); sky.addColorStop(1, '#bfdbfe'); g.fillStyle = sky; g.fillRect(0, 0, 512, 384);
      g.fillStyle = '#64748b'; g.beginPath(); g.moveTo(40, 300); g.lineTo(256, 70); g.lineTo(470, 300); g.fill(); // Damavand
      g.fillStyle = '#f8fafc'; g.beginPath(); g.moveTo(205, 125); g.lineTo(256, 70); g.lineTo(307, 125); g.lineTo(280, 115); g.lineTo(256, 130); g.lineTo(230, 112); g.fill();
      g.fillStyle = '#16a34a'; g.fillRect(0, 290, 512, 94);
      g.fillStyle = '#f4f1ea'; g.beginPath(); g.roundRect(150, 270, 210, 52, 14); g.fill(); g.beginPath(); g.roundRect(195, 240, 110, 40, 12); g.fill(); // a white Peykan
      g.fillStyle = '#93c5fd'; g.fillRect(205, 248, 40, 24); g.fillRect(255, 248, 40, 24);
      g.fillStyle = '#111827'; for (const x of [190, 320]) { g.beginPath(); g.arc(x, 322, 18, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#fbbf24'; g.beginPath(); g.arc(430, 60, 30, 0, Math.PI * 2); g.fill();
    });
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(5.0, 3.8), std(0xffffff, { map: art, roughness: 0.8 }));
    wall.position.set(LX, 4.2, FRONT + 0.04); m.add(wall);
  }
  if (has('bakery')) {
    const b = piece('bakery');
    b.add(box(4.6, 2.4, 0.1, std(0x4a3426), RX, 1.3, FRONT + 0.03));
    const glow = std(0xffc27a, { emissive: 0xff8a2a, emissiveIntensity: night ? 1.4 : 0.5 });
    b.add(box(2.4, 1.5, 0.05, glow, RX - 0.7, 1.4, FRONT + 0.09));
    for (let k = 0; k < 3; k++) { const br = box(0.5, 1.1, 0.04, std(0xc8935a, { roughness: 0.9 }), RX - 1.5 + k * 0.6, 1.4, FRONT + 0.12, 0.02); br.rotation.z = (k - 1) * 0.08; b.add(br); }
    const signTex = tex(512, 96, (g) => { g.fillStyle = '#7c2d12'; g.fillRect(0, 0, 512, 96); g.fillStyle = '#fde68a'; g.font = '900 60px Vazirmatn'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'rtl'; g.fillText('نانوایی سنگکی', 256, 52); });
    b.add(box(4.2, 0.6, 0.1, [std(0x7c2d12), std(0x7c2d12), std(0x7c2d12), std(0x7c2d12), std(0xffffff, { map: signTex }), std(0x7c2d12)], RX, 2.85, FRONT + 0.12));
  }
  if (has('saqqa')) {
    const q = piece('saqqa');
    const tile = tex(256, 256, (g) => { g.fillStyle = '#0e7490'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 64; i++) { g.fillStyle = ['#fbbf24', '#f8fafc', '#164e63'][i % 3]; const x = (i % 8) * 32 + 16, y = Math.floor(i / 8) * 32 + 16; g.beginPath(); g.moveTo(x, y - 12); g.lineTo(x + 12, y); g.lineTo(x, y + 12); g.lineTo(x - 12, y); g.fill(); } });
    q.add(box(1.4, 1.9, 0.5, std(0xffffff, { map: tile, roughness: 0.4 }), LX + 1.6, 1.1, FRONT + 0.25));
    q.add(box(0.9, 1.1, 0.1, std(0x14532d, { roughness: 0.8 }), LX + 1.6, 1.15, FRONT + 0.5)); // green cloth
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.14, 0.12, 14), std(0xd4a017, { metalness: 0.8, roughness: 0.25 })); bowl.position.set(LX + 1.6, 0.62, FRONT + 0.62); q.add(bowl);
    for (let k = 0; k < 4; k++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.16, 6), std(0xfff7ed)); c.position.set(LX + 1.25 + k * 0.23, 0.29, FRONT + 0.72); q.add(c); const f = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), std(0xffd27a, { emissive: 0xff9a2a, emissiveIntensity: 3 })); f.position.set(LX + 1.25 + k * 0.23, 0.4, FRONT + 0.72); q.add(f); }
  }
  if (has('lamps')) {
    const l = piece('lamps');
    const m = std(0x2f5d4a, { metalness: 0.5, roughness: 0.45 });
    for (const x of [-5.2, 5.6]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 4.2, 8), m); pole.position.set(x, 2.1, FRONT + 2.7); l.add(pole);
      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.24, 0.22, 10), m); head.position.set(x, 4.3, FRONT + 2.7); l.add(head);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 6), std(0xfff4d0, { emissive: 0xffe8a8, emissiveIntensity: night ? 4 : 0.6 })); bulb.position.set(x, 4.15, FRONT + 2.7); l.add(bulb);
    }
  }
  if (has('kiosk')) {
    const k = piece('kiosk');
    k.add(box(1.6, 1.8, 1.2, std(0x2e7d4f, { roughness: 0.5 }), LX - 0.9, 1.06, FRONT + 1.4, 0.05));
    k.add(box(1.9, 0.1, 1.5, std(0x1f5a39), LX - 0.9, 2.0, FRONT + 1.45, 0.03));
    const mags = tex(256, 96, (g) => { const cols = ['#e11d48', '#f59e0b', '#2563eb', '#16a34a', '#a855f7', '#0ea5e9']; for (let i = 0; i < 12; i++) { g.fillStyle = cols[i % 6]; g.fillRect((i % 6) * 42 + 4, Math.floor(i / 6) * 48 + 4, 36, 42); g.fillStyle = '#fff'; g.fillRect((i % 6) * 42 + 8, Math.floor(i / 6) * 48 + 10, 28, 6); } });
    const front = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.55), std(0xffffff, { map: mags })); front.position.set(LX - 0.9, 1.3, FRONT + 2.01); k.add(front);
  }
  if (has('juice')) {
    const j = piece('juice');
    j.add(box(1.6, 0.9, 0.8, std(0xf8fafc, { roughness: 0.4 }), RX + 2.4, 0.61, FRONT + 1.5, 0.04));
    j.add(box(1.6, 0.25, 0.8, std(0xf97316), RX + 2.4, 0.29, FRONT + 1.5));
    for (let i = 0; i < 12; i++) { const o = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), std(i % 3 ? 0xf59e0b : 0xa3122a, { roughness: 0.5 })); o.position.set(RX + 1.8 + (i % 6) * 0.22, 1.15 + Math.floor(i / 6) * 0.12, FRONT + 1.4 + (i % 2) * 0.12); j.add(o); }
    const umb = new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.5, 12), std(0xfbbf24, { side: THREE.DoubleSide })); umb.position.set(RX + 2.4, 2.5, FRONT + 1.5); j.add(umb);
    j.add(box(0.05, 2.0, 0.05, std(0x6b7280), RX + 2.4, 1.4, FRONT + 1.5));
  }
  if (has('roof')) {
    const r = piece('roof');
    const wood = std(0x8b5a2b), leaf = std(0x3f8f3a, { flatShading: true }), grape = std(0x6b21a8);
    for (const x of [-2.8, 2.8]) for (const z of [-1.6, 1.6]) r.add(box(0.1, 1.6, 0.1, wood, x, H + 0.95, z));
    for (let k = 0; k < 6; k++) r.add(box(5.8, 0.06, 0.08, wood, 0, H + 1.78, -1.6 + k * 0.64));
    for (let k = 0; k < 14; k++) { const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 0), leaf); p.position.set(-2.6 + (k % 7) * 0.85, H + 1.95, -1.2 + Math.floor(k / 7) * 1.8); p.scale.y = 0.45; r.add(p); }
    for (let k = 0; k < 5; k++) { const gp = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.25, 6), grape); gp.rotation.x = Math.PI; gp.position.set(-2 + k, H + 1.6, 0.4); r.add(gp); }
  }
  if (has('jube')) {
    const j = piece('jube');
    j.add(box(26, 0.03, 0.3, std(0x60a5fa, { roughness: 0.05, metalness: 0.4, emissive: 0x0c4a6e, emissiveIntensity: 0.3 }), 0, 0.03, FRONT + 3.25));
    for (const x of [-1.6, 4.0]) j.add(box(0.8, 0.06, 0.5, std(0x8b5a2b), x, 0.17, FRONT + 3.25));
    for (const x of [-8, -3, 2, 7, 10]) { const t = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.06, 4), std(0xffffff)); t.rotation.y = x; t.position.set(x, 0.07, FRONT + 3.25); j.add(t); } // paper boats
  }
  if (has('pigeons')) {
    const pg = piece('pigeons');
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.1, 14), std(0x94a3b8, { metalness: 0.3 })); bowl.position.set(0.8, 0.22, FRONT + 2.2); pg.add(bowl);
    const feather = std(0x9ca3af, { roughness: 0.7 }), neck = std(0x4b5563);
    for (let k = 0; k < 6; k++) {
      const a = k * 1.05, x = 0.8 + Math.cos(a) * 0.55, z = FRONT + 2.2 + Math.sin(a) * 0.45;
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), feather); b.scale.set(1.4, 0.9, 0.9); b.position.set(x, 0.26, z); b.rotation.y = -a; pg.add(b);
      const h = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), neck); h.position.set(x - Math.cos(a) * 0.1, 0.34, z - Math.sin(a) * 0.1); pg.add(h);
    }
  }
  if (has('samand')) {
    const sm = piece('samand');
    const car = buildCar(CARS.samand, 0xf2c230, { q: 0.7, taxi: true }); car.position.set(-6.6, 0, FRONT + 4.4); sm.add(car);
  }
  if (has('bus')) {
    const b = piece('bus');
    const steel = std(0x5d6b7e, { metalness: 0.6, roughness: 0.35 });
    b.add(box(3.0, 0.14, 1.3, std(0x1e63d6, { roughness: 0.4 }), LX - 3.6, 2.3, FRONT + 2.2, 0.04));
    for (const x of [-1.35, 1.35]) for (const z of [-0.5, 0.5]) b.add(box(0.07, 2.2, 0.07, steel, LX - 3.6 + x, 1.2, FRONT + 2.2 + z));
    b.add(box(2.0, 0.08, 0.38, std(0xa0703c), LX - 3.6, 0.6, FRONT + 1.9, 0.03));
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.5, 0.04), new THREE.MeshPhysicalMaterial({ color: 0xbfe3ff, transparent: true, opacity: 0.45, roughness: 0.05 })); back.position.set(LX - 3.6, 1.3, FRONT + 1.65); b.add(back);
  }
  if (has('vanet')) {
    const v = piece('vanet');
    const car = buildVanet(0x7fb4d9, { q: 0.7 }); car.position.set(8.4, 0, FRONT + 4.4); v.add(car);
  }
}
