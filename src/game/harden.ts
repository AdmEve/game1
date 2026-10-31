/**
 * Turns a solvable level into a deeper puzzle. The solver tries the obvious move first (a car whose
 * colour the next passengers want); the number of nodes it explores before it finds a win measures how
 * often the obvious move is a trap. Hill-climbing on small, rule-preserving changes (flip a car's
 * heading, swap two cars' colours, swap two passengers) raises that number while keeping the level winnable.
 */
import type { Dir, Level } from './rules';
import { rng, solve } from './solver';

const FLIP: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };

export interface Hardened { level: Level; nodes: number }

export function harden(level: Level, seed: number, opts: { iterations?: number; goal?: number; limit?: number; ms?: number } = {}): Hardened {
  const { iterations = 3000, goal = Infinity, limit = 400_000, ms = 20_000 } = opts;
  const r = rng(seed);
  const t0 = Date.now();
  let best: Level = level;
  const first = solve(level, limit);
  let nodes = first.solvable ? first.nodes : 0;
  const special = new Set([...(level.vip ?? []), ...(level.granny ?? [])]);
  for (let it = 0; it < iterations && nodes < goal && Date.now() - t0 < ms; it++) {
    const c: Level = { ...best, vehicles: best.vehicles.map((v) => ({ ...v })), queue: [...best.queue] };
    const kind = r();
    const n = c.vehicles.length;
    if (kind < 0.45) { const v = c.vehicles[Math.floor(r() * n)]; v.dir = FLIP[v.dir]; }
    else if (kind < 0.75) { const a = Math.floor(r() * n), b = Math.floor(r() * n); [c.vehicles[a].color, c.vehicles[b].color] = [c.vehicles[b].color, c.vehicles[a].color]; }
    else {
      const span = Math.min(c.queue.length, 40);
      const a = Math.floor(r() * span), b = Math.floor(r() * span);
      if (special.has(a) || special.has(b) || a === b) continue;
      [c.queue[a], c.queue[b]] = [c.queue[b], c.queue[a]];
    }
    const s = solve(c, limit);
    if (!s.solvable) continue;
    if (s.nodes >= nodes) { best = c; nodes = s.nodes; }
  }
  return { level: best, nodes };
}
