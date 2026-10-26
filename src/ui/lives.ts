/** Lives on screen: the hearts pill with its countdown, and the «جون نداری» screen. */
import { coin } from '../audio';
import { haptic } from '../haptics';
import { MAX_LIVES, addLives, clock, lives, msToNext } from '../lives';
import { rewardedAvailable, showRewarded } from '../monetize';
import { persist, save } from '../save';
import { emo } from './emoji';
import { button, fa, h, modal } from './hud';

export const REFILL_PRICE = 900;

/** A heart pill that keeps its countdown ticking while it is on screen. */
export function livesPill(): HTMLElement {
  const el = h('span', 'lives-pill');
  const draw = () => {
    const n = lives();
    el.innerHTML = `${emo(n ? '❤️' : '💔', 'emo sm')}<b>${fa(n)}</b><small>${n >= MAX_LIVES ? 'پر' : clock(msToNext())}</small>`;
  };
  draw();
  const t = setInterval(() => { if (!el.isConnected) { clearInterval(t); return; } draw(); }, 1000);
  return el;
}

/** Out of lives: wait, refill with coins, or watch an ad for one. Resolves true when a life is available. */
export function showNoLives(onCoins: () => void): Promise<boolean> {
  return new Promise((done) => {
    const c = h('div', 'nolives');
    c.innerHTML = `<div class="burst">${emo('💔', 'emo huge')}</div><h2>جون نداری!</h2><p>هر نیم ساعت یه جون پر می‌شه. جون بعدی: <b class="t"></b></p>`;
    const t = c.querySelector('.t') as HTMLElement;
    const tick = setInterval(() => { t.textContent = clock(msToNext()); if (lives() > 0) finish(true); }, 1000);
    t.textContent = clock(msToNext());
    const close = modal(c, 'pop');
    const finish = (ok: boolean) => { clearInterval(tick); close(); done(ok); };
    c.append(button(`${emo('❤️', 'emo sm')} پر کن، ${emo('🪙', 'emo sm')} ${fa(REFILL_PRICE)}`, 'gold big', () => {
      if (save.coins < REFILL_PRICE) { haptic('warn'); c.querySelector('p')!.innerHTML = 'سکه کافی نداری! از دکه سکه بخر یا صبر کن.'; return; }
      save.coins -= REFILL_PRICE; persist(); addLives(MAX_LIVES); onCoins();
      coin(); coin(0.1); haptic('success');
      finish(true);
    }));
    if (rewardedAvailable()) {
      const ad = button(`${emo('🎬', 'emo sm')} با دیدن تبلیغ یه جون بگیر`, 'primary', async () => {
        ad.setAttribute('disabled', '');
        if (await showRewarded()) { addLives(1); finish(true); } else ad.removeAttribute('disabled');
      });
      c.append(ad);
    }
    c.append(button('صبر می‌کنم', 'ghost', () => finish(false)));
  });
}
