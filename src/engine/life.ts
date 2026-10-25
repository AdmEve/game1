import { CITIES, cityById } from '../content/cities';
import { FEMALE, LAST, MALE } from '../content/names';
import { TRAITS } from '../content/traits';
import { clamp } from './ctx';
import { START_YEAR, startEcon } from './econ';
import { Rng, newSeed } from './rng';
import type { Econ, Gender, Life, Npc } from './types';

/** Parents' jobs by wealth class 0..4. */
const DAD_JOBS = [
  ['کارگر ساختمانی', 'دستفروش', 'کارگر فصلی', 'کشاورز', 'بیکار'],
  ['راننده تاکسی', 'کارمند جزء', 'نگهبان', 'خیاط', 'مکانیک', 'معلم'],
  ['کارمند بانک', 'مهندس', 'مغازه‌دار', 'معلم', 'کارمند اداره'],
  ['پزشک', 'پیمانکار ساختمان', 'بازاری', 'وکیل', 'مدیر شرکت'],
  ['صاحب کارخونه', 'تاجر فرش', 'بساز‌بفروش', 'جراح معروف', 'صاحب زنجیره‌ی رستوران'],
];
const MOM_JOBS = [
  ['خانه‌دار', 'خانه‌دار', 'خیاط', 'کارگر'],
  ['خانه‌دار', 'معلم', 'آرایشگر', 'منشی'],
  ['معلم', 'پرستار', 'کارمند', 'خانه‌دار'],
  ['پزشک', 'استاد دانشگاه', 'وکیل', 'خانه‌دار'],
  ['صاحب گالری', 'خانه‌دار', 'دندان‌پزشک', 'مدیر شرکت'],
];
export const CLASS_NAMES = ['فقیر', 'کم‌درآمد', 'متوسط', 'مرفه', 'خیلی پولدار'];

export interface NewLifeOpts {
  gender?: Gender;
  city?: string;
  first?: string;
  last?: string;
  /** Wealth class 0..4. */
  rich?: number;
  traits?: string[];
  seed?: number;
  econ?: Econ;
  year?: number;
  gen?: number;
  parentLife?: string;
  /** For a child continuing the family: their own people come from the parent life. */
  people?: Npc[];
  money?: number;
  stats?: Partial<Life['stats']>;
}

