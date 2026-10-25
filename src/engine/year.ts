import { CARS, SHOPS } from '../content/assets';
import { cityById, countryById } from '../content/cities';
import { DEGREE_NAMES, MAJORS, majorName } from '../content/edu';
import { jobById } from '../content/jobs';
import { petKind } from '../content/pets';
import { checkAchievements } from './achieve';
import { Ctx, clamp } from './ctx';
import { stepEcon } from './econ';
import { fa, gpa, money, ordinal } from './fmt';
import { EVENTS, eligible, txt, weightOf } from './registry';
import type { Life, LogLine, Npc } from './types';
import { assetValue, netWorth } from './wealth';

/** Yearly living cost multipliers per lifestyle (× monthly minimum wage × 12). */
export const LIFESTYLES = [
  { name: 'قناعت', emoji: '🥖', mul: 0.6 },
  { name: 'معمولی', emoji: '🏠', mul: 1.0 },
  { name: 'راحت', emoji: '🛋️', mul: 2.2 },
  { name: 'لاکچری', emoji: '💎', mul: 6 },
];

/** Allowance per year by family wealth, as a share of the yearly minimum wage. */
const ALLOWANCE = [0.03, 0.06, 0.12, 0.3, 1.0];

/** Toman a family of a given class can put towards a child's costs in a year (1405 prices). */
export function familyBudget(rich: number) {
  return [40e6, 150e6, 500e6, 2.5e9, 15e9][rich];
}

export function personAge(L: Life, n: Npc) {
  return L.year - n.born;
}

/** Annual probability of dying. */
export function mortality(age: number, health: number, ills: number): number {
  let q = age < 5 ? 0.0015 : 0.00025 * Math.exp(0.088 * (age - 25));
  const hm = health < 10 ? 8 : health < 25 ? 3.2 : health < 45 ? 1.7 : health < 70 ? 1 : 0.65;
  q = q * hm + ills * 0.012;
  return Math.min(0.85, q);
}

/** One year of life. Fills this year's log and the queue of events to show. */
export function ageUp(L: Life): void {
  if (L.dead) return;
  const c = new Ctx(L);
  L.age++;
  L.year++;
  L.used = {};
  L.queue = [];
  const entry = { age: L.age, year: L.year, lines: [] as LogLine[] };
  L.log.push(entry);
  if (L.log.length > 140) L.log.splice(0, L.log.length - 140);

  const news = stepEcon(L.econ, c.rng);
  if (L.econ.price >= 1000) redenominate(c);
  const invested = L.assets.some((a) => ['coin', 'dollar', 'stock', 'crypto'].includes(a.kind));
  if (L.age >= 16 && (invested || c.chance(0.5))) for (const n of news.slice(0, 2)) c.line(n, 'info');

  if (L.prison) prisonYear(c);
  else {
    childhood(c);
    school(c);
    university(c);
    military(c);
    work(c);
  }
  finances(c);
  family(c);
  health(c);

  // Death check: only serious illnesses add to the risk.
  const ills = L.ills.reduce((s, i) => s + i.severity * (ILL_KIND[i.id]?.risk ?? 0), 0) / 100;
  if (L.stats.health <= 0 || c.chance(mortality(L.age, L.stats.health, ills))) {
    const sick = illnessCause(L);
    die(c, sick && (L.stats.health <= 15 || ills > 0.4 || c.chance(0.5)) ? sick : L.age > 78 ? 'کهولت سن' : c.pick(['ایست قلبی', 'سکته‌ی مغزی', 'ایست قلبی', 'تصادف رانندگی']));
  } else {
    if (!L.prison) milestones(c);
    randomEvents(c);
  }

  L.peak = Math.max(L.peak, netWorth(L));
  checkAchievements(c);
  entry.lines.push(...c.extra);
  c.extra = [];
  c.commit();
}

/** The serious illness most likely to be the cause of death, if any. */
export function illnessCause(L: Life): string | null {
  const worst = L.ills.filter((i) => (ILL_KIND[i.id]?.risk ?? 0) > 0).sort((a, b) => b.severity * ILL_KIND[b.id].risk - a.severity * ILL_KIND[a.id].risk)[0];
  if (!worst) return null;
  return ILL_NAMES[worst.id] ?? 'بیماری';
}

