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

describe('mechanics', () => {
  const four = (c: 'red' | 'blue') => [c, c, c, c] as ('red' | 'blue')[];
  it('«پیکان خراب» waits until enough cars have left', () => {
    const l: Level = {
      w: 3, h: 2,
      vehicles: [
        { kind: 'peykan', color: 'red', col: 0, row: 0, dir: 'up', wait: 1 },
        { kind: 'pride', color: 'blue', col: 2, row: 0, dir: 'up' },
      ],
      queue: [...four('blue'), ...four('red')],
    };
    const s = newState(l);
    expect(tap(s, 0)[0]).toMatchObject({ t: 'locked', why: 'broken', left: 1 });
    tap(s, 1);
    expect(tap(s, 0).at(-1)).toEqual({ t: 'won' });
  });

  it('«چادر ماشین» comes off when a neighbour leaves', () => {
    const l: Level = {
      w: 2, h: 2,
      vehicles: [
        { kind: 'pride', color: 'red', col: 0, row: 0, dir: 'up', covered: true },
        { kind: 'pride', color: 'blue', col: 1, row: 0, dir: 'up' },
      ],
      queue: [...four('blue'), ...four('red')],
    };
    const s = newState(l);
    expect(s.revealed).toEqual([false, true]);
    const ev = tap(s, 1);
    expect(ev).toContainEqual({ t: 'reveal', v: 0 });
    expect(s.revealed[0]).toBe(true);
  });

  it('«دربست» rides alone in an empty car and leaves at once', () => {
    const l: Level = {
      w: 2, h: 2,
      vehicles: [
        { kind: 'pride', color: 'red', col: 0, row: 0, dir: 'up' },
        { kind: 'pride', color: 'red', col: 1, row: 0, dir: 'up' },
      ],
      queue: ['red', 'red', 'red', 'red', 'red'],
      vip: [0],
    };
    expect(validate(l)).toEqual([]);
    const s = newState(l);
    const ev = tap(s, 0);
    expect(ev.map((e) => e.t)).toEqual(['exit', 'board', 'depart']);
    expect(tap(s, 1).at(-1)).toEqual({ t: 'won' });
  });

  it('«طرح زوج و فرد» lets even plates out first, then odd', () => {
    const l: Level = {
      w: 3, h: 2, oddEven: 1,
      vehicles: [
        { kind: 'pride', color: 'red', col: 0, row: 0, dir: 'up', plate: 3 },
        { kind: 'pride', color: 'blue', col: 1, row: 0, dir: 'up', plate: 4 },
      ],
      queue: [...four('blue'), ...four('red')],
    };
    const s = newState(l);
    expect(tap(s, 0)[0]).toMatchObject({ t: 'locked', why: 'plate' });
    tap(s, 1);
    expect(tap(s, 0).at(-1)).toEqual({ t: 'won' });
  });
});

describe('journey levels', () => {
  it('has 90 levels', () => expect(levels.length).toBe(90));
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
