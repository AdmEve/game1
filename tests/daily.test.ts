import { describe, expect, it } from 'vitest';
import { dailyLevel } from '../src/game/daily';
import { validate } from '../src/game/rules';

describe('daily rush hour', () => {
  for (const day of ['2026-10-26', '2026-11-01', '2027-03-21']) {
    it(`builds a valid, solver-checked level for ${day}`, () => {
      const l = dailyLevel(day);
      expect(l).not.toBeNull();
      expect(validate(l!)).toEqual([]);
      expect(l!.vehicles.length).toBeGreaterThan(15);
    });
  }
  it('is the same level for everyone on a day', () => {
    expect(JSON.stringify(dailyLevel('2026-12-21'))).toBe(JSON.stringify(dailyLevel('2026-12-21')));
  });
});

describe('daily rush hour over a season', () => {
  it('always has a level (60 days)', () => {
    const start = Date.parse('2026-11-01');
    for (let d = 0; d < 60; d++) {
      const day = new Date(start + d * 864e5).toISOString().slice(0, 10);
      expect(dailyLevel(day), day).not.toBeNull();
    }
  }, 120_000);
});