/** Yearly severity drift range, health damage divisor and death-risk weight per illness. */
export const ILL_KIND: Record<string, { drift: [number, number]; hurt: number; risk: number }> = {
  flu: { drift: [-30, -10], hurt: 25, risk: 0.2 },
  covid: { drift: [-30, -5], hurt: 15, risk: 0.6 },
  migraine: { drift: [-7, 2], hurt: 30, risk: 0 },
  backpain: { drift: [-6, 3], hurt: 25, risk: 0 },
  kidney: { drift: [-12, 1], hurt: 20, risk: 0 },
  asthma: { drift: [-4, 3], hurt: 25, risk: 0.15 },
  depression: { drift: [-6, 4], hurt: 30, risk: 0.1 },
  diabetes: { drift: [-2, 4], hurt: 16, risk: 0.5 },
  bp: { drift: [-3, 4], hurt: 18, risk: 0.6 },
  heart: { drift: [-2, 5], hurt: 12, risk: 1.2 },
  alzheimer: { drift: [0, 5], hurt: 20, risk: 0.5 },
  cancer: { drift: [-4, 10], hurt: 9, risk: 2 },
};

export const ILL_NAMES: Record<string, string> = {
  flu: 'آنفولانزا',
  diabetes: 'دیابت',
  bp: 'فشار خون بالا',
  heart: 'بیماری قلبی',
  cancer: 'سرطان',
  depression: 'افسردگی',
  backpain: 'دیسک کمر',
  asthma: 'آسم',
  kidney: 'سنگ کلیه',
  alzheimer: 'آلزایمر',
  covid: 'کرونا',
  migraine: 'میگرن',
};

export function die(c: Ctx, cause: string) {
  const L = c.L;
  L.dead = { cause, age: L.age, year: L.year };
  L.queue = [];
  c.line(`🕊️ ${L.first} در ${fa(L.age)} سالگی بر اثر ${cause} درگذشت.`, 'big');
}

/**
 * Iran-style currency reform: once prices have grown 1000× since 1405 the government drops three
 * zeros, which keeps the numbers readable across an 80-year life.
 */
export function redenominate(c: Ctx) {
  const L = c.L;
  const k = 1000;
  const e = L.econ;
  e.price /= k; e.dollar /= k; e.coin /= k; e.m2 /= k; e.stock /= k; e.wage /= k; e.car /= k;
  L.money = Math.round(L.money / k);
  L.peak = Math.round(L.peak / k);
  for (const a of L.assets) {
    a.paid = Math.round(a.paid / k);
    if (a.kind === 'deposit') a.qty = Math.round(a.qty / k);
  }
  for (const l of L.loans) { l.left = Math.round(l.left / k); l.yearly = Math.round(l.yearly / k); }
  if (L.job) L.job.salary = Math.round(L.job.salary / k);
  if (L.pension) L.pension = Math.round(L.pension / k);
  if (L.flags.pensionPrice) L.flags.pensionPrice = L.flags.pensionPrice / k;
  c.inc('reforms');
  c.line('🏦 دولت سه صفر از پول ملی حذف کرد! حالا همه‌ی قیمت‌ها هزار برابر کوچیک‌تر شدن. مامان‌بزرگ‌ها هنوز به قیمت قدیم حساب می‌کنن!', 'big');
}

// ───────────────────────── childhood ─────────────────────────

function childhood(c: Ctx) {
  const L = c.L;
  if (L.age === 1) c.line('👶 اولین قدم‌هات رو برداشتی. همه دست زدن!', 'good');
  if (L.age === 2) c.line(`🗣️ اولین کلمه‌ات «${c.pick(['بابا', 'مامان', 'آب', 'نه!', 'ماشین', 'جیش'])}» بود.`);
  if (L.age === 5) {
    L.edu.stage = 'pre';
    c.line('🎒 رفتی پیش‌دبستانی. یه کوله‌پشتی عروسکی خریدی!');
  }
  // Allowance while young.
  if (L.age >= 6 && L.home === 'parents' && L.country === 'ir') {
    const rich = L.flags.rich ?? 2;
    const parentsAlive = c.parents.length;
    if (parentsAlive) {
      const allowance = Math.round(L.econ.wage * 12 * ALLOWANCE[rich] * (L.age < 13 ? 0.4 : L.age < 18 ? 1 : 0.6));
      if (L.age < 25 && !L.job) c.money(allowance);
    }
  }
}

