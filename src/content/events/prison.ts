/** Life in prison: things to do inside, and ways out. Event ids start with «prison» (see `eligible`). */
import { GEM_COST } from '../../config';
import type { Ctx } from '../../engine/ctx';
import { fa, money } from '../../engine/fmt';
import { defActions, defEvents } from '../../engine/registry';

const inside = (c: Ctx) => !!c.L.prison;
const yearsLeft = (c: Ctx) => c.L.prison!.until - c.L.year;
/** Debts you can settle to get out (bounced cheques, mehriyeh). */
const forDebt = (c: Ctx) => ['چک برگشتی', 'مهریه'].includes(c.L.prison?.why ?? '');

function release(c: Ctx) {
  c.L.prison = undefined;
  c.happy(15);
}

const TRADES: [string, string][] = [['c_tailor', 'خیاطی'], ['c_barber', 'آرایشگری'], ['c_elec', 'برق‌کاری'], ['c_plumber', 'لوله‌کشی'], ['c_mechanic', 'مکانیکی']];

defActions([
  {
    id: 'pr_workout', group: 'prison', emoji: '💪',
    label: 'ورزش تو حیاط زندان',
    when: inside,
    do: (c) => {
      c.health(c.int(3, 6)).looks(1).happy(2);
      return c.pick(['هر روز صد تا شنا رفتی. حالا هم‌بندی‌ها بهت می‌گن «پهلوون»!', 'تو حیاط زندان والیبال بازی کردین. یه ساعت یادت رفت کجایی.', 'با یه بطری آب پر، وزنه زدی!']);
    },
  },
  {
    id: 'pr_library', group: 'prison', emoji: '📚',
    label: 'کتابخونه‌ی زندان',
    when: inside,
    do: (c) => {
      c.smarts(c.int(2, 4)).happy(1);
      c.inc('books', 3);
      return c.pick(['«بینوایان» رو خوندی و حس کردی ژان والژان رو درک می‌کنی.', 'کل «شاهنامه» رو از اول تا آخر خوندی!', 'یه کتاب حقوق پیدا کردی و حالا برای بقیه لایحه می‌نویسی!']);
    },
  },
  {
    id: 'pr_trade', group: 'prison', emoji: '🛠️',
    label: 'کارگاه فنی‌وحرفه‌ای',
    desc: 'یه حرفه یاد بگیر و مدرک بگیر',
    when: inside,
    off: (c) => (TRADES.every(([f]) => c.has(f)) ? 'همه‌ی حرفه‌ها رو بلدی' : false),
    do: (c) => {
      const [f, name] = c.pick(TRADES.filter(([x]) => !c.has(x)));
      c.flag(f).smarts(1).happy(3);
      return `تو کارگاه زندان ${name} یاد گرفتی و مدرک فنی‌وحرفه‌ای‌اش رو گرفتی. بعد از آزادی به کارت میاد!`;
    },
  },
  {
    id: 'pr_visit', group: 'prison', emoji: '👨‍👩‍👧',
    label: 'ملاقات خانواده',
    when: inside,
    off: (c) => (c.parents.length || c.spouse || c.kids.length ? false : 'کسی نیست که به ملاقاتت بیاد'),
    do: (c) => {
      const who = c.spouse ?? c.parents[0] ?? c.kids[0];
      c.close(who, 6).happy(6);
      return `${c.relName(who)} اومد ملاقات. از پشت شیشه با تلفن حرف زدین و ${who.rel === 'father' || who.rel === 'mother' ? 'یه دل سیر گریه کرد' : 'قول داد منتظرت بمونه'}.`;
    },
  },
  {
    id: 'pr_appeal', group: 'prison', emoji: '⚖️',
    label: 'درخواست تجدیدنظر',
    desc: (c) => `حق‌الوکاله ${money(c.price(60e6))}`,
    cost: (c) => c.price(60e6),
    when: inside,
    do: (c) => {
      if (!c.lucky(0.35)) { c.happy(-3); return 'دادگاه تجدیدنظر حکم رو تأیید کرد. وکیلت گفت «سال دیگه دوباره امتحان می‌کنیم».'; }
      if (yearsLeft(c) <= 1) { release(c); return 'دادگاه تجدیدنظر حکمت رو شکست! آزاد شدی!'; }
      c.L.prison!.until--;
      c.happy(6);
      return `دادگاه یه سال از حبست کم کرد! ${fa(yearsLeft(c))} سال دیگه مونده.`;
    },
  },
  {
    id: 'pr_consent', group: 'prison', emoji: '🤝',
    label: 'گرفتن رضایت شاکی',
    desc: (c) => `بدهی رو بده: ${money(Math.round(c.wage * 18))}`,
    cost: (c) => Math.round(c.wage * 18),
    when: (c) => inside(c) && forDebt(c),
    do: (c) => {
      release(c);
      return 'بدهیت رو صاف کردی و شاکی رضایت داد. آزاد شدی! این دفعه حساب‌وکتابت رو داری.';
    },
  },
  {
    id: 'pr_bail', group: 'prison', emoji: '🔓', gems: GEM_COST.bail,
    label: 'آزادی با وثیقه',
    desc: 'یه آشنا سند خونه‌اش رو می‌ذاره',
    when: inside,
    do: (c) => {
      release(c);
      return 'یه آشنای قدیمی سند خونه‌اش رو وثیقه گذاشت و آزاد شدی! حالا دیگه حواست رو جمع کن.';
    },
  },
]);

