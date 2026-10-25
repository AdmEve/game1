/** Conversations scored on a meter (khastegari, job interviews): questions, answers and lies. */
import type { Ctx } from '../engine/ctx';
import type { ChoiceDef } from '../engine/registry';

export interface Answer<X> {
  label: string | ((c: Ctx, x: X) => string);
  when?: (c: Ctx, x: X) => boolean;
  /** Change on the meter. */
  d: (c: Ctx, x: X) => number;
  react: string | ((c: Ctx, x: X) => string);
  /** A lie: helps now, but is found out on the spot with this chance. */
  lie?: number;
  /** Extra parameters this answer settles (e.g. the salary asked for). */
  set?: Record<string, unknown>;
}

export interface Question<X> {
  id: string;
  when?: (c: Ctx, x: X) => boolean;
  q: (c: Ctx, x: X) => string;
  a: Answer<X>[];
}

const CAUGHT = ['یکی از فامیل‌هاشون می‌شناختت و دستت رو شد!', 'یه زنگ زدن و استعلام گرفتن. دروغت لو رفت!', 'هول شدی و دو بار دو تا جواب مختلف دادی. همه فهمیدن!'];

/** Whether a question has an answer you can give. */
export function askable<X>(c: Ctx, x: X, q: Question<X>): boolean {
  return (!q.when || q.when(c, x)) && q.a.some((a) => !a.when || a.when(c, x));
}

/** The answers as event choices; `after` gets the meter change, the reaction and what the answer settled. */
export function answerChoices<X>(c: Ctx, x: X, q: Question<X>, lieFlag: string, after: (c: Ctx, d: number, react: string, set: Record<string, unknown>) => string): ChoiceDef[] {
  return q.a
    .filter((a) => !a.when || a.when(c, x))
    .map((a) => ({
      label: typeof a.label === 'string' ? a.label : a.label(c, x),
      do: (c2: Ctx) => {
        let d = a.d(c2, x);
        let react = typeof a.react === 'string' ? a.react : a.react(c2, x);
        if (a.lie) {
          if (c2.chance(a.lie)) {
            d = -18;
            react = c2.pick(CAUGHT);
          } else c2.flag(lieFlag);
        }
        return after(c2, d, react, a.set ?? {});
      },
    }));
}
