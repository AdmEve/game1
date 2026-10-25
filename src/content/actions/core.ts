import { award } from '../../engine/achieve';
import { clamp, type Ctx } from '../../engine/ctx';
import { fa, money } from '../../engine/fmt';
import { applyJob, jobList } from '../../engine/hire';
import { defActions } from '../../engine/registry';
import { ILL_NAMES, LIFESTYLES, familyBudget, livingCost, rentCost, salaryOf } from '../../engine/year';
import { jobById } from '../jobs';

export const GROUPS: { id: string; name: string; emoji: string }[] = [
  { id: 'edu', name: 'درس', emoji: '📚' },
  { id: 'job', name: 'کار', emoji: '💼' },
  { id: 'body', name: 'سلامت و ظاهر', emoji: '💪' },
  { id: 'mind', name: 'ذهن و مهارت', emoji: '🧠' },
  { id: 'fun', name: 'تفریح و سفر', emoji: '🎡' },
  { id: 'money', name: 'پول و سرمایه', emoji: '💰' },
  { id: 'home', name: 'خونه و زندگی', emoji: '🏠' },
  { id: 'love', name: 'عشق و ازدواج', emoji: '💞' },
  { id: 'social', name: 'اجتماعی', emoji: '📱' },
  { id: 'abroad', name: 'مهاجرت', emoji: '✈️' },
];

const studying = (c: Ctx) => c.L.edu.stage === 'school' || c.L.edu.stage === 'uni';
const free = (c: Ctx) => !c.L.prison;

/** Parents pay for kids' classes when the family can afford it. */
function familyPays(c: Ctx, cost: number) {
  return c.L.home === 'parents' && c.parents.length > 0 && familyBudget(c.L.flags.rich ?? 2) * c.L.econ.price * 0.3 >= cost && c.age < 25;
}

function payOrFamily(c: Ctx, cost: number): string {
  if (familyPays(c, cost)) return ' (خانواده پولش رو داد)';
  c.money(-cost);
  return '';
}

