import { describe, expect, it } from 'vitest';
import { CHAPTERS } from '../src/game/chapters';
import { endlessLevel, generateEndless, isHard, PER_PLACE, placeOf } from '../src/game/endless';
import PACK from '../src/game/endless.pack.json';
import { unpackLevel } from '../src/game/pack';
import { validate } from '../src/game/rules';
import { attentiveLoss } from '../src/game/sim';
import { solve } from '../src/game/solver';

describe('Endless Tehran (C10)', () => {
  it('goes round the eight places, ten levels each, every fifth «سخت»', () => {
    expect(placeOf(0)).toBe(CHAPTERS[0]);
    expect(placeOf(PER_PLACE - 1)).toBe(CHAPTERS[0]);
    expect(placeOf(PER_PLACE)).toBe(CHAPTERS[1]);
    expect(placeOf(PER_PLACE * CHAPTERS.length)).toBe(CHAPTERS[0]);
    expect([0, 1, 2, 3, 4, 9].map(isHard)).toEqual([false, false, false, false, true, true]);
  });

  it('ships 240 hardened levels, valid and tagged', () => {
    const pack = PACK as string[];
    expect(pack).toHaveLength(240);
    pack.forEach((p, i) => {
      const l = unpackLevel(p);
      expect(validate(l), `endless ${i}`).toEqual([]);
      expect(l.tag === 'hard', `endless ${i} tag`).toBe(isHard(i));
    });
  });

  it('every sampled shipped level is winnable, and as hard as the last chapter', () => {
    const pack = PACK as string[];
    let loss = 0, n = 0;
    for (let i = 0; i < pack.length; i += 10) {
      const l = unpackLevel(pack[i]);
      expect(solve(l, 400_000).solvable, `endless ${i}`).toBe(true);
      loss += attentiveLoss(l, 40, i); n++;
    }
    // The Journey's levels 211-240: an attentive simulated player loses ~99%.
    expect(loss / n).toBeGreaterThan(0.9);
  }, 120_000);

  it('plays the pack, then makes levels past its end, the same each time', async () => {
    const first = await endlessLevel(0);
    expect(first).toEqual(unpackLevel((PACK as string[])[0]));
    const past = await endlessLevel(240);
    expect(past).not.toBeNull();
    expect(generateEndless(240)).toEqual(past);
    expect(solve(past!, 400_000).solvable).toBe(true);
  }, 60_000);
});
