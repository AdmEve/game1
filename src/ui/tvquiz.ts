/** «مسابقه‌ی تلویزیونی»: five timed questions with a prize ladder; walk away with the money or risk it. */
import { sfx } from '../audio';
import { TRIVIA, TV_LADDER as LADDER, TV_SAFE as SAFE, type Trivia } from '../content/trivia';
import { fa, money } from '../engine/fmt';
import type { Life } from '../engine/types';
import { haptic } from '../haptics';
import { btn, h, modal, rt } from './dom';
import { emo } from './emoji';

const SECONDS = 15;

export type TvResult = { won: number; reached: number };

const shuffle = <T,>(a: T[]) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

function pickQuestions(): Trivia[] {
  const tier = (d: number, n: number) => shuffle(TRIVIA.filter((t) => t.d === d)).slice(0, n);
  return [...tier(0, 2), ...tier(1, 2), ...tier(2, 1)];
}

export function tvQuiz(L: Life): Promise<TvResult> {
  return new Promise((resolve) => {
    const prize = (i: number) => money(Math.round(LADDER[i] * L.econ.price));
    const qs = pickQuestions();
    const body = h('div', { class: 'quiz' });
    const m = modal(body, { locked: true, cls: 'quiz-modal' });
    const put = (...kids: (Node | null)[]) => {
      body.innerHTML = '';
      body.append(...kids.filter((k): k is Node => !!k));
    };
    let i = 0;
    let fifty = true;
    let timer = 0;

    const finish = (won: number, emoji: string, title: string, text: string) => {
      clearInterval(timer);
      sfx(won > 0 ? 'coin' : 'bad');
      haptic(won > 0 ? 'success' : 'warn');
      put(
        h('div', { class: 'event-emoji', html: emo(emoji, 'emo big') }),
        rt('div', 'event-title', title),
        rt('div', 'event-text', text),
        btn('ادامه', () => { m.close(); resolve({ won, reached: i }); }, 'btn primary wide'),
      );
    };

    const ask = () => {
      const q = qs[i];
      const answers = shuffle(q.a.map((t, k) => ({ t, ok: k === 0 })));
      const bar = h('span', { class: 'fill hi', style: 'width:100%' });
      const buttons = answers.map((a) => {
        const b = h('button', { class: 'choice quiz-a' }, rt('span', 'choice-label', a.t));
        b.addEventListener('click', () => answer(a.ok, b));
        return b;
      });
      const half = fifty ? btn('✂️ حذف دو گزینه', () => {
        fifty = false;
        half!.remove();
        let removed = 0;
        for (const k of shuffle([0, 1, 2, 3])) {
          if (removed < 2 && !answers[k].ok) { buttons[k].classList.add('gone'); buttons[k].setAttribute('disabled', 'true'); removed++; }
        }
      }, 'btn ghost small') : null;
      put(
        h('div', { class: 'quiz-top' }, h('span', { class: 'quiz-n', text: `سؤال ${fa(i + 1)} از ${fa(qs.length)}` }), h('span', { class: 'quiz-s', html: `${emo('💰')} ${prize(i)}` })),
        h('span', { class: 'track quiz-t' }, bar),
        rt('div', 'quiz-q', q.q),
        h('div', { class: 'choices' }, ...buttons),
        half,
      );
      const start = Date.now();
      clearInterval(timer);
      timer = window.setInterval(() => {
        const left = 1 - (Date.now() - start) / (SECONDS * 1000);
        bar.style.width = `${Math.max(0, left * 100)}%`;
        bar.className = `fill ${left < 0.25 ? 'low' : left < 0.5 ? 'mid' : 'hi'}`;
        if (left <= 0) answer(false, null);
      }, 100);

      const answer = (ok: boolean, b: HTMLElement | null) => {
        clearInterval(timer);
        buttons.forEach((x, k) => {
          x.setAttribute('disabled', 'true');
          if (answers[k].ok) x.classList.add('right');
        });
        if (!ok) {
          b?.classList.add('wrong');
          sfx('bad');
          haptic('warn');
          const safe = i > SAFE ? LADDER[SAFE] : 0;
          setTimeout(() => finish(safe, '😱', b ? 'جواب اشتباه!' : 'وقت تموم شد!', safe ? `مجری گفت «حیف شد!» ولی جایزه‌ی پله‌ی امن (${prize(SAFE)}) مال توئه.` : 'مجری گفت «حیف شد! ولی خوش اومدی.» دست خالی برگشتی خونه.'), 900);
          return;
        }
        sfx('good');
        haptic('light');
        setTimeout(() => {
          if (i === qs.length - 1) { finish(LADDER[i], '🏆', 'برنده‌ی جایزه‌ی بزرگ!', `همه‌ی سؤال‌ها رو درست جواب دادی و ${prize(i)} بردی! کاغذهای رنگی از سقف ریخت پایین!`); return; }
          put(
            h('div', { class: 'event-emoji', html: emo('🎙️', 'emo big') }),
            rt('div', 'event-title', 'درسته!'),
            rt('div', 'event-text', `الان ${prize(i)} داری. سؤال بعدی ${prize(i + 1)} می‌ارزه.${i < SAFE ? `\nاگه سؤال ${fa(SAFE + 1)} رو هم درست جواب بدی، ${prize(SAFE)} دیگه مال خودته، حتی اگه بعدش اشتباه کنی.` : ''}`),
            btn(`🔥 ادامه می‌دم!`, () => { i++; ask(); }, 'btn gold wide'),
            btn(`💰 ${prize(i)} رو برمی‌دارم`, () => finish(LADDER[i], '💰', 'پولت رو برداشتی!', `با ${prize(i)} رفتی خونه. مجری گفت «آفرین به این عقل!»`), 'btn ghost wide'),
          );
        }, 800);
      };
    };

    put(
      h('div', { class: 'event-emoji', html: emo('📺', 'emo big') }),
      rt('div', 'event-title', 'مسابقه‌ی تلویزیونی!'),
      rt('div', 'event-text', `نورها روشن شد و مجری گفت «به مسابقه خوش اومدی!» پنج تا سؤال، جایزه‌ی آخر ${prize(LADDER.length - 1)}. بعد از هر جواب درست می‌تونی پولت رو برداری و بری.`),
      btn('🎬 شروع کنیم!', () => ask(), 'btn primary wide'),
    );
  });
}
