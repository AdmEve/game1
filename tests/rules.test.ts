import { describe, expect, it } from 'vitest';
import LEVELS from '../src/game/levels.json';
import { addBay, newState, tap, validate, type Level } from '../src/game/rules';
import { solve } from '../src/game/solver';

const levels = LEVELS as Level[];

describe('rules', () => {
  const lvl: Level = {
    w: 3, h: 3,
    vehicles: [
      { kind: 'pride', color: 'red', col: 0, row: 0, dir: 'right' }, // blocks nothing, exits right? cell (2,0) is free
      { kind: 'pride', color: 'blue', col: 2, row: 0, dir: 'down' },
    ],
    queue: ['blue', 'blue', 'blue', 'blue', 'red', 'red', 'red', 'red'],
    bays: 1,
  };

  it('blocks a vehicle whose lane is occupied', () => {
    const s = newState(lvl);
    const ev = tap(s, 0);
    expect(ev[0]).toMatchObject({ t: 'blocked', v: 0, by: { v: 1 } });
    expect(s.inLot[0]).toBe(true);
  });

  it('exits, boards matching passengers in order and departs when full', () => {
    const s = newState(lvl);
    const ev = tap(s, 1);
    expect(ev.map((e) => e.t)).toEqual(['exit', 'board', 'board', 'board', 'board', 'depart']);
    expect(s.bays[0]).toBeNull();
    const ev2 = tap(s, 0);
    expect(ev2.at(-1)).toEqual({ t: 'won' });
  });

  it('loses when every bay is full and nobody can board', () => {
    const s = newState({ ...lvl, queue: ['red', 'red', 'red', 'red', 'blue', 'blue', 'blue', 'blue'] });
    const ev = tap(s, 1);
    expect(ev.at(-1)).toEqual({ t: 'lost' });
    addBay(s);
    expect(s.over).toBe(false);
    expect(tap(s, 0).at(-1)).toEqual({ t: 'won' });
  });
});

describe('journey levels', () => {
  it('has 30 levels', () => expect(levels.length).toBe(30));
  levels.forEach((l, i) => {
    it(`level ${i + 1} is valid and solvable`, () => {
      expect(validate(l)).toEqual([]);
      const r = solve(l);
      expect(r.solvable).toBe(true);
      // Replaying the solution wins.
      const s = newState(l);
      for (const m of r.solution) tap(s, m);
      expect(s.over).toBe('won');
    });
  });
});
