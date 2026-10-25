/** «پریدن از روی آتیش» at Chaharshanbe Suri: three bonfires, jump when the flames are low. */
import { sfx } from '../audio';
import { fa } from '../engine/fmt';
import type { Life } from '../engine/types';
import { haptic } from '../haptics';
import { btn, h, modal, rt } from './dom';
import { emo } from './emoji';
import { timingStrip } from './timing';

export type FireResult = { jumps: number; burnt: boolean };

const FIRES = 3;
const PERIODS = [1500, 1250, 1050];

export function fireJump(L: Life): Promise<FireResult> {
  return new Promise((resolve) => {
    const body = h('div', { class: 'drive' });
    const m = modal(body, { locked: true, cls: 'drive-modal' });
    const put = (...kids: (Node | null)[]) => {
      body.innerHTML = '';
      body.append(...kids.filter((k): k is Node => !!k));
    };
    const green = 0.16 + (L.traits.includes('athlete') ? 0.05 : 0);
    let fire = 0;
    let singed = 0;

    const end = (r: FireResult, emoji: string, title: string, text: string) => {
      sfx(r.burnt ? 'bad' : 'good');
      haptic(r.burnt ? 'warn' : 'success');
      put(
        h('div', { class: 'event-emoji', html: emo(emoji, 'emo big') }),
        rt('div', 'event-title', title),
        rt('div', 'event-text', text),
        btn('ادامه', () => { m.close(); resolve(r); }, 'btn primary wide'),
      );
    };

    const round = () => {
      if (fire >= FIRES) {
        end({ jumps: FIRES, burnt: false }, '🎉', 'از روی هر سه تا پریدی!', singed ? `«زردی من از تو، سرخی تو از من!» فقط ${fa(singed)} بار پاچه‌ی شلوارت دود کرد!` : '«زردی من از تو، سرخی تو از من!» یه بار هم نسوختی. قهرمان کوچه شدی!');
        return;
      }
      const strip = timingStrip({ sprite: '🔥', period: PERIODS[fire], green, yellow: 0.12, center: 0.2, mark: 'بپر!', cls: 'fire-strip' });
      const msg = h('div', { class: 'drive-msg' });
      let done = false;
      const jump = () => {
        if (done) return;
        done = true;
        const { hit } = strip.stop();
        if (hit === 'r') {
          sfx('bad');
          haptic('heavy');
          strip.shake();
          setTimeout(() => end({ jumps: fire, burnt: true }, '🧯', 'سوختی!', 'وقتی شعله‌ها بلند بودن پریدی! پاچه‌ی شلوارت آتیش گرفت و همسایه با یه سطل آب خاموشت کرد. همه از پشت پنجره دیدن!'), 700);
          return;
        }
        if (hit === 'y') singed++;
        sfx(hit === 'g' ? 'good' : 'tap');
        haptic('light');
        msg.innerHTML = hit === 'g' ? `${emo('🤸')} پریدی! «زردی من از تو، سرخی تو از من!»` : `${emo('😬')} پریدی، ولی پاچه‌ی شلوارت یه کم دود کرد!`;
        fire++;
        setTimeout(round, 900);
      };
      put(
        h('div', { class: 'quiz-top' }, h('span', { class: 'quiz-n', text: `آتیش ${fa(fire + 1)} از ${fa(FIRES)}` }), h('span', { class: 'quiz-s', html: emo('🔥').repeat(FIRES - fire) })),
        rt('div', 'drive-text', 'شعله‌ها بالا و پایین می‌رن. وقتی کوتاه شدن، بپر!'),
        h('div', { class: 'fire-ends' }, h('span', { text: 'شعله‌ی کوتاه' }), h('span', { text: 'شعله‌ی بلند' })),
        strip.el,
        msg,
        btn('🤸 بپر!', jump, 'btn gold wide big'),
      );
    };

    put(
      h('div', { class: 'event-emoji', html: emo('🔥', 'emo big') }),
      rt('div', 'event-title', 'چهارشنبه‌سوری!'),
      rt('div', 'event-text', `تو کوچه سه تا آتیش روشن کردن. همه منتظرن ببینن ${L.gender === 'm' ? 'آقا' : 'خانم'} ${L.first} چطوری می‌پره!`),
      btn('🔥 بریم!', () => round(), 'btn primary wide'),
    );
  });
}