// ───────────────────────── school ─────────────────────────

export function schoolGpa(c: Ctx): number {
  const L = c.L;
  const base = 9 + L.stats.smarts * 0.075 + L.edu.effort * 0.9 + (L.grit - 50) * 0.02 + c.rng.gauss(0, 1.2);
  return clamp(Math.round(base * 4) / 4, 4, 20);
}

function school(c: Ctx) {
  const L = c.L;
  if (L.age === 6 && L.edu.stage === 'pre') {
    L.edu.stage = 'school';
    L.edu.grade = 1;
    c.queue('m_school_start');
    return;
  }
  if (L.edu.stage !== 'school') return;
  if (L.edu.grade >= 13) {
    // A year behind the konkur.
    c.inc('kEffort', Math.round(L.edu.effort * 1.3) + 1);
    L.edu.effort = 0;
    L.edu.stage = 'none';
    c.line('📚 یه سال تموم پشت کنکور خوندی. وقت کنکوره!');
    c.queue('m_konkur');
    return;
  }
  // Report card for the year that just finished.
  const g = schoolGpa(c);
  L.edu.gpa = g;
  const passed = g >= 10 || c.chance(0.5);
  const kind = g >= 18 ? 'good' : g < 12 ? 'bad' : undefined;
  const grade = L.edu.grade;
  if (!passed) {
    c.line(`📉 کلاس ${ordinal(grade)} رو با معدل ${gpa(g)} رد شدی و باید دوباره بخونی!`, 'bad');
    c.happy(-12).rep(-4);
  } else {
    c.line(`📘 کلاس ${ordinal(grade)} تموم شد. معدل: ${gpa(g)}`, kind);
    if (g >= 19.5) c.happy(5).rep(2);
    if (g < 12) c.happy(-4);
    L.edu.grade++;
  }
  if (L.edu.grade >= 11) c.inc('kEffort', L.edu.effort);
  L.edu.effort = 0;
  if (passed && grade === 6) c.queue('m_sampad');
  if (passed && grade === 9) c.queue('m_track');
  if (passed && grade === 12) {
    L.edu.stage = 'none';
    L.edu.degrees.push({ kind: 'diploma', major: L.edu.track ?? 'riazi', uni: 'دبیرستان', tier: 0, gpa: g });
    c.line(L.edu.track === 'fani' ? '🎓 دیپلم فنی‌وحرفه‌ای گرفتی!' : '🎓 دیپلم گرفتی!', 'good');
    c.queue('m_konkur');
  }
}

// ───────────────────────── university ─────────────────────────

function university(c: Ctx) {
  const L = c.L;
  const u = L.edu.uni;
  if (L.edu.stage !== 'uni' || !u) return;
  const g = clamp(10 + L.stats.smarts * 0.06 + L.edu.effort * 0.8 + (L.grit - 50) * 0.02 + c.rng.gauss(0, 1.1), 8, 20);
  u.gpa = Math.round(((u.gpa * (u.year - 1) + g) / u.year) * 100) / 100;
  L.edu.effort = 0;
  // Tuition.
  const tuition = tuitionFor(c);
  if (tuition > 0) {
    const fam = familyBudget(L.flags.rich ?? 2) * L.econ.price;
    if (c.parents.length && fam >= tuition && L.age < 32 && L.home !== 'own') c.line(`💸 خانواده شهریه‌ی امسالت (${money(tuition)}) رو دادن.`);
    else {
      c.money(-tuition);
      c.line(`💸 شهریه‌ی امسال: ${money(tuition)}`, 'bad');
    }
  }
  if (u.year >= u.length) {
    L.edu.degrees.push({ kind: u.kind, major: u.major, uni: u.uni, tier: u.tier, gpa: u.gpa });
    L.edu.uni = undefined;
    L.edu.stage = 'none';
    c.happy(10).rep(5).smarts(3);
    c.line(`🎓 فارغ‌التحصیل شدی! ${DEGREE_NAMES[u.kind]} ${majorName(u.major)} از ${u.uni} با معدل ${gpa(u.gpa)}`, 'big');
    if (L.mil.status === 'deferred') L.mil.status = 'due';
    if (L.home === 'dorm') L.home = c.parents.length ? 'parents' : 'rent';
    c.queue('m_graduate');
  } else {
    u.year++;
    c.line(`🏫 سال ${ordinal(u.year)} ${majorName(u.major)} رو شروع کردی. معدل کل: ${gpa(u.gpa)}`);
  }
}

