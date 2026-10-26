/** Middle age, 40–65: your kids' konkur and weddings, reunions, grey hair and reading glasses, inheritance… */
import { clamp, type Ctx } from '../../engine/ctx';
import { money } from '../../engine/fmt';
import { defEvents } from '../../engine/registry';
import type { Npc } from '../../engine/types';

const kidAged = (c: Ctx, lo: number, hi: number): Npc | undefined => c.kids.find((k) => c.ageOf(k) >= lo && c.ageOf(k) <= hi);
const realNet = (c: Ctx) => c.net / c.L.econ.price;

defEvents([
  {
    id: 'mid_kid_konkur', emoji: '📚', title: 'کنکور بچه', age: [38, 70],
    when: (c) => !!kidAged(c, 17, 18),
    prep: (c) => ({ kid: kidAged(c, 17, 18)!.id }),
    text: (c) => `${c.relName(c.L.people.find((p) => p.id === c.p.kid)!)} امسال کنکور داره و کل خونه حکومت نظامیه!`,
    choices: [
      {
        label: 'معلم خصوصی می‌گیرم',
        cost: (c) => c.price(120e6),
        note: (c) => money(c.price(120e6)),
        do: (c) => { const k = c.L.people.find((p) => p.id === c.p.kid)!; k.smarts = clamp((k.smarts ?? 50) + 8); c.close(k, 6); return `برای ${k.first} بهترین معلم‌های کنکور رو گرفتی. صدای تست زدنش تا نصفه‌شب میاد!`; },
      },
      { label: '«روزی چهارده ساعت باید بخونی!»', do: (c) => { const k = c.L.people.find((p) => p.id === c.p.kid)!; k.smarts = clamp((k.smarts ?? 50) + 4); c.close(k, -12); return `${k.first} زیر فشار درس خوند… و یه هفته باهات حرف نزد.`; } },
      { label: '«مهم سلامتیه، فشار نیار به خودت»', do: (c) => { const k = c.L.people.find((p) => p.id === c.p.kid)!; c.close(k, 10); c.happy(2); return `${k.first} بغلت کرد. گفت «تو بهترین ${c.male ? 'بابای' : 'مامان'} دنیایی.»`; } },
    ],
  },
  {
    id: 'mid_kid_wedding', emoji: '🎊', title: 'عروسی بچه', age: [42, 80],
    when: (c) => c.kids.some((k) => c.ageOf(k) >= 23 && !k.flags?.married),
    prep: (c) => { const k = c.kids.find((x) => c.ageOf(x) >= 23 && !x.flags?.married); return k ? { kid: k.id } : null; },
    text: (c) => {
      const k = c.L.people.find((p) => p.id === c.p.kid)!;
      return k.gender === 'f' ? `${k.first} قراره ازدواج کنه و همه منتظرن ببینن جهیزیه‌اش چی می‌شه!` : `${k.first} قراره ازدواج کنه و خرج عروسی و مهریه سنگینه.`;
    },
    choices: [
      {
        label: 'سنگ تموم می‌ذارم',
        cost: (c) => c.price(800e6),
        note: (c) => money(c.price(800e6)),
        do: (c) => { const k = c.L.people.find((p) => p.id === c.p.kid)!; k.flags = { ...(k.flags ?? {}), married: c.L.year }; c.close(k, 15); c.rep(6).happy(8); return `عروسی ${k.first} شد حرف کل فامیل! ${k.gender === 'f' ? 'جهیزیه‌اش از یخچال ساید تا مبل استیل بود.' : 'تالار و شام و فیلمبردار، همه درجه یک.'}`; },
      },
      {
        label: 'به اندازه‌ی وسعم کمک می‌کنم',
        cost: (c) => c.price(150e6),
        note: (c) => money(c.price(150e6)),
        do: (c) => { const k = c.L.people.find((p) => p.id === c.p.kid)!; k.flags = { ...(k.flags ?? {}), married: c.L.year }; c.close(k, 8); c.happy(6); return `یه عروسی ساده و قشنگ گرفتن. ${k.first} گفت «همین که کنارمی بسه.»`; },
      },
      { label: 'خودشون از پسش برمیان', do: (c) => { const k = c.L.people.find((p) => p.id === c.p.kid)!; k.flags = { ...(k.flags ?? {}), married: c.L.year }; c.close(k, -6); c.rep(-2); return `${k.first} با یه وام ازدواج عروسی گرفت. فامیل پشت سرت حرف زدن!`; } },
    ],
  },
  {
    id: 'mid_reunion', emoji: '🏫', title: 'دورهمی هم‌کلاسی‌ها', age: [40, 55],
    text: 'گروه تلگرامی هم‌کلاسی‌های دبیرستان بعد از بیست‌وپنج سال یه دورهمی گذاشته.',
    choices: [
      {
        label: 'می‌رم!',
        do: (c) => {
          c.happy(4);
          if (realNet(c) >= 10e9) { c.rep(3); return 'همه ازت پرسیدن «چطوری انقدر موفق شدی؟» و تو با فروتنی گفتی «شانس بود!»'; }
          return c.pick(['فهمیدی تنبل‌ترین بچه‌ی کلاس الان صاحب سه تا مغازه‌ست!', 'شاگرد اول کلاس رو دیدی؛ رفته کانادا و تصویری اومده بود!', 'نصف کلاس رو نشناختی و نصف دیگه تو رو!']);
        },
      },
      { label: 'حوصله‌اش رو ندارم', do: (c) => { c.happy(-1); return 'نرفتی. عکس‌هاش رو تو گروه دیدی و یه کم دلت گرفت.'; } },
    ],
  },
  {
    id: 'mid_gray_hair', emoji: '🪞', title: 'اولین موی سفید', age: [35, 50],
    text: 'جلوی آینه اولین موی سفیدت رو دیدی!',
    choices: [
      { label: 'رنگ می‌کنم!', cost: (c) => c.price(c.male ? 500e3 : 3e6), note: (c) => money(c.price(c.male ? 500e3 : 3e6)), do: (c) => { c.looks(2).happy(2); return 'رنگ کردی و ده سال جوون‌تر شدی… حداقل تو آینه!'; } },
      { label: 'می‌کنمش!', do: (c) => { c.happy(1); return 'کندیش. هفته‌ی بعد دو تا جاش دراومد!'; } },
      { label: 'نشونه‌ی تجربه‌ست', do: (c) => { c.rep(2).happy(2); return 'با افتخار گذاشتی بمونه. همسایه‌ها دیگه بهت می‌گن «جناب»!'; } },
    ],
  },
  {
    id: 'mid_glasses', emoji: '👓', title: 'عینک مطالعه', age: [42, 60],
    text: 'دیگه نوشته‌های ریز رو نمی‌بینی و گوشی رو هی دورتر می‌گیری.',
    choices: [
      { label: 'می‌رم عینک می‌گیرم', cost: (c) => c.price(4e6), note: (c) => money(c.price(4e6)), do: (c) => { c.health(1).smarts(1); return 'عینک گرفتی و تازه فهمیدی سال‌ها پیام‌ها رو اشتباه می‌خوندی!'; } },
      { label: 'دستم رو دورتر می‌گیرم!', do: (c) => { c.happy(-1); return 'حالا برای خوندن یه پیام دستت رو تا ته دراز می‌کنی. بچه‌ها بهت می‌خندن!'; } },
    ],
  },
  {
    id: 'mid_back_pain', emoji: '🦴', title: 'کمردرد', age: [40, 70], once: false, cd: 6,
    text: 'یه جعبه رو بلند کردی و کمرت گرفت. حالا مثل علامت سؤال راه می‌ری!',
    choices: [
      { label: 'فیزیوتراپی', cost: (c) => c.price(15e6), note: (c) => money(c.price(15e6)), do: (c) => { c.health(4); return 'ده جلسه فیزیوتراپی رفتی و صاف شدی. فیزیوتراپ گفت «شنا برو!»'; } },
      { label: 'پماد و حوله‌ی گرم!', do: (c) => { c.health(c.chance(0.5) ? 1 : -3); return 'مامان‌بزرگی درمانش کردی. یه کم بهتر شد… یا شاید فقط عادت کردی!'; } },
      { label: 'یوگا و نرمش هر روز', do: (c) => { c.health(3).happy(1); return 'هر روز صبح نرمش کردی و کمردرد کم‌کم رفت.'; } },
    ],
  },
  {
    id: 'mid_cholesterol', emoji: '🩸', title: 'آزمایش خون', age: [40, 70],
    text: 'جواب آزمایش اومده: چربی خونت بالاست! دکتر گفت «کله‌پاچه و کباب ممنوع!»',
    choices: [
      { label: 'رژیم می‌گیرم و پیاده‌روی می‌کنم', do: (c) => { c.health(5).happy(-2); return 'سه ماه بعد آزمایشت نرمال شد. ولی دلت برای کله‌پاچه‌ی جمعه‌ها تنگه!'; } },
      { label: 'قرصش رو می‌خورم', do: (c) => { c.health(2); return 'قرص گرفتی. دکتر گفت «قرص جای ورزش رو نمی‌گیره‌ها!»'; } },
      { label: 'یه بار که هزار بار نمی‌شه!', do: (c) => { c.health(-5).happy(3); return 'همون جمعه رفتی کله‌پاچه. خوشمزه بود… ولی قلبت راضی نیست.'; } },
    ],
  },
  {
    id: 'mid_school_call', emoji: '📞', title: 'احضار به مدرسه', age: [35, 60],
    when: (c) => !!kidAged(c, 12, 17),
    prep: (c) => ({ kid: kidAged(c, 12, 17)!.id }),
    text: (c) => `ناظم مدرسه زنگ زده: «${c.g('آقای', 'خانم')} ${c.L.last}، فردا تشریف بیارید مدرسه، باید درباره‌ی ${c.L.people.find((p) => p.id === c.p.kid)!.first} صحبت کنیم.»`,
    choices: [
      { label: 'می‌رم و طرف بچه‌ام رو می‌گیرم', do: (c) => { const k = c.L.people.find((p) => p.id === c.p.kid)!; c.close(k, 8); c.rep(-1); return `فهمیدی ${k.first} سر کلاس شوخی کرده. به ناظم گفتی «بچه‌ست دیگه!» ${k.first} ذوق کرد.`; } },
      { label: 'می‌رم و تو خونه دعواش می‌کنم', do: (c) => { const k = c.L.people.find((p) => p.id === c.p.kid)!; c.close(k, -8); k.smarts = clamp((k.smarts ?? 50) + 2); return `${k.first} یه ماه تنبیه شد: نه گوشی، نه بیرون. نمره‌هاش بهتر شد ولی باهات سرسنگینه.`; } },
      { label: 'وقت ندارم، همسرم بره', when: (c) => !!c.spouse, do: (c) => { c.close(c.spouse!, -5); return `${c.spouse!.first} رفت مدرسه و شب گفت «همیشه من باید برم؟!»`; } },
    ],
  },
  {
    id: 'mid_renovate', emoji: '🔨', title: 'بازسازی', age: [40, 70],
    when: (c) => c.L.home === 'own',
    text: 'همه‌ی همسایه‌ها آشپزخونه‌شون رو بازسازی کردن و کابینت‌های تو مال بیست سال پیشه.',
    choices: [
      { label: 'بازسازی کامل!', cost: (c) => c.price(400e6), note: (c) => money(c.price(400e6)), do: (c) => { c.happy(8).rep(2); return 'سه ماه خونه پر از گرد و خاک بود و کارگر دو ماه دیر کرد، ولی حالا خونه‌ات مثل مجله‌ست!'; } },
      { label: 'فقط رنگ‌آمیزی', cost: (c) => c.price(40e6), note: (c) => money(c.price(40e6)), do: (c) => { c.happy(3); return 'یه رنگ تازه زدی و خونه یه جون تازه گرفت.'; } },
      { label: 'قدیمی‌ها محکم‌ترن!', do: (c) => { c.happy(-1); return 'گفتی «کابینت‌های ما چوب گردوئه، مال اونا نئوپان!» و قضیه رو بستی.'; } },
    ],
  },
  {
    id: 'mid_inheritance', emoji: '📜', title: 'دعوای ارث', age: [35, 80],
    when: (c) => !c.parents.length && c.rels('brother', 'sister').length > 0 && c.L.people.some((p) => (p.rel === 'father' || p.rel === 'mother') && p.died),
    text: (c) => `${c.relName(c.rels('brother', 'sister')[0])} می‌گه خونه‌ی پدری باید فروخته بشه و سهم بیشتری می‌خواد.`,
    choices: [
      { label: 'سهمم رو می‌بخشم، دعوا نمی‌خوام', do: (c) => { for (const s of c.rels('brother', 'sister')) c.close(s, 15); c.rep(5).happy(2); return 'گفتی «پول ارزش دعوا رو نداره». کل فامیل ازت به خوبی یاد کردن.'; } },
      { label: 'مساوی تقسیم می‌کنیم', do: (c) => { const m = c.price(c.int(150, 600) * 1e6); c.money(m); return `خونه فروخته شد و سهمت ${money(m)} شد. یه کم دلخوری موند ولی تموم شد.`; } },
      {
        label: 'شکایت می‌کنم!',
        do: (c) => {
          for (const s of c.rels('brother', 'sister')) c.close(s, -30);
          c.happy(-6);
          if (c.lucky(0.6)) { const m = c.price(c.int(400, 900) * 1e6); c.money(m); return `بعد از دو سال دادگاه ${money(m)} گرفتی. ولی دیگه عید دیدنی خونه‌ی هم نمی‌رین.`; }
          c.money(-c.price(80e6));
          return 'دو سال دادگاه رفتی، پول وکیل دادی و آخرش باختی!';
        },
      },
    ],
  },
  {
    id: 'mid_kid_drives', emoji: '🚗', title: 'رانندگی بچه', age: [38, 70],
    when: (c) => !!kidAged(c, 18, 22) && c.L.assets.some((a) => a.kind === 'car'),
    prep: (c) => ({ kid: kidAged(c, 18, 22)!.id }),
    text: (c) => `${c.L.people.find((p) => p.id === c.p.kid)!.first} تازه گواهینامه گرفته و سوئیچ ماشینت رو می‌خواد.`,
    choices: [
      {
        label: 'بیا، ولی آروم برو!',
        do: (c) => {
          const k = c.L.people.find((p) => p.id === c.p.kid)!;
          c.close(k, 8);
          if (c.chance(0.3)) { c.money(-c.price(30e6)).happy(-4); return `${k.first} با ماشین رفت تو جدول! ${money(c.price(30e6))} خرج صافکاری شد.`; }
          return `${k.first} سالم برگشت و ماشین رو هم کارواش برده بود!`;
        },
      },
      { label: 'خودم کنارش می‌شینم', do: (c) => { const k = c.L.people.find((p) => p.id === c.p.kid)!; c.close(k, 3); c.happy(-1); return `کل راه گفتی «ترمز! آینه! راهنما!» ${k.first} گفت «دیگه هیچ‌وقت!»`; } },
      { label: 'نه، ماشین من نه!', do: (c) => { const k = c.L.people.find((p) => p.id === c.p.kid)!; c.close(k, -8); return `${k.first} با اسنپ رفت و تا شب باهات قهر بود.`; } },
    ],
  },
  {
    id: 'mid_hobby', emoji: '🎻', title: 'یه سرگرمی تازه', age: [40, 60],
    text: 'حس می‌کنی زندگی فقط کار و خونه شده. وقتشه یه چیز جدید یاد بگیری!',
    choices: [
      { label: 'سه‌تار', cost: (c) => c.price(10e6), note: (c) => money(c.price(10e6)), do: (c) => { c.happy(6).smarts(2); c.inc('music'); return 'سه‌تار یاد گرفتی. اولش همسایه‌ها شاکی بودن، حالا شب‌ها گوش می‌دن!'; } },
      { label: 'باغبونی', do: (c) => { c.happy(5).health(2); return 'تو بالکن گوجه و ریحون کاشتی. اولین گوجه رو به همه نشون دادی!'; } },
      { label: 'دوچرخه‌سواری', cost: (c) => c.price(15e6), note: (c) => money(c.price(15e6)), do: (c) => { c.health(5).happy(4); return 'یه دوچرخه خریدی و جمعه‌ها با یه گروه میانسال رکاب می‌زنی!'; } },
      { label: 'وقت ندارم', do: (c) => { c.happy(-2); return 'گفتی «بعد از بازنشستگی». همیشه بعد…'; } },
    ],
  },
]);
