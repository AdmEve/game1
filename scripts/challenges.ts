/**
 * Adds the hard-mode limits to some Journey levels in src/game/levels.json, then run `npm run pack-levels`.
 *   moves: at most this many taps (a tap on a blocked car or a full bay counts too)
 *   time:  seconds to get every car out of the lot, counted from the first tap
 *   bays:  fewer pickup bays than usual (only kept when the solver can still win)
 * Safe to re-run: time and moves are recomputed, bays are only ever reduced once.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { solve } from '../src/game/solver';
import type { Level } from '../src/game/rules';

const file = new URL('../src/game/levels.json', import.meta.url);
const levels = JSON.parse(readFileSync(file, 'utf8')) as Level[];
let nMoves = 0, nTime = 0, nBays = 0, skipped = 0;
levels.forEach((l, i) => {
  delete l.time; delete l.moves;
  const n = i + 1, cars = l.vehicles.length;
  if (n < 12 || l.tag === 'boss' || l.intro) return;
  const late = n / levels.length;
  if (n % 6 === 2) { l.moves = cars + Math.max(2, Math.round(cars * (0.14 - 0.08 * late))); nMoves++; }
  else if (n % 6 === 4) { l.time = Math.round(cars * (1.8 - 0.5 * late) + 8); nTime++; }
  else if (n % 6 === 0 && n >= 24 && (l.bays ?? 5) >= 5) {
    const tight = { ...l, bays: (l.bays ?? 5) - 1 };
    if (solve(tight).solvable) { l.bays = tight.bays; nBays++; } else skipped++;
  }
});
writeFileSync(file, JSON.stringify(levels));
console.log({ nMoves, nTime, nBays, skipped });
