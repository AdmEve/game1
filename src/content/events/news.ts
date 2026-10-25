import { fa, money } from '../../engine/fmt';
import { defEvents } from '../../engine/registry';

defEvents([
  {
    id: 'n_new_year', emoji: '🐟', title: 'تحویل سال', age: [4, 110], once: false, cd: 3, w: 0.8,
    text: 'چند ثانیه به تحویل ساله. همه دور سفره‌ی هفت‌سین نشستن و ماهی قرمز تو تنگ می‌چرخه.',
    choices: [
      { label: 'آرزو می‌کنم پولدار بشم', do: (c) => { c.happy(4); if (c.lucky(0.2)) { const m = c.price(c.int(10, 40) * 1e6); c.money(m); return `سال تحویل شد و بزرگ‌ترها بهت عیدی دادن: ${money(m)}! آرزوت زود برآورده شد.`; } return 'سال تحویل شد! همه رو بوسیدی و سبزه رو آب دادی.'; } },
      { label: 'آرزوی سلامتی برای خانواده', do: (c) => { c.happy(5); for (const p of c.parents) c.close(p, 4); return '«یا مقلب‌القلوب…» سال نو شد. همه بغلت کردن.'; } },
    ],
  },
  {
    id: 'n_flood', emoji: '🌊', title: 'سیل', age: [12, 100], w: 0.3,
    text: (c) => `سیل اومده و چند تا روستا تو ${c.pick(['لرستان', 'گلستان', 'خوزستان', 'سیستان'])} زیر آب رفتن.`,
    choices: [
      { label: 'کمک مالی می‌کنم', cost: (c) => c.price(20e6), note: (c) => money(c.price(20e6)), do: (c) => { c.inc('charity'); c.rep(5).happy(4); return 'کمکت به دست سیل‌زده‌ها رسید. حس خوبی داری.'; } },
      { label: 'داوطلب می‌شم و می‌رم کمک', when: (c) => c.age >= 18 && c.s('health') > 50, do: (c) => { c.inc('charity'); c.rep(10).health(-3).happy(6); return 'یه هفته رفتی منطقه و گل‌ولای خونه‌ها رو تمیز کردی. هیچ‌وقت فراموشش نمی‌کنی.'; } },
      { label: 'دعا می‌کنم', do: (c) => { c.happy(-2); return 'از تلویزیون اخبار رو دنبال کردی و دلت گرفت.'; } },
    ],
  },
  {
    id: 'n_wrestling', emoji: '🤼', age: [6, 110], once: false, cd: 4, w: 0.6, text: '',
    auto: (c) => { c.happy(5); return `🤼 تیم ملی کشتی قهرمان جهان شد! ${c.age >= 60 ? 'از خوشحالی اشک تو چشمات جمع شد.' : c.rels('grandpa').length ? 'آقاجون از خوشحالی گریه کرد.' : 'تو خونه همه بالا پایین پریدن.'}`; },
    kind: 'good',
  },
  {
    id: 'n_volleyball', emoji: '🏐', age: [6, 110], once: false, cd: 4, w: 0.5, text: '',
    auto: (c) => { const win = c.chance(0.5); c.happy(win ? 5 : -2); return win ? '🏐 تیم ملی والیبال، برزیل رو برد! کل خونه از جاشون پریدن.' : '🏐 تیم ملی والیبال تو تای‌بریک باخت. حیف شد!'; },
  },
  {
    id: 'n_gas_price', emoji: '⛽', age: [18, 100], once: false, cd: 6, w: 0.4, text: '', when: (c) => c.L.assets.some((a) => a.kind === 'car'),
    auto: (c) => { c.happy(-3); c.money(-c.price(5e6)); return '⛽ صف پمپ‌بنزین تا سر خیابون بود و یک ساعت معطل شدی!'; },
  },
  {
    id: 'n_epidemic', emoji: '😷', title: 'اپیدمی', age: [1, 110], w: 0.12,
    text: 'یه بیماری واگیردار همه‌جا پخش شده. مدرسه‌ها و دانشگاه‌ها مجازی شدن.',
    choices: [
      { label: 'قرنطینه می‌کنم', do: (c) => { c.happy(-6); return 'ماه‌ها تو خونه موندی، نون پختی و سریال دیدی. ولی سالم موندی.'; } },
      { label: 'زندگیم رو می‌کنم', do: (c) => { if (c.chance(0.45)) { c.L.ills.push({ id: 'covid', since: c.L.year, severity: c.int(20, 60) }); c.health(-10); return 'مبتلا شدی! دو هفته تب و سرفه داشتی.'; } c.happy(2); return 'شانس آوردی و مریض نشدی.'; } },
    ],
  },
  {
    id: 'n_heatwave', emoji: '🥵', age: [5, 110], once: false, cd: 4, w: 0.5, text: '', when: (c) => ['ahvaz', 'bandarabbas', 'bushehr', 'yazd', 'kerman', 'zahedan', 'qom'].includes(c.L.city),
    auto: (c) => { c.health(-2).happy(-2); return '🥵 هوا ۵۰ درجه شد و کولر خراب شد! تا تعمیرکار بیاد، مثل کباب پختی.'; },
  },
  {
    id: 'n_drought', emoji: '💧', age: [10, 110], once: false, cd: 6, w: 0.4, text: '',
    auto: (c) => { c.happy(-1); return '💧 کم‌آبی شده و شب‌ها آب قطع می‌شه. حالا تو حموم دبه‌ی آب ذخیره داری!'; },
  },
  {
    id: 'n_bazaar_crash', emoji: '📉', age: [20, 100], once: false, cd: 8, w: 0.4, text: '', when: (c) => c.L.assets.some((a) => a.kind === 'stock'),
    auto: (c) => { c.L.econ.stock *= 0.7; c.happy(-5); return '📉 بورس یه‌شبه ۳۰٪ ریخت! تو گروه تلگرامی سهام‌دارها عزای عمومیه.'; },
    kind: 'bad',
  },
  {
    id: 'n_gold_rush', emoji: '🪙', age: [18, 100], once: false, cd: 8, w: 0.4, text: '', when: (c) => c.L.assets.some((a) => a.kind === 'coin'),
    auto: (c) => { c.L.econ.coin *= 1.25; c.happy(5); return '🪙 قیمت جهانی طلا رکورد زد و سکه‌هات حسابی گرون شد! خدا رو شکر که خریده بودی.'; },
    kind: 'good',
  },
  {
    id: 'n_crypto_scam', emoji: '🪙', title: 'ارز دیجیتال جدید', age: [18, 70], when: (c) => c.cash > c.price(50e6),
    text: 'یه ارز دیجیتال جدید تو کانال‌ها معرفی شده: «تا آخر ماه صد برابر می‌شه!»',
    choices: [
      { label: 'یه کم می‌خرم', cost: (c) => c.price(50e6), note: (c) => money(c.price(50e6)), do: (c) => { if (c.lucky(0.08)) { const m = c.price(c.int(1, 5) * 1e9); c.money(m); c.happy(20); return `باورت نمی‌شه! واقعاً پرید و ${money(m)} سود کردی!`; } c.happy(-6); return 'سازنده‌اش پول‌ها رو برداشت و غیب شد. ارز صفر شد!'; } },
      { label: 'نه، اینا کلاهبرداریه', do: (c) => { c.smarts(1); return 'خریداش هفته‌ی بعد تو توییتر عزاداری می‌کردن.'; } },
    ],
  },
  {
    id: 'n_cinema_hit', emoji: '🎬', age: [10, 100], once: false, cd: 4, w: 0.5, text: '',
    auto: (c) => { c.happy(3); return `🎬 یه فیلم کمدی جدید رکورد فروش رو شکست و ${c.pick(['همه‌ی دیالوگ‌هاش ورد زبون مردم شده!', 'سه بار رفتی دیدیش!', 'تو صف بلیتش با یه نفر رفیق شدی.'])}`; },
  },
  {
    id: 'n_new_metro', emoji: '🚇', age: [10, 100], w: 0.4, text: '', when: (c) => ['tehran', 'mashhad', 'isfahan', 'shiraz', 'tabriz', 'karaj', 'qom', 'ahvaz', 'kermanshah'].includes(c.L.city),
    auto: (c) => { c.happy(3); return `🚇 بالاخره خط جدید مترو بعد از ${fa(c.int(12, 20))} سال افتتاح شد! حالا ۲۰ دقیقه زودتر می‌رسی.`; },
    kind: 'good',
  },
  {
    id: 'n_lottery_ticket', emoji: '🎟️', age: [16, 100], once: false, cd: 3, w: 0.3, text: '', when: (c) => !c.abroad,
    auto: (c) => { c.happy(1); return '🎟️ تو مسابقه‌ی پیامکی تلویزیون شرکت کردی. جایزه‌ی ماشین رو یه نفر از زاهدان برد!'; },
  },
]);
