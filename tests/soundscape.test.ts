import { describe, expect, it, vi } from 'vitest';

vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {}, removeItem: () => {} });

describe('city soundscape (I7)', () => {
  it('every chapter light has a place, and only Tochal is left to its wind', async () => {
    const { SCAPES } = await import('../src/soundscape');
    const { CHAPTERS } = await import('../src/game/chapters');
    for (const ch of CHAPTERS) expect(SCAPES[ch.light], ch.name).toBeDefined();
    const silent = Object.entries(SCAPES).filter(([, s]) => !s.traffic && !s.birds && !s.crowd && !s.horns).map(([k]) => k);
    expect(silent).toEqual(['snow']);
    // No birds at night or in the snow; the bazaar is the one with a crowd.
    expect(SCAPES.night.birds).toBe(0);
    expect(Object.entries(SCAPES).filter(([, s]) => s.crowd > 0).map(([k]) => k)).toEqual(['bazaar']);
  });
});
