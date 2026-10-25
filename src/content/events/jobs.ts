import { clamp, type Ctx } from '../../engine/ctx';
import { money } from '../../engine/fmt';
import { defEvents } from '../../engine/registry';
import { sendJail } from './milestones';

const job = (...ids: string[]) => (c: Ctx) => !!c.L.job && ids.includes(c.L.job.id);
const perf = (c: Ctx, d: number) => { if (c.L.job) c.L.job.perf = clamp(c.L.job.perf + d); };

defEvents([
  // ───────── medical ─────────
  {
    id: 'j_doc_shift', emoji: '🏥', title: 'کشیک شب', w: 3, when: job('gp', 'specialist', 'nurse'), once: false, cd: 4, age: [22, 70],
    text: 'ساعت ۳ صبح تو اورژانس، یه بیمار بدحال آوردن و پزشک ارشد جواب تلفن رو نمی‌ده.',
    choices: [
      { label: 'خودم مسئولیت رو قبول می‌کنم', do: (c) => { if (c.lucky(0.6 + c.s('smarts') / 400)) { perf(c, 15); c.rep(6).happy(6); return 'با تصمیم درستت جون بیمار رو نجات دادی! خانواده‌اش با جعبه‌ی شیرینی اومدن.'; } perf(c, -10); c.happy(-10); return 'تلاشت رو کردی ولی بیمار حالش بدتر شد. شب سختی بود.'; } },
      { label: 'هی زنگ می‌زنم تا جواب بده', do: (c) => { perf(c, 3); c.happy(-2); return 'بالاخره بعد از دوازده تا تماس، با صدای خواب‌آلود جواب داد و راهنماییت کرد.'; } },
    ],
  },
  {
    id: 'j_doc_gift', emoji: '🎁', w: 2, when: job('gp', 'specialist', 'dentist'), age: [24, 75], text: '', once: false, cd: 5,
    auto: (c) => { c.happy(5).rep(3); return `🎁 یه بیمار قدیمی برات ${c.pick(['یه جعبه گز اصفهون', 'یه تابلوی خوشنویسی', 'یه شیشه عسل کوهی', 'یه سبد میوه'])} آورد و گفت «دستتون شفاست!»`; },
    kind: 'good',
  },
  {
    id: 'j_doc_complaint', emoji: '⚖️', title: 'شکایت بیمار', w: 1.5, when: job('gp', 'specialist', 'dentist'), age: [24, 75],
    text: 'یه بیمار ازت به نظام پزشکی شکایت کرده که درمانش جواب نداده.',
    choices: [
      { label: 'وکیل می‌گیرم', cost: (c) => c.price(80e6), note: (c) => money(c.price(80e6)), do: (c) => { c.happy(-2); return 'وکیلت ثابت کرد درمان طبق اصول بوده. پرونده بسته شد.'; } },
      { label: 'خودم از خودم دفاع می‌کنم', do: (c) => { if (c.chance(0.6)) return 'با پرونده‌ی کامل بیمار از خودت دفاع کردی و تبرئه شدی.'; const f = c.price(150e6); c.money(-f); c.rep(-6); return `محکوم شدی ${money(f)} غرامت بدی.`; } },
    ],
  },
  {
    id: 'j_nurse_wave', emoji: '😷', title: 'موج بیماری', w: 2, when: job('nurse', 'gp', 'specialist'), age: [22, 65],
    text: 'یه موج آنفولانزای شدید اومده و بیمارستان پر شده. شیفت‌ها دوبرابر شده.',
    choices: [
      { label: 'همه‌ی شیفت‌ها رو می‌مونم', do: (c) => { perf(c, 15); c.rep(8).health(-6).happy(-4); c.money(Math.round((c.L.job?.salary ?? 0) * 2)); return 'هفته‌ها بیمارستان بودی. مردم بهتون می‌گن «مدافعان سلامت»!'; } },
      { label: 'فقط شیفت خودم', do: (c) => { perf(c, -3); return 'شیفت خودت رو رفتی. همکارها یه کم دلخورن.'; } },
    ],
  },
  // ───────── teaching ─────────
  {
    id: 'j_teacher_student', emoji: '🧑‍🏫', title: 'شاگرد شیطون', w: 3, when: job('teacher', 'professor', 'tutor', 'musicteacher'), once: false, cd: 4, age: [20, 70],
    text: 'یه شاگرد ته کلاس مدام سر کلاس شلوغ می‌کنه و بقیه رو هم می‌خندونه.',
    choices: [
      { label: 'می‌فرستمش دفتر', do: (c) => { perf(c, 2); return 'فرستادیش دفتر. کلاس ساکت شد ولی یه نگاه کینه‌ای بهت کرد!'; } },
      { label: 'بهش مسئولیت می‌دم', do: (c) => { if (c.chance(0.6)) { perf(c, 8); c.rep(4).happy(5); return 'کردیش نماینده‌ی کلاس. شد بهترین شاگردت! سال‌ها بعد بهت پیام داد «شما زندگی منو عوض کردی».'; } return 'از مسئولیتش هم سوءاستفاده کرد! ولی حداقل تلاشت رو کردی.'; } },
    ],
  },
  {
    id: 'j_teacher_parent', emoji: '😠', title: 'اولیای طلبکار', w: 2, when: job('teacher'), age: [20, 70],
    text: 'مادر یکی از شاگردها اومده مدرسه و می‌گه «بچه‌ی من نابغه‌ست، چرا ۱۴ گرفته؟»',
    choices: [
      { label: 'برگه رو نشونش می‌دم', do: (c) => { c.rep(2); return 'برگه رو دید و ساکت شد. «حتماً سؤال‌ها سخت بوده!»'; } },
      { label: 'نمره رو می‌کنم ۱۷ که بره', do: (c) => { c.rep(-3).happy(2); return 'نمره رو بالا بردی و رفت. حالا بقیه‌ی اولیا هم دارن میان!'; } },
    ],
  },
  {
    id: 'j_professor_paper', emoji: '📄', title: 'مقاله', w: 2, when: job('professor', 'researcher'), age: [28, 75],
    text: 'یه مجله‌ی معتبر خارجی می‌خواد مقاله‌ات رو چاپ کنه، ولی داوری‌اش یه سال طول می‌کشه. یه مجله‌ی «سریع» هم هست که با پول چاپ می‌کنه.',
    choices: [
      { label: 'صبر می‌کنم برای مجله‌ی معتبر', do: (c) => { perf(c, 12); c.rep(8).smarts(2); return 'بعد از یه سال مقاله‌ات چاپ شد و کلی ارجاع گرفت!'; } },
      { label: 'مجله‌ی سریع', cost: (c) => c.price(30e6), note: (c) => money(c.price(30e6)), do: (c) => { perf(c, 4); if (c.chance(0.3)) { c.rep(-10); return 'معلوم شد مجله‌ی جعلی بوده و تو لیست سیاه افتادی!'; } return 'مقاله سریع چاپ شد. ترفیعت نزدیک‌تر شد.'; } },
    ],
  },
  // ───────── drivers & couriers ─────────
  {
    id: 'j_cab_bag', emoji: '👜', title: 'کیف جامونده', w: 3, when: job('cab', 'trucker'), age: [18, 75],
    text: 'یه مسافر کیفش رو تو ماشینت جا گذاشته. توش پر از پول و مدارکه.',
    choices: [
      { label: 'به صاحبش برمی‌گردونم', do: (c) => { c.rep(8).happy(5); const r = c.price(10e6); c.money(r); return `صاحبش یه حاج‌آقای بازاری بود؛ کلی دعات کرد و ${money(r)} مژدگونی داد. تو گروه رانندگا معروف شدی!`; } },
      { label: 'برمی‌دارم', do: (c) => { if (c.chance(0.5)) { sendJail(c, 1, 'سرقت'); return 'صاحبش از طریق اپلیکیشن پیدات کرد و شکایت کرد. رفتی زندان!'; } c.money(c.price(80e6)); c.rep(-6); return 'پول‌ها رو برداشتی. ولی دیگه آروم نمی‌خوابی.'; } },
    ],
  },
  {
    id: 'j_cab_talk', emoji: '🚕', w: 2, when: job('cab'), age: [18, 75], text: '', once: false, cd: 3,
    auto: (c) => { c.happy(2); return `🚕 یه مسافر کل مسیر ${c.pick(['درباره‌ی قیمت دلار سخنرانی کرد', 'برات از خواستگاری‌های ناموفقش گفت', 'با تلفن دعوا کرد', 'آهنگ قدیمی خوند و گفت «قدیما یادش بخیر»'])}. پنج‌ستاره بهت داد!`; },
  },
  {
    id: 'j_courier_rain', emoji: '🌧️', title: 'بارون شدید', w: 3, when: job('courier'), age: [18, 60],
    text: 'بارون شدیدی میاد و اپلیکیشن ضریب سفارش‌ها رو سه برابر کرده.',
    choices: [
      { label: 'بیرون می‌رم، پول خوبیه', do: (c) => { const m = c.price(c.int(8, 15) * 1e6); c.money(m); if (c.chance(0.15)) { c.health(-12); return `${money(m)} درآمد داشتی، ولی سر یه پیچ لیز خوردی و زمین خوردی!`; } c.health(-1); return `تا شب کار کردی و ${money(m)} درآمد داشتی. خیس آب شدی!`; } },
      { label: 'امروز نمی‌رم', do: (c) => { c.happy(2); return 'تو خونه موندی و چای خوردی.'; } },
    ],
  },
  // ───────── engineering & tech ─────────
  {
    id: 'j_dev_remote', emoji: '🌍', title: 'کار دورکاری خارجی', w: 2.5, when: job('dev'), age: [22, 55],
    text: 'یه شرکت خارجی پیشنهاد کار دورکاری با حقوق دلاری داده! فقط باید شب‌ها جلسه بری.',
    choices: [
      { label: 'قبول می‌کنم', do: (c) => { c.flag('remote_usd'); const m = Math.round(1500 * 12 * c.L.econ.dollar); c.money(m); c.happy(10).health(-2); return `قبول کردی! امسال ${money(m)} درآمد دلاری داشتی. حالا ساعت ۲ شب با همکارهای کانادایی جلسه داری!`; } },
      { label: 'نه، وقت خانواده‌ام مهمه', do: (c) => { c.happy(1); return 'قبول نکردی.'; } },
    ],
  },
  {
    id: 'j_dev_bug', emoji: '🐛', title: 'باگ بزرگ', w: 2, when: job('dev', 'it'), age: [20, 65], once: false, cd: 4,
    text: 'جمعه ساعت ۱۱ شب سایت شرکت از کار افتاده و مدیر زنگ می‌زنه!',
    choices: [
      { label: 'لپ‌تاپ رو باز می‌کنم', do: (c) => { if (c.lucky(0.6 + c.s('smarts') / 400)) { perf(c, 12); c.rep(3); return 'تا ۳ صبح کار کردی و مشکل رو حل کردی. مدیرعامل شخصاً تشکر کرد!'; } perf(c, -5); c.happy(-4); return 'تا صبح بیدار موندی و فهمیدی مشکل از سرور یه شرکت دیگه بوده!'; } },
      { label: 'گوشی رو خاموش می‌کنم', do: (c) => { perf(c, -12); c.happy(3); return 'گوشی رو خاموش کردی. شنبه یه جلسه‌ی «بررسی» در انتظارته…'; } },
    ],
  },
  {
    id: 'j_civil_shortcut', emoji: '🏗️', title: 'میان‌بُر ساختمانی', w: 2.5, when: job('civileng', 'architect'), age: [24, 70],
    text: 'سازنده‌ی ساختمان ازت می‌خواد گزارش نظارت رو امضا کنی، در حالی که میلگردها کمتر از نقشه‌ست.',
    choices: [
      { label: 'امضا نمی‌کنم!', do: (c) => { c.rep(8); perf(c, -5); return 'امضا نکردی و سازنده مجبور شد درستش کنه. یه دشمن پیدا کردی ولی خوابت راحته.'; } },
      { label: 'امضا می‌کنم', do: (c) => { c.money(c.price(300e6)); if (c.chance(0.25)) { sendJail(c, 3, 'تخلف ساختمانی'); return 'بعد از یه زلزله‌ی کوچیک ساختمان ترک برداشت و پرونده‌ات رو شد. زندان!'; } c.rep(-4); return `${money(c.price(300e6))} «حق‌الزحمه» گرفتی. خدا کنه زلزله نیاد…`; } },
    ],
  },
  {
    id: 'j_oil_south', emoji: '🛢️', title: 'منطقه‌ی عملیاتی', w: 2, when: job('oil', 'mecheng', 'eleng'), age: [22, 60],
    text: 'شرکت می‌خواد بفرستدت عسلویه؛ دو هفته کار، دو هفته استراحت، حقوق بالاتر.',
    choices: [
      { label: 'می‌رم', do: (c) => { c.money(Math.round((c.L.job?.salary ?? 0) * 8)); c.health(-3); if (c.spouse) c.close(c.spouse, -8); perf(c, 8); return 'رفتی جنوب. گرمای ۴۸ درجه بود ولی حقوق دوبرابر شد!'; } },
      { label: 'نمی‌رم', do: (c) => { perf(c, -4); return 'گفتی «خانواده‌ام اینجاست».'; } },
    ],
  },
  // ───────── law, money, office ─────────
  {
    id: 'j_lawyer_case', emoji: '⚖️', title: 'پرونده‌ی بزرگ', w: 3, when: job('lawyer'), age: [24, 75],
    text: 'یه پرونده‌ی ارث چند میلیاردی اومده سراغت. خیلی سخته ولی حق‌الوکاله‌اش عالیه.',
    choices: [
      { label: 'قبول می‌کنم', do: (c) => { if (c.lucky(0.5 + c.s('smarts') / 300)) { const m = c.price(c.int(500, 2000) * 1e6); c.money(m); c.rep(8); perf(c, 15); return `پرونده رو بردی! ${money(m)} حق‌الوکاله گرفتی و اسمت تو کانون وکلا پیچید.`; } c.happy(-6); perf(c, -5); return 'بعد از دو سال پرونده رو باختی.'; } },
      { label: 'نه، ریسکش زیاده', do: () => 'پرونده رو قبول نکردی.' },
    ],
  },
  {
    id: 'j_bank_loan_friend', emoji: '🏦', title: 'وام فامیلی', w: 2.5, when: job('banker'), age: [24, 65],
    text: 'پسرخاله‌ات اومده بانک و ازت می‌خواد وامش رو «بدون نوبت» تأیید کنی.',
    choices: [
      { label: 'طبق قانون، باید نوبت بگیره', do: (c) => { c.rep(3); return 'گفتی «قانون قانونه». خاله‌ات دیگه جواب تلفنت رو نمی‌ده!'; } },
      { label: 'یه کاریش می‌کنم', do: (c) => { if (c.chance(0.25)) { perf(c, -25); c.rep(-8); return 'بازرسی بانک فهمید و توبیخ شدی!'; } c.rep(2); return 'وامش رو جور کردی. حالا تو مهمونی‌های فامیلی عزیزترینی!'; } },
    ],
  },
  {
    id: 'j_clerk_dawdle', emoji: '🗂️', w: 2, when: job('clerk', 'insurance'), age: [22, 65], text: '', once: false, cd: 4,
    auto: (c) => { c.happy(-1); return `🗂️ امروز تو اداره ${c.pick(['سه بار سیستم قطع شد و ارباب‌رجوع‌ها شاکی شدن.', 'نصف روز رو با همکارها درباره‌ی ناهار بحث کردین.', 'یه نامه رو بردی پنج تا طبقه امضا کنی.', 'رئیس جلسه گذاشت درباره‌ی «بهره‌وری»؛ سه ساعت!'])}`; },
  },
  // ───────── shops, crafts ─────────
  {
    id: 'j_baker_queue', emoji: '🥖', w: 2.5, when: job('baker'), age: [15, 70], text: '', once: false, cd: 4,
    auto: (c) => { c.rep(2); return `🥖 صف نونوایی تا سر کوچه بود و ${c.pick(['یه پیرمرد گفت بهترین سنگک شهر رو می‌پزی!', 'دو نفر سر نوبت دعوا کردن.', 'یه نفر ۲۰ تا نون خواست و صف شاکی شد!'])}`; },
  },
  {
    id: 'j_barber_celebrity', emoji: '💇', title: 'مشتری معروف', w: 2.5, when: job('barber'), age: [18, 70],
    text: 'یه بازیگر معروف اومده آرایشگاهت! اگه کارت خوب باشه، تو اینستاگرامش تبلیغت رو می‌کنه.',
    choices: [
      { label: 'بهترین کارم رو می‌کنم', do: (c) => { if (c.lucky(0.6)) { c.L.followers += c.int(5000, 40000); perf(c, 15); c.happy(8); return 'خیلی راضی بود و استوری گذاشت! حالا وقت‌هات تا سه ماه پره.'; } c.happy(-6); return 'از استرس یه کم خراب شد! بازیگر با کلاه رفت بیرون.'; } },
    ],
  },
  {
    id: 'j_mechanic_honest', emoji: '🔧', title: 'مشتری ناآشنا', w: 2.5, when: job('mechanic', 'autotech'), age: [18, 70],
    text: 'یه خانم مسن ماشینش رو آورده که فقط یه فیوزش سوخته. هیچی از ماشین سر در نمیاره.',
    choices: [
      { label: 'راستش رو می‌گم', do: (c) => { c.rep(6).happy(3); return 'فیوز رو عوض کردی و پول زیادی نگرفتی. حالا کل فامیلش مشتری‌ات شدن!'; } },
      { label: 'می‌گم گیربکس خرابه!', do: (c) => { c.money(c.price(40e6)); c.rep(-5); if (c.chance(0.3)) { c.rep(-10); return 'پسرش مکانیک بود و اومد آبروت رو برد!'; } return 'پول خوبی گرفتی. ولی وجدانت درد می‌کنه.'; } },
    ],
  },
  {
    id: 'j_worker_injury', emoji: '🦺', title: 'داربست', w: 2, when: job('worker', 'factory', 'farmer'), age: [16, 65],
    text: 'سرکارگر می‌گه بدون کمربند ایمنی برو بالای داربست؛ «دیر شده!»',
    choices: [
      { label: 'بدون کمربند نمی‌رم', do: (c) => { c.rep(2); perf(c, -3); return 'وایسادی تا کمربند آوردن. سرکارگر غر زد ولی تو سالمی.'; } },
      { label: 'باشه، می‌رم', do: (c) => { if (c.chance(0.15)) { c.health(-25); c.happy(-10); return 'پات لیز خورد و افتادی! چند ماه بیمارستان بودی.'; } perf(c, 5); return 'کار رو انجام دادی. این دفعه به خیر گذشت.'; } },
    ],
  },
  // ───────── stars ─────────
  {
    id: 'j_football_transfer', emoji: '⚽', title: 'پیشنهاد انتقال', w: 3, when: job('footballer'), age: [18, 34],
    text: 'هم پرسپولیس و هم استقلال برات پیشنهاد فرستادن! یه تیم خلیج‌فارسی هم با پول بیشتر.',
    choices: [
      { label: '🔴 پرسپولیس', do: (c) => { c.L.followers += c.int(50000, 300000); c.happy(10); perf(c, 8); return 'پیراهن قرمز رو پوشیدی! هواداران تو فرودگاه منتظرت بودن.'; } },
      { label: '🔵 استقلال', do: (c) => { c.L.followers += c.int(50000, 300000); c.happy(10); perf(c, 8); return 'آبی‌پوش شدی! هواداران تو آزادی اسمت رو فریاد زدن.'; } },
      { label: '🇶🇦 تیم خلیج‌فارسی', do: (c) => { const m = Math.round(800_000 * c.L.econ.dollar); c.money(m); c.L.followers = Math.round(c.L.followers * 0.8); return `با قرارداد ${money(m)} رفتی اونجا. هوادارها بهت گفتن «پول‌پرست»!`; } },
    ],
  },
  {
    id: 'j_actor_role', emoji: '🎬', title: 'نقش جدید', w: 3, when: job('actor'), age: [18, 70],
    text: 'دو تا پیشنهاد داری: یه فیلم هنری که جشنواره‌ای می‌شه، یا یه سریال طنز نمایش خانگی با دستمزد بالا.',
    choices: [
      { label: 'فیلم هنری', do: (c) => { if (c.lucky(0.4)) { c.rep(15); perf(c, 20); c.happy(12); return 'برای این نقش سیمرغ بلورین گرفتی! منتقدها عاشقت شدن.'; } c.rep(4); return 'فیلم خوبی بود ولی دیده نشد.'; } },
      { label: 'سریال طنز', do: (c) => { c.money(c.price(c.int(2, 6) * 1e9)); c.L.followers += c.int(100000, 600000); perf(c, 10); return 'سریال ترکوند! حالا تو خیابون ازت عکس می‌گیرن و دیالوگت شده تکیه‌کلام مردم.'; } },
    ],
  },
  {
    id: 'j_singer_concert', emoji: '🎤', title: 'کنسرت', w: 3, when: job('singer'), age: [18, 75],
    text: 'می‌خوای تو برج میلاد کنسرت بذاری!',
    choices: [
      { label: 'کنسرت بزرگ', cost: (c) => c.price(500e6), note: (c) => `هزینه‌ی سالن و گروه: ${money(c.price(500e6))}`, do: (c) => { if (c.lucky(0.65)) { const m = c.price(c.int(1500, 4000) * 1e6); c.money(m); c.L.followers += c.int(50000, 300000); perf(c, 15); c.happy(12); return `بلیت‌ها تو ده دقیقه تموم شد! ${money(m)} فروش داشتی.`; } c.happy(-10); return 'مجوز کنسرت یه روز قبل لغو شد! کلی ضرر کردی.'; } },
      { label: 'یه تک‌آهنگ منتشر می‌کنم', do: (c) => { c.L.followers += c.int(10000, 150000); perf(c, 6); return 'آهنگ جدیدت تو اینستاگرام ترند شد!'; } },
    ],
  },
  {
    id: 'j_pilot_emergency', emoji: '🛬', title: 'فرود اضطراری', w: 3, when: job('pilot'), age: [22, 65],
    text: 'وسط پرواز تهران به مشهد، یکی از موتورها مشکل پیدا کرده!',
    choices: [
      { label: 'فرود اضطراری با آرامش', do: (c) => { if (c.lucky(0.85)) { c.rep(15); perf(c, 20); c.happy(8); return 'هواپیما رو صحیح و سالم نشوندی! مسافرها برات دست زدن و اخبار ازت تقدیر کرد.'; } c.health(-20); c.happy(-15); return 'فرود سخت بود و چند نفر زخمی شدن. ولی همه زنده موندن.'; } },
    ],
  },
  {
    id: 'j_tycoon_deal', emoji: '🧳', title: 'معامله‌ی بزرگ', w: 3, when: job('tycoon'), age: [22, 85],
    text: 'یه تاجر ترک پیشنهاد واردات یه کانتینر جنس داده. سود بالا، ریسک بالا.',
    choices: [
      { label: 'قبول! «سرمایه شجاعت می‌خواد»', cost: (c) => c.price(3e9), note: (c) => money(c.price(3e9)), do: (c) => { if (c.lucky(0.55)) { const m = c.price(c.int(4, 9) * 1e9); c.money(m); perf(c, 15); return `جنس‌ها رسید و همه رو فروختی؛ ${money(m)} برگشت!`; } c.happy(-12); return 'کانتینر تو گمرک گیر کرد و جنس‌ها خراب شد!'; } },
      { label: 'نه، محتاط باشیم', do: () => 'گفتی «بازار خرابه، صبر کنیم».' },
    ],
  },
  // ───────── police & fire ─────────
  {
    id: 'j_police_chase', emoji: '🚓', title: 'تعقیب', w: 3, when: job('police'), age: [18, 65],
    text: 'یه ماشین دزدی از ایست بازرسی فرار کرد!',
    choices: [
      { label: 'تعقیبش می‌کنم', do: (c) => { if (c.lucky(0.6)) { perf(c, 15); c.rep(6); return 'بعد از یه تعقیب نفس‌گیر گرفتیش! تشویقی گرفتی.'; } c.health(-10); return 'تو تعقیب تصادف کردی و دزد فرار کرد.'; } },
      { label: 'با بی‌سیم خبر می‌دم', do: (c) => { perf(c, 3); return 'به بقیه‌ی واحدها خبر دادی و اونا گرفتنش.'; } },
    ],
  },
  {
    id: 'j_fire_rescue', emoji: '🚒', title: 'آتش‌سوزی', w: 3, when: job('firefighter'), age: [20, 60],
    text: 'یه ساختمون مسکونی آتیش گرفته و یه بچه طبقه‌ی سوم گیر افتاده.',
    choices: [
      { label: 'می‌رم داخل!', do: (c) => { if (c.lucky(0.7)) { c.rep(20); perf(c, 20); c.happy(10); return 'بچه رو بغل کردی و از وسط دود آوردی بیرون! عکست شد تیتر روزنامه‌ها.'; } c.health(-25); return 'بچه نجات پیدا کرد ولی خودت سوختگی شدید برداشتی.'; } },
      { label: 'نردبون رو آماده می‌کنم', do: (c) => { perf(c, 6); return 'با نردبون بچه رو نجات دادین. کار تیمی عالی بود!'; } },
    ],
  },
]);
