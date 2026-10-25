import { CITIES, cityById, countryById } from '../content/cities';
import { FEMALE, LAST, MALE } from '../content/names';
import { money } from './fmt';
import { Rng } from './rng';
import type { Gender, Life, LogLine, Npc, RelKind, StatKey } from './types';
import { STAT_KEYS } from './types';
import { netWorth } from './wealth';

export const clamp = (x: number, a = 0, b = 100) => Math.max(a, Math.min(b, x));

export type Deltas = Partial<Record<StatKey | 'money', number>>;

/**
 * The helper every event and action works through. It wraps the life and its RNG and records
 * what changed so the UI can show stat chips after a choice.
 */
export class Ctx {
  rng: Rng;
  deltas: Deltas = {};
  /** Text lines added to this year's log (besides the outcome itself). */
  extra: LogLine[] = [];

  constructor(public L: Life, public p: Record<string, unknown> = {}) {
    this.rng = new Rng(L.rng);
  }

  /** Write the RNG state back into the life. Call after every use. */
  commit() {
    this.L.rng = this.rng.state;
  }

  // ───────── who ─────────
  get age() { return this.L.age; }
  get male() { return this.L.gender === 'm'; }
  get female() { return this.L.gender === 'f'; }
  get name() { return this.L.first; }
  get fullName() { return `${this.L.first} ${this.L.last}`; }
  get abroad() { return this.L.country !== 'ir'; }
  get city() { return cityById(this.L.city); }
  get country() { return countryById(this.L.country); }
  /** «پسر» / «دختر» style gendered text. */
  g(m: string, f: string) { return this.male ? m : f; }
  trait(id: string) { return this.L.traits.includes(id); }

  // ───────── stats ─────────
  s(k: StatKey) { return this.L.stats[k]; }
  stat(k: StatKey, d: number) {
    const before = this.L.stats[k];
    // Gains get harder near the top (except happiness).
    if (d > 0 && k !== 'happy') d *= clamp((108 - before) / 60, 0.12, 1);
    this.L.stats[k] = clamp(Math.round(before + d));
    const real = this.L.stats[k] - before;
    if (real) this.deltas[k] = (this.deltas[k] ?? 0) + real;
    return this;
  }
  happy(d: number) { return this.stat('happy', d); }
  health(d: number) { return this.stat('health', d); }
  smarts(d: number) { return this.stat('smarts', d); }
  looks(d: number) { return this.stat('looks', d); }
  rep(d: number) { return this.stat('rep', d); }

  get luck() { return this.L.luck; }

  // ───────── money ─────────
  get cash() { return this.L.money; }
  /** Add (or take) toman. */
  money(d: number) {
    d = Math.round(d);
    this.L.money += d;
    if (d) this.deltas.money = (this.deltas.money ?? 0) + d;
    return this;
  }
  /** Scale a 1405 toman amount to this year's prices. */
  price(x1405: number) { return Math.round(x1405 * this.L.econ.price); }
  /** Monthly minimum wage this year. */
  get wage() { return this.L.econ.wage; }
  m(x: number) { return money(x); }
  canPay(x: number) { return this.L.money >= x; }

  // ───────── luck ─────────
  chance(p: number) { return this.rng.chance(p); }
  /** Chance nudged by the luck stat (luck 50 = neutral). */
  lucky(p: number) { return this.rng.chance(clamp(p * (0.6 + this.L.luck / 62.5), 0, 0.98)); }
  int(a: number, b: number) { return this.rng.int(a, b); }
  pick<T>(arr: readonly T[]): T { return this.rng.pick(arr); }
  r() { return this.rng.next(); }

  // ───────── flags ─────────
  has(f: string) { return f in this.L.flags; }
  flag(f: string, v = this.L.year) { this.L.flags[f] = v; return this; }
  unflag(f: string) { delete this.L.flags[f]; return this; }
  count(f: string) { return this.L.flags[f] ?? 0; }
  inc(f: string, d = 1) { this.L.flags[f] = (this.L.flags[f] ?? 0) + d; return this.L.flags[f]; }
  /** Years since a flag was set to a year. */
  since(f: string) { return f in this.L.flags ? this.L.year - this.L.flags[f] : Infinity; }

  // ───────── people ─────────
  rel(r: RelKind): Npc | undefined { return this.L.people.find((p) => p.rel === r && p.alive); }
  rels(...r: RelKind[]): Npc[] { return this.L.people.filter((p) => r.includes(p.rel) && p.alive); }
  get spouse() { return this.rel('spouse'); }
  get kids() { return this.rels('child'); }
  get parents() { return this.rels('father', 'mother'); }
  ageOf(n: Npc) { return this.L.year - n.born; }
  close(n: Npc, d: number) { n.close = clamp(n.close + d); return this; }

  randomFirst(g: Gender) { return this.pick(g === 'm' ? MALE : FEMALE); }
  randomLast() { return this.pick(LAST); }

  addPerson(o: Partial<Npc> & { rel: RelKind; gender: Gender; born: number }): Npc {
    const n: Npc = {
      id: this.L.nextId++,
      first: o.first ?? this.randomFirst(o.gender),
      last: o.last ?? this.randomLast(),
      close: 60,
      alive: true,
      looks: this.int(20, 90),
      smarts: this.int(20, 90),
      ...o,
    };
    this.L.people.push(n);
    return n;
  }

  /** «مامانت»، «بابات» style labels. */
  relName(n: Npc): string {
    switch (n.rel) {
      case 'father': return 'بابات';
      case 'mother': return 'مامانت';
      case 'brother': return `داداشت ${n.first}`;
      case 'sister': return `آبجیت ${n.first}`;
      case 'grandpa': return n.side === 'p' ? 'آقاجون (بابای بابات)' : 'آقاجون (بابای مامانت)';
      case 'grandma': return n.side === 'p' ? 'مادرجون (مامان بابات)' : 'مادرجون (مامان مامانت)';
      case 'spouse': return `${n.gender === 'f' ? 'خانومت' : 'آقاتون'} ${n.first}`;
      case 'fiance': return `نامزدت ${n.first}`;
      case 'child': return `${n.gender === 'm' ? 'پسرت' : 'دخترت'} ${n.first}`;
      case 'friend': return `رفیقت ${n.first}`;
      case 'crush': return n.first;
      case 'ex': return `${n.first} (سابق)`;
      default: return n.first;
    }
  }

  // ───────── log & queue ─────────
  line(t: string, k?: LogLine['k']) { this.extra.push({ t, k }); return this; }
  queue(id: string, p?: Record<string, unknown>) { this.L.queue.push({ id, p }); return this; }

  // ───────── misc ─────────
  get net() { return netWorth(this.L); }
  randomCity() { return this.rng.weighted(CITIES, (c) => c.w)!; }
}

export function statKeys() { return STAT_KEYS; }

