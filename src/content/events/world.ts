import { award } from '../../engine/achieve';
import { fa, money } from '../../engine/fmt';
import { defEvents } from '../../engine/registry';
import { HAFEZ } from '../hafez';

defEvents([
  // ───────── calendar ─────────
  {
    id: 'w_yalda', emoji: '🍉', title: 'شب یلدا', age: [6, 110], once: false, cd: 3, w: 1.2,
    text: 'شب یلداست! همه خونه‌ی بزرگ فامیل جمع شدن. هندونه، انار و آجیل. یکی دیوان حافظ رو آورده.',
    choices: [
      {
        label: 'یه فال حافظ می‌گیرم',
        do: (c) => {
          c.inc('hafez');
          c.happy(5);
          const f = c.pick(HAFEZ);
          return `نیت کردی و دیوان رو باز کردی:\n«${f.b}»\n${f.m}`;
        },
      },
      { label: 'فقط تخمه می‌شکنم و می‌خندم', do: (c) => { c.happy(5); for (const p of c.parents) c.close(p, 3); return 'تا ساعت ۲ نصفه‌شب خاطره گفتین و خندیدین. یلدای خوبی بود.'; } },
    ],
  },
  {
    id: 'w_sizdah', emoji: '🌿', title: 'سیزده‌به‌در', age: [4, 110], once: false, cd: 4,
    when: (c) => !c.abroad,
    text: 'سیزده‌به‌دره! کل فامیل رفتن پارک و جای پارک کردن نیست!',
    choices: [
      { label: 'سبزه گره می‌زنم', do: (c) => { c.happy(5); return c.age >= 18 && !c.spouse ? 'سبزه گره زدی و آرزو کردی «سال دیگه با همسرم!» همه خندیدن.' : 'سبزه گره زدی و یه آرزوی قشنگ کردی.'; } },
      { label: 'مسئول کباب می‌شم', do: (c) => { c.happy(4).rep(2); return 'جوجه‌کباب‌ها رو باد زدی. دود رفت تو چشمت ولی همه گفتن «دستت درد نکنه»!'; } },
      { label: 'وسطی بازی می‌کنم', do: (c) => { c.happy(6).health(1); return 'وسطی بازی کردین و کلی خندیدین!'; } },
    ],
  },
  {
    id: 'w_nowruz_visits', emoji: '🌷', title: 'عید دیدنی', age: [16, 110], once: false, cd: 4,
    when: (c) => !c.abroad,
    text: 'عیده و باید بری عید دیدنی خونه‌ی ۱۵ تا فامیل!',
    choices: [
      { label: 'همه رو می‌رم', do: (c) => { c.rep(5).happy(-2).health(-1); return 'به همه سر زدی و تو هر خونه شیرینی و آجیل خوردی. کیلو کیلو اضافه کردی!'; } },
      { label: 'فقط بزرگ‌ترها', do: (c) => { c.rep(2); return 'فقط خونه‌ی بزرگ‌ترها رفتی. منطقیه!'; } },
      { label: 'می‌رم سفر!', do: (c) => { c.happy(6).rep(-3); return 'زدی به جاده و رفتی سفر. خاله‌ات گفت «فلانی دیگه ما رو آدم حساب نمی‌کنه!»'; } },
    ],
  },
  {
    id: 'w_world_cup', emoji: '⚽', age: [6, 110], once: false, cd: 4, w: 0.7, text: '',
    auto: (c) => {
      if (c.chance(0.35)) { c.happy(10); return '⚽ تیم ملی تو جام جهانی برد! همه ریختن تو خیابون و بوق زدن. تا صبح جشن بود!'; }
      c.happy(-4);
      return '⚽ تیم ملی تو دقیقه‌ی ۹۰ گل خورد و حذف شد. کل کشور عزادار شد!';
    },
  },
  {
    id: 'w_derby', emoji: '🔴', title: 'دربی!', age: [8, 90], once: false, cd: 4,
    text: 'شب دربیه! پرسپولیس یا استقلال؟',
    choices: [
      { label: '🔴 پرسپولیس', do: (c) => { if (c.chance(0.45)) { c.happy(8); return 'پرسپولیس برد! تا صبح استیکر فرستادی برای رفیق استقلالیت.'; } c.happy(-5); return 'پرسپولیس باخت. گوشیت رو خاموش کردی که مسخره‌ات نکنن!'; } },
      { label: '🔵 استقلال', do: (c) => { if (c.chance(0.45)) { c.happy(8); return 'استقلال برد! تو گروه فامیلی حسابی کُری خوندی.'; } c.happy(-5); return 'استقلال باخت. تا یه هفته فوتبال نگاه نکردی!'; } },
      { label: 'فوتبال برام مهم نیست', do: (c) => { c.happy(1); return 'رفتی فیلم دیدی. ولی صدای داد همسایه‌ها نذاشت!'; } },
    ],
  },
  {
    id: 'w_dollar_talk', emoji: '💵', age: [20, 90], once: false, cd: 5, w: 0.8, title: 'مشاوره‌ی سرمایه‌گذاری',
    text: (c) => `${c.pick(['شوهرخاله‌ات', 'همکارت', 'راننده‌ی تاکسی', 'آرایشگرت'])} قسم می‌خوره دلار هفته‌ی دیگه دوبرابر می‌شه و باید همه‌ی پولت رو دلار کنی!`,
    choices: [
      { label: 'نصف پولم رو دلار می‌کنم', when: (c) => c.cash > c.price(20e6), do: (c) => { const x = Math.round(c.cash / 2); const q = Math.floor(x / (c.L.econ.dollar * 1.03)); c.money(-Math.round(q * c.L.econ.dollar * 1.03)); const a = c.L.assets.find((z) => z.kind === 'dollar'); if (a) { a.qty += q; a.paid += q * c.L.econ.dollar; } else c.L.assets.push({ id: c.L.nextId++, kind: 'dollar', ref: 'usd', name: 'دلار', qty: q, paid: Math.round(q * c.L.econ.dollar), year: c.L.year }); return `${q.toLocaleString('fa-IR')} دلار خریدی. حالا هر روز قیمت رو چک می‌کنی!`; } },
      { label: 'به حرفش گوش نمی‌دم', do: (c) => { c.smarts(1); return 'گفتی «اگه می‌دونستی که خودت پولدار بودی!»'; } },
    ],
  },
  {
    id: 'w_subsidy', emoji: '🏦', age: [18, 110], once: false, cd: 3, w: 0.6, text: '',
    when: (c) => !c.abroad,
    auto: (c) => { const m = Math.round(c.L.econ.wage * 0.05 * 12); c.money(m); return `🏦 یارانه‌ات واریز شد: ${money(m)}. باهاش یه کیلو گوشت هم نمی‌شه خرید!`; },
  },
  {
    id: 'w_khayyam_birthday', emoji: '🎂', age: [18, 110], once: false, cd: 5, w: 0.5, text: '',
    auto: (c) => { c.happy(4); return `🎂 تولد ${fa(c.age)} سالگیت بود. ${c.spouse ? `${c.spouse.first} یه کیک خونگی پخت.` : c.rels('friend').length ? 'رفقات سورپرایزت کردن!' : 'یه کیک کوچیک برای خودت خریدی.'}`; },
  },
  // ───────── abroad ─────────
  {
    id: 'ab_homesick', emoji: '🥺', w: 2, where: 'abroad', age: [18, 110], once: false, cd: 3, title: 'غم غربت',
    text: 'دلت برای ایران، خانواده و قورمه‌سبزی مامان تنگ شده.',
    choices: [
      { label: 'تماس تصویری با خانواده', do: (c) => { c.happy(3); for (const p of c.parents) c.close(p, 5); return 'با مامان و بابات تماس تصویری گرفتی. مامانت گفت «لاغر شدی!»'; } },
      { label: 'می‌رم رستوران ایرانی', cost: (c) => Math.round(40 * c.L.econ.dollar), note: (c) => money(40 * c.L.econ.dollar), do: (c) => { c.happy(6); return 'رفتی یه رستوران ایرانی و چلوکباب خوردی. مزه‌اش شبیه ایران نبود ولی دلت آروم شد.'; } },
      { label: 'به زندگیم می‌رسم', do: (c) => { c.happy(-3); return 'غم رو قورت دادی و رفتی سر کار.'; } },
    ],
  },
  {
    id: 'ab_language', emoji: '🗣️', w: 1.5, where: 'abroad', age: [18, 90], text: '',
    auto: (c) => { c.L.edu.ielts = Math.min(9, (c.L.edu.ielts ?? 5) + 0.5); c.smarts(1); return `🗣️ زبانت حسابی بهتر شده. حتی تو خواب هم ${c.country?.lang ?? 'انگلیسی'} حرف می‌زنی!`; },
  },
  {
    id: 'ab_citizenship', emoji: '🛂', w: 2, where: 'abroad', age: [18, 100],
    when: (c) => c.L.year - (c.L.flags.emigrated ?? c.L.year) >= 5 || c.L.age > 40, text: '',
    auto: (c) => { c.flag('citizen'); c.happy(10); return `🛂 شهروندی ${c.country?.name ?? ''} رو گرفتی! حالا دوتا پاسپورت داری.`; },
    kind: 'big', pop: true,
  },
  {
    id: 'ab_racism', emoji: '😞', w: 0.8, where: 'abroad', age: [18, 90], title: 'یه برخورد بد',
    text: 'تو صف فروشگاه یه نفر بهت گفت «برگرد کشور خودت!»',
    choices: [
      { label: 'محترمانه جوابش رو می‌دم', do: (c) => { c.rep(2); return 'با آرامش گفتی «من هم مثل تو مالیات می‌دم». بقیه‌ی صف برات دست زدن!'; } },
      { label: 'بی‌محلی می‌کنم', do: (c) => { c.happy(-4); return 'هیچی نگفتی ولی کل روز ذهنت درگیر بود.'; } },
    ],
  },
  {
    id: 'ab_persian_party', emoji: '🎶', w: 1, where: 'abroad', age: [18, 80], text: '',
    auto: (c) => { c.happy(6); c.addPerson({ rel: 'friend', gender: c.chance(0.5) ? 'm' : 'f', born: c.L.year - c.age + c.int(-5, 5), close: 65, met: 'جامعه‌ی ایرانی‌ها' }); return '🎶 رفتی جشن نوروز ایرانی‌های شهر و با یه هم‌وطن رفیق شدی.'; },
    kind: 'good',
  },
  // ───────── prison ─────────
  {
    id: 'prison_fight', emoji: '⛓️', w: 3, age: [18, 100], once: false, cd: 2,
    when: (c) => !!c.L.prison, title: 'زندان',
    text: 'یکی از هم‌بندی‌ها بهت گیر داده و می‌خواد جات رو بگیره.',
    choices: [
      { label: 'کوتاه نمیام', do: (c) => { if (c.lucky(0.5)) { c.rep(3); return 'جلوش وایسادی و دیگه کاری بهت نداشت.'; } c.health(-10); return 'کتک خوردی و رفتی بهداری.'; } },
      { label: 'باهاش کنار میام', do: (c) => { c.happy(-3); return 'جات رو دادی و رفتی گوشه‌ی سالن.'; } },
    ],
  },
  {
    id: 'prison_class', emoji: '📚', w: 2, age: [18, 100], once: false, cd: 3,
    when: (c) => !!c.L.prison, text: '',
    auto: (c) => { c.smarts(2).happy(2); return '📚 تو زندان کلاس سواد و حرفه‌آموزی گذاشتن. یه حرفه‌ی جدید یاد گرفتی.'; },
  },
  {
    id: 'prison_parole', emoji: '🔓', w: 2, age: [18, 100],
    when: (c) => !!c.L.prison && c.L.prison.until - c.L.year >= 1, title: 'عفو',
    text: 'به مناسبت عید، شامل عفو و آزادی مشروط شدی؛ فقط باید وثیقه بذاری.',
    choices: [
      { label: 'وثیقه می‌ذارم', cost: (c) => c.price(300e6), note: (c) => money(c.price(300e6)), do: (c) => { c.L.prison = undefined; c.happy(15); return 'آزاد شدی! اولین کار، یه نفس عمیق کشیدی.'; } },
      { label: 'پولش رو ندارم', do: (c) => { c.happy(-4); return 'نتونستی وثیقه جور کنی.'; } },
    ],
  },
  {
    id: 'w_greencard_news', emoji: '🗽', where: 'any', age: [18, 60], w: 0.05, text: '',
    when: (c) => c.has('greencard') && c.L.country === 'us',
    auto: (c) => { award(c, 'greencard'); return '🗽 یه سال تو آمریکا گذشت. هنوز به سایز لیوان‌های نوشابه عادت نکردی!'; },
  },
]);
