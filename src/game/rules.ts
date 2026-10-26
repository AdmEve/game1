/**
 * The puzzle rules, free of any rendering. A level is a grid of vehicles; tapping one sends it out
 * of the lot (if its lane is clear) to a free bay at the bus stop, where matching passengers board.
 */

export type Dir = 'up' | 'down' | 'left' | 'right';
export const COLORS = ['red', 'yellow', 'blue', 'green', 'purple', 'orange', 'white', 'pink', 'silver', 'black'] as const;
export type Color = (typeof COLORS)[number];
export type Kind = 'pride' | 'peykan' | 'p405' | 'samand' | 'zamyad' | 'bus' | 'bike';

export const KIND: Record<Kind, { len: number; cap: number }> = {
  pride: { len: 2, cap: 4 },
  peykan: { len: 2, cap: 4 },
  p405: { len: 2, cap: 4 },
  samand: { len: 2, cap: 4 },
  zamyad: { len: 3, cap: 6 },
  bus: { len: 3, cap: 8 },
  // «پیک موتوری»: one cell, one passenger of any color.
  bike: { len: 1, cap: 1 },
};

export interface VehicleDef {
  kind: Kind; color: Color; col: number; row: number; dir: Dir;
  /** «چادر ماشین»: hidden under a car cover until a neighbouring vehicle leaves. */
  covered?: boolean;
  /** «پیکان خراب»: broken down; it can only leave after this many other vehicles have left. */
  wait?: number;
  /** Last digit of the plate (for «طرح زوج و فرد» levels). */
  plate?: number;
}
export interface ObstacleDef { kind: 'cone'; col: number; row: number; }

export interface Level {
  w: number;
  h: number;
  vehicles: VehicleDef[];
  obstacles?: ObstacleDef[];
  /** Passenger colors from the front of the queue. */
  queue: Color[];
  bays?: number;
  /** Designer label for hard levels: 'hard' | 'boss'. */
  tag?: string;
  /** «دربست!» passengers (queue indices): they ride alone in an empty car, which leaves at once. */
  vip?: number[];
  /** «طرح زوج و فرد»: only even plates may leave, then odd, switching after this many exits. */
  oddEven?: number;
  /** The first level with a new mechanic shows its intro card. */
  intro?: 'cover' | 'broken' | 'vip' | 'oddEven' | 'courier';
}

export interface Bay { v: number; color: Color; cap: number; boarded: number; /** A courier bike takes anyone. */ wild?: boolean; }

export interface State {
  level: Level;
  /** Vehicles still in the lot. */
  inLot: boolean[];
  bays: (Bay | null)[];
  /** The passenger queue (a copy: boosters may reorder it) and which of them are «دربست». */
  queue: Color[];
  vip: boolean[];
  /** Vehicles that have left the lot so far. */
  exits: number;
  /** Covered vehicles whose color has been revealed. */
  revealed: boolean[];
  /** «طرح زوج و فرد»: which plates may leave now (0 even, 1 odd) and exits since the last switch. */
  parity: 0 | 1;
  sinceSwitch: number;
  /** Index of the next passenger in the queue. */
  q: number;
  over: false | 'won' | 'lost';
}

export type Event =
  | { t: 'exit'; v: number; bay: number }
  | { t: 'blocked'; v: number; by: { v?: number; cell: [number, number] } }
  | { t: 'bays-full'; v: number }
  | { t: 'locked'; v: number; why: 'broken' | 'plate'; left: number }
  | { t: 'reveal'; v: number }
  | { t: 'parity'; parity: 0 | 1 }
  | { t: 'board'; bay: number; v: number; color: Color; passenger: number }
  | { t: 'depart'; bay: number; v: number }
  | { t: 'won' }
  | { t: 'lost' };

export const DELTA: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

export const cellsOf = (v: VehicleDef): [number, number][] => {
  const len = KIND[v.kind].len, horiz = v.dir === 'left' || v.dir === 'right', out: [number, number][] = [];
  for (let i = 0; i < len; i++) out.push(horiz ? [v.col + i, v.row] : [v.col, v.row + i]);
  return out;
};

/** The cell just in front of the vehicle's nose. */
export function frontCell(v: VehicleDef): [number, number] {
  const len = KIND[v.kind].len;
  switch (v.dir) {
    case 'up': return [v.col, v.row - 1];
    case 'down': return [v.col, v.row + len];
    case 'left': return [v.col - 1, v.row];
    case 'right': return [v.col + len, v.row];
  }
}

export function newState(level: Level): State {
  const vip = level.queue.map(() => false);
  for (const i of level.vip ?? []) vip[i] = true;
  return {
    level, inLot: level.vehicles.map(() => true), bays: Array(level.bays ?? 5).fill(null), queue: [...level.queue], vip, q: 0, over: false,
    exits: 0, revealed: level.vehicles.map((v) => !v.covered), parity: 0, sinceSwitch: 0,
  };
}

