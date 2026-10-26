/**
 * The puzzle rules, free of any rendering. A level is a grid of vehicles; tapping one sends it out
 * of the lot (if its lane is clear) to a free bay at the bus stop, where matching passengers board.
 */

export type Dir = 'up' | 'down' | 'left' | 'right';
export const COLORS = ['red', 'yellow', 'blue', 'green', 'purple', 'orange', 'white', 'pink'] as const;
export type Color = (typeof COLORS)[number];
export type Kind = 'pride' | 'peykan' | 'p405' | 'samand' | 'zamyad' | 'bus';

export const KIND: Record<Kind, { len: number; cap: number }> = {
  pride: { len: 2, cap: 4 },
  peykan: { len: 2, cap: 4 },
  p405: { len: 2, cap: 4 },
  samand: { len: 2, cap: 4 },
  zamyad: { len: 3, cap: 6 },
  bus: { len: 3, cap: 8 },
};

export interface VehicleDef { kind: Kind; color: Color; col: number; row: number; dir: Dir; }
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
}

export interface Bay { v: number; color: Color; cap: number; boarded: number; }

export interface State {
  level: Level;
  /** Vehicles still in the lot. */
  inLot: boolean[];
  bays: (Bay | null)[];
  /** The passenger queue (a copy: boosters may reorder it). */
  queue: Color[];
  /** Index of the next passenger in the queue. */
  q: number;
  over: false | 'won' | 'lost';
}

export type Event =
  | { t: 'exit'; v: number; bay: number }
  | { t: 'blocked'; v: number; by: { v?: number; cell: [number, number] } }
  | { t: 'bays-full'; v: number }
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
  return { level, inLot: level.vehicles.map(() => true), bays: Array(level.bays ?? 5).fill(null), queue: [...level.queue], q: 0, over: false };
}

export function cloneState(s: State): State {
  return { level: s.level, inLot: [...s.inLot], bays: s.bays.map((b) => (b ? { ...b } : null)), queue: s.queue, q: s.q, over: s.over };
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

export const canExit = (s: State, i: number, g?: Int16Array) => s.inLot[i] && !blocker(s, i, g);

/** Board everyone who can board, in queue order. Mutates s and appends events. */
function settle(s: State, ev: Event[]) {
  const { queue } = s;
  for (;;) {
    if (s.q >= queue.length) break;
    const color = queue[s.q];
    // The bay that has waited longest for this color (lowest index among matching, partially filled first).
    let best = -1;
    s.bays.forEach((b, k) => { if (b && b.color === color && b.boarded < b.cap && (best < 0 || b.boarded > s.bays[best]!.boarded)) best = k; });
    if (best < 0) break;
    const b = s.bays[best]!;
    b.boarded++;
    ev.push({ t: 'board', bay: best, v: b.v, color, passenger: s.q });
    s.q++;
    if (b.boarded === b.cap) { ev.push({ t: 'depart', bay: best, v: b.v }); s.bays[best] = null; }
  }
  if (s.q >= queue.length && s.inLot.every((x) => !x) && s.bays.every((b) => !b)) { s.over = 'won'; ev.push({ t: 'won' }); return; }
  if (s.bays.every((b) => b)) { s.over = 'lost'; ev.push({ t: 'lost' }); }
}

/** Tap a vehicle (or lift it out with the crane: `force`). Returns what happened, in order. */
export function tap(s: State, i: number, force = false): Event[] {
  const ev: Event[] = [];
  if (s.over || !s.inLot[i]) return ev;
  const b = force ? null : blocker(s, i);
  if (b) { ev.push({ t: 'blocked', v: i, by: b }); return ev; }
  const free = s.bays.findIndex((x) => !x);
  if (free < 0) { ev.push({ t: 'bays-full', v: i }); return ev; }
  const v = s.level.vehicles[i];
  s.inLot[i] = false;
  s.bays[free] = { v: i, color: v.color, cap: KIND[v.kind].cap, boarded: 0 };
  ev.push({ t: 'exit', v: i, bay: free });
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
  const head = s.queue.slice(s.q, s.q + span);
  const rank = (c: Color) => {
    let best = -1;
    for (const b of s.bays) if (b && b.color === c) best = Math.max(best, b.boarded);
    return best;
  };
  // Stable sort: colors with a waiting car first (fuller car first), others keep their order.
  const sorted = head.map((c, i) => ({ c, i, r: rank(c) })).sort((a, b) => (b.r >= 0 ? 1 : 0) - (a.r >= 0 ? 1 : 0) || b.r - a.r || a.i - b.i).map((x) => x.c);
  s.queue = [...s.queue.slice(0, s.q), ...sorted, ...s.queue.slice(s.q + span)];
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
  const seats = new Map<Color, number>(), people = new Map<Color, number>();
  for (const v of level.vehicles) seats.set(v.color, (seats.get(v.color) ?? 0) + KIND[v.kind].cap);
  for (const c of level.queue) people.set(c, (people.get(c) ?? 0) + 1);
  for (const c of new Set([...seats.keys(), ...people.keys()])) if ((seats.get(c) ?? 0) !== (people.get(c) ?? 0)) errs.push(`${c}: ${seats.get(c) ?? 0} seats vs ${people.get(c) ?? 0} passengers`);
  return errs;
}
