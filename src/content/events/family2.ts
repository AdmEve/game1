import { clamp, type Ctx } from '../../engine/ctx';
import { money } from '../../engine/fmt';
import { defEvents } from '../../engine/registry';
import type { Npc } from '../../engine/types';

const sib = (c: Ctx): Npc | undefined => c.rels('brother', 'sister')[0];
const adultSib = (c: Ctx) => c.rels('brother', 'sister').find((s) => c.ageOf(s) >= 20);
const married = (c: Ctx) => !!c.spouse;
const teenKid = (c: Ctx) => c.kids.find((k) => c.ageOf(k) >= 13 && c.ageOf(k) <= 18);

defEvents([
  // ───────── siblings ─────────
  {
    id: 'f_sib_loan', emoji: '🤲', title: 'قرض خواهر/برادر', age: [22, 80], when: (c) => !!adultSib(c) && c.cash > c.price(150e6),
    text: (c) => `${c.relName(adultSib(c)!)} می‌خواد مغازه بزنه و ازت قرض خواسته.`,
    choices: [
      { label: 'قرض می‌دم', cost: (c) => c.price(150e6), note: (c) => money(c.price(150e6)), do: (c) => { const s = adultSib(c)!; c.close(s, 20); if (c.chance(0.55)) { c.money(c.price(170e6)); return `${s.first} کارش گرفت و پولت رو با یه کم اضافه پس داد!`; } return `کار ${s.first} نگرفت و پولت برنگشت. ولی رابطه‌تون محکم‌تر شد.`; } },
      { label: 'شرمنده، ندارم', do: (c) => { c.close(adultSib(c)!, -12); return 'گفتی «خودمم گرفتارم». تو مهمونی بعدی باهات سرسنگین بود.'; } },
    ],
  },
  {
    id: 'f_sib_emigrate', emoji: '✈️', age: [18, 70], text: '', when: (c) => !!adultSib(c) && !adultSib(c)!.flags?.abroad,
    auto: (c) => { const s = adultSib(c)!; s.flags = { ...(s.flags ?? {}), abroad: c.L.year }; c.happy(-4); return `✈️ ${c.relName(s)} مهاجرت کرد ${c.pick(['کانادا', 'آلمان', 'استرالیا', 'ترکیه'])}. خونه‌ی بابا اینا خلوت‌تر شد.`; },
  },
  {
    id: 'f_sib_rivalry', emoji: '😤', title: 'مقایسه', age: [8, 30], when: (c) => !!sib(c) && c.parents.length > 0,
    text: (c) => `${c.rel('mother') ? 'مامانت' : 'بابات'} هی می‌گه «ببین ${sib(c)!.first} چقدر درس‌خونه!»`,
    choices: [
      { label: 'بیشتر تلاش می‌کنم', do: (c) => { if (c.L.edu.stage === 'school' || c.L.edu.stage === 'uni') c.L.edu.effort += 1; c.happy(-2); return 'تصمیم گرفتی ثابت کنی از اون بهتری!'; } },
      { label: 'با خودش دعوا می‌کنم', do: (c) => { c.close(sib(c)!, -10); c.happy(2); return 'رفتی سراغش و گفتی «همه‌اش تقصیر توئه!» بیچاره هیچ گناهی نداشت.'; } },
      { label: 'می‌گم «هر کسی یه استعدادی داره»', do: (c) => { c.rep(2); for (const p of c.parents) c.close(p, 2); return 'بزرگ‌ترها ساکت شدن. حرف حساب جواب نداره!'; } },
    ],
  },
  {
    id: 'f_sib_kid', emoji: '👶', age: [16, 90], text: '', when: (c) => c.rels('brother', 'sister').some((s) => s.flags?.married && !s.flags?.kid),
    auto: (c) => { const s = c.rels('brother', 'sister').find((x) => x.flags?.married && !x.flags?.kid)!; s.flags!.kid = c.L.year; c.happy(5); return `👶 ${c.relName(s)} بچه‌دار شد! حالا ${c.male ? 'عمو یا دایی' : 'عمه یا خاله'} شدی!`; },
    kind: 'good',
  },
  // ───────── kids growing up ─────────
  {
    id: 'f_teen_kid_night', emoji: '🌃', title: 'دیر اومدن', age: [30, 75], when: (c) => !!teenKid(c),
    text: (c) => `${c.relName(teenKid(c)!)} ساعت ۱ شب اومد خونه و جواب تلفنش رو هم نمی‌داد!`,
    choices: [
      { label: 'محرومش می‌کنم (گوشی ممنوع!)', do: (c) => { const k = teenKid(c)!; c.close(k, -12); return 'گوشیش رو یه هفته گرفتی. الان باهات حرف نمی‌زنه.'; } },
      { label: 'آروم باهاش حرف می‌زنم', do: (c) => { const k = teenKid(c)!; c.close(k, 8); c.happy(2); return 'نشستین حرف زدین. گفت «ببخشید، گوشیم شارژ نداشت». بغلش کردی.'; } },
    ],
  },
  {
    id: 'f_kid_talent', emoji: '🌟', age: [28, 70], text: '', when: (c) => c.kids.some((k) => c.ageOf(k) >= 7 && c.ageOf(k) <= 14 && !k.flags?.talent),
    auto: (c) => { const k = c.kids.find((x) => c.ageOf(x) >= 7 && c.ageOf(x) <= 14 && !x.flags?.talent)!; const t = c.pick(['تو المپیاد ریاضی مدال گرفت', 'تو مسابقه‌ی نقاشی اول شد', 'عضو تیم فوتبال نوجوانان استان شد', 'تو کنسرت مدرسه پیانو زد']); k.flags = { ...(k.flags ?? {}), talent: 1 }; k.smarts = clamp((k.smarts ?? 50) + 5); c.close(k, 6); c.happy(8).rep(3); return `🌟 ${c.relName(k)} ${t}! از خوشحالی گریه‌ات گرفت.`; },
    kind: 'good',
  },
  {
    id: 'f_kid_job', emoji: '💼', age: [40, 90], text: '', when: (c) => c.kids.some((k) => c.ageOf(k) >= 23 && !k.job),
    auto: (c) => { const k = c.kids.find((x) => c.ageOf(x) >= 23 && !x.job)!; k.job = c.pick(['مهندس', 'معلم', 'برنامه‌نویس', 'پرستار', 'کارمند بانک', 'دکتر', 'گرافیست', 'وکیل']); c.happy(6); return `💼 ${c.relName(k)} استخدام شد و حالا ${k.job}ه! اولین حقوقش رو برات یه ساعت مچی خرید.`; },
    kind: 'good',
  },
  {
    id: 'f_kid_money', emoji: '💸', title: 'کمک به بچه', age: [42, 95], when: (c) => c.kids.some((k) => c.ageOf(k) >= 25) && c.cash > c.price(300e6),
    text: (c) => `${c.relName(c.kids.find((k) => c.ageOf(k) >= 25)!)} برای پیش‌پرداخت خونه کم آورده.`,
    choices: [
      { label: 'کمکش می‌کنم', cost: (c) => c.price(300e6), note: (c) => money(c.price(300e6)), do: (c) => { const k = c.kids.find((x) => c.ageOf(x) >= 25)!; c.close(k, 20); c.happy(5).rep(3); return `کمکش کردی و صاحب‌خونه شد! تو خونه‌ی جدیدش یه اتاق رو اسم تو گذاشته.`; } },
      { label: 'باید خودش رو پاش وایسه', do: (c) => { const k = c.kids.find((x) => c.ageOf(x) >= 25)!; c.close(k, -8); return 'گفتی «منم خودم از صفر شروع کردم». یه کم دلخور شد.'; } },
    ],
  },
  {
    id: 'f_empty_nest', emoji: '🏠', age: [45, 80], text: '', when: (c) => c.kids.length > 0 && c.kids.every((k) => c.ageOf(k) >= 24) && !c.has('emptynest'),
    auto: (c) => { c.flag('emptynest'); c.happy(-5); return '🏠 همه‌ی بچه‌ها رفتن سر خونه زندگیشون. خونه خیلی ساکت شده… حالا جمعه‌ها منتظر زنگ زدنشونی.'; },
  },
  // ───────── married life ─────────
  {
    id: 'f_spouse_surprise', emoji: '🎁', age: [20, 90], once: false, cd: 5, text: '', when: married,
    auto: (c) => { const s = c.spouse!; c.close(s, 6); c.happy(7); return `🎁 ${s.first} سورپرایزت کرد: ${c.pick(['یه شام شمع‌روشن تو خونه!', 'بلیت سفر به شمال!', 'یه کیک با عکس خودت!', 'یه نامه‌ی عاشقانه زیر بالشت!'])}`; },
    kind: 'good',
  },
  {
    id: 'f_cooking', emoji: '🍳', title: 'آشپزی', age: [20, 80], when: married,
    text: (c) => `${c.spouse!.first} خسته‌ست و تو قول دادی امشب غذا درست کنی.`,
    choices: [
      { label: 'قورمه‌سبزی!', do: (c) => { if (c.chance(0.5)) { c.close(c.spouse!, 8); c.happy(4); return 'قورمه‌سبزیت عالی شد! تا دو روز ازش تعریف کرد.'; } c.close(c.spouse!, 2); return 'لوبیاها نپخت و سبزی سوخت! آخرش پیتزا سفارش دادین و کلی خندیدین.'; } },
      { label: 'نیمرو با گوجه', do: (c) => { c.close(c.spouse!, 3); return 'یه نیمروی ساده ولی با عشق. قبول شد!'; } },
    ],
  },
  {
    id: 'f_jealous', emoji: '😒', title: 'حسادت', age: [20, 70], when: married,
    text: (c) => `${c.spouse!.first} دیده یه همکار ${c.male ? 'خانم' : 'آقا'} زیر پستت کامنت گذاشته و ناراحته.`,
    choices: [
      { label: 'توضیح می‌دم و گوشیم رو نشون می‌دم', do: (c) => { c.close(c.spouse!, 5); return 'گوشی رو دادی دستش. خیالش راحت شد و گفت «ببخشید».'; } },
      { label: 'می‌گم «حسود نباش!»', do: (c) => { c.close(c.spouse!, -10); return 'دعوا شد و تا صبح رو مبل خوابیدی!'; } },
    ],
  },
  {
    id: 'f_second_honeymoon', emoji: '🏝️', title: 'ماه‌عسل دوم', age: [35, 80], when: (c) => married(c) && c.L.year - (c.L.flags.married ?? c.L.year) >= 10,
    text: 'ده سال از ازدواجتون گذشته. یه سفر دوتایی؟',
    choices: [
      { label: 'می‌ریم کیش', cost: (c) => c.price(150e6), note: (c) => money(c.price(150e6)), do: (c) => { c.close(c.spouse!, 18); c.happy(10); return 'یه هفته کیش بودین؛ مثل روزهای اول خندیدین.'; } },
      { label: 'بچه‌ها رو نمی‌شه تنها گذاشت', do: (c) => { c.close(c.spouse!, -4); return 'گذاشتین برای بعد. همیشه «بعد»!'; } },
    ],
  },
  {
    id: 'f_spouse_ill', emoji: '🏥', title: 'بیماری همسر', age: [35, 100], when: (c) => married(c) && c.ageOf(c.spouse!) >= 45, w: 0.6,
    text: (c) => `${c.spouse!.first} باید عمل جراحی بشه و بیمه همه‌اش رو نمی‌ده.`,
    choices: [
      { label: 'بهترین بیمارستان', cost: (c) => c.price(500e6), note: (c) => money(c.price(500e6)), do: (c) => { c.close(c.spouse!, 20); c.happy(4); return 'عمل خوب پیش رفت و حالش خوب شد. کنار تختش بودی تا به هوش اومد.'; } },
      { label: 'بیمارستان دولتی', do: (c) => { if (c.chance(0.85)) { c.close(c.spouse!, 8); return 'تو بیمارستان دولتی عمل شد؛ شلوغ بود ولی دکترها عالی بودن.'; } const s = c.spouse!; s.alive = false; s.died = c.L.year; c.happy(-30); c.flag('widowed'); return `متأسفانه ${s.first} بعد از عمل فوت کرد. دنیا رو سرت خراب شد.`; } },
    ],
  },
  // ───────── old age ─────────
  {
    id: 'o_grandkid_tutor', emoji: '📚', age: [60, 100], text: '', when: (c) => c.has('grandparent'),
    auto: (c) => { c.happy(6).smarts(1); return '📚 نوه‌ات رو هر عصر میاری خونه‌ات و باهاش مشق می‌نویسی. یاد بچگی‌های خودت افتادی.'; },
    kind: 'good',
  },
  {
    id: 'o_cataract', emoji: '👓', title: 'آب مروارید', age: [62, 100],
    text: 'چشمت تار می‌بینه و دکتر می‌گه آب مروارید داری.',
    choices: [
      { label: 'عمل می‌کنم', cost: (c) => c.price(40e6), note: (c) => money(c.price(40e6)), do: (c) => { c.health(3).happy(8); return 'عمل کردی و دوباره همه چیز رو واضح می‌بینی! حتی اسم کانال‌های تلویزیون رو.'; } },
      { label: 'با همین عینک سر می‌کنم', do: (c) => { c.happy(-4); return 'هنوز نوه‌هات رو از صداشون می‌شناسی!'; } },
    ],
  },
  {
    id: 'o_pension_late', emoji: '⏳', age: [60, 100], once: false, cd: 5, text: '', when: (c) => !!c.L.pension,
    auto: (c) => { c.happy(-3); return '⏳ حقوق بازنشستگی دو ماه دیر واریز شد. با بقیه‌ی بازنشسته‌ها جلوی صندوق تجمع کردین!'; },
  },
  {
    id: 'o_old_friend_dies', emoji: '🕯️', age: [65, 110], text: '', when: (c) => c.rels('friend').some((f) => c.ageOf(f) >= 65),
    auto: (c) => { const f = c.rels('friend').find((x) => c.ageOf(x) >= 65)!; f.alive = false; f.died = c.L.year; c.happy(-10); return `🕯️ رفیق قدیمیت ${f.first} فوت کرد. تو مراسمش یاد جوونی‌هاتون افتادی.`; },
    kind: 'bad',
  },
  {
    id: 'o_nostalgia', emoji: '📻', age: [60, 110], once: false, cd: 4, text: '',
    auto: (c) => { c.happy(2); return `📻 برای نوه‌ها تعریف کردی که «قدیما ${c.pick(['نون سنگک دونه‌ای ۵۰ تومن بود', 'با یه اسکناس صد تومنی یه هفته خرج می‌کردیم', 'تلویزیون فقط دوتا کانال داشت', 'کوچه‌ها امن بود و تا شب بازی می‌کردیم'])}!» و اونا باور نکردن.`; },
  },
  {
    id: 'o_dance', emoji: '💃', age: [60, 100], text: '', when: (c) => c.has('grandparent') || c.kids.some((k) => k.flags?.married),
    auto: (c) => { c.happy(8).rep(2); return '💃 تو عروسی نوه‌ات وسط مجلس رقصیدی و همه برات دست زدن! فیلمش تو کل فامیل دست به دست شد.'; },
    kind: 'good',
  },
  {
    id: 'o_cane', emoji: '🦯', age: [72, 110], text: '', when: (c) => c.s('health') < 50,
    auto: (c) => { c.happy(-3); return '🦯 دیگه بدون عصا راه نمی‌ری. ولی عصات رو یه نوه برات تزئین کرده!'; },
  },
  {
    id: 'o_memoir', emoji: '📖', title: 'کتاب خاطرات', age: [65, 100],
    text: 'نوه‌هات اصرار دارن خاطراتت رو بنویسی و چاپ کنی.',
    choices: [
      { label: 'می‌نویسم و چاپ می‌کنم', cost: (c) => c.price(30e6), note: (c) => money(c.price(30e6)), do: (c) => { c.rep(8).happy(8); c.smarts(1); return 'کتاب «یه عمر زندگی» چاپ شد! تو کتاب‌فروشی محله ده تا فروخت؛ نه تاش رو فامیل خریدن.'; } },
      { label: 'خاطرات من به درد کسی نمی‌خوره', do: (c) => { c.happy(-1); return 'گفتی «ولش کن». ولی شب‌ها هنوز برای خودت تعریف می‌کنی.'; } },
    ],
  },
]);
