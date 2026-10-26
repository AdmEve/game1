/**
 * «کارت بلیت»: the monthly pass, drawn as Tehran Metro Line 1 from Tajrish southward. Every new win
 * punches the ticket; every two punches reach the next station, which pays a free reward and,
 * with the premium card, a bigger one.
 */
import { coin } from '../audio';
import { PRODUCTS } from '../config';
import { haptic } from '../haptics';
import { addLives, MAX_LIVES } from '../lives';
import { buy, iapAvailable, priceLabel } from '../monetize';
import { persist, save } from '../save';
import { emo } from './emoji';
import { addKeys } from './garage';
import { button, fa, faNum, h, modal } from './hud';

export const STATIONS = ['تجریش', 'قیطریه', 'شهید صدر', 'قلهک', 'دکتر شریعتی', 'میرداماد', 'شهید حقانی', 'شهید همت', 'مصلی', 'شهید بهشتی',
  'شهید مفتح', 'هفت تیر', 'طالقانی', 'دروازه دولت', 'سعدی', 'امام خمینی', 'پانزده خرداد', 'خیام', 'میدان محمدیه', 'شوش'];
export const PUNCHES_PER_STATION = 2;

type Reward = { coins?: number; keys?: number; booster?: 'crane' | 'whistle' | 'bay'; lives?: boolean; stars?: number };
const FREE: Reward[] = STATIONS.map((_, i) => (i % 5 === 4 ? { keys: 1 } : i % 3 === 2 ? { booster: (['bay', 'whistle', 'crane'] as const)[i % 3] } : { coins: 60 + i * 10 }));
const PREMIUM: Reward[] = STATIONS.map((_, i) => (i === STATIONS.length - 1 ? { keys: 5, coins: 2000 } : i % 4 === 3 ? { keys: 2 } : i % 4 === 1 ? { booster: (['crane', 'bay', 'whistle'] as const)[i % 3] } : i % 6 === 0 ? { lives: true, coins: 150 } : i % 4 === 2 ? { stars: 3 } : { coins: 200 + i * 20 }));

const monthKey = () => new Date().toISOString().slice(0, 7);

/** This month's card (a new month starts a fresh one). */
export function pass() {
  if (save.pass.month !== monthKey()) save.pass = { month: monthKey(), punches: 0, free: [], prem: [], premium: false };
  return save.pass;
}
export const stationOf = (punches: number) => Math.min(STATIONS.length, Math.floor(punches / PUNCHES_PER_STATION));

/** One punch per new Journey win; returns true when it reached a new station. */
export function punch(): boolean {
  const p = pass();
  if (stationOf(p.punches) >= STATIONS.length) return false;
  const before = stationOf(p.punches);
  p.punches++; persist();
  return stationOf(p.punches) > before;
}

/** Rewards waiting to be collected. */
export const passReady = () => {
  const p = pass(), at = stationOf(p.punches);
  let n = 0;
  for (let i = 0; i < at; i++) { if (!p.free.includes(i)) n++; if (p.premium && !p.prem.includes(i)) n++; }
  return n;
};

const label = (r: Reward) => [
  r.coins ? `${emo('🪙', 'emo xs')}${faNum(r.coins)}` : '', r.keys ? `${emo('🔑', 'emo xs')}${fa(r.keys)}` : '',
  r.booster ? emo({ crane: '🏗️', whistle: '👮', bay: '🅿️' }[r.booster], 'emo xs') : '', r.lives ? `${emo('❤️', 'emo xs')}پر` : '', r.stars ? `${emo('⭐', 'emo xs')}${fa(r.stars)}` : '',
].filter(Boolean).join(' ');

function grant(r: Reward) {
  if (r.coins) save.coins += r.coins;
  if (r.keys) addKeys(r.keys);
  if (r.booster) save.boosters[r.booster]++;
  if (r.lives) addLives(MAX_LIVES);
  if (r.stars) save.agency.stars += r.stars;
  persist();
}

export function showPass(onChange: () => void, onClose: () => void) {
  const p = pass();
  const c = h('div', 'pass');
  const close = modal(c, 'pop pass-card');
  const draw = () => {
    const at = stationOf(p.punches), into = p.punches % PUNCHES_PER_STATION;
    const days = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate() + 1;
    c.innerHTML = `<div class="ticket"><div class="tk-logo">${emo('🚇', 'emo')} مترو تهران</div><b>کارت بلیت ماه</b><small>خط یک، ${fa(days)} روز تا آخر ماه</small>
      <div class="tk-punch">${Array.from({ length: PUNCHES_PER_STATION }, (_, k) => `<i class="${k < into ? 'on' : ''}"></i>`).join('')}<span>تا ایستگاه بعد</span></div></div>`;
    const line = h('div', 'mline');
    STATIONS.forEach((name, i) => {
      const reached = i < at;
      const row = h('div', `st ${reached ? 'reached' : ''} ${i === at ? 'next' : ''}`);
      const cell = (r: Reward, premium: boolean) => {
        const claimed = (premium ? p.prem : p.free).includes(i);
        const can = reached && !claimed && (!premium || p.premium);
        const el = h('button', `rw ${premium ? 'prem' : 'free'} ${claimed ? 'got' : ''} ${can ? 'can' : ''} ${premium && !p.premium ? 'locked' : ''}`, claimed ? emo('✅', 'emo xs') : label(r));
        el.onclick = () => {
          if (!can) { haptic('warn'); return; }
          (premium ? p.prem : p.free).push(i); grant(r); onChange();
          coin(); coin(0.1); haptic('success');
          draw();
        };
        return el;
      };
      row.append(cell(FREE[i], false), h('span', 'dot', ''), h('span', 'nm', name), cell(PREMIUM[i], true));
      line.append(row);
    });
    c.append(h('div', 'mhead', '<span>رایگان</span><span></span><span>ایستگاه</span><span>طلایی</span>'), line);
    if (!p.premium && iapAvailable()) {
      const prod = PRODUCTS.find((x) => x.sku === 'pass')!;
      c.append(button(`${emo('🎫', 'emo sm')} کارت طلایی این ماه، ${priceLabel(prod)}`, 'gold big', async () => {
        if (await buy('pass')) { p.premium = true; persist(); haptic('success'); draw(); }
      }));
    }
    c.append(button('بستن', 'ghost', () => { close(); onClose(); }));
    // Scroll to the next station.
    requestAnimationFrame(() => (line.querySelector('.next') as HTMLElement | null)?.scrollIntoView({ block: 'center' }));
  };
  draw();
}
