import { describe, expect, it } from 'vitest';
import LEVELS from '../src/game/levels.json';
import { addBay, newState, startState, tap, validate, weddingLeft, type Level } from '../src/game/rules';
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

describe('fruit cart', () => {
  it('«گاری میوه» rolls one cell every N exits and turns back at walls', () => {
    const l: Level = {
      w: 3, h: 3,
      vehicles: [
        { kind: 'pride', color: 'red', col: 0, row: 0, dir: 'up' },
        { kind: 'pride', color: 'blue', col: 2, row: 1, dir: 'up' },
      ],
      obstacles: [{ kind: 'cart', col: 1, row: 2, dir: 'right', every: 1 }],
      queue: ['red', 'red', 'red', 'red', 'blue', 'blue', 'blue', 'blue'],
    };
    const s = newState(l);
    const ev = tap(s, 0);
    // (2,2) is the blue car's tail: the cart turns back and rolls left instead.
    expect(ev).toContainEqual({ t: 'cart', i: 0, col: 0, row: 2 });
    // At the wall it turns again and rolls right.
    const ev2 = tap(s, 1);
    expect(ev2).toContainEqual({ t: 'cart', i: 0, col: 1, row: 2 });
    expect(s.over).toBe('won');
  });
});

describe('wedding car', () => {
  const l: Level = {
    w: 3, h: 2,
    vehicles: [
      { kind: 'pride', color: 'red', col: 0, row: 0, dir: 'up' },
      { kind: 'pride', color: 'blue', col: 1, row: 0, dir: 'up' },
      { kind: 'pride', color: 'green', col: 2, row: 0, dir: 'up', wedding: 2 },
    ],
    queue: [...Array(4).fill('red'), ...Array(4).fill('blue'), ...Array(4).fill('green')],
  };
  it('«ماشین عروس» must be among the first N cars to leave', () => {
    const s = newState(l);
    expect(weddingLeft(s, 2)).toBe(2);
    tap(s, 0);
    expect(weddingLeft(s, 2)).toBe(1);
    const ev = tap(s, 1);
    expect(ev).toContainEqual({ t: 'late', v: 2 });
    expect(s.over).toBe('lost');
    // After a continue the game goes on; the car is no longer on the clock.
    addBay(s);
    expect(weddingLeft(s, 2)).toBeNull();
    tap(s, 2);
    expect(s.over).toBe('won');
  });
  it('in time, nothing happens', () => {
    const s = newState(l);
    tap(s, 2); tap(s, 0); tap(s, 1);
    expect(s.over).toBe('won');
  });
});

describe('granny', () => {
  it('«حاج‌خانم» takes two seats and waits for a car with two free', () => {
    const l: Level = {
      w: 2, h: 2,
      vehicles: [
        { kind: 'pride', color: 'red', col: 0, row: 0, dir: 'up' },
        { kind: 'pride', color: 'red', col: 1, row: 0, dir: 'up' },
      ],
      // 1 + 1 + 1, then a grandma (2) who can't fit in the last seat, then 1 + 1 + 1.
      queue: ['red', 'red', 'red', 'red', 'red', 'red', 'red'],
      granny: [3],
    };
    expect(validate(l)).toEqual([]);
    const s = newState(l);
    tap(s, 0);
    expect(s.q).toBe(3);
    expect(s.bays[0]!.boarded).toBe(3);
    const ev = tap(s, 1);
    // She rides the second car; the next passenger fills the first.
    expect(ev.filter((e) => e.t === 'board').map((e) => (e as { bay: number }).bay)).toEqual([1, 0, 1, 1]);
    expect(s.over).toBe('won');
  });
});

describe('officer', () => {
  it('«پلیس راهور» lets one direction go at a time', () => {
    const l: Level = {
      w: 4, h: 3, officer: true,
      vehicles: [
        { kind: 'pride', color: 'red', col: 0, row: 0, dir: 'up' },
        { kind: 'pride', color: 'blue', col: 1, row: 2, dir: 'right' },
        { kind: 'pride', color: 'red', col: 3, row: 0, dir: 'up' },
      ],
      queue: ['red', 'red', 'red', 'red', 'blue', 'blue', 'blue', 'blue', 'red', 'red', 'red', 'red'],
    };
    const s = startState(l);
    expect(s.axis).toBe('v');
    expect(tap(s, 1)[0]).toMatchObject({ t: 'locked', why: 'officer' });
    const ev = tap(s, 0);
    expect(ev).toContainEqual({ t: 'axis', axis: 'h' });
    expect(tap(s, 2)[0]).toMatchObject({ t: 'locked', why: 'officer' });
    tap(s, 1);
    expect(tap(s, 2).at(-1)).toEqual({ t: 'won' });
  });
});

describe('courier', () => {
  it('«پیک موتوری» takes one passenger of any color when no car matches', () => {
    const l: Level = {
      w: 3, h: 2,
      vehicles: [
        { kind: 'bike', color: 'white', col: 0, row: 0, dir: 'up' },
        { kind: 'pride', color: 'red', col: 1, row: 0, dir: 'up' },
      ],
      queue: ['blue', 'red', 'red', 'red', 'red'],
    };
    expect(validate(l)).toEqual([]);
    const s = newState(l);
    expect(tap(s, 1).map((e) => e.t)).toEqual(['exit']);
    const ev = tap(s, 0);
    expect(ev[1]).toMatchObject({ t: 'board', color: 'blue', v: 0 });
    expect(ev.at(-1)).toEqual({ t: 'won' });
  });
});

describe('journey levels', () => {
  it('has 210 levels', () => expect(levels.length).toBe(210));
  levels.forEach((l, i) => {
    it(`level ${i + 1} is valid and solvable`, () => {
      expect(validate(l)).toEqual([]);
      const r = solve(l);
      expect(r.solvable).toBe(true);
      // Replaying the solution (from the same start the game uses) wins.
      const s = startState(l);
      for (const m of r.solution) tap(s, m);
      expect(s.over).toBe('won');
    });
  });
});
