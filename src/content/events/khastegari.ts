/** «جلسه‌ی خواستگاری»: three questions from the other family while a meter shows how much they like you. */
import { clamp, type Ctx } from '../../engine/ctx';
import { money } from '../../engine/fmt';
import type { ChoiceDef } from '../../engine/registry';
import { answerChoices, askable, type Question as Q } from '../talk';
import { majorName } from '../edu';
import { jobById } from '../jobs';
import { salaryOf } from '../../engine/year';

/** The person you are meeting (see love.ts). */
export interface Cand {
  first: string;
  rich: number;
  trait: string;
}

interface Question extends Q<Cand> {
  /** Asked of a groom (m), a bride (f) or anyone. */
  g: 'm' | 'f' | 'any';
  who: 'father' | 'mother' | 'aunt';
}

const modern = (k: Cand) => ['اهل سفر', 'کتاب‌خون', 'اهل مهمونی', 'شوخ‌طبع'].includes(k.trait);
const religious = (k: Cand) => k.trait === 'خیلی مذهبی';
const jobTitle = (c: Ctx) => (c.L.job ? jobById(c.L.job.id)?.levels[c.L.job.level] ?? 'کارمند' : '');

const QUESTIONS: Question[] = [
  {
    id: 'job', g: 'm', who: 'father',
    q: (c) => `خب آقا ${c.name}، شغلت چیه و ماهی چقدر درمیاری؟`,
    a: [
      {
        label: (c) => `${jobTitle(c)} هستم، ماهی ${money(salaryOf(c.L))}`,
        when: (c) => !!c.L.job,
        d: (c) => clamp((salaryOf(c.L) / c.wage - 1) * 12, -6, 22) + 6,
        react: (c) => (salaryOf(c.L) > c.wage * 2 ? 'باباش ابروهاش رفت بالا و یه شیرینی دیگه تعارفت کرد!' : 'باباش گفت «خدا برکت بده، کار عیب نیست.»'),
      },
      { label: 'فعلاً دنبال کارم…', when: (c) => !c.L.job, d: () => -14, react: 'مامانش یه نگاه معنی‌دار به باباش انداخت.' },
      { label: 'یه شرکت دارم، ماهی صد میلیون!', d: () => 16, react: 'باباش گفت «به‌به! ماشالله!» و چاییت رو عوض کرد.', lie: 0.3 },
      { label: 'پول مهم نیست، عشق مهمه!', d: (_c, k) => (modern(k) ? 4 : -10), react: (_c, k) => (modern(k) ? `${k.first} خندید. باباش نه.` : 'چایی پرید تو گلوی باباش!') },
    ],
  },
  {
    id: 'cook', g: 'f', who: 'mother',
    q: (c) => `${c.name} خانم، آشپزی بلدی؟`,
    a: [
      { label: 'قورمه‌سبزی‌ام معروفه!', when: (c) => c.trait('foodie'), d: () => 14, react: 'مادرشوهرت گفت «ای جانم! پس پسرم دیگه لاغر نمی‌مونه!»' },
      { label: 'یه چیزایی بلدم، بقیه‌اش رو یاد می‌گیرم', d: () => 5, react: 'مادرشوهرت گفت «خودم یادت می‌دم عزیزم.»' },
      { label: 'همه‌چی بلدم! حتی فسنجون!', when: (c) => !c.trait('foodie'), d: () => 12, react: 'مادرشوهرت ذوق کرد و گفت «پس شب یلدا خونه‌ی شما!»', lie: 0.25 },
      { label: 'آشپزی کار هر دومونه!', d: (_c, k) => (modern(k) ? 10 : religious(k) ? -12 : -5), react: (_c, k) => (modern(k) ? `${k.first} گفت «دقیقاً!» و مامانش لبخند زورکی زد.` : 'مادرشوهرت یه «اِ» گفت که تا ته دلت رفت.') },
    ],
  },
  {
    id: 'house', g: 'm', who: 'mother',
    q: () => 'خونه از خودت داری یا اجاره‌نشینی؟',
    a: [
      { label: 'خونه‌ی خودمه', when: (c) => c.L.assets.some((a) => a.kind === 'house'), d: () => 16, react: 'مامانش گفت «چه خوب! سقف بالای سرتون باشه، بقیه‌اش درست می‌شه.»' },
      { label: 'فعلاً اجاره‌نشینم', when: (c) => !c.L.assets.some((a) => a.kind === 'house') && c.L.home !== 'parents', d: () => -4, react: 'مامانش آه کشید: «این روزها همه اجاره‌نشینن…»' },
      { label: 'فعلاً پیش بابا اینام', when: (c) => c.L.home === 'parents', d: () => -9, react: 'خاله‌اش زیر لب گفت «لابد طبقه‌ی بالای مادرشوهر!»' },
      { label: 'یه آپارتمان دارم، فقط یه کم قسط داره', when: (c) => !c.L.assets.some((a) => a.kind === 'house'), d: () => 10, react: 'مامانش گفت «چه پسر زرنگی!»', lie: 0.3 },
    ],
  },
  {
    id: 'military', g: 'm', who: 'father', when: (c) => c.L.country === 'ir',
    q: () => 'کارت پایان خدمت داری؟',
    a: [
      { label: 'بله، سربازیم تموم شده', when: (c) => c.L.mil.status === 'done', d: () => 9, react: 'باباش گفت «آفرین! مرد باید سربازی بره.»' },
      { label: 'معافم', when: (c) => c.L.mil.status === 'exempt', d: () => 5, react: 'باباش سری تکون داد.' },
      { label: 'خریدمش!', when: (c) => c.L.mil.status === 'bought', d: () => 3, react: 'باباش گفت «پس پولش رو داری…»' },
      { label: 'معافیت تحصیلی دارم', when: (c) => c.L.mil.status === 'deferred', d: () => -2, react: 'باباش گفت «بالاخره که باید بری…»' },
      { label: 'راستش… غایبم', when: (c) => c.L.mil.status === 'absent' || c.L.mil.status === 'due', d: () => -14, react: 'باباش گفت «پس با این وضع چطوری می‌خوای پاسپورت بگیری و ماه‌عسل ببریش؟!»' },
      { label: 'معافم!', when: (c) => c.L.mil.status === 'absent' || c.L.mil.status === 'due', d: () => 5, react: 'باباش گفت «خوبه، خوبه.»', lie: 0.35 },
    ],
  },
  {
    id: 'study', g: 'any', who: 'aunt',
    q: () => 'چی خوندی؟',
    a: [
      {
        label: (c) => {
          const d = c.L.edu.degrees.filter((x) => x.kind !== 'diploma').pop()!;
          return `${majorName(d.major)} از ${d.uni}`;
        },
        when: (c) => c.L.edu.degrees.some((x) => x.kind !== 'diploma'),
        d: (c) => {
          const d = c.L.edu.degrees.filter((x) => x.kind !== 'diploma').pop()!;
          return d.major === 'med' ? 18 : d.tier <= 1 ? 12 : 6;
        },
        react: (c) => (c.L.edu.degrees.some((x) => x.major === 'med') ? 'خاله‌اش جیغ کشید: «وای! دکتر!» و رفت به همه زنگ زد.' : 'خاله‌اش گفت «ماشالله، تحصیل‌کرده‌ست!»'),
      },
      { label: 'دانشگاه زندگی!', d: (c) => (c.trait('charming') ? 6 : -7), react: (c) => (c.trait('charming') ? 'همه خندیدن. خاله‌اش گفت «چه بانمکه!»' : 'خاله‌اش گفت «یعنی دیپلم؟» و نگاهش سرد شد.') },
      { label: 'دکترای افتخاری دارم!', when: (c) => !c.L.edu.degrees.some((x) => x.kind !== 'diploma'), d: () => 9, react: 'خاله‌اش گفت «وای! از کجا؟» و تو گفتی «از… خارج!»', lie: 0.4 },
    ],
  },
  {
    id: 'smoke', g: 'any', who: 'father',
    q: () => 'سیگار که نمی‌کشی؟',
    a: [
      { label: 'نه، اهل ورزشم', when: (c) => !c.has('smoker'), d: () => 5, react: 'باباش گفت «خوبه، خوبه.»' },
      { label: 'راستش… می‌کشم. ولی ترک می‌کنم!', when: (c) => c.has('smoker'), d: () => -8, react: 'باباش گفت «حداقل راستگویی.»' },
      { label: 'نه، اصلاً!', when: (c) => c.has('smoker'), d: () => 4, react: 'باباش گفت «آفرین.»', lie: 0.45 },
    ],
  },
  {
    id: 'future', g: 'any', who: 'mother',
    q: () => 'برای آینده چه برنامه‌ای داری؟',
    a: [
      { label: 'می‌خوایم مهاجرت کنیم', d: (_c, k) => (k.trait === 'اهل سفر' ? 12 : religious(k) ? -12 : -6), react: (c, k) => (k.trait === 'اهل سفر' ? `چشم‌های ${k.first} برق زد!` : `مامانش گفت «یعنی ${c.g('دخترم', 'پسرم')} رو ببری اون سر دنیا؟!»`) },
      { label: 'همین‌جا، نزدیک خانواده', d: () => 8, react: 'مامانش با لبخند گفت «جمعه‌ها ناهار پیش ما!»' },
      { label: 'می‌خوام کار خودم رو راه بندازم', d: (c) => (c.L.job ? 6 : -3), react: 'باباش گفت «کار آزاد ریسکه ها!»' },
    ],
  },
  {
    id: 'kids', g: 'f', who: 'mother',
    q: () => 'چند تا بچه دوست داری؟',
    a: [
      { label: 'دو تا', d: () => 8, react: 'مادرشوهرت گفت «یه دختر، یه پسر، ان‌شاءالله!»' },
      { label: 'یه تیم فوتبال!', d: () => 4, react: 'همه خندیدن. پدرشوهرت گفت «من دروازه‌بانم!»' },
      { label: 'فعلاً به بچه فکر نمی‌کنم', d: (_c, k) => (modern(k) ? 2 : -9), react: 'مادرشوهرت گفت «ما که پیر شدیم و نوه ندیدیم!»' },
    ],
  },
  {
    id: 'upstairs', g: 'f', who: 'mother',
    q: () => 'طبقه‌ی بالای ما خالیه. حاضری اون‌جا زندگی کنید؟',
    a: [
      { label: 'چرا که نه!', d: () => 12, react: 'مادرشوهرت گفت «قربونت برم! کلیدش رو همین الان می‌دم.»' },
      { label: 'ترجیح می‌دم مستقل باشیم', d: (_c, k) => (modern(k) ? 4 : -8), react: (_c, k) => `${k.first} یواشکی بهت چشمک زد. مامانش نه.` },
      { label: 'باید فکر کنم…', d: () => 0, react: 'مادرشوهرت گفت «فکر کن عزیزم، فکر کن.»' },
    ],
  },
  {
    id: 'jahiz', g: 'f', who: 'aunt',
    q: () => 'جهیزیه‌ات آماده‌ست؟',
    a: [
      { label: 'همه‌چی، از یخچال ساید تا فرش دستباف', when: (c) => (c.L.flags.rich ?? 2) >= 3, d: () => 12, react: 'خاله‌اش گفت «ماشالله، چه خانواده‌ای!»' },
      { label: 'کم‌کم داریم می‌خریم', d: () => 2, react: 'خاله‌اش گفت «خوبه، با این قیمت‌ها…»' },
      { label: 'مگه قرن چندمه؟!', d: (_c, k) => (modern(k) ? 8 : -10), react: (_c, k) => (modern(k) ? `${k.first} از خنده ریسه رفت.` : 'خاله‌اش استکانش رو محکم گذاشت رو میز.') },
    ],
  },
  {
    id: 'car', g: 'm', who: 'aunt',
    q: () => 'ماشینت چیه؟',
    a: [
      { label: (c) => c.L.assets.find((a) => a.kind === 'car')!.name, when: (c) => c.L.assets.some((a) => a.kind === 'car'), d: (c) => (/پورشه|بنز|BMW/.test(c.L.assets.find((a) => a.kind === 'car')!.name) ? 14 : 5), react: 'خاله‌اش از پنجره سرک کشید که ماشینت رو ببینه.' },
      { label: 'مترو سوار می‌شم، به خاطر محیط زیست!', when: (c) => !c.L.assets.some((a) => a.kind === 'car'), d: (_c, k) => (modern(k) ? 3 : -6), react: 'خاله‌اش گفت «محیط زیست؟ آهان…»' },
      { label: 'یه سانتافه دارم، دادم تعمیرگاه', when: (c) => !c.L.assets.some((a) => a.kind === 'car'), d: () => 8, react: 'خاله‌اش گفت «اوه، سانتافه!»', lie: 0.35 },
    ],
  },
  {
    id: 'height', g: 'any', who: 'aunt',
    q: (c) => (c.male ? 'ماشالله! قدت چنده؟' : 'ماشالله! چه خوشگلی! رژیم داری؟'),
    a: [
      { label: (c) => (c.male ? '۱۸۰، با کفش!' : 'نه، ژنتیکیه!'), d: (c) => (c.s('looks') >= 60 ? 5 : 1), react: 'خاله‌اش گفت «چشم نخوری!»' },
      { label: 'به اندازه‌ی کافی!', d: (c) => (c.trait('charming') ? 7 : 0), react: (c) => (c.trait('charming') ? 'همه زدن زیر خنده!' : 'خاله‌اش گفت «باشه بابا…»') },
    ],
  },
];

