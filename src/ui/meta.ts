/** Meta screens: the shop «دکه», the daily gift calendar and chapter chests. */
import { coin } from '../audio';
import { PRODUCTS } from '../config';
import { haptic } from '../haptics';
import { buy, iapAvailable, priceLabel, rewardedAvailable, showRewarded } from '../monetize';
import { persist, save } from '../save';
import { emo } from './emoji';
import { BOOSTERS, button, fa, faNum, h, modal, type BoosterId } from './hud';

/** The shop, styled as a Tehran newspaper kiosk. */
export function showShop(onClose: () => void, onChange: () => void) {
  const c = h('div', 'shop');
  const head = h('div', 'kiosk-head', `<div class="awning"></div><h2>${emo('🏪')} دکه‌ی مش‌رحیم</h2><div class="wallet">${emo('🪙')}<b>${faNum(save.coins)}</b></div>`);
  c.append(head);
  const refresh = () => { (head.querySelector('.wallet b') as HTMLElement).textContent = faNum(save.coins); onChange(); };

  // Boosters for coins.
  c.append(h('h3', '', 'کمک‌ها'));
  const row = h('div', 'shop-row');
  for (const b of BOOSTERS) {
    const card = h('button', 'shop-card bst-' + b.id, `<span class="ic">${emo(b.icon)}</span><b>${b.name}</b><small>${b.hint}</small><span class="price">${emo('🪙', 'emo xs')} ${fa(b.price)}</span><span class="have">داری: ${fa(save.boosters[b.id])}</span>`);
    card.onclick = () => {
      if (save.coins < b.price) { card.classList.add('nope'); setTimeout(() => card.classList.remove('nope'), 400); haptic('warn'); return; }
      save.coins -= b.price; save.boosters[b.id as BoosterId]++; persist(); coin(); haptic('light');
      (card.querySelector('.have') as HTMLElement).textContent = `داری: ${fa(save.boosters[b.id])}`;
      refresh();
    };
    row.append(card);
  }
  c.append(row);

  // Free coins for a video.
  if (rewardedAvailable()) {
    const free = button(`${emo('🎬', 'emo sm')} دیدن تبلیغ: ${emo('🪙', 'emo sm')} ${fa(60)} سکه‌ی مجانی`, 'gold', async () => {
      free.setAttribute('disabled', '');
      if (await showRewarded()) { save.coins += 60; persist(); coin(); refresh(); }
      free.removeAttribute('disabled');
    });
    c.append(free);
  }

  // Coin packs for real money.
  if (iapAvailable()) {
    c.append(h('h3', '', 'سکه و بسته‌ها'));
    const grid = h('div', 'shop-grid');
    for (const p of PRODUCTS) {
      if (!p.consumable && save.owned[p.sku as 'starter' | 'no_ads']) continue;
      const card = h('button', 'pack' + (p.sku === 'starter' ? ' starter' : ''), `${p.badge ? `<span class="badge">${p.badge}</span>` : ''}<span class="ic">${emo(p.icon)}</span><b>${p.title}</b><small>${p.desc}</small><span class="price">${priceLabel(p)}</span>`);
      card.onclick = async () => { if (await buy(p.sku)) { coin(); haptic('success'); refresh(); if (!p.consumable) card.remove(); } };
      grid.append(card);
    }
    c.append(grid);
  }
  const close = modal(c, 'pop shop-card-wrap');
  c.append(button('بستن', 'ghost', () => { close(); onClose(); }));
}

const DAILY = [50, 80, 120, 160, 200, 250, 400];
const today = () => new Date().toISOString().slice(0, 10);
const yesterday = () => new Date(Date.now() - 864e5).toISOString().slice(0, 10);

/** Show the daily gift if today's has not been claimed. Resolves when closed. */
export function maybeDaily(onChange: () => void): Promise<void> {
  if (save.daily.day === today()) return Promise.resolve();
  const streak = save.daily.day === yesterday() ? (save.daily.streak % 7) + 1 : 1;
  return new Promise((done) => {
    const c = h('div', 'daily');
    c.innerHTML = `<h2>${emo('🎁')} هدیه‌ی روزانه</h2><p>هر روز بیا، هدیه‌ات بزرگ‌تر می‌شه!</p>`;
    const days = h('div', 'days');
    DAILY.forEach((v, i) => {
      const d = i + 1, state = d < streak ? 'got' : d === streak ? 'now' : 'later';
      days.append(h('div', `day ${state}${d === 7 ? ' big' : ''}`, `<small>روز ${fa(d)}</small>${emo(d === 7 ? '🎁' : '🪙')}<b>${fa(v)}</b>${d === 7 ? '<i>+ کمک‌ها</i>' : ''}`));
    });
    c.append(days);
    const close = modal(c, 'pop');
    c.append(button(`بگیر! ${emo('🪙', 'emo sm')} ${fa(DAILY[streak - 1])}`, 'primary big', () => {
      save.coins += DAILY[streak - 1];
      if (streak === 7) { for (const k of ['crane', 'whistle', 'bay'] as const) save.boosters[k]++; save.garage.keys++; }
      save.daily = { day: today(), streak };
      persist(); onChange();
      for (let i = 0; i < 5; i++) coin(i * 0.08);
      haptic('success');
      close(); done();
    }));
  });
}

