/** «آزمون رانندگی» mini-game: three rules questions, then parallel parking in three timed taps. */
import { sfx } from '../audio';
import { RULES } from '../content/events/driving';
import { fa } from '../engine/fmt';
import type { Life } from '../engine/types';
import { haptic } from '../haptics';
import { btn, h, modal, rt } from './dom';
import { emo } from './emoji';

export type DrivingResult = { result: 'pass'; faults: number } | { result: 'theory' | 'park' };

const shuffle = <T,>(a: T[]) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

const STEPS = [
  { text: 'دنده‌عقب بگیر و وقتی عقب ماشینت با سپر ماشین جلویی یکی شد ترمز کن!', period: 1700 },
  { text: 'فرمون رو تا ته بچرخون و آروم برو عقب. به موقع ترمز کن!', period: 1400 },
  { text: 'فرمون رو صاف کن و ماشین رو بکش جلو. وسط جای پارک وایسا!', period: 1150 },
];

export function drivingTest(L: Life): Promise<DrivingResult> {
  return new Promise((resolve) => {
    const body = h('div', { class: 'drive' });
    const m = modal(body, { locked: true, cls: 'drive-modal' });
    const put = (...kids: (Node | null)[]) => {
      body.innerHTML = '';
      body.append(...kids.filter((k): k is Node => !!k));
    };
    const end = (r: DrivingResult, emoji: string, title: string, text: string) => {
      sfx(r.result === 'pass' ? 'good' : 'bad');
      haptic(r.result === 'pass' ? 'success' : 'warn');
      put(
        h('div', { class: 'event-emoji', html: emo(emoji, 'emo big') }),
        rt('div', 'event-title', title),
        rt('div', 'event-text', text),
        btn('ادامه', () => { m.close(); resolve(r); }, 'btn primary wide'),
      );
    };

    // ── Part one: آیین‌نامه ──
    const qs = shuffle(RULES).slice(0, 3);
    let qi = 0;
    let right = 0;
    const intro = () => put(
      h('div', { class: 'event-emoji', html: emo('🚦', 'emo big') }),
      rt('div', 'event-title', 'آزمون رانندگی'),
      rt('div', 'event-text', 'اول آیین‌نامه: سه تا سؤال، حداقل دو تا رو باید درست جواب بدی. بعدش آزمون شهری و پارک دوبل!'),
      btn('📋 شروع کن', () => ask(), 'btn primary wide'),
    );
    const ask = () => {
      if (qi >= qs.length) {
        if (right < 2) { end({ result: 'theory' }, '📋', 'رد شدی!', `فقط ${fa(right)} تا از ${fa(qs.length)} سؤال رو درست زدی. آیین‌نامه رو بیشتر بخون!`); return; }
        park();
        return;
      }
      const q = qs[qi];
      const answers = shuffle(q.a.map((t, k) => ({ t, ok: k === 0 })));
      const buttons = answers.map((a) => {
        const b = h('button', { class: 'choice quiz-a' }, rt('span', 'choice-label', a.t));
        b.addEventListener('click', () => {
          buttons.forEach((x, k) => {
            x.setAttribute('disabled', 'true');
            if (answers[k].ok) x.classList.add('right');
          });
          if (a.ok) { right++; sfx('good'); haptic('light'); } else { b.classList.add('wrong'); sfx('bad'); haptic('warn'); }
          qi++;
          setTimeout(ask, 800);
        });
        return b;
      });
      put(
        h('div', { class: 'quiz-top' }, h('span', { class: 'quiz-n', text: `آیین‌نامه، سؤال ${fa(qi + 1)} از ${fa(qs.length)}` }), h('span', { class: 'quiz-s', html: `${emo('✅')} ${fa(right)}` })),
        rt('div', 'quiz-q', q.q),
        h('div', { class: 'choices' }, ...buttons),
      );
    };

    // ── Part two: پارک دوبل ──
    const practice = 'drivePractice' in L.flags;
    const green = 0.15 + (practice ? 0.06 : 0) + (L.stats.smarts >= 70 ? 0.03 : 0);
    const yellow = 0.12;
    let step = 0;
    let faults = 0;
    const park = () => {
      if (step >= STEPS.length) {
        const text = faults === 0 ? 'افسر: «آفرین! عین راننده‌ی اتوبوس واحد!»' : faults === 1 ? 'افسر: «بد نبود، ولی بیشتر تمرین کن.»' : 'افسر کلی غر زد ولی آخرش امضا کرد!';
        end({ result: 'pass', faults }, '🪪', 'قبول شدی!', text);
        return;
      }
      const s = STEPS[step];
      const center = 0.25 + Math.random() * 0.5;
      const g0 = center - green / 2;
      const g1 = center + green / 2;
      const zone = h('div', { class: 'drive-zone', style: `left:${(g0 - yellow) * 100}%;width:${(green + yellow * 2) * 100}%` },
        h('div', { class: 'drive-green', style: `left:${(yellow / (green + yellow * 2)) * 100}%;width:${(green / (green + yellow * 2)) * 100}%`, text: 'P' }));
      const car = h('div', { class: 'drive-car', html: emo('🚙', 'emo') });
      const road = h('div', { class: 'drive-road', dir: 'ltr' }, zone, car);
      let pos = 0;
      let stopped = false;
      const t0 = performance.now();
      const tick = (t: number) => {
        if (stopped) return;
        // Back and forth along the road.
        const ph = ((t - t0) / s.period) % 2;
        pos = ph < 1 ? ph : 2 - ph;
        car.style.left = `calc(${pos * 100}% - 17px)`;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      const stop = () => {
        if (stopped) return;
        stopped = true;
        // Judge where the middle of the car is.
        const at = pos;
        const res = at >= g0 && at <= g1 ? 'g' : at >= g0 - yellow && at <= g1 + yellow ? 'y' : 'r';
        if (res === 'r') {
          sfx('bad');
          haptic('heavy');
          car.classList.add('crash');
          setTimeout(() => end({ result: 'park' }, '💥', 'بوووم!', at < g0 ? 'زدی به ماشین عقبی! افسر فقط سرش رو تکون داد و نوشت «مردود».' : 'زدی به میله‌ی پارک! افسر فقط سرش رو تکون داد و نوشت «مردود».'), 700);
          return;
        }
        if (res === 'y') faults++;
        sfx(res === 'g' ? 'good' : 'tap');
        haptic('light');
        msg.innerHTML = res === 'g' ? `${emo('👌')} عالی!` : `${emo('😬')} یه کم ${at < g0 ? 'زود' : 'دیر'} ترمز کردی… افسر یه چیزی نوشت.`;
        step++;
        setTimeout(park, 900);
      };
      const msg = h('div', { class: 'drive-msg' });
      put(
        h('div', { class: 'quiz-top' }, h('span', { class: 'quiz-n', text: `پارک دوبل، مرحله‌ی ${fa(step + 1)} از ${fa(STEPS.length)}` }), h('span', { class: 'quiz-s', html: `${emo('👮')} ${faults ? emo('😠').repeat(faults) : emo('😐')}` })),
        rt('div', 'drive-text', s.text),
        road,
        msg,
        btn('🛑 ترمز!', stop, 'btn gold wide big'),
      );
    };

    intro();
  });
}
