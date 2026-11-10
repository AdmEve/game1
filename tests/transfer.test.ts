import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { Save } from '../src/save';

// save.ts reads localStorage when it loads.
const store = new Map<string, string>();
vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) });

let T: typeof import('../src/transfer');
let S: typeof import('../src/save');
beforeAll(async () => { S = await import('../src/save'); T = await import('../src/transfer'); });

/** A save some way into the game, as an old phone would have it. */
function played(): Save {
  const s = S.normalize({ level: 118, coins: 845 });
  s.boosters = { crane: 3, whistle: 0, bay: 7 };
  s.garage = { keys: 4, restored: ['peykan', 'jian'] };
  s.agency = { stars: 2, done: ['sign', 'desk', 'radio'] };
  for (let k = 0; k < 118; k++) s.lvStats[k] = [3, 2, 1];
  for (let k = 0; k < 80; k++) s.seen['boss' + k] = true;
  s.owned = { starter: true, no_ads: true };
  s.settings.quality = 'high'; s.settings.notify = true; s.settings.leftHand = true; s.settings.musicVol = 40;
  s.notifyAsked = true;
  return s;
}

describe('progress transfer code', () => {
  it('carries the progress there and back', async () => {
    const code = await T.makeCode(played());
    expect(code).toMatch(/^RB1\.[A-Za-z0-9_-]+\.[0-9a-z]+$/);
    // Short enough to paste in a message (the whole of a late save).
    expect(code.length).toBeLessThan(2500);
    const r = await T.readCode(code);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.save.level).toBe(118);
    expect(r.save.coins).toBe(845);
    expect(r.save.garage?.restored).toEqual(['peykan', 'jian']);
    expect(Object.keys(r.save.lvStats ?? {})).toHaveLength(118);
    // Bazaar purchases are not in it: they come back from the player's Bazaar account.
    expect(r.save.owned).toBeUndefined();
  });

  it('reads a code a messenger wrapped, marked or kept words around', async () => {
    const code = await T.makeCode(played());
    const wrapped = `کد پیشرفت راه‌بندون:\n‏${code.slice(0, 40)}\n${code.slice(40, 300)} ${code.slice(300)}‎\n`;
    const r = await T.readCode(wrapped);
    expect(r.ok && r.save.level).toBe(118);
  });

  it('says what is wrong with a bad code', async () => {
    const code = await T.makeCode(played());
    expect(await T.readCode('سلام')).toEqual({ ok: false, why: 'none' });
    // Cut short: the check no longer matches.
    expect(await T.readCode(code.slice(0, code.length - 30) + code.slice(code.lastIndexOf('.')))).toEqual({ ok: false, why: 'broken' });
    // One character changed.
    const i = 20, bad = code.slice(0, i) + (code[i] === 'A' ? 'B' : 'A') + code.slice(i + 1);
    expect(await T.readCode(bad)).toEqual({ ok: false, why: 'broken' });
  });

  it('refuses a code from a newer version of the game', async () => {
    const s = played(); s.v = S.SAVE_VERSION + 1;
    expect(await T.readCode(await T.makeCode(s))).toEqual({ ok: false, why: 'newer' });
  });

  it('keeps what belongs to this phone', async () => {
    const r = await T.readCode(await T.makeCode(played()));
    if (!r.ok) throw new Error('unreadable');
    const here = S.normalize({ level: 3, coins: 260 });
    here.owned = { starter: false, no_ads: true };
    here.settings.quality = 'low'; here.settings.notify = false; here.notifyAsked = false;
    const next = T.merged(r.save, here);
    expect(next.level).toBe(118);
    expect(next.coins).toBe(845);
    expect(next.boosters).toEqual({ crane: 3, whistle: 0, bay: 7 });
    expect(next.owned).toEqual({ starter: false, no_ads: true });
    expect(next.settings.quality).toBe('low');
    expect(next.settings.notify).toBe(false);
    expect(next.notifyAsked).toBe(false);
    // The player's own choices travel.
    expect(next.settings.leftHand).toBe(true);
    expect(next.settings.musicVol).toBe(40);
    expect(next.v).toBe(S.SAVE_VERSION);
  });

  it('replaces the save in place and keeps the one it replaced', async () => {
    S.save.level = 5; S.save.coins = 111;
    const r = await T.readCode(await T.makeCode(played()));
    if (!r.ok) throw new Error('unreadable');
    S.replaceSave(T.merged(r.save, S.save));
    expect(S.save.level).toBe(118);
    expect(JSON.parse(store.get('rahbandoon.save.v1')!).level).toBe(118);
    expect(JSON.parse(store.get('rahbandoon.save.v1.bak')!).level).toBe(118);
    expect(JSON.parse(store.get('rahbandoon.save.v1.before-transfer')!).coins).toBe(111);
  });
});
