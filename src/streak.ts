/**
 * «پشت‌سرهم»: a win streak over new Journey levels. Each win adds one; giving a level up (restarting or leaving
 * it after playing, or retrying after a loss) resets it. The streak pays free help on the next new level:
 * 1 → an extra bay from the start, 2 → also a free crane, 3 or more → also a free police whistle. The free
 * helps belong to that level only (they never enter the inventory).
 */
export type Help = 'bay' | 'crane' | 'whistle';
const ORDER: Help[] = ['bay', 'crane', 'whistle'];
export const STREAK_TOP = ORDER.length;

/** The free helps a streak of `n` wins gives at the start of the next new level. */
export function streakHelps(n: number): Help[] { return ORDER.slice(0, Math.max(0, Math.min(STREAK_TOP, Math.floor(n)))); }

/** The streak after a Journey level ends. Replays of finished levels leave it as it is. */
export function nextStreak(n: number, outcome: 'won' | 'gaveUp', newLevel: boolean): number {
  if (!newLevel) return n;
  return outcome === 'won' ? n + 1 : 0;
}
