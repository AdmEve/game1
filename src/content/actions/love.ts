import { award } from '../../engine/achieve';
import { clamp, type Ctx } from '../../engine/ctx';
import { fa, money } from '../../engine/fmt';
import { defActions, defEvents, type ChoiceDef } from '../../engine/registry';
import type { Gender, Npc } from '../../engine/types';
import { sendJail } from '../events/milestones';

/** A possible spouse, kept in the event parameters until a decision is made. */
interface Candidate {
  first: string;
  last: string;
  gender: Gender;
  age: number;
  job: string;
  rich: number;
  looks: number;
  smarts: number;
  trait: string;
  via: string;
}

const CAND_TRAITS = ['مهربون', 'خوش‌اخلاق', 'شوخ‌طبع', 'جدی', 'کمی حسود', 'خیلی مذهبی', 'اهل سفر', 'آشپز ماهر', 'ورزشکار', 'کتاب‌خون', 'اهل مهمونی', 'کم‌حرف'];
const CAND_JOBS_M = ['مهندس', 'کارمند بانک', 'دکتر', 'معلم', 'بازاری', 'برنامه‌نویس', 'راننده', 'مغازه‌دار', 'بیکار (ولی باباش پولداره)', 'کارمند', 'وکیل', 'دانشجوی دکترا'];
const CAND_JOBS_F = ['معلم', 'پرستار', 'دانشجو', 'گرافیست', 'کارمند', 'دکتر', 'خانه‌دار', 'برنامه‌نویس', 'آرایشگر', 'وکیل', 'معمار', 'حسابدار'];

function makeCandidate(c: Ctx, via: string): Candidate {
  const g: Gender = c.male ? 'f' : 'm';
  const myAge = c.age;
  const age = clamp(myAge + (c.male ? -c.int(0, 7) : c.int(0, 8)), 18, 80);
  return {
    first: c.randomFirst(g),
    last: c.randomLast(),
    gender: g,
    age,
    job: c.pick(g === 'm' ? CAND_JOBS_M : CAND_JOBS_F),
    rich: c.rng.weighted([0, 1, 2, 3, 4], (k) => [12, 30, 35, 18, 5][k])!,
    looks: clamp(c.int(20, 95)),
    smarts: clamp(c.int(20, 95)),
    trait: c.pick(CAND_TRAITS),
    via,
  };
}

function candLine(k: Candidate): string {
  return `${k.first} ${k.last}، ${fa(k.age)} ساله، ${k.job}، ${k.trait}. ${k.looks > 75 ? 'خیلی خوشگل/خوشتیپه.' : ''}`;
}

const single = (c: Ctx) => !c.rel('spouse') && !c.rel('fiance');

