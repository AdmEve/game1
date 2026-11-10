import { describe, expect, it } from 'vitest';
import { plan } from '../src/ui/talk';

describe('how a character says a line (L2)', () => {
  it('shows every letter, the same way every time', () => {
    const line = 'سلام جوون! حالت خوبه؟';
    const a = plan(line, 'rahim');
    expect(a).toEqual(plan(line, 'rahim'));
    expect(a[a.length - 1].upto).toBe(line.length);
    expect(a.every((s, i) => !i || s.upto > a[i - 1].upto)).toBe(true);
  });

  it('a syllable every third letter, rising before a question, falling at the end', () => {
    const steps = plan('آره، آره. واقعاً؟', 'sabouri');
    const syl = steps.filter((s) => s.syl);
    expect(syl.length).toBe(Math.ceil(13 / 3)); // 13 letters
    expect(syl[syl.length - 1].syl!.lift).toBeGreaterThan(0);
    expect(syl.some((s) => s.syl!.lift < 0)).toBe(true);
  });

  it('a breath after punctuation; markup spaces as one; each at their own pace', () => {
    const r = plan('بله.  \n   خب', 'rahim');
    const dot = r.find((s) => s.upto === 4)!;
    expect(dot.wait).toBeGreaterThan(200);
    expect(r.map((s) => s.upto)).toEqual([1, 2, 3, 4, 10, 11, 12]); // the spaces and the break: one step
    const total = (who: 'rahim' | 'ajool') => plan('یه ماشین دیگه هم هست', who).reduce((t, s) => t + s.wait, 0);
    expect(total('ajool')).toBeLessThan(total('rahim') * 0.7);
  });
});
