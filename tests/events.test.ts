import { describe, expect, it } from 'vitest';
import { HAFEZ, YALDA_NIGHTS, yaldaActive, yaldaLevel } from '../src/game/events';
import { validate } from '../src/game/rules';
import { solve } from '../src/game/solver';

describe('«شب یلدا» event', () => {
  it('runs around 30 Azar only', () => {
    expect(yaldaActive(new Date(2026, 11, 21))).toBe(true);
    expect(yaldaActive(new Date(2026, 11, 13))).toBe(false);
    expect(yaldaActive(new Date(2026, 10, 26))).toBe(false);
  });
  for (let i = 0; i < YALDA_NIGHTS; i++) {
    it(`night ${i + 1} is valid and solvable`, () => {
      const l = yaldaLevel(i);
      expect(l).not.toBeNull();
      expect(validate(l!)).toEqual([]);
      expect(solve(l!).solvable).toBe(true);
    });
  }
  it('has a fortune for every night', () => expect(HAFEZ.length).toBeGreaterThanOrEqual(YALDA_NIGHTS));
});