export function tuitionFor(c: Ctx): number {
  const u = c.L.edu.uni;
  if (!u || u.abroad) return 0;
  const azad = (majorTuition(u.major) || 60e6) * c.L.econ.price;
  if (u.tier === 3) return azad;
  if (u.tier === 4) return 18e6 * c.L.econ.price;
  return 0;
}

function majorTuition(id: string) {
  return MAJORS.find((m) => m.id === id)?.azad ?? 60e6;
}

// ───────────────────────── military ─────────────────────────

function military(c: Ctx) {
  const L = c.L;
  if (L.gender !== 'm' || L.country !== 'ir') return;
  const m = L.mil;
  if (m.status === 'serving') {
    m.months = (m.months ?? 21) - 12;
    if (m.months <= 0) {
      m.status = 'done';
      L.home = 'parents';
      c.happy(15).rep(5);
      c.line('🎖️ سربازیت تموم شد! کارت پایان خدمت رو گرفتی. آزادی!', 'big');
    } else {
      c.line(`🪖 یه سال دیگه از سربازی گذشت؛ ${fa(m.months)} ماه مونده.`);
    }
    return;
  }
  if (m.status === 'na' && L.age >= 18 && L.edu.stage !== 'school' && L.edu.stage !== 'uni') {
    m.status = 'due';
  }
  if (m.status === 'due' && L.age >= 19 && L.edu.stage !== 'uni' && !L.queue.some((q) => q.id === 'm_konkur' || q.id === 'm_graduate')) {
    c.queue('m_military');
  }
  if (m.status === 'absent') {
    c.inc('absentYears');
    if (c.chance(0.06)) c.queue('m_caught');
  }
}

export function milCardOk(L: Life) {
  return L.gender === 'f' || ['done', 'exempt', 'bought'].includes(L.mil.status);
}

// ───────────────────────── work ─────────────────────────

export function salaryOf(L: Life): number {
  const j = L.job;
  if (!j) return 0;
  const d = jobById(j.id);
  if (!d) return 0;
  const perf = 0.85 + (j.perf / 100) * 0.3;
  if (L.country !== 'ir') {
    const co = countryById(L.country);
    const usd = (co?.usd ?? 2000) * [0.45, 1, 1.8][d.tier] * Math.pow(1.12, j.level) * perf;
    return Math.round(usd * L.econ.dollar);
  }
  let pay = d.pay * L.econ.wage * Math.pow(d.growth, j.level) * perf;
  if (j.id === 'footballer' || j.id === 'actor' || j.id === 'singer') pay *= 1 + L.followers / 2_000_000;
  return Math.round(pay);
}