export function newLife(o: NewLifeOpts = {}): Life {
  const seed = o.seed ?? newSeed();
  const r = new Rng(seed);
  const gender: Gender = o.gender ?? (r.chance(0.5) ? 'm' : 'f');
  const city = o.city ?? r.weighted(CITIES, (c) => c.w)!.id;
  const last = o.last ?? r.pick(LAST);
  const first = o.first ?? r.pick(gender === 'm' ? MALE : FEMALE);
  const year = o.year ?? START_YEAR;
  const rich = o.rich ?? r.weighted([0, 1, 2, 3, 4], (k) => [18, 34, 32, 13, 3][k])!;

  // Traits: 1 or 2 that don't clash.
  let traits = o.traits;
  if (!traits) {
    traits = [];
    const n = r.chance(0.55) ? 2 : 1;
    for (let tries = 0; traits.length < n && tries < 30; tries++) {
      const t = r.pick(TRAITS);
      if (traits.includes(t.id) || traits.some((x) => t.not?.includes(x) || TRAITS.find((y) => y.id === x)?.not?.includes(t.id))) continue;
      traits.push(t.id);
    }
  }

  const L: Life = {
    v: 1,
    id: `${Date.now().toString(36)}${(seed >>> 0).toString(36)}`,
    rng: r.state,
    gen: o.gen ?? 1,
    parentLife: o.parentLife,
    first, last, gender,
    skin: r.weighted([0, 1, 2, 3], (k) => [3, 4, 3, 1][k])!,
    born: year,
    city,
    country: 'ir',
    age: 0,
    year,
    stats: { happy: r.int(70, 95), health: r.int(70, 100), smarts: r.int(25, 80), looks: r.int(20, 85), rep: 50 },
    luck: r.int(30, 70),
    grit: r.int(30, 70),
    traits,
    money: o.money ?? 0,
    loans: [],
    people: [],
    nextId: 1,
    assets: [],
    job: null,
    career: [],
    edu: { stage: 'home', grade: 0, school: 'dolati', gpa: 0, effort: 0, degrees: [] },
    mil: { status: gender === 'm' ? 'na' : 'na' },
    home: 'parents',
    lifestyle: 1,
    ills: [],
    flags: { rich },
    log: [],
    econ: o.econ ? { ...o.econ } : startEcon(),
    used: {},
    queue: [],
    seen: {},
    followers: 0,
    ach: [],
    revived: 0,
    peak: 0,
  };

  for (const id of traits) {
    const t = TRAITS.find((x) => x.id === id)!;
    for (const [k, v] of Object.entries(t.mod ?? {})) L.stats[k as keyof Life['stats']] = clamp(L.stats[k as keyof Life['stats']] + v!);
    L.luck = clamp(L.luck + (t.luck ?? 0));
    L.grit = clamp(L.grit + (t.grit ?? 0));
  }
  if (o.stats) Object.assign(L.stats, o.stats);

  const person = (p: Omit<Npc, 'id'>): Npc => {
    const n = { id: L.nextId++, ...p };
    L.people.push(n);
    return n;
  };

  if (o.people) {
    for (const p of o.people) L.people.push({ ...p, id: L.nextId++ });
  } else {
    const dadAge = r.int(26, 42);
    const momAge = Math.max(19, dadAge - r.int(1, 8));
    const dad = person({ first: r.pick(MALE), last, gender: 'm', born: year - dadAge, rel: 'father', close: r.int(55, 90), alive: true, job: r.pick(DAD_JOBS[rich]), rich, smarts: r.int(25, 85), looks: r.int(20, 80) });
    const mom = person({ first: r.pick(FEMALE), last: r.pick(LAST), gender: 'f', born: year - momAge, rel: 'mother', close: r.int(65, 95), alive: true, job: r.pick(MOM_JOBS[rich]), rich, smarts: r.int(25, 85), looks: r.int(30, 85) });
    // Children take after their parents a little.
    L.stats.smarts = clamp(Math.round(L.stats.smarts * 0.6 + ((dad.smarts! + mom.smarts!) / 2) * 0.4));
    L.stats.looks = clamp(Math.round(L.stats.looks * 0.7 + ((dad.looks! + mom.looks!) / 2) * 0.3));
    // Older siblings.
    const sibs = r.weighted([0, 1, 2, 3], (k) => [30, 40, 22, 8][k])!;
    for (let i = 0; i < sibs; i++) {
      const g: Gender = r.chance(0.5) ? 'm' : 'f';
      const age = r.int(1, Math.min(14, momAge - 18));
      if (age < 1) continue;
      person({ first: r.pick(g === 'm' ? MALE : FEMALE), last, gender: g, born: year - age, rel: g === 'm' ? 'brother' : 'sister', close: r.int(40, 85), alive: true, smarts: r.int(20, 85), looks: r.int(20, 85) });
    }
    // Grandparents (some already gone).
    for (const side of ['p', 'm'] as const) {
      const parentAge = side === 'p' ? dadAge : momAge;
      const gpAge = parentAge + r.int(22, 34);
      const gmAge = gpAge - r.int(2, 9);
      if (r.chance(gpAge > 80 ? 0.35 : 0.85)) person({ first: r.pick(MALE), last: side === 'p' ? last : mom.last, gender: 'm', born: year - gpAge, rel: 'grandpa', side, close: r.int(55, 90), alive: true });
      if (r.chance(gmAge > 80 ? 0.4 : 0.9)) person({ first: r.pick(FEMALE), last: r.pick(LAST), gender: 'f', born: year - gmAge, rel: 'grandma', side, close: r.int(60, 95), alive: true });
    }
  }

  L.rng = r.state;
  return L;
}

export function cityName(L: Life): string {
  return cityById(L.city).name;
}

export function richClass(L: Life): number {
  return L.flags.rich ?? 2;
}
