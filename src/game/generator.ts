/** Level generation shared by the build script (Journey levels) and the game (daily challenge). */
import { COLORS, KIND, cellsOf, canExit, grid, moveCarts, newState, startState, updateParity, validate, type Color, type Dir, type Kind, type Level, type VehicleDef } from './rules';
import { rng, solve } from './solver';

export interface Spec {
  w: number; h: number; fill: number; colors: number; mix: number; target: number;
  zamyad?: number; bus?: number; cones?: number; tag?: string;
  /** Mechanics: fraction of covered cars, broken Peykans, دربست passengers, odd/even period. */
  cover?: number; broken?: number; vip?: number; oddEven?: number; bikes?: number; officer?: boolean; carts?: number;
  /** «ماشین عروس»: how many wedding cars (each with a deadline a little after its place in a natural exit order). */
  wedding?: number;
  /** «حاج‌خانم با خرید»: how many pairs of passengers become one grandma who takes both seats. */
  granny?: number;
  /** «تونل نیایش»: pairs of tunnel mouths. */
  tunnels?: number;
  intro?: Level['intro'];
  /** Fewer pickup bays than the usual five. */
  bays?: number;
}

const DIRS: Dir[] = ['up', 'down', 'left', 'right'];
const SEDANS: Kind[] = ['pride', 'peykan', 'p405'];

