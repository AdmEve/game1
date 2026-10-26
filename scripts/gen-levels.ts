/**
 * Generates the Journey levels into src/game/levels.json.
 *   npx vite-node scripts/gen-levels.ts
 * Every level is solver-verified, then picked from many candidates to hit a target difficulty
 * (the win rate of a simulated casual player who looks three passengers ahead).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { KIND, type Level } from '../src/game/rules';
import { playRates, rng, solve } from '../src/game/solver';
import { generate, type Spec } from '../src/game/generator';

// Difficulty curve: a sawtooth with a «سخت» (hard) level every five.
const SPECS: Spec[] = [
{ w: 4, h: 4, fill: 0.5, colors: 2, mix: 0, target: 1 },
  { w: 4, h: 5, fill: 0.6, colors: 2, mix: 1, target: 1 },
  { w: 5, h: 5, fill: 0.7, colors: 3, mix: 2, target: 0.95 },
  { w: 5, h: 6, fill: 0.75, colors: 3, mix: 3, target: 0.9, cones: 1 },
  { w: 5, h: 6, fill: 0.85, colors: 3, mix: 6, target: 0.6, tag: 'hard' },
  { w: 6, h: 6, fill: 0.75, colors: 3, mix: 3, target: 0.9, zamyad: 0.15 },
  { w: 6, h: 6, fill: 0.8, colors: 4, mix: 4, target: 0.85, zamyad: 0.15, cover: 0.3, intro: 'cover' },
  { w: 6, h: 7, fill: 0.8, colors: 4, mix: 5, target: 0.8, cones: 1, cover: 0.25 },
  { w: 6, h: 7, fill: 0.82, colors: 4, mix: 5, target: 0.75, bus: 0.08 },
  { w: 6, h: 7, fill: 0.88, colors: 4, mix: 9, target: 0.4, zamyad: 0.15, tag: 'hard' },
  { w: 6, h: 7, fill: 0.8, colors: 4, mix: 5, target: 0.85, bus: 0.1, broken: 1, intro: 'broken' },
  { w: 7, h: 7, fill: 0.8, colors: 4, mix: 6, target: 0.8, zamyad: 0.12, cones: 1, broken: 1, cover: 0.2 },
  { w: 7, h: 7, fill: 0.82, colors: 5, mix: 6, target: 0.75, bus: 0.08, cover: 0.3 },
  { w: 7, h: 8, fill: 0.82, colors: 5, mix: 7, target: 0.7, zamyad: 0.12 },
  { w: 7, h: 8, fill: 0.9, colors: 5, mix: 11, target: 0.35, bus: 0.08, cones: 2, tag: 'hard' },
  { w: 7, h: 8, fill: 0.8, colors: 5, mix: 6, target: 0.8, zamyad: 0.12, vip: 1, intro: 'vip' },
  { w: 7, h: 8, fill: 0.84, colors: 5, mix: 7, target: 0.7, bus: 0.1, cones: 1, vip: 1, broken: 1 },
  { w: 7, h: 8, fill: 0.85, colors: 5, mix: 8, target: 0.65, zamyad: 0.15, cover: 0.3, vip: 1 },
  { w: 7, h: 9, fill: 0.85, colors: 5, mix: 8, target: 0.6, bus: 0.08, cones: 2, broken: 2 },
  { w: 7, h: 9, fill: 0.9, colors: 6, mix: 12, target: 0.3, zamyad: 0.12, bus: 0.06, tag: 'hard', cover: 0.3, broken: 1, vip: 1 },
  { w: 7, h: 8, fill: 0.82, colors: 5, mix: 7, target: 0.75, zamyad: 0.12, oddEven: 3, intro: 'oddEven' },
  { w: 7, h: 9, fill: 0.85, colors: 6, mix: 8, target: 0.65, bus: 0.08, cones: 1, oddEven: 3, cover: 0.2 },
  { w: 7, h: 9, fill: 0.86, colors: 6, mix: 9, target: 0.6, zamyad: 0.15, oddEven: 4, vip: 1 },
  { w: 7, h: 9, fill: 0.88, colors: 6, mix: 10, target: 0.5, bus: 0.1, cones: 2, oddEven: 3, broken: 1 },
  { w: 7, h: 9, fill: 0.92, colors: 6, mix: 13, target: 0.25, zamyad: 0.12, bus: 0.08, tag: 'hard', oddEven: 3, cover: 0.25, vip: 1 },
  { w: 7, h: 9, fill: 0.84, colors: 6, mix: 8, target: 0.7, zamyad: 0.12, cover: 0.3, broken: 1 },
  { w: 7, h: 9, fill: 0.86, colors: 6, mix: 9, target: 0.6, bus: 0.1, cones: 1, oddEven: 3, vip: 2 },
  { w: 7, h: 10, fill: 0.88, colors: 6, mix: 10, target: 0.5, zamyad: 0.15, cones: 2, cover: 0.35, broken: 1, vip: 1 },
  { w: 7, h: 10, fill: 0.9, colors: 6, mix: 11, target: 0.4, bus: 0.1, zamyad: 0.1, oddEven: 3, cover: 0.25, broken: 1 },
  { w: 7, h: 10, fill: 0.93, colors: 6, mix: 15, target: 0.15, zamyad: 0.12, bus: 0.08, cones: 2, tag: 'boss', oddEven: 4, cover: 0.3, broken: 1, vip: 1 },
];

// Chapters 2 and 3: a sawtooth that climbs within each chapter, a hard level every five, a boss at the end,
// and a seeded mix of the four mechanics (odd/even plates more common at Azadi).
for (let i = 0; i < 60; i++) {
  const n = 31 + i, inCh = i % 30, ch3 = i >= 30;
  const hard = n % 5 === 0, boss = n % 30 === 0;
  const r = rng(n * 7919);
  const spec: Spec = {
    w: 7, h: inCh < 8 ? 8 : inCh < 20 ? 9 : 10, fill: 0.84 + (inCh / 29) * 0.06 + (hard ? 0.02 : 0),
    colors: inCh < 6 ? 5 : 6, mix: Math.round(7 + inCh / 4 + (hard ? 4 : 0)),
    target: boss ? 0.15 : hard ? 0.3 : Math.max(0.45, 0.8 - 0.25 * (inCh / 29)),
    zamyad: 0.12, bus: 0.08, cones: Math.floor(r() * 3),
  };
  if (r() < 0.5) spec.cover = 0.2 + r() * 0.15;
  if (r() < 0.4) spec.broken = 1 + (r() < 0.3 ? 1 : 0);
  if (r() < 0.35) spec.vip = 1 + (r() < 0.3 ? 1 : 0);
  if (r() < (ch3 ? 0.55 : 0.3)) spec.oddEven = 3 + Math.floor(r() * 2);
  if (boss) Object.assign(spec, { cover: 0.3, broken: 1, vip: 1, oddEven: 4 });
  // Courier bikes from level 41 on (introduced there).
  if (n === 41) Object.assign(spec, { bikes: 2, intro: 'courier', oddEven: undefined, vip: undefined });
  else if (n > 41 && r() < 0.35) spec.bikes = 1 + Math.floor(r() * 2);
  if (hard) spec.tag = 'hard';
  if (boss) spec.tag = 'boss';
  SPECS.push(spec);
}

// Chapter 5 (the Grand Bazaar): fruit carts roll through the lot from level 122.
const ch5: Spec[] = [];
for (let i = 0; i < 30; i++) {
  const n = 121 + i, inCh = i;
  const hard = n % 5 === 0, boss = n === 150;
  const r = rng(n * 130363);
  const spec: Spec = {
    w: 7, h: inCh < 8 ? 8 : inCh < 20 ? 9 : 10, fill: 0.84 + (inCh / 29) * 0.06 + (hard ? 0.02 : 0),
    colors: 6, mix: Math.round(8 + inCh / 4 + (hard ? 4 : 0)),
    target: boss ? 0.15 : hard ? 0.3 : Math.max(0.45, 0.78 - 0.25 * (inCh / 29)),
    zamyad: 0.15, bus: 0.06, cones: Math.floor(r() * 2),
  };
  if (r() < 0.35) spec.cover = 0.2 + r() * 0.15;
  if (r() < 0.3) spec.broken = 1;
  if (r() < 0.3) spec.vip = 1;
  if (r() < 0.3) spec.bikes = 1 + Math.floor(r() * 2);
  const rule = r();
  if (rule < 0.2) spec.oddEven = 3; else if (rule < 0.4) spec.officer = true;
  if (n === 122) Object.assign(spec, { carts: 1, intro: 'cart', oddEven: undefined, officer: undefined, vip: undefined, cover: undefined });
  else if (n > 122 && r() < 0.6) spec.carts = 1 + (r() < 0.35 ? 1 : 0);
  if (boss) Object.assign(spec, { cover: 0.3, broken: 1, vip: 1, carts: 2, bikes: 1 });
  if (hard) spec.tag = 'hard';
  if (boss) spec.tag = 'boss';
  ch5.push(spec);
}

// Chapter 4 (Tochal in the snow): the traffic officer arrives at level 93.
for (let i = 0; i < 30; i++) {
  const n = 91 + i, inCh = i;
  const hard = n % 5 === 0, boss = n === 120;
  const r = rng(n * 104729);
  const spec: Spec = {
    w: 7, h: inCh < 8 ? 8 : inCh < 20 ? 9 : 10, fill: 0.85 + (inCh / 29) * 0.06 + (hard ? 0.02 : 0),
    colors: 6, mix: Math.round(8 + inCh / 4 + (hard ? 4 : 0)),
    target: boss ? 0.15 : hard ? 0.3 : Math.max(0.45, 0.78 - 0.25 * (inCh / 29)),
    zamyad: 0.12, bus: 0.08, cones: Math.floor(r() * 3),
  };
  if (r() < 0.4) spec.cover = 0.2 + r() * 0.15;
  if (r() < 0.35) spec.broken = 1;
  if (r() < 0.3) spec.vip = 1;
  if (r() < 0.25) spec.oddEven = 3;
  if (r() < 0.3) spec.bikes = 1 + Math.floor(r() * 2);
  if (n === 93) Object.assign(spec, { officer: true, intro: 'officer', oddEven: undefined, vip: undefined, cover: undefined });
  else if (n > 93 && r() < 0.5) { spec.officer = true; spec.oddEven = undefined; }
  if (boss) Object.assign(spec, { cover: 0.3, broken: 1, vip: 1, officer: true, bikes: 1 });
  if (hard) spec.tag = 'hard';
  if (boss) spec.tag = 'boss';
  SPECS.push(spec);
}

SPECS.push(...ch5);

// Chapter 6 (Darband, autumn): wedding cars «ماشین عروس» from level 152.
for (let i = 0; i < 30; i++) {
  const n = 151 + i, inCh = i;
  const hard = n % 5 === 0, boss = n === 180;
  const r = rng(n * 155893);
  const spec: Spec = {
    w: 7, h: inCh < 8 ? 8 : inCh < 20 ? 9 : 10, fill: 0.85 + (inCh / 29) * 0.06 + (hard ? 0.02 : 0),
    colors: 6, mix: Math.round(9 + inCh / 4 + (hard ? 4 : 0)),
    target: boss ? 0.15 : hard ? 0.3 : Math.max(0.42, 0.75 - 0.25 * (inCh / 29)),
    zamyad: 0.14, bus: 0.07, cones: Math.floor(r() * 2),
  };
  if (r() < 0.35) spec.cover = 0.2 + r() * 0.15;
  if (r() < 0.3) spec.broken = 1;
  if (r() < 0.25) spec.vip = 1;
  if (r() < 0.3) spec.bikes = 1 + Math.floor(r() * 2);
  const rule = r();
  if (rule < 0.2) spec.oddEven = 3; else if (rule < 0.38) spec.officer = true; else if (rule < 0.55) spec.carts = 1;
  if (n === 152) Object.assign(spec, { wedding: 1, intro: 'wedding', oddEven: undefined, officer: undefined, carts: undefined, vip: undefined, cover: undefined, broken: undefined });
  else if (n > 152 && r() < 0.6) spec.wedding = 1 + (r() < 0.3 ? 1 : 0);
  if (boss) Object.assign(spec, { cover: 0.3, broken: 1, vip: 1, wedding: 2, bikes: 1 });
  if (hard) spec.tag = 'hard';
  if (boss) spec.tag = 'boss';
  SPECS.push(spec);
}

// `--from N` keeps the first N levels as they are and only generates the rest.
const fromArg = process.argv.indexOf('--from');
const keepN = fromArg > 0 ? Number(process.argv[fromArg + 1]) : 0;
const out: Level[] = keepN ? (JSON.parse(readFileSync(new URL('../src/game/levels.json', import.meta.url), 'utf8')) as Level[]).slice(0, keepN) : [];
SPECS.forEach((spec0, n) => {
  if (n < keepN) return;
  let best: { level: Level; err: number; rates: { random: number; greedy: number }; seed: number } | null = null;
  // If the target is far off, ease the queue mixing (or tighten it) and search again.
  for (let attempt = 0; attempt < 4 && (!best || best.err > 0.12); attempt++) {
  const tooHard = best ? best.rates.greedy < spec0.target : false;
  const spec = { ...spec0, mix: Math.max(0, spec0.mix + (attempt === 0 ? 0 : tooHard ? -3 * attempt : 3 * attempt)) };
  for (let seed = 1; seed <= 400; seed++) {
    const level = generate(spec, (n + 1) * 10007 + seed + attempt * 100003);
    if (!level) continue;
    if (!solve(level).solvable) continue;
    const cells = level.vehicles.reduce((a, v) => a + KIND[v.kind].len, 0);
    const density = cells / (spec.w * spec.h * spec.fill);
    if (density < 0.8) continue;
    const rates = playRates(level, 160, seed);
    const err = Math.abs(rates.greedy - spec.target) + (1 - Math.min(1, density)) * 0.5;
    if (!best || err < best.err) best = { level, err, rates, seed };
    if (err < 0.03) break;
  }
  }
  const spec = spec0;
  if (!best) throw new Error(`no level for spec ${n + 1}`);
  out.push(best.level);
  console.log(`L${n + 1} ${spec.w}x${spec.h} vehicles=${best.level.vehicles.length} passengers=${best.level.queue.length} greedy=${best.rates.greedy.toFixed(2)} random=${best.rates.random.toFixed(2)} (target ${spec.target})${spec.tag ? ' ' + spec.tag : ''}`);
});
writeFileSync(new URL('../src/game/levels.json', import.meta.url), JSON.stringify(out));
console.log('wrote', out.length, 'levels');