/** A fresh state with the plate camera already pointing at plates that can move. */
export function startState(level: Level): State {
  const s = newState(level);
  updateParity(s);
  return s;
}

export function cloneState(s: State): State {
  return { level: s.level, inLot: [...s.inLot], bays: s.bays.map((b) => (b ? { ...b } : null)), queue: s.queue, vip: s.vip, q: s.q, over: s.over, exits: s.exits, revealed: [...s.revealed], parity: s.parity, sinceSwitch: s.sinceSwitch };
}

/** «طرح زوج و فرد»: which plate parity may leave now (0 = even, 1 = odd), or null if the rule is off. */
export function parityNow(s: State): 0 | 1 | null {
  return s.level.oddEven ? s.parity : null;
}

/**
 * After an exit: the camera switches every `oddEven` exits, and also whenever no car with the allowed
 * plates can drive out (so the rule never wedges the lot).
 */
export function updateParity(s: State, ev?: Event[]) {
  const p = s.level.oddEven;
  if (!p) return;
  const flip = () => { s.parity = (1 - s.parity) as 0 | 1; s.sinceSwitch = 0; ev?.push({ t: 'parity', parity: s.parity }); };
  if (s.sinceSwitch >= p) flip();
  const g = grid(s);
  const movable = (par: number) => s.level.vehicles.some((v, i) => s.inLot[i] && (v.plate ?? 0) % 2 === par && !blocker(s, i, g) && !(v.wait && s.exits < v.wait));
  if (!movable(s.parity) && movable(1 - s.parity)) flip();
}

/** Why a vehicle with a clear lane may still not leave. */
export function lock(s: State, i: number): { why: 'broken' | 'plate'; left: number } | null {
  const v = s.level.vehicles[i];
  if (v.wait && s.exits < v.wait) return { why: 'broken', left: v.wait - s.exits };
  const par = parityNow(s);
  if (par !== null && v.plate !== undefined && v.plate % 2 !== par) {
    return { why: 'plate', left: s.level.oddEven! - s.sinceSwitch };
  }
  return null;
}

/** Occupancy grid: vehicle index, -2 for an obstacle, -1 for empty. */
export function grid(s: State): Int16Array {
  const { w, h } = s.level, g = new Int16Array(w * h).fill(-1);
  s.level.vehicles.forEach((v, i) => { if (s.inLot[i]) for (const [c, r] of cellsOf(v)) g[r * w + c] = i; });
  for (const o of s.level.obstacles ?? []) g[o.row * s.level.w + o.col] = -2;
  return g;
}

/** First thing in the vehicle's way, or null if its lane to the edge is clear. */
export function blocker(s: State, i: number, g = grid(s)): { v?: number; cell: [number, number] } | null {
  const v = s.level.vehicles[i], [dc, dr] = DELTA[v.dir], { w, h } = s.level;
  let [c, r] = frontCell(v);
  while (c >= 0 && r >= 0 && c < w && r < h) {
    const x = g[r * w + c];
    if (x !== -1) return x >= 0 ? { v: x, cell: [c, r] } : { cell: [c, r] };
    c += dc; r += dr;
  }
  return null;
}

export const canExit = (s: State, i: number, g?: Int16Array) => s.inLot[i] && !lock(s, i) && !blocker(s, i, g);

/** Board everyone who can board, in queue order. Mutates s and appends events. */
function settle(s: State, ev: Event[]) {
  const { queue } = s;
  for (;;) {
    if (s.q >= queue.length) break;
    const color = queue[s.q], vip = s.vip[s.q];
    // A «دربست» passenger needs an empty car of their color; others take the fullest matching car.
    let best = -1;
    s.bays.forEach((b, k) => {
      if (!b || b.wild || b.color !== color || b.boarded >= b.cap) return;
      if (vip && b.boarded > 0) return;
      if (best < 0 || b.boarded > s.bays[best]!.boarded) best = k;
    });
    // Nobody's car is here: a waiting courier bike takes them (a VIP insists on a whole car).
    if (best < 0 && !vip) best = s.bays.findIndex((b) => !!b && !!b.wild && b.boarded < b.cap);
    if (best < 0) break;
    const b = s.bays[best]!;
    b.boarded++;
    ev.push({ t: 'board', bay: best, v: b.v, color, passenger: s.q });
    s.q++;
    if (b.boarded === b.cap || vip) { ev.push({ t: 'depart', bay: best, v: b.v }); s.bays[best] = null; }
  }
  if (s.q >= queue.length && s.inLot.every((x) => !x) && s.bays.every((b) => !b)) { s.over = 'won'; ev.push({ t: 'won' }); return; }
  if (s.bays.every((b) => b)) { s.over = 'lost'; ev.push({ t: 'lost' }); }
}

