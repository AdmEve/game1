import { award } from '../../engine/achieve';
import { clamp, type Ctx } from '../../engine/ctx';
import { fa, money } from '../../engine/fmt';
import { defEvents } from '../../engine/registry';
import { rentCost } from '../../engine/year';
import { jobById } from '../jobs';
import { sendJail } from './milestones';

const serving = (c: Ctx) => c.L.mil.status === 'serving' && c.L.mil.place !== 'یه اداره نزدیک خونه';
const working = (c: Ctx) => !!c.L.job && !c.L.job.part;
const married = (c: Ctx) => !!c.spouse;
const jobTitle = (c: Ctx) => jobById(c.L.job!.id)?.title ?? 'کار';

/** What the landlord's rise costs this year (on top of the usual rent). */
function landlordExtra(c: Ctx) {
  return Math.round(rentCost(c.L) * ((c.p.pct as number) / 100) * 0.5);
}

defEvents([
  // ───────── military service ─────────
  {
    id: 'a_army_guard', emoji: '🪖', title: 'نگهبانی', w: 6, when: serving, age: [18, 45],
    text: 'ساعت ۳ صبح نوبت نگهبانیته. خیلی خوابت میاد و هیچ‌کس هم نیست.',
    choices: [
      { label: 'بیدار می‌مونم', do: (c) => { c.rep(3).happy(-2); return 'تا صبح بیدار موندی و ستاره‌ها رو شمردی. فرمانده تشویقت کرد.'; } },
      { label: 'یه چرت کوچیک', do: (c) => { if (c.lucky(0.6)) { c.happy(2); return 'یه ساعت خوابیدی و هیچ‌کس نفهمید!'; } c.L.mil.months = (c.L.mil.months ?? 0) + 2; c.happy(-8); return 'افسر نگهبان مچت رو گرفت! دو ماه اضافه خدمت خوردی.'; } },
    ],
  },
  {
    id: 'a_army_leave', emoji: '🏠', title: 'مرخصی', w: 5, when: serving, age: [18, 45],
    text: 'فرمانده می‌گه اگه یه کاری براش انجام بدی، یه هفته مرخصی تشویقی می‌گیری.',
    choices: [
      { label: 'هر کاری بگی!', do: (c) => { c.happy(6); return `ماشین شخصی فرمانده رو شستی و ${c.pick(['حیاط پادگان رو جارو کردی', 'آشپزخونه رو تمیز کردی'])}. یه هفته مرخصی گرفتی و رفتی خونه. مامانت قرمه‌سبزی پخت!`; } },
      { label: 'نه، من سربازم نه نوکر', do: (c) => { c.rep(2).happy(-3); return 'فرمانده اخم کرد و اسمت رو نوشت برای نگهبانی شب جمعه.'; } },
    ],
  },
  {
    id: 'a_army_friend', emoji: '🤝', w: 4, when: serving, age: [18, 45], text: '',
    auto: (c) => { const n = c.addPerson({ rel: 'friend', gender: 'm', born: c.L.year - c.age + c.int(-3, 3), close: 75, met: 'سربازی' }); c.happy(5); return `🤝 تو آسایشگاه با ${n.first} از ${c.randomCity().name} رفیق شدی. شب‌ها تا دیروقت از خاطرات حرف می‌زنین.`; },
    kind: 'good',
  },
  {
    id: 'a_army_shooting', emoji: '🎯', w: 3, when: serving, age: [18, 45], text: '',
    auto: (c) => { if (c.chance(0.5)) { c.happy(4).rep(2); return '🎯 تو تیراندازی ۲۰ از ۲۰ زدی! فرمانده گفت «تک‌تیرانداز گروهانی».'; } c.happy(-2); return '🎯 تو تیراندازی همه‌ی تیرها رو زدی به خاک! بچه‌ها تا آخر خدمت مسخره‌ات کردن.'; },
  },
  {
    id: 'a_army_food', emoji: '🍛', w: 3, when: serving, age: [18, 45], text: '',
    auto: (c) => { c.health(-2).happy(-2); return `🍛 غذای پادگان امروز ${c.pick(['عدس‌پلو بی‌عدس', 'کتلت لاستیکی', 'سوپ آب‌زیپو', 'ماکارونی شل'])} بود. دلت برای غذای مامانت تنگ شد.`; },
  },
  // ───────── work ─────────
  {
    id: 'a_boss_bad', emoji: '😤', title: 'رئیس بداخلاق', w: 1.5, when: working, age: [18, 70], once: false, cd: 6,
    text: 'رئیست جلوی همه سرت داد زد که چرا گزارش دیر شده.',
    choices: [
      { label: 'جوابش رو می‌دم!', do: (c) => { if (c.chance(0.4)) { c.L.job!.perf = clamp(c.L.job!.perf - 20); c.happy(4); return 'جوابش رو دادی. همکارها یواشکی تشویقت کردن ولی رئیست کینه به دل گرفت.'; } c.L.job = null; c.happy(-10); return 'جوابش رو دادی و همون روز اخراجت کرد!'; } },
      { label: 'هیچی نمی‌گم', do: (c) => { c.happy(-5); return 'سرت رو انداختی پایین. تو ماشین تا خونه به خودت فحش دادی.'; } },
      { label: 'بعداً با آرامش حرف می‌زنم', do: (c) => { if (c.chance(0.6)) { c.L.job!.perf = clamp(c.L.job!.perf + 8); c.rep(2); return 'رفتی دفترش و با آرامش توضیح دادی. عذرخواهی کرد!'; } return 'گفت «حرف حساب جواب نداره» و رفت.'; } },
    ],
  },
  {
    id: 'a_coworker_credit', emoji: '🐍', title: 'دزد ایده', w: 1, when: working, age: [20, 65],
    text: 'همکارت ایده‌ی تو رو به اسم خودش به مدیرعامل ارائه داد!',
    choices: [
      { label: 'جلوی همه افشاش می‌کنم', do: (c) => { if (c.lucky(0.5)) { c.L.job!.perf = clamp(c.L.job!.perf + 15); c.rep(4); return 'ایمیل‌های قدیمیت رو نشون دادی و مدیرعامل فهمید! همکارت اخطار گرفت.'; } c.rep(-4); return 'کسی حرفت رو باور نکرد و شدی آدم حسود شرکت!'; } },
      { label: 'می‌سپارمش به خدا', do: (c) => { c.happy(-4); return 'هیچی نگفتی. اون ترفیع گرفت!'; } },
    ],
  },
  {
    id: 'a_overtime', emoji: '⏰', title: 'اضافه‌کاری', w: 1, when: working, age: [18, 65], once: false, cd: 4,
    text: 'رئیس می‌گه آخر هفته باید بیای اضافه‌کاری.',
    choices: [
      { label: 'باشه، میام', do: (c) => { const m = Math.round(c.L.job!.salary * 0.3); c.money(m); c.L.job!.perf = clamp(c.L.job!.perf + 6); c.happy(-4); return `آخر هفته کار کردی و ${money(m)} اضافه‌کاری گرفتی.`; } },
      { label: 'نه، با خانواده‌ام', do: (c) => { c.L.job!.perf = clamp(c.L.job!.perf - 5); c.happy(4); for (const p of c.rels('spouse', 'child')) c.close(p, 5); return 'گفتی برنامه داری و رفتی پیک‌نیک.'; } },
    ],
  },
  {
    id: 'a_salary_late', emoji: '💸', w: 0.8, when: working, age: [18, 65], once: false, cd: 5, text: '',
    auto: (c) => { c.happy(-5); return `💸 حقوقت سه ماهه عقب افتاده! ${c.pick(['شرکت می‌گه «بودجه نیومده».', 'رئیس می‌گه «این ماه حتماً».', 'همه‌ی همکارها دارن غر می‌زنن.'])}`; },
    kind: 'bad',
  },
  {
    id: 'a_bonus', emoji: '🎁', w: 0.8, when: working, age: [18, 65], once: false, cd: 4, text: '',
    auto: (c) => { const b = Math.round(c.L.job!.salary * c.rng.range(0.5, 2)); c.money(b).happy(6); return `🎁 آخر سال ${money(b)} پاداش و عیدی گرفتی!`; },
    kind: 'good',
  },
  {
    id: 'a_side_hustle', emoji: '💡', title: 'کار دوم', w: 0.8, age: [22, 55],
    when: (c) => !!c.L.job,
    text: (c) => `با این حقوق «${jobTitle(c)}» زندگی نمی‌چرخه. رفیقت پیشنهاد می‌ده عصرها با ماشینش مسافرکشی کنی.`,
    choices: [
      { label: 'آره، شب‌ها هم کار می‌کنم', do: (c) => { const m = c.price(c.int(60, 140) * 1e6); c.money(m); c.happy(-5).health(-3); return `عصرها مسافرکشی کردی و ${money(m)} درآوردی. ولی دیگه خواب نداری!`; } },
      { label: 'نه، کم می‌خورم ولی آروم', do: (c) => { c.happy(2); return 'قناعت کردی. «کم بخور، همیشه بخور».'; } },
    ],
  },
  {
    id: 'a_jobless_blues', emoji: '🛋️', title: 'بیکاری', w: 1.5, age: [22, 55], once: false, cd: 3,
    when: (c) => !c.L.job && c.L.edu.stage === 'none' && !c.L.pension && c.L.mil.status !== 'serving',
    text: (c) => `${c.count('jobless') > 2 ? 'چند ساله' : 'یه مدته'} بیکاری. ${c.rel('father') ? 'بابات سر سفره مدام می‌پرسه' : 'فامیل مدام می‌پرسن'} «کار پیدا نکردی؟»`,
    choices: [
      { label: 'هر کاری باشه قبول می‌کنم', do: (c) => { const j = jobById(c.pick(['courier', 'seller', 'worker', 'peddler']))!; c.L.job = { id: j.id, since: c.L.year, perf: 50, level: 0, salary: 0 }; c.L.job.salary = Math.round(j.pay * c.L.econ.wage); if (!c.L.career.some((x) => x.id === j.id)) c.L.career.push({ id: j.id, title: j.title, years: 0 }); c.happy(2); return `شدی «${j.title}». یه شروعه!`; } },
      { label: 'منتظر کار مناسب می‌مونم', do: (c) => { c.happy(-4); return 'گفتی «من با این مدرک کارگری نمی‌کنم!» و منتظر موندی.'; } },
    ],
  },
  // ───────── money & daily life ─────────
  {
    id: 'a_landlord', emoji: '🏚️', title: 'صاحبخونه', w: 2, age: [18, 90], once: false, cd: 3,
    when: (c) => c.L.home === 'rent',
    prep: (c) => ({ pct: c.int(30, 70) }),
    text: (c) => `صاحبخونه زنگ زده: «امسال اجاره رو ${fa(c.p.pct as number)}٪ می‌برم بالا، اگه نمی‌خوای تخلیه کن!»`,
    choices: [
      { label: 'قبول می‌کنم', do: (c) => { const extra = landlordExtra(c); c.money(-extra); c.happy(-5); return `قبول کردی. امسال ${money(extra)} بیشتر اجاره دادی.`; } },
      { label: 'چونه می‌زنم', do: (c) => { if (c.lucky(0.5)) { c.happy(2); return 'با کلی خواهش، صاحبخونه قبول کرد کمتر ببره بالا.'; } const extra = Math.round(landlordExtra(c) * 1.1); c.money(-extra); c.happy(-6); return `صاحبخونه قبول نکرد و لج کرد! امسال ${money(extra)} بیشتر اجاره دادی.`; } },
      { label: 'اسباب‌کشی به محله‌ی ارزون‌تر', do: (c) => { c.L.lifestyle = Math.max(0, c.L.lifestyle - 1); c.happy(-6).health(-2); return 'اسباب‌کشی کردی به یه محله‌ی پایین‌تر. کمرت از جابه‌جایی وسایل درد گرفت!'; } },
    ],
  },
  {
    id: 'a_inflation_shock', emoji: '🛒', w: 1, age: [18, 90], once: false, cd: 4,
    when: (c) => c.L.econ.infl > 0.45,
    text: '', auto: (c) => { c.happy(-4); return `🛒 رفتی سوپرمارکت و دیدی قیمت ${c.pick(['روغن', 'برنج', 'مرغ', 'پنیر', 'گوشت', 'شیر'])} دوبرابر شده! با یه کیسه‌ی نصفه برگشتی.`; },
    kind: 'bad',
  },
  {
    id: 'a_traffic', emoji: '🚗', title: 'ترافیک', w: 1, age: [18, 90], once: false, cd: 5,
    when: (c) => c.L.city === 'tehran' || c.L.city === 'karaj',
    text: 'تو ترافیک اتوبان سه ساعت گیر کردی. یه نفر داره از لاین خاکی سبقت می‌گیره.',
    choices: [
      { label: 'بوق می‌زنم و داد می‌زنم', do: (c) => { c.happy(-3).health(-1); return 'داد زدی و اونم جوابت رو داد. فشارت رفت بالا!'; } },
      { label: 'پادکست گوش می‌دم', do: (c) => { c.smarts(1).happy(1); return 'یه پادکست تاریخی گوش دادی. ترافیک قابل تحمل شد.'; } },
      { label: 'منم از خاکی می‌رم!', do: (c) => { if (c.chance(0.4)) { const f = c.price(3e6); c.money(-f); c.rep(-2); return `پلیس گرفتت و ${money(f)} جریمه شدی!`; } c.happy(2); return 'زودتر رسیدی ولی عذاب وجدان داری.'; } },
    ],
  },
  {
    id: 'a_pyramid', emoji: '🔺', title: 'یه فرصت طلایی!', w: 0.8, age: [20, 70],
    when: (c) => c.cash > c.price(50e6),
    text: (c) => `${c.pick(['پسرخاله‌ات', 'یه همکار قدیمی', 'دوست دوستت'])} می‌گه یه شرکت هست که ماهی ۲۰٪ سود می‌ده، تضمینی! فقط کافیه سرمایه بذاری.`,
    choices: [
      { label: 'نصف پولم رو می‌ذارم', do: (c) => { const x = Math.round(c.cash / 2); if (c.chance(0.1)) { c.money(Math.round(x * 0.6)); c.happy(5); return `چند ماه سود دادن! ${money(Math.round(x * 0.6))} سود گرفتی و زود پولت رو کشیدی بیرون.`; } c.money(-x); c.happy(-15); return `شرکته کلاهبرداری از آب درومد و ${money(x)} پولت دود شد! مدیرش فرار کرد خارج.`; } },
      { label: 'نه! بوی کلاهبرداری میاد', do: (c) => { c.smarts(1); return 'قبول نکردی. شش ماه بعد اخبار گفت مدیر اون شرکت فراری شده!'; } },
    ],
  },
  {
    id: 'a_car_crash', emoji: '💥', title: 'تصادف', w: 0.6, age: [18, 85], once: false, cd: 6,
    when: (c) => c.L.assets.some((a) => a.kind === 'car'),
    text: 'یه ماشین از پشت کوبید به ماشینت! راننده پیاده شد و می‌گه «تقصیر تو بود، یهو ترمز کردی!»',
    choices: [
      { label: 'زنگ می‌زنم پلیس', do: (c) => { if (c.chance(0.75)) { c.happy(-2); return 'افسر اومد و ۱۰۰٪ مقصر رو اون شناخت. بیمه‌اش خسارت رو داد.'; } const f = c.price(20e6); c.money(-f); return `افسر هر دوتون رو مقصر دونست. ${money(f)} خرج صافکاری شد.`; } },
      { label: 'دعوا می‌کنم', do: (c) => { c.health(-5).rep(-3); return 'کار به یقه‌گیری کشید و مردم جداتون کردن!'; } },
      { label: 'ولش کن، خودم درست می‌کنم', do: (c) => { const f = c.price(15e6); c.money(-f); c.happy(-3); return `بی‌خیال شدی و ${money(f)} خرج تعمیر کردی.`; } },
    ],
  },
  {
    id: 'a_found_wallet', emoji: '👛', title: 'کیف پول', w: 0.7, age: [10, 90],
    text: (c) => `تو خیابون یه کیف پول پیدا کردی که توش ${money(c.price(12e6))} پول و کارت ملی صاحبشه.`,
    choices: [
      { label: 'به صاحبش برمی‌گردونم', do: (c) => { c.rep(6).happy(4); if (c.chance(0.4)) { const r = c.price(2e6); c.money(r); return `صاحبش پیرمرد مهربونی بود و به زور ${money(r)} مژدگونی بهت داد.`; } return 'صاحبش کلی دعات کرد. حس خوبی داری.'; } },
      { label: 'پول رو برمی‌دارم', do: (c) => { c.money(c.price(12e6)); c.rep(-3).happy(-2); return 'پول رو برداشتی و کیف رو انداختی تو صندوق پست. عذاب وجدان داری.'; } },
    ],
  },
  {
    id: 'a_power_cut', emoji: '🔌', w: 0.8, age: [5, 95], once: false, cd: 4, text: '',
    auto: (c) => { c.happy(-2); return `🔌 ${c.pick(['برق‌ها دو ساعت رفت و کولر خاموش شد. تو گرما پختی!', 'قطعی برق برنامه‌ریزی‌شده باز هم وسط سریالت بود!', 'آب قطع شد و با کتری حموم کردی!'])}`; },
  },
  {
    id: 'a_neighbor', emoji: '🏢', title: 'همسایه‌ی طبقه‌ی بالا', w: 1, age: [16, 90],
    when: (c) => c.L.home !== 'barracks',
    text: 'همسایه‌ی طبقه‌ی بالا هر شب ساعت ۲ مبل جابه‌جا می‌کنه!',
    choices: [
      { label: 'می‌رم در خونه‌اش', do: (c) => { if (c.chance(0.6)) { c.happy(3); return 'با احترام گفتی و عذرخواهی کرد. یه بشقاب شله‌زرد هم داد!'; } c.happy(-4); return 'گفت «خونه‌ی خودمه، دلم می‌خواد!» و در رو بست.'; } },
      { label: 'با جارو می‌زنم به سقف', do: (c) => { c.happy(2); return 'با دسته‌ی جارو زدی به سقف. یه لحظه ساکت شد… بعد بدتر شد!'; } },
      { label: 'می‌برمش جلسه‌ی ساختمون', do: (c) => { c.rep(2); return 'تو جلسه‌ی ساختمون مطرح کردی. نصف جلسه سر شارژ ساختمون دعوا شد و بقیه‌اش سر پارکینگ!'; } },
    ],
  },
  {
    id: 'a_lottery_win', emoji: '🎟️', w: 0.15, age: [18, 90], text: '',
    auto: (c) => { const m = c.price(c.int(50, 400) * 1e6); c.money(m).happy(15); return `🎟️ تو قرعه‌کشی حساب قرض‌الحسنه‌ی بانک برنده شدی! ${money(m)} جایزه گرفتی!`; },
    kind: 'big', pop: true,
  },
  {
    id: 'a_inheritance_fight', emoji: '📜', title: 'دعوای ارث', w: 1.2, age: [25, 80],
    when: (c) => c.rels('brother', 'sister').length > 0 && !c.parents.length && c.L.people.some((p) => (p.rel === 'father' || p.rel === 'mother') && !p.alive),
    text: (c) => `${c.relName(c.rels('brother', 'sister')[0])} می‌گه سهمش از خونه‌ی پدری بیشتر از این‌هاست و می‌خواد شکایت کنه.`,
    choices: [
      { label: 'می‌بخشم، رابطه مهم‌تره', do: (c) => { const s = c.rels('brother', 'sister')[0]; c.close(s, 15); const m = Math.round(c.cash * 0.1); c.money(-m); c.rep(5); return `${money(m)} از سهمت رو بخشیدی و آشتی کردین.`; } },
      { label: 'می‌رم دادگاه', do: (c) => { const s = c.rels('brother', 'sister')[0]; c.close(s, -30); if (c.lucky(0.5)) { const m = c.price(c.int(100, 600) * 1e6); c.money(m); return `بعد از سه سال دادگاه، بردی! ${money(m)} گرفتی ولی دیگه با ${s.first} حرف نمی‌زنی.`; } const m = c.price(80e6); c.money(-m); return `دادگاه رو باختی و ${money(m)} هزینه‌ی وکیل دادی!`; } },
    ],
  },
  // ───────── family & marriage ─────────
  {
    id: 'a_aunt_question', emoji: '🙄', title: 'سؤال همیشگی', w: 2.5, age: [22, 40], once: false, cd: 4,
    when: (c) => !married(c),
    text: (c) => `تو مهمونی ${c.pick(['عمه‌ات', 'خاله‌ات', 'زن‌عموت', 'زن‌داییت'])} جلوی همه پرسید: «${c.name} جون، کِی ازدواج می‌کنی؟ ما رو هم عروسی دعوت کن!»`,
    choices: [
      { label: '«ان‌شاءالله قسمت بشه»', do: (c) => { c.rep(1); return 'لبخند زدی و یه شیرینی برداشتی. مأموریت انجام شد.'; } },
      { label: '«شما کِی بازنشسته می‌شین؟»', do: (c) => { c.happy(4).rep(-4); return `همه ساکت شدن. ${c.parent('یکی از بزرگ‌ترها')} از اون سر سالن چشم‌غره رفت!`; } },
      { label: '«اول باید خونه بخرم!»', do: (c) => { c.happy(1); return 'گفتی «با این قیمت خونه، تو ۱۲۰ سالگی!» همه خندیدن.'; } },
    ],
  },
  {
    id: 'a_baby_question', emoji: '🍼', title: 'بچه کِی؟', w: 1.5, age: [24, 45], once: false, cd: 5,
    when: (c) => married(c) && c.kids.length === 0,
    text: (c) => `${c.male ? 'مادرزنت' : 'مادرشوهرت'} سر سفره پرسید: «نوه‌ی ما کِی میاد؟»`,
    choices: [
      { label: '«فعلاً زوده»', do: (c) => { c.happy(-1); return 'گفتی «فعلاً زوده» و موضوع رو عوض کردی.'; } },
      { label: '«به‌زودی!»', do: (c) => { c.happy(2); return 'گفتی «به‌زودی» و همه دست زدن. حالا هر هفته زنگ می‌زنن خبر بگیرن!'; } },
    ],
  },
  {
    id: 'a_inlaws', emoji: '👵', title: 'خانواده‌ی همسر', w: 2, age: [20, 70], once: false, cd: 4,
    when: married,
    text: (c) => (c.male ? 'مادرزنت هر روز زنگ می‌زنه و درباره‌ی دکوراسیون خونه‌تون نظر می‌ده.' : 'مادرشوهرت می‌گه «پسرم لاغر شده، بهش غذا نمی‌دی؟»'),
    choices: [
      { label: 'با احترام تحمل می‌کنم', do: (c) => { c.happy(-3).rep(3); c.close(c.spouse!, 5); return 'لبخند زدی و گفتی «چشم». همسرت ازت ممنونه.'; } },
      { label: 'به همسرم می‌گم یه چیزی بگه', do: (c) => { if (c.chance(0.5)) { c.close(c.spouse!, -6); return 'همسرت گفت «مامانم نیت بدی نداره!» و دعواتون شد.'; } c.happy(3); return 'همسرت با مامانش حرف زد و اوضاع بهتر شد.'; } },
      { label: 'جوابش رو می‌دم', do: (c) => { c.close(c.spouse!, -10); c.happy(2).rep(-3); return 'جوابش رو دادی. حالا تو کل فامیل معروف شدی!'; } },
    ],
  },
  {
    id: 'a_spouse_fight', emoji: '💢', title: 'دعوای زن و شوهری', w: 1.5, age: [20, 80], once: false, cd: 3,
    when: married,
    text: (c) => `با ${c.spouse!.first} سر ${c.pick(['خرج‌های خونه', 'جای سفر عید', 'کنترل تلویزیون', 'کارهای خونه', 'خانواده‌هاتون', 'گوشی'])} دعواتون شد.`,
    choices: [
      { label: 'اول من عذرخواهی می‌کنم', do: (c) => { c.close(c.spouse!, 8); c.happy(2); return 'عذرخواهی کردی و آشتی کردین. شب یه پیتزا سفارش دادین.'; } },
      { label: 'قهر می‌کنم', do: (c) => { c.close(c.spouse!, -10); c.happy(-4); return 'سه روز با هم حرف نزدین. فقط از طریق بچه‌ها پیام می‌دادین!'; } },
      { label: 'یه کادو می‌خرم', cost: (c) => c.price(10e6), note: (c) => money(c.price(10e6)), do: (c) => { c.close(c.spouse!, 12); return 'با یه دسته گل و کادو برگشتی خونه. دعوا تموم شد!'; } },
    ],
  },
  {
    id: 'a_anniversary', emoji: '💝', w: 1, age: [20, 90], once: false, cd: 5,
    when: married, text: '',
    auto: (c) => { const sp = c.spouse!; if (c.chance(0.3)) { c.close(sp, -8); c.happy(-3); return `💝 سالگرد ازدواجتون رو یادت رفت! ${sp.first} یه هفته قهر بود.`; } c.close(sp, 6); c.happy(4); return `💝 سالگرد ازدواجتون رو با ${sp.first} تو یه رستوران سنتی جشن گرفتین.`; },
  },
  {
    id: 'a_spouse_leaves', emoji: '💔', w: 2, age: [20, 80],
    when: (c) => married(c) && (c.spouse!.close < 20),
    text: '', auto: (c) => {
      const sp = c.spouse!;
      sp.rel = 'ex';
      c.flag('divorced');
      award(c, 'divorce');
      c.happy(-20);
      const mehr = c.L.mehr ?? 0;
      c.L.mehr = undefined;
      if (c.male && mehr > 0) c.queue('mehr_claim', { coins: mehr, owed: Math.round(mehr * c.L.econ.coin) });
      return `💔 ${sp.first} درخواست طلاق داد و رفت خونه‌ی پدرش. رابطه‌تون خیلی سرد شده بود.`;
    },
    kind: 'bad', pop: true,
  },
  {
    id: 'a_lied_found', emoji: '🤥', w: 3, age: [20, 60],
    when: (c) => married(c) && c.has('lied_khastegari'),
    text: '', auto: (c) => { c.unflag('lied_khastegari'); c.close(c.spouse!, -25); c.rep(-5); return `🤥 ${c.spouse!.first} فهمید سر خواستگاری چاخان کرده بودی! حسابی دلخوره.`; },
    kind: 'bad', pop: true,
  },
  {
    id: 'a_kid_school', emoji: '🎒', title: 'مدرسه‌ی بچه', w: 2, age: [25, 70],
    when: (c) => c.kids.some((k) => c.ageOf(k) === 6 || c.ageOf(k) === 7),
    text: (c) => `${c.relName(c.kids.find((k) => c.ageOf(k) === 6 || c.ageOf(k) === 7)!)} داره می‌ره مدرسه. کجا ثبت‌نامش کنیم؟`,
    choices: [
      { label: 'مدرسه‌ی دولتی', do: (c) => { c.rep(-1); return 'ثبت‌نامش کردی تو مدرسه‌ی دولتی محل. مدیر مدرسه «کمک داوطلبانه» خواست!'; } },
      { label: 'غیرانتفاعی گرون', cost: (c) => c.price(150e6), note: (c) => `${money(c.price(150e6))} در سال`, do: (c) => { const k = c.kids.find((x) => c.ageOf(x) <= 7)!; k.smarts = clamp((k.smarts ?? 50) + 8); c.happy(-2); return 'بهترین مدرسه‌ی غیرانتفاعی شهر رو انتخاب کردی. شهریه‌اش کمرت رو شکست!'; } },
    ],
  },
  {
    id: 'a_kid_konkur', emoji: '📝', w: 2, age: [35, 80],
    when: (c) => c.kids.some((k) => c.ageOf(k) === 18), text: '',
    auto: (c) => {
      const k = c.kids.find((x) => c.ageOf(x) === 18)!;
      const rank = Math.max(1, Math.round(Math.exp(c.rng.range(2, 12)) * (1.4 - (k.smarts ?? 50) / 100)));
      k.flags = { ...(k.flags ?? {}), rank };
      if (rank < 3000) { c.happy(12).rep(6); return `📝 ${c.relName(k)} تو کنکور رتبه‌ی ${rank.toLocaleString('fa-IR')} شد! تو گروه فامیلی همه تبریک گفتن.`; }
      c.happy(-2);
      return `📝 ${c.relName(k)} تو کنکور رتبه‌ی ${rank.toLocaleString('fa-IR')} شد. «مهم سلامتیه!»`;
    },
  },
  {
    id: 'a_kid_wedding', emoji: '💍', w: 2, age: [40, 95],
    when: (c) => c.kids.some((k) => c.ageOf(k) >= 24 && !k.flags?.married), text: '',
    auto: (c) => {
      const k = c.kids.find((x) => c.ageOf(x) >= 24 && !x.flags?.married)!;
      k.flags = { ...(k.flags ?? {}), married: c.L.year };
      const cost = c.price(c.int(200, 600) * 1e6);
      c.money(-cost).happy(12);
      return `💍 ${c.relName(k)} ازدواج کرد! ${money(cost)} خرج عروسی و جهیزیه دادی. ولی چه شبی بود!`;
    },
    kind: 'big', pop: true,
  },
  {
    id: 'a_grandchild', emoji: '👶', w: 2, age: [42, 100],
    when: (c) => c.kids.some((k) => k.flags?.married && c.L.year - k.flags.married >= 1 && !k.flags.kid), text: '',
    auto: (c) => {
      const k = c.kids.find((x) => x.flags?.married && c.L.year - x.flags.married >= 1 && !x.flags.kid)!;
      k.flags!.kid = c.L.year;
      c.flag('grandparent');
      c.happy(15);
      return `👶 ${c.relName(k)} بچه‌دار شد! ${c.male ? 'پدربزرگ' : 'مادربزرگ'} شدی! اسمش رو گذاشتن ${c.randomFirst(c.chance(0.5) ? 'm' : 'f')}.`;
    },
    kind: 'big', pop: true,
  },
  {
    id: 'a_parents_old', emoji: '👴', title: 'پدر و مادر پیر', w: 1.5, age: [35, 70],
    when: (c) => c.parents.some((p) => c.ageOf(p) >= 75),
    text: (c) => `${c.relName(c.parents.find((p) => c.ageOf(p) >= 75)!)} دیگه پیر شده و تنها زندگی کردن براش سخته.`,
    choices: [
      { label: 'میارمش خونه‌ی خودم', do: (c) => { const p = c.parents.find((x) => c.ageOf(x) >= 75)!; c.close(p, 20); c.rep(8).happy(-3); if (c.spouse) c.close(c.spouse, -5); return 'آوردیش پیش خودت. خونه شلوغ‌تر شده ولی دلت آرومه.'; } },
      { label: 'پرستار می‌گیرم', cost: (c) => c.price(250e6), note: (c) => `${money(c.price(250e6))} در سال`, do: (c) => { const p = c.parents.find((x) => c.ageOf(x) >= 75)!; c.close(p, 8); c.rep(3); return 'یه پرستار مهربون استخدام کردی که پیشش باشه.'; } },
      { label: 'خواهر و برادرها رسیدگی کنن', do: (c) => { const p = c.parents.find((x) => c.ageOf(x) >= 75)!; c.close(p, -10); c.rep(-5); for (const s of c.rels('brother', 'sister')) c.close(s, -10); return 'گفتی «من گرفتارم». بقیه ناراحت شدن.'; } },
    ],
  },
  // ───────── health ─────────
  {
    id: 'a_illness', emoji: '🤒', w: (c) => (c.age > 50 ? 1.5 : 0.5), age: [18, 100], once: false, cd: 4, text: '',
    auto: (c) => {
      const pool = c.age > 55 ? ['diabetes', 'bp', 'heart', 'backpain', 'kidney', 'cancer'] : ['backpain', 'migraine', 'depression', 'kidney', 'asthma', 'bp'];
      const id = c.pick(pool);
      if (c.L.ills.some((i) => i.id === id)) return '';
      const sev = id === 'cancer' ? c.int(40, 70) : c.int(15, 45);
      c.L.ills.push({ id, since: c.L.year, severity: sev });
      c.health(-Math.round(sev / 4)).happy(-6);
      const names: Record<string, string> = { diabetes: 'دیابت', bp: 'فشار خون بالا', heart: 'بیماری قلبی', backpain: 'دیسک کمر', kidney: 'سنگ کلیه', cancer: 'سرطان', migraine: 'میگرن', depression: 'افسردگی', asthma: 'آسم' };
      return `🤒 دکتر گفت ${names[id]} داری. ${id === 'cancer' ? 'خیلی ترسیدی…' : 'باید بیشتر مراقب خودت باشی.'} (از «سلامت» برو دکتر)`;
    },
    kind: 'bad', pop: true,
  },
  {
    id: 'a_smoker_cough', emoji: '🚬', w: 2, age: [25, 90], once: false, cd: 5,
    when: (c) => c.has('smoker'), title: 'سیگار',
    text: 'سرفه‌هات بیشتر شده. دکتر می‌گه باید سیگار رو ترک کنی.',
    choices: [
      { label: 'ترک می‌کنم!', do: (c) => { if (c.lucky(0.45)) { c.unflag('smoker'); c.health(8).happy(4); return 'سیگار رو ترک کردی! بعد از سه ماه نفست بهتر شد.'; } c.happy(-4); return 'یک هفته طاقت آوردی ولی دوباره شروع کردی.'; } },
      { label: 'نه، تنها دلخوشیمه', do: (c) => { c.health(-6); return 'سیگارت رو روشن کردی و به حرف دکتر خندیدی.'; } },
    ],
  },
  {
    id: 'a_midlife', emoji: '🏍️', title: 'بحران میانسالی', w: 0.8, age: [40, 52],
    text: 'یه روز صبح بیدار شدی و فکر کردی «همه‌ی زندگیم رو هدر دادم!»',
    choices: [
      { label: 'یه موتور هارلی می‌خرم', cost: (c) => c.price(900e6), note: (c) => money(c.price(900e6)), do: (c) => { c.happy(12).looks(2); return 'یه موتور براق خریدی و کت چرمی پوشیدی. همسایه‌ها پچ‌پچ می‌کنن!'; } },
      { label: 'می‌رم کلاس نقاشی', do: (c) => { c.happy(6).smarts(1); return 'رفتی کلاس نقاشی و استعداد پنهانت رو کشف کردی!'; } },
      { label: 'با یه روانشناس حرف می‌زنم', do: (c) => { c.happy(5); return 'روانشناس گفت «این حس طبیعیه» و حالت بهتر شد.'; } },
    ],
  },
  // ───────── crime & trouble (always with consequences) ─────────
  {
    id: 'a_bounced_cheque', emoji: '🧾', title: 'چک', w: 0.8, age: [22, 75],
    when: (c) => c.L.assets.some((a) => a.kind === 'shop'),
    text: 'یکی از مشتری‌هات یه چک بزرگ بهت داده که برگشت خورده!',
    choices: [
      { label: 'شکایت می‌کنم', do: (c) => { if (c.lucky(0.55)) return 'بعد از شش ماه دادگاه، پولت رو گرفتی.'; const m = c.price(c.int(50, 300) * 1e6); c.money(-m); c.happy(-6); return `طرف فرار کرد و ${money(m)} ضرر کردی!`; } },
      { label: 'می‌بخشمش', do: (c) => { const m = c.price(c.int(30, 150) * 1e6); c.money(-m); c.rep(4); return `بخشیدیش و ${money(m)} ضرر کردی. ولی خدا بزرگه.`; } },
    ],
  },
  {
    id: 'a_tax_audit', emoji: '🧾', w: 0.6, age: [25, 80], when: (c) => c.L.assets.some((a) => a.kind === 'shop'), text: '',
    auto: (c) => { const m = c.price(c.int(40, 250) * 1e6); c.money(-m).happy(-5); return `🧾 اداره‌ی مالیات برات ${money(m)} مالیات علی‌الرأس بسته! هر چی هم اعتراض کردی فایده نداشت.`; },
    kind: 'bad',
  },
  {
    id: 'a_bribe_offer', emoji: '💼', title: 'پیشنهاد وسوسه‌انگیز', w: 0.5, age: [25, 65],
    when: (c) => !!c.L.job && !!jobById(c.L.job.id)?.gov,
    text: 'یه نفر بهت پیشنهاد داده اگه یه پرونده رو بدون نوبت امضا کنی، یه «شیرینی» درست‌وحسابی بهت می‌ده.',
    choices: [
      { label: 'نه! من آدم این کارها نیستم', do: (c) => { c.rep(6).happy(2); return 'محکم گفتی «نه». خوابت راحته.'; } },
      { label: 'قبول می‌کنم', do: (c) => { if (c.lucky(0.6)) { const m = c.price(200e6); c.money(m); c.rep(-4); return `${money(m)} گرفتی. ولی هر بار در می‌زنن، دلت می‌ریزه.`; } sendJail(c, 3, 'رشوه'); return 'بازرسی مچت رو گرفت! به جرم رشوه رفتی زندان.'; } },
    ],
  },
]);
