import type { Ctx } from './ctx';
import type { Life } from './types';
import { netWorth } from './wealth';

export interface AchDef {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  /** Checked every year (and at death). Others are awarded by events. */
  test?: (L: Life) => boolean;
  /** 💎 reward the first time ever. */
  gems?: number;
}

const real = (L: Life) => netWorth(L) / L.econ.price;
const kids = (L: Life) => L.people.filter((p) => p.rel === 'child').length;

export const ACHS: AchDef[] = [
  { id: 'rich1', name: 'پولدار', emoji: '💰', desc: 'دارایی خالصت به ۲۰ میلیارد (به پول ۱۴۰۵) برسه', test: (L) => real(L) >= 20e9 },
  { id: 'rich2', name: 'خرپول', emoji: '🤑', desc: 'دارایی ۲۰۰ میلیاردی (به پول ۱۴۰۵)', test: (L) => real(L) >= 200e9, gems: 10 },
  { id: 'rich3', name: 'هزار میلیاردی', emoji: '👑', desc: 'دارایی هزار میلیاردی (به پول ۱۴۰۵)', test: (L) => real(L) >= 1000e9, gems: 20 },
  { id: 'konkur100', name: 'رتبه‌ی دورقمی', emoji: '🥇', desc: 'تو کنکور رتبه‌ی زیر ۱۰۰ بیار', test: (L) => (L.edu.konkur?.rank ?? 1e9) < 100, gems: 5 },
  { id: 'konkur10', name: 'رتبه‌ی تک‌رقمی', emoji: '🏆', desc: 'تو کنکور رتبه‌ی زیر ۱۰ بیار', test: (L) => (L.edu.konkur?.rank ?? 1e9) < 10, gems: 15 },
  { id: 'konkur3', name: 'کنکوری حرفه‌ای', emoji: '📚', desc: 'سه بار کنکور بده', test: (L) => (L.edu.konkur?.tries ?? 0) >= 3 },
  { id: 'sampad', name: 'تیزهوش', emoji: '🧠', desc: 'تو آزمون تیزهوشان قبول شو', test: (L) => L.edu.school === 'sampad' },
  { id: 'gpa20', name: 'معدل بیست', emoji: '💯', desc: 'یه سال معدل ۲۰ بگیر', test: (L) => L.edu.gpa >= 20 },
  { id: 'doctor', name: 'دکتر جان', emoji: '🩺', desc: 'مدرک پزشکی بگیر', test: (L) => L.edu.degrees.some((d) => d.major === 'med') },
  { id: 'phd', name: 'دکترای واقعی', emoji: '🎓', desc: 'دکترا (PhD) بگیر', test: (L) => L.edu.degrees.some((d) => d.kind === 'phd'), gems: 5 },
  { id: 'soldier', name: 'سرباز وطن', emoji: '🎖️', desc: 'سربازی رو تموم کن', test: (L) => L.mil.status === 'done' },
  { id: 'boughtmil', name: 'سربازی‌خر', emoji: '💸', desc: 'سربازی رو بخر', test: (L) => L.mil.status === 'bought' },
  { id: 'absent', name: 'غایب حرفه‌ای', emoji: '🙈', desc: 'پنج سال غایب سربازی باش', test: (L) => (L.flags.absentYears ?? 0) >= 5 },
  { id: 'married', name: 'سر خونه و زندگی', emoji: '💍', desc: 'ازدواج کن', test: (L) => L.people.some((p) => p.rel === 'spouse') || 'married' in L.flags },
  { id: 'mehr1404', name: 'مهریه‌ی ۱۴۰۴ سکه', emoji: '🪙', desc: 'با مهریه‌ی ۱۴۰۴ سکه ازدواج کن', gems: 5 },
  { id: 'divorce', name: 'جدا شدیم', emoji: '💔', desc: 'طلاق بگیر' },
  { id: 'parent', name: 'بچه‌دار', emoji: '🍼', desc: 'بچه‌دار شو', test: (L) => kids(L) >= 1 },
  { id: 'bigfamily', name: 'خانواده‌ی پرجمعیت', emoji: '👨‍👩‍👧‍👦', desc: 'چهار تا بچه داشته باش', test: (L) => kids(L) >= 4, gems: 5 },
  { id: 'twins', name: 'دوقلو', emoji: '👯', desc: 'دوقلو بیار' },
  { id: 'emigrant', name: 'مهاجر', emoji: '✈️', desc: 'مهاجرت کن', test: (L) => L.country !== 'ir' },
  { id: 'returned', name: 'برگشتم وطن', emoji: '🇮🇷', desc: 'بعد از مهاجرت برگرد ایران' },
  { id: 'greencard', name: 'برنده‌ی لاتاری', emoji: '🎰', desc: 'تو لاتاری گرین‌کارت برنده شو', gems: 10 },
  { id: 'nose', name: 'دماغ عملی', emoji: '👃', desc: 'عمل بینی کن' },
  { id: 'damavand', name: 'فاتح دماوند', emoji: '🏔️', desc: 'قله‌ی دماوند رو فتح کن', gems: 5 },
  { id: 'old80', name: 'پیرِ دیر', emoji: '👴', desc: '۸۰ سال عمر کن', test: (L) => L.age >= 80 },
  { id: 'old100', name: 'صدساله', emoji: '💯', desc: '۱۰۰ سال عمر کن', test: (L) => L.age >= 100, gems: 20 },
  { id: 'young', name: 'جوون‌مرگ', emoji: '🥀', desc: 'قبل از ۳۰ سالگی بمیر' },
  { id: 'influencer', name: 'اینفلوئنسر', emoji: '📱', desc: 'یک میلیون فالوور جمع کن', test: (L) => L.followers >= 1_000_000, gems: 10 },
  { id: 'star', name: 'سوپراستار', emoji: '🌟', desc: 'به بالاترین درجه‌ی بازیگری یا خوانندگی برس', test: (L) => !!L.job && ['actor', 'singer'].includes(L.job.id) && L.job.level >= 2, gems: 10 },
  { id: 'national', name: 'ملی‌پوش', emoji: '🇮🇷', desc: 'عضو تیم ملی فوتبال شو', test: (L) => L.job?.id === 'footballer' && L.job.level >= 3, gems: 10 },
  { id: 'prison', name: 'سابقه‌دار', emoji: '⛓️', desc: 'برو زندان', test: (L) => !!L.prison },
  { id: 'mehrprison', name: 'زندانی مهریه', emoji: '🪙', desc: 'به خاطر مهریه برو زندان' },
  { id: 'homeowner', name: 'صاحب‌خونه', emoji: '🏠', desc: 'خونه بخر', test: (L) => L.assets.some((a) => a.kind === 'house') },
  { id: 'north', name: 'بالاشهری', emoji: '🏰', desc: 'تو زعفرانیه خونه بخر', test: (L) => L.assets.some((a) => a.kind === 'house' && (a.mul ?? 0) >= 2.5), gems: 5 },
  { id: 'porsche', name: 'پورشه‌سوار', emoji: '🏎️', desc: 'پورشه بخر', test: (L) => L.assets.some((a) => a.ref === 'porsche'), gems: 5 },
  { id: 'goldbug', name: 'سکه‌باز', emoji: '🪙', desc: '۱۰۰ تا سکه داشته باش', test: (L) => L.assets.filter((a) => a.kind === 'coin').reduce((s, a) => s + a.qty, 0) >= 100, gems: 5 },
  { id: 'crypto', name: 'نهنگ کریپتو', emoji: '🐋', desc: 'از رمزارز ده برابر سود کن' },
  { id: 'bankrupt', name: 'ورشکسته', emoji: '💥', desc: 'کسب‌وکارت ورشکست بشه' },
  { id: 'boss', name: 'رئیس', emoji: '👔', desc: 'به بالاترین درجه‌ی یه شغل برس' },
  { id: 'retired', name: 'بازنشسته', emoji: '🪑', desc: 'بازنشسته شو', test: (L) => !!L.pension },
  { id: 'jobless', name: 'بیکار حرفه‌ای', emoji: '🛋️', desc: 'هشت سال پشت سر هم بیکار باش', test: (L) => (L.flags.jobless ?? 0) >= 8 },
  { id: 'hafez', name: 'حافظ‌خون', emoji: '📖', desc: 'پنج بار فال حافظ بگیر', test: (L) => (L.flags.hafez ?? 0) >= 5 },
  { id: 'traveler', name: 'جهانگرد', emoji: '🌍', desc: 'پنج بار سفر خارجی برو', test: (L) => (L.flags.tripsAbroad ?? 0) >= 5 },
  { id: 'irantour', name: 'ایران‌گرد', emoji: '🗺️', desc: 'هشت بار سفر داخلی برو', test: (L) => (L.flags.tripsIran ?? 0) >= 8 },
  { id: 'books', name: 'کتاب‌خون', emoji: '📚', desc: '۳۰ تا کتاب بخون', test: (L) => (L.flags.books ?? 0) >= 30 },
  { id: 'charity', name: 'خیّر', emoji: '🤲', desc: 'ده بار به خیریه کمک کن', test: (L) => (L.flags.charity ?? 0) >= 10 },
  { id: 'gen3', name: 'نسل سوم', emoji: '🌳', desc: 'نسل سوم خانواده رو بازی کن', test: (L) => L.gen >= 3, gems: 5 },
  { id: 'gen5', name: 'دودمان', emoji: '🏛️', desc: 'نسل پنجم خانواده رو بازی کن', test: (L) => L.gen >= 5, gems: 15 },
  { id: 'broke', name: 'آه در بساط', emoji: '🕳️', desc: 'بی‌پول بمیر' },
  { id: 'happylife', name: 'زندگی شاد', emoji: '😊', desc: 'با شادی بالای ۹۰ از دنیا برو' },
  { id: 'fit', name: 'رو فرم', emoji: '💪', desc: 'سلامت و قیافه‌ات هر دو بالای ۹۰ باشه', test: (L) => L.stats.health >= 90 && L.stats.looks >= 90 && L.age >= 18 },
  { id: 'genius', name: 'ابرذهن', emoji: '🧠', desc: 'هوشت به ۱۰۰ برسه', test: (L) => L.stats.smarts >= 100 },
  { id: 'loved', name: 'عزیز دل محله', emoji: '🎖️', desc: 'آبروت به ۱۰۰ برسه', test: (L) => L.stats.rep >= 100 },
];

export function achById(id: string) {
  return ACHS.find((a) => a.id === id);
}

export function award(c: Ctx, id: string) {
  const L = c.L;
  if (L.ach.includes(id)) return;
  const a = achById(id);
  if (!a) return;
  L.ach.push(id);
  c.line(`🏅 نشان جدید: «${a.name}» ${a.emoji}`, 'big');
}

export function checkAchievements(c: Ctx) {
  for (const a of ACHS) if (a.test && !c.L.ach.includes(a.id) && a.test(c.L)) award(c, a.id);
}

/** Awards that depend on how the life ended. */
export function deathAchievements(c: Ctx) {
  const L = c.L;
  if (L.age < 30) award(c, 'young');
  if (netWorth(L) <= 0) award(c, 'broke');
  if (L.stats.happy >= 90) award(c, 'happylife');
  checkAchievements(c);
}
