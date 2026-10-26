import { beforeEach, describe, expect, it } from 'vitest';
import { MAX_LIVES, REGEN_MS, addLives, lives, loseLife, msToNext } from '../src/lives';
import { save } from '../src/save';

describe('lives', () => {
  beforeEach(() => { save.lives = { n: MAX_LIVES, next: 0 }; });
  it('starts full and loses one at a time', () => {
    const t = 1_000_000;
    loseLife(t); loseLife(t);
    expect(lives(t)).toBe(3);
    expect(msToNext(t)).toBe(REGEN_MS);
  });
  it('grows back one life per half hour, up to the max', () => {
    const t = 1_000_000;
    for (let k = 0; k < 5; k++) loseLife(t);
    expect(lives(t)).toBe(0);
    expect(lives(t + REGEN_MS * 2 + 5)).toBe(2);
    expect(lives(t + REGEN_MS * 10)).toBe(MAX_LIVES);
    expect(msToNext(t + REGEN_MS * 10)).toBe(0);
  });
  it('refills never go above the max', () => {
    loseLife(1); addLives(3);
    expect(lives()).toBe(MAX_LIVES);
  });
});
