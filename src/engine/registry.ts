import type { Ctx } from './ctx';
import type { Gender, Npc } from './types';

type Txt = string | ((c: Ctx) => string);

export interface ChoiceDef {
  label: Txt;
  /** Hidden when false. */
  when?: (c: Ctx) => boolean;
  /** Money needed (toman, this year's prices). The button is disabled when short. */
  cost?: (c: Ctx) => number;
  /** Costs 💎; handled by the UI before `do` runs. */
  gems?: number;
  /** Small note under the label. */
  note?: Txt;
  do: (c: Ctx) => string;
}

export interface EventDef {
  id: string;
  age?: [number, number];
  g?: Gender;
  /** 'ir' (default), 'abroad' or 'any'. */
  where?: 'ir' | 'abroad' | 'any';
  when?: (c: Ctx) => boolean;
  /** Weight in the yearly draw (default 1). */
  w?: number | ((c: Ctx) => number);
  /** Once per life (default true). */
  once?: boolean;
  /** Cooldown in years for repeatable events (default 3). */
  cd?: number;
  /** Prepare parameters (stored in the queue); return null to skip the event. */
  prep?: (c: Ctx) => Record<string, unknown> | null;
  emoji: Txt;
  title?: Txt;
  text: Txt;
  /** A bar shown under the text (e.g. how much the in-laws like you), 0..100. */
  meter?: (c: Ctx) => { label: string; v: number; d?: number };
  choices?: ChoiceDef[];
  /** Choices built from the event's parameters (konkur offers, candidates…). */
  dyn?: (c: Ctx) => ChoiceDef[];
  /** Passive event: runs immediately and returns the log text. */
  auto?: (c: Ctx) => string;
  /** Passive events show a popup only when this is true. */
  pop?: boolean;
  /** Milestones are queued by the year logic, never drawn at random. */
  milestone?: boolean;
  /** Log kind for passive events. */
  kind?: 'good' | 'bad' | 'info' | 'big';
}

export interface ActionOption {
  id: string;
  label: string;
  emoji?: string;
  desc?: string;
  /** Money cost (toman). */
  cost?: number;
  gems?: number;
  /** Disabled with this reason. */
  off?: string;
  data?: unknown;
}

export interface ActionDef {
  id: string;
  group: string;
  label: Txt;
  emoji: string;
  desc?: Txt;
  /** Visible at all. */
  when: (c: Ctx) => boolean;
  /** Return a reason string to show the action disabled. */
  off?: (c: Ctx) => string | false;
  /** Uses per year (default 1). */
  limit?: number;
  cost?: (c: Ctx) => number;
  gems?: number;
  /** Sub-menu; the chosen option is passed to `do`. */
  options?: (c: Ctx) => ActionOption[];
  /** Confirmation question before doing it. */
  confirm?: Txt;
  do: (c: Ctx, opt?: ActionOption) => string;
}

export const EVENTS = new Map<string, EventDef>();
export const ACTIONS: ActionDef[] = [];

export function defEvents(list: EventDef[]) {
  for (const e of list) {
    if (EVENTS.has(e.id)) throw new Error(`duplicate event ${e.id}`);
    EVENTS.set(e.id, e);
  }
}

export function defActions(list: ActionDef[]) {
  for (const a of list) {
    if (ACTIONS.some((x) => x.id === a.id)) throw new Error(`duplicate action ${a.id}`);
    ACTIONS.push(a);
  }
}

export function txt(t: Txt | undefined, c: Ctx): string {
  if (t === undefined) return '';
  return typeof t === 'function' ? t(c) : t;
}

/** Can this event fire for this life now? */
export function eligible(e: EventDef, c: Ctx): boolean {
  const L = c.L;
  if (e.milestone) return false;
  if (e.age && (L.age < e.age[0] || L.age > e.age[1])) return false;
  if (e.g && e.g !== L.gender) return false;
  const where = e.where ?? 'ir';
  if (where === 'ir' && L.country !== 'ir') return false;
  if (where === 'abroad' && L.country === 'ir') return false;
  const last = L.seen[e.id];
  if (last !== undefined) {
    if (e.once !== false) return false;
    if (L.year - last < (e.cd ?? 3)) return false;
  }
  if (L.prison && !e.id.startsWith('prison')) return false;
  if (e.when && !e.when(c)) return false;
  return true;
}

export function weightOf(e: EventDef, c: Ctx): number {
  if (e.w === undefined) return 1;
  return typeof e.w === 'function' ? e.w(c) : e.w;
}

export interface PersonActDef {
  id: string;
  label: Txt;
  emoji: string;
  when: (c: Ctx, n: Npc) => boolean;
  off?: (c: Ctx, n: Npc) => string | false;
  cost?: (c: Ctx, n: Npc) => number;
  do: (c: Ctx, n: Npc) => string;
}

export const PERSON_ACTS: PersonActDef[] = [];

export function defPersonActs(list: PersonActDef[]) {
  PERSON_ACTS.push(...list);
}
