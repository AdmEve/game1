import { deathAchievements, checkAchievements } from './achieve';
import { Ctx, type Deltas } from './ctx';
import { money } from './fmt';
import { newLife } from './life';
import { ACTIONS, EVENTS, PERSON_ACTS, txt, type ActionDef, type ActionOption, type PersonActDef } from './registry';
import type { Life, Npc } from './types';
import { netWorth } from './wealth';
import { ageUp, die } from './year';

export interface ChoiceView {
  label: string;
  note?: string;
  /** Why it can't be picked (not enough money…). */
  off?: string;
  cost?: number;
  gems?: number;
}

export interface EventView {
  id: string;
  emoji: string;
  title: string;
  text: string;
  choices: ChoiceView[];
  /** A passive notice: one «باشه» button. */
  notice?: boolean;
  deltas?: Deltas;
}

export interface Outcome {
  emoji?: string;
  title?: string;
  text: string;
  deltas: Deltas;
  died?: boolean;
}

function logOutcome(c: Ctx, t: string, emoji?: string) {
  const L = c.L;
  const last = L.log[L.log.length - 1];
  if (!last) return;
  const line = emoji && !t.startsWith(emoji) ? `${emoji} ${t}` : t;
  last.lines.push({ t: line }, ...c.extra);
  c.extra = [];
}

/** Advance one year. */
export function nextYear(L: Life) {
  ageUp(L);
  if (L.dead) finishDeath(L);
}

/** The event waiting to be shown, if any. */
export function currentEvent(L: Life): EventView | null {
  const q = L.queue[0];
  if (!q) return null;
  if (q.id === '_notice') {
    const p = q.p as { emoji: string; title: string; text: string; d?: Deltas };
    return { id: q.id, emoji: p.emoji, title: p.title, text: p.text, choices: [{ label: 'باشه' }], notice: true, deltas: p.d };
  }
  const e = EVENTS.get(q.id);
  if (!e) {
    L.queue.shift();
    return currentEvent(L);
  }
  // Queued milestones prepare their parameters the first time they are shown.
  if (e.prep && !q.p?._prep) {
    const pc = new Ctx(L, q.p ?? {});
    const params = e.prep(pc);
    pc.commit();
    if (!params) {
      L.queue.shift();
      return currentEvent(L);
    }
    q.p = { ...(q.p ?? {}), ...params, _prep: 1 };
  }
  const c = new Ctx(L, q.p ?? {});
  // An earlier event this year may have changed things (lost the job, divorced…).
  if (e.when && !e.when(c)) {
    L.queue.shift();
    return currentEvent(L);
  }
  const choices: ChoiceView[] = [];
  for (const ch of e.dyn ? e.dyn(c) : e.choices ?? []) {
    if (ch.when && !ch.when(c)) continue;
    const cost = ch.cost?.(c);
    choices.push({
      label: txt(ch.label, c),
      note: ch.note ? txt(ch.note, c) : undefined,
      cost,
      gems: ch.gems,
      off: cost !== undefined && cost > L.money ? 'پول کافی نداری' : undefined,
    });
  }
  if (!choices.length) choices.push({ label: 'باشه' });
  return { id: e.id, emoji: txt(e.emoji, c), title: txt(e.title, c), text: txt(e.text, c), choices };
}

/** Pick a choice of the current event (index into the visible choices). */
export function choose(L: Life, idx: number): Outcome {
  const q = L.queue.shift();
  if (!q) return { text: '', deltas: {} };
  if (q.id === '_notice') return { text: '', deltas: {} };
  const e = EVENTS.get(q.id)!;
  const c = new Ctx(L, q.p ?? {});
  const visible = (e.dyn ? e.dyn(c) : e.choices ?? []).filter((ch) => !ch.when || ch.when(c));
  const ch = visible[idx];
  let text = '';
  if (ch) {
    const cost = ch.cost?.(c);
    if (cost) c.money(-cost);
    text = ch.do(c);
  }
  const emoji = txt(e.emoji, c);
  if (text) logOutcome(c, text, emoji);
  else if (c.extra.length) logOutcome(c, '', undefined);
  checkAchievements(c);
  c.commit();
  if (L.dead) finishDeath(L);
  return { emoji, title: txt(e.title, c), text, deltas: c.deltas, died: !!L.dead };
}

