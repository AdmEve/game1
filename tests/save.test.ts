import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** A Map-backed localStorage stand-in. */
function storage(init: Record<string, string> = {}) {
  const m = new Map(Object.entries(init));
  return {
    m,
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => { m.set(k, String(v)); },
    removeItem: (k: string) => { m.delete(k); },
  };
}
const KEY = 'rahbandoon.save.v1', BAK = KEY + '.bak';

describe('save safety', () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllGlobals());

  it('falls back to the backup when the main save is spoiled', async () => {
    vi.stubGlobal('localStorage', storage({ [KEY]: '{"level": 4, "coi', [BAK]: JSON.stringify({ level: 7, coins: 900 }) }));
    const { save } = await import('../src/save');
    expect(save.level).toBe(7);
    expect(save.coins).toBe(900);
    expect(save.settings.sound).toBe(true); // missing fields come from a fresh save
  });

  it('prefers the main save when it is whole', async () => {
    vi.stubGlobal('localStorage', storage({ [KEY]: JSON.stringify({ level: 9, coins: 5 }), [BAK]: JSON.stringify({ level: 7, coins: 900 }) }));
    const { save } = await import('../src/save');
    expect(save.level).toBe(9);
  });

  it('ignores a copy that parses but is not a save', async () => {
    vi.stubGlobal('localStorage', storage({ [KEY]: 'null', [BAK]: '"text"' }));
    const { save } = await import('../src/save');
    expect(save.level).toBe(0);
    expect(save.coins).toBe(200);
  });

  it('writes both copies, with the format version', async () => {
    const st = storage();
    vi.stubGlobal('localStorage', st);
    const { save, persist, SAVE_VERSION } = await import('../src/save');
    save.level = 12; persist();
    expect(JSON.parse(st.m.get(KEY)!).level).toBe(12);
    expect(st.m.get(BAK)).toBe(st.m.get(KEY));
    expect(JSON.parse(st.m.get(KEY)!).v).toBe(SAVE_VERSION);
  });

  it('migrates switched-off sound and music to zero volume', async () => {
    vi.stubGlobal('localStorage', storage({ [KEY]: JSON.stringify({ level: 2, coins: 10, settings: { sound: false, music: false, haptics: true } }) }));
    const { save } = await import('../src/save');
    expect(save.settings).toMatchObject({ sfxVol: 0, musicVol: 0, sound: false, music: false, haptics: true, reduceMotion: null, bigText: false });
  });

  it('gives saves from before the left-handed setting the usual layout, and keeps it once chosen', async () => {
    vi.stubGlobal('localStorage', storage({ [KEY]: JSON.stringify({ level: 30, coins: 10, settings: { sfxVol: 80, musicVol: 60, bigText: true } }) }));
    let { save } = await import('../src/save');
    expect(save.settings).toMatchObject({ leftHand: false, bigText: true, sfxVol: 80 });
    vi.resetModules();
    vi.stubGlobal('localStorage', storage({ [KEY]: JSON.stringify({ level: 30, coins: 10, settings: { sfxVol: 80, musicVol: 60, leftHand: true } }) }));
    ({ save } = await import('../src/save'));
    expect(save.settings.leftHand).toBe(true);
  });

  it('keeps sound and music on for old saves that had them on', async () => {
    vi.stubGlobal('localStorage', storage({ [KEY]: JSON.stringify({ level: 2, coins: 10, settings: { sound: true, music: true } }) }));
    const { save } = await import('../src/save');
    expect(save.settings.sfxVol).toBeGreaterThan(0);
    expect(save.settings.musicVol).toBeGreaterThan(0);
    expect(save.settings.sound && save.settings.music).toBe(true);
  });

  it('keeps the backup when writing the main copy fails', async () => {
    const st = storage({ [BAK]: JSON.stringify({ level: 3, coins: 1 }) });
    vi.stubGlobal('localStorage', { ...st, setItem: (k: string, v: string) => { if (k === KEY) throw new Error('quota'); st.setItem(k, v); } });
    const { save, persist } = await import('../src/save');
    save.level = 4; persist();
    expect(JSON.parse(st.m.get(BAK)!).level).toBe(4);
  });
});

describe('error log', () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllGlobals());

  it('keeps the last 20 errors and counts repeats', async () => {
    vi.stubGlobal('localStorage', storage());
    const { logError, errors, errorReport } = await import('../src/errlog');
    for (let i = 0; i < 25; i++) logError(`e${i}`, 'a.js:1:1', i);
    logError('e24', 'a.js:1:1', 99);
    const l = errors();
    expect(l).toHaveLength(20);
    expect(l[0].m).toBe('e5');
    expect(l[19]).toMatchObject({ m: 'e24', n: 2, t: 99 });
    expect(errorReport()).toContain('×2 e24 @ a.js:1:1');
  });
});
