/**
 * One level being played: owns the rules state and the 3D objects, turns taps into rule events and
 * rule events into animation, in the right order (a car must reach its bay before anyone boards).
 */
import * as THREE from 'three';
import * as sfx from '../audio';
import { haptic } from '../haptics';
import { KIND, DELTA, addBay, cellsOf, startState as newState, tap as ruleTap, whistle as ruleWhistle, type Event, type Level, type State } from '../game/rules';
import { CELL, makeArrow, makeVehicle, type VehicleObj } from '../render/fleet';
import { blowOff, brokenBadge, carCover, colorSymbol, hazard, plateBadge, poseOfficer, setBrokenBadge, setPlateBadge, trafficOfficer, vipMarker } from '../render/mechanics';
import { drive, ease, roundedPath, settleBody, tween, wait } from '../render/anim';
import { person, type Person } from '../render/people';
import { BAY_D, BAY_W, LOT_Y, buildWorld, cone, type Layout, type WorldOpts } from '../render/world';
import { confetti, coinBurst, puff } from '../render/fx';
import { solve } from '../game/solver';

const VISIBLE_QUEUE = 16;
export const MAX_BAYS = 6;

export interface SessionHooks {
  queueLeft(n: number): void;
  toast(text: string): void;
  won(): void;
  lost(): void;
  /** Whether input should currently be accepted (no modal open). */
  canPlay(): boolean;
  /** Floating text at a world point. */
  float(text: string, at: THREE.Vector3, kind: 'coin' | 'combo' | 'bad'): void;
  shake(amp: number): void;
  /** «طرح زوج و فرد» sign: allowed parity and exits until it switches (null when the level has no plate rule). */
  parity(p: 0 | 1 | null, left: number): void;
  /** «پلیس راهور» sign (null when there is no officer). */
  officer(axis: 'v' | 'h' | null): void;
  /** Speed-camera flash for a wrong plate. */
  flash(): void;
}

const COMBO = ['', '', 'دوتایی!', 'سه‌تایی!', 'چهارتایی!', 'محشره!', 'افسانه‌ای!'];

interface Seat { sprite: THREE.Sprite; ctx: CanvasRenderingContext2D; tex: THREE.CanvasTexture; }

export class Session {
  readonly s: State;
  readonly group = new THREE.Group();
  readonly L: Layout;
  private cars: VehicleObj[] = [];
  private cones: THREE.Object3D[] = [];
  private queue: Person[] = []; // visible people, front first
  private vq = 0; // index (in s.queue) of the person at the front of the visible queue
  private chain: Promise<void> = Promise.resolve();
  private bayFree: Promise<void>[] = [];
  private bayIsFree: boolean[] = [];
  private seats = new Map<number, Seat>();
  private lockGate: THREE.Group;
  private pending = 0;
  private ended = false;
  private lastDepart = -10;
  private combo = 0;
  /** Coins earned during the level (combos), paid out with the win reward. */
  bonus = 0;
  private covers = new Map<number, THREE.Object3D>();
  private broken = new Map<number, { badge: THREE.Sprite; hazard: THREE.Object3D; nextPuff: number }>();
  private plates = new Map<number, THREE.Sprite>();

  private colorblind: boolean;
  private symbols = new Map<number, THREE.Sprite>();

  constructor(readonly level: Level, readonly hooks: SessionHooks, seed = 1, worldOpts: WorldOpts = {}) {
    this.s = newState(level);
    this.colorblind = !!worldOpts.colorblind;
    const world = buildWorld(level.w, level.h, MAX_BAYS, seed, worldOpts);
    this.L = world.L;
    this.group.add(world.group);
    for (let k = 0; k < MAX_BAYS; k++) { this.bayFree.push(Promise.resolve()); this.bayIsFree.push(true); }
    level.vehicles.forEach((v, idx) => {
      // Restored classics from the garage take the place of some ordinary sedans.
      const skins = worldOpts.skins ?? [];
      const sedan = v.kind === 'pride' || v.kind === 'peykan' || v.kind === 'p405';
      const roll = (idx * 2654435761 + seed * 40503) >>> 0;
      const skin = sedan && skins.length && roll % 4 === 0 ? skins[(roll >>> 4) % skins.length] : undefined;
      const o = makeVehicle(v.kind, v.color, skin);
      const cells = cellsOf(v);
      const a = this.L.cell(...cells[0]), b = this.L.cell(...cells[cells.length - 1]);
      o.root.position.set((a.x + b.x) / 2, LOT_Y, (a.z + b.z) / 2);
      o.root.rotation.y = { up: 0, down: Math.PI, left: Math.PI / 2, right: -Math.PI / 2 }[v.dir];
      this.group.add(o.root);
      this.cars.push(o);
      const i = this.cars.length - 1;
      if (v.covered) {
        const roof = v.kind === 'zamyad' ? 1.25 : v.kind === 'bus' ? 1.42 : 0.82;
        const cover = carCover(o.length, roof);
        const arrow = makeArrow(); arrow.position.y = cover.userData.top + 0.02; cover.add(arrow);
        o.root.add(cover); this.covers.set(i, cover);
      }
      if (v.wait) {
        const badge = brokenBadge(v.wait); badge.scale.set(0.86, 0.5, 1); badge.position.set(0, 1.5, 0); o.root.add(badge);
        const hz = hazard(); hz.position.set(0, LOT_Y + 0.17, o.length / 2 + 0.28); hz.rotation.x = -0.25;
        o.root.add(hz);
        this.broken.set(i, { badge, hazard: hz, nextPuff: 0 });
      }
      if (this.colorblind && v.kind !== 'bike' && !v.covered) this.addSymbol(i);
      if (level.oddEven && v.plate !== undefined) {
        const pb = plateBadge(v.plate); pb.scale.set(0.74, 0.43, 1); pb.position.set(0, 1.25, o.length * 0.32); o.root.add(pb); this.plates.set(i, pb);
      }
    });
    for (const c of level.obstacles ?? []) {
      const m = cone(); m.position.copy(this.L.cell(c.col, c.row)).setY(LOT_Y); m.rotation.y = c.col * 1.3; this.group.add(m); this.cones.push(m);
    }
    for (let k = 0; k < Math.min(VISIBLE_QUEUE, this.s.queue.length); k++) this.spawn(k, false);
    this.lockGate = this.gate(this.s.bays.length);
    hooks.queueLeft(this.s.queue.length);
    this.refreshPlates();
    this.dressStreets(seed);
    if (level.officer) {
      // He stands on the ring road at the lot's top-left corner, facing the lot.
      this.officer = trafficOfficer();
      this.officer.position.set(this.L.lotX0 - 0.55, 0, -0.55);
      this.officer.rotation.y = -Math.PI / 4;
      this.officer.scale.setScalar(1.7);
      this.group.add(this.officer);
      poseOfficer(this.officer, this.s.axis);
    }
    hooks.officer(level.officer ? this.s.axis : null);
    if (worldOpts.snow) this.makeSnow();
  }

