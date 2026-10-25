/** «چونه زدن» mini-game: offer a price with a slider, the seller counters until you shake hands. */
import { sfx } from '../audio';
import { fa, money as rough } from '../engine/fmt';
import { offer, PATIENCE, startHaggle, type Reply } from '../engine/haggle';
import type { Life } from '../engine/types';
import { haptic } from '../haptics';
import { btn, h, modal, rt } from './dom';
import { emo } from './emoji';

/** Haggling is about the last few millions, so show three significant digits. */
const money = (n: number) => rough(n, 'تومان', true);

export type HaggleResult = { deal: number } | { walk: 1 | 2 };

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

function lines(car: boolean, g: (m: string, f: string) => string) {
  const sir = g('آقا', 'خانم');
  return {
    open: car
      ? ['قیمتش {p}ـه. بی‌رنگ، دست اول، فنی سالم. به جون بچه‌هام ضرر می‌کنم!', 'تو کل شهر لنگه نداره. {p}، آخرشه.', 'دیروز یکی {p} نقد می‌داد ندادم، چون از شما خوشم اومده…']
      : ['قیمت مالک {p}ـه. نورگیر، سند شش‌دانگ، تازه بازسازی شده.', 'این منطقه داره می‌ترکه! {p}، فردا گرون‌تر می‌شه.', 'سه نفر دیگه هم امروز اومدن دیدن. {p}، آخرشه.'],
    counter: car
      ? ['نه بابا، ضرر می‌کنم! به خاطر شما {a}.', 'به احترام شما {a}، دیگه از این پایین‌تر نمی‌شه.', 'مال خودت! {a} و یه آویز هم روش.']
      : ['یه زنگ به مالک زدم. گفت {a}.', 'به احترام شما {a}، دیگه از این پایین‌تر نمی‌شه.', 'مالک یه کم کوتاه اومد: {a}.'],
    final: [`ببین ${sir}، آخرین حرفم {a}. یا می‌خری یا خداحافظ.`, 'دیگه نه من، نه شما. {a}، آخرِ آخرش.'],
    insult: ['شوخی می‌کنی؟! با این پول یه دوچرخه هم نمی‌دن!', `${sir}، مگه اومدی بازار مکاره؟!`, 'خندیدم! جدی بگو.'],
    deal: car
      ? ['ای بابا، باشه! مبارکه، به سلامتی سوار شی!', 'دستت درد نکنه، خوب چونه می‌زنی‌ها! بفرما سوئیچ.']
      : ['قبول! بریم دفترخونه.', 'مبارکه! ان‌شاءالله به خوشی بشینید توش.'],
    walk: [`برو ${sir}، مشتری زیاده!`, 'وقت منو گرفتی! خداحافظ.'],
  };
}

