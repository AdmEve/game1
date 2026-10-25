/** Weekly challenges (three at a time, the same for everyone in a given week) and life titles. */
import type { Life } from './types';
import { netWorth } from './wealth';

export interface Challenge {
  id: string;
  title: string;
  emoji: string;
  desc: string;
  gems: number;
  /** Checked during the life and at death. */
  done: (L: Life) => boolean;
}

const real = (L: Life) => netWorth(L) / L.econ.price;
const married = (L: Life) => 'married' in L.flags;
const deg = (L: Life, major: string) => L.edu.degrees.some((d) => d.major === major);

export const CHALLENGES: Challenge[] = [
  { id: 'doc30', emoji: '🩺', title: 'دکتر جوون', desc: 'پزشکی بخون و قبل از ۳۰ سالگی ازدواج کن', gems: 15, done: (L) => deg(L, 'med') && married(L) && (L.flags.marriedAge ?? 99) < 30 },
  { id: 'rank100', emoji: '🥇', title: 'رتبه‌ی دورقمی', desc: 'تو کنکور رتبه‌ی زیر ۱۰۰ بیار', gems: 15, done: (L) => (L.edu.konkur?.rank ?? 1e9) < 100 },
  { id: 'abroadphd', emoji: '🎓', title: 'دکترای خارج', desc: 'مهاجرت کن و دکترا بگیر', gems: 20, done: (L) => L.country !== 'ir' && L.edu.degrees.some((d) => d.kind === 'phd') },
  { id: 'nouni_rich', emoji: '💰', title: 'پولدار بی‌مدرک', desc: 'بدون رفتن به دانشگاه به دارایی ۲۰ میلیاردی (به پول ۱۴۰۵) برس', gems: 20, done: (L) => L.edu.degrees.length <= 1 && real(L) >= 20e9 },
  { id: 'big_family', emoji: '👨‍👩‍👧‍👦', title: 'خانواده‌ی پرجمعیت', desc: 'چهار تا بچه بیار', gems: 15, done: (L) => L.people.filter((p) => p.rel === 'child').length >= 4 },
  { id: 'soldier_star', emoji: '🎖️', title: 'سرباز نمونه', desc: 'سربازی برو و بعدش افسر پلیس یا آتش‌نشان بشو', gems: 15, done: (L) => L.mil.status === 'done' && L.career.some((c) => c.id === 'police' || c.id === 'firefighter') },
  { id: 'damavand_doc', emoji: '🏔️', title: 'کوه‌نورد', desc: 'دماوند رو فتح کن و تا ۸۰ سالگی زنده بمون', gems: 15, done: (L) => 'damavand' in L.flags && L.age >= 80 },
  { id: 'influencer', emoji: '📱', title: 'سلبریتی اینستاگرام', desc: 'یک میلیون فالوور جمع کن', gems: 20, done: (L) => L.followers >= 1_000_000 },
  { id: 'gold100', emoji: '🪙', title: 'سکه‌باز', desc: '۱۰۰ تا سکه‌ی طلا داشته باش', gems: 15, done: (L) => L.assets.filter((a) => a.kind === 'coin').reduce((s, a) => s + a.qty, 0) >= 100 },
  { id: 'teacher30', emoji: '🧑‍🏫', title: 'معلم نمونه', desc: '۲۰ سال معلم باش', gems: 15, done: (L) => (L.career.find((c) => c.id === 'teacher')?.years ?? 0) >= 20 },
  { id: 'centenarian', emoji: '💯', title: 'صدساله', desc: 'صد سال عمر کن', gems: 25, done: (L) => L.age >= 100 },
  { id: 'mehr1404', emoji: '💍', title: 'مهریه‌ی نجومی', desc: 'با مهریه‌ی ۱۴۰۴ سکه ازدواج کن', gems: 10, done: (L) => married(L) && (L.flags.mehrMax ?? 0) >= 1404 },
  { id: 'greencard', emoji: '🗽', title: 'رؤیای آمریکایی', desc: 'تو لاتاری گرین‌کارت برنده شو و بری آمریکا', gems: 25, done: (L) => L.country === 'us' },
  { id: 'startup', emoji: '🚀', title: 'کارآفرین', desc: 'سه تا کسب‌وکار همزمان داشته باش', gems: 20, done: (L) => L.assets.filter((a) => a.kind === 'shop').length >= 3 },
  { id: 'returnee', emoji: '🇮🇷', title: 'برگشتم!', desc: 'مهاجرت کن و برگرد ایران', gems: 15, done: (L) => 'emigrated' in L.flags && L.country === 'ir' },
  { id: 'gen3', emoji: '🌳', title: 'سه نسل', desc: 'نسل سوم خانواده رو بازی کن', gems: 20, done: (L) => L.gen >= 3 },
  { id: 'lawyer_rich', emoji: '⚖️', title: 'وکیل پولدار', desc: 'وکیل بشو و دارایی‌ات به ۵۰ میلیارد (به پول ۱۴۰۵) برسه', gems: 20, done: (L) => L.career.some((c) => c.id === 'lawyer') && real(L) >= 50e9 },
  { id: 'farmer_happy', emoji: '🌾', title: 'زندگی روستایی', desc: 'کشاورز باش و با شادی بالای ۸۰ بمیر', gems: 15, done: (L) => L.career.some((c) => c.id === 'farmer') && !!L.dead && L.stats.happy >= 80 },
];

