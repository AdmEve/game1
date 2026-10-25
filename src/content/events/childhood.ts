import { type Ctx } from '../../engine/ctx';
import { money } from '../../engine/fmt';
import { defEvents } from '../../engine/registry';

const sib = (c: Ctx) => c.rels('brother', 'sister')[0];

defEvents([
  {
    id: 'c_baby_sibling', age: [1, 10], emoji: '👶',
    when: (c) => !!c.rel('mother') && c.ageOf(c.rel('mother')!) < 42 && c.rels('brother', 'sister').length < 4,
    w: 1.2,
    text: '', auto: (c) => {
      const g = c.chance(0.5) ? 'm' : 'f';
      const n = c.addPerson({ rel: g === 'm' ? 'brother' : 'sister', gender: g, born: c.L.year, last: c.L.last, close: 70 });
      c.happy(c.chance(0.6) ? 4 : -3);
      return `👶 ${g === 'm' ? 'یه داداش' : 'یه آبجی'} کوچولو به دنیا اومد: ${n.first}! دیگه بچه‌ی آخر نیستی.`;
    },
    kind: 'big', pop: true,
  },
  {
    id: 'c_first_tooth', age: [0, 1], emoji: '🦷', text: '',
    auto: (c) => { c.happy(-2); return '🦷 اولین دندونت دراومد. مامانت دندونی پخت و به همسایه‌ها داد!'; },
  },
  {
    id: 'c_sick_child', age: [1, 8], emoji: '🤒', text: '', once: false, cd: 3,
    auto: (c) => { c.health(-c.int(3, 8)); return c.pick(['🤒 آنفولانزا گرفتی و یه هفته خونه بودی. مامانت سوپ جو پخت.', '🤒 آبله‌مرغون گرفتی! همه‌ی صورتت دونه زد.', '🤒 گوش‌درد گرفتی و کل شب گریه کردی.']); },
    kind: 'bad',
  },
  {
    id: 'c_toy', age: [3, 9], emoji: '🧸', title: 'اسباب‌بازی‌فروشی',
    text: 'تو بازار با مامانت یه ماشین کنترلی خیلی خوشگل دیدی. مامانت می‌گه «نه، گرونه».',
    choices: [
      { label: 'وسط بازار گریه و جیغ!', do: (c) => { const m = c.rel('mother'); if (c.lucky(0.4)) { c.happy(8); return 'از خجالت مردم، مامانت برات خریدش!'; } if (m) c.close(m, -6); c.happy(-5); return 'مامانت دستت رو کشید و تا خونه دعوات کرد.'; } },
      { label: 'باشه، اشکال نداره', do: (c) => { const m = c.rel('mother'); if (m) c.close(m, 6); c.rep(2); return 'مامانت بغلت کرد و گفت «الهی قربونت برم که انقدر فهمیده‌ای». هفته‌ی بعد برات خریدش!'; } },
    ],
  },
  {
    id: 'c_nowruz_eidi', age: [3, 16], emoji: '🌸', once: false, cd: 1, w: 0.8,
    text: '', auto: (c) => {
      const amt = c.price(c.int(1, 6) * 500e3 * ((c.L.flags.rich ?? 2) + 1));
      c.money(amt).happy(5);
      const gm = c.rels('grandma', 'grandpa')[0];
      return `🌸 عید نوروز! ${gm ? `${c.relName(gm)} یه اسکناس تانخورده لای قرآن بهت داد.` : 'از فامیل عیدی گرفتی.'} جمعاً ${money(amt)} عیدی گرفتی!`;
    },
    kind: 'good',
  },
  {
    id: 'c_eidi_mom', age: [5, 12], emoji: '💰', title: 'عیدی‌ها',
    text: 'مامانت می‌گه «عیدی‌هات رو بده من برات نگه دارم، گم‌شون می‌کنی».',
    choices: [
      { label: 'باشه، بیا', do: (c) => { const lost = Math.round(c.cash * 0.5); c.money(-lost); c.happy(-2); return `عیدی‌هات رو دادی… و دیگه هیچ‌وقت ندیدی‌شون! (${money(lost)})`; } },
      { label: 'نه! قایمش می‌کنم زیر فرش', do: (c) => { if (c.chance(0.3)) { const lost = Math.round(c.cash * 0.3); c.money(-lost); return `قایمش کردی ولی یادت رفت کجا! ${money(lost)} گم شد.`; } c.happy(3); return 'پول‌ها رو قایم کردی. احساس پولداری می‌کنی!'; } },
    ],
  },
  {
    id: 'c_vase', age: [4, 10], emoji: '🏺', title: 'گلدون مادربزرگ',
    when: (c) => c.rels('grandma').length > 0,
    text: 'تو خونه‌ی مادربزرگ توپ‌بازی کردی و گلدون قدیمیش شکست!',
    choices: [
      { label: 'راستش رو می‌گم', do: (c) => { const g = c.rel('grandma'); if (g) c.close(g, 5); c.rep(3); return 'مادربزرگ گفت «فدای سرت، فقط دستت نبرید؟» و یه شکلات بهت داد.'; } },
      { label: 'می‌ندازم گردن گربه', do: (c) => { if (c.lucky(0.5)) { c.happy(3); return 'همه باور کردن. گربه‌ی بیچاره از خونه بیرون شد!'; } c.rep(-5); const g = c.rel('grandma'); if (g) c.close(g, -8); return 'خونه گربه نداشت! همه فهمیدن دروغ گفتی.'; } },
      { label: 'می‌ندازم گردن داداش/آبجی', when: (c) => !!sib(c), do: (c) => { const s = sib(c)!; c.close(s, -12); if (c.lucky(0.6)) return `${s.first} تنبیه شد و تو قسر در رفتی!`; c.rep(-4); return 'نقشه‌ات لو رفت و دوتاتون تنبیه شدین!'; } },
    ],
  },
  {
    id: 'c_dog', age: [5, 12], emoji: '🐕', title: 'توله‌سگ',
    text: 'یه توله‌سگ گرسنه دم در خونه پیدا کردی. می‌خوای نگهش داری؟',
    choices: [
      { label: 'آره! اسمش رو می‌ذارم «پاپی»', do: (c) => { if (c.lucky(0.4)) { c.flag('pet'); c.happy(12); return 'بابات اول مخالفت کرد ولی آخرش قبول کرد. پاپی شد عضو خانواده!'; } c.happy(-6); return 'مامانت گفت «یا جای سگه یا جای من!» و پاپی رو دادین به یه پناهگاه.'; } },
      { label: 'بهش غذا می‌دم و می‌ذارم بره', do: (c) => { c.happy(3).rep(1); return 'بهش نون و پنیر دادی. دمش رو تکون داد و رفت.'; } },
    ],
  },
  {
    id: 'c_bully', age: [7, 14], emoji: '😠', title: 'قلدر مدرسه',
    text: (c) => `یه پسر قلدر تو مدرسه هر روز ${c.male ? 'لقمه‌ات رو می‌گیره' : 'کیفت رو پرت می‌کنه'}.`,
    choices: [
      { label: 'باهاش دعوا می‌کنم', do: (c) => { if (c.lucky(0.35 + c.s('health') / 300)) { c.happy(8).rep(6); return 'یه مشت زدی تو دماغش! دیگه هیچ‌وقت سمتت نیومد. شدی قهرمان کلاس.'; } c.health(-6).happy(-6); return 'خوردی و بدتر شد. با چشم کبود رفتی خونه.'; } },
      { label: 'به ناظم می‌گم', do: (c) => { c.rep(-2); if (c.chance(0.6)) return 'ناظم ازش تعهد گرفت و دیگه کاری بهت نداشت.'; c.happy(-4); return 'ناظم گفت «خودتون حلش کنین» و قلدره بیشتر اذیتت کرد.'; } },
      { label: 'باهاش رفیق می‌شم', do: (c) => { if (c.lucky(0.4 + (c.trait('charming') ? 0.3 : 0))) { c.addPerson({ rel: 'friend', gender: 'm', born: c.L.year - c.age - 1, close: 60, met: 'مدرسه' }); c.happy(5); return 'باهاش رفیق شدی! حالا اون از تو دفاع می‌کنه.'; } c.happy(-3); return 'بهت خندید و گفت «برو بابا».'; } },
    ],
  },
  {
    id: 'c_teacher_pet', age: [7, 12], emoji: '🍎', text: '', w: 0.7,
    when: (c) => c.L.edu.stage === 'school' && c.s('smarts') > 65,
    auto: (c) => { c.happy(4).rep(3); return '🍎 معلمت جلوی کلاس ازت تعریف کرد و گفت «همه مثل ' + c.name + ' باشین!» بقیه چپ‌چپ نگاهت کردن.'; },
    kind: 'good',
  },
  {
    id: 'c_homework', age: [7, 12], emoji: '📒', title: 'مشق شب',
    when: (c) => c.L.edu.stage === 'school',
    text: 'کارتون مورد علاقه‌ات داره پخش می‌شه، ولی هنوز مشق‌هات رو ننوشتی.',
    choices: [
      { label: 'اول مشق، بعد کارتون', do: (c) => { c.L.edu.effort += 1; c.happy(-1); return 'مشق‌هات رو با خط خوش نوشتی. معلم بهت «آفرین» با برچسب ستاره داد!'; } },
      { label: 'کارتون! مشق رو صبح می‌نویسم', do: (c) => { c.happy(4); if (c.chance(0.5)) { c.L.edu.effort -= 1; c.rep(-2); return 'صبح خواب موندی و مشق ننوشته رفتی مدرسه. معلم یه صفحه جریمه داد!'; } return 'صبح زود بیدار شدی و با عجله نوشتی. قسر در رفتی!'; } },
      { label: 'داداش/آبجی بزرگه بنویسه', when: (c) => c.rels('brother', 'sister').some((s) => c.ageOf(s) > c.age + 3), do: (c) => { const s = c.rels('brother', 'sister').find((x) => c.ageOf(x) > c.age + 3)!; c.close(s, -5); if (c.chance(0.4)) { c.rep(-3); return 'معلم از خط فهمید که خودت ننوشتی!'; } return `${s.first} با غرغر مشق‌هات رو نوشت.`; } },
    ],
  },
  {
    id: 'c_school_trip', age: [8, 12], emoji: '🚌', text: '',
    auto: (c) => { c.happy(6); return `🚌 با مدرسه رفتین اردو ${c.pick(['باغ‌وحش', 'موزه', 'پارک جنگلی', 'کارخونه‌ی شکلات‌سازی'])}. تو اتوبوس کلی آواز خوندین!`; },
    kind: 'good',
  },
  {
    id: 'c_lost', age: [4, 8], emoji: '😢', title: 'گم شدی!',
    text: 'تو شلوغی بازار دست مامانت رو ول کردی و گم شدی!',
    choices: [
      { label: 'گریه می‌کنم', do: (c) => { c.happy(-4); return 'یه خانم مهربون بردت پیش پلیس و از بلندگوی بازار اسمت رو صدا زدن. مامانت با گریه پیدات کرد.'; } },
      { label: 'می‌رم پیش یه مغازه‌دار', do: (c) => { c.smarts(2).rep(2); return 'رفتی پیش یه مغازه‌دار و شماره‌ی خونه رو که حفظ بودی گفتی. همه گفتن «چه بچه‌ی باهوشی!»'; } },
    ],
  },
  {
    id: 'c_parents_fight', age: [5, 16], emoji: '💢', title: 'دعوای بابا و مامان',
    when: (c) => c.parents.length === 2,
    text: 'بابا و مامانت سر پول حسابی دعوا کردن. صداشون تا اتاقت میاد.',
    choices: [
      { label: 'می‌رم وسط آشتی‌شون بدم', do: (c) => { if (c.chance(0.6)) { for (const p of c.parents) c.close(p, 5); return 'گفتی «تو رو خدا دعوا نکنین» و هر دوتاشون آروم شدن و بغلت کردن.'; } c.happy(-4); return 'گفتن «تو برو تو اتاقت، به تو ربطی نداره».'; } },
      { label: 'هدفون می‌ذارم', do: (c) => { c.happy(-3); return 'صدای آهنگ رو زیاد کردی. ولی دلت گرفت.'; } },
    ],
  },
  {
    id: 'c_divorce_parents', age: [3, 17], emoji: '💔', w: 0.15,
    when: (c) => c.parents.length === 2 && !c.has('parents_divorced'),
    text: '', auto: (c) => {
      c.flag('parents_divorced');
      c.happy(-15);
      const dad = c.rel('father');
      if (dad) c.close(dad, -15);
      return '💔 بابا و مامانت از هم جدا شدن. با مامانت زندگی می‌کنی و آخر هفته‌ها بابات رو می‌بینی.';
    },
    kind: 'bad', pop: true,
  },
  {
    id: 'c_talent', age: [6, 12], emoji: '🌟', title: 'استعداد',
    text: 'معلم ورزش‌تون می‌گه استعداد داری و می‌تونی تو تیم مدرسه باشی.',
    choices: [
      { label: 'آره، می‌رم تیم فوتبال', do: (c) => { c.flag('sport_kid'); c.health(5).happy(5); return 'عضو تیم فوتبال مدرسه شدی! تو مسابقات منطقه دوم شدین.'; } },
      { label: 'نه، من اهل کتابم', do: (c) => { c.smarts(2); return 'ترجیح دادی تو کتابخونه‌ی مدرسه بمونی.'; } },
    ],
  },
  {
    id: 'c_fever_shot', age: [2, 6], emoji: '💉', text: '',
    auto: (c) => { c.happy(-3); return '💉 بردنت آمپول بزنی. جیغت کل درمونگاه رو برداشت!'; },
  },
  {
    id: 'c_fireworks', age: [8, 17], emoji: '🔥', title: 'چهارشنبه‌سوری',
    text: 'چهارشنبه‌سوریه و بچه‌های کوچه دارن ترقه می‌زنن. یکی بهت یه نارنجک دستی (!) تعارف می‌کنه.',
    choices: [
      { label: 'فقط از روی آتیش می‌پرم', do: (c) => { c.happy(5); return '«زردی من از تو، سرخی تو از من!» از روی آتیش پریدی. عالی بود.'; } },
      { label: 'بده من!', do: (c) => { if (c.lucky(0.75)) { c.happy(8); return 'صداش کل محل رو لرزوند! همه‌ی ماشین‌ها دزدگیرشون روشن شد.'; } c.health(-15).happy(-10); return 'توی دستت ترکید! با دست باندپیچی‌شده رفتی اورژانس.'; } },
      { label: 'می‌رم قاشق‌زنی', do: (c) => { c.happy(5); const m = c.price(500e3); c.money(m); return `با بچه‌ها رفتین قاشق‌زنی. همسایه‌ها آجیل و ${money(m)} پول تو کاسه‌تون ریختن!`; } },
    ],
  },
  {
    id: 'c_cartoon_dream', age: [5, 10], emoji: '🦸', text: '',
    auto: (c) => { const j = c.pick(['خلبان', 'دکتر', 'آتش‌نشان', 'فوتبالیست', 'فضانورد', 'پلیس', 'معلم', 'خواننده']); c.flag('dream_' + j); return `🦸 تو انشای «می‌خواهید در آینده چه‌کاره شوید؟» نوشتی: «${j}». معلم بیست داد!`; },
  },
  {
    id: 'c_glasses', age: [7, 14], emoji: '👓', w: 0.5, text: '',
    auto: (c) => { c.looks(-2); c.flag('glasses'); return '👓 چشمت ضعیف شده و عینکی شدی. حالا بهت می‌گن «پروفسور»!'; },
  },
  {
    id: 'c_sampad_class', age: [9, 11], emoji: '🏫', title: 'کلاس تقویتی',
    when: (c) => c.L.edu.stage === 'school',
    text: 'مامانت می‌خواد تو رو بفرسته کلاس تقویتی برای آزمون تیزهوشان.',
    choices: [
      { label: 'باشه، می‌رم', do: (c) => { c.L.edu.effort += 1.5; c.smarts(3).happy(-4); return 'هفته‌ای سه روز رفتی کلاس. وقت بازی‌ات نصف شد!'; } },
      { label: 'نه تو رو خدا!', do: (c) => { c.happy(3); const m = c.rel('mother'); if (m) c.close(m, -3); return 'گریه کردی و مامانت بی‌خیال شد.'; } },
    ],
  },
  {
    id: 'c_birthday', age: [4, 12], emoji: '🎂', text: '', once: false, cd: 4,
    auto: (c) => { c.happy(5); return `🎂 تولدت رو گرفتن! ${c.pick(['کیک شکلاتی با شمع فشفشه‌ای!', 'همه‌ی بچه‌های کلاس اومدن.', 'یه دوچرخه کادو گرفتی!', 'عمه‌ات یه بلوز گنده کادو آورد که سه سال بعد اندازه‌ات شد!'])}`; },
    kind: 'good',
  },
  {
    id: 'c_earthquake', age: [3, 90], emoji: '🌍', w: 0.12, title: 'زلزله!',
    text: 'نصفه‌شب زمین لرزید! لوسترها تکون می‌خورن.',
    choices: [
      { label: 'می‌رم زیر میز', do: (c) => { c.happy(-4); return 'زیر میز موندی تا لرزش تموم شد. خدا رو شکر خسارتی نبود. تا صبح کل محل تو کوچه بودن!'; } },
      { label: 'می‌دوم تو کوچه', do: (c) => { if (c.chance(0.15)) { c.health(-8); return 'تو راه پله پات پیچ خورد و افتادی!'; } c.happy(-3); return 'با پیژامه دویدی تو کوچه. همسایه‌ها هم همین‌طور!'; } },
    ],
  },
]);
