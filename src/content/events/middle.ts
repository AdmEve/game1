import { clamp, type Ctx } from '../../engine/ctx';
import { money } from '../../engine/fmt';
import { defEvents } from '../../engine/registry';

const married = (c: Ctx) => !!c.spouse;
const hasKidAged = (a: number, b: number) => (c: Ctx) => c.kids.some((k) => c.ageOf(k) >= a && c.ageOf(k) <= b);
const kidAged = (c: Ctx, a: number, b: number) => c.kids.find((k) => c.ageOf(k) >= a && c.ageOf(k) <= b)!;

defEvents([
  {
    id: 'm_kid_phone', emoji: '📱', title: 'گوشی برای بچه', age: [28, 70], when: hasKidAged(9, 13),
    text: (c) => `${c.relName(kidAged(c, 9, 13))} گریه می‌کنه که «همه‌ی دوستام گوشی دارن جز من!»`,
    choices: [
      { label: 'براش گوشی می‌خرم', cost: (c) => c.price(15e6), note: (c) => money(c.price(15e6)), do: (c) => { const k = kidAged(c, 9, 13); c.close(k, 10); k.smarts = clamp((k.smarts ?? 50) - 3); return 'خوشحال شد و حالا دیگه سرش رو از گوشی بالا نمیاره!'; } },
      { label: 'نه، هنوز زوده', do: (c) => { const k = kidAged(c, 9, 13); c.close(k, -8); return 'قهر کرد و سه روز باهات حرف نزد.'; } },
    ],
  },
  {
    id: 'm_kid_tantrum', emoji: '😭', age: [22, 60], when: hasKidAged(2, 6), once: false, cd: 4, text: '',
    auto: (c) => { c.happy(-2); const k = kidAged(c, 2, 6); return `😭 ${c.relName(k)} وسط فروشگاه خودش رو انداخت زمین و جیغ زد که ${c.pick(['پاستیل', 'ماشین کنترلی', 'عروسک', 'بستنی'])} می‌خواد!`; },
  },
  {
    id: 'm_kid_first_word', emoji: '🗣️', age: [20, 60], when: hasKidAged(1, 1), text: '',
    auto: (c) => { const k = kidAged(c, 1, 1); c.close(k, 10); c.happy(8); return `🗣️ ${c.relName(k)} اولین کلمه‌اش رو گفت: «${c.pick(['بابا', 'مامان', 'نه', 'آب', 'ماشین'])}»!`; },
    kind: 'good',
  },
  {
    id: 'm_kid_konkur_class', emoji: '🏫', title: 'کلاس کنکور بچه', age: [34, 70], when: hasKidAged(16, 17),
    text: (c) => `${c.relName(kidAged(c, 16, 17))} می‌خواد بره بهترین کلاس کنکور شهر؛ هزینه‌اش سرسام‌آوره.`,
    choices: [
      { label: 'هر طور شده ثبت‌نامش می‌کنم', cost: (c) => c.price(120e6), note: (c) => money(c.price(120e6)), do: (c) => { const k = kidAged(c, 16, 17); k.smarts = clamp((k.smarts ?? 50) + 10); c.close(k, 10); return 'ثبت‌نامش کردی. حالا خونه‌تون ساعت ۱۰ شب ساکته!'; } },
      { label: 'با کتاب تست خودش بخونه', do: (c) => { const k = kidAged(c, 16, 17); c.close(k, -3); return 'براش کتاب تست خریدی و گفتی «ما خودمون بدون کلاس قبول شدیم!»'; } },
    ],
  },
  {
    id: 'm_kid_abroad', emoji: '✈️', title: 'مهاجرت بچه', age: [40, 90], when: hasKidAged(20, 35),
    text: (c) => `${c.relName(kidAged(c, 20, 35))} پذیرش ارشد از یه دانشگاه خارجی گرفته و می‌خواد بره.`,
    choices: [
      { label: 'کمکش می‌کنم بره', cost: (c) => c.price(400e6), note: (c) => money(c.price(400e6)), do: (c) => { const k = kidAged(c, 20, 35); k.flags = { ...(k.flags ?? {}), abroad: c.L.year }; c.close(k, 15); c.happy(-4).rep(3); return 'تو فرودگاه کلی گریه کردی ولی بهش افتخار می‌کنی. حالا هفته‌ای یه بار ویدیو کال!'; } },
      { label: 'نمی‌ذارم بره!', do: (c) => { const k = kidAged(c, 20, 35); c.close(k, -20); return 'گفتی «همین‌جا بمون». خیلی ازت دلخوره.'; } },
    ],
  },
  {
    id: 'm_spouse_car', emoji: '🚗', title: 'ماشین جدید', age: [28, 70], when: married,
    text: (c) => `${c.spouse!.first} می‌گه «همه‌ی فامیل ماشینشون رو عوض کردن، ما هنوز با این قراضه‌ایم!»`,
    choices: [
      { label: 'باشه، ماشین عوض می‌کنیم', cost: (c) => c.price(800e6), note: (c) => `اختلاف قیمت: ${money(c.price(800e6))}`, do: (c) => { c.close(c.spouse!, 12); c.happy(5).rep(2); return 'یه ماشین بهتر خریدین. تو مهمونی بعدی کلید رو گذاشتی رو میز!'; } },
      { label: 'الان وقتش نیست', do: (c) => { c.close(c.spouse!, -6); return 'گفتی «قسط‌ها تموم بشه». یه هفته سرد بود.'; } },
    ],
  },
  {
    id: 'm_inlaws_stay', emoji: '🧳', title: 'مهمون یک‌ماهه', age: [25, 75], when: married,
    text: (c) => `خانواده‌ی ${c.spouse!.first} از شهرستان اومدن و قراره «چند روز» پیشتون بمونن… که شده یه ماه!`,
    choices: [
      { label: 'با روی باز پذیرایی می‌کنم', do: (c) => { c.close(c.spouse!, 10); c.rep(5).happy(-5); c.money(-c.price(30e6)); return 'یه ماه پذیرایی کردی. موقع رفتن مادرزن/مادرشوهرت گفت «خدا خیرت بده».'; } },
      { label: 'غیرمستقیم بهشون می‌فهمونم', do: (c) => { c.close(c.spouse!, -8); c.happy(3); return 'هی از «مسافرت هفته‌ی بعدمون» حرف زدی. فهمیدن و رفتن… ولی دلخور!'; } },
    ],
  },
  {
    id: 'm_renovation', emoji: '🔨', title: 'بازسازی خونه', age: [28, 80], when: (c) => c.L.home === 'own',
    text: 'کابینت‌های آشپزخونه و حموم دیگه خیلی قدیمی شدن.',
    choices: [
      { label: 'بازسازی کامل', cost: (c) => c.price(600e6), note: (c) => money(c.price(600e6)), do: (c) => { c.happy(10); const h = c.L.assets.find((a) => a.kind === 'house'); if (h) h.year = Math.min(c.L.year, h.year + 10); return 'خونه رو بازسازی کردی. دو ماه گرد و خاک ولی الان مثل نو شده!'; } },
      { label: 'فعلاً می‌سازیم', do: (c) => { c.happy(-1); return 'گفتی «فعلاً کار می‌کنه».'; } },
    ],
  },
  {
    id: 'm_building_meeting', emoji: '🏢', title: 'جلسه‌ی ساختمون', age: [22, 90], when: (c) => c.L.home === 'own' || c.L.home === 'rent', once: false, cd: 5,
    text: 'جلسه‌ی ساختمونه و همه می‌خوان یه نفر مدیر ساختمون بشه. همه دارن به تو نگاه می‌کنن!',
    choices: [
      { label: 'باشه، من مدیر می‌شم', do: (c) => { c.rep(6).happy(-4); return 'مدیر ساختمون شدی. حالا ساعت ۱۱ شب همه برای آسانسور و شارژ بهت زنگ می‌زنن!'; } },
      { label: 'نه! من وقت ندارم', do: (c) => { c.rep(-1); return 'با یه بهانه در رفتی. همسایه‌ی طبقه‌ی دوم قربونی شد!'; } },
    ],
  },
  {
    id: 'm_landlord_sells', emoji: '🏚️', w: 1.2, age: [20, 80], when: (c) => c.L.home === 'rent', text: '',
    auto: (c) => { c.happy(-5); c.money(-c.price(c.int(20, 60) * 1e6)); return '🏚️ صاحبخونه خونه رو فروخت و گفت تا آخر ماه تخلیه کنین! با بدبختی اسباب‌کشی کردی.'; },
    kind: 'bad',
  },
  {
    id: 'm_house_regret', emoji: '😩', w: 1.5, age: [30, 80], when: (c) => !c.L.assets.some((a) => a.kind === 'house') && c.L.econ.infl > 0.3, once: false, cd: 8, text: '',
    auto: (c) => { c.happy(-3); return '😩 یادت افتاد ده سال پیش می‌تونستی با همین پول الانت یه خونه بخری. حالا با این پول یه پارکینگ هم نمی‌دن!'; },
  },
  {
    id: 'm_friend_loan', emoji: '🤝', title: 'قرض رفیق', age: [22, 80], when: (c) => c.rels('friend').length > 0 && c.cash > c.price(100e6),
    text: (c) => `${c.rels('friend')[0].first} ازت قرض خواسته؛ می‌گه «ماه دیگه حتماً پس می‌دم، قول!»`,
    choices: [
      {
        label: 'قرض می‌دم', do: (c) => {
          const x = c.price(80e6);
          c.money(-x);
          const f = c.rels('friend')[0];
          if (c.chance(0.55)) { c.money(x); c.close(f, 15); return 'سر وقت پس داد و یه جعبه شیرینی هم آورد! رفاقتتون محکم‌تر شد.'; }
          c.close(f, -25);
          return 'دیگه جواب تلفنت رو نمی‌ده. هم پولت رفت هم رفیقت.';
        },
      },
      { label: 'شرمنده، ندارم', do: (c) => { c.close(c.rels('friend')[0], -6); return 'گفتی «خودمم گرفتارم». یه کم دلخور شد.'; } },
    ],
  },
  {
    id: 'm_partner_offer', emoji: '🤝', title: 'شراکت', age: [25, 65], when: (c) => c.cash > c.price(500e6),
    text: (c) => `${c.pick(['شوهرخاله‌ات', 'همکار سابقت', 'باجناقت'])} می‌خواد یه رستوران بزنه و دنبال شریکه.`,
    choices: [
      {
        label: 'شریک می‌شم', cost: (c) => c.price(500e6), note: (c) => money(c.price(500e6)), do: (c) => {
          const r = c.r();
          if (r < 0.35) { const m = c.price(c.int(800, 1800) * 1e6); c.money(m); c.happy(8); return `رستوران گرفت! سهم سودت ${money(m)} شد.`; }
          if (r < 0.65) { c.money(c.price(400e6)); return 'رستوران بد نبود ولی بعد از دو سال جدا شدین و تقریباً پولت برگشت.'; }
          c.happy(-10);
          return 'شریکت حساب‌ها رو قاطی کرد و رستوران ورشکست شد. رابطه‌ی فامیلی هم شکرآب شد!';
        },
      },
      { label: 'نه، با فامیل شراکت نمی‌کنم', do: () => 'گفتی «با فامیل شراکت نکن» حرف قدیمی‌هاست.' },
    ],
  },
  {
    id: 'm_health_check', emoji: '🩺', title: 'چکاپ', age: [40, 80], once: false, cd: 6,
    text: 'دکتر می‌گه بالای چهل سال باید هر سال چکاپ کامل بدی.',
    choices: [
      { label: 'چکاپ کامل', cost: (c) => c.price(15e6), note: (c) => money(c.price(15e6)), do: (c) => { const bad = c.L.ills.find((i) => ['cancer', 'heart', 'bp', 'diabetes'].includes(i.id)); if (bad) { bad.severity = Math.max(1, bad.severity - 20); c.happy(-2); return 'تو چکاپ یه مشکل رو زود پیدا کردن و درمان رو شروع کردی. خدا رو شکر به موقع فهمیدی!'; } c.health(3).happy(3); return 'همه چی سالمه! فقط دکتر گفت کمتر نمک بخور.'; } },
      { label: 'من که چیزیم نیست', do: (c) => { c.happy(1); return 'گفتی «حالم خوبه، چکاپ برای چی؟»'; } },
    ],
  },
  {
    id: 'm_weight', emoji: '⚖️', age: [30, 70], once: false, cd: 6, text: '', when: (c) => c.s('health') < 70,
    auto: (c) => { c.looks(-2).health(-1); return `⚖️ ${c.pick(['شکمت بیرون زده و دکمه‌ی شلوارت به زور بسته می‌شه!', 'ده کیلو اضافه کردی. همه می‌گن «ماشالله جا افتادی!»', 'از پله‌ها که بالا می‌ری نفس‌نفس می‌زنی.'])}`; },
  },
  {
    id: 'm_reunion_old_crush', emoji: '💭', age: [35, 60], text: '', w: 0.6,
    auto: (c) => { c.happy(3); return `💭 تو اینستاگرام عشق دوران دبیرستانت رو پیدا کردی. ${c.pick(['ازدواج کرده و سه تا بچه داره.', 'کلی پیر شده!', 'رفته استرالیا و پرورش کانگورو داره!'])}`; },
  },
  {
    id: 'm_justice_shares', emoji: '📊', title: 'سهام عدالت', age: [18, 100], when: (c) => !c.abroad && !c.has('justice'),
    text: 'خبر اومد سهام عدالتت آزاد شده و می‌تونی بفروشیش!',
    choices: [
      { label: 'می‌فروشم', do: (c) => { c.flag('justice'); const m = c.price(c.int(15, 40) * 1e6); c.money(m); return `سهام عدالتت رو فروختی و ${money(m)} گرفتی. یه شام حسابی مهمون خودت!`; } },
      { label: 'نگهش می‌دارم', do: (c) => { c.flag('justice'); c.L.assets.push({ id: c.L.nextId++, kind: 'stock', ref: 'justice', name: 'سهام عدالت', qty: c.price(30e6) / c.L.econ.stock, paid: 0, year: c.L.year }); return 'نگهش داشتی؛ «شاید یه روز بره بالا!»'; } },
    ],
  },
  {
    id: 'm_tax_refund', emoji: '🧾', age: [25, 70], w: 0.5, text: '', when: (c) => !!c.L.job,
    auto: (c) => { const m = Math.round((c.L.job?.salary ?? 0) * 0.5); c.money(m); return `🧾 بعد از سه سال پیگیری، اداره‌ی مالیات ${money(m)} از مالیات اضافه‌ات رو پس داد!`; },
    kind: 'good',
  },
  {
    id: 'm_spouse_job', emoji: '💼', title: 'کار همسر', age: [22, 60], when: (c) => married(c) && /خانه‌دار|بیکار|دانشجو/.test(c.spouse!.job ?? 'خانه‌دار'),
    text: (c) => `${c.spouse!.first} می‌خواد بره سر کار و یه پیشنهاد خوب داره.`,
    choices: [
      { label: 'تشویقش می‌کنم', do: (c) => { const s = c.spouse!; s.job = c.pick(['کارمند', 'معلم', 'گرافیست', 'حسابدار', 'فروشنده']); c.close(s, 12); return `${s.first} شد ${s.job}! حالا درآمد خونه دوتا شده.`; } },
      { label: 'ترجیح می‌دم خونه باشه', do: (c) => { c.close(c.spouse!, -12); return `${c.spouse!.first} ناراحت شد و گفت «منم آدمم، آرزو دارم!»`; } },
    ],
  },
  {
    id: 'm_pet', emoji: '🐱', title: 'حیوون خونگی', age: [20, 80], when: (c) => !c.pet('cat') && c.pets.length < 4,
    text: 'یه بچه‌گربه‌ی ناز دم در خونه میو میو می‌کنه.',
    choices: [
      { label: 'نگهش می‌دارم', do: (c) => { const p = c.addPet('cat'); c.happy(8); return `اسمش رو گذاشتی «${p.name}». حالا رئیس خونه اونه!`; } },
      { label: 'بهش غذا می‌دم و می‌ره', do: (c) => { c.happy(2); return 'یه کم شیر بهش دادی. فرداش با دوستاش برگشت!'; } },
    ],
  },
  {
    id: 'm_neighbor_tree', emoji: '🌳', title: 'درخت همسایه', age: [25, 90], when: (c) => c.L.home === 'own' && c.L.assets.some((a) => a.ref === 'villa'),
    text: 'شاخه‌های درخت توت همسایه اومده تو حیاطتون و توت‌ها همه‌جا رو کثیف کرده.',
    choices: [
      { label: 'توت‌ها رو می‌چینم و مربا می‌پزم!', do: (c) => { c.happy(6); return 'ده شیشه مربای توت پختی و یکیش رو برای همسایه بردی. رفیق شدین!'; } },
      { label: 'به شهرداری شکایت می‌کنم', do: (c) => { c.rep(-3); return 'شهرداری اومد شاخه‌ها رو زد. همسایه دیگه سلامت رو جواب نمی‌ده.'; } },
    ],
  },
]);
