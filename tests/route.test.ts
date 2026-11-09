import { describe, expect, it } from 'vitest';
import { newState, route, type Level } from '../src/game/rules';

/** A board with the given vehicles and obstacles (the queue only has to be long enough). */
const board = (w: number, h: number, vehicles: Level['vehicles'], obstacles: Level['obstacles'] = [], extra: Partial<Level> = {}): Level =>
  ({ w, h, vehicles, obstacles, queue: Array(vehicles.length * 4).fill('red'), bays: 5, ...extra });

describe('route (hold to see the way out)', () => {
  it('runs from the cell in front to the edge when the lane is clear', () => {
    const s = newState(board(5, 3, [{ kind: 'pride', color: 'red', col: 0, row: 1, dir: 'right' }]));
    expect(route(s, 0)).toEqual({ dir: 'right', legs: [{ from: [2, 1], to: [4, 1] }], end: 'out', by: null, hold: null });
  });

  it('has no leg when the edge is right in front', () => {
    const s = newState(board(3, 3, [{ kind: 'pride', color: 'red', col: 1, row: 0, dir: 'up' }]));
    expect(route(s, 0)).toMatchObject({ legs: [], end: 'out' });
  });

  it('stops at the cell before a cone, naming the cone cell', () => {
    const s = newState(board(6, 2, [{ kind: 'pride', color: 'red', col: 0, row: 0, dir: 'right' }], [{ kind: 'cone', col: 4, row: 0 }]));
    expect(route(s, 0)).toMatchObject({ legs: [{ from: [2, 0], to: [3, 0] }], end: 'blocked', by: [4, 0] });
  });

  it('has no leg when a car is right in front', () => {
    const s = newState(board(3, 4, [
      { kind: 'pride', color: 'red', col: 0, row: 2, dir: 'up' },
      { kind: 'pride', color: 'blue', col: 0, row: 1, dir: 'right' },
    ]));
    expect(route(s, 0)).toMatchObject({ legs: [], end: 'blocked', by: [0, 1] });
  });

  it('stops short of a car further up the lane', () => {
    const s = newState(board(3, 4, [
      { kind: 'pride', color: 'red', col: 0, row: 2, dir: 'up' },
      { kind: 'pride', color: 'blue', col: 0, row: 0, dir: 'right' },
    ]));
    expect(route(s, 0)).toMatchObject({ legs: [{ from: [0, 1], to: [0, 1] }], end: 'blocked', by: [0, 0] });
  });

  it('opens the lane once the blocker has left', () => {
    const s = newState(board(3, 4, [
      { kind: 'pride', color: 'red', col: 0, row: 2, dir: 'up' },
      { kind: 'pride', color: 'blue', col: 0, row: 0, dir: 'right' },
    ]));
    s.inLot[1] = false;
    expect(route(s, 0)).toMatchObject({ legs: [{ from: [0, 1], to: [0, 0] }], end: 'out' });
  });

  it('goes through a tunnel: one leg into the mouth, one from the other mouth on', () => {
    const s = newState(board(5, 4, [{ kind: 'pride', color: 'red', col: 0, row: 0, dir: 'right' }], [
      { kind: 'tunnel', col: 3, row: 0, pair: 1 },
      { kind: 'tunnel', col: 1, row: 3, pair: 0 },
    ]));
    expect(route(s, 0)).toMatchObject({ legs: [{ from: [2, 0], to: [3, 0] }, { from: [2, 3], to: [4, 3] }], end: 'out' });
  });

  it('says when a rule holds the vehicle back (a broken car before enough have left)', () => {
    const s = newState(board(5, 3, [
      { kind: 'peykan', color: 'red', col: 0, row: 1, dir: 'right', wait: 2 },
      { kind: 'pride', color: 'blue', col: 0, row: 0, dir: 'right' },
    ]));
    expect(route(s, 0)).toMatchObject({ end: 'out', hold: 'broken' });
    expect(route(s, 1).hold).toBeNull();
  });
});