defEvents([
  {
    id: 'prison_amnesty', emoji: '🌷', w: 1.2, age: [18, 100], text: '', pop: true, title: 'عفو نوروزی',
    when: (c) => inside(c) && yearsLeft(c) >= 1,
    auto: (c) => {
      if (yearsLeft(c) <= 1) { release(c); return '🌷 به مناسبت نوروز شامل عفو شدی و آزاد شدی! سال نو رو کنار خانواده‌ات بودی.'; }
      c.L.prison!.until--;
      c.happy(6);
      return `🌷 به مناسبت نوروز شامل عفو شدی و یه سال از حبست کم شد! ${fa(yearsLeft(c))} سال دیگه مونده.`;
    },
  },
  {
    id: 'prison_charity', emoji: '🤲', w: 1.5, age: [18, 100], text: '', pop: true, title: 'خیرین',
    when: (c) => inside(c) && forDebt(c),
    auto: (c) => { release(c); c.rep(2); return '🤲 یه گروه خیریه که بدهی زندانی‌های مالی رو می‌ده، بدهیت رو صاف کرد و آزاد شدی! تو دلت قول دادی یه روز جبران کنی.'; },
  },
  {
    id: 'prison_cellmate', emoji: '👴', w: 1.5, age: [18, 100], title: 'هم‌سلولی',
    when: inside,
    text: 'هم‌سلولیت یه پیرمرد کم‌حرفه که شب‌ها برات از جوونی‌هاش تعریف می‌کنه.',
    choices: [
      {
        label: 'باهاش رفیق می‌شم',
        do: (c) => {
          c.addPerson({ rel: 'friend', gender: 'm', born: c.L.year - c.int(60, 75), close: 70, met: 'زندان' });
          c.happy(4).smarts(1);
          return 'از تجربه‌هاش کلی چیز یاد گرفتی. قول دادین بعد از آزادی همدیگه رو ببینین.';
        },
      },
      { label: 'کاری به کارش ندارم', do: () => 'سرت تو لاک خودت بود و روزها رو شمردی.' },
    ],
  },
  {
    id: 'prison_letter', emoji: '✉️', w: 1, once: false, cd: 2, age: [18, 100], text: '',
    when: (c) => inside(c) && !!c.rel('mother'),
    auto: (c) => { c.happy(4); return `✉️ مامانت برات نامه نوشته: «${c.pick(['هر شب برات دعا می‌کنم. غذات رو بخور.', 'اتاقت رو دست نزدم، همون‌طوری مونده.', 'زود برگرد، قورمه‌سبزی منتظرته.'])}»`; },
  },
  {
    id: 'prison_food', emoji: '🥣', w: 1, once: false, cd: 3, age: [18, 100], text: '',
    when: inside,
    auto: (c) => { c.happy(-1); return `🥣 غذای زندان امروز ${c.pick(['عدسی', 'استانبولی', 'سیب‌زمینی آب‌پز'])} بود. باز هم!`; },
  },
  {
    id: 'prison_show', emoji: '🎤', w: 1, age: [18, 100], title: 'جشن زندان',
    when: inside,
    text: 'به مناسبت یه جشن، تو سالن زندان برنامه گذاشتن و دنبال یکی می‌گردن که بیاد رو صحنه.',
    choices: [
      {
        label: 'می‌رم می‌خونم!',
        do: (c) => {
          if (c.trait('singer') || c.has('voice')) { c.happy(8).rep(4); return 'یه آهنگ قدیمی خوندی و کل سالن ساکت شد. آخرش همه دست زدن و چند نفر گریه کردن.'; }
          c.happy(2);
          return 'صدات یه کم خش داشت، ولی همه برات دست زدن. حداقل یه شب خندیدین!';
        },
      },
      { label: 'از ته سالن تماشا می‌کنم', do: (c) => { c.happy(3); return 'یه شب متفاوت بود. برای چند ساعت یادت رفت کجایی.'; } },
    ],
  },
]);
