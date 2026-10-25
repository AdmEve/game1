import { award } from '../../engine/achieve';
import type { Ctx } from '../../engine/ctx';
import { clamp } from '../../engine/ctx';
import { fa, gpa, money, num } from '../../engine/fmt';
import { defEvents, type ChoiceDef } from '../../engine/registry';
import type { DegreeKind, Track } from '../../engine/types';
import { familyBudget, sendToPrison } from '../../engine/year';
import { assetValue } from '../../engine/wealth';
import { cityById } from '../cities';
import { GOOD_UNIS, MAJORS, SMALL_UNIS, TIER_NAMES, TOP_UNIS, TRACKS, majorById, majorName } from '../edu';

// ───────────────────────── konkur ─────────────────────────

export function konkurRank(c: Ctx): { rank: number; p: number; n: number } {
  const L = c.L;
  const track: Track = L.edu.track ?? 'riazi';
  const n = TRACKS.find((t) => t.id === track)!.konkurN;
  const effort = c.count('kEffort');
  const tries = L.edu.konkur?.tries ?? 0;
  const z = (L.stats.smarts - 50) / 14 + (effort - 3) / 4 + (L.edu.konkurClass ? 0.35 : 0) + (L.edu.school === 'sampad' ? 0.4 : 0)
    + (L.luck - 50) / 100 + c.rng.gauss(0, 0.45) + tries * 0.2 + (c.trait('genius') ? 0.4 : 0)
    + (L.flags.konkurQuiz !== undefined ? (L.flags.konkurQuiz - 2.5) * 0.3 : 0);
  delete L.flags.konkurQuiz;
  const p = 1 / (1 + Math.exp(1.7 * z));
  return { rank: Math.max(1, Math.round(p * n)), p, n };
}

export interface Offer {
  major: string;
  tier: number;
  uni: string;
  kind: DegreeKind;
  len: number;
}

function uniName(c: Ctx, track: Track, tier: number, major: string): string {
  const city = cityById(c.L.city).name;
  if (tier === 0) return c.pick(TOP_UNIS[track]);
  if (tier === 1) return track === 'tajrobi' && ['med', 'dent', 'pharm'].includes(major) ? `علوم پزشکی ${city}` : c.chance(0.4) ? `دانشگاه ${city}` : c.pick(GOOD_UNIS);
  if (tier === 2) return c.pick(SMALL_UNIS);
  if (tier === 3) return `دانشگاه آزاد واحد ${city}`;
  return c.chance(0.5) ? `پیام‌نور ${city}` : `مؤسسه‌ی غیرانتفاعی ${city}`;
}

export function offersFor(c: Ctx, p: number, track: Track): Offer[] {
  const out: Offer[] = [];
  const majors = MAJORS.filter((m) => m.track === track);
  for (const m of majors) {
    const tier = p <= m.need * 0.25 ? 0 : p <= m.need ? 1 : p <= m.need * 2.5 ? 2 : -1;
    if (tier >= 0) out.push({ major: m.id, tier, uni: uniName(c, track, tier, m.id), kind: m.kind, len: m.len });
  }
  // Best offers first: top tier and most competitive majors.
  out.sort((a, b) => a.tier - b.tier || majorById(a.major)!.need - majorById(b.major)!.need);
  const best = out.slice(0, 5);
  // Azad: any major if you pay; Payam-e Noor for the easy ones.
  const azad = majors.filter((m) => m.azad > 0 && !best.some((o) => o.major === m.id)).sort((a, b) => a.need - b.need).slice(0, 2);
  for (const m of azad) best.push({ major: m.id, tier: 3, uni: uniName(c, track, 3, m.id), kind: m.kind, len: m.len });
  const easy = majors.filter((m) => m.need >= 0.1 && m.kind !== 'doctor').sort((a, b) => b.need - a.need)[0];
  if (easy && !best.some((o) => o.major === easy.id)) best.push({ major: easy.id, tier: 4, uni: uniName(c, track, 4, easy.id), kind: easy.kind, len: easy.len });
  return best;
}

export function startUni(c: Ctx, o: Offer) {
  const L = c.L;
  L.edu.stage = 'uni';
  L.edu.uni = { kind: o.kind, major: o.major, uni: o.uni, tier: o.tier, year: 1, length: o.len, gpa: 0 };
  if (L.gender === 'm' && ['na', 'due'].includes(L.mil.status)) L.mil.status = 'deferred';
  const far = !o.uni.includes(cityById(L.city).name) && o.tier !== 3 && o.tier !== 4;
  if (far && L.home === 'parents') {
    L.home = 'dorm';
    c.line('🛏️ دانشگاهت تو یه شهر دیگه‌ست؛ رفتی خوابگاه!');
  }
}

