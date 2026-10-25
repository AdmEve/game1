import { describe, expect, it } from 'vitest';
import { Ctx } from '../src/engine/ctx';
import { newLife } from '../src/engine/life';
import { playLife } from './bot';

describe('life simulation', () => {
  it('plays 300 random lives without errors', { timeout: 120_000 }, () => {
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

describe('content', () => {
  it('gives every event with choices a title', async () => {
    const { EVENTS } = await import('../src/engine/registry');
    const untitled = [...EVENTS.values()].filter((e) => !e.auto && !e.title).map((e) => e.id);
    expect(untitled).toEqual([]);
  });
});

describe('challenges and titles', () => {
  it('always offers three different challenges', async () => {
    const { weeklyChallenges } = await import('../src/engine/challenges');
    for (let w = 0; w < 60; w++) {
      const list = weeklyChallenges(Date.UTC(2026, 0, 1) + w * 7 * 86400000);
      expect(new Set(list.map((c) => c.id)).size).toBe(3);
    }
  });

  it('gives every finished life a title', async () => {
    const { lifeTitle } = await import('../src/engine/challenges');
    for (let s = 1; s <= 40; s++) {
      const L = playLife(s * 977);
      const t = lifeTitle(L);
      expect(t.length).toBeGreaterThan(2);
      expect(t).not.toMatch(/undefined|\//);
    }
  });
});