/** A chest every five levels. */
export function showChest(onChange: () => void): Promise<void> {
  const ids: BoosterId[] = ['crane', 'whistle', 'bay'];
  const gift = ids[Math.floor(Math.random() * ids.length)];
  const coins = 150;
  return new Promise((done) => {
    const c = h('div', 'chest');
    c.innerHTML = `<h2>صندوق جایزه!</h2><div class="box">${emo('🎁', 'emo huge')}</div><div class="loot">
      <span>${emo('🪙')}<b>${fa(coins)}</b></span><span>${emo(BOOSTERS.find((b) => b.id === gift)!.icon)}<b>${fa(1)}</b></span><span>${emo('🔑')}<b>${fa(1)}</b></span></div>`;
    const close = modal(c, 'pop');
    const open = button('باز کن!', 'gold big', () => {
      c.classList.add('opened');
      open.remove();
      save.coins += coins; save.boosters[gift]++; save.garage.keys++; persist(); onChange();
      coin(); coin(0.15); haptic('success');
      c.append(button('عالیه!', 'primary', () => { close(); done(); }));
    });
    c.append(open);
  });
}

const INTROS = {
  wedding: { icon: '💐', title: 'ماشین عروس', text: 'ماشین عروس با گل تزئین شده و عجله داره! عدد روش می‌گه تا چند ماشینِ دیگه (خودش هم حساب) باید راه بیفته. اگه دیر برسه، عروسی به هم می‌خوره!' },
  cover: { icon: '🚗', title: 'چادر ماشین', text: 'بعضی ماشین‌ها زیر چادرن و رنگشون معلوم نیست. وقتی ماشین بغلی‌شون بره، باد چادر رو می‌بره!' },
  broken: { icon: '🔧', title: 'پیکان خراب', text: 'این پیکان خراب شده. عدد روش می‌گه چند تا ماشین دیگه باید برن تا مکانیک درستش کنه.' },
  vip: { icon: '🕴️', title: 'دربست!', text: 'مسافر دربستی تنها سوار یه ماشین خالیِ هم‌رنگ می‌شه و ماشین فوری راه می‌افته. براش یه ماشین خالی نگه دار!' },
  cart: { icon: '🛒', title: 'گاری میوه', text: 'گاری‌های میوه‌فروش تو پارکینگ راه افتادن! هر دو ماشینی که بره، گاری یه خونه جلو می‌ره و به دیوار که برسه برمی‌گرده. حواست باشه راه رو نبنده!' },
  officer: { icon: '👮', title: 'پلیس راهور', text: 'سر چهارراه پلیس وایستاده! هر بار فقط ماشین‌های عمودی یا فقط افقی اجازه‌ی رفتن دارن و بعد از هر ماشین عوض می‌شه. به تابلو بالای صفحه نگاه کن.' },
  courier: { icon: '🛵', title: 'پیک موتوری', text: 'پیک موتوری یه مسافر از هر رنگی رو سوار می‌کنه! وقتی جلوی صف کسی ماشینش رو نداره، پیک نجاتت می‌ده. هوشمندانه ازش استفاده کن.' },
  oddEven: { icon: '📸', title: 'طرح زوج و فرد', text: 'دوربین فقط به پلاک‌های زوج یا فقط فرد اجازه‌ی رفتن می‌ده و بعد از چند ماشین عوض می‌شه. به تابلو بالای صفحه نگاه کن!' },
} as const;

/** Mash Rahim introduces a new mechanic. */
export function showIntro(kind: keyof typeof INTROS): Promise<void> {
  const it = INTROS[kind];
  return new Promise((done) => {
    const c = h('div', 'intro');
    c.innerHTML = `<div class="new">جدید!</div><div class="burst">${emo(it.icon, 'emo huge')}</div><h2>${it.title}</h2>
      <div class="speech"><span class="who">${emo('👴', 'emo sm')} مش‌رحیم:</span> ${it.text}</div>`;
    const close = modal(c, 'pop');
    c.append(button('فهمیدم!', 'primary big', () => { close(); done(); }));
  });
}
