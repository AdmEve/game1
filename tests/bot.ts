import '../src/content';
import { actionOptions, actionsFor, choose, currentEvent, nextYear, personActs, runAction, runPersonAct } from '../src/engine/play';
import { newLife } from '../src/engine/life';
import { Rng } from '../src/engine/rng';
import { STAT_KEYS, type Life } from '../src/engine/types';

const BAD = /undefined|NaN|\[object|Infinity/;

function checkText(s: string, where: string) {
  if (BAD.test(s)) throw new Error(`bad text in ${where}: ${s}`);
}

/** Play a whole life with random choices and random actions. */
export function playLife(seed: number, opts: { actions?: number } = {}): Life {
  const r = new Rng(seed);
  const L = newLife({ seed });
  let guard = 0;
  while (!L.dead && guard++ < 130) {
    nextYear(L);
    for (let i = 0; i < 12 && !L.dead; i++) {
      const ev = currentEvent(L);
      if (!ev) break;
      checkText(ev.text + ev.title + ev.choices.map((c) => c.label + (c.note ?? '')).join(), ev.id);
      const ok = ev.choices.map((c, idx) => ({ c, idx })).filter((x) => !x.c.off && !x.c.gems);
      const pick = ok.length ? r.pick(ok).idx : 0;
      const out = choose(L, pick);
      checkText(out.text, `${ev.id} outcome`);
    }
    const n = opts.actions ?? 3;
    for (let i = 0; i < n && !L.dead; i++) {
      const acts = actionsFor(L).filter((a) => !a.off && !a.def.gems && a.def.id !== 'quit' && a.def.id !== 'divorce');
      if (!acts.length) break;
      const a = r.pick(acts);
      let opt;
      if (a.def.options) {
        const os = actionOptions(L, a.def.id).filter((o) => !o.off && !o.gems);
        if (!os.length) continue;
        opt = r.pick(os);
      }
      const out = runAction(L, a.def.id, opt);
      checkText(out.text, `action ${a.def.id}`);
      // Answer whatever the action queued.
      for (let k = 0; k < 6 && !L.dead; k++) {
        const ev = currentEvent(L);
        if (!ev) break;
        const ok = ev.choices.map((c, idx) => ({ c, idx })).filter((x) => !x.c.off && !x.c.gems);
        choose(L, ok.length ? r.pick(ok).idx : 0);
      }
    }
    // Person interactions.
    const people = L.people.filter((p) => p.alive);
    if (people.length && !L.dead && r.chance(0.5)) {
      const p = r.pick(people);
      const acts = personActs(L, p.id).filter((a) => !a.off);
      if (acts.length) checkText(runPersonAct(L, p.id, r.pick(acts).def.id).text, 'person act');
    }
    for (const k of STAT_KEYS) if (!(L.stats[k] >= 0 && L.stats[k] <= 100)) throw new Error(`stat ${k} out of range: ${L.stats[k]}`);
    if (!Number.isFinite(L.money)) throw new Error('money is not finite');
  }
  for (const y of L.log) for (const line of y.lines) checkText(line.t, `log age ${y.age}`);
  return L;
}

