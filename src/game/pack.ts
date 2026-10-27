/**
 * A compact text form of the Journey levels, so the app doesn't ship (and parse) half a megabyte of JSON.
 * One string per level:  `w h bays tag oddEven officer | vehicles | obstacles | queue | vip | granny | intro`
 * Vehicles are 5 base-36 characters (kind, color, col, row, dir) plus optional flags: `c` covered,
 * `w<n>` wait, `p<d>` plate, `e<n>` wedding, each `n` one base-36 character.
 */
import { COLORS, type Dir, type Kind, type Level, type ObstacleDef, type VehicleDef } from './rules';

const KINDS: Kind[] = ['pride', 'peykan', 'p405', 'samand', 'zamyad', 'bus', 'bike'];
const DIRS: Dir[] = ['up', 'down', 'left', 'right'];
const OBST: ObstacleDef['kind'][] = ['cone', 'cart', 'tunnel'];
const b36 = (n: number) => n.toString(36);
const n36 = (c: string) => parseInt(c, 36);
const ci = (c: string) => COLORS.indexOf(c as (typeof COLORS)[number]);

export function packLevel(l: Level): string {
  const head = [l.w, l.h, l.bays ?? '', l.tag ?? '', l.oddEven ?? '', l.officer ? 1 : ''].join(' ');
  const veh = l.vehicles.map((v) => b36(KINDS.indexOf(v.kind)) + ci(v.color) + b36(v.col) + b36(v.row) + DIRS.indexOf(v.dir)
    + (v.covered ? 'c' : '') + (v.wait ? 'w' + b36(v.wait) : '') + (v.plate !== undefined ? 'p' + v.plate : '') + (v.wedding ? 'e' + b36(v.wedding) : '')).join(',');
  const obs = (l.obstacles ?? []).map((o) => OBST.indexOf(o.kind) + b36(o.col) + b36(o.row)
    + (o.dir ? 'd' + DIRS.indexOf(o.dir) : '') + (o.every ? 'v' + b36(o.every) : '') + (o.pair !== undefined ? 'r' + b36(o.pair) : '')).join(',');
  const queue = l.queue.map(ci).join('');
  return [head, veh, obs, queue, (l.vip ?? []).join(','), (l.granny ?? []).join(','), l.intro ?? ''].join('|');
}

export function unpackLevel(s: string): Level {
  const [head, veh, obs, queue, vip, granny, intro] = s.split('|');
  const [w, h, bays, tag, oddEven, officer] = head.split(' ');
  const l: Level = { w: +w, h: +h, vehicles: [], queue: [...queue].map((c) => COLORS[+c]) };
  if (bays) l.bays = +bays;
  if (tag) l.tag = tag;
  if (oddEven) l.oddEven = +oddEven;
  if (officer) l.officer = true;
  for (const t of veh ? veh.split(',') : []) {
    const v: VehicleDef = { kind: KINDS[n36(t[0])], color: COLORS[+t[1]], col: n36(t[2]), row: n36(t[3]), dir: DIRS[+t[4]] };
    for (let k = 5; k < t.length; k++) {
      const f = t[k];
      if (f === 'c') v.covered = true;
      else if (f === 'w') v.wait = n36(t[++k]);
      else if (f === 'p') v.plate = +t[++k];
      else if (f === 'e') v.wedding = n36(t[++k]);
    }
    l.vehicles.push(v);
  }
  if (obs) {
    l.obstacles = obs.split(',').map((t) => {
      const o: ObstacleDef = { kind: OBST[+t[0]], col: n36(t[1]), row: n36(t[2]) };
      for (let k = 3; k < t.length; k++) {
        const f = t[k], x = t[++k];
        if (f === 'd') o.dir = DIRS[+x]; else if (f === 'v') o.every = n36(x); else if (f === 'r') o.pair = n36(x);
      }
      return o;
    });
  }
  if (vip) l.vip = vip.split(',').map(Number);
  if (granny) l.granny = granny.split(',').map(Number);
  if (intro) l.intro = intro as Level['intro'];
  return l;
}
