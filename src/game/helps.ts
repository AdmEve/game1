/**
 * Helps one at a time (BEST_IN_MARKET_PLAN J4, GDD §9): the booster bar stays away for the first levels, then each
 * help opens on its own level, in the win streak's order. Openness follows Journey progress (levels finished), so
 * players already past a level keep its help, and replays and events have whatever they have reached.
 */
import type { Help } from '../streak';

/** The level (1-based) on which each help first appears. */
export const HELP_FROM: Record<Help, number> = { bay: 6, crane: 9, whistle: 12 };

/** Whether a help is open, given `progress` (levels finished, i.e. save.level). */
export const helpOpen = (h: Help, progress: number): boolean => progress + 1 >= HELP_FROM[h];

/** Whether any help is open yet (the bar shows only then). */
export const anyHelpOpen = (progress: number): boolean => (Object.keys(HELP_FROM) as Help[]).some((h) => helpOpen(h, progress));

/** The help that opens on level `n` (0-based), if any. */
export function helpOpening(n: number): Help | null {
  return (Object.keys(HELP_FROM) as Help[]).find((h) => HELP_FROM[h] === n + 1) ?? null;
}

/**
 * The ramp (GDD §9: the first fail-and-continue comes at level 9): on levels 1–8 a level that would be lost on full
 * bays gets Mash Rahim's extra bay instead of the lose card (once: the sixth bay is the most there is). Clock and
 * tap-budget losses are real losses. Measured with scripts/difficulty.ts.
 */
export const MERCY_LEVELS = 8;
