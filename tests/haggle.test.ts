import { describe, expect, it } from 'vitest';
import { haggleStep, offer, startHaggle } from '../src/engine/haggle';

const half = () => 0.5;

describe('haggling', () => {
  it('rounds prices to a sensible step', () => {
    expect(haggleStep(2_345_000_000)).toBe(10_000_000);
    expect(haggleStep(950_000_000)).toBe(1_000_000);
  });

  it('keeps the hidden floor between 78% and 96% of the asking price', () => {
    for (const r of [0, 0.5, 0.999]) {
      const h = startHaggle(1e9, 0.1, () => r);
      expect(h.floor).toBeGreaterThanOrEqual(0.78e9);
      expect(h.floor).toBeLessThanOrEqual(0.96e9);
    }
  });

  it('takes any offer at or above the floor', () => {
    const h = startHaggle(1e9, 0, half);
    expect(offer(h, h.floor, half)).toEqual({ kind: 'deal', price: h.floor });
  });

  it('counters, then makes a last offer at the floor', () => {
    const h = startHaggle(1e9, 0, half);
    const low = h.floor - h.step;
    const a = offer(h, low, half);
    expect(a.kind).toBe('counter');
    const b = offer(h, low, half);
    expect(b.kind).toBe('counter');
    expect(h.ask).toBeGreaterThanOrEqual(h.floor);
    const c = offer(h, low, half);
    expect(c).toEqual({ kind: 'final', ask: h.ask });
    expect(h.ask).toBeGreaterThanOrEqual(h.floor);
    expect(h.ask - h.floor).toBeLessThan(h.step);
    expect(offer(h, low, half).kind).toBe('walk');
  });

  it('walks away after two lowball offers', () => {
    const h = startHaggle(1e9, 0, half);
    expect(offer(h, 0.5e9, half).kind).toBe('insult');
    expect(offer(h, 0.5e9, half).kind).toBe('walk');
  });
});
