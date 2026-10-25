import type { DegreeKind, Track } from '../engine/types';

export const TRACKS: { id: Track; name: string; emoji: string; desc: string; konkurN: number }[] = [
  { id: 'riazi', name: 'ریاضی‌فیزیک', emoji: '📐', desc: 'مهندسی، معماری، علوم پایه', konkurN: 150_000 },
  { id: 'tajrobi', name: 'علوم تجربی', emoji: '🧬', desc: 'پزشکی، دندون، دارو، پرستاری', konkurN: 450_000 },
  { id: 'ensani', name: 'علوم انسانی', emoji: '📚', desc: 'حقوق، روانشناسی، حسابداری', konkurN: 220_000 },
  { id: 'honar', name: 'هنر', emoji: '🎨', desc: 'گرافیک، سینما، موسیقی', konkurN: 60_000 },
  { id: 'fani', name: 'فنی‌وحرفه‌ای', emoji: '🔧', desc: 'زودتر وارد بازار کار شو', konkurN: 90_000 },
];

export function trackName(t?: Track): string {
  return TRACKS.find((x) => x.id === t)?.name ?? '';
}

export interface Major {
  id: string;
  name: string;
  track: Track;
  /** Konkur percentile needed for a good state university (tier 1). */
  need: number;
  kind: DegreeKind;
  len: number;
  /** Yearly tuition at Azad, in 1405 toman. */
  azad: number;
}

export const MAJORS: Major[] = [
  { id: 'comp', name: 'مهندسی کامپیوتر', track: 'riazi', need: 0.035, kind: 'karshenasi', len: 4, azad: 90e6 },
  { id: 'elec', name: 'مهندسی برق', track: 'riazi', need: 0.05, kind: 'karshenasi', len: 4, azad: 85e6 },
  { id: 'mech', name: 'مهندسی مکانیک', track: 'riazi', need: 0.08, kind: 'karshenasi', len: 4, azad: 80e6 },
  { id: 'civil', name: 'مهندسی عمران', track: 'riazi', need: 0.1, kind: 'karshenasi', len: 4, azad: 80e6 },
  { id: 'ind', name: 'مهندسی صنایع', track: 'riazi', need: 0.08, kind: 'karshenasi', len: 4, azad: 80e6 },
  { id: 'arch', name: 'معماری', track: 'riazi', need: 0.06, kind: 'karshenasi', len: 4, azad: 90e6 },
  { id: 'chem', name: 'مهندسی شیمی', track: 'riazi', need: 0.12, kind: 'karshenasi', len: 4, azad: 80e6 },
  { id: 'phys', name: 'فیزیک', track: 'riazi', need: 0.25, kind: 'karshenasi', len: 4, azad: 60e6 },
  { id: 'math', name: 'ریاضی', track: 'riazi', need: 0.3, kind: 'karshenasi', len: 4, azad: 60e6 },
  { id: 'med', name: 'پزشکی', track: 'tajrobi', need: 0.008, kind: 'doctor', len: 7, azad: 450e6 },
  { id: 'dent', name: 'دندان‌پزشکی', track: 'tajrobi', need: 0.006, kind: 'doctor', len: 6, azad: 500e6 },
  { id: 'pharm', name: 'داروسازی', track: 'tajrobi', need: 0.012, kind: 'doctor', len: 6, azad: 380e6 },
  { id: 'vet', name: 'دامپزشکی', track: 'tajrobi', need: 0.04, kind: 'doctor', len: 6, azad: 250e6 },
  { id: 'nurse', name: 'پرستاری', track: 'tajrobi', need: 0.07, kind: 'karshenasi', len: 4, azad: 110e6 },
  { id: 'midwife', name: 'مامایی', track: 'tajrobi', need: 0.09, kind: 'karshenasi', len: 4, azad: 100e6 },
  { id: 'physio', name: 'فیزیوتراپی', track: 'tajrobi', need: 0.04, kind: 'karshenasi', len: 4, azad: 120e6 },
  { id: 'bio', name: 'زیست‌شناسی', track: 'tajrobi', need: 0.3, kind: 'karshenasi', len: 4, azad: 60e6 },
  { id: 'agri', name: 'کشاورزی', track: 'tajrobi', need: 0.4, kind: 'karshenasi', len: 4, azad: 50e6 },
  { id: 'nutri', name: 'علوم تغذیه', track: 'tajrobi', need: 0.08, kind: 'karshenasi', len: 4, azad: 90e6 },
  { id: 'law', name: 'حقوق', track: 'ensani', need: 0.04, kind: 'karshenasi', len: 4, azad: 80e6 },
  { id: 'psych', name: 'روانشناسی', track: 'ensani', need: 0.08, kind: 'karshenasi', len: 4, azad: 70e6 },
  { id: 'acc', name: 'حسابداری', track: 'ensani', need: 0.15, kind: 'karshenasi', len: 4, azad: 60e6 },
  { id: 'mgmt', name: 'مدیریت بازرگانی', track: 'ensani', need: 0.2, kind: 'karshenasi', len: 4, azad: 60e6 },
  { id: 'econ', name: 'اقتصاد', track: 'ensani', need: 0.15, kind: 'karshenasi', len: 4, azad: 60e6 },
  { id: 'lit', name: 'ادبیات فارسی', track: 'ensani', need: 0.4, kind: 'karshenasi', len: 4, azad: 45e6 },
  { id: 'eng', name: 'زبان انگلیسی', track: 'ensani', need: 0.2, kind: 'karshenasi', len: 4, azad: 60e6 },
  { id: 'teach', name: 'دبیری (فرهنگیان)', track: 'ensani', need: 0.12, kind: 'karshenasi', len: 4, azad: 0 },
  { id: 'soc', name: 'جامعه‌شناسی', track: 'ensani', need: 0.45, kind: 'karshenasi', len: 4, azad: 45e6 },
  { id: 'journal', name: 'روزنامه‌نگاری', track: 'ensani', need: 0.25, kind: 'karshenasi', len: 4, azad: 50e6 },
  { id: 'graphic', name: 'گرافیک', track: 'honar', need: 0.1, kind: 'karshenasi', len: 4, azad: 80e6 },
  { id: 'cinema', name: 'سینما', track: 'honar', need: 0.08, kind: 'karshenasi', len: 4, azad: 90e6 },
  { id: 'music', name: 'موسیقی', track: 'honar', need: 0.1, kind: 'karshenasi', len: 4, azad: 80e6 },
  { id: 'paint', name: 'نقاشی', track: 'honar', need: 0.2, kind: 'karshenasi', len: 4, azad: 70e6 },
  { id: 'acting', name: 'بازیگری', track: 'honar', need: 0.08, kind: 'karshenasi', len: 4, azad: 90e6 },
  { id: 'fashion', name: 'طراحی لباس', track: 'honar', need: 0.15, kind: 'karshenasi', len: 4, azad: 80e6 },
  { id: 'k_elec', name: 'برق صنعتی (کاردانی)', track: 'fani', need: 0.3, kind: 'kardani', len: 2, azad: 40e6 },
  { id: 'k_mech', name: 'مکانیک خودرو (کاردانی)', track: 'fani', need: 0.3, kind: 'kardani', len: 2, azad: 40e6 },
  { id: 'k_comp', name: 'کامپیوتر (کاردانی)', track: 'fani', need: 0.25, kind: 'kardani', len: 2, azad: 40e6 },
  { id: 'k_acc', name: 'حسابداری (کاردانی)', track: 'fani', need: 0.35, kind: 'kardani', len: 2, azad: 35e6 },
];

