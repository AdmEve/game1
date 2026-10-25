import { clamp } from '../../engine/ctx';
import { money } from '../../engine/fmt';
import { defActions, defPersonActs } from '../../engine/registry';
import type { Npc } from '../../engine/types';
import { familyBudget } from '../../engine/year';

const elder = (n: Npc) => ['father', 'mother', 'grandpa', 'grandma'].includes(n.rel);
const partner = (n: Npc) => n.rel === 'spouse' || n.rel === 'fiance';

defPersonActs([
  {
    id: 'time', label: 'وقت گذروندن', emoji: '☕',
    when: (c, n) => n.rel !== 'ex',
    do: (c, n) => {
      c.close(n, c.int(6, 12));
      c.happy(c.int(2, 5));
      const age = c.ageOf(n);
      if (elder(n)) return c.pick([`با ${c.relName(n)} چای خوردی و خاطرات قدیم رو گوش دادی.`, `${c.relName(n)} رو بردی پارک.`, `با ${c.relName(n)} سریال دیدین و کلی خندیدین.`]);
      if (n.rel === 'child' && age < 10) return c.pick([`با ${c.relName(n)} لگو بازی کردی.`, `${c.relName(n)} رو بردی شهربازی!`, `برای ${c.relName(n)} قصه‌ی شب گفتی.`]);
      if (partner(n)) return c.pick([`با ${n.first} رفتین کافه.`, `با ${n.first} شب رفتین بام تهران و چای نبات خوردین.`, `با ${n.first} فیلم دیدین و پفک خوردین.`]);
      return c.pick([`با ${c.relName(n)} رفتین بیرون و پیتزا خوردین.`, `با ${c.relName(n)} فوتبال دیدین.`, `با ${c.relName(n)} تا نصفه‌شب حرف زدین.`]);
    },
  },
  {
    id: 'gift', label: 'هدیه دادن', emoji: '🎁',
    when: (c, n) => c.age >= 10 && n.rel !== 'ex',
    cost: (c) => c.price(c.age < 18 ? 1e6 : 8e6),
    do: (c, n) => {
      c.close(n, c.int(8, 15));
      c.happy(2).rep(1);
      const g = c.pick(partner(n) ? ['یه دسته گل رز', 'یه گردنبند', 'یه عطر خوش‌بو', 'بلیت کنسرت'] : elder(n) ? ['یه شال گردن', 'یه جعبه گز', 'یه گلدون', 'یه تسبیح'] : ['یه کتاب', 'یه هدفون', 'یه کفش ورزشی', 'یه جعبه شکلات']);
      return `برای ${c.relName(n)} ${g} خریدی. خیلی خوشحال شد!`;
    },
  },
  {
    id: 'ask_money', label: 'درخواست پول', emoji: '🤲',
    when: (c, n) => (elder(n) || (n.rel !== 'child' && c.ageOf(n) > c.age + 3)) && c.age >= 8 && n.rel !== 'ex',
    do: (c, n) => {
      const rich = n.rich ?? (c.L.flags.rich ?? 2);
      const chance = clamp(0.25 + n.close / 200 + rich * 0.08, 0.05, 0.9);
      if (c.lucky(chance)) {
        const amt = Math.round(familyBudget(rich) * c.L.econ.price * c.rng.range(0.01, 0.06) * (c.age < 18 ? 0.2 : 1));
        c.money(amt);
        c.close(n, -4);
        return `${c.relName(n)} ${money(amt)} بهت داد. «فقط به ${n.rel === 'father' ? 'مامانت' : 'کسی'} نگو!»`;
      }
      c.close(n, -8);
      c.happy(-3);
      return c.pick([`${c.relName(n)} گفت «پول که علف خرس نیست!»`, `${c.relName(n)} گفت «برو کار کن، به سن تو که بودم…»`, `${c.relName(n)} گفت «خودمم ندارم، باور کن».`]);
    },
  },
  {
    id: 'give_money', label: 'کمک مالی', emoji: '💸',
    when: (c, n) => c.age >= 20 && n.rel !== 'ex',
    cost: (c) => c.price(50e6),
    do: (c, n) => {
      c.close(n, 12);
      c.happy(4).rep(3);
      return `${money(c.price(50e6))} به ${c.relName(n)} کمک کردی. کلی دعات کرد.`;
    },
  },
  {
    id: 'compliment', label: 'تعریف کردن', emoji: '🥰',
    when: (c, n) => partner(n) || n.rel === 'child' || elder(n),
    do: (c, n) => {
      c.close(n, c.int(4, 8));
      return partner(n) ? `به ${n.first} گفتی «تو بهترین اتفاق زندگیمی». ${n.first} سرخ شد!` : `از ${c.relName(n)} تعریف کردی. حسابی ذوق کرد.`;
    },
  },
  {
    id: 'argue', label: 'دعوا کردن', emoji: '😤',
    when: (c, n) => c.age >= 6 && n.rel !== 'ex',
    do: (c, n) => {
      c.close(n, -c.int(10, 20));
      c.happy(c.chance(0.5) ? 2 : -4);
      if (c.lucky(0.05) && c.age >= 16 && !elder(n)) { c.health(-8); return `دعوا با ${c.relName(n)} به کتک‌کاری کشید و دماغت خونی شد!`; }
      return c.pick([`سر ${c.pick(['ارث', 'سیاست', 'فوتبال', 'ظرف نشستن', 'کنترل تلویزیون', 'پول'])} با ${c.relName(n)} دعوات شد.`, `با ${c.relName(n)} داد و بیداد کردین. همسایه‌ها شنیدن!`]);
    },
  },
  {
    id: 'apologize', label: 'عذرخواهی', emoji: '🙏',
    when: (c, n) => n.close < 50 && n.rel !== 'ex',
    do: (c, n) => {
      if (c.lucky(0.7)) { c.close(n, 15); c.happy(3); return `از ${c.relName(n)} عذرخواهی کردی و آشتی کردین.`; }
      c.close(n, 2);
      return `${c.relName(n)} گفت «باشه، ولی هنوز دلم باهات صاف نشده».`;
    },
  },
  {
    id: 'trip_fam', label: 'سفر خانوادگی', emoji: '🧳',
    when: (c, n) => (partner(n) || n.rel === 'child') && c.age >= 18,
    cost: (c) => c.price(60e6),
    do: (c, n) => {
      c.close(n, 15);
      c.happy(8);
      return `با ${c.relName(n)} رفتین ${c.pick(['شمال', 'مشهد', 'اصفهان', 'شیراز', 'کیش', 'یزد', 'تبریز'])}. کلی عکس یادگاری گرفتین!`;
    },
  },
  {
    id: 'cut_off', label: 'قطع رابطه', emoji: '✂️',
    when: (c, n) => n.rel === 'friend' || n.rel === 'ex',
    do: (c, n) => {
      n.alive = false;
      n.flags = { ...(n.flags ?? {}), gone: c.L.year };
      return `با ${n.first} قطع رابطه کردی. شماره‌اش رو بلاک کردی.`;
    },
  },
]);

