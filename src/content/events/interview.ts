/** «مصاحبه‌ی کاری»: three questions for skilled jobs; the last one is about the salary. */
import { GEM_COST } from '../../config';
import { clamp, type Ctx } from '../../engine/ctx';
import { fa, money } from '../../engine/fmt';
import { hire, jobBlock } from '../../engine/hire';
import { defEvents, type ChoiceDef } from '../../engine/registry';
import { jobById, type JobDef } from '../jobs';
import { answerChoices, askable, type Question } from '../talk';

const ROUNDS = 3;
const charm = (c: Ctx, yes: number, no: number) => (c.trait('charming') ? yes : no);

const QUESTIONS: Question<JobDef>[] = [
  {
    id: 'intro',
    q: () => 'خب، از خودت بگو.',
    a: [
      { label: 'سخت‌کوش و منظمم، عاشق یادگیری‌ام', d: (c) => (c.trait('hardworking') ? 10 : c.trait('lazy') ? -2 : 4), react: (c) => (c.trait('lazy') ? 'مصاحبه‌گر به ساعت دیر رسیدنت نگاه کرد و چیزی نگفت.' : 'مصاحبه‌گر سر تکون داد و یه چیزی یادداشت کرد.') },
      { label: 'همه‌چی رو تو رزومه‌ام نوشتم دیگه', d: () => -8, react: 'مصاحبه‌گر عینکش رو درآورد: «بله، خوندم…»' },
      { label: 'راستش دنبال یه کار با حقوق خوبم!', d: (c) => charm(c, 4, -4), react: (c) => (c.trait('charming') ? 'مصاحبه‌گر خندید: «حداقل رُک هستی!»' : 'مصاحبه‌گر لبخند زورکی زد.') },
    ],
  },
  {
    id: 'weakness',
    q: () => 'بزرگ‌ترین نقطه ضعفت چیه؟',
    a: [
      { label: 'زیادی کمال‌گرام!', d: (c) => c.int(-4, 4), react: 'مصاحبه‌گر: «این رو همه می‌گن!»' },
      { label: 'گاهی دیر از خواب پا می‌شم', d: () => -6, react: 'مصاحبه‌گر یه چیزی تو برگه‌اش خط زد.' },
      { label: 'نقطه ضعف ندارم!', d: () => -7, react: 'مصاحبه‌گر ابروش رو داد بالا.' },
      { label: 'شکلات!', d: (c) => charm(c, 8, -3), react: (c) => (c.trait('charming') ? 'مصاحبه‌گر زد زیر خنده و یه شکلات از کشوش بهت تعارف کرد!' : 'مصاحبه‌گر نخندید.') },
    ],
  },
  {
    id: 'future',
    q: () => 'پنج سال دیگه خودت رو کجا می‌بینی؟',
    a: [
      { label: 'همین‌جا، با مسئولیت بیشتر', d: () => 7, react: 'مصاحبه‌گر راضی به نظر می‌رسید.' },
      { label: 'روی صندلی شما!', d: (c) => charm(c, 6, -6), react: (c) => (c.trait('charming') ? 'مصاحبه‌گر خندید: «اول باید از من رد بشی!»' : 'مصاحبه‌گر صندلیش رو یه کم عقب کشید.') },
      { label: 'راستش… خارج از کشور', when: (c) => c.L.country === 'ir', d: () => -10, react: 'مصاحبه‌گر آه کشید: «همه دارن می‌رن…»' },
    ],
  },
  {
    id: 'why',
    q: () => 'چرا باید شما رو استخدام کنیم؟',
    a: [
      {
        label: 'رشته‌ام دقیقاً همینه',
        when: (c, j) => !!j.majors && c.L.edu.degrees.some((d) => j.majors!.includes(d.major)),
        d: () => 10,
        react: 'مصاحبه‌گر گفت «عالیه، دقیقاً همینو می‌خوایم.»',
      },
      { label: 'چون بهترینم!', d: (c) => (c.s('smarts') >= 70 ? 5 : -4), react: (c) => (c.s('smarts') >= 70 ? 'از جوابات به سؤال‌های فنی معلوم بود راست می‌گی.' : 'مصاحبه‌گر: «همه همینو می‌گن.»') },
      { label: 'چون واقعاً به این کار نیاز دارم', d: (c) => c.int(-4, 6), react: 'مصاحبه‌گر یه لحظه ساکت شد و نگاهت کرد.' },
    ],
  },
  {
    id: 'experience',
    q: () => 'سابقه‌ی کار داری؟',
    a: [
      {
        label: (c) => {
          const last = c.L.career[c.L.career.length - 1];
          return `بله، ${fa(Math.max(1, last.years))} سال ${last.title}`;
        },
        when: (c) => c.L.career.length > 0,
        d: (c) => Math.min(12, 2 + c.L.career.reduce((s, x) => s + x.years, 0) * 2),
        react: 'مصاحبه‌گر گفت «سابقه‌ات خوبه.»',
      },
      { label: 'نه، ولی سریع یاد می‌گیرم', when: (c) => !c.L.career.length, d: (c) => (c.trait('hardworking') ? 4 : -3), react: 'مصاحبه‌گر: «همه‌ی ما یه روزی کار اولمون بوده.»' },
      { label: 'بله، تو یه شرکت بزرگ', when: (c) => !c.L.career.length, d: () => 8, react: 'مصاحبه‌گر گفت «خوبه!»', lie: 0.3 },
    ],
  },
  {
    id: 'overtime',
    q: () => 'با اضافه‌کاری مشکلی نداری؟',
    a: [
      { label: 'نه، تا هر وقت لازم باشه', d: () => 7, react: 'مصاحبه‌گر لبخند زد.' },
      { label: 'اگه اضافه‌کارش رو بدید، نه', d: () => 1, react: 'مصاحبه‌گر: «منطقیه.»' },
      { label: 'ساعت پنج من خونه‌ام!', d: () => -9, react: 'مصاحبه‌گر خودکارش رو گذاشت زمین.' },
    ],
  },
  {
    id: 'salary',
    q: () => 'حقوق درخواستی‌ات چقدره؟',
    a: [
      { label: 'هر چی خودتون صلاح بدونید', d: () => 6, react: 'مصاحبه‌گر خوشحال شد. (شاید زیادی!)', set: { deal: 0.9 } },
      { label: 'حقوق عرف بازار', d: () => 0, react: 'مصاحبه‌گر سر تکون داد.', set: { deal: 1 } },
      { label: 'یه کم بیشتر از عرف، چون ارزشش رو دارم', d: (c) => (c.s('smarts') >= 65 || c.trait('charming') ? 1 : -4), react: 'مصاحبه‌گر گفت «باید با مدیرمون هماهنگ کنم.»', set: { deal: 1.12 } },
      { label: 'دو برابر عرف!', d: () => -14, react: 'مصاحبه‌گر چاییش پرید تو گلوش!', set: { deal: 1.3 } },
    ],
  },
];

