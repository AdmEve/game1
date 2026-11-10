/**
 * A simulated player (as scripts/difficulty.ts measures the Journey): `skill` is how often they make a sensible pick
 * (a free car whose colour is wanted soon: the front of the queue first, then the next few), `careless` how often
 * they tap any car in the lot. Used to keep generated levels as hard as the Journey's (game/endless.ts).
 */
import { canExit, startState, tap, type Level, type State } from './rules';

function rng(seed: number) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }

export function simPlay(level: Level, skill: number, careless: number, rand: () => number): 'won' | 'lost' {
  const s: State = startState(level);
  for (let t = 0; t < 400 && !s.over; t++) {
    const inLot = s.inLot.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
    if (!inLot.length) break;
    const free = inLot.filter((i) => canExit(s, i));
    let pick: number;
    if (!free.length || rand() < careless) pick = inLot[Math.floor(rand() * inLot.length)];
    else if (rand() < skill) {
      const colour = (i: number) => (s.revealed[i] ? level.vehicles[i].color : null);
      const wanted = (k: number) => free.filter((i) => (level.vehicles[i].kind === 'bike' ? k === 0 : colour(i) === s.queue[s.q + k]));
      let best: number[] = [];
      for (let k = 0; k < 4 && !best.length; k++) best = wanted(k);
      pick = (best.length ? best : free)[Math.floor(rand() * (best.length || free.length))];
    } else pick = free[Math.floor(rand() * free.length)];
    tap(s, pick);
  }
  return s.over === 'won' ? 'won' : 'lost';
}

/** How often an attentive player (95% sensible picks, 2% careless) loses, over `runs` games. */
export function attentiveLoss(level: Level, runs = 30, seed = 1): number {
  let lost = 0;
  for (let r = 0; r < runs; r++) if (simPlay(level, 0.95, 0.02, rng(seed * 104729 + r)) === 'lost') lost++;
  return lost / runs;
}