  // ───── Falling snow ─────
  private flakes: THREE.Points | null = null;
  private lastT = 0;
  private makeSnow() {
    const n = 900, pos = new Float32Array(n * 3);
    const z0 = this.L.walkZ - 8, z1 = this.L.lotH + 4;
    for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 22; pos[i * 3 + 1] = Math.random() * 14; pos[i * 3 + 2] = z0 + Math.random() * (z1 - z0); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const g = c.getContext('2d')!; const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
    const mat = new THREE.PointsMaterial({ size: 0.2, map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, opacity: 0.9 });
    this.flakes = new THREE.Points(geo, mat);
    this.group.add(this.flakes);
  }
  private officer: THREE.Group | null = null;

  // ───── Street life: cars parked on the kerbs, pigeons on the pavement ─────
  private pigeons: { o: THREE.Group; home: THREE.Vector3; away: boolean }[] = [];
  private dressStreets(seed: number) {
    let r = seed * 48271 % 2147483647;
    const rnd = () => ((r = (r * 48271) % 2147483647) / 2147483647);
    const kinds = ['pride', 'peykan', 'p405', 'pride'] as const, cols = ['white', 'silver', 'black', 'white', 'silver'] as const;
    for (const side of [-1, 1]) {
      const x = side * (this.L.lotW / 2 + 0.22 + 1.8 + 0.75);
      for (let z = 0.6; z < this.L.lotH - 1; z += 2.9 + rnd() * 1.4) {
        if (rnd() < 0.3) continue;
        const o = makeVehicle(kinds[Math.floor(rnd() * kinds.length)], cols[Math.floor(rnd() * cols.length)], undefined, { arrow: false });
        o.root.position.set(x, 0, z + 1);
        o.root.rotation.y = rnd() < 0.5 ? 0 : Math.PI;
        this.group.add(o.root);
      }
    }
    const grey = new THREE.MeshStandardMaterial({ color: 0x8b93a1, roughness: 0.8 }), neck = new THREE.MeshStandardMaterial({ color: 0x4b6b74, roughness: 0.5, metalness: 0.3 });
    const bodyG = new THREE.SphereGeometry(0.07, 10, 8), headG = new THREE.SphereGeometry(0.04, 8, 6);
    for (let k = 0; k < 6; k++) {
      const o = new THREE.Group();
      const b = new THREE.Mesh(bodyG, grey); b.scale.set(1.4, 1, 1); b.position.y = 0.07; o.add(b);
      const hd = new THREE.Mesh(headG, neck); hd.position.set(0.09, 0.13, 0); hd.name = 'head'; o.add(hd);
      o.traverse((m) => { m.castShadow = true; });
      const home = new THREE.Vector3(this.L.bayX[this.L.bayX.length - 1] - 0.4 + rnd() * 2.2, 0.18, this.L.walkZ + 0.75 + rnd() * 0.3);
      o.position.copy(home); o.rotation.y = rnd() * 6.28;
      this.group.add(o);
      this.pigeons.push({ o, home, away: false });
    }
  }
  private scarePigeons() {
    for (const p of this.pigeons) {
      if (p.away) continue;
      p.away = true;
      const from = p.o.position.clone(), dir = new THREE.Vector3(Math.random() - 0.5, 0, -1).normalize();
      void tween(1.2, (k) => { p.o.position.copy(from).addScaledVector(dir, k * 6).setY(from.y + k * 4); p.o.rotation.z = Math.sin(k * 40) * 0.3; }, ease.in)
        .then(() => tween(0.01, () => {}))
        .then(() => setTimeout(() => {
          const back = p.o.position.clone();
          void tween(1.4, (k) => { p.o.position.lerpVectors(back, p.home, k); p.o.position.y = p.home.y + (1 - k) * 2 + Math.sin(k * Math.PI) * 0.5; p.o.rotation.z = Math.sin(k * 30) * 0.2 * (1 - k); }, ease.out).then(() => { p.away = false; });
        }, 4000));
    }
  }

