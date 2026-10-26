/** «ساعت شلوغی»: one hard level a day, the same for everyone (seeded by the date). */
import { solvable, type Spec } from './generator';
import { rng } from './solver';
import type { Level } from './rules';

export const today = () => new Date().toISOString().slice(0, 10);

const cache = new Map<string, Level | null>();

export function dailyLevel(day = today()): Level | null {
  if (cache.has(day)) return cache.get(day)!;
  let seed = 0;
  for (const ch of day) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const r = rng(seed);
  const spec: Spec = {
    w: 7, h: 9, fill: 0.88, colors: 6, mix: 12, target: 0.3, zamyad: 0.12, bus: 0.08, cones: 1 + Math.floor(r() * 2),
    cover: r() < 0.6 ? 0.25 : undefined, broken: r() < 0.5 ? 1 : undefined, vip: r() < 0.4 ? 1 : undefined,
    bikes: r() < 0.4 ? 1 : undefined,
  };
  const rule = r();
  if (rule < 0.3) spec.oddEven = 3; else if (rule < 0.6) spec.officer = true;
  // If the day's mix is too tangled to solve quickly, relax it step by step.
  const level = solvable(spec, seed % 100000)
    ?? solvable({ ...spec, mix: 8 }, seed % 100000 + 1)
    ?? solvable({ ...spec, mix: 6, oddEven: undefined, officer: undefined }, seed % 100000 + 2)
    ?? solvable({ ...spec, mix: 4, oddEven: undefined, officer: undefined, vip: undefined, broken: undefined }, seed % 100000 + 3, 200);
  if (level) level.tag = 'hard';
  cache.set(day, level);
  return level;
}
