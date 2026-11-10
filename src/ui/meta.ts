/** Meta screens: the shop «دکه», the daily gift calendar and chapter chests. */
import { coin } from '../audio';
import { PRODUCTS } from '../config';
import { helpOpen } from '../game/helps';
import { haptic } from '../haptics';
import { buy, ensureBazaar, iapAvailable, iapConfigured, priceLabel, rewardedAvailable, showRewarded } from '../monetize';
import { persist, save } from '../save';
import { RAHIM } from './characters';
import { emo } from './emoji';
import { icon } from './icons';
import { BOOSTERS, button, fa, faNum, h, modal, note, type BoosterId, asBack } from './hud';
import { PIGGY_FROM, PIGGY_MAX, PIGGY_MIN, piggyArt, showPiggy } from './piggy';

/** The shop, styled as a Tehran newspaper kiosk. */
export function showShop(onClose: () => void, onChange: () => void) {
  const c = h('div', 'shop');
  const head = h('div', 'kiosk-head', `<div class="awning"></div><h2>${emo('🏪')} دکه‌ی مش‌رحیم</h2><div class="wallet">${emo('🪙')}<b>${faNum(save.coins)}</b></div>`);
  c.append(head);
  const refresh = () => { (head.querySelector('.wallet b') as HTMLElement).textContent = faNum(save.coins); onChange(); };

  // The clay money box, once players have started filling it.
  if (save.level >= PIGGY_FROM && iapAvailable()) {
    const ready = save.piggy >= PIGGY_MIN;
    const pg = h('button', `piggy-row ${ready ? 'ready' : ''}`, `${piggyArt(save.piggy / PIGGY_MAX)}<span><b>قلک سفالی</b><small>${ready ? 'پر شده! بشکنش' : 'با هر برد پرتر می‌شه'}</small></span><span class="pamt">${emo('🪙', 'emo xs')} ${faNum(save.piggy)}</span>`);
    pg.onclick = () => { close(); showPiggy(onChange, () => showShop(onClose, onChange)); };
    c.append(pg);
  }

  // Boosters for coins.
  c.append(h('h3', '', 'کمک‌ها'));
  const row = h('div', 'shop-row');
  /** Where coins come from further down (a video, the packs), for a help the player can't afford yet. */
  let coinsAt: HTMLElement | null = null;
  for (const b of BOOSTERS) {
    const card = h('button', 'shop-card bst-' + b.id, `<span class="ic">${icon(b.icon)}</span><b>${b.name}</b><small>${b.hint}</small><span class="price">${emo('🪙', 'emo xs')} ${fa(b.price)}</span><span class="have">داری: ${fa(save.boosters[b.id])}</span>`);
    card.onclick = () => {
      if (save.coins < b.price) {
        card.classList.add('nope'); setTimeout(() => card.classList.remove('nope'), 400); haptic('warn');
        // Not just a shake: how many are missing, and where more come from (it used to say nothing).
        const short = `${fa(b.price - save.coins)} سکه‌ی دیگه لازم داری`;
        if (coinsAt) { note(short); coinsAt.scrollIntoView({ behavior: 'smooth', block: 'center' }); } else note(`${short}؛ با بردن مرحله‌ها جمع می‌شه.`, 2600);
        return;
      }
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
    coinsAt = free;
  }

  // Coin packs for real money. If Bazaar wasn't reachable when the game started, it is asked again now, so they come
  // back without a restart; a purchase under way greys the others out (one at a time), and each says how it went.
  const packsBox = h('div', 'packs-box');
  const fillPacks = () => {
    const packs = h('h3', '', 'سکه و بسته‌ها');
    const grid = h('div', 'shop-grid');
    for (const p of PRODUCTS) {
      if (p.sku === 'piggy' || p.sku === 'pass' || (!p.consumable && save.owned[p.sku as 'starter' | 'no_ads'])) continue;
      const card = h('button', 'pack' + (p.sku === 'starter' ? ' starter' : ''), `${p.badge ? `<span class="badge">${p.badge}</span>` : ''}<span class="ic">${emo(p.icon)}</span><b>${p.title}</b><small>${p.desc}</small><span class="price">${priceLabel(p)}</span>`);
      card.onclick = async () => {
        if (grid.classList.contains('busy')) return;
        grid.classList.add('busy'); card.classList.add('buying');
        const r = await buy(p.sku);
        grid.classList.remove('busy'); card.classList.remove('buying');
        if (r === 'ok') { coin(); haptic('success'); refresh(); if (!p.consumable) card.remove(); } else if (r === 'error') haptic('warn');
      };
      grid.append(card);
    }
    packsBox.replaceChildren(packs, grid);
    coinsAt ??= packs;
  };
  if (iapAvailable()) fillPacks();
  else if (iapConfigured()) {
    packsBox.append(h('p', 'packs-wait', 'در حال وصل شدن به کافه‌بازار…'));
    void ensureBazaar().then((ok) => {
      if (ok) fillPacks();
      else packsBox.replaceChildren(h('p', 'packs-wait', 'کافه‌بازار در دسترس نیست؛ برای خرید سکه، اینترنت و کافه‌بازار رو چک کن.'));
    });
  }
  c.append(packsBox);
  const close = modal(c, 'pop shop-card-wrap');
  c.append(asBack(button('بستن', 'ghost', () => { close(); onClose(); })));
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
    c.append(asBack(button(`بگیر! ${emo('🪙', 'emo sm')} ${fa(DAILY[streak - 1])}`, 'primary big', () => {
      save.coins += DAILY[streak - 1];
      if (streak === 7) { for (const k of ['crane', 'whistle', 'bay'] as const) save.boosters[k]++; save.garage.keys++; }
      save.daily = { day: today(), streak };
      persist(); onChange();
      for (let i = 0; i < 5; i++) coin(i * 0.08);
      haptic('success');
      close(); done();
    })));
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
      <span>${emo('🪙')}<b>${fa(coins)}</b></span><span>${icon(BOOSTERS.find((b) => b.id === gift)!.icon)}<b>${fa(1)}</b></span><span>${emo('🔑')}<b>${fa(1)}</b></span></div>`;
    const close = modal(c, 'pop');
    const open = asBack(button('باز کن!', 'gold big', () => {
      c.classList.add('opened');
      open.remove();
      save.coins += coins; save.boosters[gift]++; save.garage.keys++; persist(); onChange();
      coin(); coin(0.15); haptic('success');
      c.append(asBack(button('عالیه!', 'primary', () => { close(); done(); })));
    }));
    c.append(open);
  });
}

const INTROS = {
  tunnel: { icon: '🚇', title: 'تونل نیایش', text: 'هر ماشینی بره تو یه دهانه‌ی تونل، از دهانه‌ی هم‌رنگش بیرون میاد و همون‌طور ادامه می‌ده! ببین اون طرف تونل راه بازه یا نه.' },
  granny: { icon: '🛍️', title: 'حاج‌خانم با خرید', text: 'حاج‌خانم با کیسه‌های خریدش دو تا صندلی می‌گیره! فقط سوار ماشینی می‌شه که دو جای خالی کنار هم داشته باشه، وگرنه صف وایمیسته.' },
  wedding: { icon: '💐', title: 'ماشین عروس', text: 'ماشین عروس با گل تزئین شده و عجله داره! عدد روش می‌گه تا چند ماشینِ دیگه (خودش هم حساب) باید راه بیفته. اگه دیر برسه، عروسی به هم می‌خوره!' },
  cover: { icon: '🚗', title: 'چادر ماشین', text: 'بعضی ماشین‌ها زیر چادرن و رنگشون معلوم نیست. چادر فقط وقتی کنار می‌ره که ماشین راه بیفته، پس با حساب بزنشون!' },
  broken: { icon: '🔧', title: 'پیکان خراب', text: 'این پیکان خراب شده. عدد روش می‌گه چند تا ماشین دیگه باید برن تا مکانیک درستش کنه.' },
  vip: { icon: '🕴️', title: 'دربست!', text: 'مسافر دربستی تنها سوار یه ماشین خالیِ هم‌رنگ می‌شه و ماشین فوری راه می‌افته. براش یه ماشین خالی نگه دار!' },
  cart: { icon: '🛒', title: 'گاری میوه', text: 'گاری‌های میوه‌فروش تو پارکینگ راه افتادن! هر دو ماشینی که بره، گاری یه خونه جلو می‌ره و به دیوار که برسه برمی‌گرده. حواست باشه راه رو نبنده!' },
  officer: { icon: '👮', title: 'پلیس راهور', text: 'سر چهارراه پلیس وایستاده! هر بار فقط ماشین‌های عمودی یا فقط افقی اجازه‌ی رفتن دارن و بعد از هر ماشین عوض می‌شه. به تابلو بالای صفحه نگاه کن.' },
  courier: { icon: '🛵', title: 'پیک موتوری', text: 'پیک موتوری یه مسافر از هر رنگی رو سوار می‌کنه! وقتی جلوی صف کسی ماشینش رو نداره، پیک نجاتت می‌ده. هوشمندانه ازش استفاده کن.' },
  oddEven: { icon: '📸', title: 'طرح زوج و فرد', text: 'دوربین فقط به پلاک‌های زوج یا فقط فرد اجازه‌ی رفتن می‌ده و بعد از چند ماشین عوض می‌شه. به تابلو بالای صفحه نگاه کن!' },
} as const;

export type IntroKind = keyof typeof INTROS;
/** A mechanic's short name (for pointing at it on the board after its card). */
export function introTitle(kind: IntroKind): string { return INTROS[kind].title; }
/** Its picture, for the pause card's chips. */
export function introIcon(kind: IntroKind): string { return INTROS[kind].icon; }
/** In the order the Journey brings them. */
const RULES: IntroKind[] = ['cover', 'broken', 'vip', 'oddEven', 'courier', 'officer', 'cart', 'wedding', 'granny', 'tunnel'];

/**
 * A rule read again, from the pause card: Mash Rahim's card without «جدید!», with «نشونم بده» (back to the level,
 * the rule pointed at on the board) and «برگرد» (to the pause card). Every rule is shown once, at its first level;
 * a player back after a week has no other way to it (BEST_IN_MARKET_PLAN J6).
 */
export function showRule(kind: IntroKind, show: () => void) {
  const it = INTROS[kind];
  const c = h('div', 'intro rule');
  c.innerHTML = `<div class="burst">${emo(it.icon, 'emo huge')}</div><h2>${it.title}</h2>
    <div class="speech with-face">${RAHIM('sm')}<div><span class="who">مش‌رحیم:</span> ${it.text}</div></div>`;
  const close = modal(c, 'pop');
  c.append(button('نشونم بده', 'primary big', () => { close(); show(); }));
  c.append(asBack(button('برگرد', 'ghost', close)));
}

/**
 * «راهنمای بازی» (Settings): the basics (the level-start tips), the helps opened so far, and every special rule met so
 * far in full, with how many are still ahead (unmet ones stay a surprise).
 */
export function showGuide(tips: readonly string[]) {
  const c = h('div', 'guide');
  c.innerHTML = `<h2>${icon('book')} راهنمای بازی</h2>`;
  const sec = (title: string, items: string[]) => {
    if (!items.length) return;
    c.append(h('h3', '', title), h('ul', '', items.join('')));
  };
  sec('پایه', tips.map((t, i) => `<li><span class="gi n">${fa(i + 1)}</span><span>${t}</span></li>`));
  sec('کمک‌ها', BOOSTERS.filter((b) => helpOpen(b.id, save.level)).map((b) => `<li><span class="gi">${icon(b.icon)}</span><span><b>${b.name}</b>${b.hint}.</span></li>`));
  const met = RULES.filter((k) => save.seen[k]);
  sec('قانون‌های ویژه', met.map((k) => `<li><span class="gi">${emo(INTROS[k].icon, 'emo sm')}</span><span><b>${INTROS[k].title}</b>${INTROS[k].text}</span></li>`));
  const ahead = RULES.length - met.length;
  if (ahead) c.append(h('p', 'ahead', ahead === RULES.length ? 'قانون‌های ویژه کم‌کم تو مرحله‌های بعد میان!' : `${fa(ahead)} قانون ویژه‌ی دیگه تو مرحله‌های بعد منتظرته!`));
  const close = modal(c, 'pop guide-card');
  // A long card: it scrolls, with its close always in reach at the bottom (as the privacy policy).
  const foot = h('div', 'privacy-foot');
  foot.append(asBack(button('بستن', 'primary big', close)));
  c.append(foot);
}

/** Mash Rahim introduces a new mechanic. */
export function showIntro(kind: keyof typeof INTROS): Promise<void> {
  const it = INTROS[kind];
  return new Promise((done) => {
    const c = h('div', 'intro');
    c.innerHTML = `<div class="new">جدید!</div><div class="burst">${emo(it.icon, 'emo huge')}</div><h2>${it.title}</h2>
      <div class="speech with-face">${RAHIM('sm')}<div><span class="who">مش‌رحیم:</span> ${it.text}</div></div>`;
    const close = modal(c, 'pop');
    c.append(asBack(button('فهمیدم!', 'primary big', () => { close(); done(); })));
  });
}
