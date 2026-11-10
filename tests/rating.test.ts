import { describe, expect, it } from 'vitest';
import { RATE_GAP_MS, rateAfterWin, type RateState, type WinMoment } from '../src/rating';

const fresh: RateState = { rated: false, asks: 0, lastAsk: 0, pending: null };
const win = (o: Partial<WinMoment> = {}): WinMoment => ({ level: 20, replay: false, boss: false, hard: false, streak: 1, ...o });
const NOW = 1_800_000_000_000;
const ask = (s: RateState, w: WinMoment, busy = false) => rateAfterWin(s, w, busy, NOW).ask;

describe('asking for a rating at a high point (K5)', () => {
  it('after a boss, a hard level or a run of four wins', () => {
    expect(ask(fresh, win({ boss: true }))).toBe('boss');
    expect(ask(fresh, win({ hard: true }))).toBe('hard');
    expect(ask(fresh, win({ streak: 4 }))).toBe('streak');
    expect(ask(fresh, win({ streak: 3 }))).toBeNull(); // an ordinary win
  });

  it('not in the first levels, not on a replay, not once rated', () => {
    expect(ask(fresh, win({ level: 10, hard: true }))).toBeNull();
    expect(ask(fresh, win({ level: 12, hard: true }))).toBe('hard');
    expect(ask(fresh, win({ replay: true, boss: true }))).toBeNull();
    expect(ask({ ...fresh, rated: true }, win({ boss: true }))).toBeNull();
  });

  it('three times at most, days apart', () => {
    const asked = { ...fresh, asks: 1, lastAsk: NOW - RATE_GAP_MS + 60_000 };
    expect(ask(asked, win({ boss: true }))).toBeNull();
    expect(ask({ ...asked, lastAsk: NOW - RATE_GAP_MS }, win({ boss: true }))).toBe('boss');
    expect(ask({ ...fresh, asks: 3 }, win({ boss: true }))).toBeNull();
  });

  it('a high point that came with the chest is asked about after the next win without a card', () => {
    const boss = rateAfterWin(fresh, win({ level: 30, boss: true }), true, NOW);
    expect(boss).toEqual({ ask: null, pending: 'boss' });
    const next = rateAfterWin({ ...fresh, pending: boss.pending }, win({ level: 31 }), false, NOW);
    expect(next).toEqual({ ask: 'boss', pending: null });
    // Still busy (another card again): kept a little longer.
    expect(rateAfterWin({ ...fresh, pending: 'hard' }, win({ level: 36 }), true, NOW)).toEqual({ ask: null, pending: 'hard' });
    // A replay doesn't spend it.
    expect(rateAfterWin({ ...fresh, pending: 'hard' }, win({ replay: true }), false, NOW)).toEqual({ ask: null, pending: 'hard' });
  });
});
