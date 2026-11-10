import { describe, expect, it } from 'vitest';
import PACKED from '../src/game/levels.pack.json';
import { unpackLevel } from '../src/game/pack';
import { addBay, cloneState, startState, tap, type State } from '../src/game/rules';
import { hintFor, moves, solve } from '../src/game/solver';

const levels = (PACKED as unknown as unknown[]).map((x) => unpackLevel(x as never));
const LIMIT = 60_000, MAX = 6;
/** Positions a player can reach on a chess-level board: the solution part way, then one other legal move. */
function* positions(): Generator<State> {
  for (const n of [12, 20, 44, 70]) {
    const L = levels[n], sol = solve(L, 1_000_000).solution;
    yield startState(L);
    for (let k = 1; k < Math.min(8, sol.length - 1); k++) for (const m of [0, 1, 2]) {
      const s = startState(L);
      for (let j = 0; j < k; j++) tap(s, sol[j]);
      const ms = moves(s).filter((i) => i !== sol[k]);
      if (ms[m] === undefined) continue;
      tap(s, ms[m]);
      if (!s.over) yield s;
    }
  }
}

describe('hint verdict (BEST_IN_MARKET_PLAN C8)', () => {
  it('says ok with a move that keeps the level winnable, bay only when one more bay wins, lost only when it does not', () => {
    const seen = { ok: 0, bay: 0, lost: 0, unsure: 0 };
    for (const s of positions()) {
      const h = hintFor(s.level, s, LIMIT, MAX);
      seen[h.verdict]++;
      if (h.verdict === 'ok') {
        expect(h.move).toBeGreaterThanOrEqual(0);
        const t = cloneState(s); tap(t, h.move);
        expect(t.over === 'won' || solve(t.level, LIMIT, t).solvable).toBe(true);
      } else {
        expect(h.move).toBe(-1);
        expect(solve(s.level, LIMIT, s).solvable).toBe(false);
        const more = cloneState(s); addBay(more);
        if (h.verdict === 'bay') expect(solve(s.level, LIMIT, more).solvable).toBe(true);
        if (h.verdict === 'lost' && s.bays.length < MAX) expect(solve(s.level, LIMIT, more).solvable).toBe(false);
      }
    }
    // The sample really covers the cases the game words differently.
    expect(seen.ok).toBeGreaterThan(5);
    expect(seen.bay).toBeGreaterThan(0);
    expect(seen.unsure).toBe(0);
  });

  it('never offers one more bay when the bays are already at the most', () => {
    for (const s of positions()) {
      if (solve(s.level, LIMIT, s).solvable) continue;
      while (s.bays.length < MAX) addBay(s);
      expect(hintFor(s.level, s, LIMIT, MAX).verdict).not.toBe('bay');
      return;
    }
  });
});
