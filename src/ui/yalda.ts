/** «شب یلدا» screens: the home banner with its pomegranates, and the win card with a Hafez fortune. */
import { coin } from '../audio';
import { HAFEZ, YALDA_NIGHTS, yaldaActive } from '../game/events';
import { haptic } from '../haptics';
import { persist, save } from '../save';
import { emo } from './emoji';
import { addKeys } from './garage';
import { button, fa, faNum, h, modal } from './hud';

/** A pomegranate (there is no emoji for it). */
export const POM = (cls = '') => `<svg class="pom ${cls}" viewBox="0 0 40 40" aria-hidden="true"><path d="M15 6h10l-2 5h-6z" fill="#7a1020"/><path d="M16 4l2 3M24 4l-2 3M20 3v4" stroke="#7a1020" stroke-width="2" stroke-linecap="round"/><circle cx="20" cy="23" r="14" fill="#b3142f"/><circle cx="20" cy="23" r="14" fill="url(#pg)"/><defs><radialGradient id="pg" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ff6b7d" stop-opacity=".9"/><stop offset=".5" stop-color="#d11a3a" stop-opacity=".3"/><stop offset="1" stop-color="#5c0a18" stop-opacity=".6"/></radialGradient></defs></svg>`;

/** This year's progress (resets when a new Yalda comes round). */
export function yaldaDone(): number {
  const y = new Date().getFullYear();
  if (save.yalda.year !== y) { save.yalda = { year: y, done: 0 }; persist(); }
  return save.yalda.done;
}

/** The home-screen banner, or null outside the event. */
export function yaldaBanner(play: (night: number) => void): HTMLElement | null {
  if (!yaldaActive()) return null;
  const done = yaldaDone(), all = done >= YALDA_NIGHTS;
  const poms = Array.from({ length: YALDA_NIGHTS }, (_, i) => POM(i < done ? 'got' : '')).join('');
  const b = button(`<span class="yt">${emo('🍉', 'emo sm')} شب یلدا <small>${all ? 'همه‌ی انارها رو جمع کردی!' : `شب ${fa(done + 1)} از ${fa(YALDA_NIGHTS)}`}</small></span><span class="poms">${poms}</span>`, `yalda-btn ${all ? 'done' : ''}`, () => { if (!all) play(done); });
  return b;
}

/** Rewards for night `night`: coins every night, keys on the last. */
const rewardOf = (night: number) => ({ coins: 150 + night * 50, keys: night === YALDA_NIGHTS - 1 ? 3 : 0 });

export function showYaldaWin(night: number, onClose: () => void) {
  const first = night >= yaldaDone();
  const { coins, keys } = first ? rewardOf(night) : { coins: 20, keys: 0 };
  if (first) save.yalda.done = night + 1;
  save.coins += coins; if (keys) addKeys(keys); persist();
  const [a, b] = HAFEZ[(night * 3 + new Date().getDate()) % HAFEZ.length];
  const c = h('div', 'result win yalda');
  c.innerHTML = `<div class="burst">${POM('huge')}</div><h2>${first ? `انار شب ${fa(night + 1)}!` : 'آفرین!'}</h2>
    <div class="hafez"><small>${emo('📖', 'emo xs')} فال حافظ</small><p>${a}</p><p>${b}</p></div>
    <div class="reward">${emo('🪙')}<b dir="ltr">+${faNum(coins)}</b></div>${keys ? `<div class="reward keyr">${emo('🔑')}<b dir="ltr">+${fa(keys)}</b><small>جایزه‌ی آخرین شب</small></div>` : ''}`;
  const close = modal(c, 'pop');
  c.append(button(save.yalda.done >= YALDA_NIGHTS ? 'یلدات مبارک! 🎉' : 'برگرد به خونه', 'primary big', () => { close(); onClose(); }));
  for (let i = 0; i < 6; i++) coin(0.15 + i * 0.09);
  haptic('success');
}
