/** «سر جلسه‌ی کنکور»: five timed questions before the konkur results. */
import { sfx } from '../audio';
import { QUIZ, type Q } from '../content/quiz';
import { fa } from '../engine/fmt';
import type { Life } from '../engine/types';
import { haptic } from '../haptics';
import { rewardedAvailable, showRewarded } from '../monetize';
import { btn, h, modal, rt } from './dom';
import { emo } from './emoji';

const SECONDS = 12;
const COUNT = 5;

function pickQuestions(L: Life): Q[] {
  const track = L.edu.track ?? 'riazi';
  const own = QUIZ.filter((q) => q.t === track);
  const general = QUIZ.filter((q) => !q.t);
  const pool = [...shuffle(own).slice(0, 3), ...shuffle(general)].slice(0, COUNT);
  return shuffle(pool);
}

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

/** Runs the quiz and resolves with the number of correct answers (0..5). */
export function konkurQuiz(L: Life): Promise<number> {
  return new Promise((resolve) => {
    const qs = pickQuestions(L);
    let i = 0;
    let score = 0;
    let timer = 0;
    let hint = true;
    const body = h('div', { class: 'quiz' });
    const m = modal(body, { locked: true, cls: 'quiz-modal' });

    const intro = () => {
      body.innerHTML = '';
      body.append(
        h('div', { class: 'event-emoji', html: emo('📝', 'emo big') }),
        rt('div', 'event-title', 'سر جلسه‌ی کنکور!'),
        rt('div', 'event-text', `مراقب جلسه گفت «شروع کنید!» ${fa(COUNT)} تا سؤال داری و برای هر کدوم ${fa(SECONDS)} ثانیه. هر جواب درست رتبه‌ات رو بهتر می‌کنه!`),
        btn('✏️ شروع کن!', () => ask(), 'btn primary wide'),
        btn('🎲 همه رو شانسی می‌زنم', () => { score = Math.floor(Math.random() * 3); finish(); }, 'btn ghost wide'),
      );
    };

    const ask = () => {
      if (i >= qs.length) { finish(); return; }
      const q = qs[i];
      const answers = shuffle(q.a.map((t, k) => ({ t, ok: k === 0 })));
      const bar = h('span', { class: 'fill hi', style: 'width:100%' });
      body.innerHTML = '';
      const buttons = answers.map((a) => {
        const b = h('button', { class: 'choice quiz-a' }, rt('span', 'choice-label', a.t));
        b.addEventListener('click', () => answer(a.ok, b, buttons, answers));
        return b;
      });
      let start = Date.now();
      const tick = () => {
        const left = 1 - (Date.now() - start) / (SECONDS * 1000);
        bar.style.width = `${Math.max(0, left * 100)}%`;
        bar.className = `fill ${left < 0.25 ? 'low' : left < 0.5 ? 'mid' : 'hi'}`;
        if (left <= 0) answer(false, null, buttons, answers);
      };
      // Once per exam: watch an ad and a studious friend whispers the answer (the clock waits).
      const help = hint && rewardedAvailable() ? btn('📞 زنگ به رفیق درس‌خون (با دیدن تبلیغ)', async () => {
        hint = false;
        help!.remove();
        clearInterval(timer);
        const t0 = Date.now();
        const ok = await showRewarded();
        start += Date.now() - t0;
        if (ok) buttons[answers.findIndex((a) => a.ok)].classList.add('hint');
        timer = window.setInterval(tick, 100);
      }, 'btn ghost small') : null;
      body.append(
        h('div', { class: 'quiz-top' }, h('span', { class: 'quiz-n', text: `سؤال ${fa(i + 1)} از ${fa(qs.length)}` }), h('span', { class: 'quiz-s', html: `${emo('✅')} ${fa(score)}` })),
        h('span', { class: 'track quiz-t' }, bar),
        rt('div', 'quiz-q', q.q),
        h('div', { class: 'choices' }, ...buttons),
      );
      if (help) body.append(help);
      clearInterval(timer);
      timer = window.setInterval(tick, 100);
    };

    const answer = (ok: boolean, b: HTMLElement | null, buttons: HTMLElement[], answers: { ok: boolean }[]) => {
      clearInterval(timer);
      buttons.forEach((x, k) => {
        x.setAttribute('disabled', 'true');
        if (answers[k].ok) x.classList.add('right');
      });
      if (ok) { score++; sfx('good'); haptic('light'); } else { b?.classList.add('wrong'); sfx('bad'); haptic('warn'); }
      i++;
      setTimeout(ask, 750);
    };

    const finish = () => {
      clearInterval(timer);
      const msg = score >= 5 ? 'همه رو درست زدی! 🤩' : score >= 3 ? 'خیلی خوب بود! 👏' : score >= 1 ? 'بد نبود… 😅' : 'هیچی بلد نبودی! 😱';
      body.innerHTML = '';
      body.append(
        h('div', { class: 'event-emoji', html: emo(score >= 3 ? '🎉' : '😬', 'emo big') }),
        rt('div', 'event-title', `${fa(score)} از ${fa(COUNT)}`),
        rt('div', 'event-text', `${msg}\nحالا باید منتظر کارنامه بمونی…`),
        btn('📄 دیدن کارنامه', () => { m.close(); resolve(score); }, 'btn primary wide'),
      );
    };

    intro();
  });
}