export function generate(spec: Spec, seed: number): Level | null {
  const r = rng(seed), pick = <T,>(a: readonly T[]) => a[Math.floor(r() * a.length)];
  const { w, h } = spec;
  const occ = new Set<number>();
  const vehicles: VehicleDef[] = [];
  const cones: { kind: 'cone' | 'cart' | 'tunnel'; col: number; row: number; dir?: Dir; every?: number; pair?: number }[] = [];
  const target = spec.fill * w * h;
  let used = 0;
  for (let tries = 0; tries < 4000 && used < target; tries++) {
    const x = r();
    const kind: Kind = x < (spec.bus ?? 0) ? 'bus' : x < (spec.bus ?? 0) + (spec.zamyad ?? 0) ? 'zamyad' : pick(SEDANS);
    // Slight bias toward vertical cars: the lot is taller than wide and exits up are the most readable.
    const dir = r() < 0.6 ? (r() < 0.62 ? 'up' : 'down') : r() < 0.5 ? 'left' : 'right';
    const v: VehicleDef = { kind, color: 'red', col: Math.floor(r() * w), row: Math.floor(r() * h), dir };
    const cells = cellsOf(v);
    if (cells.some(([c, rr]) => c >= w || rr >= h || occ.has(rr * w + c))) continue;
    cells.forEach(([c, rr]) => occ.add(rr * w + c));
    vehicles.push(v);
    used += cells.length;
  }
  for (let i = 0, tries = 0; i < (spec.cones ?? 0) && tries < 200; tries++) {
    const c = Math.floor(r() * w), rr = Math.floor(r() * h);
    if (occ.has(rr * w + c)) continue;
    occ.add(rr * w + c); cones.push({ kind: 'cone', col: c, row: rr }); i++;
  }
  // Tunnel mouths come in pairs, in different rows and columns so a hop really goes somewhere.
  for (let t = 0, tries = 0; t < (spec.tunnels ?? 0) && tries < 300; tries++) {
    const a = [Math.floor(r() * w), Math.floor(r() * h)], b = [Math.floor(r() * w), Math.floor(r() * h)];
    if (a[0] === b[0] || a[1] === b[1] || occ.has(a[1] * w + a[0]) || occ.has(b[1] * w + b[0])) continue;
    occ.add(a[1] * w + a[0]); occ.add(b[1] * w + b[0]);
    const k = cones.length;
    cones.push({ kind: 'tunnel', col: a[0], row: a[1], pair: k + 1 }, { kind: 'tunnel', col: b[0], row: b[1], pair: k });
    t++;
  }
  // Fruit carts take a free cell and roll along a row or column.
  for (let i = 0, tries = 0; i < (spec.carts ?? 0) && tries < 200; tries++) {
    const c = Math.floor(r() * w), rr = Math.floor(r() * h);
    if (occ.has(rr * w + c)) continue;
    occ.add(rr * w + c); cones.push({ kind: 'cart', col: c, row: rr, dir: pick(['left', 'right', 'up', 'down'] as Dir[]), every: 2 }); i++;
  }
  // Courier bikes slot into leftover single cells.
  for (let b = 0, tries = 0; b < (spec.bikes ?? 0) && tries < 300; tries++) {
    const c = Math.floor(r() * w), rr = Math.floor(r() * h);
    if (occ.has(rr * w + c)) continue;
    occ.add(rr * w + c);
    vehicles.push({ kind: 'bike', color: 'white', col: c, row: rr, dir: pick(DIRS) });
    b++;
  }
  // Drop vehicles that can never leave (facing each other, or walled in by cones).
  const probe: Level = { w, h, vehicles, obstacles: cones, queue: [] };
  const s = newState(probe);
  const order: number[] = [];
  for (let progress = true; progress;) {
    progress = false;
    const g = grid(s);
    const free = vehicles.map((_, i) => i).filter((i) => canExit(s, i, g));
    if (free.length) { const i = pick(free); s.inLot[i] = false; order.push(i); progress = true; }
  }
  const keep = vehicles.filter((_, i) => order.includes(i));
  if (keep.length < 3) return null;
  const remap = new Map(order.map((i) => [i, keep.indexOf(vehicles[i])]));
  // Colors: balanced round-robin over a shuffled palette.
  const palette = [...COLORS.slice(0, 6)].sort(() => r() - 0.5).slice(0, spec.colors) as Color[];
  keep.forEach((v, i) => { v.color = palette[i % palette.length]; });
  for (let i = keep.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [keep[i].color, keep[j].color] = [keep[j].color, keep[i].color]; }
  for (const v of keep) if (v.color === 'yellow' && SEDANS.includes(v.kind)) v.kind = 'samand';
  for (const v of keep) if (v.kind === 'bike') v.color = 'white';
  void remap;
  // Plates for «طرح زوج و فرد», then a fresh exit order that respects them.
  if (spec.oddEven) for (const v of keep) v.plate = Math.floor(r() * 10);
  const base: Level = { w, h, vehicles: keep, obstacles: cones, queue: [], oddEven: spec.oddEven, officer: spec.officer };
  const st = startState(base);
  const seq: number[] = [];
  while (seq.length < keep.length) {
    const g = grid(st);
    const free = keep.map((_, i) => i).filter((i) => canExit(st, i, g));
    if (!free.length) return null;
    const i = pick(free); st.inLot[i] = false; st.exits++; st.sinceSwitch++; moveCarts(st); updateParity(st); seq.push(i);
  }
  // Broken Peykans: a car late in the order that must wait for the ones before it.
  for (let b = 0; b < (spec.broken ?? 0); b++) {
    const p = 3 + Math.floor(r() * Math.max(1, seq.length - 4));
    const v = keep[seq[p]];
    if (!v || v.wait || v.kind === 'bike' || KIND[v.kind].len !== 2) continue;
    v.kind = v.kind === 'samand' ? 'samand' : 'peykan';
    if (KIND[v.kind].len !== cellsOf(v).length) continue;
    v.wait = Math.max(2, p - Math.floor(r() * 2));
  }
  // Car covers on vehicles that do not leave first.
  if (spec.cover) for (const i of seq.slice(2)) if (r() < spec.cover && !keep[i].wait && keep[i].kind !== 'bike') keep[i].covered = true;
  // «ماشین عروس»: a sedan that leaves early in a natural order gets a deadline with a little slack.
  for (let k = 0, tries = 0; k < (spec.wedding ?? 0) && tries < 20; tries++) {
    const p = 1 + Math.floor(r() * Math.max(1, Math.min(seq.length - 2, 6)));
    const v = keep[seq[p]];
    if (!v || v.wedding || v.wait || v.covered || KIND[v.kind].cap !== 4) continue;
    v.wedding = p + 2 + Math.floor(r() * 2);
    if (v.kind === 'samand') v.kind = 'p405'; // flowers go on the hood, where a taxi wears its arrow
    k++;
  }
  // «دربست» passengers: some sedans carry a single VIP instead of four people.
  const vipCars = new Set<number>();
  for (let k = 0; k < (spec.vip ?? 0); k++) {
    const cands = seq.slice(2).filter((i) => KIND[keep[i].kind].cap === 4 && !vipCars.has(i));
    if (cands.length) vipCars.add(pick(cands));
  }
  // The queue follows the exit order, then gets mixed: each mix step swaps two passenger groups nearby.
  const groups: { c: Color[]; vip?: boolean; granny?: boolean }[] = [];
  for (const i of seq) {
    const v = keep[i], cap = KIND[v.kind].cap;
    if (vipCars.has(i)) { groups.push({ c: [v.color], vip: true }); continue; }
    if (v.kind === 'bike') { groups.push({ c: [pick(palette)] }); continue; }
    for (let k = 0; k < cap; k += 2) groups.push({ c: Array(Math.min(2, cap - k)).fill(v.color) });
  }
  // Grandmas: some pairs of the same color become one passenger with shopping who needs both seats.
  for (let k = 0, tries = 0; k < (spec.granny ?? 0) && tries < 40; tries++) {
    const gi = Math.floor(r() * groups.length), g = groups[gi];
    if (g.vip || g.granny || g.c.length !== 2) continue;
    groups[gi] = { c: [g.c[0]], granny: true };
    k++;
  }
  for (let m = 0; m < spec.mix * 3; m++) {
    const a = Math.floor(r() * groups.length), b = Math.min(groups.length - 1, a + 1 + Math.floor(r() * 6));
    [groups[a], groups[b]] = [groups[b], groups[a]];
  }
  const queue: Color[] = [], vip: number[] = [], granny: number[] = [];
  for (const g of groups) { if (g.vip) vip.push(queue.length); if (g.granny) granny.push(queue.length); queue.push(...g.c); }
  const level: Level = { w, h, vehicles: keep, obstacles: cones.length ? cones : undefined, queue };
  if (vip.length) level.vip = vip;
  if (granny.length) level.granny = granny;
  if (spec.oddEven) level.oddEven = spec.oddEven;
  if (spec.officer) level.officer = true;
  if (spec.intro) level.intro = spec.intro;
  if (spec.tag) level.tag = spec.tag;
  if (spec.bays) level.bays = spec.bays;
  if (validate(level).length) throw new Error(validate(level).join('; '));
  return level;
}


/** A level for a spec that the solver can finish, trying seeds from `seed` on. */
export function solvable(spec: Spec, seed: number, tries = 60): Level | null {
  for (let k = 0; k < tries; k++) {
    const l = generate(spec, seed + k * 7919);
    if (!l) continue;
    const cells = l.vehicles.reduce((a, v) => a + KIND[v.kind].len, 0);
    if (cells < spec.w * spec.h * spec.fill * 0.8) continue;
    if (solve(l, 150_000).solvable) return l;
  }
  return null;
}
