/**
 * «قلک»: a clay money box. Every new Journey win drops a few coins in; once it holds enough it can be
 * broken open with a small purchase. The coins are always shown before buying.
 */
import { coin } from '../audio';
import { haptic } from '../haptics';
import { PRODUCTS } from '../config';
import { buy, iapAvailable, priceLabel } from '../monetize';
import { persist, save } from '../save';
import { button, faNum, h, modal } from './hud';

export const PIGGY_PER_WIN = 40, PIGGY_MIN = 1000, PIGGY_MAX = 4000;
/** Levels before this (0-based) don't fill it, so it appears once players are settled in. */
export const PIGGY_FROM = 10;

/** Drop a win's coins in; returns how many went in (0 when full or too early). */
export function fillPiggy(level: number): number {
  if (level < PIGGY_FROM || save.piggy >= PIGGY_MAX) return 0;
  const add = Math.min(PIGGY_PER_WIN, PIGGY_MAX - save.piggy);
  save.piggy += add; persist();
  return add;
}

/** The clay money box, filled to `k` (0–1). */
export function piggyArt(k: number, cls = '') {
  const y = 86 - 52 * k;
  return `<svg class="piggy ${cls}" viewBox="0 0 120 110" aria-hidden="true">
    <defs><clipPath id="pgc"><ellipse cx="60" cy="62" rx="44" ry="38"/></clipPath>
      <radialGradient id="pgg" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#e9a36b"/><stop offset=".6" stop-color="#c0703a"/><stop offset="1" stop-color="#8a4a22"/></radialGradient></defs>
    <ellipse cx="60" cy="102" rx="34" ry="5" fill="rgba(0,0,0,.18)"/>
    <ellipse cx="60" cy="62" rx="44" ry="38" fill="url(#pgg)"/>
    <g clip-path="url(#pgc)" opacity=".9"><rect x="10" y="${y}" width="100" height="80" fill="#f5c542"/>${[20, 38, 56, 74, 92].map((x, i) => `<circle cx="${x}" cy="${y + 4 + (i % 2) * 4}" r="7" fill="#fbbf24" stroke="#b7791f" stroke-width="2"/>`).join('')}</g>
    <ellipse cx="60" cy="62" rx="44" ry="38" fill="none" stroke="#7a3d1a" stroke-width="3"/>
    <path d="M22 50 Q60 40 98 50" stroke="#f3d3b0" stroke-width="3" fill="none" opacity=".7"/>
    <path d="M24 70 Q60 80 96 70" stroke="#7a3d1a" stroke-width="2" fill="none" opacity=".6"/>
    <rect x="44" y="18" width="32" height="10" rx="4" fill="#a85a2a" stroke="#7a3d1a" stroke-width="2"/>
    <rect x="50" y="21" width="20" height="4" rx="2" fill="#3b1d0a"/>
  </svg>`;
}

export function showPiggy(onChange: () => void, onClose: () => void) {
  const p = PRODUCTS.find((x) => x.sku === 'piggy')!;
  const k = save.piggy / PIGGY_MAX, ready = save.piggy >= PIGGY_MIN;
  const c = h('div', 'piggy-card');
  c.innerHTML = `<h2>قلک سفالی</h2>${piggyArt(k, 'big')}<div class="pamt">🪙 <b>${faNum(save.piggy)}</b> <small>از ${faNum(PIGGY_MAX)}</small></div>
    <p>${ready ? 'قلکت آماده‌ی شکستنه! همه‌ی این سکه‌ها مال تو.' : `با بردن هر مرحله ${faNum(PIGGY_PER_WIN)} سکه می‌ره تو قلک. از ${faNum(PIGGY_MIN)} سکه به بعد می‌تونی بشکنیش.`}</p>`;
  const close = modal(c, 'pop');
  if (iapAvailable()) {
    const b = button(`بشکنش! ${priceLabel(p)}`, ready ? 'gold big' : 'ghost', async () => {
      if (!ready) { haptic('warn'); return; }
      const got = save.piggy;
      if (await buy('piggy')) {
        persist(); onChange();
        c.querySelector('svg')!.classList.add('broken');
        c.querySelector('.pamt')!.innerHTML = `🪙 <b dir="ltr">+${faNum(got)}</b>`;
        for (let i = 0; i < 8; i++) coin(i * 0.07);
        haptic('success');
        b.remove();
      }
    });
    c.append(b);
  }
  c.append(button('بستن', 'ghost', () => { close(); onClose(); }));
}