function work(c: Ctx) {
  const L = c.L;
  const j = L.job;
  if (!j) {
    if (L.age >= 22 && L.edu.stage === 'none' && L.mil.status !== 'serving' && !L.pension && L.age < 60) {
      c.inc('jobless');
      if (c.count('jobless') >= 2) c.happy(-3);
    }
    if (L.pension) c.money(L.pension * 12 * L.econ.price / (L.flags.pensionPrice ?? 1));
    return;
  }
  const d = jobById(j.id);
  if (!d) { L.job = null; return; }
  if (d.part && L.edu.stage !== 'school' && L.edu.stage !== 'uni' && L.age > 24) {
    c.line(`👋 دیگه دانشجو نیستی؛ کار پاره‌وقت «${d.title}» رو گذاشتی کنار.`);
    L.job = null;
    return;
  }
  L.flags.jobless = 0;
  const years = L.year - j.since;
  j.perf = clamp(j.perf + c.rng.gauss((L.grit - 50) / 25, 6) + (L.stats.smarts - 50) / 40);
  j.salary = salaryOf(L);
  c.money(j.salary * 12);
  c.happy(-Math.round(d.stress * 3)).health(-Math.round(d.stress * 1.5));
  const car = L.career.find((x) => x.id === j.id);
  if (car) car.years++;
  // Promotion or firing.
  if (j.level < d.levels.length - 1 && years >= 2 && j.perf > 65 && c.lucky(0.22 + (j.perf - 65) / 100)) {
    j.level++;
    j.perf = Math.max(50, j.perf - 15);
    j.salary = salaryOf(L);
    c.happy(10).rep(4);
    c.line(`🎉 ترفیع گرفتی! حالا «${d.levels[j.level]}» هستی. حقوق ماهانه: ${money(j.salary)}`, 'big');
  } else if (j.perf < 22 && c.chance(0.45)) {
    c.line(`🚪 به خاطر عملکرد ضعیف از «${d.title}» اخراج شدی.`, 'bad');
    c.happy(-15).rep(-6);
    L.job = null;
  } else if (!d.gov && c.chance(0.035)) {
    c.line(`📉 شرکت تعدیل نیرو کرد و تو هم جزوشون بودی. بیکار شدی.`, 'bad');
    c.happy(-12);
    L.job = null;
  } else {
    c.line(`💼 یه سال دیگه «${d.levels[j.level]}» بودی. حقوق ماهانه: ${money(j.salary)}`);
  }
}

// ───────────────────────── money ─────────────────────────

export function spouseEarns(n: Npc): boolean {
  return !!n.job && !/خانه‌دار|بیکار|دانشجو/.test(n.job);
}

export function livingCost(L: Life): number {
  const e = L.econ;
  if (L.home === 'barracks' || L.age < 18) return 0;
  if (L.home === 'parents') return L.job && !L.job.part ? Math.round(L.econ.wage * 12 * 0.25) : 0;
  const spouse = L.people.some((p) => p.rel === 'spouse' && p.alive) ? 0.6 : 0;
  const kids = L.people.filter((p) => p.rel === 'child' && p.alive && L.year - p.born < 22).length * 0.4;
  const ls = LIFESTYLES[L.lifestyle] ?? LIFESTYLES[1];
  if (L.country !== 'ir') {
    const co = countryById(L.country);
    return Math.round((co?.cost ?? 25000) * e.dollar * (0.6 + ls.mul / 3.5) * (1 + spouse + kids));
  }
  const cityMul = Math.pow(cityById(L.city).mul, 0.3);
  if (L.home === 'dorm') return Math.round(e.wage * 12 * 0.35);
  return Math.round(e.wage * 12 * ls.mul * cityMul * (1 + spouse + kids));
}

export function rentCost(L: Life): number {
  if (L.home !== 'rent') return 0;
  const area = [35, 55, 85, 140][L.lifestyle] ?? 55;
  return Math.round(area * L.econ.m2 * cityById(L.city).mul * 0.035);
}

