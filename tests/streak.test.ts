import { describe, expect, it } from 'vitest';
import { nextStreak, streakHelps } from '../src/streak';
import { count, hardest, statsCsv, type LevelStats } from '../src/levelstats';

describe('win streak', () => {
  it('grows by one per new win and resets when a level is given up', () => {
    let n = 0;
    n = nextStreak(n, 'won', true); n = nextStreak(n, 'won', true);
    expect(n).toBe(2);
    expect(nextStreak(n, 'gaveUp', true)).toBe(0);
  });
  it('ignores replays of finished levels', () => {
    expect(nextStreak(2, 'won', false)).toBe(2);
    expect(nextStreak(2, 'gaveUp', false)).toBe(2);
  });
  it('pays more help the longer it runs, capped at three', () => {
    expect(streakHelps(0)).toEqual([]);
    expect(streakHelps(1)).toEqual(['bay']);
    expect(streakHelps(2)).toEqual(['bay', 'crane']);
    expect(streakHelps(3)).toEqual(['bay', 'crane', 'whistle']);
    expect(streakHelps(9)).toEqual(['bay', 'crane', 'whistle']);
  });
});

describe('level stats', () => {
  it('counts per level and ranks the hardest by loss rate', () => {
    const st: LevelStats = {};
    for (let i = 0; i < 4; i++) count(st, 9, 'attempt');
    count(st, 9, 'loss'); count(st, 9, 'loss'); count(st, 9, 'loss'); count(st, 9, 'win');
    count(st, 2, 'attempt'); count(st, 2, 'attempt'); count(st, 2, 'win'); count(st, 2, 'win');
    count(st, 30, 'attempt'); count(st, 30, 'loss'); // one attempt: not enough to rank
    expect(st['10']).toEqual([4, 3, 1]);
    const h = hardest(st);
    expect(h.map((x) => x.level)).toEqual([10, 3]);
    expect(h[0].lossRate).toBe(0.75);
    expect(statsCsv(st).split('\n')).toEqual(['level,attempts,losses,wins', '3,2,0,2', '10,4,3,1', '31,1,1,0']);
  });
});
