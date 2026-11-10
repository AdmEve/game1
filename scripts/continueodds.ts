// Is the lose card's paid continue («یه جای پارک دیگه», 300 coins or a video) worth buying? Simulated players (the
// casual and attentive ones of scripts/difficulty.ts) play levels 9+ until the bays fill; then one bay is added, as
// the continue does, and the solver says whether the level can still be won from there.
//   npx vite-node scripts/continueodds.ts [step=3] [runs=6]
import PACKED from '../src/game/levels.pack.json';
import { unpackLevel } from '../src/game/pack';
import { addBay, canExit, cloneState, startState, tap, type Level, type State } from '../src/game/rules';
import { solve } from '../src/game/solver';

const step = Number(process.argv[2] ?? 3), runs = Number(process.argv[3] ?? 6);
const levels = (PACKED as unknown as unknown[]).map((x) => unpackLevel(x as never));
let seed = 11; const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

/** Play until the level ends; the state at a loss on full bays, or null (won, or lost to a clock or tap budget). */
function playToLoss(level: Level, skill: number, careless: number): State | null {
  const s: State = startState(level);
  for (let t = 0; t < 400 && !s.over; t++) {
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
  return s.over === 'lost' && s.bays.every(Boolean) ? s : null;
}

const out = { losses: 0, saved: 0, hopeless: 0, maxed: 0 };
const byChapter = new Map<number, { losses: number; saved: number }>();
for (let i = 8; i < levels.length; i += step) {
  const L = levels[i];
  if (L.moves || L.time) continue; // limits lose on their own counters; this is about bays
  for (const [skill, careless] of [[0.75, 0.1], [0.95, 0.02]] as const) for (let r = 0; r < runs; r++) {
    const s = playToLoss(L, skill, careless);
    if (!s) continue;
    out.losses++;
    const ch = Math.floor(i / 30) + 1, c = byChapter.get(ch) ?? { losses: 0, saved: 0 }; c.losses++;
    if (s.bays.length >= 6) { out.maxed++; byChapter.set(ch, c); continue; }
    const t = cloneState(s); addBay(t);
    if (solve(t.level, 400_000, t).solvable) { out.saved++; c.saved++; } else out.hopeless++;
    byChapter.set(ch, c);
  }
}
const pct = (a: number, b: number) => `${b ? Math.round((a / b) * 100) : 0}%`;
console.log(`losses on full bays: ${out.losses}; one more bay wins ${out.saved} (${pct(out.saved, out.losses)}), still lost ${out.hopeless} (${pct(out.hopeless, out.losses)}), already 6 bays ${out.maxed}`);
for (const [ch, c] of [...byChapter].sort((a, b) => a[0] - b[0])) console.log(`  chapter ${ch}: ${c.losses} losses, continue wins ${pct(c.saved, c.losses)}`);