function finances(c: Ctx) {
  const L = c.L;
  const e = L.econ;
  let living = livingCost(L);
  // Families support students in the dorm.
  if (L.home === 'dorm' && c.parents.length && (L.flags.rich ?? 2) >= 1) {
    living = 0;
  }
  const rent = rentCost(L);
  const sp = L.people.find((p) => p.rel === 'spouse' && p.alive);
  if (sp && spouseEarns(sp) && L.year - sp.born < 65) {
    const inc = L.country === 'ir' ? Math.round(L.econ.wage * 12 * (1.2 + (sp.smarts ?? 50) / 40)) : Math.round(2200 * 12 * L.econ.dollar);
    c.money(inc);
  }
  if (living) c.money(-living);
  if (rent) {
    c.money(-rent);
    c.line(`🏠 اجاره‌خونه‌ی امسال: ${money(rent)}`, 'bad');
  }
  // Loans.
  for (const loan of L.loans) {
    const pay = Math.min(loan.left * (1 + loan.rate), loan.yearly);
    c.money(-pay);
    loan.left = Math.max(0, Math.round(loan.left * (1 + loan.rate) - pay));
  }
  const paid = L.loans.filter((l) => l.left <= 0);
  for (const l of paid) c.line(`✅ قسط‌های «${l.name}» تموم شد!`, 'good');
  L.loans = L.loans.filter((l) => l.left > 0);
  // Assets.
  for (const a of L.assets) {
    if (a.kind === 'deposit') {
      const interest = Math.round(a.qty * e.rate);
      a.qty += interest;
    }
    if (a.kind === 'car') {
      a.cond = Math.max(10, (a.cond ?? 100) - c.int(4, 9));
      const def = CARS.find((x) => x.id === a.ref);
      const upkeep = Math.round(assetValue(L, a) * 0.03);
      c.money(-upkeep);
      if (def && c.chance(def.breaks * 0.4)) {
        const fix = Math.round(assetValue(L, a) * c.rng.range(0.03, 0.1));
        c.money(-fix);
        c.happy(-3);
        c.line(`🔧 ${a.name}ت خراب شد و ${money(fix)} خرج تعمیرش کردی.`, 'bad');
      }
    }
    if (a.kind === 'house' && a.rented) {
      const income = Math.round(assetValue(L, a) * 0.04);
      c.money(income);
      c.line(`🔑 اجاره‌ی ${a.name}: ${money(income)}`, 'good');
    }
    if (a.kind === 'shop') {
      const def = SHOPS.find((s) => s.id === a.ref)!;
      const capital = def.cost * e.price;
      let profit = capital * (def.ret + c.rng.gauss(0, def.risk * 0.5)) * (0.6 + L.stats.smarts / 125);
      if (c.lucky(0.04 * def.risk) && profit < 0) profit *= 2;
      profit = Math.round(profit);
      c.money(profit);
      a.cond = clamp((a.cond ?? 100) + (profit > 0 ? 3 : -10), 10, 150);
      c.line(profit >= 0 ? `${def.emoji} ${a.name} امسال ${money(profit)} سود داد.` : `${def.emoji} ${a.name} امسال ${money(-profit)} ضرر داد.`, profit >= 0 ? 'good' : 'bad');
      if ((a.cond ?? 100) <= 20 && c.chance(0.5)) {
        L.assets = L.assets.filter((x) => x !== a);
        c.happy(-15);
        c.line(`💥 ${a.name} ورشکست شد و درش رو بستی.`, 'bad');
      }
    }
  }
  // Broke: cut back before the debt spirals.
  if (L.money < 0 && L.home === 'rent' && c.parents.length && !c.spouse) {
    L.home = 'parents';
    c.line('📦 پولت ته کشید و نتونستی اجاره بدی؛ وسایلت رو جمع کردی و برگشتی خونه‌ی بابا اینا.', 'bad');
    c.happy(-6);
  } else if (L.money < 0 && L.lifestyle > 0 && L.home !== 'parents') {
    L.lifestyle--;
    c.line('🪙 پول کم آوردی و مجبور شدی خرجت رو کم کنی.', 'bad');
  }
  // Debt pain.
  if (L.money < 0) {
    c.inc('debtYears');
    c.happy(-5);
    if (L.money < -L.econ.wage * 24 && c.count('debtYears') >= 3 && c.since('debtCall') >= 3) {
      c.flag('debtCall');
      c.queue('m_debt');
    }
  } else if (c.has('debtYears')) {
    c.unflag('debtYears');
  }
}

// ───────────────────────── family ─────────────────────────