defActions([
  // ───────── edu ─────────
  {
    id: 'study', group: 'edu', emoji: '📖', limit: 2,
    label: (c) => (c.L.edu.stage === 'uni' ? 'درس خوندن' : c.L.edu.grade >= 13 ? 'تست زدن برای کنکور' : 'درس خوندن'),
    desc: 'معدل بهتر، هوش بیشتر',
    when: (c) => studying(c) && c.age >= 7 && free(c),
    do: (c) => {
      c.L.edu.effort += 1;
      c.smarts(c.chance(0.6) ? 1 : 0).happy(-1);
      return c.pick(['نشستی پای درس و حسابی خوندی.', 'کتاب‌ها رو باز کردی و تا نصفه‌شب خوندی.', 'رفتی کتابخونه و درس خوندی. (البته نصف وقت رو با گوشی گذروندی!)']);
    },
  },
  {
    id: 'cram', group: 'edu', emoji: '🌙',
    label: 'شب‌بیداری و درس‌خوندن شدید', desc: 'خیلی مؤثر، ولی خسته‌کننده',
    when: (c) => studying(c) && c.age >= 11 && free(c),
    do: (c) => {
      c.L.edu.effort += 2;
      c.smarts(1).happy(-4).health(-2);
      return 'با چایی و نسکافه تا صبح بیدار موندی و خوندی. چشمات قرمز شد!';
    },
  },
  {
    id: 'konkur_class', group: 'edu', emoji: '🏫',
    label: 'ثبت‌نام کلاس کنکور', desc: (c) => `هزینه: ${money(c.price(70e6))}`,
    when: (c) => c.L.edu.stage === 'school' && c.L.edu.grade >= 11 && !c.L.edu.konkurClass && c.L.edu.track !== 'fani',
    off: (c) => (!familyPays(c, c.price(70e6)) && c.cash < c.price(70e6) ? 'پول کافی نداری' : false),
    do: (c) => {
      const note = payOrFamily(c, c.price(70e6));
      c.L.edu.konkurClass = true;
      c.happy(-2);
      return `تو یه آموزشگاه معروف کنکور ثبت‌نام کردی${note}. استادش می‌گه «تضمینی رتبه‌ی زیر هزار!»`;
    },
  },
  {
    id: 'cheat', group: 'edu', emoji: '🤫',
    label: 'تقلب سر امتحان', desc: 'ریسکیه!',
    when: (c) => studying(c) && c.age >= 10 && free(c),
    do: (c) => {
      if (c.lucky(0.6)) { c.L.edu.effort += 1; c.happy(2); return 'برگه‌ی تقلب رو زیر آستینت قایم کردی و جواب داد!'; }
      c.L.edu.effort -= 1;
      c.rep(-8).happy(-6);
      return 'مراقب امتحان مچت رو گرفت و برگه‌ات رو صفر کرد. به خانواده‌ات هم زنگ زدن!';
    },
  },
  {
    id: 'dropout', group: 'edu', emoji: '🚪',
    label: 'انصراف از دانشگاه', confirm: 'مطمئنی می‌خوای انصراف بدی؟',
    when: (c) => c.L.edu.stage === 'uni',
    do: (c) => {
      const u = c.L.edu.uni!;
      c.L.edu.uni = undefined;
      c.L.edu.stage = 'none';
      c.L.edu.dropped = true;
      if (c.male && c.L.mil.status === 'deferred') c.L.mil.status = 'due';
      if (c.L.home === 'dorm') c.L.home = 'parents';
      c.happy(-5).rep(-6);
      for (const p of c.parents) c.close(p, -10);
      return `از ${u.uni} انصراف دادی. مامانت دو روز باهات حرف نزد.`;
    },
  },
  {
    id: 'residency', group: 'edu', emoji: '🩻',
    label: 'آزمون دستیاری تخصص', desc: 'برای پزشک‌ها: ۴ سال تخصص',
    when: (c) => c.L.edu.degrees.some((d) => d.major === 'med') && !c.has('residency') && c.L.edu.stage === 'none' && c.age < 45,
    do: (c) => {
      if (c.lucky(clamp((c.s('smarts') - 40) / 55, 0.1, 0.85))) {
        c.L.edu.stage = 'uni';
        c.L.edu.uni = { kind: 'doctor', major: 'med', uni: c.pick(['علوم پزشکی تهران', 'علوم پزشکی شیراز', 'علوم پزشکی مشهد']), tier: 1, year: 1, length: 4, gpa: 0 };
        c.flag('residency');
        if (c.L.job) c.L.job = null;
        c.happy(10).rep(6);
        return `دستیاری ${c.pick(['قلب', 'جراحی عمومی', 'زنان', 'پوست', 'چشم', 'ارتوپدی', 'رادیولوژی'])} قبول شدی! چهار سال کشیک در پیشه.`;
      }
      c.happy(-6);
      return 'دستیاری قبول نشدی. سال دیگه دوباره امتحان کن.';
    },
  },
  {
    id: 'bar_exam', group: 'edu', emoji: '⚖️',
    label: 'آزمون وکالت', desc: 'برای فارغ‌التحصیل‌های حقوق',
    when: (c) => c.L.edu.degrees.some((d) => d.major === 'law') && !c.has('bar'),
    do: (c) => {
      if (c.lucky(clamp((c.s('smarts') - 35) / 60, 0.08, 0.8))) { c.flag('bar'); c.happy(10); return 'آزمون وکالت رو قبول شدی! حالا می‌تونی پروانه بگیری.'; }
      c.happy(-5);
      return 'آزمون وکالت رو رد شدی. ظرفیت کم بود.';
    },
  },
  // ───────── job ─────────
  {
    id: 'job_search', group: 'job', emoji: '🔎', limit: 3,
    label: (c) => (c.L.job ? 'دنبال یه کار بهتر' : 'دنبال کار گشتن'),
    when: (c) => c.age >= 15 && free(c) && !c.L.pension,
    options: (c) => jobList(c.L).map(({ job, block }) => {
      const tmp = { ...c.L, job: { id: job.id, since: c.L.year, perf: 55, level: 0, salary: 0 } };
      const pay = salaryOf(tmp);
      return { id: job.id, label: job.title, emoji: job.emoji, desc: block ? undefined : `حقوق: حدود ${money(pay)} در ماه`, off: block ?? undefined };
    }),
    do: (c, opt) => {
      const j = jobById(opt!.id)!;
      if (c.L.job?.id === j.id) return 'همین الان همین کار رو داری!';
      return applyJob(c, j);
    },
  },
  {
    id: 'job_connections', group: 'job', emoji: '🤝', gems: 10,
    label: 'استخدام با پارتی', desc: 'هر کاری که شرایطش رو داری، تضمینی',
    when: (c) => c.age >= 18 && free(c) && !c.L.pension,
    options: (c) => jobList(c.L).filter((x) => !x.block).map(({ job }) => ({ id: job.id, label: job.title, emoji: job.emoji, gems: 10 })),
    do: (c, opt) => applyJob(c, jobById(opt!.id)!, true),
  },
  {
    id: 'work_hard', group: 'job', emoji: '🔥',
    label: 'سخت‌تر کار کردن', desc: 'شانس ترفیع بیشتر',
    when: (c) => !!c.L.job && free(c),
    do: (c) => {
      c.L.job!.perf = clamp(c.L.job!.perf + c.int(6, 14));
      c.happy(-2).health(-1);
      return c.pick(['اضافه‌کاری موندی و رئیست دید!', 'همه‌ی کارهای عقب‌افتاده رو تموم کردی.', 'تو جلسه یه ایده‌ی خوب دادی و همه تشویقت کردن.']);
    },
  },
  {
    id: 'ask_raise', group: 'job', emoji: '💵',
    label: 'درخواست افزایش حقوق',
    when: (c) => !!c.L.job && !c.L.job.part,
    do: (c) => {
      const j = c.L.job!;
      if (j.perf > 60 && c.lucky(0.45)) {
        j.perf = clamp(j.perf - 5);
        c.flag('raise_' + c.L.year);
        const bonus = Math.round(j.salary * c.rng.range(0.1, 0.25));
        c.money(bonus * 12);
        c.happy(8);
        return `رئیس قبول کرد! ماهی ${money(bonus)} به حقوقت اضافه شد (برای امسال).`;
      }
      j.perf = clamp(j.perf - 6);
      c.happy(-5);
      return c.pick(['رئیس گفت «الان شرایط شرکت خوب نیست، سال دیگه».', 'رئیس خندید و گفت «همینم که می‌گیری از سرت زیاده».']);
    },
  },
  {
    id: 'quit', group: 'job', emoji: '👋', confirm: 'مطمئنی می‌خوای استعفا بدی؟',
    label: (c) => `استعفا از «${jobById(c.L.job!.id)?.title ?? 'کار'}»`,
    when: (c) => !!c.L.job,
    do: (c) => {
      const t = jobById(c.L.job!.id)?.title;
      c.L.job = null;
      c.happy(4);
      return `از کارت (${t}) استعفا دادی. حس آزادی داری… فعلاً!`;
    },
  },
  {
    id: 'retire', group: 'job', emoji: '🪑',
    label: 'بازنشستگی',
    when: (c) => !!c.L.job && c.age >= 55 && !c.L.pension,
    do: (c) => {
      const L = c.L;
      const years = L.career.reduce((s, x) => s + x.years, 0);
      L.pension = Math.max(Math.round((L.job?.salary ?? L.econ.wage) * Math.min(1, years / 30) * 0.85), Math.round(L.econ.wage * 0.8));
      L.flags.pensionPrice = Math.round(L.econ.price * 1000) / 1000;
      L.job = null;
      c.happy(10);
      return `بازنشسته شدی. حقوق بازنشستگی: ماهی ${money(L.pension)}`;
    },
  },
  // ───────── body ─────────
  {
    id: 'gym', group: 'body', emoji: '🏋️',
    label: 'باشگاه', desc: (c) => `سلامت و ظاهر بهتر، ${money(c.price(4e6))}`,
    cost: (c) => (c.age < 18 ? 0 : c.price(4e6)),
    when: (c) => c.age >= 12 && free(c),
    do: (c) => {
      c.health(c.int(2, 5)).looks(c.int(1, 3)).happy(2);
      if (c.lucky(0.05)) { c.health(-8); return 'وزنه‌ی سنگین زدی و کمرت گرفت! چند هفته خونه‌نشین شدی.'; }
      return c.pick(['تو باشگاه حسابی تمرین کردی. عضله‌ها کم‌کم دارن پیدا می‌شن!', 'مربی باشگاه گفت «استعداد داری!»', 'دویدی، وزنه زدی، و یه سلفی جلوی آینه گرفتی.']);
    },
  },
  {
    id: 'park', group: 'body', emoji: '🏃',
    label: 'پیاده‌روی تو پارک', desc: 'رایگان',
    when: (c) => c.age >= 6 && free(c),
    do: (c) => {
      c.health(c.int(1, 3)).happy(c.int(1, 3));
      return c.pick(['صبح زود رفتی پارک و با پیرمردها نرمش کردی.', 'تو پارک قدم زدی و یه بستنی قیفی خوردی.', 'دور پارک دویدی و حس خوبی داشتی.']);
    },
  },
  {
    id: 'mountain', group: 'body', emoji: '🏔️',
    label: (c) => (c.city.id === 'tehran' ? 'کوه (دربند/توچال)' : 'کوه‌پیمایی'), desc: 'سلامت و شادی',
    when: (c) => c.age >= 8 && free(c) && !c.abroad,
    do: (c) => {
      c.health(c.int(2, 4)).happy(c.int(2, 4));
      if (c.age >= 18 && c.s('health') > 70 && c.chance(0.35)) {
        if (!c.has('damavand') && c.lucky(0.5)) {
          c.flag('damavand');
          award(c, 'damavand');
          c.happy(10).rep(5);
          return 'با یه گروه کوه‌نوردی رفتی دماوند و به قله رسیدی! ۵۶۱۰ متر! عکسش رو گذاشتی پروفایلت.';
        }
        return 'رفتی سمت دماوند ولی تو جان‌پناه هوا خراب شد و برگشتی.';
      }
      return c.pick(['رفتی کوه و تو قهوه‌خونه‌ی بالای کوه چای و املت خوردی.', 'تا ایستگاه دوم رفتی بالا و نفس‌نفس زدی.', 'صبح جمعه کوه بودی. هوا عالی بود.']);
    },
  },
  {
    id: 'doctor', group: 'body', emoji: '🩺',
    label: 'دکتر رفتن', desc: (c) => `ویزیت: ${money(c.price(1.5e6))}`,
    cost: (c) => (c.age < 18 ? 0 : c.price(1.5e6)),
    when: (c) => free(c) && c.age >= 2,
    do: (c) => {
      const ill = c.L.ills[0];
      if (!ill && c.age < 14) { c.health(1); return c.pick(['مامانت بردت دکتر اطفال. دکتر یه آبنبات بهت داد!', 'دکتر گفت «ماشالله، سالمِ سالمه!»', 'واکسن زدی و یه کوچولو گریه کردی.']); }
      if (!ill) { c.health(1); return c.pick(['دکتر گفت «هیچیت نیست، فقط استرس داری».', 'آزمایش دادی و همه چی نرمال بود. دکتر گفت کمتر نمک بخور!']); }
      ill.severity -= c.int(15, 35);
      c.health(3);
      if (ill.severity <= 0) { c.L.ills = c.L.ills.filter((i) => i !== ill); return `درمان ${ILL_NAMES[ill.id]} جواب داد و خوب شدی!`; }
      return `دکتر برای ${ILL_NAMES[ill.id]} دارو داد. یه کم بهتر شدی.`;
    },
  },
  {
    id: 'private_doctor', group: 'body', emoji: '💎', gems: 8,
    label: 'دکتر خصوصی (درمان کامل)',
    when: (c) => c.L.ills.length > 0 && free(c),
    do: (c) => {
      const names = c.L.ills.map((i) => ILL_NAMES[i.id]).join('، ');
      c.L.ills = [];
      c.health(25).happy(10);
      return `بهترین متخصص شهر درمانت کرد: ${names}. کاملاً خوب شدی!`;
    },
  },
  {
    id: 'diet', group: 'body', emoji: '🥗',
    label: 'رژیم غذایی',
    when: (c) => c.age >= 14 && free(c),
    do: (c) => {
      if (c.trait('foodie') && c.chance(0.6)) { c.happy(-3); return 'سه روز رژیم گرفتی، بعد قورمه‌سبزی مامانت رو دیدی و تموم شد!'; }
      c.health(c.int(2, 4)).looks(c.int(1, 3)).happy(-2);
      return 'نون و برنج رو کم کردی و چند کیلو کم کردی. همه می‌گن «چقدر لاغر شدی، مریضی؟!»';
    },
  },
  {
    id: 'barber', group: 'body', emoji: '💇',
    label: 'آرایشگاه', desc: (c) => money(c.price(c.male ? 400e3 : 2e6)),
    cost: (c) => (c.age < 16 ? 0 : c.price(c.male ? 400e3 : 2e6)),
    when: (c) => c.age >= 6 && free(c),
    do: (c) => {
      if (c.chance(0.12)) { c.looks(-3).happy(-4); return c.male ? 'آرایشگر گفت «یه کوتاه کنیم؟» و الان شبیه سربازها شدی!' : 'رنگ موت به جای «دودی» شد «بادمجونی»!'; }
      c.looks(c.int(2, 4)).happy(3);
      return c.male ? 'یه مدل موی جدید زدی. خیلی خوشتیپ شدی!' : 'رفتی آرایشگاه و حسابی به خودت رسیدی!';
    },
  },
  {
    id: 'nosejob', group: 'body', emoji: '👃',
    label: 'عمل بینی', desc: (c) => `هزینه: ${money(c.price(150e6))}، ریسک داره`,
    cost: (c) => c.price(150e6),
    when: (c) => c.age >= 18 && !c.has('nose') && free(c) && !c.abroad,
    do: (c) => {
      c.flag('nose');
      award(c, 'nose');
      if (c.lucky(0.8)) { c.looks(c.int(8, 18)).happy(8); return 'عمل بینی کردی! دو هفته با چسب رو دماغ تو خیابون بودی و الان خیلی خوشگل‌تر شدی.'; }
      c.looks(-c.int(5, 12)).happy(-12);
      return 'عمل خراب شد! دماغت کج شد و باید دوباره عمل کنی…';
    },
  },
  {
    id: 'hair_transplant', group: 'body', emoji: '👨‍🦲',
    label: 'کاشت مو', desc: (c) => money(c.price(90e6)),
    cost: (c) => c.price(90e6),
    when: (c) => c.male && c.age >= 28 && !c.has('hair') && free(c),
    do: (c) => {
      c.flag('hair');
      c.looks(c.int(5, 12)).happy(6);
      return 'رفتی کاشت مو. شش ماه بعد دوباره مو داری! بیست سال جوون‌تر شدی.';
    },
  },
  {
    id: 'clothes', group: 'body', emoji: '👔',
    label: 'خرید لباس مارک', desc: (c) => money(c.price(40e6)),
    cost: (c) => c.price(40e6),
    when: (c) => c.age >= 14 && free(c),
    do: (c) => {
      c.looks(c.int(1, 3)).happy(c.int(3, 6)).rep(1);
      return c.pick(['از پاساژ یه کت و شلوار شیک خریدی.', 'یه کفش اورجینال خریدی. (فروشنده قسم خورد اورجینال‌ه!)', 'لباس‌های جدیدت رو تو مهمونی پوشیدی و همه پرسیدن «از کجا خریدی؟»']);
    },
  },
  // ───────── mind ─────────
  {
    id: 'book', group: 'mind', emoji: '📕', limit: 2,
    label: 'کتاب خوندن',
    when: (c) => c.age >= 7 && free(c),
    do: (c) => {
      c.inc('books');
      c.smarts(c.int(1, 2)).happy(1);
      return `${c.pick(['«بوف کور» هدایت', '«کلیدر» دولت‌آبادی', '«سووشون» دانشور', '«شازده کوچولو»', '«صد سال تنهایی»', '«بیشعوری»', 'یه کتاب موفقیت', '«جای خالی سلوچ»', '«کیمیاگر»', 'دیوان حافظ', 'شاهنامه'])} رو خوندی.`;
    },
  },
  {
    id: 'language', group: 'mind', emoji: '🗣️',
    label: 'کلاس زبان انگلیسی', desc: (c) => money(c.price(18e6)),
    cost: (c) => (familyPays(c, c.price(18e6)) ? 0 : c.price(18e6)),
    when: (c) => c.age >= 8 && free(c),
    do: (c) => {
      c.inc('engTerms');
      c.smarts(1);
      if (c.count('engTerms') >= 3 && !c.has('english_ok')) { c.flag('english_ok'); c.flag('english'); return 'دیگه انگلیسی رو خوب حرف می‌زنی! تو فیلم‌ها زیرنویس رو خاموش می‌کنی.'; }
      return `ترم ${fa(c.count('engTerms'))} زبان رو گذروندی. «Hello, my name is ${c.name}!»`;
    },
  },
  {
    id: 'ielts', group: 'mind', emoji: '📝',
    label: 'آزمون آیلتس', desc: (c) => money(c.price(30e6)),
    cost: (c) => c.price(30e6),
    when: (c) => c.age >= 17 && free(c) && c.has('english_ok'),
    do: (c) => {
      const score = clamp(Math.round((4 + c.count('engTerms') * 0.35 + (c.s('smarts') - 50) / 30 + c.rng.gauss(0, 0.5)) * 2) / 2, 3.5, 9);
      c.L.edu.ielts = Math.max(c.L.edu.ielts ?? 0, score);
      c.happy(score >= 6.5 ? 8 : -3);
      return `نمره‌ی آیلتست شد ${fa(score)}. ${score >= 7 ? 'عالیه! راه مهاجرت بازه.' : score >= 6 ? 'بد نیست.' : 'باید بیشتر بخونی.'}`;
    },
  },
  {
    id: 'music_class', group: 'mind', emoji: '🎵',
    label: 'کلاس موسیقی', desc: (c) => money(c.price(12e6)),
    cost: (c) => (familyPays(c, c.price(12e6)) ? 0 : c.price(12e6)),
    when: (c) => c.age >= 7 && free(c),
    options: () => [
      { id: 'santur', label: 'سنتور', emoji: '🎼' },
      { id: 'tar', label: 'تار', emoji: '🪕' },
      { id: 'piano', label: 'پیانو', emoji: '🎹' },
      { id: 'guitar', label: 'گیتار', emoji: '🎸' },
      { id: 'voice', label: 'آواز', emoji: '🎤' },
    ],
    do: (c, o) => {
      const n = c.inc('music');
      c.happy(3).smarts(1);
      if (o!.id === 'voice' && (c.trait('singer') || n >= 3)) c.flag('voice');
      if (n >= 4) return `تو ${o!.label} حرفه‌ای شدی! تو مهمونی‌ها همه ازت می‌خوان بزنی.`;
      return `کلاس ${o!.label} رفتی. ${n === 1 ? 'همسایه‌ها از صداش شاکی‌ان!' : 'داری پیشرفت می‌کنی.'}`;
    },
  },
  {
    id: 'course', group: 'mind', emoji: '🛠️',
    label: 'دوره‌ی فنی‌وحرفه‌ای', desc: 'یاد گرفتن یه حرفه',
    when: (c) => c.age >= 15 && free(c) && !c.abroad,
    options: (c) => [
      { id: 'c_barber', label: 'آرایشگری', emoji: '💇', cost: c.price(25e6) },
      { id: 'c_tailor', label: 'خیاطی', emoji: '🧵', cost: c.price(15e6) },
      { id: 'c_mechanic', label: 'مکانیک خودرو', emoji: '🔧', cost: c.price(20e6) },
      { id: 'c_elec', label: 'برق‌کاری ساختمان', emoji: '💡', cost: c.price(18e6) },
      { id: 'c_plumber', label: 'لوله‌کشی', emoji: '🚰', cost: c.price(18e6) },
      { id: 'c_coach', label: 'مربیگری بدنسازی', emoji: '🏋️', cost: c.price(22e6) },
      { id: 'licence', label: 'گواهینامه‌ی پایه یک', emoji: '🚛', cost: c.price(30e6) },
    ].map((o) => ({ ...o, off: c.has(o.id) ? 'بلدی' : undefined })),
    do: (c, o) => {
      c.flag(o!.id);
      c.smarts(1).happy(2);
      return `دوره‌ی ${o!.label} رو تموم کردی و مدرکش رو گرفتی.`;
    },
  },
  {
    id: 'driving', group: 'mind', emoji: '🚦',
    label: 'گواهینامه‌ی رانندگی', desc: (c) => money(c.price(12e6)),
    cost: (c) => c.price(12e6),
    when: (c) => c.age >= 18 && !c.has('driver') && free(c) && !c.abroad,
    do: (c) => {
      c.queue('driving_test');
      return 'تو آموزشگاه رانندگی ثبت‌نام کردی و چند جلسه با مربی تمرین کردی.';
    },
  },
  {
    id: 'meditate', group: 'mind', emoji: '🧘',
    label: 'مدیتیشن و یوگا',
    when: (c) => c.age >= 14 && free(c),
    do: (c) => {
      c.happy(c.int(2, 5)).health(1);
      return 'نیم ساعت چشمات رو بستی و نفس عمیق کشیدی. آرامش گرفتی.';
    },
  },
  {
    id: 'therapy', group: 'mind', emoji: '🛋️',
    label: 'مشاوره و روان‌درمانی', desc: (c) => money(c.price(5e6)),
    cost: (c) => c.price(5e6),
    when: (c) => c.age >= 16 && free(c),
    do: (c) => {
      c.happy(c.int(5, 10));
      const dep = c.L.ills.find((i) => i.id === 'depression');
      if (dep) dep.severity -= 25;
      return 'با یه روانشناس خوب حرف زدی. سبک‌تر شدی.';
    },
  },
  // ───────── home ─────────
  {
    id: 'move_out', group: 'home', emoji: '🔑',
    label: 'مستقل شدن (اجاره‌ی خونه)', desc: (c) => `اجاره‌ی سالانه حدود ${money(rentCostFor(c))}`,
    when: (c) => c.age >= 18 && c.L.home === 'parents' && !c.abroad && free(c),
    confirm: 'از خونه‌ی بابا اینا بری و مستاجر بشی؟',
    do: (c) => {
      c.L.home = c.L.assets.some((a) => a.kind === 'house' && !a.rented) ? 'own' : 'rent';
      c.happy(6);
      for (const p of c.parents) c.close(p, -3);
      return c.L.home === 'own' ? 'رفتی تو خونه‌ی خودت زندگی کنی. استقلال!' : c.pets.length ? `یه خونه اجاره کردی و مستقل شدی. صاحبخونه اول به خاطر ${c.pets[0].name} قبول نمی‌کرد، ولی با یه جعبه شیرینی راضی شد!` : 'یه خونه اجاره کردی و مستقل شدی. صاحبخونه گفت «فقط حیوون خونگی ممنوعه!»';
    },
  },
  {
    id: 'move_home', group: 'home', emoji: '🏡',
    label: 'برگشتن به خونه‌ی بابا اینا',
    when: (c) => c.L.home === 'rent' && c.parents.length > 0 && !c.spouse && !c.abroad,
    do: (c) => {
      c.L.home = 'parents';
      c.happy(-2);
      return 'برگشتی خونه‌ی بابا اینا. مامانت خوشحاله، ولی ساعت ۱۱ شب باید خونه باشی!';
    },
  },
  {
    id: 'live_own', group: 'home', emoji: '🏠',
    label: 'نقل مکان به خونه‌ی خودت',
    when: (c) => c.L.home === 'rent' && c.L.assets.some((a) => a.kind === 'house'),
    do: (c) => {
      c.L.home = 'own';
      for (const a of c.L.assets) if (a.kind === 'house') { a.rented = false; break; }
      c.happy(8);
      return 'از اجاره‌نشینی خلاص شدی و رفتی تو خونه‌ی خودت!';
    },
  },
  {
    id: 'lifestyle', group: 'home', emoji: '🛋️',
    label: 'سبک زندگی', desc: (c) => `الان: ${LIFESTYLES[c.L.lifestyle].name}، خرج سالانه ${money(livingCost(c.L) + rentCost(c.L))}`,
    limit: 3,
    when: (c) => c.age >= 18 && c.L.home !== 'parents' && free(c),
    options: (c) => LIFESTYLES.map((l, i) => ({ id: String(i), label: l.name, emoji: l.emoji, off: i === c.L.lifestyle ? 'همینه' : undefined })),
    do: (c, o) => {
      const i = +o!.id;
      const up = i > c.L.lifestyle;
      c.L.lifestyle = i;
      c.happy(up ? 5 : -5);
      return up ? `سبک زندگیت رو «${LIFESTYLES[i].name}» کردی. خرجت بیشتر شد ولی حالت بهتره.` : `سبک زندگیت رو «${LIFESTYLES[i].name}» کردی و کمربندت رو سفت کردی.`;
    },
  },
]);

function rentCostFor(c: Ctx) {
  return rentCost({ ...c.L, home: 'rent' });
}