/** Runs the haggle and resolves with the agreed price or who walked away. */
export function haggleGame(L: Life, p: Record<string, unknown>, what: string): Promise<HaggleResult> {
  return new Promise((resolve) => {
    const car = p.kind === 'car';
    const g = (m: string, f: string) => (L.gender === 'm' ? m : f);
    const say = lines(car, g);
    const room = (L.traits.includes('charming') ? 0.04 : 0) + (L.traits.includes('stingy') ? 0.03 : 0) + (L.stats.rep >= 70 ? 0.02 : 0);
    const st = startHaggle(p.price as number, room, Math.random);
    const seller = car ? '🧔' : '👨‍💼';
    const sellerName = car ? 'آقا مرتضی، نمایشگاه‌دار' : 'حاج‌آقا، بنگاه‌دار';
    const fill = (s: string) => s.replace('{p}', money(st.price)).replace('{a}', money(st.ask));

    const body = h('div', { class: 'haggle' });
    const put = (...kids: (Node | null)[]) => body.append(...kids.filter((k): k is Node => !!k));
    const m = modal(body, { locked: true, cls: 'haggle-modal' });
    let bubble = fill(pick(say.open));
    let mood = 0;

    const done = (r: HaggleResult, text: string, good: boolean) => {
      sfx(good ? 'coin' : 'bad');
      haptic(good ? 'success' : 'warn');
      body.innerHTML = '';
      put(
        h('div', { class: 'event-emoji', html: emo(good ? '🤝' : '🚶', 'emo big') }),
        rt('div', 'event-title', good ? 'دست دادید!' : 'معامله به هم خورد'),
        rt('div', 'haggle-bubble', text),
        'deal' in r ? h('div', { class: 'haggle-ask', html: `قیمت نهایی: <b>${money(r.deal)}</b>` }) : null,
        'deal' in r && r.deal < st.price ? rt('div', 'haggle-saved', `🎉 ${money(st.price - r.deal)} کمتر از قیمت اول!`) : null,
        btn('ادامه', () => { m.close(); resolve(r); }, 'btn primary wide'),
      );
    };

    const render = () => {
      body.innerHTML = '';
      const lo = Math.floor((st.ask * 0.6) / st.step) * st.step;
      const slider = h('input', { type: 'range', class: 'haggle-range', dir: 'ltr', min: String(lo), max: String(st.ask), step: String(st.step) }) as HTMLInputElement;
      slider.value = String(Math.round((st.ask * 0.92) / st.step) * st.step);
      const show = h('div', { class: 'haggle-offer' });
      const upd = () => {
        const v = Number(slider.value);
        const off = Math.round((1 - v / st.ask) * 100);
        show.innerHTML = `پیشنهاد تو: <b>${money(v)}</b>${off > 0 ? ` <span class="haggle-off">${fa(off)}٪ کمتر</span>` : ''}`;
      };
      slider.addEventListener('input', upd);
      upd();
      const faces = ['😊', '🙂', '😐', '😠'];
      put(
        h('div', { class: 'haggle-head' },
          h('div', { class: 'event-emoji small', html: emo(seller, 'emo big') }),
          h('div', { class: 'haggle-who' },
            rt('div', 'haggle-name', sellerName),
            rt('div', 'haggle-what', what),
            h('div', { class: 'haggle-mood', html: `حوصله: ${Array.from({ length: PATIENCE }, (_, i) => `<span class="${i < st.patience ? '' : 'gone'}">${emo(i < st.patience ? faces[mood] : '💢')}</span>`).join('')}` }))),
        rt('div', 'haggle-bubble', bubble),
        h('div', { class: 'haggle-ask', html: `قیمت فروشنده: <b>${money(st.ask)}</b>${st.ask < st.price ? ` <s>${money(st.price)}</s>` : ''}` }),
        st.final ? null : h('div', { class: 'haggle-slide' }, show, slider, h('div', { class: 'haggle-ends' }, h('span', { text: 'ارزون‌تر' }), h('span', { text: 'گرون‌تر' }))),
        st.final ? null : btn('🗣️ پیشنهاد بده', () => send(Number(slider.value)), 'btn gold wide'),
        btn(`✅ قبول، ${money(st.ask)}`, () => done({ deal: st.ask }, pick(say.deal), true), 'btn primary wide'),
        btn('🚶 بی‌خیال', () => done({ walk: 2 }, 'گفتی «باید با خانواده مشورت کنم» و زدی بیرون.', false), 'btn ghost wide'),
      );
    };

    const send = (o: number) => {
      sfx('tap');
      haptic('light');
      const r: Reply = offer(st, o, Math.random);
      switch (r.kind) {
        case 'deal': done({ deal: r.price }, pick(say.deal), true); return;
        case 'walk': done({ walk: 1 }, pick(say.walk), false); return;
        case 'insult': bubble = pick(say.insult); mood = 3; break;
        case 'counter': bubble = fill(pick(say.counter)); mood = Math.min(2, mood + 1); break;
        case 'final': bubble = fill(pick(say.final)); mood = 3; break;
      }
      render();
    };

    render();
  });
}
