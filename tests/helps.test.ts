import { describe, expect, it } from 'vitest';
import { HELP_FROM, anyHelpOpen, helpOpen, helpOpening } from '../src/game/helps';
import { streakHelps } from '../src/streak';

describe('helps one at a time', () => {
  it('opens the parking help on level 6, the crane on 9, the whistle on 12', () => {
    expect(HELP_FROM).toEqual({ bay: 6, crane: 9, whistle: 12 });
    // progress = levels finished; on level 6 the player has finished 5.
    expect(helpOpen('bay', 4)).toBe(false);
    expect(helpOpen('bay', 5)).toBe(true);
    expect(helpOpen('crane', 7)).toBe(false);
    expect(helpOpen('crane', 8)).toBe(true);
    expect(helpOpen('whistle', 10)).toBe(false);
    expect(helpOpen('whistle', 11)).toBe(true);
  });

  it('shows no bar before the first help, and keeps everything for players further on', () => {
    expect(anyHelpOpen(0)).toBe(false);
    expect(anyHelpOpen(4)).toBe(false);
    expect(anyHelpOpen(5)).toBe(true);
    expect((['bay', 'crane', 'whistle'] as const).every((h) => helpOpen(h, 120))).toBe(true);
  });

  it('names the help that opens on a level (0-based), and none elsewhere', () => {
    expect(helpOpening(5)).toBe('bay');
    expect(helpOpening(8)).toBe('crane');
    expect(helpOpening(11)).toBe('whistle');
    expect([0, 4, 6, 7, 9, 10, 12, 29].map(helpOpening)).toEqual(Array(8).fill(null));
  });

  it('opens helps in the order the win streak gives them', () => {
    const order = streakHelps(3);
    expect([...order].sort((a, b) => HELP_FROM[a] - HELP_FROM[b])).toEqual(order);
  });
});