  private addSymbol(i: number) {
    const o = this.cars[i];
    const sym = colorSymbol(this.level.vehicles[i].color);
    sym.position.set(0, 1.05, -o.length * 0.3);
    o.root.add(sym); this.symbols.set(i, sym);
  }

  private refreshPlates() {
    const p = this.level.oddEven ? this.s.parity : null;
    this.hooks.parity(p, this.level.oddEven ? this.level.oddEven - this.s.sinceSwitch : 0);
    for (const [i, s] of this.plates) setPlateBadge(s, this.level.vehicles[i].plate!, this.level.vehicles[i].plate! % 2 === p);
  }

  /** Broken cars count down as others leave; at zero they cough back to life. */
  private refreshBroken() {
    for (const [i, b] of [...this.broken]) {
      const left = (this.level.vehicles[i].wait ?? 0) - this.s.exits;
      if (left > 0) { setBrokenBadge(b.badge, left); void tween(0.3, (k) => b.badge.scale.set(0.86 * (1 + Math.sin(k * Math.PI) * 0.3), 0.5 * (1 + Math.sin(k * Math.PI) * 0.3), 1), ease.out); continue; }
      this.broken.delete(i);
      const o = this.cars[i];
      sfx.engine(0.1, false); sfx.horn('old', 1, 0.5);
      this.hooks.float('درست شد!', o.root.position.clone().add(new THREE.Vector3(0, 1.3, 0)), 'combo');
      void this.wiggle(o);
      void tween(0.3, (k) => b.badge.scale.setScalar(Math.max(0.001, (1 - k) * 0.6)), ease.in).then(() => o.root.remove(b.badge));
      void tween(0.4, (k) => { b.hazard.scale.setScalar(Math.max(0.001, 1 - k)); }, ease.in).then(() => o.root.remove(b.hazard));
    }
  }

  // ───── Queue of people ─────
  private slot(k: number) {
    return new THREE.Vector3(this.L.queueX0 - k * 0.56, 0.18, this.L.walkZ + 0.3 + (k % 2 ? 0.07 : -0.05));
  }
  private spawn(k: number, animate: boolean) {
    const idx = this.vq + k;
    if (idx >= this.s.queue.length) return;
    const p = person(this.s.queue[idx], idx);
    if (this.s.vip[idx]) { const m = vipMarker(); m.scale.setScalar(1 / 1.12); p.root.add(m); }
    if (this.colorblind) { const sym = colorSymbol(this.s.queue[idx], 0.3); sym.position.y = this.s.vip[idx] ? 1.75 : 1.32; p.root.add(sym); }
    p.root.position.copy(this.slot(k));
    p.root.rotation.y = Math.PI / 2 + (((idx * 37) % 10) - 5) * 0.04;
    this.group.add(p.root);
    this.queue[k] = p;
    if (animate) { p.root.scale.setScalar(0.01); void tween(0.3, (e) => p.root.scale.setScalar(1.12 * e), ease.back); }
  }