/** Tap a vehicle (or lift it out with the crane: `force`). Returns what happened, in order. */
export function tap(s: State, i: number, force = false): Event[] {
  const ev: Event[] = [];
  if (s.over || !s.inLot[i]) return ev;
  const lk = force ? null : lock(s, i);
  if (lk) { ev.push({ t: 'locked', v: i, ...lk }); return ev; }
  const b = force ? null : blocker(s, i);
  if (b) { ev.push({ t: 'blocked', v: i, by: b }); return ev; }
  const free = s.bays.findIndex((x) => !x);
  if (free < 0) { ev.push({ t: 'bays-full', v: i }); return ev; }
  const v = s.level.vehicles[i];
  s.inLot[i] = false;
  s.exits++;
  s.sinceSwitch++;
  s.revealed[i] = true;
  s.bays[free] = { v: i, color: v.color, cap: KIND[v.kind].cap, boarded: 0, ...(v.kind === 'bike' ? { wild: true } : {}) };
  ev.push({ t: 'exit', v: i, bay: free });
  // Covers blow off the cars next to the one that just left.
  const mine = cellsOf(v);
  s.level.vehicles.forEach((o, k) => {
    if (s.revealed[k] || !s.inLot[k]) return;
    if (cellsOf(o).some(([c, r]) => mine.some(([mc, mr]) => Math.abs(mc - c) + Math.abs(mr - r) === 1))) { s.revealed[k] = true; ev.push({ t: 'reveal', v: k }); }
  });
  updateParity(s, ev);
  settle(s, ev);
  return ev;
}

/** Give the player an extra bay (booster / continue). */
export function addBay(s: State) {
  s.bays.push(null);
  if (s.over === 'lost') s.over = false;
}

/**
 * The police whistle: the next passengers line up so those who can ride a waiting car come first
 * (the fullest car first). Returns the events of everyone who then boards.
 */
export function whistle(s: State, span = 12): Event[] {
  if (s.over) return [];
  const head = s.queue.slice(s.q, s.q + span), headVip = s.vip.slice(s.q, s.q + span);
  const rank = (c: Color) => {
    let best = -1;
    for (const b of s.bays) if (b && b.color === c) best = Math.max(best, b.boarded);
    return best;
  };
  // Stable sort: colors with a waiting car first (fuller car first), others keep their order.
  const order = head.map((c, i) => ({ c, i, r: headVip[i] ? -1 : rank(c) })).sort((a, b) => (b.r >= 0 ? 1 : 0) - (a.r >= 0 ? 1 : 0) || b.r - a.r || a.i - b.i);
  s.queue = [...s.queue.slice(0, s.q), ...order.map((x) => x.c), ...s.queue.slice(s.q + span)];
  s.vip = [...s.vip.slice(0, s.q), ...order.map((x) => headVip[x.i]), ...s.vip.slice(s.q + span)];
  const ev: Event[] = [];
  settle(s, ev);
  return ev;
}

/** Sanity checks: grid bounds, overlaps, and passenger counts matching seats per color. */
export function validate(level: Level): string[] {
  const errs: string[] = [];
  const seen = new Map<number, number>();
  level.vehicles.forEach((v, i) => {
    for (const [c, r] of cellsOf(v)) {
      if (c < 0 || r < 0 || c >= level.w || r >= level.h) errs.push(`vehicle ${i} out of bounds`);
      const k = r * level.w + c;
      if (seen.has(k)) errs.push(`vehicle ${i} overlaps ${seen.get(k)}`);
      seen.set(k, i);
    }
  });
  for (const o of level.obstacles ?? []) if (seen.has(o.row * level.w + o.col)) errs.push(`obstacle overlaps at ${o.col},${o.row}`);
  const vips = new Set(level.vip ?? []);
  const bikes = level.vehicles.filter((v) => v.kind === 'bike').length;
  if (bikes) {
    // Couriers take anyone, so only the totals must agree (the solver checks the rest).
    const seats = level.vehicles.reduce((a, v) => a + KIND[v.kind].cap, 0);
    if (!vips.size && seats !== level.queue.length) errs.push(`${seats} seats vs ${level.queue.length} passengers`);
    return errs;
  }
  const colors = new Set<Color>([...level.vehicles.map((v) => v.color), ...level.queue]);
  for (const c of colors) {
    const caps = level.vehicles.filter((v) => v.color === c).map((v) => KIND[v.kind].cap);
    const seats = caps.reduce((a, x) => a + x, 0);
    let regular = 0, vip = 0;
    level.queue.forEach((q, i) => { if (q === c) { if (vips.has(i)) vip++; else regular++; } });
    // Each «دربست» passenger empties one whole car: some `vip` of this color's cars must hold exactly the rest.
    const spare = seats - regular;
    const pick = (from: number, n: number, sum: number): boolean => n === 0 ? sum === 0 : from < caps.length && (pick(from + 1, n - 1, sum - caps[from]) || pick(from + 1, n, sum));
    if (!pick(0, vip, spare)) errs.push(`${c}: ${seats} seats vs ${regular} passengers + ${vip} دربست`);
  }
  return errs;
}
