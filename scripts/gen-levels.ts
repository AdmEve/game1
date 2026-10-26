/**
 * Generates the Journey levels into src/game/levels.json.
 *   npx vite-node scripts/gen-levels.ts
 * Every level is solver-verified, then picked from many candidates to hit a target difficulty
 * (the win rate of a simulated casual player who looks three passengers ahead).
 */
import { writeFileSync } from 'node:fs';
import { COLORS, KIND, cellsOf, canExit, grid, newState, startState, updateParity, validate, type Color, type Dir, type Kind, type Level, type VehicleDef } from '../src/game/rules';
import { playRates, rng, solve } from '../src/game/solver';

interface Spec {
  w: number; h: number; fill: number; colors: number; mix: number; target: number;
  zamyad?: number; bus?: number; cones?: number; tag?: string;
  /** Mechanics: fraction of covered cars, broken Peykans, دربست passengers, odd/even period. */
  cover?: number; broken?: number; vip?: number; oddEven?: number;
  intro?: Level['intro'];
}

// Difficulty curve: a sawtooth with a «سخت» (hard) level every five.
const SPECS: Spec[] = [
{ w: 4, h: 4, fill: 0.5, colors: 2, mix: 0, target: 1 },
  { w: 4, h: 5, fill: 0.6, colors: 2, mix: 1, target: 1 },
  { w: 5, h: 5, fill: 0.7, colors: 3, mix: 2, target: 0.95 },
  { w: 5, h: 6, fill: 0.75, colors: 3, mix: 3, target: 0.9, cones: 1 },
  { w: 5, h: 6, fill: 0.85, colors: 3, mix: 6, target: 0.6, tag: 'hard' },
  { w: 6, h: 6, fill: 0.75, colors: 3, mix: 3, target: 0.9, zamyad: 0.15 },
  { w: 6, h: 6, fill: 0.8, colors: 4, mix: 4, target: 0.85, zamyad: 0.15, cover: 0.3, intro: 'cover' },
  { w: 6, h: 7, fill: 0.8, colors: 4, mix: 5, target: 0.8, cones: 1, cover: 0.25 },
  { w: 6, h: 7, fill: 0.82, colors: 4, mix: 5, target: 0.75, bus: 0.08 },
  { w: 6, h: 7, fill: 0.88, colors: 4, mix: 9, target: 0.4, zamyad: 0.15, tag: 'hard' },
  { w: 6, h: 7, fill: 0.8, colors: 4, mix: 5, target: 0.85, bus: 0.1, broken: 1, intro: 'broken' },
  { w: 7, h: 7, fill: 0.8, colors: 4, mix: 6, target: 0.8, zamyad: 0.12, cones: 1, broken: 1, cover: 0.2 },
  { w: 7, h: 7, fill: 0.82, colors: 5, mix: 6, target: 0.75, bus: 0.08, cover: 0.3 },
  { w: 7, h: 8, fill: 0.82, colors: 5, mix: 7, target: 0.7, zamyad: 0.12 },
  { w: 7, h: 8, fill: 0.9, colors: 5, mix: 11, target: 0.35, bus: 0.08, cones: 2, tag: 'hard' },
  { w: 7, h: 8, fill: 0.8, colors: 5, mix: 6, target: 0.8, zamyad: 0.12, vip: 1, intro: 'vip' },
  { w: 7, h: 8, fill: 0.84, colors: 5, mix: 7, target: 0.7, bus: 0.1, cones: 1, vip: 1, broken: 1 },
  { w: 7, h: 8, fill: 0.85, colors: 5, mix: 8, target: 0.65, zamyad: 0.15, cover: 0.3, vip: 1 },
  { w: 7, h: 9, fill: 0.85, colors: 5, mix: 8, target: 0.6, bus: 0.08, cones: 2, broken: 2 },
  { w: 7, h: 9, fill: 0.9, colors: 6, mix: 12, target: 0.3, zamyad: 0.12, bus: 0.06, tag: 'hard', cover: 0.3, broken: 1, vip: 1 },
  { w: 7, h: 8, fill: 0.82, colors: 5, mix: 7, target: 0.75, zamyad: 0.12, oddEven: 3, intro: 'oddEven' },
  { w: 7, h: 9, fill: 0.85, colors: 6, mix: 8, target: 0.65, bus: 0.08, cones: 1, oddEven: 3, cover: 0.2 },
  { w: 7, h: 9, fill: 0.86, colors: 6, mix: 9, target: 0.6, zamyad: 0.15, oddEven: 4, vip: 1 },
  { w: 7, h: 9, fill: 0.88, colors: 6, mix: 10, target: 0.5, bus: 0.1, cones: 2, oddEven: 3, broken: 1 },
  { w: 7, h: 9, fill: 0.92, colors: 6, mix: 13, target: 0.25, zamyad: 0.12, bus: 0.08, tag: 'hard', oddEven: 3, cover: 0.25, vip: 1 },
  { w: 7, h: 9, fill: 0.84, colors: 6, mix: 8, target: 0.7, zamyad: 0.12, cover: 0.3, broken: 1 },
  { w: 7, h: 9, fill: 0.86, colors: 6, mix: 9, target: 0.6, bus: 0.1, cones: 1, oddEven: 3, vip: 2 },
  { w: 7, h: 10, fill: 0.88, colors: 6, mix: 10, target: 0.5, zamyad: 0.15, cones: 2, cover: 0.35, broken: 1, vip: 1 },
  { w: 7, h: 10, fill: 0.9, colors: 6, mix: 11, target: 0.4, bus: 0.1, zamyad: 0.1, oddEven: 3, cover: 0.25, broken: 1 },
  { w: 7, h: 10, fill: 0.93, colors: 6, mix: 15, target: 0.15, zamyad: 0.12, bus: 0.08, cones: 2, tag: 'boss', oddEven: 4, cover: 0.3, broken: 1, vip: 1 },
];

