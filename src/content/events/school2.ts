import { clamp } from '../../engine/ctx';
import { money } from '../../engine/fmt';
import { defEvents } from '../../engine/registry';

const inSchool = (c: { L: { edu: { stage: string } } }) => c.L.edu.stage === 'school';

defEvents([
  {
    id: 'c_first_day', age: [6, 6], emoji: '🏫', title: 'روز اول مدرسه', w: 3, when: inSchool,
    text: 'روز اول مدرسه‌ست. همه‌ی بچه‌ها گریه می‌کنن و مامان‌ها پشت در مدرسه وایسادن.',
    choices: [
      { label: 'منم گریه می‌کنم!', do: (c) => { c.happy(-3); return 'تا ظهر گریه کردی. معلم بهت یه آبنبات داد و آروم شدی.'; } },
      { label: 'با بغل‌دستیم دوست می‌شم', do: (c) => { const n = c.addPerson({ rel: 'friend', gender: c.L.gender, born: c.L.year - 7, close: 70, met: 'کلاس اول' }); c.happy(5); return `با ${n.first} دوست شدی و نصف لقمه‌ات رو بهش دادی.`; } },
      { label: 'سرم رو می‌ندازم پایین و گوش می‌دم', do: (c) => { c.L.edu.effort += 0.5; c.rep(2); return 'خانم معلم گفت «آفرین به این شاگرد مؤدب!»'; } },
    ],
  },
  {
    id: 'c_monitor', age: [8, 12], emoji: '📋', title: 'مبصر کلاس', when: inSchool,
    text: 'معلم رفته دفتر و تو رو مبصر کرده. بچه‌ها دارن شلوغ می‌کنن.',
    choices: [
      { label: 'اسم شلوغ‌ها رو می‌نویسم', do: (c) => { c.rep(2).happy(-2); return 'اسم نصف کلاس رو نوشتی. زنگ تفریح هیچ‌کس باهات بازی نکرد!'; } },
      { label: 'اسم هیچ‌کس رو نمی‌نویسم', do: (c) => { if (c.chance(0.5)) { c.happy(4); return 'بچه‌ها عاشقت شدن ولی معلم فهمید و گفت «دیگه مبصر نیستی».'; } c.happy(4).rep(3); return 'بچه‌ها ازت ممنون شدن و قول دادن ساکت باشن. (یک دقیقه ساکت بودن!)'; } },
      { label: 'اسم دشمنم رو می‌نویسم', do: (c) => { c.happy(3).rep(-2); return 'فرصت انتقام بود! اسمش رو سه بار نوشتی.'; } },
    ],
  },
  {
    id: 'c_tooth_roof', age: [6, 9], emoji: '🦷', text: '',
    auto: (c) => { c.happy(3); return '🦷 دندونت افتاد! انداختیش رو پشت‌بوم و گفتی «کلاغه، دندون منو بگیر، دندون نو بده بهم!»'; },
  },
  {
    id: 'c_dictation', age: [7, 10], emoji: '✍️', title: 'دیکته', when: inSchool,
    text: 'فردا دیکته‌ی شب داری و هنوز «ذ» و «ز» رو قاطی می‌کنی.',
    choices: [
      { label: 'با مامان تمرین می‌کنم', do: (c) => { c.L.edu.effort += 0.5; const m = c.rel('mother'); if (m) c.close(m, 4); if (c.chance(0.7)) { c.happy(4); return 'دیکته رو بیست شدی! معلم یه برچسب «صد آفرین» زد.'; } return 'فقط «ذرت» رو با «ز» نوشتی. نوزده و نیم!'; } },
      { label: 'می‌رم کارتون می‌بینم', do: (c) => { c.happy(2); if (c.chance(0.6)) { c.rep(-1); return 'دیکته‌ات قرمز شد! «ذغال» رو نوشتی «زقال».'; } return 'شانسی همه‌اش درست درومد!'; } },
    ],
  },
  {
    id: 'c_snow_day', age: [6, 17], emoji: '❄️', once: false, cd: 4, text: '',
    when: (c) => ['tehran', 'tabriz', 'ardabil', 'hamedan', 'shahrekord', 'sanandaj', 'urmia', 'zanjan', 'qazvin', 'mashhad', 'arak'].includes(c.L.city),
    auto: (c) => { c.happy(8); return `❄️ برف سنگین اومد و مدرسه‌ها تعطیل شد! ${c.pick(['آدم‌برفی ساختی و هویج مامانت رو گذاشتی دماغش.', 'برف‌بازی کردی و تا عصر دستات یخ زد.', 'از سرسره‌ی برفی کوچه سُر خوردی.'])}`; },
    kind: 'good',
  },
  {
    id: 'c_pollution_day', age: [6, 17], emoji: '😷', once: false, cd: 4, text: '',
    when: (c) => ['tehran', 'karaj', 'ahvaz', 'isfahan', 'arak'].includes(c.L.city),
    auto: (c) => { c.health(-2).happy(3); return '😷 هوا انقدر آلوده شد که مدرسه‌ها تعطیل شد! تو خونه موندی و بازی کردی.'; },
  },
  {
    id: 'c_house_cleaning', age: [5, 15], emoji: '🧹', title: 'خونه‌تکونی', when: (c) => c.L.home === 'parents',
    text: 'نزدیک عیده و مامانت اعلام کرده «خونه‌تکونی»! همه باید کمک کنن.',
    choices: [
      { label: 'شیشه‌ها رو تمیز می‌کنم', do: (c) => { const m = c.rel('mother'); if (m) c.close(m, 6); c.rep(2); return 'همه‌ی شیشه‌ها برق افتاد. مامانت گفت «چه بچه‌ی کاری!»'; } },
      { label: 'خودم رو به مریضی می‌زنم', do: (c) => { if (c.lucky(0.5)) { c.happy(4); return 'دراز کشیدی و آه و ناله کردی. نجات پیدا کردی!'; } c.happy(-3); const m = c.rel('mother'); if (m) c.close(m, -5); return 'مامانت دماسنج آورد و دید تب نداری. حالا باید فرش هم بتکونی!'; } },
    ],
  },
  {
    id: 'c_eid_clothes', age: [3, 12], emoji: '👕', text: '', once: false, cd: 3,
    auto: (c) => {
      c.happy(5).looks(1);
      const big = c.rels('brother', 'sister').find((s) => c.ageOf(s) > c.age);
      return `👕 برای عید ${c.pick(['برات یه کفش نو خریدن و شب گذاشتیش کنار بالشت!', 'برات یه لباس نو خریدن که فقط عید اجازه داری بپوشی.', big ? `لباس‌های دست‌دوم ${big.gender === 'm' ? 'داداش' : 'آبجی'} بزرگه بهت رسید!` : 'مامان‌بزرگ برات یه ژاکت بافت که آستین‌هاش تا زانوت می‌رسید!'])}`;
    },
  },
  {
    id: 'c_kite', age: [6, 13], emoji: '🪁', text: '',
    auto: (c) => { c.happy(4); return `🪁 با بچه‌های کوچه بادبادک هوا کردین. ${c.pick(['بادبادکت از همه بالاتر رفت!', 'نخش پاره شد و بادبادکت رفت رو سیم برق.', 'بادبادک همسایه رو با نخت بریدی!'])}`; },
  },
  {
    id: 'c_bike', age: [5, 11], emoji: '🚲', title: 'دوچرخه', when: (c) => (c.L.flags.rich ?? 2) >= 1,
    text: 'بابات یه دوچرخه برات خریده! چرخ‌کمکی‌هاش رو باز کنیم؟',
    choices: [
      { label: 'آره! بدون چرخ‌کمکی', do: (c) => { if (c.chance(0.4)) { c.health(-3); return 'پنج بار زمین خوردی و زانوت زخم شد، ولی آخرش یاد گرفتی!'; } c.happy(8); return 'یه‌دفعه راه افتادی! بابات از پشت ولت کرد و نفهمیدی.'; } },
      { label: 'نه، می‌ترسم', do: (c) => { c.happy(3); return 'با چرخ‌کمکی دور حیاط چرخیدی.'; } },
    ],
  },
  {
    id: 'c_fake_sick', age: [7, 15], emoji: '🤒', title: 'امتحان ریاضی', when: inSchool,
    text: 'امروز امتحان ریاضی داری و هیچی نخوندی. یه فکری به سرت زد…',
    choices: [
      { label: 'خودم رو به مریضی می‌زنم', do: (c) => { if (c.lucky(0.45)) { c.happy(4); return 'نقشت عالی بود؛ مامانت گذاشت خونه بمونی و برات سوپ پخت!'; } c.rep(-2).happy(-4); return 'دماسنج رو گذاشتی رو بخاری و شد ۴۵ درجه! مامانت فهمید و فرستادت مدرسه.'; } },
      { label: 'می‌رم و هر چی شد', do: (c) => { if (c.chance(0.4)) { c.happy(3); return 'سؤال‌ها آسون بود! با معلومات عمومی پاس کردی.'; } c.L.edu.effort -= 0.5; c.happy(-3); return 'نمره‌ات شد هفت و نیم. باید امضای بابات رو بگیری!'; } },
    ],
  },
  {
    id: 'c_cousin', age: [4, 12], emoji: '👦', text: '', once: false, cd: 4,
    auto: (c) => { c.happy(-2); return `👦 ${c.pick(['پسرخاله‌ات', 'دخترعموت', 'پسرعمه‌ات'])} اومد خونه‌تون و ${c.pick(['همه‌ی اسباب‌بازی‌هات رو خراب کرد.', 'آلبوم برچسب‌هات رو برد.', 'بستنی‌ات رو خورد و مامانش گفت «مهمونه!»'])}`; },
  },
  {
    id: 'c_grandma_story', age: [3, 9], emoji: '👵', text: '', when: (c) => c.rels('grandma').length > 0,
    auto: (c) => { const g = c.rel('grandma')!; c.close(g, 6); c.happy(4); return `👵 ${c.relName(g)} برات قصه‌ی «${c.pick(['کدو قلقله‌زن', 'ماه پیشونی', 'شنگول و منگول', 'خاله سوسکه'])}» رو گفت و تو بغلش خوابت برد.`; },
    kind: 'good',
  },
  {
    id: 'c_school_play', age: [8, 12], emoji: '🎭', title: 'تئاتر مدرسه', when: inSchool,
    text: 'برای جشن مدرسه دارن تئاتر اجرا می‌کنن. چه نقشی می‌خوای؟',
    choices: [
      { label: 'نقش اصلی!', do: (c) => { if (c.chance(0.6)) { c.happy(8).rep(4); return 'نقش «رستم» رو بازی کردی و همه‌ی سالن دست زدن!'; } c.happy(-4); return 'دیالوگت یادت رفت و فقط مِن‌مِن کردی!'; } },
      { label: 'درخت (بدون دیالوگ)', do: (c) => { c.happy(2); return 'نقش درخت رو بازی کردی. خیلی هم درخت باوری بودی!'; } },
    ],
  },
  {
    id: 'c_new_school_fees', age: [7, 17], emoji: '💸', text: '', once: false, cd: 5, w: 0.5,
    when: (c) => inSchool(c) && c.L.edu.school === 'dolati',
    auto: (c) => { const d = c.rel('father'); if (d) c.close(d, -1); return '💸 مدیر مدرسه‌ی دولتی برای «کمک‌های داوطلبانه» یه لیست بلند فرستاد خونه. بابات آه کشید!'; },
  },
  {
    id: 't_leaked_questions', age: [13, 18], emoji: '📲', title: 'سؤالات لو رفته', when: inSchool,
    text: 'تو یه کانال تلگرامی ادعا کردن سؤالات امتحان نهایی لو رفته، فقط باید پول بدی.',
    choices: [
      { label: 'پول می‌دم!', cost: (c) => c.price(2e6), note: (c) => money(c.price(2e6)), do: (c) => { if (c.chance(0.2)) { c.L.edu.effort += 2; return 'باورت نمی‌شه… سؤال‌ها درست بود!'; } c.happy(-4); return 'کلاهبرداری بود! سؤال‌ها مال پنج سال پیش بود.'; } },
      { label: 'نه، خودم می‌خونم', do: (c) => { c.L.edu.effort += 1; c.rep(1); return 'گوشی رو گذاشتی کنار و درس خوندی.'; } },
    ],
  },
  {
    id: 't_class_clown', age: [12, 17], emoji: '🤡', title: 'دلقک کلاس', when: inSchool,
    text: 'معلم شیمی یه اشتباه بامزه کرد. یه تیکه‌ی خنده‌دار تو ذهنته…',
    choices: [
      { label: 'می‌گم!', do: (c) => { c.happy(5); if (c.chance(0.5)) { c.rep(-3); return 'کل کلاس منفجر شد از خنده، ولی معلم فرستادت دفتر!'; } c.rep(3); return 'حتی خود معلم هم خندید! شدی محبوب کلاس.'; } },
      { label: 'ساکت می‌مونم', do: (c) => { c.L.edu.effort += 0.3; return 'جلوی خنده‌ات رو گرفتی. صورتت قرمز شد!'; } },
    ],
  },
  {
    id: 't_teacher_unfair', age: [13, 18], emoji: '😤', title: 'نمره‌ی ناعادلانه', when: inSchool,
    text: 'معلم ادبیات بهت ۱۲ داده، در حالی که بغل‌دستیت با همون جواب‌ها ۱۸ گرفته!',
    choices: [
      { label: 'با احترام اعتراض می‌کنم', do: (c) => { if (c.chance(0.55)) { c.happy(4).rep(2); return 'معلم دوباره برگه رو دید و نمره‌ات رو کرد ۱۷.'; } c.happy(-2); return 'گفت «نظر من همینه». حداقل امتحان کردی!'; } },
      { label: 'به بابام می‌گم بیاد مدرسه', do: (c) => { c.rep(-2); if (c.chance(0.5)) return 'بابات اومد و با مدیر حرف زد. نمره درست شد ولی بچه‌ها بهت گفتن «بابایی»!'; return 'بابات گفت «حتماً حقت بوده!»'; } },
    ],
  },
  {
    id: 't_robotics', age: [13, 18], emoji: '🤖', title: 'تیم رباتیک', when: (c) => inSchool(c) && (c.s('smarts') > 55 || c.trait('nerd')),
    text: 'مدرسه داره برای مسابقات رباتیک کشوری تیم تشکیل می‌ده.',
    choices: [
      { label: 'عضو تیم می‌شم', do: (c) => { c.smarts(3).happy(3); c.flag('robotics'); if (c.lucky(0.3)) { c.rep(6).happy(6); return 'رباتتون مقام اول کشوری رو گرفت! عکستون تو روزنامه چاپ شد.'; } return 'ربات‌تون وسط مسابقه دود کرد! ولی کلی چیز یاد گرفتی.'; } },
      { label: 'نه، وقتم رو نمی‌گیرم', do: () => 'ترجیح دادی رو درس تمرکز کنی.' },
    ],
  },
  {
    id: 't_burnout', age: [16, 19], emoji: '🥵', title: 'خستگی کنکور', when: (c) => inSchool(c) && c.L.edu.grade >= 11 && c.L.edu.effort >= 2,
    text: 'از صبح تا شب تست زدی و دیگه چشمات سیاهی می‌ره.',
    choices: [
      { label: 'یه هفته استراحت می‌کنم', do: (c) => { c.happy(8).health(3); c.L.edu.effort -= 0.5; return 'یه هفته رفتی شمال پیش مادربزرگ. با انرژی برگشتی!'; } },
      { label: 'ادامه می‌دم، وقت استراحت نیست!', do: (c) => { c.L.edu.effort += 1; c.happy(-6).health(-4); return 'با قهوه و شکلات ادامه دادی. موهات داره می‌ریزه!'; } },
    ],
  },
  {
    id: 't_konkur_ad', age: [15, 18], emoji: '📢', title: 'تبلیغ تضمینی', when: inSchool,
    text: 'یه مؤسسه‌ی کنکور تبلیغ کرده: «رتبه‌ی زیر ۱۰۰۰ تضمینی، وگرنه پولتون رو پس می‌دیم!»',
    choices: [
      { label: 'ثبت‌نام می‌کنم', cost: (c) => c.price(90e6), note: (c) => money(c.price(90e6)), do: (c) => { c.L.edu.konkurClass = true; c.L.edu.effort += 0.5; return 'ثبت‌نام کردی. یه عالمه کتاب تست هم بهت دادن که کمرت رو خم کرد!'; } },
      { label: 'نه، این‌ها همه‌اش تبلیغه', do: (c) => { c.smarts(1); return 'گفتی «اگه تضمینی بود، خودشون رتبه‌ی یک می‌شدن!»'; } },
    ],
  },
  {
    id: 't_sibling_wedding', age: [10, 25], emoji: '🎊', text: '', when: (c) => c.rels('brother', 'sister').some((s) => c.ageOf(s) >= 22 && !s.flags?.married),
    auto: (c) => {
      const s = c.rels('brother', 'sister').find((x) => c.ageOf(x) >= 22 && !x.flags?.married)!;
      s.flags = { ...(s.flags ?? {}), married: c.L.year };
      c.happy(6);
      c.close(s, 5);
      return `🎊 عروسی ${c.relName(s)} بود! تا ساعت ۲ صبح رقصیدی و ${c.pick(['شام عروسی رو سه بار کشیدی.', 'تو عکس‌های عروسی همه‌جا هستی!', 'دسته گل عروس افتاد تو بغلت!'])}`;
    },
    kind: 'good',
  },
  {
    id: 't_moving', age: [8, 17], emoji: '🚚', w: 0.3, text: '', when: (c) => c.L.home === 'parents' && !c.abroad,
    auto: (c) => {
      const to = c.randomCity();
      if (to.id === c.L.city) return '';
      c.L.city = to.id;
      c.happy(-6);
      return `🚚 بابات به خاطر کارش منتقل شد و همه‌تون اسباب‌کشی کردین به ${to.name}. دلت برای دوست‌هات تنگ می‌شه.`;
    },
    kind: 'bad',
  },
  {
    id: 't_parent_job_loss', age: [6, 18], emoji: '📉', w: 0.4, text: '', when: (c) => !!c.rel('father') && (c.L.flags.rich ?? 2) >= 1,
    auto: (c) => { c.L.flags.rich = clamp((c.L.flags.rich ?? 2) - 1, 0, 4); c.happy(-6); return '📉 بابات کارش رو از دست داد. خونه یه مدت ساکت و غمگین شده و خرج‌ها رو کم کردین.'; },
    kind: 'bad',
  },
  {
    id: 't_parent_promotion', age: [6, 18], emoji: '📈', w: 0.4, text: '', when: (c) => !!c.rel('father') && (c.L.flags.rich ?? 2) <= 3,
    auto: (c) => { c.L.flags.rich = clamp((c.L.flags.rich ?? 2) + 1, 0, 4); c.happy(6); return '📈 کار بابات گرفت و وضع مالی خانواده بهتر شد! بابات قول یه سفر خارجی داده.'; },
    kind: 'good',
  },
]);