function family(c: Ctx) {
  const L = c.L;
  for (const p of L.people) {
    if (!p.alive) continue;
    const age = L.year - p.born;
    // Relationships cool a little every year unless you keep in touch.
    if (['friend', 'brother', 'sister', 'grandpa', 'grandma'].includes(p.rel)) p.close = clamp(p.close - c.int(0, 4));
    if (p.rel === 'spouse') p.close = clamp(p.close - c.int(0, 3));
    if (p.rel === 'crush' && c.chance(0.3)) { p.alive = false; continue; }
    let q = age < 40 ? 0.0008 : 0.0003 * Math.exp(0.088 * (age - 25));
    if (p.rel === 'grandpa' || p.rel === 'grandma') q *= 1.15;
    if (age > 104) q = 1;
    if (c.chance(Math.min(0.9, q))) {
      p.alive = false;
      p.died = L.year;
      relativeDied(c, p);
    }
  }
  petsYear(c);
  // Engaged for a year or more: the families want a wedding date.
  const fiance = L.people.find((p) => p.rel === 'fiance' && p.alive);
  if (fiance && !L.prison) {
    fiance.flags = { ...(fiance.flags ?? {}), since: fiance.flags?.since ?? L.year - 1 };
    if (L.year - fiance.flags.since >= 1 && !L.queue.some((q) => q.id === 'wedding')) c.queue('wedding');
  }
  // Kids leaving the nest.
  for (const k of c.kids) {
    const age = L.year - k.born;
    if (age === 7) c.line(`🎒 ${c.relName(k)} کلاس اولی شد!`);
    if (age === 18) c.line(`🎓 ${c.relName(k)} دیپلم گرفت.`);
  }
}

function petsYear(c: Ctx) {
  const L = c.L;
  for (const p of c.pets) {
    const age = L.year - p.born;
    p.close = clamp(p.close - c.int(1, 4));
    if (age >= p.life || c.chance(age > p.life * 0.7 ? 0.08 : 0.01)) {
      p.alive = false;
      p.died = L.year;
      c.happy(-Math.round(4 + p.close / 10));
      c.line(`🌈 ${c.petName(p)}${age >= 2 ? ` بعد از ${fa(age)} سال` : ''} از پیشت رفت. جاش خیلی خالیه.`, 'bad');
      continue;
    }
    // Food and the vet (parents pay for a kid's pet); a pet you love keeps you cheerful.
    if (L.age >= 18) c.money(-c.price(petKind(p.kind).care));
    if (p.close >= 50) c.happy(1);
    if (p.kind === 'dog' && p.close >= 50) c.health(1);
  }
}

function relativeDied(c: Ctx, p: Npc) {
  const L = c.L;
  const close = ['father', 'mother', 'spouse', 'child'].includes(p.rel);
  c.happy(close ? -25 : -10);
  c.line(`🖤 ${c.relName(p)} در ${fa(L.year - p.born)} سالگی فوت کرد. خدا رحمتش کنه.`, 'bad');
  if (p.rel === 'spouse') {
    L.mehr = undefined;
    c.flag('widowed');
  }
  // Inheritance from parents (once both are gone) and grandparents.
  if ((p.rel === 'father' || p.rel === 'mother') && !c.parents.length) {
    const kids = L.people.filter((x) => (x.rel === 'brother' || x.rel === 'sister') && x.alive).length + 1;
    const estate = familyBudget(L.flags.rich ?? 2) * L.econ.price * c.rng.range(2, 5);
    const share = Math.round(estate / kids);
    c.money(share);
    c.line(`📜 سهم‌الارثت از پدر و مادر: ${money(share)}`, 'big');
  }
  if ((p.rel === 'grandpa' || p.rel === 'grandma') && c.chance(0.4)) {
    const gift = Math.round(L.econ.wage * c.int(1, 8) * ((L.flags.rich ?? 2) + 1));
    c.money(gift);
    c.line(`📜 از ارث ${p.rel === 'grandpa' ? 'آقاجون' : 'مادرجون'} ${money(gift)} به تو رسید.`, 'good');
  }
  if (p.rel === 'father' || p.rel === 'mother') c.queue('m_funeral', { who: p.id });
}

// ───────────────────────── health ─────────────────────────

