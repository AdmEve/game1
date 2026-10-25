// Balance report: plays many random lives and prints distributions.
import '../src/content';
import { playLife } from '../tests/bot';
import { money } from '../src/engine/fmt';
import { netWorth } from '../src/engine/wealth';

const N = +(process.argv[2] ?? 400);
const causes: Record<string, number> = {};
const ages: number[] = [];
const healthAt: Record<number, number[]> = {};
let married = 0, uni = 0, emig = 0, prison = 0, jobs = 0;
const nets: number[] = [];
const ranks: number[] = [];
const jail: Record<string, number> = {};
const achs: Record<string, number> = {};
for (let s = 1; s <= N; s++) {
  const L = playLife(s * 104729);
  ages.push(L.age);
  causes[L.dead!.cause] = (causes[L.dead!.cause] ?? 0) + 1;
  if (L.flags.married) married++;
  if (L.edu.degrees.length > 1) uni++;
  if (L.flags.emigrated) emig++;
  if (L.ach.includes('prison')) prison++;
  for (const k of Object.keys(L.flags)) if (k.startsWith('jail:')) jail[k] = (jail[k] ?? 0) + 1;
  for (const a of L.ach) achs[a] = (achs[a] ?? 0) + 1;
  if (L.career.length) jobs++;
  nets.push(netWorth(L) / L.econ.price);
  if (L.edu.konkur) ranks.push(L.edu.konkur.rank);
}
ages.sort((a, b) => a - b);
const q = (arr: number[], p: number) => arr[Math.floor(arr.length * p)];
console.log('age: avg', (ages.reduce((a, b) => a + b, 0) / N).toFixed(1), 'p10', q(ages, 0.1), 'p50', q(ages, 0.5), 'p90', q(ages, 0.9));
console.log('causes', Object.entries(causes).sort((a, b) => b[1] - a[1]));
console.log({ married, uni, emig, prison, jobs });
nets.sort((a, b) => a - b);
console.log('real net worth (1405 toman): p10', money(q(nets, 0.1)), 'p50', money(q(nets, 0.5)), 'p90', money(q(nets, 0.9)));
ranks.sort((a, b) => a - b);
console.log('konkur rank p10', q(ranks, 0.1), 'p50', q(ranks, 0.5));
console.log('jail', jail);
console.log('achievements', Object.entries(achs).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(' '));
void healthAt;
