import { money } from '../../engine/fmt';
import { defActions } from '../../engine/registry';
import { milCardOk } from '../../engine/year';
import { CITIES } from '../cities';

const TRIPS_IR = [
  { id: 'north', label: 'شمال (جاده‌ی چالوس)', emoji: '🌲', cost: 25e6, text: 'رفتی شمال. تو جاده‌ی چالوس ترافیک بود ولی جوجه‌کباب کنار رودخونه همه چی رو جبران کرد!' },
  { id: 'kish', label: 'کیش', emoji: '🏝️', cost: 60e6, text: 'رفتی کیش؛ دلفین دیدی، تو پاساژها خرید کردی و یه برنزه‌ی حسابی شدی.' },
  { id: 'isfahan', label: 'اصفهان', emoji: '🌉', cost: 30e6, text: 'رفتی اصفهان؛ میدون نقش جهان و سی‌وسه‌پل رو دیدی و بریونی خوردی.' },
  { id: 'shiraz', label: 'شیراز', emoji: '🌹', cost: 30e6, text: 'رفتی شیراز؛ حافظیه، تخت جمشید و فالوده‌ی شیرازی. عالی بود!' },
  { id: 'yazd', label: 'یزد', emoji: '🏺', cost: 25e6, text: 'رفتی یزد؛ تو کوچه‌های بادگیری گم شدی و قطاب خریدی.' },
  { id: 'mashhad', label: 'مشهد', emoji: '🕌', cost: 25e6, text: 'رفتی مشهد و برای همه‌ی فامیل زعفران و نبات سوغاتی آوردی.' },
  { id: 'tabriz', label: 'تبریز و کندوان', emoji: '🏛️', cost: 28e6, text: 'رفتی تبریز؛ بازار سرپوشیده، ائل‌گلی و روستای کندوان. چه مهمون‌نوازی‌ای!' },
  { id: 'qeshm', label: 'قشم و هرمز', emoji: '🏜️', cost: 45e6, text: 'رفتی قشم و هرمز؛ دره‌ی ستاره‌ها و خاک‌های رنگی هرمز. بی‌نظیر بود.' },
];

const TRIPS_OUT = [
  { id: 'istanbul', label: 'استانبول', emoji: '🇹🇷', cost: 180e6, text: 'رفتی استانبول؛ تو تقسیم قدم زدی، تو بسفر کشتی‌سواری کردی و یه چمدون لباس خریدی!' },
  { id: 'yerevan', label: 'ایروان', emoji: '🇦🇲', cost: 120e6, text: 'رفتی ایروان؛ هوای خنک، کافه‌ها و منظره‌ی کوه آرارات.' },
  { id: 'dubai', label: 'دبی', emoji: '🇦🇪', cost: 250e6, text: 'رفتی دبی؛ برج خلیفه رو دیدی و تو مال‌ها گم شدی.' },
  { id: 'tbilisi', label: 'تفلیس', emoji: '🇬🇪', cost: 150e6, text: 'رفتی تفلیس؛ خاچاپوری خوردی و تو شهر قدیمی قدم زدی.' },
  { id: 'europe', label: 'تور اروپا', emoji: '🇪🇺', cost: 900e6, text: 'رفتی تور اروپا: پاریس، رم، بارسلون! تا یه سال از عکس‌هات پست گذاشتی.' },
  { id: 'thailand', label: 'تایلند', emoji: '🇹🇭', cost: 350e6, text: 'رفتی تایلند؛ ساحل، فیل‌سواری و غذاهای عجیب‌وغریب!' },
];

