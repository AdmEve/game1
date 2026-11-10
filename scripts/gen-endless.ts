/**
 * «تهران بی‌پایان» (C10): the endless levels after the Journey, made like the Journey's: generated (src/game/endless.ts
 * spec, each place's own rules) and then hardened offline (src/game/harden.ts) to the last chapter's depth, where an
 * attentive player loses ~99%. Written packed to src/game/endless.pack.json, which the game loads only when Endless
 * Tehran is played. Beyond the pack the game generates (unhardened) at run time.
 *   npx vite-node scripts/gen-endless.ts --part 0 --of 4 --out /tmp/end-0.json   (run the parts in parallel)
 *   npx vite-node scripts/gen-endless.ts --merge /tmp/end-0.json /tmp/end-1.json ...
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { generateEndless } from '../src/game/endless';
import { harden } from '../src/game/harden';
import { packLevel, unpackLevel } from '../src/game/pack';
import type { Level } from '../src/game/rules';
import { solve } from '../src/game/solver';

const COUNT = 240;
const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };

if (process.argv.includes('--merge')) {
  const parts = process.argv.slice(process.argv.indexOf('--merge') + 1);
  const all: Level[] = [];
  for (const p of parts) for (const [i, l] of Object.entries(JSON.parse(readFileSync(p, 'utf8')) as Record<string, Level>)) all[+i] = l;
  for (let i = 0; i < COUNT; i++) if (!all[i]) throw new Error(`endless level ${i} missing`);
  const packed = all.map(packLevel);
  // Round-trip check, as pack-levels.ts does: the game must get exactly the levels made here.
  const canon = (x: unknown): string => (Array.isArray(x) ? `[${x.map(canon).join(',')}]` : x && typeof x === 'object' ? `{${Object.keys(x).sort().map((k) => `${k}:${canon((x as Record<string, unknown>)[k])}`).join(',')}}` : JSON.stringify(x));
  packed.forEach((s, i) => { if (canon(unpackLevel(s)) !== canon(all[i])) throw new Error(`endless ${i} does not round-trip:\n${canon(unpackLevel(s))}\n${canon(all[i])}`); });
  writeFileSync(new URL('../src/game/endless.pack.json', import.meta.url), JSON.stringify(packed));
  console.log('packed', packed.length, 'endless levels:', JSON.stringify(packed).length, 'bytes');
} else {
  const part = +(arg('--part') ?? 0), of = +(arg('--of') ?? 1), outFile = arg('--out')!;
  // Resumable: levels already in the part's file are kept.
  let res: Record<number, Level> = {};
  try { res = JSON.parse(readFileSync(outFile, 'utf8')); } catch { /* a new part */ }
  for (let i = part; i < COUNT; i += of) {
    if (res[i]) continue;
    const t = Date.now();
    const l = generateEndless(i);
    if (!l) throw new Error(`endless ${i}: nothing generated`);
    const h = harden(l, 9001 + i * 31, { goal: l.tag === 'hard' ? 9_000 : 5_000, ms: 20_000, iterations: 6000 });
    if (!solve(h.level, 400_000).solvable) throw new Error(`endless ${i}: hardened level not solvable`);
    res[i] = h.level;
    writeFileSync(outFile, JSON.stringify(res));
    console.log(`endless ${i + 241}: ${h.nodes} nodes, ${((Date.now() - t) / 1000).toFixed(1)} s`);
  }
}
