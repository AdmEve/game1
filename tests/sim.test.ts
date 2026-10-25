import { describe, expect, it } from 'vitest';
import { Ctx } from '../src/engine/ctx';
import { newLife } from '../src/engine/life';
import { playLife } from './bot';

describe('life simulation', () => {
  it('plays 300 random lives without errors', () => {
    const ages: number[] = [];
    for (let s = 1; s <= 300; s++) {
      const L = playLife(s * 7919);
      expect(L.dead).toBeTruthy();
      ages.push(L.age);
    }
    const avg = ages.reduce((a, b) => a + b, 0) / ages.length;
    expect(avg).toBeGreaterThan(55);
    expect(avg).toBeLessThan(90);
  });

  it('ctx clamps stats', () => {
    const L = newLife({ seed: 5 });
    const c = new Ctx(L);
    c.happy(500);
    expect(L.stats.happy).toBe(100);
    c.happy(-500);
    expect(L.stats.happy).toBe(0);
  });
});
