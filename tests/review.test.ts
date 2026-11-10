import { describe, expect, it } from 'vitest';
import PACKED from '../src/game/levels.pack.json';
import { unpackLevel } from '../src/game/pack';
import { canExit, cloneState, startState, tap, type Level, type State } from '../src/game/rules';
import { losingMove, solve } from '../src/game/solver';

function rng(seed: number) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }

/** A fairly careful player's lost game: the position before each tap, and the taps. */
function lostGame(level: Level, seed: number): { snaps: State[]; taps: number[] } | null {
  const rand = rng(seed), s = startState(level), snaps: State[] = [], taps: number[] = [];
  for (let t = 0; t < 400 && !s.over; t++) {
    const inLot = s.inLot.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
    if (!inLot.length) break;
    const free = inLot.filter((i) => canExit(s, i));
    const wanted = free.filter((i) => (s.revealed[i] && level.vehicles[i].color === s.queue[s.q]) || level.vehicles[i].kind === 'bike');
    const from = rand() < 0.9 && wanted.length ? wanted : free.length ? free : inLot;
    const pick = from[Math.floor(rand() * from.length)];
    snaps.push(cloneState(s)); taps.push(pick); tap(s, pick);
  }
  return s.over === 'lost' ? { snaps, taps } : null;
}

describe('the losing move (C12)', () => {
  it('names the tap after which no win was left', () => {
    const levels = (PACKED as string[]).map(unpackLevel);
    let checked = 0;
    for (let n = 12; n <= 240 && checked < 6; n += 19) {
      const level = levels[n - 1];
      if (level.time || level.moves) continue;
      const g = lostGame(level, n);
      if (!g) continue;
      const k = losingMove(level, g.snaps, 60_000);
      expect(k, `level ${n}`).not.toBeNull();
      // Before it: still winnable. After it: not.
      expect(solve(level, 60_000, g.snaps[k!]).solvable, `level ${n} before tap ${k}`).toBe(true);
      const after = cloneState(g.snaps[k!]); tap(after, g.taps[k!]);
      expect(solve(level, 400_000, after).solvable, `level ${n} after tap ${k}`).toBe(false);
      checked++;
    }
    expect(checked).toBeGreaterThanOrEqual(4);
  }, 120_000);

  it('says nothing when the record already began lost, or is empty', () => {
    const level = unpackLevel((PACKED as string[])[40]);
    expect(losingMove(level, [], 1000)).toBeNull();
    const g = lostGame(level, 3);
    if (g) {
      const after = cloneState(g.snaps[g.snaps.length - 1]); tap(after, g.taps[g.taps.length - 1]);
      expect(losingMove(level, [after], 60_000)).toBeNull();
    }
  });
});