defActions([
  {
    id: 'make_friend', group: 'social', emoji: '🤝',
    label: 'دوست پیدا کردن',
    when: (c) => c.age >= 6 && !c.L.prison && c.rels('friend').length < 8,
    do: (c) => {
      if (c.lucky(0.55 + c.s('rep') / 400 + (c.trait('charming') ? 0.15 : 0))) {
        const g = c.chance(0.7) ? c.L.gender : c.L.gender === 'm' ? 'f' : 'm';
        const via = c.L.edu.stage === 'school' ? 'هم‌کلاسی' : c.L.edu.stage === 'uni' ? 'هم‌دانشگاهی' : c.L.job ? 'همکار' : 'همسایه';
        const n = c.addPerson({ rel: 'friend', gender: g, born: c.L.year - Math.max(6, c.age + c.int(-3, 3)), close: c.int(55, 75), met: via });
        c.happy(5);
        return `با ${n.first} (${via}) دوست شدی!`;
      }
      c.happy(-2);
      return 'سعی کردی دوست جدید پیدا کنی ولی خجالت کشیدی.';
    },
  },
  {
    id: 'instagram', group: 'social', emoji: '📸', limit: 3,
    label: 'پست اینستاگرام',
    desc: (c) => `فالوورها: ${c.L.followers.toLocaleString('fa-IR')}`,
    when: (c) => c.age >= 13 && !c.L.prison,
    do: (c) => {
      const base = 20 + c.s('looks') * 2 + c.s('smarts') + (c.trait('charming') ? 80 : 0) + (c.trait('singer') ? 60 : 0);
      let gain = Math.round(base * c.rng.range(0.3, 2) * (1 + c.L.followers / 50000));
      let t = c.pick(['یه عکس از غذات گذاشتی.', 'یه ریلز از سفرت گذاشتی.', 'یه استوری فلسفی با آهنگ غمگین گذاشتی.', 'یه ویدیوی طنز درست کردی.', 'عکس با فیلتر گذاشتی.']);
      if (c.lucky(0.04)) {
        gain *= 30;
        t = `🔥 ویدیوت وایرال شد! ${c.pick(['همه داشتن بازنشرش می‌کردن.', 'حتی تو گروه فامیلی هم دست به دست شد!', 'یه سلبریتی هم استوریش کرد.'])}`;
        c.happy(10).rep(3);
      } else if (c.chance(0.06)) {
        gain = -Math.round(c.L.followers * 0.1);
        t = 'یه پست جنجالی گذاشتی و کلی آنفالو خوردی!';
        c.rep(-5);
      }
      c.L.followers = Math.max(0, c.L.followers + gain);
      c.happy(2);
      if (c.L.followers > 50000 && c.chance(0.4)) {
        const ad = Math.round(c.L.followers * c.price(150) * c.rng.range(0.5, 1.5));
        c.money(ad);
        t += ` یه برند بهت ${money(ad)} داد که تبلیغش رو بکنی!`;
      }
      return `${t} ${gain >= 0 ? `+${gain.toLocaleString('fa-IR')}` : gain.toLocaleString('fa-IR')} فالوور.`;
    },
  },
]);
