import { award } from '../../engine/achieve';
import { type Ctx } from '../../engine/ctx';
import { money } from '../../engine/fmt';
import { defEvents } from '../../engine/registry';

const atUni = (c: Ctx) => c.L.edu.stage === 'uni';

defEvents([
  {
    id: 'y_roommate', age: [18, 30], emoji: '🛏️', title: 'هم‌اتاقی خوابگاه', when: (c) => c.L.home === 'dorm',
    text: (c) => `هم‌اتاقیت ${c.pick(['هر شب تا ۳ صبح با تلفن حرف می‌زنه', 'هیچ‌وقت ظرف نمی‌شوره', 'شب‌ها خروپف می‌کنه مثل تراکتور', 'غذاهای تو یخچال رو می‌خوره'])}.`,
    choices: [
      { label: 'باهاش رک حرف می‌زنم', do: (c) => { if (c.chance(0.6)) { c.happy(3); return 'حرف زدین و قول داد درستش کنه. (یه هفته درستش کرد!)'; } c.happy(-4); return 'ناراحت شد و حالا با هم سرد شدین.'; } },
      { label: 'تحمل می‌کنم', do: (c) => { c.happy(-3); return 'هدفون گذاشتی و تحمل کردی.'; } },
      { label: 'باهاش رفیق می‌شم', do: (c) => { const n = c.addPerson({ rel: 'friend', gender: c.L.gender, born: c.L.year - c.age, close: 70, met: 'خوابگاه' }); c.happy(5); return `با ${n.first} رفیق شدین. حالا شب‌ها با هم ماکارونی خوابگاهی درست می‌کنین!`; } },
    ],
  },
  {
    id: 'y_strict_prof', age: [18, 35], emoji: '👨‍🏫', title: 'استاد سخت‌گیر', when: atUni,
    text: 'استاد درس اصلی‌ات معروفه که «بیست نمی‌ده» و نصف کلاس رو می‌ندازه.',
    choices: [
      { label: 'از ترم اول جدی می‌خونم', do: (c) => { c.L.edu.effort += 1.5; c.happy(-3); if (c.chance(0.6)) return 'با ۱۶ پاس کردی! تو اون کلاس یعنی قهرمان.'; return 'با ۱۲ پاس شدی. حداقل افتادی نیستی!'; } },
      { label: 'جزوه‌ی سال قبل رو می‌گیرم', do: (c) => { if (c.chance(0.5)) { c.happy(3); return 'سؤال‌ها همون سؤال‌های پارسال بود!'; } c.L.edu.effort -= 1; c.happy(-6); return 'استاد امسال همه‌ی سؤال‌ها رو عوض کرد. افتادی!'; } },
    ],
  },
  {
    id: 'y_mashrooti', age: [18, 35], emoji: '⚠️', w: 1.5, text: '', when: (c) => atUni(c) && (c.L.edu.uni?.gpa ?? 20) > 0 && (c.L.edu.uni?.gpa ?? 20) < 12,
    auto: (c) => { c.happy(-8); for (const p of c.parents) c.close(p, -5); return '⚠️ معدلت زیر ۱۲ شد و مشروط شدی! اگه دوباره تکرار بشه، اخراجت می‌کنن.'; },
    kind: 'bad', pop: true,
  },
  {
    id: 'y_group_project', age: [18, 35], emoji: '👥', title: 'پروژه‌ی گروهی', when: atUni,
    text: 'تو پروژه‌ی گروهی، سه تا هم‌گروهیت هیچ کاری نمی‌کنن و همه‌چیز گردن توئه.',
    choices: [
      { label: 'خودم همه رو انجام می‌دم', do: (c) => { c.L.edu.effort += 1; c.happy(-3); c.smarts(1); return 'شب‌بیداری کشیدی و پروژه رو تحویل دادی. اسم همه هم روشه!'; } },
      { label: 'به استاد گزارش می‌دم', do: (c) => { c.rep(-1); return 'استاد نمره‌ی بقیه رو کم کرد. حالا تو گروه چت جواب سلامت رو نمی‌دن!'; } },
    ],
  },
  {
    id: 'y_ta', age: [19, 32], emoji: '📚', title: 'دستیار آموزشی', when: (c) => atUni(c) && (c.L.edu.uni?.gpa ?? 0) > 16,
    text: 'استاد ازت خواسته دستیار آموزشیش بشی (حل تمرین).',
    choices: [
      { label: 'قبول می‌کنم', do: (c) => { c.smarts(2).rep(3); c.money(c.price(15e6)); return 'شدی حل‌تمرین! حالا ورودی‌های جدید بهت می‌گن «استاد».'; } },
      { label: 'وقت ندارم', do: () => 'محترمانه قبول نکردی.' },
    ],
  },
  {
    id: 'y_uni_love', age: [18, 30], emoji: '💘', title: 'عشق دانشگاهی', when: (c) => atUni(c) && !c.spouse && !c.rel('fiance'),
    text: (c) => `یه ${c.male ? 'دختر' : 'پسر'} هم‌دانشکده‌ای همیشه تو سلف کنارت می‌شینه و جزوه‌هات رو قرض می‌گیره…`,
    choices: [
      {
        label: 'پیشنهاد آشنایی می‌دم',
        do: (c) => {
          if (c.lucky(0.4 + c.s('looks') / 300)) {
            c.queue('pick_candidate', { list: [{ first: c.randomFirst(c.male ? 'f' : 'm'), last: c.randomLast(), gender: c.male ? 'f' : 'm', age: c.age, job: 'دانشجو', rich: c.int(1, 3), looks: c.int(50, 95), smarts: c.int(50, 95), trait: c.pick(['مهربون', 'شوخ‌طبع', 'اهل سفر', 'کتاب‌خون']), via: 'دانشگاه' }] as unknown as Record<string, unknown>, crush: 1 });
            c.happy(10);
            return 'اونم بهت علاقه داشت! حالا بعد از کلاس با هم قدم می‌زنین.';
          }
          c.happy(-8);
          return 'گفت «ما فقط هم‌کلاسی هستیم» و جزوه‌ات رو هم پس نداد!';
        },
      },
      { label: 'فقط جزوه می‌دم', do: (c) => { c.rep(1); return 'یه دوستی ساده موند. جزوه‌هات حالا تو کل دانشکده دست به دست می‌شه!'; } },
    ],
  },
  {
    id: 'y_canteen', age: [18, 30], emoji: '🍛', text: '', when: atUni, once: false, cd: 3,
    auto: (c) => { c.happy(-1); return `🍛 غذای سلف امروز ${c.pick(['قیمه بود ولی لپه‌ها رو باید با ذره‌بین پیدا می‌کردی', 'ماکارونی بود با سس رب گوجه‌ی خالص', 'جوجه بود؛ سه تیکه برای کل کلاس', 'کتلت بود به سختی آجر'])}!`; },
  },
  {
    id: 'y_student_loan', age: [18, 32], emoji: '🏦', title: 'وام دانشجویی', when: (c) => atUni(c) && c.cash < c.price(20e6),
    text: 'صندوق رفاه دانشجویی وام کم‌بهره می‌ده. بگیری؟',
    choices: [
      { label: 'آره، می‌گیرم', do: (c) => { const x = c.price(40e6); c.money(x); c.L.loans.push({ id: c.L.nextId++, name: 'وام دانشجویی', left: x, yearly: Math.round(x / 5), rate: 0.04 }); return `${money(x)} وام دانشجویی گرفتی. بعد از فارغ‌التحصیلی قسطش شروع می‌شه… یعنی از الان!`; } },
      { label: 'نه، قرض نمی‌گیرم', do: () => 'قناعت کردی.' },
    ],
  },
  {
    id: 'y_thesis', age: [21, 40], emoji: '📑', title: 'پایان‌نامه', when: (c) => atUni(c) && ['arshad', 'phd'].includes(c.L.edu.uni?.kind ?? ''),
    text: 'وقت نوشتن پایان‌نامه‌ست. تو راسته‌ی انقلاب یکی پیشنهاد «پایان‌نامه‌ی آماده» داده!',
    choices: [
      { label: 'خودم می‌نویسم', do: (c) => { c.smarts(4).happy(-4); c.L.edu.effort += 2; return 'شش ماه خون دل خوردی ولی پایان‌نامه‌ات عالی شد. استاد راهنما گفت «قابل چاپه!»'; } },
      { label: 'پایان‌نامه می‌خرم', cost: (c) => c.price(60e6), note: (c) => money(c.price(60e6)), do: (c) => { if (c.chance(0.3)) { c.rep(-15).happy(-15); return 'تو جلسه‌ی دفاع معلوم شد کپیه! آبروت رفت و باید از اول بنویسی.'; } c.happy(3); return 'خریدی و دفاع کردی. ولی یه عذاب وجدان ته دلت مونده.'; } },
    ],
  },
  {
    id: 'y_interview', age: [21, 35], emoji: '👔', title: 'مصاحبه‌ی کاری', when: (c) => !c.L.job && c.L.edu.stage === 'none' && c.L.edu.degrees.length > 1,
    text: 'تو مصاحبه‌ی یه شرکت خوب ازت پرسیدن: «خودتون رو پنج سال دیگه کجا می‌بینید؟»',
    choices: [
      { label: '«جای شما!»', do: (c) => { if (c.chance(0.3)) { c.happy(5); return 'مدیر خندید و گفت «اعتماد به نفست رو دوست دارم». فردا زنگ زدن!'; } c.happy(-4); return 'مدیر اخم کرد. قبول نشدی.'; } },
      { label: '«یه متخصص تو همین شرکت»', do: (c) => { c.rep(2); return 'جواب استاندارد دادی. گفتن «باهاتون تماس می‌گیریم».'; } },
      { label: '«کانادا!»', do: (c) => { c.happy(2); return 'همه خندیدن. مدیر گفت «راستش منم!»'; } },
    ],
  },
  {
    id: 'y_startup_offer', age: [20, 40], emoji: '🚀', title: 'پیشنهاد استارتاپ', when: (c) => c.s('smarts') > 55,
    text: 'دوست هم‌دانشگاهیت می‌خواد یه استارتاپ راه بندازه و ازت می‌خواد هم‌بنیان‌گذارش بشی.',
    choices: [
      {
        label: 'پایه‌ام! سرمایه هم می‌ذارم', cost: (c) => c.price(150e6), note: (c) => money(c.price(150e6)),
        do: (c) => {
          const r = c.r();
          if (r < 0.12 + c.luck / 500) { const m = c.price(c.int(8, 40) * 1e9); c.money(m); c.happy(20).rep(10); return `استارتاپتون گرفت و یه شرکت بزرگ خریدش! سهم تو: ${money(m)}`; }
          if (r < 0.5) { c.money(c.price(200e6)); c.happy(4); return 'استارتاپ یه مدت درآمد داشت و پولت رو با کمی سود پس گرفتی.'; }
          c.happy(-10);
          return 'بعد از دو سال سگ‌دو، استارتاپ تعطیل شد و سرمایه‌ات دود شد.';
        },
      },
      { label: 'نه، کار مطمئن می‌خوام', do: () => 'گفتی «موفق باشی» و رفتی سر کار خودت.' },
    ],
  },
  {
    id: 'y_divar_rent', age: [20, 45], emoji: '🔎', title: 'خونه‌گردی', when: (c) => c.L.home === 'rent', once: false, cd: 6,
    text: 'قرارداد اجاره‌ات تموم شده و باید خونه پیدا کنی. تو سایت آگهی‌ها یه خونه‌ی «فوق‌العاده ارزون» هست…',
    choices: [
      { label: 'می‌رم ببینم', do: (c) => { if (c.chance(0.5)) return 'رفتی دیدی خونه زیرزمینه و پنجره‌اش رو به دیواره! «ارزون» دلیل داشت.'; c.happy(6); return 'خونه واقعاً خوب بود! قرارداد بستی و یه سال خیالت راحت شد.'; } },
      { label: 'بنگاه مطمئن', cost: (c) => c.price(15e6), note: (c) => `کمیسیون: ${money(c.price(15e6))}`, do: (c) => { c.happy(3); return 'بنگاه‌دار یه خونه‌ی معمولی پیدا کرد و کمیسیونش رو گرفت.'; } },
    ],
  },
  {
    id: 'y_friend_wedding', age: [20, 40], emoji: '💌', title: 'کارت عروسی', once: false, cd: 3, when: (c) => c.rels('friend').length > 0,
    text: (c) => `${c.rels('friend')[0].first} کارت عروسی فرستاده. کادو چی ببری؟`,
    choices: [
      { label: 'یه سکه‌ی طلا', cost: (c) => Math.round(c.L.econ.coin / 4), note: (c) => `ربع سکه: ${money(Math.round(c.L.econ.coin / 4))}`, do: (c) => { c.close(c.rels('friend')[0], 15); c.rep(3); return 'یه ربع سکه کادو دادی. دوستت تو جمع کلی ازت تشکر کرد.'; } },
      { label: 'پاکت پول', cost: (c) => c.price(5e6), note: (c) => money(c.price(5e6)), do: (c) => { c.close(c.rels('friend')[0], 8); return 'پاکت پول دادی. منطقی و کاربردی!'; } },
      { label: 'نمی‌رم، کار دارم', do: (c) => { c.close(c.rels('friend')[0], -15); return 'نرفتی. دوستت پیام داد «جات خالی بود…» با یه شکلک ناراحت.'; } },
    ],
  },
  {
    id: 'y_online_shop', age: [18, 45], emoji: '🛒', title: 'فروش اینترنتی', when: (c) => c.L.followers > 3000,
    text: 'فالوورهات زیاد شدن. یه نفر پیشنهاد داده یه پیج فروش راه بندازی.',
    choices: [
      {
        label: 'پیج فروش لباس', cost: (c) => c.price(100e6), note: (c) => `سرمایه: ${money(c.price(100e6))}`,
        do: (c) => { if (c.lucky(0.5)) { const m = c.price(c.int(150, 600) * 1e6); c.money(m); c.happy(8); return `فروشت گرفت! امسال ${money(m)} سود کردی.`; } c.happy(-5); return 'جنس‌ها رو دیر فرستادی و کلی نظر منفی گرفتی. ضرر کردی.'; },
      },
      { label: 'نه، حوصله ندارم', do: () => 'بی‌خیال شدی.' },
    ],
  },
  {
    id: 'y_friends_leaving', age: [22, 40], emoji: '🛫', text: '', when: (c) => !c.abroad && c.rels('friend').length > 0, once: false, cd: 6,
    auto: (c) => {
      const f = c.rels('friend')[0];
      f.alive = false;
      f.flags = { ...(f.flags ?? {}), gone: c.L.year };
      c.happy(-5);
      return `🛫 ${f.first} مهاجرت کرد ${c.pick(['کانادا', 'آلمان', 'ترکیه', 'استرالیا'])}. تو فرودگاه خداحافظی کردین و حالا فقط از طریق ویدیو کال می‌بینیش.`;
    },
    kind: 'bad',
  },
  {
    id: 'y_supplement', age: [17, 35], emoji: '💊', title: 'مکمل باشگاه', when: (c) => (c.L.used.gym ?? 0) > 0 || c.trait('athlete'),
    text: 'مربی باشگاه یه پودر «جادویی» پیشنهاد داده که «یه‌ماهه هیکلت رو می‌ترکونه».',
    choices: [
      { label: 'می‌خرم', cost: (c) => c.price(8e6), note: (c) => money(c.price(8e6)), do: (c) => { if (c.chance(0.3)) { c.health(-8); return 'کبدت به هم ریخت! دکتر گفت «این پودر تقلبی بوده».'; } c.looks(3); return 'یه کم عضله گرفتی. البته بیشتر به خاطر تمرین بود!'; } },
      { label: 'نه، با غذای سالم', do: (c) => { c.health(2); return 'گفتی «مرغ و برنج کافیه».'; } },
    ],
  },
  {
    id: 'y_konkur_arshad_class', age: [21, 30], emoji: '📚', title: 'کلاس ارشد', when: (c) => atUni(c) && c.L.edu.uni?.kind === 'karshenasi' && (c.L.edu.uni?.year ?? 0) >= 3,
    text: 'هم‌کلاسی‌ها همه کلاس کنکور ارشد ثبت‌نام کردن.',
    choices: [
      { label: 'منم ثبت‌نام می‌کنم', cost: (c) => c.price(40e6), note: (c) => money(c.price(40e6)), do: (c) => { c.smarts(3); c.flag('arshadPrep'); return 'ثبت‌نام کردی. شانس قبولیت تو ارشد بیشتر شد.'; } },
      { label: 'نه، می‌خوام برم سر کار', do: () => 'تصمیم گرفتی بعد از لیسانس کار کنی.' },
    ],
  },
  {
    id: 'y_elite', age: [18, 20], emoji: '🏅', w: 5, text: '', when: (c) => c.male && (c.L.edu.konkur?.rank ?? 1e9) <= 100 && c.L.mil.status !== 'exempt',
    auto: (c) => { c.L.mil.status = 'exempt'; award(c, 'konkur100'); c.happy(10); return '🏅 به خاطر رتبه‌ی برتر کنکور، بنیاد نخبگان معافیت سربازی‌ات رو تأیید کرد!'; },
    kind: 'big', pop: true,
  },
  {
    id: 'y_first_salary', age: [16, 30], emoji: '💵', text: '', when: (c) => !!c.L.job && !c.has('first_salary'),
    auto: (c) => { c.flag('first_salary'); c.happy(6); return `💵 اولین حقوقت رو گرفتی! ${c.pick(['همه‌اش رو تو یه هفته خرج کردی.', 'نصفش رو برای مامانت کادو خریدی.', 'تو حسابت گذاشتی و هر روز موجودی رو چک کردی.'])}`; },
    kind: 'good',
  },
  {
    id: 'y_blind_date', age: [24, 38], emoji: '☕', title: 'آشنایی سنتی', when: (c) => !c.spouse && !c.rel('fiance') && !!c.rel('mother'),
    text: (c) => `مامانت با ذوق می‌گه: «${c.male ? 'دختر' : 'پسر'} دوستم خیلی خوبه، یه قرار کافه بذارین!»`,
    choices: [
      {
        label: 'باشه، می‌رم', do: (c) => {
          const k = { first: c.randomFirst(c.male ? 'f' : 'm'), last: c.randomLast(), gender: c.male ? 'f' : 'm', age: c.age + (c.male ? -2 : 2), job: c.pick(['مهندس', 'معلم', 'پرستار', 'کارمند', 'دکتر']), rich: c.int(1, 3), looks: c.int(30, 90), smarts: c.int(30, 90), trait: c.pick(['مهربون', 'جدی', 'شوخ‌طبع']), via: 'معرفی مامان' };
          if (c.lucky(0.45)) { c.queue('pick_candidate', { list: [k] as unknown as Record<string, unknown>, crush: 1 }); c.happy(5); return `با ${k.first} قرار گذاشتی. خیلی خوش گذشت!`; }
          c.happy(-3);
          return `${k.first} کل قرار با گوشیش ور رفت. «دیگه هیچ‌وقت!»`;
        },
      },
      { label: 'نه مامان! خودم پیدا می‌کنم', do: (c) => { const m = c.rel('mother'); if (m) c.close(m, -4); return 'مامانت گفت «باشه، ولی پیر شدی!»'; } },
    ],
  },
  {
    id: 'y_car_registration', age: [20, 70], emoji: '🚘', title: 'قرعه‌کشی خودرو', once: false, cd: 4,
    when: (c) => !c.abroad && c.cash > c.price(700e6),
    text: 'ثبت‌نام فروش فوق‌العاده‌ی خودرو شروع شده! اگه برنده بشی، ماشین رو به قیمت کارخونه می‌گیری.',
    choices: [
      {
        label: 'ثبت‌نام می‌کنم', do: (c) => {
          if (c.lucky(0.12)) {
            const profit = c.price(c.int(250, 600) * 1e6);
            c.money(profit);
            c.happy(12);
            return `برنده شدی! ماشین رو تحویل گرفتی و همون روز فروختی؛ ${money(profit)} سود کردی!`;
          }
          c.happy(-2);
          return 'از بین سه میلیون ثبت‌نامی، اسمت درنیومد. طبق معمول!';
        },
      },
      { label: 'حوصله‌ی صف ندارم', do: () => 'گفتی «این دفعه هم که درنمیاد».' },
    ],
  },
]);

