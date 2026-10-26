/** Solvability and difficulty analysis for levels. */
import { KIND, canExit, cloneState, grid, newState, tap, type Level, type State } from './rules';

const key = (s: State) =>
  s.inLot.map((x) => (x ? 1 : 0)).join('') + '|' + s.bays.map((b) => (b ? `${b.color}${b.boarded}/${b.cap}` : '-')).sort().join(',');

/** Vehicles that can leave now, with duplicates (same color and seats, both free) collapsed. */
export function moves(s: State): number[] {
  const g = grid(s), seen = new Set<string>(), out: number[] = [];
  s.level.vehicles.forEach((v, i) => {
    if (!canExit(s, i, g)) return;
    const k = v.color + KIND[v.kind].cap;
    if (seen.has(k)) return;
    seen.add(k);
    out.push(i);
  });
  return out;
}

export interface SolveResult { solvable: boolean; solution: number[]; nodes: number; }

/** Depth-first search with memo of dead states. Tries moves that serve the queue first. */
export function solve(level: Level, limit = 400_000): SolveResult {
  const dead = new Set<string>();
  let nodes = 0;
  const path: number[] = [];
  const rec = (s: State): boolean => {
    if (s.over === 'won') return true;
    if (s.over === 'lost') return false;
    const k = key(s);
    if (dead.has(k)) return false;
    if (++nodes > limit) return false;
    const want = s.queue[s.q];
    const ms = moves(s).sort((a, b) => Number(s.level.vehicles[b].color === want) - Number(s.level.vehicles[a].color === want));
    for (const m of ms) {
      const n = cloneState(s);
      tap(n, m);
      path.push(m);
      if (rec(n)) return true;
      path.pop();
    }
    dead.add(k);
    return false;
  };
  const ok = rec(newState(level));
  return { solvable: ok, solution: ok ? [...path] : [], nodes };
}

/** Deterministic PRNG (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * How often simple players win: `random` taps any free vehicle; `greedy` prefers a vehicle whose color
 * the next passengers want (a fair model of a casual player). Lower rates mean harder levels.
 */
export function playRates(level: Level, runs = 300, seed = 1) {
  const r = rng(seed);
  const play = (greedy: boolean) => {
    const s = newState(level);
    while (!s.over) {
      const g = grid(s);
      const free = s.level.vehicles.map((_, i) => i).filter((i) => canExit(s, i, g));
      if (!free.length) return false;
      let pick = free;
      if (greedy) {
        // Look three passengers ahead, like a casual player scanning the queue.
        const ahead = new Set(s.queue.slice(s.q, s.q + 3));
        const good = free.filter((i) => ahead.has(s.level.vehicles[i].color));
        if (good.length) pick = good;
      }
      tap(s, pick[Math.floor(r() * pick.length)]);
    }
    return s.over === 'won';
  };
  let rw = 0, gw = 0;
  for (let i = 0; i < runs; i++) { if (play(false)) rw++; if (play(true)) gw++; }
  return { random: rw / runs, greedy: gw / runs };
}