defActions([
  {
    id: 'khastegari', group: 'love', emoji: '💐', limit: 1,
    label: (c) => (c.male ? 'رفتن به خواستگاری' : 'خواستگار پذیرفتن'),
    desc: 'مامانت چند نفر رو در نظر داره!',
    when: (c) => c.age >= 20 && single(c) && !c.L.prison,
    do: (c) => {
      const list = [makeCandidate(c, 'معرفی مامان'), makeCandidate(c, 'فامیل'), makeCandidate(c, c.L.job ? 'همکار' : 'همسایه')];
      c.queue('pick_candidate', { list: list as unknown as Record<string, unknown> });
      return c.male ? 'مامانت دفترچه‌ی تلفنش رو درآورد…' : 'چند تا خواستگار در خونه رو زدن…';
    },
  },
  {
    id: 'date_app', group: 'love', emoji: '💬',
    label: 'آشنایی (همکار، هم‌دانشگاهی، دوست مشترک)',
    when: (c) => c.age >= 18 && single(c) && !c.L.prison,
    do: (c) => {
      const via = c.L.edu.stage === 'uni' ? 'هم‌دانشگاهی' : c.L.job ? 'همکار' : 'دوست مشترک';
      const k = makeCandidate(c, via);
      if (c.lucky(0.35 + c.s('looks') / 250 + (c.trait('charming') ? 0.15 : 0))) {
        c.queue('pick_candidate', { list: [k] as unknown as Record<string, unknown>, crush: 1 });
        c.happy(5);
        return `با ${k.first} (${via}) آشنا شدی. انگار یه حسی بینتون هست…`;
      }
      c.happy(-3);
      return c.pick(['یه نفر رو دیدی ولی گفت «من فعلاً قصد ازدواج ندارم».', 'یه قرار کافه گذاشتی ولی طرف اصلاً نیومد!', 'با یکی آشنا شدی ولی معلوم شد نامزد داره.']);
    },
  },
  {
    id: 'wedding', group: 'love', emoji: '💒',
    label: 'برگزاری عروسی',
    when: (c) => !!c.rel('fiance'),
    do: (c) => {
      c.queue('wedding');
      return 'وقت تعیین تاریخ عروسیه!';
    },
  },
  {
    id: 'baby', group: 'love', emoji: '🍼',
    label: 'بچه‌دار شدن',
    when: (c) => !!c.spouse && c.age <= (c.male ? 60 : 45) && c.ageOf(c.spouse!) <= 48 && !c.L.prison,
    off: (c) => (c.kids.some((k) => c.ageOf(k) < 1) ? 'تازه بچه‌دار شدی!' : false),
    confirm: 'مطمئنی؟ بچه یعنی خرج بیشتر و خواب کمتر!',
    do: (c) => {
      const sp = c.spouse!;
      const momAge = c.female ? c.age : c.ageOf(sp);
      if (!c.lucky(clamp(0.85 - Math.max(0, momAge - 32) * 0.05, 0.1, 0.9))) {
        c.happy(-5);
        return 'هنوز خبری نشده. دکتر گفت «صبور باشید».';
      }
      const twins = c.chance(0.03);
      const born: Npc[] = [];
      for (let i = 0; i < (twins ? 2 : 1); i++) {
        const g: Gender = c.chance(0.5) ? 'm' : 'f';
        born.push(c.addPerson({ rel: 'child', gender: g, born: c.L.year, last: c.male ? c.L.last : sp.last, close: 90, other: sp.id, smarts: clamp(Math.round((c.s('smarts') + (sp.smarts ?? 50)) / 2 + c.int(-15, 15))), looks: clamp(Math.round((c.s('looks') + (sp.looks ?? 50)) / 2 + c.int(-15, 15))) }));
      }
      if (twins) award(c, 'twins');
      c.happy(20).rep(3);
      c.close(sp, 10);
      return twins ? `دوقلو! ${born.map((b) => b.first).join(' و ')} به دنیا اومدن!` : `${born[0].gender === 'm' ? 'پسرت' : 'دخترت'} ${born[0].first} به دنیا اومد! ${c.male ? 'بابا' : 'مامان'} شدی!`;
    },
  },
  {
    id: 'divorce', group: 'love', emoji: '💔',
    label: 'طلاق',
    confirm: 'مطمئنی می‌خوای جدا شی؟',
    when: (c) => !!c.spouse && !c.L.prison,
    do: (c) => {
      const sp = c.spouse!;
      sp.rel = 'ex';
      c.flag('divorced');
      award(c, 'divorce');
      c.happy(-10).rep(-6);
      const mehr = c.L.mehr ?? 0;
      c.L.mehr = undefined;
      if (c.L.home === 'own' && c.female) c.L.home = 'parents';
      if (c.male && mehr > 0) {
        const owed = Math.round(mehr * c.L.econ.coin);
        c.queue('mehr_claim', { coins: mehr, owed });
        return `از ${sp.first} جدا شدی. ${sp.first} مهریه‌اش (${fa(mehr)} سکه) رو اجرا گذاشت!`;
      }
      if (c.female && mehr > 0) {
        const got = Math.round(Math.min(mehr, c.int(5, 40)) * c.L.econ.coin);
        c.money(got);
        return `از ${sp.first} جدا شدی و بخشی از مهریه‌ات (${money(got)}) رو گرفتی.`;
      }
      return `از ${sp.first} جدا شدی.`;
    },
  },
]);

