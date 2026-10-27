/** Writes src/game/levels.pack.json (the compact form the app loads) from src/game/levels.json. */
import { readFileSync, writeFileSync } from 'node:fs';
import { packLevel, unpackLevel } from '../src/game/pack';
import type { Level } from '../src/game/rules';

const levels = JSON.parse(readFileSync(new URL('../src/game/levels.json', import.meta.url), 'utf8')) as Level[];
const packed = levels.map(packLevel);
// Round-trip check: the app must get exactly the levels the tests verified.
const canon = (x: unknown): string => (Array.isArray(x) ? `[${x.map(canon).join(',')}]` : x && typeof x === 'object' ? `{${Object.keys(x).sort().map((k) => `${k}:${canon((x as Record<string, unknown>)[k])}`).join(',')}}` : JSON.stringify(x));
packed.forEach((p, i) => { if (canon(unpackLevel(p)) !== canon(levels[i])) throw new Error(`level ${i + 1} does not round-trip:\n${canon(unpackLevel(p))}\n${canon(levels[i])}`); });
writeFileSync(new URL('../src/game/levels.pack.json', import.meta.url), JSON.stringify(packed));
console.log('packed', levels.length, 'levels:', JSON.stringify(packed).length, 'bytes');
