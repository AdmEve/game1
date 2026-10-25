/** Player meta progress and the current life, kept in localStorage (the Android WebView keeps it). */
import { ACHS } from './engine/achieve';
import { weekIndex, weeklyChallenges, type Challenge } from './engine/challenges';
import type { Life } from './engine/types';
import { netWorth } from './engine/wealth';

export interface Grave {
  id: string;
  first: string;
  last: string;
  gender: 'm' | 'f';
  skin: number;
  born: number;
  died: number;
  age: number;
  cause: string;
  /** Net worth in 1405 toman. */
  real: number;
  /** Nominal net worth at death and the unit note. */
  net: number;
  job: string;
  city: string;
  country: string;
  ach: string[];
  gen: number;
  facts: string[];
  title?: string;
}

export interface Meta {
  v: 1;
  gems: number;
  owned: { vip: boolean; god_mode: boolean; rich_family: boolean; careers: boolean; no_ads: boolean };
  achs: string[];
  graves: Grave[];
  life: Life | null;
  /** Snapshot of the life at the start of the current year (for «undo year»). */
  prev: string | null;
  settings: { sound: boolean; music: boolean; haptics: boolean };
  stats: { lives: number; years: number };
  daily: { last: string; streak: number };
  adGems: { day: string; count: number };
  yearsSinceAd: number;
  firstOpen: number;
  rated: boolean;
  tutorial: boolean;
  /** Weekly challenges finished this week. */
  challenges: { week: number; done: string[] };
}

const KEY = 'zendegi-irooni-v1';

function fresh(): Meta {
  return {
    v: 1,
    gems: 30,
    owned: { vip: false, god_mode: false, rich_family: false, careers: false, no_ads: false },
    achs: [],
    graves: [],
    life: null,
    prev: null,
    settings: { sound: true, music: true, haptics: true },
    stats: { lives: 0, years: 0 },
    daily: { last: '', streak: 0 },
    adGems: { day: '', count: 0 },
    yearsSinceAd: 0,
    firstOpen: Date.now(),
    rated: false,
    tutorial: false,
    challenges: { week: 0, done: [] },
  };
}

function load(): Meta {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const base = fresh();
      const s = JSON.parse(raw);
      return { ...base, ...s, owned: { ...base.owned, ...s.owned }, settings: { ...base.settings, ...s.settings }, stats: { ...base.stats, ...s.stats } };
    }
  } catch { /* storage unavailable: play without saving */ }
  return fresh();
}

export const meta: Meta = load();

let pending = 0;
export function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(meta)); } catch { /* full or unavailable */ }
}

/** Save soon (coalesces many quick changes into one write). */
export function persistSoon() {
  if (pending) return;
  pending = window.setTimeout(() => { pending = 0; persist(); }, 150);
}

export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export const isVip = () => meta.owned.vip;

/** Copy flags that depend on purchases into the life. */
export function syncOwned(L: Life) {
  if (meta.owned.careers) L.flags.vipCareers = 1;
  else delete L.flags.vipCareers;
}

/** New achievements unlocked this life that the collection hasn't seen. Returns 💎 earned. */
export function collectAchievements(L: Life): { ids: string[]; gems: number } {
  const ids = L.ach.filter((a) => !meta.achs.includes(a));
  let gems = 0;
  for (const id of ids) {
    meta.achs.push(id);
    gems += ACHS.find((a) => a.id === id)?.gems ?? 2;
  }
  meta.gems += gems;
  return { ids, gems };
}

/** Weekly challenges this life just completed. Returns them (gems already added). */
export function collectChallenges(L: Life): Challenge[] {
  const w = weekIndex();
  if (meta.challenges.week !== w) meta.challenges = { week: w, done: [] };
  const got = weeklyChallenges().filter((ch) => !meta.challenges.done.includes(ch.id) && ch.done(L));
  for (const ch of got) {
    meta.challenges.done.push(ch.id);
    meta.gems += ch.gems;
  }
  return got;
}

export function spendGems(n: number): boolean {
  if (meta.gems < n) return false;
  meta.gems -= n;
  persist();
  return true;
}

export function bury(L: Life, facts: string[], job: string, title?: string) {
  const g: Grave = {
    title,
    id: L.id,
    first: L.first,
    last: L.last,
    gender: L.gender,
    skin: L.skin,
    born: L.born,
    died: L.year,
    age: L.age,
    cause: L.dead?.cause ?? '',
    real: Math.round(netWorth(L) / L.econ.price),
    net: Math.round(netWorth(L)),
    job,
    city: L.city,
    country: L.country,
    ach: [...L.ach],
    gen: L.gen,
    facts,
  };
  meta.graves = [g, ...meta.graves.filter((x) => x.id !== g.id)].slice(0, 120);
  meta.stats.lives++;
}
