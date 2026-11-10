/** Solvability and difficulty analysis for levels. */
import { KIND, addBay, canExit, cloneState, grid, startState as newState, tap, type Level, type State } from './rules';

const key = (s: State) =>
  s.inLot.map((x) => (x ? 1 : 0)).join('') + '|' + s.bays.map((b) => (b ? `${b.color}${b.boarded}/${b.cap}` : '-')).sort().join(',') + '|' + s.parity + s.sinceSwitch + s.axis + s.carts.map((c) => `${c.col},${c.row}${c.dir[0]}`).join(';');

/** Vehicles that can leave now, with duplicates (same color and seats, both free) collapsed. */
export function moves(s: State): number[] {
  const g = grid(s), seen = new Set<string>(), out: number[] = [];
  s.level.vehicles.forEach((v, i) => {
    if (!canExit(s, i, g)) return;
    const k = v.color + KIND[v.kind].cap + (v.wedding ? 'w' + i : '');
    if (seen.has(k)) return;
    seen.add(k);
    out.push(i);
  });
  return out;
}

export interface SolveResult { solvable: boolean; solution: number[]; nodes: number; }

/** Depth-first search with memo of dead states. Tries moves that serve the queue first. */
export function solve(level: Level, limit = 400_000, from?: State): SolveResult {
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
  const ok = rec(from ? cloneState(from) : newState(level));
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
        const good = free.filter((i) => s.revealed[i] && ahead.has(s.level.vehicles[i].color));
        if (good.length) pick = good;
        // Anyone notices a wedding car whose countdown is nearly up.
        const urgent = free.filter((i) => { const w = s.level.vehicles[i].wedding; return w !== undefined && w - s.exits <= 2; });
        if (urgent.length) pick = urgent;
      }
      tap(s, pick[Math.floor(r() * pick.length)]);
    }
    return s.over === 'won';
  };
  let rw = 0, gw = 0;
  for (let i = 0; i < runs; i++) { if (play(false)) rw++; if (play(true)) gw++; }
  return { random: rw / runs, greedy: gw / runs };
}

/** What the hint can say about a position. 'bay': lost as it stands, but one more parking bay still wins it. */
export type HintVerdict = 'ok' | 'bay' | 'lost' | 'unsure';
/**
 * The hint for a position: the next move of a win, or why there is none. A search that ends inside its budget has
 * seen every line, so «lost» is certain; and 86% of lost positions on levels 9+ are still won with one more bay
 * (scripts/hintbudget.ts), so the player is told that rather than to start over (BEST_IN_MARKET_PLAN C8).
 */
export function hintFor(level: Level, s: State, limit: number, maxBays: number): { move: number; verdict: HintVerdict } {
  const r = solve(level, limit, s);
  if (r.solvable) return { move: r.solution[0], verdict: 'ok' };
  if (r.nodes >= limit) return { move: -1, verdict: 'unsure' };
  if (s.bays.length >= maxBays) return { move: -1, verdict: 'lost' };
  const more = cloneState(s); addBay(more);
  const b = solve(level, limit, more);
  return { move: -1, verdict: b.solvable ? 'bay' : b.nodes >= limit ? 'unsure' : 'lost' };
}
