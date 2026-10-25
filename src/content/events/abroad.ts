import { award } from '../../engine/achieve';
import { type Ctx } from '../../engine/ctx';
import { money } from '../../engine/fmt';
import { defEvents } from '../../engine/registry';

const usd = (c: Ctx, x: number) => Math.round(x * c.L.econ.dollar);
const newcomer = (c: Ctx) => c.L.year - (c.L.flags.emigrated ?? c.L.year) <= 3;

defEvents([
  {
    id: 'ab_first_job', emoji: '💼', title: 'اولین کار تو غربت', where: 'abroad', age: [18, 60], w: 3,
    when: (c) => !c.L.job && newcomer(c),
    text: 'مدرکت رو اینجا قبول ندارن و می‌گن «سابقه‌ی کار محلی» نداری. یه رستوران ایرانی پیشنهاد کار داده.',
    choices: [
      { label: 'قبول می‌کنم، فعلاً', do: (c) => { c.money(usd(c, 1800 * 12)); c.happy(-4); return 'شش ماه تو آشپزخونه‌ی رستوران کار کردی؛ با مهندسی‌ات کباب درست کردی! ولی خرجت دراومد.'; } },
      { label: 'دوره‌ی معادل‌سازی مدرک می‌گذرونم', cost: (c) => usd(c, 4000), note: (c) => money(usd(c, 4000)), do: (c) => { c.flag('recognized'); c.smarts(2); c.L.edu.ielts = Math.min(9, (c.L.edu.ielts ?? 5) + 0.5); return 'یه سال درس خوندی و مدرکت رو معادل‌سازی کردی. حالا شانس کار تخصصی داری!'; } },
    ],
  },
  {
    id: 'ab_winter', emoji: '🥶', where: 'abroad', age: [10, 100], once: false, cd: 5, text: '',
    when: (c) => ['ca', 'de'].includes(c.L.country),
    auto: (c) => { c.happy(-3); return `🥶 دمای هوا رسید به منفی ${c.L.country === 'ca' ? '۳۵' : '۱۵'} درجه! سه لایه لباس پوشیدی و هنوز سردته. دلت برای آفتاب ایران تنگ شد.`; },
  },
  {
    id: 'ab_tax', emoji: '🧾', where: 'abroad', age: [18, 100], once: false, cd: 4, text: '', when: (c) => !!c.L.job,
    auto: (c) => { c.happy(-2); return `🧾 فهمیدی ${c.pick(['۳۵', '۴۰', '۲۸'])}٪ حقوقت مالیات می‌شه! تو ایران حتی نمی‌دونستی مالیات چیه.`; },
  },
  {
    id: 'ab_nowruz', emoji: '🌸', title: 'نوروز در غربت', where: 'abroad', age: [10, 100], once: false, cd: 3,
    text: 'نوروزه و اینجا هیچ‌کس نمی‌دونه یعنی چی. همکارها فکر می‌کنن یه روز معمولیه.',
    choices: [
      { label: 'هفت‌سین می‌چینم و دوستام رو دعوت می‌کنم', do: (c) => { c.happy(8).rep(3); return 'یه هفت‌سین کامل چیدی؛ سمنو رو از مغازه‌ی ایرانی خریدی. همکارهات عاشق سبزی‌پلو با ماهی شدن!'; } },
      { label: 'تماس تصویری با خانواده', do: (c) => { c.happy(4); for (const p of c.parents) c.close(p, 6); return 'لحظه‌ی تحویل سال با خانواده تماس تصویری گرفتی؛ ساعت ۴ صبح به وقت اینجا!'; } },
    ],
  },
  {
    id: 'ab_visit_iran', emoji: '✈️', title: 'سفر به ایران', where: 'abroad', age: [18, 100], once: false, cd: 3,
    text: 'دلت برای ایران خیلی تنگ شده. بلیت گرونه ولی…',
    choices: [
      { label: 'می‌رم! سه هفته', cost: (c) => usd(c, 2200), note: (c) => money(usd(c, 2200)), do: (c) => { c.happy(15); for (const p of c.parents) c.close(p, 15); return 'سه هفته ایران بودی؛ هر روز مهمونی، کباب، فامیل! برگشتی و ۵ کیلو اضافه کردی.'; } },
      { label: 'سال دیگه', do: (c) => { c.happy(-4); return 'گفتی «سال دیگه حتماً». مامانت پشت تلفن گریه کرد.'; } },
    ],
  },
  {
    id: 'ab_parents_visa', emoji: '🛂', title: 'ویزای پدر و مادر', where: 'abroad', age: [22, 70], when: (c) => c.parents.length > 0,
    text: 'می‌خوای مامان و بابات بیان پیشت، ولی سفارت باید ویزا بده.',
    choices: [
      { label: 'دعوت‌نامه می‌فرستم', cost: (c) => usd(c, 600), note: (c) => money(usd(c, 600)), do: (c) => { if (c.lucky(0.5)) { c.happy(15); for (const p of c.parents) c.close(p, 20); return 'ویزا اومد! سه ماه پیشت بودن و مامانت یخچالت رو پر از غذای خونگی کرد.'; } c.happy(-8); return 'ویزا رد شد. «احتمال بازنگشتن». خیلی دلت شکست.'; } },
      { label: 'بعداً', do: () => 'گذاشتیش برای بعد.' },
    ],
  },
  {
    id: 'ab_kid_persian', emoji: '🧒', where: 'abroad', age: [25, 80], text: '',
    when: (c) => c.kids.some((k) => c.ageOf(k) >= 4 && c.ageOf(k) <= 12),
    auto: (c) => { const k = c.kids.find((x) => c.ageOf(x) >= 4)!; c.happy(2); return `🧒 ${c.relName(k)} فارسی رو با لهجه‌ی خارجی حرف می‌زنه و به جای «مرسی مامان‌بزرگ» می‌گه «مِرسی مامان‌بُزرگ»! مادربزرگ ذوق می‌کنه.`; },
  },
  {
    id: 'ab_house', emoji: '🏠', title: 'خرید خونه با وام', where: 'abroad', age: [25, 65], when: (c) => !!c.L.job && !c.L.assets.some((a) => a.kind === 'house'),
    text: 'بانک بهت وام مسکن ۲۵ ساله با پیش‌پرداخت ۲۰٪ پیشنهاد داده.',
    choices: [
      {
        label: 'یه خونه می‌خرم', cost: (c) => usd(c, 80000), note: (c) => `پیش‌پرداخت: ${money(usd(c, 80000))}`,
        do: (c) => {
          const price = usd(c, 400000);
          c.L.assets.push({ id: c.L.nextId++, kind: 'house', ref: 'apt85', name: `خونه در ${c.country?.name ?? 'خارج'}`, qty: 90, paid: price, year: c.L.year, mul: (price / 90 / c.L.econ.m2) });
          c.L.loans.push({ id: c.L.nextId++, name: 'وام مسکن خارجی', left: price - usd(c, 80000), yearly: Math.round((price - usd(c, 80000)) / 20), rate: 0.05 });
          c.happy(12);
          return 'صاحب‌خونه شدی! حالا ۲۵ سال قسط داری ولی دیگه کسی بیرونت نمی‌کنه.';
        },
      },
      { label: 'نه، اجاره راحت‌تره', do: () => 'فعلاً اجاره‌نشین موندی.' },
    ],
  },
  {
    id: 'ab_iranian_grocery', emoji: '🛒', where: 'abroad', age: [10, 100], once: false, cd: 4, text: '',
    auto: (c) => { c.happy(3); return `🛒 یه سوپرمارکت ایرانی پیدا کردی که ${c.pick(['پفک نمکی', 'دوغ', 'لواشک', 'سوهان', 'نوشابه‌ی زمزم'])} داره! مثل گنج پیدا کرده باشی ذوق کردی.`; },
    kind: 'good',
  },
  {
    id: 'ab_promotion_glass', emoji: '🪟', where: 'abroad', age: [25, 60], once: false, cd: 6, text: '', when: (c) => !!c.L.job,
    auto: (c) => { c.happy(-3); return '🪟 ترفیع رو یه همکار محلی گرفت که از تو کم‌تجربه‌تر بود. مدیرت گفت «ارتباطاتت باید بهتر بشه».'; },
  },
  {
    id: 'ab_citizenship_test', emoji: '📋', title: 'آزمون شهروندی', where: 'abroad', age: [20, 90], when: (c) => !c.has('citizen') && c.L.year - (c.L.flags.emigrated ?? c.L.year) >= 4,
    text: 'وقت آزمون شهروندیه؛ سؤال‌های تاریخ و قانون این کشور.',
    choices: [
      { label: 'خوب می‌خونم', do: (c) => { if (c.lucky(0.75 + c.s('smarts') / 400)) { c.flag('citizen'); c.happy(12); return 'قبول شدی! تو مراسم سوگند، پرچم کوچیک دستت دادن. حالا دوتا پاسپورت داری.'; } c.happy(-5); return 'دو نمره کم آوردی. شش ماه دیگه دوباره.'; } },
    ],
  },
  {
    id: 'ab_remote_family_sick', emoji: '📞', where: 'abroad', age: [25, 80], when: (c) => c.parents.some((p) => c.ageOf(p) >= 65), text: '',
    auto: (c) => { c.happy(-6); const p = c.parents.find((x) => c.ageOf(x) >= 65)!; return `📞 خبر رسید ${c.relName(p)} مریض شده و بیمارستانه. از این طرف دنیا فقط تونستی تلفنی حالش رو بپرسی.`; },
    kind: 'bad',
  },
  {
    id: 'ab_success_story', emoji: '🌟', where: 'abroad', age: [28, 70], w: 0.6, text: '', when: (c) => !!c.L.job && c.L.job.level >= 1,
    auto: (c) => { c.rep(8).happy(8); return '🌟 یه روزنامه‌ی محلی درباره‌ی «مهاجر موفق ایرانی» باهات مصاحبه کرد! مامانت عکسش رو تو گروه فامیلی گذاشت.'; },
    kind: 'good',
  },
  {
    id: 'ab_lonely', emoji: '🌧️', title: 'تنهایی', where: 'abroad', age: [18, 90], when: (c) => !c.spouse && c.rels('friend').length < 2,
    text: 'جمعه‌ها خیلی تنهایی. هیچ‌کس رو نداری که باهاش چای بخوری.',
    choices: [
      { label: 'می‌رم کلاس زبان و دوست پیدا می‌کنم', do: (c) => { const n = c.addPerson({ rel: 'friend', gender: c.chance(0.5) ? 'm' : 'f', born: c.L.year - c.age + c.int(-5, 5), close: 60, met: 'کلاس زبان' }); c.happy(6); c.L.edu.ielts = Math.min(9, (c.L.edu.ielts ?? 5) + 0.5); return `با ${n.first} از ${c.pick(['برزیل', 'هند', 'اسپانیا', 'افغانستان', 'ترکیه'])} دوست شدی!`; } },
      { label: 'به خانواده زنگ می‌زنم', do: (c) => { c.happy(2); return 'دو ساعت با خواهر و برادرهات حرف زدی. سبک شدی.'; } },
    ],
  },
  {
    id: 'ab_return_offer', emoji: '🔙', title: 'برگشتن؟', where: 'abroad', age: [30, 70], w: 0.6,
    text: 'یه شرکت بزرگ تو تهران پیشنهاد مدیریت با حقوق خوب بهت داده. برمی‌گردی؟',
    choices: [
      { label: 'برمی‌گردم!', do: (c) => { c.L.country = 'ir'; c.L.home = c.parents.length && !c.spouse ? 'parents' : 'rent'; c.L.job = null; c.happy(10); for (const p of c.parents) c.close(p, 20); award(c, 'returned'); return 'برگشتی ایران! فرودگاه کل فامیل با گل اومدن. حالا تو تب «کار» دنبال اون موقعیت شغلی برو.'; } },
      { label: 'نه، اینجا رو ساختم', do: (c) => { c.happy(1); return 'گفتی «زندگیم اینجاست». ولی شب خوابت نبرد.'; } },
    ],
  },
]);

