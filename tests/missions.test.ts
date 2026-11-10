import { describe, expect, it } from 'vitest';
import { claimableMissions, countPlayed, missionText, pickMissions, todayMissions, type Missions } from '../src/missions';

const fa = (n: number) => String(n);

describe('daily missions (P4)', () => {
  it('three a day, the same for everyone at a stage, never two of a kind', () => {
    for (let d = 1; d <= 28; d++) {
      const day = `2026-11-${String(d).padStart(2, '0')}`;
      const a = pickMissions(day, 50), b = pickMissions(day, 50);
      expect(a).toEqual(b);
      expect(a).toHaveLength(3);
      expect(new Set(a.map((m) => m.kind)).size).toBe(3);
    }
  });

  it('only asks what the player can do yet', () => {
    const early = new Set<string>(), late = new Set<string>();
    for (let d = 1; d <= 60; d++) {
      const day = new Date(Date.UTC(2026, 10, d)).toISOString().slice(0, 10);
      for (const m of pickMissions(day, 5)) early.add(m.kind);
      for (const m of pickMissions(day, 100)) late.add(m.kind);
    }
    expect(early.has('hard')).toBe(false); // no «سخت» levels yet
    expect(early.has('dot')).toBe(false); // gold dots come from replays
    expect(late.has('hard') && late.has('dot')).toBe(true);
  });

  it('starts afresh each day', () => {
    const save = { level: 40, missions: { day: '', list: [], bonus: false } as Missions };
    const a = todayMissions(save, '2026-11-10');
    a.list[0].got = 1;
    expect(todayMissions(save, '2026-11-10')).toBe(a);
    expect(todayMissions(save, '2026-11-11').list.every((m) => m.got === 0)).toBe(true);
  });

  it('counts what a level did, and says which it completed', () => {
    const ms: Missions = { day: 'd', bonus: false, list: [
      { kind: 'win', goal: 2, got: 0, claimed: false }, { kind: 'people', goal: 100, got: 0, claimed: false }, { kind: 'combo', goal: 4, got: 0, claimed: false },
    ] };
    expect(countPlayed(ms, { won: false, people: 60, combo: 3 })).toEqual([]);
    expect(ms.list.map((m) => m.got)).toEqual([0, 60, 0]); // a loss still boards passengers
    const done = countPlayed(ms, { won: true, people: 50, combo: 4 });
    expect(done.map((m) => m.kind)).toEqual(['people', 'combo']);
    expect(ms.list.map((m) => m.got)).toEqual([1, 100, 4]);
    expect(countPlayed(ms, { won: true, people: 10, combo: 0 }).map((m) => m.kind)).toEqual(['win']);
  });

  it('counts the rewards waiting: each done mission, then the bonus for all three', () => {
    const ms: Missions = { day: 'd', bonus: false, list: [
      { kind: 'win', goal: 1, got: 1, claimed: false }, { kind: 'clean', goal: 1, got: 1, claimed: true }, { kind: 'rush', goal: 1, got: 0, claimed: false },
    ] };
    expect(claimableMissions(ms)).toBe(1);
    ms.list[0].claimed = true; ms.list[2].got = 1; ms.list[2].claimed = true;
    expect(claimableMissions(ms)).toBe(1); // the bonus
    ms.bonus = true;
    expect(claimableMissions(ms)).toBe(0);
  });

  it('words each mission in Persian', () => {
    expect(missionText({ kind: 'win', goal: 3 }, fa)).toBe('3 مرحله ببر');
    expect(missionText({ kind: 'combo', goal: 4 }, fa)).toBe('یه کمبوی 4تایی بزن');
  });
});
