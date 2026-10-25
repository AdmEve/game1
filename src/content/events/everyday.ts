/** Everyday choices for toddlers, schoolkids, teens and the old, where the event pool was thin. */
import type { Ctx } from '../../engine/ctx';
import { money } from '../../engine/fmt';
import { defEvents } from '../../engine/registry';

const withParents = (c: Ctx) => c.parents.length > 0;
const closeParents = (c: Ctx, d: number) => { for (const p of c.parents) c.close(p, d); };
const atSchool = (c: Ctx) => c.L.edu.stage === 'school';

defEvents([
  // ───────── toddlers ─────────
  {
    id: 'k_guest_song', emoji: '🎵', title: 'مهمونی', age: [3, 6], when: withParents,
    text: 'مهمون اومده و همه می‌گن «یه شعر بخون برامون!»',
    choices: [
      { label: '«جوجه جوجه طلایی» رو می‌خونم', do: (c) => { c.rep(2).happy(3); return 'همه دست زدن و خاله‌ات یه شکلات بزرگ بهت داد!'; } },
      { label: 'قایم می‌شم پشت در', do: (c) => { c.happy(-1); return 'خجالت کشیدی… خاله‌ات تا آخر شب صدات کرد «خجالتی خانواده»!'; } },
      { label: 'ادای گربه رو درمیارم!', do: (c) => { c.happy(4); return '«میو میو» کردی و چهار دست‌وپا دور اتاق رفتی. همه از خنده ریسه رفتن!'; } },
    ],
  },
  {
    id: 'k_crayon_wall', emoji: '🖍️', title: 'دیوار سفید', age: [3, 6], when: withParents,
    text: 'مداد شمعی پیدا کردی و دیوار سفید هال داره صدات می‌زنه…',
    choices: [
      {
        label: 'یه نقاشی بزرگ رو دیوار!',
        do: (c) => {
          if (c.trait('artist')) { closeParents(c, 3); return `${c.parent()} اول جیغ زد، بعد دید چه قشنگ کشیدی و ازش عکس گرفت!`; }
          closeParents(c, -4);
          return `${c.parent()} جیغ زد و تا شب دیوار رو با اسکاچ شست!`;
        },
      },
      { label: 'رو کاغذ می‌کشم', do: (c) => { c.smarts(1); closeParents(c, 3); return 'یه خونه و یه خورشید خندون کشیدی. نقاشیت رفت رو در یخچال!'; } },
    ],
  },
  {
    id: 'k_kindergarten', emoji: '🏫', title: 'مهدکودک', age: [3, 4], when: withParents,
    text: (c) => `روز اول مهدکودکه و ${c.parent()} می‌خواد بره…`,
    choices: [
      { label: 'جیغ می‌زنم و پاش رو می‌گیرم!', do: (c) => { c.happy(-2); return 'نیم ساعت گریه کردی… بعد یه ماشین‌بازی دیدی و یادت رفت!'; } },
      { label: 'با یه بچه‌ی دیگه دوست می‌شم', do: (c) => { c.addPerson({ rel: 'friend', gender: c.chance(0.5) ? 'm' : 'f', born: c.L.year - c.age, close: 70, met: 'مهدکودک' }); c.happy(4); return 'یه دوست پیدا کردی و تا آخر روز با هم خمیربازی کردین!'; } },
      { label: 'یه گوشه ساکت می‌شینم', do: (c) => { c.smarts(1); return 'کل روز ساکت به بقیه نگاه کردی. مربی گفت «چه بچه‌ی آرومی!»'; } },
    ],
  },
  {
    id: 'k_bedtime', emoji: '🌙', title: 'وقت خواب', age: [3, 7], once: false, cd: 3, when: withParents,
    text: 'ساعت ده شبه و اصلاً نمی‌خوای بخوابی.',
    choices: [
      { label: 'یه قصه‌ی دیگه!', do: (c) => { closeParents(c, 4); return `${c.parent()} سه تا قصه گفت و آخرش خودش زودتر از تو خوابش برد!`; } },
      { label: 'آب می‌خوام! جیش دارم! گرسنمه!', do: (c) => { c.happy(2); closeParents(c, -2); return 'تا ساعت دوازده هر پنج دقیقه یه بهونه آوردی!'; } },
      { label: 'باشه، می‌خوابم', do: (c) => { c.health(1); return 'زود خوابیدی و صبح سرحال بیدار شدی.'; } },
    ],
  },
  {
    id: 'k_cartoon', emoji: '📺', title: 'کارتون', age: [3, 9],
    text: 'کارتون مورد علاقه‌ات کدومه؟',
    choices: [
      { label: 'پت و مت', do: (c) => { c.happy(3); return `یه هفته هر چی تو خونه بود رو «تعمیر» کردی. ${c.parent('بزرگ‌ترها')} دیگه آچار رو قایم کرده!`; } },
      { label: 'باب اسفنجی', do: (c) => { c.happy(3); return 'تا یه ماه با صدای باب اسفنجی حرف زدی و همه رو کلافه کردی!'; } },
      { label: 'زبل‌خان', do: (c) => { c.smarts(1).happy(2); return 'مثل زبل‌خان برای هر مشکلی یه نقشه کشیدی!'; } },
    ],
  },
  {
    id: 'k_swing', emoji: '🛝', title: 'نوبت تاب', age: [3, 8],
    text: 'تو پارک یه بچه‌ی بزرگ‌تر نوبت تاب رو بهت نمی‌ده.',
    choices: [
      { label: 'گریه می‌کنم تا یکی بیاد', do: (c) => { c.happy(-1); return `${c.parent('مربی پارک')} اومد و حق رو به تو داد. ولی آبروت رفت!`; } },
      { label: 'نوبتم رو می‌گیرم!', do: (c) => { if (c.lucky(0.5)) { c.happy(3).rep(1); return 'محکم گفتی «نوبت منه!» و اون رفت کنار. حس قهرمانی داشتی!'; } c.happy(-3); return 'هلت داد و زمین خوردی. زانوت زخم شد!'; } },
      { label: 'می‌رم سراغ سرسره', do: (c) => { c.happy(2); return 'سرسره اصلاً بیشتر از تاب خوش می‌گذشت!'; } },
    ],
  },
  {
    id: 'k_veggies', emoji: '🥬', title: 'سبزی‌پلو', age: [3, 10], when: withParents,
    text: (c) => `${c.parent()} سبزی‌پلو با ماهی پخته و تو از سبزی متنفری.`,
    choices: [
      { label: 'می‌خورم', do: (c) => { c.health(2); closeParents(c, 2); return 'به زور خوردی و آخرش دیدی بد هم نبود!'; } },
      { label: 'سبزی‌ها رو دونه‌دونه جدا می‌کنم', do: (c) => { c.happy(1); closeParents(c, -2); return 'نیم ساعت با چنگال سبزی‌ها رو جدا کردی و یه کوه سبزی کنار بشقاب درست کردی!'; } },
      { label: 'زیر میز می‌دم به گربه', when: (c) => c.pets.some((p) => p.kind === 'cat' || p.kind === 'persian'), do: (c) => { c.happy(2); return 'گربه هم سبزی نخورد! ولی ماهی رو خورد و همه فهمیدن.'; } },
    ],
  },
  // ───────── schoolkids ─────────
  {
    id: 's_lunch_swap', emoji: '🥪', title: 'زنگ تفریح', age: [7, 12], when: atSchool,
    text: 'بغل‌دستیت لقمه‌ی نون و پنیر و گردو داره و تو کیک داری. با حسرت به کیکت نگاه می‌کنه.',
    choices: [
      { label: 'معاوضه می‌کنیم', do: (c) => { c.addPerson({ rel: 'friend', gender: c.male ? 'm' : 'f', born: c.L.year - c.age, close: 65, met: 'مدرسه' }); c.happy(3); return 'از اون روز بهترین دوست هم شدین!'; } },
      { label: 'نصف نصف', do: (c) => { c.rep(2).happy(2); return 'نصف کیکت رو دادی و نصف لقمه‌اش رو گرفتی. بهترین زنگ تفریح!'; } },
      { label: 'نمی‌دم!', do: (c) => { c.happy(1).rep(-1); return 'کیکت رو تنهایی خوردی. خوشمزه بود ولی یه کم عذاب وجدان داشتی.'; } },
    ],
  },
  {
    id: 's_monitor', emoji: '📋', title: 'مبصر کلاس', age: [7, 12], when: atSchool,
    text: 'معلم می‌خواد یه مبصر انتخاب کنه و به تو نگاه می‌کنه!',
    choices: [
      { label: 'قبول! اسم شلوغ‌ها رو می‌نویسم', do: (c) => { c.rep(2).happy(-1); return 'اسم نصف کلاس رو نوشتی. حالا زنگ تفریح کسی باهات بازی نمی‌کنه!'; } },
      { label: 'قبول، ولی هوای همه رو دارم', do: (c) => { c.rep(3).happy(2); c.L.edu.effort += 0.3; return 'هم معلم ازت راضیه هم بچه‌ها. سیاستمدار به دنیا اومدی!'; } },
      { label: 'نه، حوصله ندارم', do: () => 'معلم یه نفر دیگه رو انتخاب کرد و اولین اسمی که نوشت اسم تو بود!' },
    ],
  },
  {
    id: 's_school_play', emoji: '🎭', title: 'جشن مدرسه', age: [7, 12], when: atSchool,
    text: 'تو جشن آخر سال قراره نمایش «کدو قلقله‌زن» اجرا کنن. چه نقشی می‌خوای؟',
    choices: [
      { label: 'پیرزن!', do: (c) => { c.rep(2).happy(3); return 'با یه چادر گل‌گلی و عینک رفتی رو صحنه و همه دست زدن!'; } },
      { label: 'گرگ!', do: (c) => { c.happy(4); return 'انقدر خوب زوزه کشیدی که بچه‌های کلاس اول ترسیدن!'; } },
      { label: 'پشت صحنه می‌مونم', do: (c) => { c.smarts(1); return 'دکور رو ساختی. کدوی مقوایی‌ات بهترین قسمت نمایش بود!'; } },
    ],
  },
  {
    id: 's_summer_class', emoji: '☀️', title: 'تابستون', age: [7, 14], when: withParents,
    text: (c) => `تابستونه و ${c.parent()} می‌خواد ثبت‌نامت کنه یه کلاس. کدوم؟`,
    choices: [
      { label: 'شنا', do: (c) => { c.health(4).happy(2); return 'شنا یاد گرفتی! حالا تو استخر از بابات هم سریع‌تری.'; } },
      { label: 'زبان', do: (c) => { c.smarts(3); c.inc('engTerms'); return 'یه تابستون زبان خوندی. حالا «Hello, how are you?» رو با لهجه می‌گی!'; } },
      { label: 'نقاشی و سفال', do: (c) => { c.happy(3).smarts(1); return 'یه گلدون سفالی ساختی که یه کم کجه، ولی مامان‌بزرگ گذاشتش وسط طاقچه!'; } },
      { label: 'هیچی! فقط بازی!', do: (c) => { c.happy(5); return 'کل تابستون تو کوچه فوتبال و قایم‌باشک بازی کردی. بهترین تابستون عمرت!'; } },
    ],
  },
  {
    id: 's_no_homework', emoji: '📓', title: 'مشق', age: [7, 13], once: false, cd: 3, when: atSchool,
    text: 'مشقات رو ننوشتی و معلم داره ردیف به ردیف دفترها رو چک می‌کنه!',
    choices: [
      { label: 'می‌گم دفترم رو جا گذاشتم', do: (c) => { if (c.lucky(0.5)) return 'معلم گفت «فردا بیار!» نجات پیدا کردی… فعلاً!'; c.rep(-2); return 'معلم گفت «پس این چیه تو کیفت؟» و دفترت رو درآورد!'; } },
      { label: 'راستش رو می‌گم', do: (c) => { c.rep(1); c.L.edu.effort += 0.3; return 'معلم گفت «به خاطر راستگوییت این دفعه می‌بخشمت.»'; } },
      { label: 'یواشکی زیر میز می‌نویسم!', do: (c) => { if (c.lucky(0.4)) { c.happy(2); return 'با سرعت نور نوشتی و درست قبل از رسیدن معلم تموم شد!'; } c.rep(-2); return 'معلم دید و دفترت رو گرفت. بدتر شد!'; } },
    ],
  },
  {
    id: 's_pocket_money', emoji: '🪙', title: 'پول توجیبی', age: [7, 13], when: withParents,
    text: 'پول توجیبی این هفته‌ات رو گرفتی. باهاش چی‌کار می‌کنی؟',
    choices: [
      { label: 'پفک و پاستیل!', do: (c) => { c.happy(3); return 'رفتی بوفه‌ی مدرسه و همه‌اش رو خوراکی خریدی. دندونت درد گرفت!'; } },
      { label: 'می‌ریزم تو قلک', do: (c) => { c.money(c.price(200e3)); c.smarts(1); return `قلکت داره سنگین می‌شه! ${c.parent()} گفت «آفرین، اقتصاددان کوچولو».`; } },
      { label: 'کارت فوتبالی می‌خرم', do: (c) => { c.happy(2); return 'یه کارت کمیاب از بازیکن مورد علاقه‌ات درومد! کل کلاس حسودیشون شد.'; } },
    ],
  },
  {
    id: 's_olympiad', emoji: '🏅', title: 'المپیاد', age: [13, 16], when: (c) => atSchool(c) && c.s('smarts') >= 65,
    text: 'معلم ریاضی می‌گه «تو استعدادش رو داری، برای المپیاد بخون!»',
    choices: [
      {
        label: 'شبانه‌روزی می‌خونم!',
        do: (c) => {
          c.smarts(3).happy(-3);
          c.L.edu.effort += 1;
          if (c.lucky(c.s('smarts') / 140)) { c.rep(6).happy(10); c.flag('olympiad'); return 'مدال برنز المپیاد کشوری رو گرفتی! اسمت رو تابلوی مدرسه زدن.'; }
          return 'به مرحله‌ی دوم رسیدی ولی مدال نگرفتی. کلی چیز یاد گرفتی!';
        },
      },
      { label: 'نه، می‌خوام نوجوونی کنم', do: (c) => { c.happy(3); return 'معلم آه کشید ولی تو تابستون رو با رفقات گذروندی.'; } },
    ],
  },
  // ───────── the old ─────────
  {
    id: 'o_voice_message', emoji: '📱', title: 'پیام صوتی', age: [65, 100], when: (c) => c.kids.length > 0,
    text: 'نوه‌ات می‌خواد بهت یاد بده با گوشی پیام صوتی بفرستی.',
    choices: [
      { label: 'یاد می‌گیرم!', do: (c) => { c.smarts(1).happy(3); return 'حالا هر روز صبح برای کل فامیل پیام صوتی «صبح بخیر» با گل و بلبل می‌فرستی!'; } },
      { label: 'من با همون تلفن خونه راحتم', do: (c) => { c.happy(1); return 'گفتی «تو زمان ما نامه می‌نوشتیم!» و نوه‌ات خندید.'; } },
      { label: 'به جاش بهش تخته‌نرد یاد می‌دم', do: (c) => { c.happy(4); return 'نوه‌ات تخته‌نرد یاد گرفت و دست دوم تو رو برد! «جفت شیش!»'; } },
    ],
  },
  {
    id: 'o_zoolbia', emoji: '🍯', title: 'رژیم دکتر', age: [60, 100],
    text: 'دکتر گفته قند و نمک ممنوع! ولی سر سفره زولبیا بامیه گذاشتن…',
    choices: [
      { label: 'فقط یکی!', do: (c) => { c.happy(4).health(-2); return 'یکی شد سه تا. ولی می‌ارزید!'; } },
      { label: 'نه، رعایت می‌کنم', do: (c) => { c.health(3).happy(-1); return 'با حسرت به زولبیاها نگاه کردی و چای تلخ خوردی. دکتر بهت افتخار می‌کنه!'; } },
    ],
  },
  {
    id: 'o_old_photos', emoji: '🖼️', title: 'عکس‌های قدیمی', age: [60, 100],
    text: 'تو انباری یه جعبه‌ی قدیمی پیدا کردی، پر از عکس‌های سیاه‌وسفید.',
    choices: [
      { label: 'با نوه‌ها می‌شینم و تعریف می‌کنم', when: (c) => c.kids.length > 0, do: (c) => { c.happy(6); for (const k of c.kids) c.close(k, 4); return 'نوه‌ها باورشون نمی‌شد تو جوونی اون مدل مو رو داشتی!'; } },
      { label: 'تنهایی نگاهشون می‌کنم', do: (c) => { c.happy(3); return 'یه عصر کامل با عکس‌ها تو گذشته سفر کردی. یه کم اشک، یه کم لبخند.'; } },
      { label: 'می‌دم اسکن کنن', cost: (c) => c.price(2e6), note: (c) => money(c.price(2e6)), do: (c) => { c.happy(4); return 'همه‌ی عکس‌ها رو دیجیتالی کردی و تو گروه فامیل فرستادی. گروه منفجر شد!'; } },
    ],
  },
  {
    id: 'o_will', emoji: '📜', title: 'وصیت‌نامه', age: [70, 100], when: (c) => c.kids.length > 0,
    text: 'وقتشه وصیت‌نامه‌ات رو بنویسی.',
    choices: [
      { label: 'همه چیز مساوی بین بچه‌ها', do: (c) => { for (const k of c.kids) c.close(k, 5); c.rep(2); return 'وصیت‌نامه رو نوشتی و خیالت راحت شد. بچه‌ها گفتن «خدا سایه‌ات رو کم نکنه!»'; } },
      { label: 'بیشتر به اونی که بیشتر سر می‌زنه!', do: (c) => { const fav = [...c.kids].sort((a, b) => b.close - a.close)[0]; c.close(fav, 10); for (const k of c.kids) if (k !== fav) c.close(k, -6); return `از اون روز بچه‌ها هر هفته میان پیشت! ${fav.first} از همه بیشتر.`; } },
      { label: 'یه سهم هم برای خیریه', do: (c) => { c.rep(8).happy(3); return 'یه سهم از دارایی‌ات رو وقف یه مدرسه کردی. اسمت رو سر در مدرسه می‌زنن!'; } },
    ],
  },
  {
    id: 'o_bread_queue', emoji: '🥖', title: 'صف نونوایی', age: [65, 100], where: 'ir',
    text: (c) => `صبح زود رفتی نونوایی و صف طولانیه. یه جوون می‌گه «${c.g('حاج‌آقا', 'حاج‌خانم')}، بفرمایید جلو!»`,
    choices: [
      { label: 'قبول می‌کنم، دستش درد نکنه', do: (c) => { c.happy(3); return 'نون سنگک داغ گرفتی و تو راه خونه نصفش رو خوردی!'; } },
      { label: 'نه جوون، تو صف می‌مونم', do: (c) => { c.rep(2).health(1); return 'تو صف با بقیه از قیمت‌ها و قدیم‌ها گفتین. صف نونوایی بهترین جای دنیاست!'; } },
    ],
  },
  {
    id: 'o_morning_group', emoji: '🌅', title: 'ورزش صبحگاهی', age: [62, 95], where: 'ir',
    text: 'تو پارک محله یه گروه از بازنشسته‌ها هر روز صبح ساعت شش ورزش می‌کنن و ازت دعوت کردن.',
    choices: [
      { label: 'می‌رم! صبح‌ها کاری ندارم', do: (c) => { c.health(4).happy(4); c.addPerson({ rel: 'friend', gender: c.male ? 'm' : 'f', born: c.L.year - c.age + c.int(-5, 5), close: 70, met: 'پارک محله' }); return 'حالا هر روز صبح با رفقای جدیدت نرمش می‌کنی و بعدش چای و کیک!'; } },
      { label: 'ساعت شش؟! نه!', do: (c) => { c.happy(1); return 'ترجیح دادی بخوابی. اونا هر روز از زیر پنجره‌ات با سروصدا رد می‌شن!'; } },
    ],
  },
]);