function mehrOptions(c: Ctx, k: Candidate): ChoiceDef[] {
  const opts = [14, 114, 313, 1404];
  return opts.map((n) => ({
    label: `${fa(n)} سکه${n === 14 ? ' (به نیت ۱۴ معصوم)' : n === 114 ? ' (به تعداد سوره‌های قرآن)' : n === 1404 ? ' (به سال تولد عروس!)' : ''}`,
    note: `ارزش امروز: ${money(n * c.L.econ.coin)}`,
    do: (c2: Ctx) => {
      // The other family likes a bigger mehr; you carry the risk.
      const want = 30 + k.rich * 60 + (k.looks > 75 ? 60 : 0);
      const accepted = c2.male ? n >= want * 0.5 || c2.lucky(0.4) : true;
      if (!accepted) {
        c2.happy(-8);
        return `خانواده‌ی ${k.first} گفتن «دختر ما رو با ${fa(n)} سکه می‌خواین؟!» و جواب منفی دادن.`;
      }
      const n2 = c2.addPerson({ flags: { since: c2.L.year }, rel: 'fiance', gender: k.gender, born: c2.L.year - k.age, first: k.first, last: k.last, close: 75, job: k.job, rich: k.rich, looks: k.looks, smarts: k.smarts, traits: [k.trait], met: k.via });
      c2.L.mehr = n;
      c2.L.flags.mehrMax = Math.max(c2.L.flags.mehrMax ?? 0, n);
      c2.happy(15).rep(4);
      return `مهریه ${fa(n)} سکه تعیین شد و با ${n2.first} عقد کردین! حالا نامزدین. (از تب «عشق» عروسی بگیرین)`;
    },
  }));
}

