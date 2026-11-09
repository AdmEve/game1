// Difficulty curve: plays each level many times with two simulated players using the real rules, and prints how
// often each loses (GDD §11 targets: normal levels 10–20%, «سخت» levels 40–55%). Neither player uses helps or a
// clock, and neither sees under a car cover. A careless tap can hit a blocked car (it counts on tap-budget levels).
//   npx vite-node scripts/difficulty.ts [from] [to] [runs]      e.g. 1 30 400
import PACKED from '../src/game/levels.pack.json';
import { unpackLevel } from '../src/game/pack';
import { addBay, canExit, startState, tap, type Level, type State } from '../src/game/rules';
import { MERCY_LEVELS } from '../src/game/helps';

const levels = (PACKED as string[]).map(unpackLevel);
const [from = 1, to = 30, runs = 400] = process.argv.slice(2).map(Number);

/** A seeded random, so runs repeat exactly. */
function rng(seed: number) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }

/**
 * One player: `skill` is how often they make a sensible pick (a free car whose colour is wanted soon: the front of
 * the queue first, then the next few), `careless` how often they tap any car in the lot.
 */
function play(level: Level, skill: number, careless: number, rand: () => number, mercy = false): 'won' | 'lost' {
  const s: State = startState(level);
  for (let t = 0; t < 400 && (!s.over || (mercy && s.over === 'lost' && s.bays.length < 6 && (addBay(s), true))); t++) {
    const inLot = s.inLot.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
    if (!inLot.length) break;
    const free = inLot.filter((i) => canExit(s, i));
    let pick: number;
    if (!free.length || rand() < careless) pick = inLot[Math.floor(rand() * inLot.length)];
    else if (rand() < skill) {
      const colour = (i: number) => (s.revealed[i] ? level.vehicles[i].color : null);
      const wanted = (k: number) => free.filter((i) => level.vehicles[i].kind === 'bike' ? k === 0 : colour(i) === s.queue[s.q + k]);
      let best: number[] = [];
      for (let k = 0; k < 4 && !best.length; k++) best = wanted(k);
      pick = (best.length ? best : free)[Math.floor(rand() * (best.length || free.length))];
    } else pick = free[Math.floor(rand() * free.length)];
    tap(s, pick);
  }
  return s.over === 'won' ? 'won' : 'lost';
}

const pct = (x: number) => `${Math.round(x * 100)}%`.padStart(4);
console.log(`level  tag    bays  limit     casual  attentive   (with Mash Rahim's bay, levels 1–${MERCY_LEVELS}: casual  attentive)`);
for (let n = from; n <= Math.min(to, levels.length); n++) {
  const lv = levels[n - 1];
  let casual = 0, careful = 0, casualM = 0, carefulM = 0;
  const mercy = n <= MERCY_LEVELS && !lv.moves && !lv.time;
  for (let r = 0; r < runs; r++) {
    if (play(lv, 0.75, 0.1, rng(n * 7919 + r)) === 'lost') casual++;
    if (play(lv, 0.95, 0.02, rng(n * 104729 + r)) === 'lost') careful++;
    if (mercy && play(lv, 0.75, 0.1, rng(n * 7919 + r), true) === 'lost') casualM++;
    if (mercy && play(lv, 0.95, 0.02, rng(n * 104729 + r), true) === 'lost') carefulM++;
  }
  const limit = lv.moves ? `${lv.moves} taps` : lv.time ? `${lv.time} s` : '';
  console.log(`${String(n).padStart(5)}  ${(lv.tag ?? '').padEnd(5)}  ${String(lv.bays ?? 5).padStart(4)}  ${limit.padEnd(8)}  ${pct(casual / runs)}     ${pct(careful / runs)}` +
    (mercy ? `                                              ${pct(casualM / runs)}     ${pct(carefulM / runs)}` : ''));
}
