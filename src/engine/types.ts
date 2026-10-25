export type Gender = 'm' | 'f';
export type StatKey = 'happy' | 'health' | 'smarts' | 'looks' | 'rep';
export const STAT_KEYS: StatKey[] = ['happy', 'health', 'smarts', 'looks', 'rep'];
export type Stats = Record<StatKey, number>;

export type RelKind =
  | 'father' | 'mother' | 'brother' | 'sister' | 'grandpa' | 'grandma'
  | 'spouse' | 'fiance' | 'child' | 'friend' | 'ex' | 'crush' | 'stepparent';

/** A pet (kinds in content/pets.ts). */
export interface Pet {
  id: number;
  kind: string;
  name: string;
  /** Birth year. */
  born: number;
  /** Age it will die of old age. */
  life: number;
  /** Bond 0..100. */
  close: number;
  alive: boolean;
  died?: number;
}

export interface Npc {
  id: number;
  first: string;
  last: string;
  gender: Gender;
  /** Birth year (Persian solar). */
  born: number;
  rel: RelKind;
  /** Relationship 0..100. */
  close: number;
  alive: boolean;
  died?: number;
  job?: string;
  /** Wealth class 0 (poor) .. 4 (very rich). */
  rich?: number;
  looks?: number;
  smarts?: number;
  traits?: string[];
  /** Paternal or maternal side, for grandparents. */
  side?: 'p' | 'm';
  /** Where we met (friends, crushes, spouse). */
  met?: string;
  /** Child's other parent. */
  other?: number;
  flags?: Record<string, number>;
}

export type AssetKind = 'house' | 'car' | 'coin' | 'dollar' | 'stock' | 'crypto' | 'deposit' | 'shop';

export interface Asset {
  id: number;
  kind: AssetKind;
  /** Definition id: car model, house type, shop type. */
  ref: string;
  name: string;
  /** Units: coins, dollars, shares, crypto units, deposit toman, house m². */
  qty: number;
  /** Nominal toman paid. */
  paid: number;
  year: number;
  /** Car condition / house age penalty 0..100. */
  cond?: number;
  /** City price multiplier for houses. */
  mul?: number;
  rented?: boolean;
}

export interface Loan {
  id: number;
  name: string;
  /** Remaining principal, toman. */
  left: number;
  /** Payment per year, toman. */
  yearly: number;
  rate: number;
}

export interface JobState {
  id: string;
  since: number;
  perf: number;
  level: number;
  /** Monthly nominal toman (recomputed yearly). */
  salary: number;
  /** Part-time jobs can be held alongside school. */
  part?: boolean;
}

export type Track = 'riazi' | 'tajrobi' | 'ensani' | 'honar' | 'fani';
export type DegreeKind = 'diploma' | 'kardani' | 'karshenasi' | 'arshad' | 'phd' | 'doctor';

export interface Degree {
  kind: DegreeKind;
  major: string;
  uni: string;
  tier: number;
  gpa: number;
}

export interface UniState {
  kind: DegreeKind;
  major: string;
  uni: string;
  /** 0 best (Tehran/Sharif…) .. 4 (Payam-e Noor / non-profit). */
  tier: number;
  year: number;
  length: number;
  gpa: number;
  abroad?: boolean;
}

export interface Edu {
  stage: 'home' | 'pre' | 'school' | 'uni' | 'none';
  grade: number;
  school: 'dolati' | 'gheyr' | 'sampad' | 'nemune';
  track?: Track;
  gpa: number;
  /** Study effort put in this year. */
  effort: number;
  konkur?: { rank: number; year: number; tries: number };
  uni?: UniState;
  degrees: Degree[];
  ielts?: number;
  konkurClass?: boolean;
  dropped?: boolean;
}

export type MilStatus = 'na' | 'due' | 'deferred' | 'serving' | 'done' | 'exempt' | 'bought' | 'absent';

export interface Military {
  status: MilStatus;
  months?: number;
  place?: string;
  /** Year the deferral (student) ends. */
  until?: number;
}

export interface Illness {
  id: string;
  since: number;
  severity: number;
}

export interface Econ {
  /** This year's inflation (0.35 = 35%). */
  infl: number;
  /** Price index, 1 in 1405. */
  price: number;
  dollar: number;
  coin: number;
  /** Tehran average toman per m². */
  m2: number;
  /** One stock-fund unit, toman. */
  stock: number;
  /** Crypto unit price in USD. */
  crypto: number;
  /** Minimum monthly wage, toman. */
  wage: number;
  /** Car price index, 1 in 1405. */
  car: number;
  /** Bank deposit rate. */
  rate: number;
}

export interface LogLine {
  t: string;
  k?: 'good' | 'bad' | 'info' | 'big';
  e?: string;
}

export interface LogYear {
  age: number;
  year: number;
  lines: LogLine[];
}

export interface Pending {
  id: string;
  p?: Record<string, unknown>;
}

export interface Death {
  cause: string;
  age: number;
  year: number;
}

export type Home = 'parents' | 'rent' | 'own' | 'dorm' | 'barracks' | 'abroad';

export interface Life {
  v: 1;
  id: string;
  rng: number;
  gen: number;
  parentLife?: string;
  first: string;
  last: string;
  gender: Gender;
  skin: number;
  born: number;
  city: string;
  country: string;
  age: number;
  year: number;
  stats: Stats;
  luck: number;
  grit: number;
  traits: string[];
  money: number;
  loans: Loan[];
  people: Npc[];
  /** Missing in lives saved before pets existed. */
  pets?: Pet[];
  nextId: number;
  assets: Asset[];
  job: JobState | null;
  career: { id: string; title: string; years: number }[];
  edu: Edu;
  mil: Military;
  home: Home;
  lifestyle: number;
  ills: Illness[];
  flags: Record<string, number>;
  log: LogYear[];
  econ: Econ;
  /** Activity uses this year. */
  used: Record<string, number>;
  /** Events waiting to be shown. */
  queue: Pending[];
  /** Year each event last fired. */
  seen: Record<string, number>;
  followers: number;
  /** Achievement ids unlocked in this life. */
  ach: string[];
  dead?: Death;
  revived: number;
  /** Peak net worth (for the obituary). */
  peak: number;
  /** Mehriyeh owed (coins) if married. */
  mehr?: number;
  /** Years spent in prison so far, and release year if inside. */
  prison?: { until: number; why: string };
  pension?: number;
}
