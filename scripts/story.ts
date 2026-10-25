// Prints one life's full log as a player would read it (choices picked at random).
import '../src/content';
import { newLife } from '../src/engine/life';
import { actionOptions, actionsFor, choose, currentEvent, nextYear, runAction } from '../src/engine/play';
import { Rng } from '../src/engine/rng';

const seed = +(process.argv[2] ?? 7);
const acts = +(process.argv[3] ?? 2);
const r = new Rng(seed * 31);
const L = newLife({ seed });
const out: string[] = [];
let guard = 0;
while (!L.dead && guard++ < 120) {
  nextYear(L);
  // This year's questions, printed after the year's log.
  const asked: string[] = [];
  for (let i = 0; i < 10; i++) {
    const ev = currentEvent(L);
    if (!ev) break;
    const ok = ev.choices.map((c, idx) => ({ c, idx })).filter((x) => !x.c.off && !x.c.gems);
    const idx = ok.length ? r.pick(ok).idx : 0;
    asked.push(`   ❓ [${ev.title || ev.id}] ${ev.text.replace(/\n/g, ' ')} → «${ev.choices[idx]?.label}»`);
    choose(L, idx);
  }
  for (let i = 0; i < acts && !L.dead; i++) {
    const list = actionsFor(L).filter((a) => !a.off && !a.def.gems && !['quit', 'divorce', 'dropout'].includes(a.def.id));
    if (!list.length) break;
    const a = r.pick(list);
    let opt;
    if (a.def.options) { const os = actionOptions(L, a.def.id).filter((o) => !o.off && !o.gems); if (!os.length) continue; opt = r.pick(os); }
    runAction(L, a.def.id, opt);
    for (let k = 0; k < 6; k++) { const ev = currentEvent(L); if (!ev) break; const ok = ev.choices.map((c, idx) => ({ c, idx })).filter((x) => !x.c.off && !x.c.gems); choose(L, ok.length ? r.pick(ok).idx : 0); }
  }
  const y = L.log[L.log.length - 1];
  out.push(`— ${y.age} (${y.year}) —`);
  for (const l of y.lines) out.push('  ' + l.t.replace(/\n/g, ' '));
  out.push(...asked);
}
console.log(`${L.first} ${L.last} (${L.gender}) born ${L.city}`);
console.log(out.join('\n'));