function health(c: Ctx) {
  const L = c.L;
  const a = L.age;
  let d = 0;
  if (a > 30) d -= c.rng.range(0, 0.8);
  if (a > 50) d -= c.rng.range(0, 1.5);
  if (a > 65) d -= c.rng.range(0.5, 2.5);
  if (a > 80) d -= c.rng.range(1, 3.5);
  if (a < 30 && L.stats.health < 70) d += 1;
  if (c.trait('athlete')) d += 0.6;
  if (c.trait('sickly')) d -= 0.6;
  if ('smoker' in L.flags) d -= 1;
  c.health(Math.round(d));
  if (a > 35) c.looks(-c.int(0, a > 55 ? 2 : 1));
  // Happiness and reputation drift back towards the middle.
  c.happy(Math.round((60 - L.stats.happy) * 0.08));
  c.rep(Math.round((50 - L.stats.rep) * 0.06));
  for (const ill of L.ills) {
    const k = ILL_KIND[ill.id] ?? { drift: [-5, 3], hurt: 20, risk: 0 };
    ill.severity = clamp(ill.severity + c.int(k.drift[0], k.drift[1]));
    c.health(-Math.round(ill.severity / k.hurt));
    c.happy(-Math.round(ill.severity / 25));
  }
  const healed = L.ills.filter((i) => i.severity <= 0);
  for (const i of healed) c.line(`💚 ${ILL_NAMES[i.id] ?? 'بیماری'}ت خوب شد.`, 'good');
  L.ills = L.ills.filter((i) => i.severity > 0);
}

// ───────────────────────── prison ─────────────────────────

function prisonYear(c: Ctx) {
  const L = c.L;
  const p = L.prison!;
  c.happy(-8).health(-2).rep(-1);
  if (L.year >= p.until) {
    L.prison = undefined;
    c.line('🔓 از زندان آزاد شدی! هوای آزاد چه خوبه.', 'big');
    c.happy(15);
  } else {
    c.line(`⛓️ هنوز توی زندانی (${p.why}). ${fa(p.until - L.year)} سال دیگه مونده.`, 'bad');
  }
}

export function sendToPrison(c: Ctx, years: number, why: string) {
  const L = c.L;
  L.prison = { until: L.year + years, why };
  c.inc(`jail:${why}`);
  if (L.job) { c.line(`💼 شغلت رو از دست دادی.`, 'bad'); L.job = null; }
  c.rep(-20).happy(-20);
}

// ───────────────────────── milestones & random events ─────────────────────────

function milestones(c: Ctx) {
  const L = c.L;
  if (L.age === 60 && L.job && !L.pension) c.queue('m_retire');
  if (L.age === 100) c.line('🎂 صد ساله شدی! تو محل همه می‌خوان باهات عکس بگیرن.', 'big');
}

/** How many random events this year. */
function eventCount(c: Ctx): number {
  const a = c.L.age;
  const base = a < 4 ? 0.6 : a < 13 ? 1.3 : a < 70 ? 1.7 : 1.2;
  let n = Math.floor(base);
  if (c.chance(base - n)) n++;
  if (c.L.queue.length >= 2) n = Math.min(n, 1);
  return n;
}

export function randomEvents(c: Ctx, n = eventCount(c)) {
  const L = c.L;
  const pool = [...EVENTS.values()].filter((e) => eligible(e, c));
  for (let i = 0; i < n && pool.length; i++) {
    const e = c.rng.weighted(pool, (x) => weightOf(x, c));
    if (!e) break;
    pool.splice(pool.indexOf(e), 1);
    // An event fired earlier this year may have changed things.
    if (!eligible(e, c)) { i--; continue; }
    fire(c, e.id);
  }
  void L;
}

/** Start an event now: passive ones apply immediately, interactive ones are queued. */
export function fire(c: Ctx, id: string, p?: Record<string, unknown>) {
  const L = c.L;
  const e = EVENTS.get(id);
  if (!e) return;
  const ec = new Ctx(L, p ?? {});
  ec.rng = c.rng;
  if (e.prep) {
    const params = e.prep(ec);
    if (!params) return;
    ec.p = { ...ec.p, ...params, _prep: 1 };
  }
  L.seen[e.id] = L.year;
  if (e.auto) {
    const t = e.auto(ec);
    if (t) {
      c.line(t, e.kind);
      if (e.pop) L.queue.push({ id: '_notice', p: { emoji: txt(e.emoji, ec), title: txt(e.title, ec), text: t, d: ec.deltas } });
    }
    c.extra.push(...ec.extra);
    for (const [k, v] of Object.entries(ec.deltas)) c.deltas[k as keyof typeof c.deltas] = (c.deltas[k as keyof typeof c.deltas] ?? 0) + (v ?? 0);
    return;
  }
  L.queue.push({ id: e.id, p: ec.p });
}
