/**
 * When to ask for a rating (BEST_IN_MARKET_PLAN K5). Ratings move a game up Cafe Bazaar's lists, and a player asked at
 * a high point (a boss or a hard level just beaten, a run of wins) is the one who rates warmly and writes why; asked
 * mid-tutorial they rate a game they haven't met. So: only after a Journey win that is such a moment, not before
 * level 12 (past the first helps and the first lost life), at most three times, days apart.
 *
 * Every boss and hard level is also a fifth level, and a fifth level's win brings its chest, and a win brings one card
 * at a time: so a high point that came with another card is kept, and asked about after the next win that brings
 * none. A loss in between lets it go (the moment has passed).
 */
export type HighPoint = 'boss' | 'hard' | 'streak';
export interface RateState { rated: boolean; asks: number; lastAsk: number; pending: HighPoint | null }
export interface WinMoment { level: number; replay: boolean; boss: boolean; hard: boolean; streak: number }

export const RATE_FROM = 12;
export const RATE_MAX_ASKS = 3;
export const RATE_GAP_MS = 3 * 24 * 3600 * 1000;
/** A run of wins worth celebrating. */
export const RATE_STREAK = 4;

/** What makes this win a high point, if anything. */
export function highPoint(w: WinMoment): HighPoint | null {
  return w.boss ? 'boss' : w.hard ? 'hard' : w.streak >= RATE_STREAK ? 'streak' : null;
}

/**
 * After a Journey win: whether to ask now (and about which moment), and the high point to keep for later. `busy` is
 * true when this win already brought another card.
 */
export function rateAfterWin(s: RateState, w: WinMoment, busy: boolean, now: number): { ask: HighPoint | null; pending: HighPoint | null } {
  const open = !s.rated && s.asks < RATE_MAX_ASKS && (!s.asks || now - s.lastAsk >= RATE_GAP_MS);
  const hp = !w.replay && w.level >= RATE_FROM ? highPoint(w) : null;
  if (!open || w.replay) return { ask: null, pending: open ? s.pending : null };
  const moment = hp ?? s.pending;
  if (!moment) return { ask: null, pending: null };
  return busy ? { ask: null, pending: moment } : { ask: moment, pending: null };
}
