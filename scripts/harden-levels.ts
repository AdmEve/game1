/**
 * Makes the Journey levels deeper puzzles (see src/game/harden.ts).
 *   npx vite-node scripts/harden-levels.ts --part 0 --of 4 --out /tmp/hard-0.json   (run the parts in parallel)
 *   npx vite-node scripts/harden-levels.ts --merge /tmp/hard-0.json /tmp/hard-1.json ...
 * then `challenges.ts` and `pack-levels.ts`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { harden } from '../src/game/harden';
import type { Level } from '../src/game/rules';

const file = new URL('../src/game/levels.json', import.meta.url);
const levels = JSON.parse(readFileSync(file, 'utf8')) as Level[];
const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };

if (process.argv.includes('--merge')) {
  const parts = process.argv.slice(process.argv.indexOf('--merge') + 1);
  const out = levels.slice();
  for (const p of parts) for (const [n, l] of Object.entries(JSON.parse(readFileSync(p, 'utf8')) as Record<string, Level>)) out[+n - 1] = l;
  writeFileSync(file, JSON.stringify(out));
  console.log('merged', parts.length, 'parts');
} else {
  const part = +(arg('--part') ?? 0), of = +(arg('--of') ?? 1), outFile = arg('--out')!;
  const res: Record<number, Level> = {};
  levels.forEach((l, i) => {
    const n = i + 1;
    if (n <= 8 || i % of !== part) return;
    // Nodes the obvious-move solver has to explore: more means more traps. Capped so the test suite stays quick.
    const goal = l.tag === 'boss' ? 15_000 : l.tag === 'hard' ? 9_000 : n <= 30 ? 150 : n <= 90 ? 1_500 : 5_000;
    const t = Date.now();
    const h = harden(l, n * 31, { goal, ms: 25_000, iterations: 6000 });
    res[n] = h.level;
    console.log(`L${n} nodes=${h.nodes} goal=${goal} ${Date.now() - t}ms`);
    writeFileSync(outFile, JSON.stringify(res));
  });
}
