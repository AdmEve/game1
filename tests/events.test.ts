import { describe, expect, it } from 'vitest';
import { stageOpen } from '../src/game/events';

describe('event pacing', () => {
  it('opens the first stage straight away', () => {
    expect(stageOpen(0, 7, undefined, '2026-12-20')).toBe(true);
  });
  it('opens one new stage a day', () => {
    expect(stageOpen(2, 7, '2026-12-20', '2026-12-20')).toBe(false); // already won one today
    expect(stageOpen(2, 7, '2026-12-19', '2026-12-20')).toBe(true);
    expect(stageOpen(2, 7, '2026-12-17', '2026-12-20')).toBe(true); // missed days don't pile up, but nothing is lost
  });
  it('is closed once every stage is done', () => {
    expect(stageOpen(7, 7, '2026-12-19', '2026-12-20')).toBe(false);
  });
});