/** Week number since an epoch, so everyone sees the same three challenges. */
export function weekIndex(now = Date.now()): number {
  return Math.floor((now / 86400000 + 3) / 7);
}

export function weeklyChallenges(now = Date.now()): Challenge[] {
  const w = weekIndex(now);
  const n = CHALLENGES.length;
  const a = (w * 7) % n;
  const b = (w * 7 + 5) % n;
  const c = (w * 7 + 11) % n;
  const ids = [...new Set([a, b, c])];
  while (ids.length < 3) ids.push((ids[ids.length - 1] + 1) % n);
  return ids.map((i) => CHALLENGES[i]);
}

/** A funny title for the obituary, from what stood out in the life. */
export function lifeTitle(L: Life): string {
  const r = real(L);
  const m = L.gender === 'm';
  if (L.age >= 100) return 'صدساله‌ی محله';
  if ((L.flags.mehrMax ?? 0) >= 1404) return 'سلطان مهریه';
  if (L.followers >= 1_000_000) return 'سلبریتی';
  if (r >= 200e9) return m ? 'حاج‌آقای خرپول' : 'حاج‌خانم خرپول';
  if (L.prison || Object.keys(L.flags).some((k) => k.startsWith('jail:'))) return 'سابقه‌دار';
  if ((L.edu.konkur?.rank ?? 1e9) < 100) return 'نابغه‌ی کنکور';
  if ((L.edu.konkur?.tries ?? 0) >= 3) return 'کنکوری ابدی';
  if (L.edu.degrees.some((d) => d.major === 'med')) return m ? 'آقای دکتر' : 'خانم دکتر';
  if (L.country !== 'ir') return 'مهاجر';
  if (L.people.filter((p) => p.rel === 'child').length >= 4) return 'پدر/مادر نمونه'.replace('پدر/مادر', m ? 'پدر' : 'مادر');
  if ('divorced' in L.flags) return 'دل‌شکسته';
  if (L.mil.status === 'absent') return 'غایب ابدی';
  if (r >= 20e9) return 'پولدار';
  if ((L.flags.jobless ?? 0) >= 8) return 'بیکار حرفه‌ای';
  if (L.stats.happy >= 85) return 'همیشه‌خندون';
  if (L.age < 30) return 'جوون‌مرگ';
  if (r <= 0) return 'آس‌وپاس';
  return m ? 'مرد زحمتکش' : 'زن زحمتکش';
}
