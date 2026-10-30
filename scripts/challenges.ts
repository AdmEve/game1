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
  if (n < 12 || l.intro) return;
  const late = n / levels.length;
  const tapBudget = (slack: number) => cars + Math.max(1, Math.round(cars * slack));
  const clock = (perCar: number, extra: number) => Math.round(cars * perCar + extra);
  if (l.tag === 'boss') { l.moves = tapBudget(0.05); l.time = clock(1.35 - 0.2 * late, 8); nMoves++; nTime++; return; }
  if (n % 4 === 2) { l.moves = tapBudget(0.07 - 0.03 * late); nMoves++; }
  else if (n % 4 === 0) { l.time = clock(1.5 - 0.3 * late, 7); nTime++; }
  else if (n % 6 === 3 && n >= 24 && (l.bays ?? 5) >= 4) {
    const tight = { ...l, bays: (l.bays ?? 5) - 1 };
    if (solve(tight).solvable) { l.bays = tight.bays; nBays++; } else skipped++;
  }
});
writeFileSync(file, JSON.stringify(levels));
console.log({ nMoves, nTime, nBays, skipped });
