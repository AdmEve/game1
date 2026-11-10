/** «ساعت شلوغی»: one hard level a day, the same for everyone (seeded by the date). */
import { solvable, type Spec } from './generator';
import { harden } from './harden';
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

/**
 * Today's rush as played: the day's level made a deeper puzzle (C11). Unhardened, an attentive simulated player lost
 * 75% of rush levels against 98–99% of Journey levels from 9 on, so the day's «سخت» challenge was the easiest thing a
 * mid-game player met. Forty rounds of game/harden.ts bring it to ~98%. The rounds are counted, not timed, so every
 * phone makes the same level; it takes a phone a few seconds, so the game runs it in a worker ahead of time.
 */
export const RUSH_ROUNDS = 40;
export function hardDaily(day = today()): Level | null {
  const base = dailyLevel(day);
  if (!base) return null;
  let seed = 7;
  for (const ch of day) seed = (seed * 131 + ch.charCodeAt(0)) >>> 0;
  const level = harden(base, seed, { iterations: RUSH_ROUNDS, ms: Infinity, limit: 60_000 }).level;
  level.tag = 'hard';
  return level;
}