defEvents([
  {
    id: 'pick_candidate',
    milestone: true,
    emoji: '💐',
    title: 'خواستگاری',
    text: (c) => {
      const list = c.p.list as unknown as Candidate[];
      return c.p.crush ? `${candLine(list[0])}\nمی‌خوای جلو بری؟` : `این‌ها گزینه‌هان:\n${list.map((k, i) => `${fa(i + 1)}. ${candLine(k)}`).join('\n')}`;
    },
    dyn: (c) => {
      const list = c.p.list as unknown as Candidate[];
      const out: ChoiceDef[] = list.map((k) => ({
        label: `${c.male ? 'خواستگاری از' : 'جواب مثبت به'} ${k.first} (${k.job})`,
        do: (c2: Ctx) => {
          c2.queue('khastegari_session', { k: k as unknown as Record<string, unknown> });
          return c2.male ? `با یه دسته گل و جعبه‌ی شیرینی رفتین خونه‌ی ${k.first} اینا.` : `${k.first} و خانواده‌اش اومدن خونه‌تون.`;
        },
      }));
      out.push({ label: 'هیچ‌کدوم! فعلاً مجردم', do: (c2) => { c2.happy(1); const m = c2.rel('mother'); if (m) c2.close(m, -3); return 'گفتی فعلاً قصد ازدواج نداری. مامانت آه کشید.'; } });
      return out;
    },
  },
  {
    id: 'khastegari_session',
    milestone: true,
    emoji: '🫖',
    title: 'جلسه‌ی خواستگاری',
    text: (c) => {
      const k = c.p.k as unknown as Candidate;
      return c.male
        ? `نشستین تو پذیرایی. ${k.first} با سینی چای اومد. باباش پرسید «خب آقا ${c.name}، شغلت چیه و چقدر درآمد داری؟»`
        : `${k.first} با یه دسته گل بزرگ اومده. مامانش پرسید «${c.name} خانم آشپزی بلدی؟»`;
    },
    dyn: (c) => {
      const k = c.p.k as unknown as Candidate;
      const decide = (c2: Ctx, bonus: number) => {
        const score = c2.s('looks') / 200 + c2.s('rep') / 250 + (c2.L.job ? 0.15 : -0.1) + (c2.L.assets.some((a) => a.kind === 'house') ? 0.15 : 0) + (c2.L.assets.some((a) => a.kind === 'car') ? 0.05 : 0) + bonus - k.rich * 0.05;
        return c2.lucky(clamp(0.3 + score, 0.08, 0.92));
      };
      return [
        {
          label: c.male ? 'راستش رو می‌گم' : 'آره، قورمه‌سبزی‌ام معروفه!',
          do: (c2: Ctx) => {
            if (!decide(c2, 0.1)) { c2.happy(-8); return `بعد از سه روز زنگ زدن گفتن «قسمت نیست».`; }
            c2.queue('mehr_talk', { k: k as unknown as Record<string, unknown> });
            return 'جلسه خوب پیش رفت و جواب مثبت دادن! حالا نوبت صحبت سر مهریه‌ست.';
          },
        },
        {
          label: c.male ? 'یه کم اغراق می‌کنم (خونه و ماشین دارم!)' : 'می‌گم آشپزیم عالیه (دروغ)',
          do: (c2: Ctx) => {
            if (!decide(c2, 0.2)) { c2.happy(-8); return 'یکی از فامیل‌هاشون می‌شناختت و دستت رو شد! جواب منفی دادن.'; }
            c2.flag('lied_khastegari');
            c2.queue('mehr_talk', { k: k as unknown as Record<string, unknown> });
            return 'خوششون اومد و جواب مثبت دادن! (امیدوارم بعداً دستت رو نشه…)';
          },
        },
        {
          label: 'شعر حافظ می‌خونم',
          do: (c2: Ctx) => {
            if (!decide(c2, c2.s('smarts') > 60 ? 0.15 : -0.05)) { c2.happy(-6); return 'فکر کردن یه کم عجیبی. جواب منفی دادن.'; }
            c2.queue('mehr_talk', { k: k as unknown as Record<string, unknown> });
            return `«الا یا ایها الساقی…» خوندی و ${k.first} لبخند زد. جواب مثبت!`;
          },
        },
      ];
    },
  },
  {
    id: 'mehr_talk',
    milestone: true,
    emoji: '🪙',
    title: 'مهریه',
    text: (c) => {
      const k = c.p.k as unknown as Candidate;
      return c.male ? `بزرگ‌ترها نشستن سر مهریه. خانواده‌ی ${k.first} منتظرن. چند سکه پیشنهاد می‌دی؟` : `خانواده‌ی ${k.first} منتظرن ببینن مهریه‌ات چند سکه‌ست.`;
    },
    dyn: (c) => mehrOptions(c, c.p.k as unknown as Candidate),
  },
  {
    id: 'wedding',
    milestone: true,
    emoji: '💒',
    title: 'عروسی',
    when: (c) => !!c.rel('fiance'),
    text: (c) => `${c.rel('fiance')?.first} و تو یه ساله نامزدین و خانواده‌ها می‌گن «پس عروسی کِی؟» چه جور عروسی‌ای می‌گیرین؟`,
    choices: [
      { label: 'تالار لاکچری با ۵۰۰ مهمون', cost: (c) => c.price(2.5e9), note: (c) => money(c.price(2.5e9)), do: (c) => marry(c, 15, 10, 'یه عروسی شاهانه گرفتین که تا سال‌ها فامیل ازش حرف می‌زنن!') },
      {
        label: 'خانواده‌ها خرج عروسی رو می‌دن',
        when: (c) => c.parents.length > 0 && (c.L.flags.rich ?? 2) >= 2,
        do: (c) => marry(c, 10, 5, 'خانواده‌ها خرج عروسی رو دادن و یه عروسی آبرومند گرفتین. فقط باید به همه‌ی سلیقه‌هاشون احترام می‌ذاشتی!'),
      },
      { label: 'تالار معمولی', cost: (c) => c.price(700e6), note: (c) => money(c.price(700e6)), do: (c) => marry(c, 10, 4, 'یه عروسی گرم و صمیمی تو تالار گرفتین. ساعت ۱۲ شب هنوز می‌رقصیدن!') },
      { label: 'جشن کوچیک خونگی', cost: (c) => c.price(120e6), note: (c) => money(c.price(120e6)), do: (c) => marry(c, 6, 0, 'یه جشن کوچیک تو حیاط خونه‌ی مادربزرگ گرفتین.') },
      {
        label: 'نامزدی رو به هم می‌زنم',
        do: (c) => {
          const f = c.rel('fiance')!;
          f.rel = 'ex';
          c.happy(-12).rep(-5);
          if (c.male && c.L.mehr) { const half = Math.round((c.L.mehr / 2) * c.L.econ.coin); c.L.mehr = undefined; c.queue('mehr_claim', { coins: Math.round(c.L.flags.mehrMax / 2), owed: half }); return `نامزدی با ${f.first} به هم خورد. چون عقد کرده بودین، نصف مهریه رو باید بدی!`; }
          c.L.mehr = undefined;
          return `نامزدی با ${f.first} به هم خورد. فامیل تا یه سال درباره‌اش پچ‌پچ کردن.`;
        },
      },
      { label: 'یه عقد ساده تو محضر', do: (c) => marry(c, 4, -2, 'یه عقد ساده تو محضر گرفتین و با خانواده‌ها رفتین رستوران. ساده ولی دلنشین!') },
      { label: 'فقط ماه عسل (کیش)', cost: (c) => c.price(200e6), note: (c) => money(c.price(200e6)), do: (c) => marry(c, 8, -3, 'عروسی نگرفتین و رفتین کیش. عمه‌ات هنوز ناراحته!') },
    ],
  },
  {
    id: 'mehr_claim',
    milestone: true,
    emoji: '⚖️',
    title: 'اجرای مهریه',
    text: (c) => `دادگاه حکم داده ${fa(c.p.coins as number)} سکه (${money(c.p.owed as number)}) مهریه رو بدی.`,
    choices: [
      { label: 'نقد می‌دم', cost: (c) => c.p.owed as number, do: (c) => { c.happy(-5); return 'مهریه رو یکجا دادی و خلاص!'; } },
      {
        label: 'تقسیط می‌کنم',
        do: (c) => {
          const owed = c.p.owed as number;
          c.L.loans.push({ id: c.L.nextId++, name: 'اقساط مهریه', left: owed, yearly: Math.max(Math.round(owed / 20), Math.round(c.L.econ.wage * 6)), rate: 0 });
          c.happy(-8);
          return 'دادگاه مهریه رو قسطی کرد. تا سال‌ها قسط می‌دی!';
        },
      },
      {
        label: 'نمی‌دم!',
        do: (c) => {
          if (c.lucky(0.3)) return 'طرف بی‌خیال شد. شانس آوردی!';
          if (c.chance(0.4)) {
            const owed = c.p.owed as number;
            c.L.loans.push({ id: c.L.nextId++, name: 'اقساط مهریه', left: owed, yearly: Math.max(Math.round(owed / 20), Math.round(c.L.econ.wage * 6)), rate: 0 });
            c.happy(-8);
            return 'دادگاه حکم داد مهریه رو قسطی بدی. فرار از مهریه نشد!';
          }
          sendJail(c, 2, 'مهریه');
          award(c, 'mehrprison');
          return 'به خاطر مهریه رفتی زندان!';
        },
      },
    ],
  },
]);

function marry(c: Ctx, happy: number, rep: number, text: string): string {
  const f = c.rel('fiance');
  if (!f) return text;
  f.rel = 'spouse';
  f.close = clamp(f.close + 10);
  c.flag('married');
  if (c.L.flags.marriedAge === undefined) c.L.flags.marriedAge = c.age;
  if ((c.L.mehr ?? 0) >= 1404) award(c, 'mehr1404');
  c.happy(happy).rep(rep);
  if (c.L.home === 'parents' || c.L.home === 'dorm') c.L.home = c.L.assets.some((a) => a.kind === 'house') ? 'own' : 'rent';
  return `${text} حالا ${f.first} ${c.male ? 'خانومت' : 'همسرت'}ه. 💍`;
}