defActions([
  {
    id: 'trip_iran', group: 'fun', emoji: '🚗',
    label: 'سفر داخلی',
    when: (c) => c.age >= 16 && !c.L.prison && !c.abroad,
    options: (c) => TRIPS_IR.map((t) => ({ id: t.id, label: t.label, emoji: t.emoji, cost: c.price(t.cost), desc: money(c.price(t.cost)) })),
    do: (c, o) => {
      const t = TRIPS_IR.find((x) => x.id === o!.id)!;
      c.inc('tripsIran');
      c.happy(c.int(6, 12)).health(1);
      if (c.lucky(0.06)) { c.health(-10); return `${t.text} ولی تو راه برگشت تصادف کوچیکی کردی و دستت شکست!`; }
      return t.text;
    },
  },
  {
    id: 'trip_abroad', group: 'fun', emoji: '✈️',
    label: 'سفر خارجی',
    when: (c) => c.age >= 18 && !c.L.prison,
    off: (c) => (!c.abroad && c.male && !milCardOk(c.L) ? 'بدون کارت پایان خدمت پاسپورت نداری' : false),
    options: (c) => TRIPS_OUT.map((t) => ({ id: t.id, label: t.label, emoji: t.emoji, cost: c.price(t.cost), desc: money(c.price(t.cost)) })),
    do: (c, o) => {
      const t = TRIPS_OUT.find((x) => x.id === o!.id)!;
      c.inc('tripsAbroad');
      c.happy(c.int(10, 18)).rep(2);
      return t.text;
    },
  },
  {
    id: 'cinema', group: 'fun', emoji: '🎬',
    label: 'سینما', desc: (c) => money(c.price(400e3)),
    cost: (c) => (c.age < 16 ? 0 : c.price(400e3)),
    when: (c) => c.age >= 6 && !c.L.prison,
    do: (c) => {
      c.happy(c.int(3, 6));
      return c.pick(['یه فیلم کمدی دیدی و از خنده روده‌بر شدی.', 'یه فیلم اجتماعی دیدی و تا آخر شب بهش فکر کردی.', 'رفتی سینما ولی پشت سرت یکی کل فیلم با تلفن حرف زد!', 'یه فیلم ترسناک دیدی و شب چراغ رو روشن گذاشتی.']);
    },
  },
  {
    id: 'party', group: 'fun', emoji: '🎉',
    label: 'دورهمی با رفقا',
    when: (c) => c.age >= 14 && !c.L.prison,
    do: (c) => {
      c.happy(c.int(4, 8));
      for (const f of c.rels('friend')) c.close(f, c.int(3, 7));
      return c.pick(['دورهمی گرفتین و تا صبح مافیا بازی کردین!', 'با رفقا رفتین کافه و قلیون… نه، چای و کیک خوردین!', 'دورهمی گرفتین و پانتومیم بازی کردین. کلی خندیدین.', 'رفتین بیرون و تو خیابون پیتزا خوردین.']);
    },
  },
  {
    id: 'gamenet', group: 'fun', emoji: '🎮',
    label: 'بازی کامپیوتری',
    when: (c) => c.age >= 7 && !c.L.prison,
    do: (c) => {
      c.happy(c.int(3, 6));
      if (c.L.edu.stage === 'school' || c.L.edu.stage === 'uni') c.L.edu.effort -= 0.5;
      return c.pick(['کل روز فیفا بازی کردی و پرسپولیس رو قهرمان کردی!', 'تو گیم‌نت با بچه‌ها کانتر زدین.', 'شب تا صبح بازی کردی. فردا سر کلاس خواب بودی!', 'تو کلش رویال به آرنای بالاتر رفتی.']);
    },
  },
  {
    id: 'concert', group: 'fun', emoji: '🎤',
    label: 'کنسرت', desc: (c) => money(c.price(3e6)),
    cost: (c) => c.price(3e6),
    when: (c) => c.age >= 14 && !c.L.prison && !c.abroad,
    do: (c) => {
      c.happy(c.int(5, 10));
      return c.pick(['رفتی کنسرت پاپ و کل آهنگ‌ها رو با خواننده خوندی!', 'رفتی کنسرت موسیقی سنتی و سنتور گوش دادی. آرامش محض.', 'کنسرت دیر شروع شد ولی ارزشش رو داشت!']);
    },
  },
  {
    id: 'football', group: 'fun', emoji: '⚽',
    label: 'فوتبال گل‌کوچیک',
    when: (c) => c.age >= 6 && c.age <= 55 && !c.L.prison,
    do: (c) => {
      c.happy(c.int(3, 6)).health(c.int(1, 3));
      if (c.lucky(0.06)) { c.health(-6); return 'وسط بازی پات پیچ خورد و یه ماه لنگ‌لنگان راه رفتی!'; }
      return c.pick(['با بچه‌های محل گل‌کوچیک بازی کردی و دو تا گل زدی!', 'تو زمین چمن مصنوعی فوتبال زدین. تیمت باخت ولی خوش گذشت.', 'سانتر کردی، هد زدی، گل! همه بغلت کردن.']);
    },
  },
  {
    id: 'move_city', group: 'home', emoji: '🗺️',
    label: 'نقل مکان به یه شهر دیگه',
    when: (c) => c.age >= 18 && !c.L.prison && !c.abroad && (c.L.home !== 'parents' || c.age >= 22),
    options: (c) => CITIES.filter((x) => x.id !== c.L.city).map((x) => ({ id: x.id, label: x.name, emoji: x.emoji, desc: x.famous })),
    confirm: 'خونه و کارت تو این شهر رو ول می‌کنی؟',
    do: (c, o) => {
      const to = CITIES.find((x) => x.id === o!.id)!;
      c.L.city = to.id;
      if (c.L.home === 'parents') c.L.home = 'rent';
      if (c.L.job && !['cab', 'courier'].includes(c.L.job.id)) c.L.job = null;
      c.happy(4);
      return `اسباب‌کشی کردی به ${to.name}. ${to.emoji} شهر ${to.famous}!`;
    },
  },
]);