export interface ActionView {
  def: ActionDef;
  label: string;
  desc: string;
  off: string | false;
  left: number;
}

export function actionsFor(L: Life, group?: string): ActionView[] {
  const c = new Ctx(L);
  const out: ActionView[] = [];
  for (const a of ACTIONS) {
    if (group && a.group !== group) continue;
    if (L.dead || !a.when(c)) continue;
    const limit = a.limit ?? 1;
    const used = L.used[a.id] ?? 0;
    let off: string | false = a.off ? a.off(c) : false;
    if (!off && used >= limit) off = 'امسال دیگه نمی‌شه';
    const cost = a.cost?.(c);
    if (!off && cost && cost > L.money) off = 'پول کافی نداری';
    if (!off && L.queue.length) off = 'اول اتفاق‌های امسال رو جواب بده';
    out.push({ def: a, label: txt(a.label, c), desc: txt(a.desc, c), off, left: limit - used });
  }
  return out;
}

export function actionOptions(L: Life, id: string): ActionOption[] {
  const a = ACTIONS.find((x) => x.id === id);
  if (!a?.options) return [];
  const c = new Ctx(L);
  return a.options(c).map((o) => ({ ...o, off: o.off ?? (o.cost && o.cost > L.money ? 'پول کافی نداری' : undefined) }));
}

export function runAction(L: Life, id: string, opt?: ActionOption): Outcome {
  const a = ACTIONS.find((x) => x.id === id)!;
  const c = new Ctx(L);
  L.used[id] = (L.used[id] ?? 0) + 1;
  const cost = opt?.cost ?? a.cost?.(c);
  if (cost) c.money(-cost);
  const text = a.do(c, opt);
  const emoji = opt?.emoji ?? a.emoji;
  if (text) logOutcome(c, text, emoji);
  checkAchievements(c);
  c.commit();
  if (L.dead) finishDeath(L);
  return { emoji, title: txt(a.label, c), text, deltas: c.deltas, died: !!L.dead };
}

/** Kill the character from outside the year loop (e.g. a test or a choice). */
export function killNow(L: Life, cause: string) {
  const c = new Ctx(L);
  die(c, cause);
  logOutcome(c, '', undefined);
  c.commit();
  finishDeath(L);
}

function finishDeath(L: Life) {
  const c = new Ctx(L);
  deathAchievements(c);
  logOutcome(c, '', undefined);
  c.commit();
}

/** Undo death («ماشین زمان»): back to life with some health. */
export function revive(L: Life) {
  if (!L.dead) return;
  L.dead = undefined;
  L.revived++;
  L.stats.health = Math.max(L.stats.health, 45);
  L.ills = L.ills.map((i) => ({ ...i, severity: Math.min(i.severity, 30) }));
  const last = L.log[L.log.length - 1];
  last?.lines.push({ t: '⏳ با ماشین زمان برگشتی! یه فرصت دوباره.', k: 'big' });
}

/** Children who can carry the family on. */
export function heirs(L: Life): Npc[] {
  return L.people.filter((p) => p.rel === 'child' && p.alive);
}

