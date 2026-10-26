/** «افتخارات»: tiered achievements (bronze, silver, gold) that pay coins and keys when claimed. */
import { coin } from '../audio';
import { CHAPTERS } from '../game/chapters';
import { haptic } from '../haptics';
import { persist, save } from '../save';
import { emo } from './emoji';
import { addKeys, CLASSICS } from './garage';
import { button, fa, faNum, h, modal } from './hud';

interface Ach { id: string; icon: string; name: string; what: (n: string) => string; tiers: [number, number, number]; value: () => number }

const chaptersDone = () => CHAPTERS.filter((c) => save.level >= c.to).length;

export const ACHIEVEMENTS: Ach[] = [
  { id: 'wins', icon: '🏁', name: 'راننده‌ی کارکشته', what: (n) => `${n} مرحله رو ببر`, tiers: [10, 50, 150], value: () => save.stats.wins },
  { id: 'people', icon: '🧍', name: 'مسافرکش نمونه', what: (n) => `${n} مسافر رو سوار کن`, tiers: [200, 1000, 3000], value: () => save.stats.people },
  { id: 'combo', icon: '🔥', name: 'استاد کمبو', what: (n) => `${n} ماشین پشت سر هم راهی کن`, tiers: [3, 5, 8], value: () => save.stats.bestCombo },
  { id: 'clean', icon: '🧤', name: 'دست‌خالی', what: (n) => `${n} مرحله رو بدون کمکی ببر`, tiers: [10, 40, 100], value: () => save.stats.clean },
  { id: 'boss', icon: '👑', name: 'رئیس‌کُش', what: (n) => `${n} مرحله‌ی سخت یا رئیس رو ببر`, tiers: [3, 12, 30], value: () => save.stats.bosses },
  { id: 'rush', icon: '⏰', name: 'سحرخیز', what: (n) => `${n} روز پشت سر هم ساعت شلوغی رو رد کن`, tiers: [3, 7, 30], value: () => save.stats.bestRush },
  { id: 'garage', icon: '🔧', name: 'کلکسیونر', what: (n) => `${n} ماشین کلاسیک بازسازی کن`, tiers: [2, 4, CLASSICS.length], value: () => save.garage.restored.length },
  { id: 'map', icon: '🗺️', name: 'تهران‌گرد', what: (n) => `${n} فصل رو تموم کن`, tiers: [1, 3, CHAPTERS.length], value: chaptersDone },
];

const TIER = [
  { name: 'برنز', cls: 'bronze', coins: 100, keys: 0 },
  { name: 'نقره', cls: 'silver', coins: 300, keys: 1 },
  { name: 'طلا', cls: 'gold', coins: 800, keys: 2 },
];

/** Tiers reached (0–3) and tiers already claimed. */
const reached = (a: Ach) => a.tiers.filter((t) => a.value() >= t).length;
const claimed = (a: Ach) => save.ach[a.id] ?? 0;

/** How many rewards are waiting to be claimed (for the home-screen badge). */
export const claimable = () => ACHIEVEMENTS.reduce((n, a) => n + (reached(a) - claimed(a)), 0);

/** Achievements whose next tier was just reached and not yet announced. Call after stats change. */
export function newlyReached(): Ach[] {
  const out: Ach[] = [];
  for (const a of ACHIEVEMENTS) {
    const r = reached(a);
    if (r > (save.achSeen[a.id] ?? 0)) { save.achSeen[a.id] = r; out.push(a); }
  }
  if (out.length) persist();
  return out;
}

export function showAchievements(onClose: () => void, onCoins: () => void) {
  const c = h('div', 'ach');
  c.innerHTML = `<h2>${emo('🏆')} افتخارات</h2>`;
  const list = h('div', 'alist');
  c.append(list);
  const draw = () => {
    list.innerHTML = '';
    for (const a of ACHIEVEMENTS) {
      const got = claimed(a), r = reached(a), v = a.value();
      const next = Math.min(got, 2);
      const goal = a.tiers[next];
      const done = got >= 3;
      const row = h('div', `arow ${done ? 'done' : ''}`);
      const medals = TIER.map((t, i) => `<i class="medal ${t.cls} ${i < got ? 'on' : ''}"></i>`).join('');
      row.innerHTML = `<div class="aic">${emo(a.icon)}</div><div class="atx"><b>${a.name}</b><small>${done ? 'همه‌ی مدال‌ها رو گرفتی!' : a.what(fa(goal))}</small>
        <span class="abar"><i style="width:${Math.min(100, Math.round((v / goal) * 100))}%"></i></span><span class="anum">${fa(Math.min(v, goal))} / ${fa(goal)}</span></div><div class="amed">${medals}</div>`;
      if (r > got) {
        const t = TIER[got];
        const b = button(`${emo('🎁', 'emo xs')} ${t.name}`, `claim ${t.cls}`, () => {
          save.ach[a.id] = got + 1;
          save.coins += t.coins;
          if (t.keys) addKeys(t.keys);
          persist(); onCoins();
          coin(); coin(0.1); coin(0.2); haptic('success');
          b.closest('.arow')?.classList.add('flash');
          b.outerHTML = `<span class="paid">${emo('🪙', 'emo xs')}+${faNum(t.coins)}${t.keys ? ` ${emo('🔑', 'emo xs')}+${fa(t.keys)}` : ''}</span>`;
          setTimeout(draw, 900);
        });
        row.append(b);
      }
      list.append(row);
    }
  };
  draw();
  const close = modal(c, 'pop ach-card');
  c.append(button('بستن', 'ghost', () => { close(); onClose(); }));
}
