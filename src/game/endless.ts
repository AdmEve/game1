/**
 * «تهران بی‌پایان» (BEST_IN_MARKET_PLAN C10): after the 240 Journey levels, levels without end. Each is generated from
 * its number (the same for everyone, like the daily rush) and checked by the solver, in the 8 places in turn, ten
 * levels each, with each place's own rules (Tajrish's covers, Valiasr's couriers, the bazaar's carts, Darband's wedding
 * cars…) at the difficulty of the Journey's last chapter. Every fifth is «سخت».
 */
import { CHAPTERS, type Chapter } from './chapters';
import { solvable, type Spec } from './generator';
import { unpackLevel } from './pack';
import type { Level } from './rules';
import { attentiveLoss } from './sim';
import { rng } from './solver';

/** Levels in one place before the next. */
export const PER_PLACE = 10;
/** The place endless level `i` (0-based) is played in. */
export const placeOf = (i: number): Chapter => CHAPTERS[Math.floor(i / PER_PLACE) % CHAPTERS.length];
export const isHard = (i: number) => (i + 1) % 5 === 0;

/** Each place's rules, as its chapter brought them (the others turn up now and then). */
function flavour(n: number, spec: Spec, r: () => number) {
  switch (n) {
    case 1: spec.cover = 0.25; if (r() < 0.5) spec.broken = 1; if (r() < 0.4) spec.vip = 1; break;
    case 2: spec.bikes = 1 + (r() < 0.4 ? 1 : 0); if (r() < 0.5) spec.oddEven = 3; break;
    case 3: spec.oddEven = 3 + Math.floor(r() * 2); if (r() < 0.4) spec.cover = 0.2; break;
    case 4: spec.officer = true; if (r() < 0.4) spec.broken = 1; break;
    case 5: spec.carts = 1 + (r() < 0.35 ? 1 : 0); if (r() < 0.3) spec.bikes = 1; break;
    case 6: spec.wedding = 1; if (r() < 0.3) spec.cover = 0.2; break;
    case 7: spec.granny = 2; if (r() < 0.3) spec.vip = 1; break;
    default: spec.tunnels = 1 + (r() < 0.3 ? 1 : 0); if (r() < 0.3) spec.granny = 2;
  }
}

/**
 * Endless level `i` made from scratch (0-based: level 241 is 0), or null if none could be made. The shipped ones were
 * then hardened offline (scripts/gen-endless.ts); past those, this is what the game plays.
 */
export function generateEndless(i: number): Level | null {
  const seed = 50_000 + i * 7919, r = rng(seed), hard = isHard(i), k = (i % PER_PLACE) / (PER_PLACE - 1);
  const spec: Spec = {
    w: 7, h: hard ? 10 : 9, fill: 0.85 + k * 0.03 + (hard ? 0.02 : 0), colors: 6, mix: Math.round(13 + k * 3 + (hard ? 4 : 0)),
    target: hard ? 0.08 : 0.14, zamyad: 0.13, bus: 0.08, cones: Math.floor(r() * 2), bays: hard || i % 2 ? 4 : undefined,
  };
  flavour(placeOf(i).n, spec, r);
  if (hard) spec.tag = 'hard';
  // As hard as the Journey's last chapter (where an attentive player loses ~99%): of a few solvable candidates, the one
  // a simulated attentive player loses most often, stopping at the first that is hard enough.
  const s0 = seed % 100_000, goal = hard ? 0.97 : 0.9;
  let level: Level | null = null, worst = -1;
  for (let c = 0; c < 5 && worst < goal; c++) {
    const l = solvable(spec, s0 + c * 101, 20);
    if (!l) continue;
    const loss = attentiveLoss(l, 30, s0 + c);
    if (loss > worst) { worst = loss; level = l; }
  }
  // As the daily rush does: if the mix is too tangled to solve quickly, relax it step by step.
  level ??= solvable({ ...spec, mix: spec.mix - 4 }, s0 + 1)
    ?? solvable({ ...spec, mix: 6, bays: undefined, oddEven: undefined, officer: undefined }, s0 + 2)
    ?? solvable({ ...spec, mix: 4, bays: undefined, oddEven: undefined, officer: undefined, vip: undefined, broken: undefined, wedding: undefined }, s0 + 3, 200)
    // Last: the place's rules set aside (a cart can wall a lot in): a plain level is better than none.
    ?? solvable({ ...spec, mix: 4, bays: undefined, oddEven: undefined, officer: undefined, vip: undefined, broken: undefined, wedding: undefined, carts: undefined, tunnels: undefined, granny: undefined, bikes: undefined, cover: undefined }, s0 + 4, 200);
  if (level && hard) level.tag = 'hard';
  return level;
}

const cache = new Map<number, Level | null>();
let pack: Promise<string[]> | null = null;

/**
 * Endless level `i` (0-based): from the shipped pack (loaded on first use, not at start), or generated past its end.
 * Null only if none could be made (then the next one is offered).
 */
export async function endlessLevel(i: number): Promise<Level | null> {
  if (cache.has(i)) return cache.get(i)!;
  pack ??= import('./endless.pack.json').then((m) => m.default as string[]);
  const packed = await pack;
  const level = i < packed.length ? unpackLevel(packed[i]) : generateEndless(i);
  cache.set(i, level);
  return level;
}
