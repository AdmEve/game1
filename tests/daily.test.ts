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

describe('the rush as played (C11)', () => {
  it('is the day\'s level made deeper: the same for everyone, winnable, «سخت»', async () => {
    const { hardDaily } = await import('../src/game/daily');
    const { solve } = await import('../src/game/solver');
    const a = hardDaily('2026-11-12'), b = hardDaily('2026-11-12');
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(validate(a!)).toEqual([]);
    expect(a!.tag).toBe('hard');
    expect(solve(a!, 400_000).solvable).toBe(true);
  }, 60_000);

  it('is as hard as the Journey: an attentive player loses most rush levels', async () => {
    const { hardDaily } = await import('../src/game/daily');
    const { attentiveLoss } = await import('../src/game/sim');
    let loss = 0;
    const days = ['2026-11-01', '2026-11-05', '2026-11-09', '2026-11-13', '2026-11-17', '2026-11-21'];
    for (const d of days) loss += attentiveLoss(hardDaily(d)!, 40, 1);
    expect(loss / days.length).toBeGreaterThan(0.9);
  }, 120_000);
});