export function majorById(id: string): Major | undefined {
  return MAJORS.find((m) => m.id === id);
}

export function majorName(id: string): string {
  return majorById(id)?.name ?? id;
}

export const TIER_NAMES = ['سراسری تاپ', 'سراسری روزانه', 'سراسری شهرستان / شبانه', 'آزاد', 'پیام‌نور / غیرانتفاعی'];

export const TOP_UNIS: Record<string, string[]> = {
  riazi: ['دانشگاه صنعتی شریف', 'دانشگاه تهران', 'دانشگاه امیرکبیر', 'دانشگاه علم و صنعت'],
  tajrobi: ['علوم پزشکی تهران', 'علوم پزشکی شهید بهشتی', 'علوم پزشکی ایران'],
  ensani: ['دانشگاه تهران', 'دانشگاه شهید بهشتی', 'دانشگاه علامه طباطبایی'],
  honar: ['دانشگاه هنر تهران', 'پردیس هنرهای زیبای دانشگاه تهران'],
  fani: ['دانشکده فنی شهید شمسی‌پور', 'دانشگاه فنی‌وحرفه‌ای تهران'],
};

export const GOOD_UNIS = ['دانشگاه اصفهان', 'دانشگاه شیراز', 'دانشگاه فردوسی مشهد', 'دانشگاه تبریز', 'دانشگاه صنعتی اصفهان', 'دانشگاه گیلان', 'دانشگاه خواجه نصیر', 'دانشگاه کردستان'];
export const SMALL_UNIS = ['دانشگاه سمنان', 'دانشگاه بیرجند', 'دانشگاه زنجان', 'دانشگاه یاسوج', 'دانشگاه ایلام', 'دانشگاه زابل', 'دانشگاه اراک', 'دانشگاه بجنورد'];

export const DEGREE_NAMES: Record<DegreeKind, string> = {
  diploma: 'دیپلم',
  kardani: 'کاردانی',
  karshenasi: 'کارشناسی',
  arshad: 'کارشناسی ارشد',
  phd: 'دکترا',
  doctor: 'دکترای حرفه‌ای',
};

const ORDER: Record<DegreeKind, number> = { diploma: 1, kardani: 2, karshenasi: 3, arshad: 4, doctor: 4, phd: 5 };
export function degreeLevel(k: DegreeKind): number {
  return ORDER[k];
}
