import { money } from '../../engine/fmt';
import { defEvents } from '../../engine/registry';

defEvents([
  {
    id: 'l_bread', emoji: '🥖', age: [60, 100], once: false, cd: 6, text: '',
    when: (c) => !c.abroad,
    auto: (c) => { c.happy(3).health(1); return `🥖 صبح زود رفتی نونوایی و تو صف با پیرمردهای محل درباره‌ی ${c.pick(['قیمت دلار', 'فوتبال', 'قدیم‌ها', 'بچه‌های این دوره‌زمونه'])} بحث کردین.`; },
  },
  {
    id: 'l_park_friends', emoji: '🌳', age: [60, 100], w: 1.2, text: '',
    auto: (c) => { const n = c.addPerson({ rel: 'friend', gender: c.L.gender, born: c.L.year - c.age - c.int(-4, 6), close: 70, met: 'پارک' }); c.happy(6); return `🌳 تو پارک با ${n.first} آشنا شدی. حالا هر روز صبح با هم ورزش می‌کنین و تخته‌نرد بازی می‌کنین!`; },
    kind: 'good',
  },
  {
    id: 'l_grandkids_visit', emoji: '👨‍👩‍👧', age: [55, 100], once: false, cd: 3,
    when: (c) => c.has('grandparent'), title: 'نوه‌ها',
    text: 'نوه‌ها اومدن خونه‌ات و دارن همه چی رو به هم می‌ریزن!',
    choices: [
      { label: 'براشون قصه می‌گم', do: (c) => { c.happy(8); return 'براشون قصه‌ی «ماه پیشونی» گفتی. همه دورت جمع شدن.'; } },
      { label: 'بهشون پول توجیبی می‌دم', cost: (c) => c.price(2e6), note: (c) => money(c.price(2e6)), do: (c) => { c.happy(6); return 'به هرکدوم یه اسکناس تانخورده دادی. محبوب‌ترین پدربزرگ/مادربزرگ دنیا شدی!'; } },
      { label: 'می‌گم ساکت باشن!', do: (c) => { c.happy(-2); return 'سرشون داد زدی. حالا می‌گن «پدربزرگ/مادربزرگ بداخلاقه»!'; } },
    ],
  },
  {
    id: 'l_memory', emoji: '🧠', age: [70, 110], w: 0.8, once: false, cd: 5, text: '',
    auto: (c) => { c.smarts(-2); return `🧠 ${c.pick(['عینکت رو گم کردی و یه ساعت دنبالش گشتی؛ رو سرت بود!', 'اسم نوه‌ات رو با اسم گربه‌ی همسایه قاطی کردی.', 'سه بار یه خاطره رو برای یه نفر تعریف کردی.'])}`; },
  },
  {
    id: 'l_alzheimer', emoji: '🧠', age: [72, 110], w: 0.4, text: '',
    auto: (c) => { c.L.ills.push({ id: 'alzheimer', since: c.L.year, severity: 30 }); c.smarts(-10).happy(-6); return '🧠 دکتر گفت آلزایمر خفیف داری. خانواده‌ات بیشتر حواسشون بهته.'; },
    kind: 'bad', pop: true,
  },
  {
    id: 'l_will', emoji: '📜', title: 'وصیت‌نامه', age: [65, 100],
    when: (c) => c.kids.length >= 2,
    text: 'وقتشه وصیت‌نامه بنویسی. بچه‌هات کنجکاون.',
    choices: [
      { label: 'به همه مساوی', do: (c) => { for (const k of c.kids) c.close(k, 5); c.rep(4); return 'نوشتی همه چیز مساوی تقسیم بشه. بچه‌ها راضی‌ان.'; } },
      { label: 'یه سهمی به خیریه', do: (c) => { c.rep(10).happy(5); c.inc('charity', 3); return 'یه سوم دارایی‌ات رو برای ساخت مدرسه تو روستای پدری وقف کردی.'; } },
      { label: 'نمی‌نویسم! بذار بعد از من دعوا کنن', do: (c) => { c.happy(2); return 'گفتی «من هنوز جوونم!» و وصیت‌نامه ننوشتی.'; } },
    ],
  },
  {
    id: 'l_hajj', emoji: '🕋', title: 'سفر زیارتی', age: [50, 90],
    when: (c) => c.cash > c.price(800e6) && !c.abroad,
    text: 'دوستات می‌گن بیا با کاروان بریم سفر زیارتی.',
    choices: [
      { label: 'می‌رم', cost: (c) => c.price(700e6), note: (c) => money(c.price(700e6)), do: (c) => { c.happy(10).rep(8); c.flag('pilgrim'); return 'رفتی سفر زیارتی و با کلی سوغاتی برگشتی. همه بهت می‌گن «حاجی»!'; } },
      { label: 'شاید سال بعد', do: () => 'گفتی «قسمت باشه سال بعد».' },
    ],
  },
  {
    id: 'l_retire_hobby', emoji: '🌻', age: [60, 95], title: 'سرگرمی دوران بازنشستگی',
    when: (c) => !c.L.job,
    text: 'حالا که وقت آزاد داری، می‌خوای چی‌کار کنی؟',
    choices: [
      { label: 'باغچه و گلدون', do: (c) => { c.happy(8).health(2); return 'تو بالکن یه باغچه درست کردی: ریحون، نعناع، گوجه. بهترین ریحون شهره!'; } },
      { label: 'یاد گرفتن کار با گوشی', do: (c) => { c.smarts(3).happy(4); c.L.followers += c.int(50, 2000); return 'یاد گرفتی با گوشی کار کنی. حالا تو گروه فامیلی روزی ۵۰ تا عکس گل و صبح‌بخیر می‌فرستی!'; } },
      { label: 'نوشتن خاطرات', do: (c) => { c.smarts(2).happy(6); return 'شروع کردی خاطراتت رو بنویسی. «از روزی که به دنیا اومدم…»'; } },
    ],
  },
  {
    id: 'l_fall', emoji: '🦴', age: [70, 110], w: 0.7, once: false, cd: 5, text: '',
    auto: (c) => { c.health(-c.int(5, 12)).happy(-4); return '🦴 تو حموم پات لیز خورد و لگنت آسیب دید. چند ماه با واکر راه رفتی.'; },
    kind: 'bad',
  },
  {
    id: 'l_reunion', emoji: '🎓', age: [45, 80], text: '',
    auto: (c) => { c.happy(6); return `🎓 هم‌کلاسی‌های دبیرستان یه دورهمی گرفتن. ${c.pick(['نصفشون کچل شده بودن!', 'یکی‌شون حالا وزیره!', 'شاگرد اول کلاس حالا تو کاناداست.', 'همون قلدر کلاس حالا معلم اخلاقه!'])}`; },
    kind: 'good',
  },
]);
