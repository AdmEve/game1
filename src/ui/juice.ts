/**
 * Reward motion for the cards: numbers that count up, and coins that fly from a reward to the wallet. Both
 * run on transform/opacity (the Web Animations API, so the compositor plays them) and cost nothing once done.
 */
import { coin } from '../audio';
import { haptic } from '../haptics';
import { h } from './hud';
import { emo } from './emoji';

const reduced = () => document.documentElement.classList.contains('reduce-motion');

/** Count a number up to `to` with an ease-out; `fmt` renders it. */
export function countUp(el: HTMLElement, from: number, to: number, ms = 700, fmt: (v: number) => string = String): Promise<void> {
  if (reduced() || ms <= 0) { el.textContent = fmt(to); return Promise.resolve(); }
  return new Promise((done) => {
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms), e = 1 - (1 - k) ** 3;
      el.textContent = fmt(Math.round(from + (to - from) * e));
      if (k < 1) requestAnimationFrame(step); else done();
    };
    requestAnimationFrame(step);
  });
}

/**
 * `n` coins fly from one element to another along a gentle arc, staggered; `onLand(i)` runs as each arrives
 * (with a coin chime). Resolves when the last one has landed.
 */
export function flyCoins(from: Element, to: Element, n: number, onLand: (i: number) => void): Promise<void> {
  const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
  const x0 = a.left + a.width / 2, y0 = a.top + a.height / 2, x1 = b.left + 22, y1 = b.top + b.height / 2;
  if (reduced()) { for (let i = 0; i < n; i++) onLand(i); coin(); return Promise.resolve(); }
  const all: Promise<void>[] = [];
  for (let i = 0; i < n; i++) {
    const c = h('div', 'flycoin', emo('🪙', 'emo'));
    document.body.append(c);
    const jx = (Math.random() - 0.5) * 60, jy = (Math.random() - 0.5) * 30;
    // Out a little from the reward first, then up and over to the wallet.
    const mx = x0 + jx + (x1 - x0) * 0.25, my = Math.min(y0, y1) + (y0 - y1) * 0.35 - 40;
    const anim = c.animate([
      { transform: `translate(${x0 + jx}px, ${y0 + jy}px) scale(.4)`, opacity: 0 },
      { transform: `translate(${x0 + jx * 1.4}px, ${y0 + jy - 18}px) scale(1.05)`, opacity: 1, offset: 0.18 },
      { transform: `translate(${mx}px, ${my}px) scale(.95)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${x1}px, ${y1}px) scale(.6)`, opacity: 0.9 },
    ], { duration: 720, delay: 40 + i * 70, easing: 'cubic-bezier(.45, .05, .55, .95)', fill: 'both' });
    all.push(anim.finished.then(() => { c.remove(); onLand(i); coin(); if (i === n - 1) haptic('light'); }, () => { c.remove(); }));
  }
  return Promise.all(all).then(() => {});
}

/** A wallet pill over the cards (the HUD's own sits under the card's backdrop). Returns it and a remover. */
export function floatingWallet(anchor: Element | null, value: string): { el: HTMLElement; set: (v: string) => void; remove: () => void } {
  const r = anchor?.getBoundingClientRect();
  const el = h('div', 'pill coins wallet-float', `${emo('🪙', 'emo')}<b dir="ltr"></b>`);
  const b = el.querySelector('b')!;
  b.textContent = value;
  if (r && r.width) { el.style.left = `${r.left}px`; el.style.top = `${r.top}px`; }
  document.body.append(el);
  void el.offsetWidth; el.classList.add('show');
  return {
    el,
    set: (v: string) => { b.textContent = v; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); },
    remove: () => { el.classList.remove('show'); setTimeout(() => el.remove(), 250); },
  };
}
