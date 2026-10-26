import { beforeEach, describe, expect, it } from 'vitest';
import { PUNCHES_PER_STATION, STATIONS, pass, passReady, punch, stationOf } from '../src/ui/pass';
import { save } from '../src/save';

describe('«کارت بلیت» monthly pass', () => {
  beforeEach(() => { save.pass = { month: '', punches: 0, free: [], prem: [], premium: false }; });
  it('reaches a station every two wins and stops at the last one', () => {
    expect(punch()).toBe(false);
    expect(punch()).toBe(true);
    expect(stationOf(pass().punches)).toBe(1);
    for (let k = 0; k < 100; k++) punch();
    expect(pass().punches).toBe(STATIONS.length * PUNCHES_PER_STATION);
  });
  it('counts rewards waiting on both tracks', () => {
    for (let k = 0; k < 6; k++) punch();
    expect(passReady()).toBe(3);
    pass().premium = true;
    expect(passReady()).toBe(6);
  });
  it('starts a fresh card in a new month', () => {
    save.pass = { month: '2000-01', punches: 30, free: [1], prem: [], premium: true };
    expect(pass().punches).toBe(0);
    expect(pass().premium).toBe(false);
  });
});
