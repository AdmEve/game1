import { money } from '../../engine/fmt';
import { defEvents } from '../../engine/registry';

defEvents([
  // ───────── stats ─────────
  {
    id: 's_model', emoji: '📸', title: 'پیشنهاد مدلینگ', age: [17, 40], when: (c) => c.s('looks') >= 85,
    text: 'یه برند لباس معروف ازت خواسته مدل عکس‌های تبلیغاتیش بشی!',
    choices: [
      { label: 'قبول می‌کنم', do: (c) => { const m = c.price(c.int(80, 300) * 1e6); c.money(m); c.L.followers += c.int(5000, 60000); c.happy(8); return `عکست روی بیلبوردهای اتوبان رفت! ${money(m)} گرفتی و کلی فالوور اومد.`; } },
      { label: 'نه، علاقه ندارم', do: () => 'گفتی «من اهل این کارها نیستم».' },
    ],
  },
  {
    id: 's_invention', emoji: '💡', title: 'اختراع', age: [16, 70], when: (c) => c.s('smarts') >= 88,
    text: 'یه ایده‌ی نابغه‌وار به ذهنت رسیده: یه دستگاه که چای رو دقیقاً همون‌طور که مادربزرگ دم می‌کرد دم می‌کنه!',
    choices: [
      { label: 'ثبت اختراع و تولید', cost: (c) => c.price(100e6), note: (c) => money(c.price(100e6)), do: (c) => { if (c.lucky(0.35)) { const m = c.price(c.int(1, 6) * 1e9); c.money(m); c.rep(10).happy(12); return `اختراعت گرفت! «سماور هوشمند ${c.name}» تو همه‌ی خونه‌ها پیدا می‌شه. ${money(m)} سود کردی.`; } c.happy(-4); c.rep(3); return 'اختراع ثبت شد ولی هیچ کارخونه‌ای حاضر نشد تولیدش کنه.'; } },
      { label: 'فقط برای خودم می‌سازم', do: (c) => { c.happy(5).smarts(1); return 'برای خونه‌ی خودت ساختیش. بهترین چای دنیا!'; } },
    ],
  },
  {
    id: 's_depression', emoji: '🌧️', title: 'حال بد', age: [14, 100], when: (c) => c.s('happy') <= 20, once: false, cd: 4,
    text: 'چند وقته از رخت‌خواب بیرون نمیای و هیچی خوشحالت نمی‌کنه.',
    choices: [
      { label: 'می‌رم پیش روانشناس', cost: (c) => c.price(10e6), note: (c) => money(c.price(10e6)), do: (c) => { c.happy(18); c.L.ills = c.L.ills.filter((i) => i.id !== 'depression'); return 'چند جلسه رفتی و کم‌کم حالت بهتر شد. «کمک خواستن ضعف نیست.»'; } },
      { label: 'با یه دوست درد دل می‌کنم', when: (c) => c.rels('friend').length > 0, do: (c) => { const f = c.rels('friend')[0]; c.close(f, 10); c.happy(10); return `${f.first} تا نصفه‌شب پای حرفت نشست. چقدر خوبه که داریش.`; } },
      { label: 'خودم کنار میام', do: (c) => { if (!c.L.ills.some((i) => i.id === 'depression')) c.L.ills.push({ id: 'depression', since: c.L.year, severity: 30 }); c.happy(-3); return 'تو خودت ریختی… حالت بدتر شد.'; } },
    ],
  },
  {
    id: 's_elder', emoji: '🧓', title: 'ریش‌سفید محل', age: [45, 100], when: (c) => c.s('rep') >= 85,
    text: 'دو تا همسایه سر یه دیوار مشترک دعواشون شده و همه می‌گن «بریم پیش فلانی، حرفش رو گوش می‌دن».',
    choices: [
      { label: 'میانجی‌گری می‌کنم', do: (c) => { c.rep(5).happy(6); return 'با یه سینی چای و حرف حساب آشتی‌شون دادی. حالا همه تو محل بهت می‌گن «بزرگ‌تر».'; } },
      { label: 'خودشون حلش کنن', do: (c) => { c.rep(-3); return 'گفتی «به من ربطی نداره». یه کم از چشم محل افتادی.'; } },
    ],
  },
  {
    id: 's_gossip', emoji: '🗣️', age: [16, 100], when: (c) => c.s('rep') <= 20, once: false, cd: 5, text: '',
    auto: (c) => { c.happy(-5); return '🗣️ تو مهمونی فامیلی که رفتی، همه یه‌دفعه ساکت شدن. معلومه پشت سرت حرف می‌زدن!'; },
    kind: 'bad',
  },
  {
    id: 's_sick_spell', emoji: '🏥', title: 'بستری', age: [30, 110], when: (c) => c.s('health') <= 25, once: false, cd: 4,
    text: 'حالت خیلی بد شده و دکتر می‌گه باید چند روز بستری بشی.',
    choices: [
      { label: 'بیمارستان خصوصی', cost: (c) => c.price(120e6), note: (c) => money(c.price(120e6)), do: (c) => { c.health(15); return 'تو بیمارستان خصوصی حسابی بهت رسیدن و سرپا شدی.'; } },
      { label: 'بیمارستان دولتی', do: (c) => { c.health(8).happy(-3); return 'تو راهروی اورژانس روی برانکارد منتظر تخت موندی، ولی آخرش درمانت کردن.'; } },
    ],
  },
  // ───────── traits ─────────
  {
    id: 'tr_singer_wedding', emoji: '🎤', age: [14, 70], when: (c) => c.trait('singer') || c.has('voice'), text: '',
    auto: (c) => { c.L.followers += c.int(500, 20000); c.happy(6).rep(4); return '🎤 تو عروسی پسرعمه‌ات بهت گفتن یه آهنگ بخون؛ کل تالار ساکت شد و بعدش منفجر شد! فیلمت تو اینستاگرام دست‌به‌دست شد.'; },
    kind: 'good',
  },
  {
    id: 'tr_athlete_marathon', emoji: '🏃', title: 'ماراتن', age: [18, 60], when: (c) => c.trait('athlete') && c.s('health') >= 60,
    text: 'ماراتن تهران برگزار می‌شه. ۴۲ کیلومتر!',
    choices: [
      { label: 'شرکت می‌کنم', do: (c) => { if (c.lucky(0.6)) { c.health(4).happy(10).rep(4); return 'تا خط پایان دویدی! مدال گرفتی و کلی عکس انداختی.'; } c.health(-4); return 'کیلومتر ۳۰ پاهات گرفت و با آمبولانس برگشتی!'; } },
      { label: 'فقط تشویق می‌کنم', do: () => 'کنار خیابون برای دونده‌ها دست زدی.' },
    ],
  },
  {
    id: 'tr_foodie_blog', emoji: '🍢', title: 'پیج غذا', age: [16, 60], when: (c) => c.trait('foodie'),
    text: 'همه می‌گن تو بهترین جاهای غذا رو می‌شناسی. یه پیج معرفی رستوران بزنی؟',
    choices: [
      { label: 'می‌زنم!', do: (c) => { c.L.followers += c.int(3000, 80000); c.health(-3).happy(8); return 'پیجت گرفت! حالا رستوران‌ها مجانی بهت غذا می‌دن که ازشون تعریف کنی. شکمت هم بزرگ‌تر شد!'; } },
      { label: 'نه، فقط می‌خورم', do: (c) => { c.happy(3); return 'گفتی «من غذا رو می‌خورم، ازش عکس نمی‌گیرم!»'; } },
    ],
  },
  {
    id: 'tr_artist_show', emoji: '🎨', title: 'نمایشگاه نقاشی', age: [16, 90], when: (c) => c.trait('artist'),
    text: 'یه گالری پیشنهاد داده نقاشی‌هات رو نمایش بده.',
    choices: [
      { label: 'نمایشگاه می‌ذارم', cost: (c) => c.price(20e6), note: (c) => money(c.price(20e6)), do: (c) => { if (c.lucky(0.55)) { const m = c.price(c.int(50, 400) * 1e6); c.money(m); c.rep(6).happy(10); return `چند تا از تابلوهات فروش رفت؛ ${money(m)} درآمد داشتی!`; } c.happy(-3); return 'فقط فامیل اومدن و همه گفتن «قشنگه». هیچی فروش نرفت.'; } },
      { label: 'هنوز آماده نیستم', do: () => 'گفتی «یه کم دیگه کار کنم».' },
    ],
  },
  {
    id: 'tr_nerd_app', emoji: '📲', title: 'اپلیکیشن', age: [15, 50], when: (c) => c.trait('nerd'),
    text: 'آخر هفته یه اپلیکیشن برای پیدا کردن جای پارک نوشتی!',
    choices: [
      { label: 'می‌ذارمش تو کافه‌بازار', do: (c) => { if (c.lucky(0.4)) { const m = c.price(c.int(100, 900) * 1e6); c.money(m); c.rep(5).happy(10); return `اپت ۱۰۰ هزار نصب خورد! از تبلیغاتش ${money(m)} درآمد داشتی.`; } c.happy(-2); return 'فقط ۱۲ نفر نصبش کردن؛ ۱۰ تاش فامیل بودن!'; } },
      { label: 'برای خودم نگهش می‌دارم', do: (c) => { c.smarts(2); return 'حداقل خودت همیشه جای پارک پیدا می‌کنی!'; } },
    ],
  },
  {
    id: 'tr_stingy_bill', emoji: '🧾', title: 'صورت‌حساب', age: [16, 90], when: (c) => c.trait('stingy') && c.rels('friend').length > 0,
    text: 'با رفقا رفتین رستوران و صورت‌حساب اومده. همه منتظرن ببینن کی حساب می‌کنه…',
    choices: [
      { label: 'دنگی حساب می‌کنیم!', do: (c) => { for (const f of c.rels('friend')) c.close(f, -3); return 'ماشین‌حساب گوشیت رو درآوردی و تا ریال آخر دنگ رو حساب کردی. رفقات خندیدن!'; } },
      { label: 'خودم بیرون منتظر می‌مونم', do: (c) => { c.rep(-4); return 'یهو گفتی «یه تلفن ضروری دارم» و رفتی بیرون. این دفعه هم قسر در رفتی!'; } },
    ],
  },
  {
    id: 'tr_generous_borrow', emoji: '🎁', age: [20, 80], when: (c) => c.trait('generous') && c.rels('friend').length > 0, once: false, cd: 6, text: '',
    auto: (c) => { const m = c.price(30e6); c.money(-m); c.rep(3); return `🎁 مثل همیشه حساب رستوران رو دادی (${money(m)}). رفقا بهت می‌گن «حاتم طایی»!`; },
  },
  {
    id: 'tr_lazy_late', emoji: '😴', age: [16, 60], when: (c) => c.trait('lazy') && (!!c.L.job || c.L.edu.stage !== 'none'), once: false, cd: 5, text: '',
    auto: (c) => { c.happy(1).rep(-2); if (c.L.job) c.L.job.perf = Math.max(0, c.L.job.perf - 8); return `😴 ${c.pick(['سه بار زنگ ساعت رو خاموش کردی و ظهر بیدار شدی!', 'جلسه‌ی مهم رو خواب موندی.', 'گفتی «پنج دقیقه دیگه» و دو ساعت گذشت!'])}`; },
  },
  {
    id: 'tr_unlucky', emoji: '🐈‍⬛', age: [16, 90], when: (c) => c.trait('unlucky'), once: false, cd: 4, text: '',
    auto: (c) => { c.happy(-3); return `🐈‍⬛ ${c.pick(['ماشینت رو جرثقیل برد؛ دقیقاً همون پنج دقیقه که رفتی نون بخری!', 'گوشیت افتاد تو جوی آب!', 'دقیقاً روزی که کت‌وشلوار پوشیدی، بارون گرفت و یه ماشین از تو چاله آب پاشید رو سرت!'])}`; },
  },
  {
    id: 'tr_lucky', emoji: '🍀', age: [8, 100], when: (c) => c.trait('lucky'), once: false, cd: 4, text: '',
    auto: (c) => { const m = c.price(c.int(5, 40) * 1e6); c.money(m); c.happy(4); return `🍀 ${c.pick(['تو جیب کت قدیمیت یه دسته اسکناس پیدا کردی!', 'تو قرعه‌کشی فروشگاه برنده شدی!', 'یه همکار قدیمی بدهیش رو بعد از ده سال پس داد!'])} (${money(m)})`; },
    kind: 'good',
  },
  {
    id: 'tr_sensitive', emoji: '🥺', age: [10, 90], when: (c) => c.trait('sensitive'), once: false, cd: 5, text: '',
    auto: (c) => { c.happy(-4); return `🥺 ${c.pick(['یه نفر زیر عکست نوشت «چاق شدی!» و تا شب ناراحت بودی.', 'خاله‌ات گفت «چه لباس عجیبی!» و دیگه اون لباس رو نپوشیدی.', 'رئیست بدون سلام از کنارت رد شد و کل روز فکرت درگیرش بود.'])}`; },
  },
  {
    id: 'tr_charming_fine', emoji: '😏', title: 'جریمه', age: [18, 80], when: (c) => c.trait('charming') && c.L.assets.some((a) => a.kind === 'car'),
    text: 'پلیس راهنمایی رانندگی نگهت داشته؛ سرعتت زیاد بوده.',
    choices: [
      { label: 'با زبون خوش حرف می‌زنم', do: (c) => { if (c.lucky(0.7)) { c.happy(4); return 'یه جوری حرف زدی که افسره خندید و فقط تذکر داد!'; } c.money(-c.price(3e6)); return 'افسره گفت «حرف نزن، کارت ماشین!» و جریمه شدی.'; } },
      { label: 'جریمه رو قبول می‌کنم', do: (c) => { c.money(-c.price(3e6)); return 'جریمه رو قبول کردی. «حق با شماست».'; } },
    ],
  },
  {
    id: 'tr_genius_skip', emoji: '🧠', age: [9, 15], when: (c) => c.trait('genius') && c.L.edu.stage === 'school' && c.L.edu.grade < 11, text: '',
    auto: (c) => { c.L.edu.grade++; c.rep(6).happy(6); return '🧠 مدرسه گفت انقدر باهوشی که می‌تونی یه کلاس رو جهشی بخونی! یه سال زودتر رفتی کلاس بالاتر.'; },
    kind: 'big', pop: true,
  },
]);
