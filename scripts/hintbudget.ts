// Does the in-game hint (the solver in a worker, 60,000 nodes) find a move where players need it? For levels from 9
// on (the chess-level ones), it tries the start and mid-game positions: the solution followed part way, then one
// legal move that may be a mistake. Each position is classed as: hint found / lost (no win from here, even with a
// big search: «start over» is the right answer) / missed (winnable, but the hint's budget ran out first).
//   npx vite-node scripts/hintbudget.ts [step=4] [samples=6]
import PACKED from '../src/game/levels.pack.json';
import { unpackLevel } from '../src/game/pack';
import { addBay, cloneState, startState, tap, type State } from '../src/game/rules';
import { moves, solve } from '../src/game/solver';

const HINT = 60_000, BIG = 1_000_000;
const step = Number(process.argv[2] ?? 4), samples = Number(process.argv[3] ?? 6);
const levels = (PACKED as unknown as unknown[]).map((x) => unpackLevel(x as never));
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const tally = { found: 0, lost: 0, missed: 0, unknown: 0, bay: 0 };
const missed: string[] = [];
let worstFound = 0;
const classify = (lv: number, s: State, label: string) => {
  const r = solve(s.level, HINT, cloneState(s));
  if (r.solvable) { tally.found++; worstFound = Math.max(worstFound, r.nodes); return; }
  const big = solve(s.level, BIG, cloneState(s));
  if (big.solvable) { tally.missed++; missed.push(`L${lv + 1} ${label}: needs ${big.nodes} nodes`); }
  else if (big.nodes >= BIG) tally.unknown++;
  else {
    tally.lost++;
    // Would one more parking bay (the help, or the lose card's continue) still win it?
    if (s.bays.length < 6) { const t = cloneState(s); addBay(t); if (solve(t.level, HINT, t).solvable) tally.bay++; }
  }
};
const t0 = Date.now();
for (let i = 8; i < levels.length; i += step) {
  const L = levels[i], sol = solve(L, BIG).solution;
  classify(i, startState(L), 'start');
  for (let k = 0; k < samples && sol.length > 2; k++) {
    const s = startState(L), upto = 1 + Math.floor(rnd() * (sol.length - 2));
    for (let j = 0; j < upto; j++) tap(s, sol[j]);
    if (s.over) continue;
    const ms = moves(s); if (!ms.length) continue;
    tap(s, ms[Math.floor(rnd() * ms.length)]);
    if (s.over === 'lost') { tally.lost++; if (s.bays.length < 6) { const t = cloneState(s); addBay(t); if (solve(t.level, HINT, t).solvable) tally.bay++; } continue; }
    if (s.over) continue;
    classify(i, s, `after ${upto} right + 1 random`);
  }
}
const n = tally.found + tally.lost + tally.missed + tally.unknown;
console.log(`positions ${n}: hint found ${tally.found}, lost ${tally.lost} (of which one more bay wins ${tally.bay}), missed (winnable, budget ran out) ${tally.missed}, unknown (over ${BIG}) ${tally.unknown}`);
console.log(`the hardest position the hint did solve took ${worstFound} nodes of ${HINT}; ${((Date.now() - t0) / 1000).toFixed(0)} s`);
for (const m of missed.slice(0, 15)) console.log('  missed:', m);