function tuitionYear(c: Ctx, o: Offer): number {
  const m = majorById(o.major)!;
  if (o.tier === 3) return Math.round(m.azad * c.L.econ.price);
  if (o.tier === 4) return Math.round(18e6 * c.L.econ.price);
  return 0;
}

function offerChoice(c: Ctx, o: Offer): ChoiceDef {
  const t = tuitionYear(c, o);
  const fam = familyBudget(c.L.flags.rich ?? 2) * c.L.econ.price;
  return {
    label: `${majorName(o.major)} — ${o.uni}`,
    note: `${TIER_NAMES[o.tier]}${t ? `، شهریه‌ی سالانه ${money(t)}${fam >= t ? ' (خانواده می‌دن)' : ''}` : '، رایگان'}`,
    do: (c2) => {
      startUni(c2, o);
      c2.happy(o.tier <= 1 ? 20 : 8).rep(o.tier === 0 ? 10 : o.tier <= 1 ? 5 : 0);
      if (o.major === 'med' && o.tier <= 1) c2.rep(8);
      return `${o.tier <= 1 ? 'هورا! ' : ''}دانشجوی ${majorName(o.major)} ${o.uni} شدی.${o.major === 'med' ? ' فامیل از الان بهت می‌گن «آقای دکتر»!' : ''}`;
    },
  };
}

// ───────────────────────── military helpers ─────────────────────────

export function buyoutCost(c: Ctx): number {
  const top = c.L.edu.degrees.reduce((m, d) => Math.max(m, ['diploma', 'kardani', 'karshenasi', 'arshad', 'doctor', 'phd'].indexOf(d.kind)), 0);
  return Math.round([420e6, 500e6, 650e6, 850e6, 1.1e9, 1.1e9][top] * c.L.econ.price);
}

function startService(c: Ctx, months: number, place?: string) {
  const L = c.L;
  L.mil = { status: 'serving', months, place: place ?? c.pick(['پادگان آموزشی ۰۱ تهران', 'مرزبانی سیستان', 'پادگان عجب‌شیر', 'یه اداره تو شهر خودت', 'پادگان کرمان', 'پایگاه هوایی شیراز']) };
  L.home = 'barracks';
  if (L.job && !L.job.part) L.job = null;
}

// ───────────────────────── events ─────────────────────────

