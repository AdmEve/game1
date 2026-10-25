import { award } from '../../engine/achieve';
import { fa, money } from '../../engine/fmt';
import { defEvents } from '../../engine/registry';

defEvents([
  {
    id: 't_phone', age: [11, 15], emoji: '📱', title: 'گوشی', when: (c) => !!c.rel('father'),
    text: 'همه‌ی هم‌کلاسی‌هات گوشی دارن جز تو. بابات می‌گه «گوشی برای بچه ضرر داره».',
    choices: [
      { label: 'اصرار و التماس', do: (c) => { if (c.lucky(0.5)) { c.flag('phone'); c.happy(10); c.L.edu.effort -= 0.5; return 'بابات یه گوشی دست دوم برات خرید. دیگه از دستت نمی‌افته!'; } c.happy(-5); return 'بابات گفت «تا دیپلم نگرفتی خبری از گوشی نیست!»'; } },
      { label: 'با عیدی‌هام خودم می‌خرم', cost: (c) => c.price(8e6), note: (c) => money(c.price(8e6)), do: (c) => { c.flag('phone'); c.happy(8); return 'با پول خودت گوشی خریدی. بابات یه کم ناراحت شد ولی چیزی نگفت.'; } },
      { label: 'باشه، مهم نیست', do: (c) => { c.L.edu.effort += 0.5; c.rep(2); return 'گوشی نداشتی ولی جاش بیشتر کتاب خوندی.'; } },
    ],
  },
  {
    id: 't_crush', age: [13, 18], emoji: '💘', title: 'دلباختگی',
    text: (c) => `از یه ${c.male ? 'دختر' : 'پسر'} تو ${c.pick(['کلاس زبان', 'محله', 'آموزشگاه کنکور', 'عروسی پسرخاله‌ات'])} خوشت اومده. چی‌کار می‌کنی؟`,
    choices: [
      { label: 'یه نامه‌ی عاشقانه می‌نویسم', do: (c) => { if (c.lucky(0.35 + c.s('looks') / 300)) { c.happy(12); return 'جوابت رو داد! چند ماه یواشکی پیامک بازی کردین. عشق اول!'; } c.happy(-10); return 'نامه‌ات دست دوستاش افتاد و کل کلاس خوندنش. آبروت رفت!'; } },
      { label: 'از دور نگاه می‌کنم', do: (c) => { c.happy(-2); return 'هر روز از دور نگاهش کردی و تو دفترچه‌ات شعر نوشتی. هیچ‌وقت نفهمید!'; } },
      { label: 'بی‌خیال، باید درس بخونم', do: (c) => { c.L.edu.effort += 0.5; return 'دلت رو زدی به دریا… نه، دلت رو زدی به کتاب تست!'; } },
    ],
  },
  {
    id: 't_acne', age: [13, 17], emoji: '😖', text: '',
    auto: (c) => { c.looks(-c.int(2, 6)).happy(-3); return '😖 صورتت پر جوش شده. هر روز جلوی آینه یه ساعت وقت می‌ذاری!'; },
    kind: 'bad',
  },
  {
    id: 't_growth', age: [13, 16], emoji: '📏', text: '',
    auto: (c) => { c.looks(c.int(2, 6)).health(2); return `📏 یه‌دفعه ${fa(c.int(8, 15))} سانت قد کشیدی! همه‌ی شلوارهات کوتاه شد.`; },
    kind: 'good',
  },
  {
    id: 't_cigarette', age: [14, 19], emoji: '🚬', title: 'سیگار',
    text: 'رفقات پشت مدرسه دارن سیگار می‌کشن و بهت تعارف می‌کنن.',
    choices: [
      { label: 'نه مرسی', do: (c) => { c.rep(2); return 'گفتی «نه» و گفتن «بچه‌ننه!». ولی ریه‌هات ازت ممنونن.'; } },
      { label: 'یه پک می‌زنم', do: (c) => { c.health(-3); if (c.chance(0.35)) { c.flag('smoker'); c.health(-5); return 'اولش سرفه کردی، ولی کم‌کم سیگاری شدی. (ریه‌هات ناراحتن!)'; } return 'سرفه‌ات گرفت و چشمات اشکی شد. دیگه هیچ‌وقت لب نزدی.'; } },
    ],
  },
  {
    id: 't_motorbike', age: [15, 19], emoji: '🏍️', title: 'موتور',
    when: (c) => c.male,
    text: 'رفیقت موتورش رو آورده و می‌گه «بیا یه دور بزن!» گواهینامه نداری.',
    choices: [
      { label: 'گاز بده بریم!', do: (c) => { if (c.lucky(0.8)) { c.happy(8); return 'تو خیابون تک‌چرخ زدی! حس آزادی داشتی.'; } if (c.chance(0.5)) { c.health(-20).happy(-8); return 'خوردی به جدول و پات شکست! سه ماه گچ گرفتی.'; } c.happy(-6).rep(-4); return 'پلیس گرفتت! موتور رو بردن پارکینگ و بابات اومد دنبالت.'; } },
      { label: 'نه، خطرناکه', do: (c) => { c.rep(1); return 'سوار نشدی. رفیقت بهت گفت «ترسو».'; } },
    ],
  },
  {
    id: 't_exam_stress', age: [13, 18], emoji: '😰', text: '',
    when: (c) => c.L.edu.stage === 'school' && c.L.edu.grade >= 9,
    auto: (c) => { c.happy(-4); return `😰 شب امتحان ${c.pick(['شیمی', 'فیزیک', 'عربی', 'ریاضی', 'زیست'])} تازه یادت افتاد کتاب رو باز نکردی! تا صبح بیدار موندی.`; },
  },
  {
    id: 't_konkur_pressure', age: [16, 18], emoji: '📚', title: 'فشار کنکور',
    when: (c) => c.L.edu.stage === 'school' && c.L.edu.grade >= 11,
    text: (c) => `${c.rel('mother') ? 'مامانت' : 'خانواده'} هر روز می‌گه «پسر خاله‌ات روزی ۱۴ ساعت درس می‌خونه!» حسابی تحت فشاری.`,
    choices: [
      { label: 'برنامه‌ریزی می‌کنم و می‌خونم', do: (c) => { c.L.edu.effort += 1.5; c.happy(-4).health(-2); return 'برنامه‌ی سنگین ریختی و هر روز تست زدی.'; } },
      { label: 'باهاشون حرف می‌زنم', do: (c) => { for (const p of c.parents) c.close(p, 4); c.happy(4); return 'باهاشون حرف زدی و قبول کردن کمتر فشار بیارن.'; } },
      { label: 'قهر می‌کنم', do: (c) => { for (const p of c.parents) c.close(p, -6); c.happy(-2); return 'دو روز با کسی حرف نزدی و غذا نخوردی.'; } },
    ],
  },
  {
    id: 't_olympiad', age: [14, 17], emoji: '🥇', title: 'المپیاد',
    when: (c) => c.L.edu.stage === 'school' && c.s('smarts') > 70,
    text: 'معلمت پیشنهاد می‌ده برای المپیاد علمی آماده بشی.',
    choices: [
      {
        label: 'آره، المپیاد ریاضی!', do: (c) => {
          c.L.edu.effort += 1; c.happy(-3);
          if (c.lucky((c.s('smarts') - 60) / 60)) { c.flag('olympiad'); c.smarts(5).rep(10).happy(10); return 'مدال طلای المپیاد کشوری رو گرفتی! بدون کنکور می‌تونی هر رشته‌ای بخونی (تو کنکور خیلی کمکت می‌کنه).'; }
          return 'تا مرحله‌ی دوم رفتی ولی مدال نگرفتی. چیزهای زیادی یاد گرفتی.';
        },
      },
      { label: 'نه، تمرکزم رو کنکوره', do: (c) => { c.L.edu.effort += 0.5; return 'المپیاد رو بی‌خیال شدی.'; } },
    ],
  },
  {
    id: 't_school_fight', age: [12, 17], emoji: '🥊', text: '', w: 0.6,
    auto: (c) => { c.rep(-3).health(-3); return '🥊 سر یه توپ فوتبال با یکی از هم‌کلاسی‌ها دعوات شد و هر دوتون رو بردن دفتر.'; },
    kind: 'bad',
  },
  {
    id: 't_parttime_offer', age: [15, 18], emoji: '💼', title: 'کار تابستونی',
    when: (c) => !c.L.job,
    text: (c) => `${c.pick(['داییت', 'عموت', 'همسایه‌تون'])} می‌گه تابستون بیا تو مغازه‌ام کار کن.`,
    choices: [
      { label: 'آره، پول درمیارم', do: (c) => { const m = c.price(c.int(10, 25) * 1e6); c.money(m); c.happy(3).rep(2); return `کل تابستون کار کردی و ${money(m)} پول درآوردی. اولین حقوقت رو با دقت شمردی!`; } },
      { label: 'نه، تابستونه!', do: (c) => { c.happy(5); return 'تابستون رو با خواب و بازی و فوتبال گذروندی.'; } },
    ],
  },
  {
    id: 't_youtube_dream', age: [13, 19], emoji: '🎥', title: 'یوتیوبر شدن',
    text: 'تصمیم گرفتی یه کانال درست کنی و ویدیو بذاری.',
    choices: [
      { label: 'ویدیوی گیم', do: (c) => { const f = c.int(50, 3000); c.L.followers += f; c.happy(4); return `اولین ویدیوت رو گذاشتی و ${f.toLocaleString('fa-IR')} نفر دنبالت کردن!`; } },
      { label: 'ویدیوی آموزشی درسی', do: (c) => { const f = c.int(100, 5000); c.L.followers += f; c.smarts(2).rep(3); return `ویدیوی آموزش «حد و مشتق» گذاشتی و ${f.toLocaleString('fa-IR')} نفر دنبالت کردن!`; } },
      { label: 'بی‌خیال، خجالت می‌کشم', do: () => 'گوشی رو گذاشتی کنار.' },
    ],
  },
  {
    id: 't_hair', age: [13, 18], emoji: '💈', title: 'مدل مو', when: (c) => c.male || !!c.rel('mother'),
    text: (c) => (c.male ? 'می‌خوای موهات رو مدل «فشن» بزنی ولی مدرسه گیر می‌ده.' : 'می‌خوای موهات رو رنگ کنی ولی مامانت مخالفه.'),
    choices: [
      { label: 'می‌زنم! هر چی بشه', do: (c) => { c.looks(3).happy(5); if (c.chance(0.4)) { c.rep(-3); return c.male ? 'ناظم با ماشین اصلاح نصف موهات رو زد!' : 'مامانت سه روز باهات حرف نزد!'; } return 'خیلی بهت میاد! همه تحویلت گرفتن.'; } },
      { label: 'بی‌خیال', do: (c) => { c.rep(1); return 'همون مدل همیشگی موندی.'; } },
    ],
  },
  {
    id: 't_best_friend', age: [12, 18], emoji: '🤝', text: '',
    when: (c) => c.rels('friend').length < 3,
    auto: (c) => {
      const n = c.addPerson({ rel: 'friend', gender: c.L.gender, born: c.L.year - c.age + c.int(-1, 1), close: c.int(65, 85), met: 'مدرسه' });
      c.happy(6);
      return `🤝 با ${n.first} تو مدرسه رفیق صمیمی شدی. همه جا با همین!`;
    },
    kind: 'good',
  },
  {
    id: 't_driving_lessons', age: [17, 19], emoji: '🚗', title: 'رانندگی با ماشین بابا',
    when: (c) => !!c.rel('father'),
    text: 'بابات قبول کرده تو کوچه بهت رانندگی یاد بده.',
    choices: [
      { label: 'با اعتماد به نفس گاز می‌دم', do: (c) => { if (c.chance(0.3)) { const d = c.rel('father')!; c.close(d, -5); return 'ماشین رو کوبوندی به سطل آشغال شهرداری! بابات دستش رو گذاشت رو قلبش.'; } c.happy(4); c.flag('drivePractice'); return 'خیلی خوب رانندگی کردی! بابات گفت «بد نبود».'; } },
      { label: 'آروم و با احتیاط', do: (c) => { c.happy(2); c.flag('drivePractice'); const d = c.rel('father'); if (d) c.close(d, 5); return 'با سرعت ده کیلومتر کل کوچه رو رفتی. بابات خوابش برد!'; } },
    ],
  },
  {
    id: 't_mosque_cleanup', age: [12, 18], emoji: '🧹', text: '', w: 0.4,
    auto: (c) => { c.rep(3).happy(2); return '🧹 با بچه‌های محل پارک محله رو تمیز کردین. شهرداری بهتون لوح تقدیر داد!'; },
    kind: 'good',
  },
  {
    id: 't_runaway_thought', age: [14, 18], emoji: '🎸', title: 'رؤیای گروه موسیقی',
    when: (c) => c.count('music') >= 2 || c.trait('singer'),
    text: 'با رفقات می‌خواین یه گروه موسیقی راه بندازین!',
    choices: [
      { label: 'آره! تو زیرزمین تمرین می‌کنیم', do: (c) => { c.happy(8); c.flag('band'); if (c.chance(0.3)) { c.L.followers += c.int(1000, 20000); return 'یه اجرا گذاشتین تو اینستاگرام و کلی دیده شد!'; } return 'همسایه‌ها از صدای درام شاکی شدن ولی خیلی خوش گذشت!'; } },
      { label: 'نه، وقت ندارم', do: () => 'رؤیا رو گذاشتی برای بعد.' },
    ],
  },
  {
    id: 't_perfect_report', age: [8, 18], emoji: '💯', text: '', w: 0.4,
    when: (c) => c.L.edu.stage === 'school' && c.L.edu.gpa >= 19.75,
    auto: (c) => { c.happy(6).rep(5); return '💯 اسمت رو تابلوی شاگرد اول‌های مدرسه نوشتن! مامانت عکسش رو گذاشت تو گروه فامیلی.'; },
    kind: 'good',
  },
  {
    id: 't_sport_champ', age: [13, 18], emoji: '🏅', w: 0.5,
    when: (c) => c.has('sport_kid') || c.trait('athlete'),
    title: 'مسابقات',
    text: 'تیم مدرسه‌تون به فینال مسابقات استانی رسیده و تو بازیکن اصلی هستی.',
    choices: [
      { label: 'همه‌ی تلاشم رو می‌کنم', do: (c) => { if (c.lucky(0.5)) { c.happy(12).rep(6); c.flag('champion'); return 'قهرمان استان شدین! عکست تو روزنامه‌ی محلی چاپ شد.'; } c.happy(-4); return 'تو پنالتی‌ها باختین. ولی همه گفتن بهترین بازیکن زمین بودی.'; } },
    ],
  },
  {
    id: 't_gaming_addict', age: [12, 19], emoji: '🕹️', text: '', w: 0.6,
    auto: (c) => { c.L.edu.effort -= 1; c.happy(3).health(-2); return '🕹️ معتاد یه بازی آنلاین شدی و هر شب تا ۳ صبح بازی می‌کنی!'; },
    kind: 'bad',
  },
  {
    id: 't_sampad_rival', age: [13, 18], emoji: '🤓', text: '', w: 0.4,
    when: (c) => c.L.edu.school === 'sampad',
    auto: (c) => { c.happy(-3); c.L.edu.effort += 0.5; return '🤓 تو تیزهوشان همه نابغه‌ان و تو اول بودن دیگه به این راحتی‌ها نیست!'; },
  },
  {
    id: 't_first_salary_gift', age: [16, 19], emoji: '🎁', text: '', w: 0.3,
    when: (c) => !!c.L.job,
    auto: (c) => { for (const p of c.parents) c.close(p, 8); c.happy(5); return '🎁 با اولین حقوقت برای مامان و بابات کادو خریدی. مامانت گریه کرد!'; },
    kind: 'good',
  },
  {
    id: 't_award_rank', age: [18, 19], emoji: '📰', text: '', w: 5,
    when: (c) => (c.L.edu.konkur?.rank ?? 1e9) <= 10 && !c.has('rank_interview'),
    auto: (c) => { c.flag('rank_interview'); c.rep(15); award(c, 'konkur10'); return '📰 خبرگزاری‌ها باهات مصاحبه کردن: «رتبه‌ی برتر کنکور: روزی ۱۲ ساعت درس می‌خوندم و از کلاس کنکور استفاده نکردم!»'; },
    kind: 'big',
  },
]);
