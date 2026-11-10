import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// The browser build's simulated store: confirm() stands in for Bazaar's payment sheet.
const store = new Map<string, string>();
vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) });
const notes: string[] = [];
vi.mock('../src/ui/hud', () => ({ note: (t: string) => notes.push(t), faNum: (n: number) => String(n) }));

let M: typeof import('../src/monetize');
let S: typeof import('../src/save');
beforeAll(async () => { S = await import('../src/save'); M = await import('../src/monetize'); });
beforeEach(() => { notes.length = 0; S.save.coins = 100; S.save.owned = { starter: false, no_ads: false }; });

describe('purchases say how they went', () => {
  it('delivers and says what came', async () => {
    vi.stubGlobal('confirm', () => true);
    expect(await M.buy('coins_m')).toBe('ok');
    expect(S.save.coins).toBe(3100);
    expect(notes).toEqual(['3000 سکه اومد تو کیفت!']);
  });

  it('a purchase backed out of gives nothing and says nothing', async () => {
    vi.stubGlobal('confirm', () => false);
    // A string result: callers must compare with «ok» (a cancelled pass or piggy was once a truthy value).
    expect(await M.buy('coins_m')).toBe('cancel');
    expect(S.save.coins).toBe(100);
    expect(notes).toEqual([]);
  });

  it('one purchase at a time: a second tap while one is open does nothing', async () => {
    vi.stubGlobal('confirm', () => true);
    // Two at once: the second arrives while the first is still open.
    const first = M.buy('no_ads'), second = M.buy('coins_s');
    expect(await second).toBe('cancel');
    expect(await first).toBe('ok');
    expect(S.save.owned.no_ads).toBe(true);
    expect(S.save.coins).toBe(100);
    expect(notes).toEqual(['تبلیغ‌های بین مرحله‌ها برای همیشه حذف شد!']);
  });

  it('an unknown product is not bought', async () => {
    expect(await M.buy('nothing')).toBe('cancel');
  });
});