/** Start the next generation as one of the children. */
export function continueAs(L: Life, childId: number): Life {
  const child = L.people.find((p) => p.id === childId)!;
  const kids = heirs(L);
  const estate = Math.max(0, netWorth(L));
  const share = Math.round(estate / Math.max(1, kids.length + (L.people.some((p) => p.rel === 'spouse' && p.alive) ? 1 : 0)));
  const age = L.year - child.born;
  const people: Npc[] = [];
  const me: Npc = { id: 0, first: L.first, last: L.last, gender: L.gender, born: L.born, rel: L.gender === 'm' ? 'father' : 'mother', close: child.close, alive: false, died: L.year, rich: 2 };
  people.push(me);
  const spouse = L.people.find((p) => p.rel === 'spouse');
  if (spouse) people.push({ ...spouse, rel: spouse.gender === 'm' ? 'father' : 'mother' });
  for (const k of kids) if (k.id !== childId) people.push({ ...k, rel: k.gender === 'm' ? 'brother' : 'sister' });
  for (const p of L.people) if (p.rel === 'friend' && p.alive && Math.abs(p.born - child.born) < 8) people.push(p);

  const rich = estate / L.econ.price > 50e9 ? 4 : estate / L.econ.price > 10e9 ? 3 : estate / L.econ.price > 2e9 ? 2 : estate > 0 ? 1 : 0;
  const N = newLife({
    gender: child.gender,
    first: child.first,
    last: child.last,
    city: L.city,
    econ: L.econ,
    year: child.born,
    gen: L.gen + 1,
    parentLife: L.id,
    people: people.map((p, i) => ({ ...p, id: i + 1 })),
    rich,
    money: share,
    stats: { smarts: child.smarts ?? 50, looks: child.looks ?? 50 },
  });
  N.age = age;
  N.year = L.year;
  N.born = child.born;
  N.log = [{ age, year: L.year, lines: [{ t: `🌱 زندگی ${N.first}، ${child.gender === 'm' ? 'پسر' : 'دختر'} ${L.first}، رو ادامه می‌دی.`, k: 'big' }] }];
  if (share > 0) N.log[0].lines.push({ t: `📜 سهم‌الارثت از ${L.first}: ${money(share)}`, k: 'good' });
  // Education/military state for the age.
  if (age >= 6 && age < 18) { N.edu.stage = 'school'; N.edu.grade = Math.min(12, age - 5); if (age >= 15) N.edu.track = 'riazi'; }
  else if (age === 5) N.edu.stage = 'pre';
  else if (age >= 18) {
    N.edu.stage = 'none';
    N.edu.degrees.push({ kind: 'diploma', major: 'riazi', uni: 'دبیرستان', tier: 0, gpa: 15 });
    if (N.gender === 'm') N.mil.status = age > 40 ? 'exempt' : 'due';
    if (age >= 25) N.home = 'rent';
  }
  return N;
}

export interface PersonActView {
  def: PersonActDef;
  label: string;
  off: string | false;
}

export function personActs(L: Life, npcId: number): PersonActView[] {
  const n = L.people.find((p) => p.id === npcId);
  if (!n || !n.alive || L.dead) return [];
  const c = new Ctx(L);
  return PERSON_ACTS.filter((a) => a.when(c, n)).map((a) => {
    let off: string | false = a.off ? a.off(c, n) : false;
    if (!off && L.used[`p:${a.id}:${n.id}`]) off = 'امسال انجامش دادی';
    const cost = a.cost?.(c, n);
    if (!off && cost && cost > L.money) off = 'پول کافی نداری';
    if (!off && L.queue.length) off = 'اول اتفاق‌های امسال رو جواب بده';
    if (!off && L.prison) off = 'تو زندانی';
    return { def: a, label: txt(a.label, c), off };
  });
}

export function runPersonAct(L: Life, npcId: number, actId: string): Outcome {
  const n = L.people.find((p) => p.id === npcId)!;
  const a = PERSON_ACTS.find((x) => x.id === actId)!;
  const c = new Ctx(L);
  L.used[`p:${a.id}:${n.id}`] = 1;
  const cost = a.cost?.(c, n);
  if (cost) c.money(-cost);
  const text = a.do(c, n);
  if (text) logOutcome(c, text, a.emoji);
  checkAchievements(c);
  c.commit();
  if (L.dead) finishDeath(L);
  return { emoji: a.emoji, title: txt(a.label, c), text, deltas: c.deltas, died: !!L.dead };
}
