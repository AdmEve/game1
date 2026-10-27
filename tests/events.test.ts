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

describe('«نوروز» event', () => {
  it('runs from mid-March to early April', async () => {
    const { nowruzActive } = await import('../src/game/events');
    expect(nowruzActive(new Date(2027, 2, 21))).toBe(true);
    expect(nowruzActive(new Date(2027, 3, 3))).toBe(true);
    expect(nowruzActive(new Date(2027, 3, 10))).toBe(false);
  });
  it('every day is valid and solvable', async () => {
    const { NOWRUZ_DAYS, nowruzLevel, HAFT_SIN } = await import('../src/game/events');
    expect(HAFT_SIN.length).toBe(NOWRUZ_DAYS);
    for (let i = 0; i < NOWRUZ_DAYS; i++) {
      const l = nowruzLevel(i);
      expect(l).not.toBeNull();
      expect(validate(l!)).toEqual([]);
      expect(solve(l!).solvable).toBe(true);
    }
  }, 60000);
});
