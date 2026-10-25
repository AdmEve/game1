import { degreeLevel } from '../content/edu';
import { JOBS, type JobDef } from '../content/jobs';
import { clamp, type Ctx } from './ctx';
import { money } from './fmt';
import type { Life } from './types';
import { milCardOk, salaryOf } from './year';

/** Why this job is out of reach, or null if you can apply. */
export function jobBlock(L: Life, j: JobDef): string | null {
  const age = L.age;
  if (L.prison) return 'تو زندانی';
  if (L.mil.status === 'serving') return 'سربازی';
  if (j.minAge && age < j.minAge) return `حداقل ${j.minAge} سال`;
  if (!j.minAge && age < 18) return 'هنوز سنت کمه';
  if (j.maxAge && age > j.maxAge) return 'سنت زیاده';
  if (age >= 65) return 'سنت زیاده';
  if (j.gender && j.gender !== L.gender) return 'فقط برای خانم‌ها';
  if ((L.edu.stage === 'school' || L.edu.stage === 'uni') && !j.part) return 'باید درس بخونی (فقط پاره‌وقت)';
  if (j.part && L.edu.stage !== 'school' && L.edu.stage !== 'uni' && age > 26) return 'برای دانشجوهاست';
  if (j.vip && !('vipCareers' in L.flags)) return '🔒 بسته‌ی شغل‌های ویژه';
  if (j.degree) {
    const ok = L.edu.degrees.some((d) => degreeLevel(d.kind) >= degreeLevel(j.degree!) && (!j.majors || j.majors.includes(d.major)));
    if (!ok) return j.majors ? 'مدرک مرتبط نداری' : 'مدرکت کافی نیست';
  }
  if (j.mil && L.country === 'ir' && !milCardOk(L)) return 'کارت پایان خدمت نداری';
  if (j.flag && !(j.flag in L.flags)) return FLAG_NEED[j.flag] ?? 'مهارتش رو نداری';
  if (j.car && !L.assets.some((a) => a.kind === 'car')) return 'ماشین نداری';
  if (j.smarts && L.stats.smarts < j.smarts - 15) return 'هوشت کافی نیست';
  if (j.looks && L.stats.looks < j.looks - 15) return 'ظاهرت مناسب نیست';
  if (j.health && L.stats.health < j.health - 15) return 'آمادگی جسمانی نداری';
  if (L.country !== 'ir' && j.gov) return 'شغل دولتیه';
  if (L.country !== 'ir' && (L.edu.ielts ?? 0) < 5.5 && j.tier > 0) return 'زبانت ضعیفه';
  if (L.country !== 'ir' && j.tier === 2 && j.degree && !('recognized' in L.flags)) return 'مدرکت هنوز معادل‌سازی نشده';
  return null;
}

const FLAG_NEED: Record<string, string> = {
  licence: 'گواهینامه‌ی پایه یک لازمه',
  c_barber: 'دوره‌ی آرایشگری ندیدی',
  c_tailor: 'دوره‌ی خیاطی ندیدی',
  c_mechanic: 'مهارت مکانیکی نداری',
  c_plumber: 'مهارت لوله‌کشی نداری',
  c_elec: 'مهارت برق‌کاری نداری',
  c_coach: 'مدرک مربیگری نداری',
  english: 'زبان انگلیسی بلد نیستی',
  bar: 'آزمون وکالت قبول نشدی',
  residency: 'دستیاری تخصصی نخوندی',
  voice: 'صدات تعلیم‌دیده نیست',
  flight_school: 'دانشکده‌ی خلبانی نرفتی',
};

/** Jobs to show in the search list: the ones you qualify for first, then a few locked ones. */
export function jobList(L: Life): { job: JobDef; block: string | null }[] {
  const all = JOBS.map((job) => ({ job, block: jobBlock(L, job) }));
  const open = all.filter((x) => !x.block);
  const locked = all.filter((x) => x.block && !x.block.includes('سن') && !x.block.includes('پاره‌وقت'));
  return [...open, ...locked];
}

/** Try to get hired. Returns the story. */
export function applyJob(c: Ctx, j: JobDef, connections = false): string {
  const L = c.L;
  let p = 1 - j.hard;
  if (j.smarts) p *= clamp(0.6 + (L.stats.smarts - j.smarts) / 50, 0.25, 1.3);
  if (j.looks) p *= clamp(0.6 + (L.stats.looks - j.looks) / 50, 0.25, 1.3);
  const deg = L.edu.degrees[L.edu.degrees.length - 1];
  if (deg && deg.tier <= 1 && j.degree) p *= 1.15;
  p *= 0.85 + L.stats.rep / 300;
  if (connections || c.lucky(clamp(p, 0.04, 0.95))) {
    L.job = { id: j.id, since: L.year, perf: 55, level: 0, salary: 0, part: j.part };
    L.job.salary = salaryOf(L);
    if (!L.career.some((x) => x.id === j.id)) L.career.push({ id: j.id, title: j.title, years: 0 });
    c.happy(8).rep(2);
    return connections
      ? `با یه پارتی کلفت استخدام شدی! حالا «${j.levels[0]}» هستی. حقوق ماهانه: ${money(L.job.salary)}`
      : `استخدام شدی! حالا «${j.levels[0]}» هستی. حقوق ماهانه: ${money(L.job.salary)}`;
  }
  c.happy(-4);
  return c.pick([
    'مصاحبه خوب پیش نرفت. گفتن «باهاتون تماس می‌گیریم» و هیچ‌وقت نگرفتن.',
    'یه نفر با پارتی جات رو گرفت.',
    'گفتن «سابقه‌ی کار نداری». آخه بدون کار چطوری سابقه‌ی کار بیارم؟!',
    'تو مصاحبه هول شدی و جای «نقطه‌ی قوت» از «نقطه‌ی ضعف»هات گفتی.',
    'ظرفیت پر شده بود.',
  ]);
}