export const ROUNDS = 3;

function asker(k: Cand, who: Question['who']) {
  return who === 'father' ? `بابای ${k.first}` : who === 'mother' ? `مامان ${k.first}` : `خاله‌ی ${k.first}`;
}

/** The family's mood before any question. */
export function startApproval(c: Ctx, k: Cand): number {
  return clamp(45 + (c.s('looks') - 50) / 5 + (c.s('rep') - 50) / 6 - k.rich * 3, 15, 80);
}

export function pickQuestion(c: Ctx, k: Cand, asked: string[]): string {
  if (!asked.length) return c.male ? 'job' : 'cook';
  const pool = QUESTIONS.filter((q) => !asked.includes(q.id) && (q.g === 'any' || q.g === c.L.gender) && askable(c, k, q));
  return c.rng.pick(pool)?.id ?? 'height';
}

export function questionText(c: Ctx, k: Cand, qid: string): string {
  const q = QUESTIONS.find((x) => x.id === qid)!;
  return `${asker(k, q.who)} پرسید: «${q.q(c, k)}»`;
}

/** Answers; `after` gets the approval change and the family's reaction. */
export function answers(c: Ctx, k: Cand, qid: string, after: (c: Ctx, d: number, react: string) => string): ChoiceDef[] {
  return answerChoices(c, k, QUESTIONS.find((x) => x.id === qid)!, 'lied_khastegari', after);
}
