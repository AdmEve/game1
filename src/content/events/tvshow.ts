/** Taking part in a TV quiz show (played as a mini-game in src/ui/tvquiz.ts). */
import { award } from '../../engine/achieve';
import { money } from '../../engine/fmt';
import { defActions, defEvents } from '../../engine/registry';
import { TV_LADDER as LADDER } from '../trivia';

defActions([
  {
    id: 'tv_show', group: 'fun', emoji: '📺',
    label: 'شرکت در مسابقه‌ی تلویزیونی',
    desc: 'تا ۵۰۰ میلیون تومان جایزه (به پول امروز)',
    when: (c) => c.age >= 16 && !c.abroad && !c.L.prison,
    off: (c) => (c.since('tvShow') < 3 ? 'هر سه سال یه بار می‌شه' : false),
    do: (c) => {
      c.flag('tvShow');
      if (!c.lucky(0.55)) { c.happy(-2); return 'تو آزمون ورودی شرکت کردی ولی برای ضبط انتخابت نکردن. «سال دیگه دوباره امتحان کن!»'; }
      c.queue('tv_quiz');
      return 'تو آزمون ورودی قبول شدی و دعوتت کردن استودیو! کت‌وشلوار/مانتوی نو خریدی.'.replace('کت‌وشلوار/مانتوی', c.g('کت‌وشلوار', 'مانتوی'));
    },
  },
]);

defEvents([
  {
    id: 'tv_quiz',
    milestone: true,
    emoji: '📺',
    title: 'مسابقه‌ی تلویزیونی',
    text: 'نورهای استودیو روشن شد…',
    choices: [
      {
        label: 'ادامه',
        when: (c) => !!c.p.played,
        do: (c) => {
          const won = c.price(c.p.won as number);
          if (!won) { c.happy(-3).rep(1); return 'دست خالی برگشتی، ولی کل فامیل تو رو تو تلویزیون دیدن!'; }
          c.money(won).happy(10).rep(3);
          if ((c.p.won as number) >= LADDER[LADDER.length - 1]) award(c, 'tvchamp');
          return `${money(won)} از مسابقه‌ی تلویزیونی بردی! فرداش تو محل همه بهت می‌گفتن «همون که تو تلویزیون بود!»`;
        },
      },
      {
        label: 'بریم!',
        when: (c) => !c.p.played,
        do: (c) => {
          const reached = c.int(0, LADDER.length);
          if (reached === 0) { c.happy(-3).rep(1); return 'سؤال اول رو اشتباه زدی و دست خالی برگشتی!'; }
          const won = c.price(LADDER[reached - 1]);
          c.money(won).happy(8).rep(3);
          return `${money(won)} از مسابقه‌ی تلویزیونی بردی!`;
        },
      },
    ],
  },
]);
