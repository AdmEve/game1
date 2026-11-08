/** «نوروز» screens: the home banner with the Haft-Sin table, and the win card with the day's «سین» and its «عیدی». */
import { coin } from '../audio';
import { HAFT_SIN, NOWRUZ_DAYS, nowruzActive, stageOpen } from '../game/events';
import { today } from '../game/daily';
import { haptic } from '../haptics';
import { persist, save } from '../save';
import { emo } from './emoji';
import { addKeys } from './garage';
import { button, fa, faNum, h, modal, asBack, note } from './hud';

/** This year's progress (a new Nowruz starts a fresh table). */
export function nowruzDone(): number {
  const y = new Date().getFullYear();
  if (save.nowruz.year !== y) { save.nowruz = { year: y, done: 0 }; persist(); }
  return save.nowruz.done;
}

/** The home-screen banner, or null outside the event. */
export function nowruzBanner(play: (day: number) => void): HTMLElement | null {
  if (!nowruzActive()) return null;
  const done = nowruzDone(), all = done >= NOWRUZ_DAYS;
  const open = stageOpen(done, NOWRUZ_DAYS, save.nowruz.last, today()) || location.search.includes('nowruz');
  const table = HAFT_SIN.map((s, i) => `<span class="sin ${i < done ? 'got' : ''}">${emo(s.icon, 'emo sm')}</span>`).join('');
  const sub = all ? 'سفره‌ت کامل شد! سال نو مبارک' : open ? `روز ${fa(done + 1)}: ${HAFT_SIN[done].name}` : `«${HAFT_SIN[done].name}» فردا`;
  return button(`<span class="yt">${emo('🐟', 'emo sm')} سفره‌ی هفت‌سین <small>${sub}</small></span><span class="sins">${table}</span>`, `nowruz-btn ${all ? 'done' : open ? '' : 'wait'}`, () => {
    if (all) return;
    if (open) play(done); else note(`هر روز یه سین! «${HAFT_SIN[done].name}» فردا منتظرته.`);
  });
}

/** «عیدی» for day `day`: coins every day, keys with the last «سین». */
const eidi = (day: number) => ({ coins: 150 + day * 50, keys: day === NOWRUZ_DAYS - 1 ? 5 : 0 });

export function showNowruzWin(day: number, onClose: () => void) {
  const first = day >= nowruzDone();
  const { coins, keys } = first ? eidi(day) : { coins: 20, keys: 0 };
  if (first) { save.nowruz.done = day + 1; save.nowruz.last = today(); }
  save.coins += coins; if (keys) addKeys(keys); persist();
  const sin = HAFT_SIN[day];
  const c = h('div', 'result win nowruz');
  const table = HAFT_SIN.map((s, i) => `<span class="sin ${i <= day ? 'got' : ''} ${i === day ? 'new' : ''}">${emo(s.icon, 'emo sm')}</span>`).join('');
  c.innerHTML = `<div class="burst">${emo(sin.icon, 'emo huge')}</div><h2>${first ? `سین ${fa(day + 1)}: ${sin.name}` : 'آفرین!'}</h2>
    <p class="wish">${sin.wish}</p><div class="sins">${table}</div>
    <div class="rewards"><div class="reward">${emo('🪙')}<b dir="ltr">+${faNum(coins)}</b><small>عیدی</small></div>${keys ? `<div class="reward keyr">${emo('🔑')}<b dir="ltr">+${fa(keys)}</b><small>عیدی</small></div>` : ''}</div>`;
  const close = modal(c, 'pop');
  c.append(asBack(button(save.nowruz.done >= NOWRUZ_DAYS ? 'نوروزت پیروز! 🎉' : 'برگرد به خونه', 'primary big', () => { close(); onClose(); })));
  for (let i = 0; i < 6; i++) coin(0.15 + i * 0.09);
  haptic('success');
}