const job = (c: Ctx) => jobById(c.p.job as string)!;

function pick(c: Ctx, asked: string[]): string {
  if (!asked.length) return 'intro';
  if (asked.length === ROUNDS - 1) return 'salary';
  const pool = QUESTIONS.filter((q) => q.id !== 'intro' && q.id !== 'salary' && !asked.includes(q.id) && askable(c, job(c), q));
  return c.pick(pool).id;
}

defEvents([
  {
    id: 'job_interview',
    milestone: true,
    emoji: '👔',
    title: (c) => `مصاحبه برای «${job(c).title}»`,
    when: (c) => !!jobById(c.p.job as string) && !jobBlock(c.L, job(c)) && c.L.job?.id !== c.p.job,
    prep: (c) => {
      const asked = (c.p.asked as string[] | undefined) ?? [];
      return { asked, qid: c.p.keep ? c.p.qid : pick(c, asked), keep: undefined };
    },
    text: (c) => {
      const q = QUESTIONS.find((x) => x.id === c.p.qid)!;
      const j = job(c);
      const intro = `رفتی ${j.gov ? 'اداره' : 'شرکت'} برای مصاحبه${c.L.country !== 'ir' ? '، اون هم به انگلیسی' : ''}. مصاحبه‌گر با یه پوشه نشسته روبه‌روت.`;
      return `${c.p.react ?? intro}\nمصاحبه‌گر: «${q.q(c, j)}»`;
    },
    meter: (c) => ({ label: 'نظر مصاحبه‌گر', v: Math.round(c.p.A as number), d: c.p.dA as number | undefined }),
    dyn: (c) => {
      const j = job(c);
      const q = QUESTIONS.find((x) => x.id === c.p.qid)!;
      const help: ChoiceDef[] = c.p.helped ? [] : [{
        label: 'معرفی‌نامه‌ی یه آشنا رو رو کن',
        note: 'نظر مصاحبه‌گر کلی بهتر می‌شه',
        gems: GEM_COST.reference,
        do: (c2) => {
          const A = clamp((c2.p.A as number) + 22, 0, 100);
          const { _prep, ...p } = c2.p;
          c2.next('job_interview', { ...p, A, dA: Math.round(A - (c2.p.A as number)), keep: 1, helped: 1, react: 'مصاحبه‌گر معرفی‌نامه رو خوند: «آهان! پس از آشناهای آقای مهندس هستی!» لحنش عوض شد.' });
          return '';
        },
      }];
      return [...answerChoices(c, j, q, 'lied_cv', (c2, d, react, set) => {
        const A = clamp((c2.p.A as number) + d, 0, 100);
        const asked = [...(c2.p.asked as string[]), c2.p.qid as string];
        if (asked.length < ROUNDS) {
          c2.next('job_interview', { job: j.id, A, dA: Math.round(A - (c2.p.A as number)), asked, react, helped: c2.p.helped });
          return '';
        }
        if (c2.lucky(clamp((A - 20) / 65, 0.05, 0.95))) {
          hire(c2, j, (set.deal as number | undefined) ?? 1);
          return `${react}\nفرداش زنگ زدن: «تبریک! از شنبه بیا سر کار.» حالا «${j.levels[0]}» هستی. حقوق ماهانه: ${money(c2.L.job!.salary)}`;
        }
        c2.happy(-4);
        return `${react}\nگفتن «باهاتون تماس می‌گیریم»… و هیچ‌وقت نگرفتن.`;
      }), ...help];
    },
  },
]);