defEvents([
  {
    // The first choice of a life.
    id: 'm_first_word',
    milestone: true,
    emoji: '🗣️',
    title: 'اولین کلمه',
    text: (c) => `همه دورت جمع شدن و منتظرن اولین کلمه‌ات رو بگی… ${c.parent()} داره فیلم می‌گیره!`,
    choices: [
      { label: '«مامان»', do: (c) => { const m = c.rel('mother'); if (m) c.close(m, 10); return 'گفتی «مامان»! مامانت از ذوق گریه کرد و بابات یه کم حسودیش شد.'; } },
      { label: '«بابا»', do: (c) => { const f = c.rel('father'); if (f) c.close(f, 10); return 'گفتی «بابا»! بابات فیلمش رو برای کل فامیل فرستاد.'; } },
      { label: '«نه!»', do: (c) => { c.happy(3); return 'اولین کلمه‌ات «نه!» بود. همه خندیدن… ولی از اون روز به همه چی می‌گی «نه!»'; } },
      { label: '«ماشین!»', do: (c) => { c.smarts(1); return 'گفتی «ماشین!» و به پراید همسایه اشاره کردی. همه گفتن «چه باهوشه!»'; } },
    ],
  },
  {
    id: 'm_school_start',
    milestone: true,
    emoji: '🎒',
    title: 'کلاس اول!',
    text: (c) => `${c.name} جان، وقت مدرسه رفتنه. ${c.rel('father') ? 'بابات' : 'مامانت'} می‌پرسه کدوم مدرسه بری؟`,
    choices: [
      { label: 'مدرسه‌ی دولتی سر کوچه', note: 'رایگان', do: (c) => { c.L.edu.school = 'dolati'; c.happy(3); return 'رفتی مدرسه‌ی دولتی. روز اول کلی گریه کردی ولی بعدش یه دوست پیدا کردی.'; } },
      {
        label: 'مدرسه‌ی غیرانتفاعی',
        note: (c) => `شهریه‌ی سالانه ${money(c.price(80e6))}${(c.L.flags.rich ?? 2) >= 2 ? ' (خانواده می‌ده)' : ' (خانواده به زحمت می‌افته)'}`,
        do: (c) => {
          c.L.edu.school = 'gheyr';
          c.smarts(4).happy(2);
          if ((c.L.flags.rich ?? 2) < 2) { const dad = c.rel('father'); if (dad) c.close(dad, -5); c.line('💸 بابات برای شهریه‌ات وام گرفت.'); }
          return 'رفتی مدرسه‌ی غیرانتفاعی با کلاس زبان و رباتیک!';
        },
      },
    ],
  },
  {
    id: 'm_sampad',
    milestone: true,
    emoji: '🧠',
    title: 'آزمون تیزهوشان',
    text: 'آخر کلاس ششمه و معلمت می‌گه می‌تونی آزمون تیزهوشان (سمپاد) بدی. شرکت می‌کنی؟',
    choices: [
      {
        label: 'آره، کلی تست می‌زنم',
        do: (c) => {
          const chance = clamp((c.s('smarts') - 45) / 50 + (c.L.edu.gpa - 17) / 8, 0.03, 0.92);
          if (c.lucky(chance)) {
            c.L.edu.school = 'sampad';
            c.smarts(6).happy(10).rep(6);
            return 'قبول شدی! از مهر می‌ری مدرسه‌ی تیزهوشان. مامانت شیرینی پخش کرد.';
          }
          c.happy(-6);
          return `قبول نشدی. ناراحت شدی ولی ${c.rel('father') ? 'بابات' : c.parent('معلمت')} گفت «فدای سرت، مهم آدم بودنه».`;
        },
      },
      { label: 'نه، حوصله ندارم', do: (c) => { c.happy(3); return 'آزمون ندادی و تابستون رو با فوتبال تو کوچه گذروندی.'; } },
    ],
  },
  {
    id: 'm_track',
    milestone: true,
    emoji: '🧭',
    title: 'انتخاب رشته‌ی دبیرستان',
    text: (c) => `پایه‌ی نهم تموم شد و باید رشته انتخاب کنی. معدلت ${gpa(c.L.edu.gpa)} بوده. ${c.s('smarts') > 70 ? 'مشاور مدرسه می‌گه «تو ریاضی یا تجربی بخون، حیفی!»' : 'مشاور مدرسه می‌گه «هر چی دوست داری».'}`,
    dyn: (c) => TRACKS.map((t) => ({
      label: `${t.emoji} ${t.name}`,
      note: t.desc,
      do: (c2: Ctx) => {
        c2.L.edu.track = t.id;
        if (t.id === 'riazi' || t.id === 'tajrobi') c2.happy(c2.s('smarts') > 55 ? 4 : -4);
        if (t.id === 'honar') c2.happy(c2.trait('artist') ? 12 : 4);
        if (t.id === 'fani') c2.happy(3);
        const dad = c2.rel('father');
        if (dad && (t.id === 'ensani' || t.id === 'honar') && c2.chance(0.5)) {
          c2.close(dad, -6);
          return `رشته‌ی ${t.name} رو انتخاب کردی. بابات گفت «با این رشته می‌خوای چی‌کاره بشی؟!»`;
        }
        return `رشته‌ی ${t.name} رو انتخاب کردی.`;
      },
    })),
  },
  {
    id: 'm_konkur',
    milestone: true,
    emoji: '📝',
    title: 'نتایج کنکور',
    prep: (c) => {
      const L = c.L;
      if (L.edu.track === 'fani') {
        const skill = c.pick(['c_mechanic', 'c_elec', 'c_plumber']);
        c.flag(skill);
      }
      const r = konkurRank(c);
      const tries = (L.edu.konkur?.tries ?? 0) + 1;
      L.edu.konkur = { rank: r.rank, year: L.year, tries };
      L.edu.konkurClass = false;
      c.unflag('kEffort');
      return { rank: r.rank, p: r.p, n: r.n, offers: offersFor(c, r.p, L.edu.track ?? 'riazi') as unknown as Record<string, unknown> };
    },
    text: (c) => {
      const rank = c.p.rank as number;
      const t = TRACKS.find((x) => x.id === (c.L.edu.track ?? 'riazi'))!;
      const mood = rank < 100 ? 'باورت نمی‌شه! اسمت تو اخبار اومد.' : rank < 2000 ? 'عالیه! همه‌ی فامیل زنگ زدن تبریک بگن.' : rank < 20000 ? 'بد نیست! می‌تونی یه رشته‌ی خوب بیاری.' : rank < 80000 ? 'متوسط بود. خاله‌ات پرسید «پسر/دختر فلانی رتبه‌اش چند شد؟»'.replace('پسر/دختر', c.g('پسر', 'دختر')) : 'خیلی بد شد... ولی دنیا که به آخر نرسیده.';
      return `کارنامه‌ی کنکور ${t.name} اومد: رتبه‌ی ${num(rank)} از ${num(c.p.n as number)} نفر. ${mood}\nحالا چی‌کار می‌کنی؟`;
    },
    dyn: (c) => {
      const offers = c.p.offers as unknown as Offer[];
      const list: ChoiceDef[] = offers.map((o) => offerChoice(c, o));
      list.push({
        label: '🔁 یه سال دیگه پشت کنکور می‌مونم',
        note: 'سال بعد دوباره کنکور می‌دی',
        do: (c2) => {
          c2.L.edu.stage = 'school';
          c2.L.edu.grade = 13;
          c2.happy(-8);
          if (c2.male && c2.L.mil.status === 'due') c2.L.mil.status = 'na';
          c2.flag('retake');
          return 'تصمیم گرفتی یه سال دیگه بخونی. «این دفعه دیگه رتبه‌ی تک‌رقمی!»';
        },
      });
      list.push({ label: '🚶 بی‌خیال دانشگاه', note: 'می‌ری سر کار', do: (c2) => { c2.happy(2); return 'تصمیم گرفتی دانشگاه نری و زودتر پول دربیاری.'; } });
      return list;
    },
  },
  {
    id: 'm_military',
    milestone: true,
    emoji: '🪖',
    title: 'دفترچه‌ی سربازی',
    text: (c) => `${c.name} جان، وقت سربازیه. نامه‌ی اعزام اومده. ${c.L.edu.degrees.length > 1 ? 'با مدرکی که داری ممکنه امریه هم بگیری.' : ''}\nچی‌کار می‌کنی؟`,
    choices: [
      {
        label: '🪖 می‌رم سربازی',
        note: '۲۱ ماه',
        do: (c) => {
          startService(c, c.L.edu.degrees.length > 1 ? 21 : 24);
          c.happy(-10).rep(4);
          return `اعزام شدی به «${c.L.mil.place}». موهات رو از ته زدن!`;
        },
      },
      {
        label: '💸 سربازی رو می‌خرم',
        cost: (c) => buyoutCost(c),
        note: (c) => `هزینه: ${money(buyoutCost(c))}`,
        do: (c) => { c.L.mil.status = 'bought'; c.happy(10); return 'سربازی رو خریدی و کارت پایان خدمت گرفتی. خیالت راحت شد.'; },
      },
      {
        label: '🩺 می‌رم دنبال معافیت پزشکی',
        do: (c) => {
          const chance = c.s('health') < 40 ? 0.85 : c.trait('sickly') ? 0.5 : 0.08;
          if (c.lucky(chance)) { c.L.mil.status = 'exempt'; c.happy(8); return 'کمیسیون پزشکی معافت کرد!'; }
          startService(c, 24);
          c.happy(-14);
          return 'دکترهای کمیسیون گفتن «تو سالم‌تر از همه‌ی ما هستی!» و اعزامت کردن.';
        },
      },
      {
        label: '👨‍👦 کفالت پدر',
        when: (c) => { const d = c.rel('father'); return !d || c.ageOf(d) >= 70 || !c.rels('brother').length && !!d && c.ageOf(d) >= 60; },
        do: (c) => { c.L.mil.status = 'exempt'; return 'به خاطر کفالت پدر معاف شدی.'; },
      },
      {
        label: '🏢 امریه تو یه اداره نزدیک خونه (پارتی)',
        gems: 10,
        do: (c) => { startService(c, 21, 'یه اداره نزدیک خونه'); c.L.home = 'parents'; c.happy(4); return 'با پارتی رفتی امریه؛ ساعت ۲ ظهر خونه‌ای!'; },
      },
      {
        label: '🙈 نمی‌رم! غایب می‌شم',
        note: 'بدون کارت پایان خدمت: نه پاسپورت، نه کار دولتی',
        do: (c) => { c.L.mil.status = 'absent'; c.happy(2).rep(-6); return 'غایب شدی. از این به بعد از هر ایست بازرسی می‌ترسی!'; },
      },
    ],
  },
  {
    id: 'm_caught',
    milestone: true,
    emoji: '🚔',
    title: 'گیر افتادی!',
    text: 'تو ایست بازرسی، مأمور کارت پایان خدمتت رو خواست. غایب بودی و گیر افتادی!',
    choices: [
      { label: 'می‌رم خدمت (با اضافه خدمت)', do: (c) => { startService(c, 24 + Math.min(12, c.count('absentYears') * 2)); c.happy(-15); return 'با چند ماه اضافه خدمت اعزام شدی.'; } },
      {
        label: 'جریمه‌ی غیبت می‌دم و سربازی رو می‌خرم',
        cost: (c) => Math.round(buyoutCost(c) * 1.4),
        note: (c) => money(Math.round(buyoutCost(c) * 1.4)),
        do: (c) => { c.L.mil.status = 'bought'; return 'با جریمه‌ی غیبت، سربازی رو خریدی.'; },
      },
    ],
  },
  {
    id: 'm_graduate',
    milestone: true,
    emoji: '🎓',
    title: 'بعد از فارغ‌التحصیلی',
    text: (c) => {
      const d = c.L.edu.degrees[c.L.edu.degrees.length - 1];
      return `${d ? `مدرک ${majorName(d.major)} رو گرفتی.` : ''} حالا چی؟`;
    },
    choices: [
      {
        label: '📚 کنکور ارشد می‌دم',
        when: (c) => { const d = c.L.edu.degrees[c.L.edu.degrees.length - 1]; return d?.kind === 'karshenasi'; },
        do: (c) => {
          const d = c.L.edu.degrees[c.L.edu.degrees.length - 1];
          const chance = clamp((c.s('smarts') - 40) / 60 + (d.gpa - 15) / 10 + (c.has('arshadPrep') ? 0.15 : 0), 0.05, 0.92);
          if (c.lucky(chance)) {
            const tier = d.gpa > 17.5 && c.s('smarts') > 70 ? Math.max(0, d.tier - 1) : Math.min(3, d.tier + (c.chance(0.5) ? 1 : 0));
            startUni(c, { major: d.major, tier, uni: tier === 3 ? `دانشگاه آزاد واحد ${cityById(c.L.city).name}` : tier === 0 ? c.pick(TOP_UNIS[majorById(d.major)?.track ?? 'riazi']) : c.pick(GOOD_UNIS), kind: 'arshad', len: 2 });
            c.happy(10).smarts(2);
            return `ارشد ${majorName(d.major)} قبول شدی!`;
          }
          c.happy(-6);
          return 'ارشد قبول نشدی. شاید سال بعد…';
        },
      },
      {
        label: '🔬 دکترا (PhD) می‌خونم',
        when: (c) => c.L.edu.degrees[c.L.edu.degrees.length - 1]?.kind === 'arshad',
        do: (c) => {
          const d = c.L.edu.degrees[c.L.edu.degrees.length - 1];
          if (c.lucky(clamp((c.s('smarts') - 50) / 50 + (d.gpa - 16) / 8, 0.05, 0.85))) {
            startUni(c, { major: d.major, tier: d.tier, uni: d.uni, kind: 'phd', len: 5 });
            c.smarts(3).happy(6);
            return `دانشجوی دکترای ${majorName(d.major)} شدی. دیگه رسماً «دکتر» صدات می‌کنن (تقریباً).`;
          }
          c.happy(-5);
          return 'مصاحبه‌ی دکترا رو رد شدی.';
        },
      },
      { label: '💼 می‌رم دنبال کار', do: (c) => { c.happy(2); return 'رزومه‌ات رو آماده کردی. (از تب «کار» شغل پیدا کن)'; } },
    ],
  },
  {
    id: 'm_retire',
    milestone: true,
    emoji: '🪑',
    title: 'بازنشستگی',
    text: (c) => `${fa(c.age)} سالت شده. می‌تونی بازنشسته بشی و حقوق بازنشستگی بگیری.`,
    choices: [
      {
        label: 'بازنشسته می‌شم',
        do: (c) => {
          const L = c.L;
          const years = L.career.reduce((s, x) => s + x.years, 0);
          const monthly = Math.round((L.job?.salary ?? L.econ.wage) * Math.min(1, years / 30) * 0.85);
          L.pension = Math.max(monthly, Math.round(L.econ.wage * 0.8));
          L.flags.pensionPrice = Math.round(L.econ.price * 1000) / 1000;
          L.job = null;
          c.happy(12);
          return `بازنشسته شدی! حقوق بازنشستگی: ماهی ${money(L.pension)}. وقت نون‌خریدن صبح‌ها و پارک!`;
        },
      },
      { label: 'نه، هنوز جون دارم کار کنم', do: (c) => { c.happy(-2); return 'تصمیم گرفتی ادامه بدی.'; } },
    ],
  },
  {
    id: 'm_debt',
    milestone: true,
    emoji: '📛',
    title: 'بدهکاری',
    text: (c) => `بدهی‌ات به ${money(-c.cash)} رسیده و طلبکارها ول‌کن نیستن.`,
    choices: [
      {
        label: 'همه‌ی دارایی‌هام رو می‌فروشم',
        when: (c) => c.L.assets.length > 0,
        do: (c) => {
          let sum = 0;
          for (const a of c.L.assets) sum += Math.round(assetVal(c, a));
          c.L.assets = [];
          c.money(sum);
          c.happy(-10);
          return `همه چیز رو فروختی و ${money(sum)} گیرت اومد.`;
        },
      },
      {
        label: 'از خانواده قرض می‌گیرم',
        when: (c) => c.parents.length > 0 && (c.L.flags.rich ?? 2) >= 1,
        do: (c) => {
          const amt = Math.min(-c.cash, familyBudget(c.L.flags.rich ?? 2) * c.L.econ.price);
          c.money(amt);
          for (const p of c.parents) c.close(p, -10);
          return `خانواده ${money(amt)} بهت قرض دادن. ولی کلی سرزنشت کردن.`;
        },
      },
      {
        label: 'وام بانکی می‌گیرم',
        do: (c) => {
          const amt = -c.cash;
          c.money(amt);
          c.L.loans.push({ id: c.L.nextId++, name: 'وام بدهی', left: amt, yearly: Math.round(amt / 4), rate: 0.25 });
          return `${money(amt)} وام گرفتی. حالا قسط داری.`;
        },
      },
      {
        label: 'اعلام اعسار (ورشکستگی)',
        note: 'بدهی‌ها تقسیط و بخشیده می‌شه، ولی آبروت می‌ره',
        do: (c) => {
          c.money(-c.cash);
          c.rep(-15).happy(-10);
          return 'دادگاه حکم اعسارت رو داد. بدهی‌ها بخشیده شد ولی تا سال‌ها کسی بهت قرض نمی‌ده.';
        },
      },
      {
        label: 'چک بی‌محل می‌کشم',
        do: (c) => {
          if (c.lucky(0.5)) { c.money(-c.cash); return 'یکی از طلبکارها بی‌خیال شد! شانس آوردی.'; }
          sendJail(c, 1, 'چک برگشتی');
          return 'چک‌ها برگشت خورد و رفتی زندان!';
        },
      },
    ],
  },
  {
    id: 'm_funeral',
    milestone: true,
    emoji: '🖤',
    title: 'مراسم ختم',
    text: (c) => {
      const p = c.L.people.find((x) => x.id === c.p.who);
      return `${p ? c.relName(p) : 'عزیزت'} فوت کرد. ${c.abroad ? 'تو خارجی و برگشتن سخته.' : 'باید برای مراسم تصمیم بگیری.'}`;
    },
    choices: [
      { label: 'یه مراسم آبرومند تو مسجد و تالار', when: (c) => !c.abroad, cost: (c) => c.price(150e6), note: (c) => money(c.price(150e6)), do: (c) => { c.rep(8).happy(2); return 'مراسم آبرومندی گرفتی. همه گفتن «خدا رحمتش کنه، چه بچه‌ی خلفی!»'; } },
      { label: 'یه مراسم ساده', when: (c) => !c.abroad, do: (c) => { c.rep(-1); return 'یه مراسم ساده‌ی خونگی گرفتین.'; } },
      { label: 'بلیت می‌گیرم برمی‌گردم', when: (c) => c.abroad, cost: (c) => c.price(250e6), note: (c) => money(c.price(250e6)), do: (c) => { c.happy(4).rep(4); return 'برگشتی و تو مراسم بودی. دلت یه کم آروم شد.'; } },
      { label: 'از راه دور گریه می‌کنم', when: (c) => c.abroad, do: (c) => { c.happy(-10); return 'از پشت تلفن تو مراسم بودی. غربت سخته.'; } },
    ],
  },
]);

function assetVal(c: Ctx, a: Parameters<typeof assetValue>[1]) {
  return assetValue(c.L, a);
}
export function sendJail(c: Ctx, years: number, why: string) {
  sendToPrison(c, years, why);
  award(c, 'prison');
}