const DIRS: Dir[] = ['up', 'down', 'left', 'right'];
const SEDANS: Kind[] = ['pride', 'peykan', 'p405'];

function generate(spec: Spec, seed: number): Level | null {
  const r = rng(seed), pick = <T,>(a: readonly T[]) => a[Math.floor(r() * a.length)];
  const { w, h } = spec;
  const occ = new Set<number>();
  const vehicles: VehicleDef[] = [];
  const cones: { kind: 'cone'; col: number; row: number }[] = [];
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
  void remap;
  // Plates for «طرح زوج و فرد», then a fresh exit order that respects them.
  if (spec.oddEven) for (const v of keep) v.plate = Math.floor(r() * 10);
  const base: Level = { w, h, vehicles: keep, obstacles: cones, queue: [], oddEven: spec.oddEven };
  const st = startState(base);
  const seq: number[] = [];
  while (seq.length < keep.length) {
    const g = grid(st);
    const free = keep.map((_, i) => i).filter((i) => canExit(st, i, g));
    if (!free.length) return null;
    const i = pick(free); st.inLot[i] = false; st.exits++; st.sinceSwitch++; updateParity(st); seq.push(i);
  }
  // Broken Peykans: a car late in the order that must wait for the ones before it.
  for (let b = 0; b < (spec.broken ?? 0); b++) {
    const p = 3 + Math.floor(r() * Math.max(1, seq.length - 4));
    const v = keep[seq[p]];
    if (!v || v.wait) continue;
    v.kind = v.kind === 'samand' ? 'samand' : 'peykan';
    if (KIND[v.kind].len !== cellsOf(v).length) continue;
    v.wait = Math.max(2, p - Math.floor(r() * 2));
  }
  // Car covers on vehicles that do not leave first.
  if (spec.cover) for (const i of seq.slice(2)) if (r() < spec.cover && !keep[i].wait) keep[i].covered = true;
  // «دربست» passengers: some sedans carry a single VIP instead of four people.
  const vipCars = new Set<number>();
  for (let k = 0; k < (spec.vip ?? 0); k++) {
    const cands = seq.slice(2).filter((i) => KIND[keep[i].kind].cap === 4 && !vipCars.has(i));
    if (cands.length) vipCars.add(pick(cands));
  }
  // The queue follows the exit order, then gets mixed: each mix step swaps two passenger groups nearby.
  const groups: { c: Color[]; vip?: boolean }[] = [];
  for (const i of seq) {
    const v = keep[i], cap = KIND[v.kind].cap;
    if (vipCars.has(i)) { groups.push({ c: [v.color], vip: true }); continue; }
    for (let k = 0; k < cap; k += 2) groups.push({ c: Array(Math.min(2, cap - k)).fill(v.color) });
  }
  for (let m = 0; m < spec.mix * 3; m++) {
    const a = Math.floor(r() * groups.length), b = Math.min(groups.length - 1, a + 1 + Math.floor(r() * 6));
    [groups[a], groups[b]] = [groups[b], groups[a]];
  }
  const queue: Color[] = [], vip: number[] = [];
  for (const g of groups) { if (g.vip) vip.push(queue.length); queue.push(...g.c); }
  const level: Level = { w, h, vehicles: keep, obstacles: cones.length ? cones : undefined, queue };
  if (vip.length) level.vip = vip;
  if (spec.oddEven) level.oddEven = spec.oddEven;
  if (spec.intro) level.intro = spec.intro;
  if (spec.tag) level.tag = spec.tag;
  if (validate(level).length) throw new Error(validate(level).join('; '));
  return level;
}

const out: Level[] = [];
SPECS.forEach((spec, n) => {
  let best: { level: Level; err: number; rates: { random: number; greedy: number }; seed: number } | null = null;
  for (let seed = 1; seed <= 600; seed++) {
    const level = generate(spec, (n + 1) * 10007 + seed);
    if (!level) continue;
    if (!solve(level).solvable) continue;
    const cells = level.vehicles.reduce((a, v) => a + KIND[v.kind].len, 0);
    const density = cells / (spec.w * spec.h * spec.fill);
    if (density < 0.8) continue;
    const rates = playRates(level, 160, seed);
    const err = Math.abs(rates.greedy - spec.target) + (1 - Math.min(1, density)) * 0.5;
    if (!best || err < best.err) best = { level, err, rates, seed };
    if (err < 0.03) break;
  }
  if (!best) throw new Error(`no level for spec ${n + 1}`);
  out.push(best.level);
  console.log(`L${n + 1} ${spec.w}x${spec.h} vehicles=${best.level.vehicles.length} passengers=${best.level.queue.length} greedy=${best.rates.greedy.toFixed(2)} random=${best.rates.random.toFixed(2)} (target ${spec.target})${spec.tag ? ' ' + spec.tag : ''}`);
});
writeFileSync(new URL('../src/game/levels.json', import.meta.url), JSON.stringify(out));
console.log('wrote', out.length, 'levels');