  // ───── Locked sixth bay: a barrier you can lift with the parking booster ─────
  private gate(k: number) {
    const g = new THREE.Group();
    const x = this.L.bayX[k], z = this.L.bayZ + BAY_D / 2 - 0.15;
    const post = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.5, roughness: 0.4 });
    for (const dx of [-BAY_W / 2 + 0.1, BAY_W / 2 - 0.1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 10), post); p.position.set(x + dx, 0.35, z); p.castShadow = true; g.add(p); }
    const barTex = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 16; const x2 = c.getContext('2d')!; for (let i = 0; i < 8; i++) { x2.fillStyle = i % 2 ? '#ffffff' : '#e11d2a'; x2.fillRect(i * 16, 0, 16, 16); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const pivot = new THREE.Group(); pivot.position.set(x - BAY_W / 2 + 0.1, 0.62, z);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(BAY_W - 0.1, 0.08, 0.08), new THREE.MeshStandardMaterial({ map: barTex, roughness: 0.5 }));
    bar.position.x = (BAY_W - 0.1) / 2; bar.castShadow = true; pivot.add(bar);
    g.add(pivot);
    // Padlock.
    const lock = new THREE.Group();
    const bodyM = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.22, 0.1), new THREE.MeshStandardMaterial({ color: 0xf5b400, metalness: 0.6, roughness: 0.3 }));
    const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.022, 8, 16, Math.PI), new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.9, roughness: 0.2 }));
    shackle.position.y = 0.11; lock.add(bodyM, shackle); lock.position.set(BAY_W / 2 - 0.05, -0.2, 0.06); pivot.add(lock);
    g.userData.pivot = pivot; g.userData.lock = lock;
    this.group.add(g);
    return g;
  }
  private openGate() {
    const pivot = this.lockGate.userData.pivot as THREE.Group, lock = this.lockGate.userData.lock as THREE.Object3D;
    void tween(0.25, (k) => lock.scale.setScalar(1 - k), ease.in).then(() => { lock.visible = false; });
    void tween(0.7, (k) => { pivot.rotation.z = k * 1.45; }, ease.back);
  }

  // ───── Seat counters over cars in bays ─────
  private seat(bay: number, v: number) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 64;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    sprite.renderOrder = 10;
    const cap = KIND[this.level.vehicles[v].kind].cap;
    sprite.scale.set(0.3 * cap * 0.42 + 0.3, 0.3, 1);
    sprite.position.set(this.L.bayX[bay], 1.75, this.L.bayZ + 0.2);
    this.group.add(sprite);
    const seat = { sprite, ctx: c.getContext('2d')!, tex };
    this.seats.set(bay, seat);
    this.drawSeat(bay, 0, cap, this.level.vehicles[v].color);
    sprite.scale.multiplyScalar(0.01);
    const target = sprite.scale.clone().multiplyScalar(100);
    void tween(0.3, (k) => sprite.scale.copy(target).multiplyScalar(Math.max(0.01, k)), ease.back);
  }
  private drawSeat(bay: number, boarded: number, cap: number, color: string) {
    const st = this.seats.get(bay); if (!st) return;
    const g = st.ctx, W = 256, H = 64, n = cap, d = Math.min(26, (W - 24) / n - 4), w = n * (d + 4) + 14;
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(15,23,42,.72)'; g.beginPath(); g.roundRect((W - w) / 2, (H - d - 14) / 2, w, d + 14, (d + 14) / 2); g.fill();
    const COL: Record<string, string> = { red: '#ff4d4f', yellow: '#ffc31a', blue: '#4b8bff', green: '#2fc26b', purple: '#a66bff', orange: '#ff8a3d', white: '#f1f5f9', pink: '#ff6fa8' };
    for (let i = 0; i < n; i++) {
      const x = (W - w) / 2 + 7 + i * (d + 4) + d / 2, y = H / 2;
      g.beginPath(); g.arc(x, y, d / 2, 0, Math.PI * 2);
      g.fillStyle = i < boarded ? COL[color] : 'rgba(255,255,255,.22)'; g.fill();
      if (i < boarded) { g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 2; g.stroke(); }
    }
    st.tex.needsUpdate = true;
  }
  private dropSeat(bay: number) {
    const st = this.seats.get(bay); if (!st) return;
    this.seats.delete(bay);
    const s0 = st.sprite.scale.clone();
    void tween(0.2, (k) => st.sprite.scale.copy(s0).multiplyScalar(1 - k + 0.001), ease.in).then(() => { this.group.remove(st.sprite); st.tex.dispose(); });
  }

  // ───── Input ─────
  /** Which vehicle (if any) is under a ground point. */
  vehicleAt(p: THREE.Vector3): number {
    const c = Math.floor((p.x - this.L.lotX0) / CELL), r = Math.floor((p.z - this.L.lotZ0) / CELL);
    let best = -1, bd = Infinity;
    this.level.vehicles.forEach((v, i) => {
      if (!this.s.inLot[i]) return;
      for (const [cc, rr] of cellsOf(v)) {
        const d = Math.hypot(cc - c, rr - r);
        if (d < bd) { bd = d; best = i; }
      }
    });
    return bd <= 0.75 ? best : -1;
  }

  taps = 0;
  lastInput = performance.now();

  tap(i: number) {
    if (this.ended || !this.hooks.canPlay()) return;
    this.taps++;
    this.lastInput = performance.now();
    this.play(ruleTap(this.s, i), i);
  }

  /** Finger down on a vehicle: it squats a little, like it is about to launch. */
  press(i: number, down: boolean) {
    const o = this.cars[i];
    if (!o || !this.s.inLot[i]) return;
    const from = o.body.scale.y, to = down ? 0.9 : 1;
    void tween(down ? 0.08 : 0.25, (k) => { const y = from + (to - from) * k; o.body.scale.set(1 + (1 - y) * 0.5, y, 1 + (1 - y) * 0.5); }, down ? ease.out : ease.elastic);
  }

  /** The next move of a winning line from the current state (for the tutorial hand and idle hints). */
  hint(): number {
    if (this.ended || this.pending > 0) return -1;
    const r = solve(this.level, 60_000, this.s);
    return r.solvable ? r.solution[0] : -1;
  }

  /** Screen anchor for a vehicle (world point on its roof). */
  anchor(i: number): THREE.Vector3 {
    return this.cars[i].root.position.clone().add(new THREE.Vector3(0, 0.9, 0));
  }

  /** Crane booster: lift any vehicle out, even if it is boxed in. */
  crane(i: number): boolean {
    if (this.ended || !this.s.inLot[i] || this.s.bays.every((b) => b)) return false;
    this.play(ruleTap(this.s, i, true), i, true);
    return true;
  }

  /** Parking booster / continue: unlock the sixth bay. */
  extraBay(): boolean {
    if (this.s.bays.length >= MAX_BAYS) return false;
    const wasLost = this.s.over === 'lost';
    addBay(this.s);
    this.openGate();
    if (wasLost) this.ended = false;
    return true;
  }

  /** Police whistle: reorder the head of the queue to fill waiting cars. */
  whistle(): boolean {
    if (this.ended || this.pending > 0) return false;
    sfx.whistleSound();
    const ev = ruleWhistle(this.s);
    // Recolor the visible queue to the new order with a little shuffle hop.
    this.queue.forEach((p, k) => {
      const idx = this.vq + k;
      if (!p || idx >= this.s.queue.length || p.color === this.s.queue[idx]) return;
      const np = person(this.s.queue[idx], idx);
      np.root.position.copy(p.root.position); np.root.rotation.copy(p.root.rotation);
      this.group.remove(p.root); this.group.add(np.root); this.queue[k] = np;
      void tween(0.35, (e) => { np.root.position.y = 0.18 + Math.sin(e * Math.PI) * 0.35; }, ease.linear);
    });
    this.chain = this.chain.then(() => wait(0.4)).then(() => this.playBoards(ev));
    return true;
  }

  isFull() { return this.s.bays.every((b) => b); }

  private play(ev: Event[], i: number, craned = false) {
    const first = ev[0];
    if (!first) return;
    if (first.t === 'blocked') { void this.animBlocked(i, first.by); return; }
    if (first.t === 'locked') { this.animLocked(i, first.why); return; }
    if (first.t === 'bays-full') { this.hooks.toast('جای پارک پره!'); void this.wiggle(this.cars[i]); sfx.bump(); haptic('warn'); return; }
    if (first.t !== 'exit') return;
    haptic('light');
    this.pending++;
    const arrived = craned ? this.animCrane(first.v, first.bay) : this.animExit(first.v, first.bay);
    // Covers blow off and the plate camera switches right away; boarding waits for the car.
    for (const e of ev) {
      if (e.t === 'axis') {
        sfx.whistleSound();
        this.hooks.officer(e.axis);
        const o = this.officer;
        if (o) void tween(0.35, () => poseOfficer(o, e.axis, 0.3), ease.out);
      }
      if (e.t === 'reveal') this.uncover(e.v);
      if (e.t === 'parity') { sfx.click(); this.hooks.float(e.parity ? 'نوبت پلاک فرد!' : 'نوبت پلاک زوج!', this.L.cell(Math.floor(this.level.w / 2), 0).add(new THREE.Vector3(0, 1.5, -1)), 'combo'); }
    }
    this.refreshPlates();
    this.refreshBroken();
    const rest = ev.slice(1).filter((e) => e.t !== 'reveal' && e.t !== 'parity' && e.t !== 'axis');
    this.chain = this.chain.then(() => arrived).then(() => this.playBoards(rest)).finally(() => { this.pending--; });
  }

  private async playBoards(ev: Event[]) {
    const landings: Promise<void>[] = [];
    const lastLanding = new Map<number, Promise<void>>();
    for (const e of ev) {
      if (e.t === 'board') {
        const landed = this.animBoard(e.bay, e.v);
        lastLanding.set(e.bay, landed);
        landings.push(landed);
        await wait(0.12);
      } else if (e.t === 'depart') {
        const after = lastLanding.get(e.bay) ?? Promise.resolve();
        const done = after.then(() => this.animDepart(e.bay, e.v));
        landings.push(done);
      } else if (e.t === 'won') {
        this.ended = true;
        await Promise.all(landings);
        await this.celebrate();
        this.hooks.won();
      } else if (e.t === 'lost') {
        this.ended = true;
        await Promise.all(landings);
        await wait(0.3);
        sfx.lose(); haptic('warn');
        this.hooks.lost();
      }
    }
  }

  private uncover(i: number) {
    const cover = this.covers.get(i);
    if (!cover) return;
    this.covers.delete(i);
    if (this.colorblind && this.s.inLot[i]) this.addSymbol(i);
    // Re-parent into the world so it can fly free of the car.
    const at = new THREE.Vector3(); cover.getWorldPosition(at);
    const q = new THREE.Quaternion(); cover.getWorldQuaternion(q);
    this.group.add(cover); cover.position.copy(at); cover.quaternion.copy(q);
    sfx.chirp(0, 0.05);
    void blowOff(cover, (d, f) => tween(d, f, ease.out)).then(() => this.group.remove(cover));
  }

  private animLocked(i: number, why: 'broken' | 'plate' | 'officer') {
    const o = this.cars[i];
    const at = o.root.position.clone().add(new THREE.Vector3(0, 1.3, 0));
    haptic('warn');
    if (why === 'broken') {
      sfx.engine(0, true); setTimeout(() => sfx.bump(), 250);
      const left = (this.level.vehicles[i].wait ?? 0) - this.s.exits;
      this.hooks.float(`خرابه! ${left} ماشین دیگه`, at, 'bad');
      for (let k = 0; k < 3; k++) setTimeout(() => puff(this.group, o.root.position.clone().add(new THREE.Vector3(0, 0.5, -0.3)), 0.9), k * 120);
      void this.wiggle(o);
    } else if (why === 'officer') {
      sfx.whistleSound();
      this.hooks.float(this.s.axis === 'v' ? 'پلیس: الان نوبت عمودی‌هاست!' : 'پلیس: الان نوبت افقی‌هاست!', at, 'bad');
      const o = this.officer;
      if (o) void tween(0.4, (k) => { o.rotation.z = Math.sin(k * Math.PI * 4) * 0.08; }, ease.linear);
      void this.wiggle(this.cars[i]);
    } else {
      this.hooks.flash();
      this.hooks.float(this.level.vehicles[i].plate! % 2 ? 'پلاک فرده! صبر کن' : 'پلاک زوجه! صبر کن', at, 'bad');
      void this.wiggle(o);
    }
  }

  // ───── Animations ─────
  private wiggle(o: VehicleObj) {
    return tween(0.4, (k) => { o.body.rotation.x = Math.sin(k * Math.PI * 6) * 0.06 * (1 - k); }, ease.linear);
  }

  private async animBlocked(i: number, by: { v?: number; cell: [number, number] }) {
    const v = this.level.vehicles[i], o = this.cars[i];
    const [fc, fr] = (() => { const len = KIND[v.kind].len; return v.dir === 'up' ? [v.col, v.row - 1] : v.dir === 'down' ? [v.col, v.row + len] : v.dir === 'left' ? [v.col - 1, v.row] : [v.col + len, v.row]; })();
    const gap = Math.abs(by.cell[0] - fc) + Math.abs(by.cell[1] - fr);
    const [dc, dr] = DELTA[v.dir];
    const dist = gap * CELL + 0.1;
    const start = o.root.position.clone();
    sfx.chirp(0, 0.04);
    await tween(0.1 + gap * 0.07, (k) => { o.root.position.set(start.x + dc * dist * k, start.y, start.z + dr * dist * k); o.body.rotation.z = 0.04 * (1 - k); }, ease.in);
    sfx.bump(); haptic('medium');
    const kindHorn = v.kind === 'bus' ? 'bus' : v.kind === 'peykan' || v.kind === 'zamyad' ? 'old' : 'new';
    sfx.horn(kindHorn, 2, 0.05);
    this.hooks.shake(0.06);
    this.scarePigeons();
    this.hooks.float('بوق!', o.root.position.clone().add(new THREE.Vector3(0, 1.1, 0)), 'bad');
    if (by.v !== undefined) { const b = this.cars[by.v]; void this.wiggle(b); }
    else { const c = this.cones.find((m) => m.position.distanceTo(this.L.cell(...by.cell)) < 0.2); if (c) void tween(0.5, (k) => { c.rotation.z = Math.sin(k * 20) * 0.25 * (1 - k); }, ease.linear); }
    o.body.rotation.z = -0.05;
    await tween(0.32, (k) => { o.root.position.set(start.x + dc * dist * (1 - k), start.y, start.z + dr * dist * (1 - k)); }, ease.out);
    void settleBody(o.body);
  }

  /** Route from the vehicle's spot to its bay, around the ring road. */
  private route(i: number, bay: number): THREE.Vector3[] {
    const v = this.level.vehicles[i], L = this.L, p = this.cars[i].root.position.clone().setY(0);
    const bx = L.bayX[bay], top = L.topRoadZ, V = (x: number, z: number) => new THREE.Vector3(x, 0, z);
    const intoBay = [V(bx, top), V(bx, L.bayZ + 0.05)];
    switch (v.dir) {
      case 'up': return [p, V(p.x, top), ...intoBay];
      case 'left': return [p, V(L.leftRoadX, p.z), V(L.leftRoadX, top), ...intoBay];
      case 'right': return [p, V(L.rightRoadX, p.z), V(L.rightRoadX, top), ...intoBay];
      case 'down': {
        const side = p.x < 0 ? L.leftRoadX : L.rightRoadX;
        return [p, V(p.x, L.bottomRoadZ), V(side, L.bottomRoadZ), V(side, top), ...intoBay];
      }
    }
  }

  private async animExit(i: number, bay: number) {
    const o = this.cars[i], v = this.level.vehicles[i];
    this.uncover(i);
    const sy = this.symbols.get(i); if (sy) { o.root.remove(sy); this.symbols.delete(i); }
    const pb = this.plates.get(i); if (pb) { o.root.remove(pb); this.plates.delete(i); }
    const pts = this.route(i, bay);
    const heavy = v.kind === 'bus' || v.kind === 'zamyad';
    sfx.engine(0, heavy); sfx.chirp(0.05);
    // Drop off the lot curb onto the road during the first stretch.
    const exitFrac = (() => { const path = roundedPath(pts); const d0 = pts[0].distanceTo(pts[1]); return Math.min(0.5, (d0 * 0.6) / path.getLength()); })();
    const smoke = setInterval(() => puff(this.group, o.root.position, 0.5), 90);
    setTimeout(() => clearInterval(smoke), 350);
    if (this.bayIsFree[bay]) {
      this.bayIsFree[bay] = false;
      await drive(o.root, o.body, roundedPath(pts, 0.8), { vmax: heavy ? 7 : 9.5, onProgress: (u) => { o.root.position.y = u < exitFrac ? LOT_Y * (1 - u / exitFrac) : 0; } });
    } else {
      // Wait on the road beside the bay until the previous car has backed out.
      const k = pts.length - 2, approach = pts.slice(0, k + 1);
      const side = Math.sign(pts[k - 1].x - pts[k].x) || 1;
      approach[k] = pts[k].clone().add(new THREE.Vector3(side * 1.0, 0, 0));
      await drive(o.root, o.body, roundedPath(approach, 0.8), { vmax: heavy ? 7 : 9.5, onProgress: (u) => { o.root.position.y = u < exitFrac ? LOT_Y * (1 - u / exitFrac) : 0; } });
      await this.bayFree[bay];
      this.bayIsFree[bay] = false;
      await drive(o.root, o.body, roundedPath([approach[k], pts[k], pts[k + 1]], 0.8), { vmax: 5 });
    }
    this.seat(bay, i);
  }

  private async animCrane(i: number, bay: number) {
    const o = this.cars[i];
    this.uncover(i);
    const sy0 = this.symbols.get(i); if (sy0) { o.root.remove(sy0); this.symbols.delete(i); }
    const pb = this.plates.get(i); if (pb) { o.root.remove(pb); this.plates.delete(i); }
    const br = this.broken.get(i); if (br) { o.root.remove(br.badge, br.hazard); this.broken.delete(i); }
    sfx.craneSound(); haptic('medium');
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 6), new THREE.MeshStandardMaterial({ color: 0x222831, metalness: 0.6 }));
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.035, 8, 16, Math.PI * 1.4), new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.6, roughness: 0.3 }));
    this.group.add(cable, hook);
    const place = () => {
      const top = o.root.position.y + 1.35, sky = 16;
      cable.scale.y = sky - top; cable.position.set(o.root.position.x, (sky + top) / 2, o.root.position.z);
      hook.position.set(o.root.position.x, top - 0.08, o.root.position.z);
    };
    const start = o.root.position.clone(), end = new THREE.Vector3(this.L.bayX[bay], 0, this.L.bayZ + 0.05);
    const yaw0 = o.root.rotation.y;
    let yaw1 = 0; while (yaw1 - yaw0 > Math.PI) yaw1 -= 2 * Math.PI; while (yaw1 - yaw0 < -Math.PI) yaw1 += 2 * Math.PI;
    await tween(0.5, (k) => { o.root.position.y = start.y + k * 2.2; o.body.rotation.x = Math.sin(k * 9) * 0.05; place(); }, ease.out);
    await this.bayFree[bay];
    this.bayIsFree[bay] = false;
    await tween(0.9, (k) => {
      o.root.position.x = THREE.MathUtils.lerp(start.x, end.x, k);
      o.root.position.z = THREE.MathUtils.lerp(start.z, end.z, k);
      o.root.position.y = 2.2 + Math.sin(k * Math.PI) * 0.8;
      o.root.rotation.y = THREE.MathUtils.lerp(yaw0, yaw1, k);
      o.body.rotation.x = Math.sin(k * 7) * 0.06;
      place();
    }, ease.inOut);
    await tween(0.45, (k) => { o.root.position.y = 2.2 * (1 - k); place(); }, ease.in);
    sfx.bump(); this.hooks.shake(0.12); puff(this.group, o.root.position, 0.8); puff(this.group, o.root.position.clone().add(new THREE.Vector3(0.4, 0, 0.3)), 0.8);
    void settleBody(o.body);
    await tween(0.3, (k) => { cable.position.y += k * 3; hook.position.y += k * 3; }, ease.in);
    this.group.remove(cable, hook);
    this.seat(bay, i);
  }

  private animBoard(bay: number, v: number): Promise<void> {
    const p = this.queue.shift();
    const idx = this.vq++;
    // Everyone steps forward one place; a new face joins the back of the line.
    this.queue.forEach((q, k) => {
      const from = q.root.position.clone(), to = this.slot(k);
      // A little waddle as everyone shuffles forward.
      void tween(0.32, (e) => {
        q.root.position.lerpVectors(from, to, e);
        q.root.position.y = 0.18 + Math.abs(Math.sin(e * Math.PI * 2)) * 0.05;
        q.body.rotation.z = Math.sin(e * Math.PI * 4) * 0.12 * (1 - e);
      }, ease.inOut);
    });
    this.spawn(this.queue.length, true);
    this.hooks.queueLeft(this.s.queue.length - this.vq);
    if (!p) return Promise.resolve();
    const car = this.cars[v];
    const from = p.root.position.clone();
    const to = new THREE.Vector3(car.root.position.x + (((idx * 7) % 3) - 1) * 0.15, 0.35, car.root.position.z - 0.25);
    const cap = KIND[this.level.vehicles[v].kind].cap;
    return tween(0.36, (e) => {
      p.root.position.lerpVectors(from, to, e);
      p.root.position.y = from.y + (to.y - from.y) * e + Math.sin(e * Math.PI) * 0.9;
      p.root.rotation.y += 0.25;
      if (e > 0.7) p.root.scale.setScalar(1.12 * (1 - (e - 0.7) / 0.3) + 0.001);
    }, ease.linear).then(() => {
      this.group.remove(p.root);
      // The rules may already have sent this car off; count seats from the animation instead.
      const st = this.seats.get(bay);
      const boarded = (st?.sprite.userData.boarded ?? 0) + 1;
      if (st) st.sprite.userData.boarded = boarded;
      this.drawSeat(bay, boarded, cap, this.level.vehicles[v].color);
      sfx.pop(boarded / cap); haptic('light');
      void tween(0.18, (e) => { car.body.position.y = -Math.sin(e * Math.PI) * 0.04; }, ease.linear);
    });
  }

  private async animDepart(bay: number, v: number) {
    const o = this.cars[v], kind = this.level.vehicles[v].kind;
    this.dropSeat(bay);
    sfx.horn(kind === 'bus' ? 'bus' : kind === 'peykan' || kind === 'zamyad' ? 'old' : 'new', 2);
    haptic('success');
    coinBurst(this.group, o.root.position.clone().setY(1.2));
    sfx.coin(0.1);
    const now = performance.now() / 1000;
    this.combo = now - this.lastDepart < 1.8 ? this.combo + 1 : 1;
    this.lastDepart = now;
    const at = o.root.position.clone().add(new THREE.Vector3(0, 1.6, 0));
    this.hooks.float(`+${KIND[kind].cap}`, at, 'coin');
    if (this.combo >= 2) {
      const extra = 5 * this.combo;
      this.bonus += extra;
      setTimeout(() => { this.hooks.float(`${COMBO[Math.min(this.combo, COMBO.length - 1)]} +${extra}`, at.clone().add(new THREE.Vector3(0, 0.8, 0)), 'combo'); sfx.coin(0); sfx.coin(0.12); }, 250);
    }
    await tween(0.22, (k) => { o.body.position.y = Math.sin(k * Math.PI) * 0.12; }, ease.out);
    let release!: () => void;
    this.bayFree[bay] = new Promise((r) => { release = r; });
    const bx = this.L.bayX[bay], top = this.L.topRoadZ;
    const s = bx >= 0 ? 1 : -1; // leave toward the nearer side of the screen
    const back = roundedPath([o.root.position.clone().setY(0), new THREE.Vector3(bx, 0, top), new THREE.Vector3(bx - s * 1.1, 0, top)], 0.9);
    await drive(o.root, o.body, back, { vmax: 3.5, accel: 9, reverse: true });
    this.bayIsFree[bay] = true;
    release();
    sfx.engine(0, kind === 'bus' || kind === 'zamyad');
    const away = roundedPath([new THREE.Vector3(bx - s * 1.1, 0, top), new THREE.Vector3(s * 34, 0, top)]);
    await drive(o.root, o.body, away, { vmax: 11, accel: 10, brake: false });
    this.group.remove(o.root);
  }

  private async celebrate() {
    sfx.win(); haptic('success');
    confetti(this.group, new THREE.Vector3(0, 6, this.L.lotH / 2));
    await wait(1.1);
  }

  /** Ambient life each frame: passengers shift their weight and glance around. */
  idle(t: number) {
    const dt = Math.min(0.05, Math.max(0, t - this.lastT)); this.lastT = t;
    if (this.flakes) {
      const p = this.flakes.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        let y = p.getY(i) - dt * (0.9 + (i % 7) * 0.08);
        if (y < 0) y += 14;
        p.setY(i, y);
        p.setX(i, p.getX(i) + Math.sin(t * 0.8 + i) * dt * 0.25);
      }
      p.needsUpdate = true;
    }
    this.pigeons.forEach((p, k) => {
      if (p.away) return;
      const hd = p.o.getObjectByName('head')!;
      const peck = Math.max(0, Math.sin(t * 3 + k * 1.7)) ** 6;
      hd.position.set(0.09 + peck * 0.03, 0.13 - peck * 0.08, 0);
    });
    // Cars waiting in the bays idle: a faint shake and a puff of exhaust now and then.
    for (const b of this.s.bays) {
      if (!b) continue;
      const o = this.cars[b.v];
      o.body.position.x = Math.sin(t * 47 + b.v) * 0.004;
      if (Math.random() < 0.012) puff(this.group, new THREE.Vector3(0, 0.25, o.length / 2 + 0.1).applyQuaternion(o.root.quaternion).add(o.root.position), 0.35);
    }
    for (const [i, b] of this.broken) {
      if (t < b.nextPuff) continue;
      b.nextPuff = t + 0.35 + Math.random() * 0.3;
      const o = this.cars[i];
      const hood = new THREE.Vector3(0, 0.55, -this.cars[i].length * 0.3).applyQuaternion(o.root.quaternion).add(o.root.position);
      puff(this.group, hood, 0.55);
    }
    this.queue.forEach((p, k) => {
      if (!p) return;
      const ph = t * 2.2 + (this.vq + k) * 1.7;
      p.body.position.y = Math.max(0, Math.sin(ph)) * 0.025;
      p.body.rotation.y = Math.sin(ph * 0.31) * 0.35;
    });
  }

  /** After a loss: the car (still in the lot) the front passenger was waiting for, if any. */
  culprit(): number {
    const want = this.s.queue[this.s.q];
    let best = -1;
    this.level.vehicles.forEach((v, i) => { if (this.s.inLot[i] && v.color === want && (best < 0 || i < best)) best = i; });
    return best;
  }

  /** A pulsing ring under a vehicle, to point it out. */
  highlight(i: number) {
    const o = this.cars[i];
    if (!o) return;
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.95, 40), new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; ring.scale.set(1, o.length / 1.6, 1);
    o.root.add(ring);
    void tween(3, (k) => { const p = 1 + 0.15 * Math.sin(k * Math.PI * 8); ring.scale.set(p, (o.length / 1.6) * p, 1); (ring.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - k * 0.3); }, ease.linear).then(() => o.root.remove(ring));
  }

  /** Where the camera should look and what it must keep in view. */
  focus() { return this.L.focus; }
}

