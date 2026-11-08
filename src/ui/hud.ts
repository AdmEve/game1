/** The DOM layer over the 3D view: top bar, booster bar, toasts and the modal screens. */
import { click } from '../audio';
import { save } from '../save';
import { icon } from './icons';

export const fa = (n: number | string) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);
export const faNum = (n: number) => fa(n.toLocaleString('en-US'));

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', html = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

export type BoosterId = 'crane' | 'whistle' | 'bay';
export const BOOSTERS: { id: BoosterId; name: string; icon: string; price: number; hint: string }[] = [
  { id: 'bay', name: 'جای پارک', icon: 'parking', price: 300, hint: 'یه جای پارک اضافه باز می‌شه' },
  { id: 'whistle', name: 'سوت پلیس', icon: 'whistle', price: 250, hint: 'مسافرها به ترتیب ماشین‌های منتظر صف می‌کشن' },
  { id: 'crane', name: 'جرثقیل', icon: 'crane', price: 400, hint: 'یه ماشین رو انتخاب کن تا جرثقیل برش داره' },
];

export class Hud {
  readonly root = h('div', 'hud');
  private coins = h('button', 'pill coins');
  private plate = h('div', 'plate');
  private people = h('div', 'pill people');
  private limit = h('div', 'pill limit hidden');
  private bar = h('div', 'boosters');
  private toastEl = h('div', 'toast');
  private camSign = h('div', 'camsign hidden');
  private copSign = h('div', 'camsign cop hidden');
  private btns = new Map<BoosterId, HTMLButtonElement>();
  onBooster: (id: BoosterId) => void = () => {};
  onSettings: () => void = () => {};
  onCoins: () => void = () => {};

  constructor(parent: HTMLElement) {
    const top = h('div', 'topbar');
    const gear = h('button', 'iconbtn gear', icon('settings'));
    gear.onclick = () => { click(); this.onSettings(); };
    this.coins.onclick = () => { click(); this.onCoins(); };
    top.append(gear, this.plate, this.coins);
    this.root.append(top, this.people, this.limit, this.camSign, this.copSign, this.bar, this.toastEl);
    for (const b of BOOSTERS) {
      const el = h('button', `bst bst-${b.id}`);
      el.onclick = () => { click(); this.onBooster(b.id); };
      this.btns.set(b.id, el);
      this.bar.append(el);
    }
    parent.append(this.root);
    this.refresh();
  }

  setLevel(n: number, tag?: string) {
    this.plate.className = 'plate' + (tag ? ' plate-' + tag : '');
    this.plate.innerHTML = `<span class="ir"><i></i><b>IR</b></span><span class="lv"><small>${tag === 'boss' ? 'مرحله‌ی رئیس' : tag === 'hard' ? 'مرحله‌ی سخت' : 'مرحله'}</small>${fa(n)}</span>`;
  }
  /** «طرح زوج و فرد» sign: which plates may leave and how many exits until it switches. */
  setParity(p: 0 | 1 | null, left: number) {
    this.camSign.classList.toggle('hidden', p === null);
    if (p === null) return;
    const dots = Array.from({ length: Math.max(0, left) }, () => '<i></i>').join('');
    this.camSign.className = 'camsign ' + (p ? 'odd' : 'even');
    this.camSign.innerHTML = `${icon('camera')}<span>طرح <b>${p ? 'فرد' : 'زوج'}</b></span><span class="dots">${dots}</span>`;
  }
  /** «پلیس راهور» sign: which direction may go. */
  setOfficer(axis: 'v' | 'h' | null) {
    this.copSign.classList.toggle('hidden', axis === null);
    if (!axis) return;
    this.copSign.innerHTML = `${icon('shield')}<span>نوبت <b>${axis === 'v' ? 'عمودی‌ها ↕' : 'افقی‌ها ↔'}</b></span>`;
    this.copSign.classList.remove('pulse'); void this.copSign.offsetWidth; this.copSign.classList.add('pulse');
  }
  setEvent(title: string, icon: string) {
    this.plate.className = 'plate plate-rush plate-yalda';
    this.plate.innerHTML = `<span class="ir"><i></i><b>IR</b></span><span class="lv"><small>${title}</small>${icon}</span>`;
  }
  setRush() {
    this.plate.className = 'plate plate-rush';
    this.plate.innerHTML = `<span class="ir"><i></i><b>IR</b></span><span class="lv"><small>چالش روزانه</small>${icon('clock')}</span>`;
  }
  /** Hard-mode counters: seconds left and/or taps left (null hides that part). */
  setLimits(time: number | null, moves: number | null) {
    this.limit.classList.toggle('hidden', time === null && moves === null);
    const low = (time !== null && time <= 10) || (moves !== null && moves <= 3);
    this.limit.classList.toggle('low', low);
    const t = time === null ? '' : `<span class="lim">${icon('timer')}<b>${fa(time)}</b></span>`;
    const m = moves === null ? '' : `<span class="lim">${icon('tap')}<b>${fa(moves)}</b><small>حرکت</small></span>`;
    this.limit.innerHTML = t + m;
  }
  setQueue(n: number, total = n) {
    const pct = total ? Math.round(((total - n) / total) * 100) : 0;
    this.people.innerHTML = `${icon('person')}<b>${fa(n)}</b><span>مسافر</span><span class="pbar"><i style="width:${pct}%"></i></span>`;
  }
  refresh() {
    this.coins.innerHTML = `${icon('coin', 'ico coin')}<b>${faNum(save.coins)}</b><i class="plus">+</i>`;
    for (const b of BOOSTERS) {
      const n = save.boosters[b.id];
      this.btns.get(b.id)!.innerHTML = `<span class="ic">${icon(b.icon)}</span><span class="nm">${b.name}</span>` +
        (n > 0 ? `<span class="cnt">${fa(n)}</span>` : `<span class="cnt buy">${icon('coin', 'ico coin')}${fa(b.price)}</span>`);
    }
  }
  active(id: BoosterId | null) { for (const [k, b] of this.btns) b.classList.toggle('on', k === id); }
  bump(id: BoosterId) { const b = this.btns.get(id)!; b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse'); }
  toast(text: string, ms = 1400) {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('show');
    clearTimeout((this.toastEl as unknown as { t: number }).t);
    (this.toastEl as unknown as { t: number }).t = window.setTimeout(() => this.toastEl.classList.remove('show'), ms);
  }
  show(on: boolean) { this.root.classList.toggle('hidden', !on); }
}

/** A modal card. Returns a close function. */
export function modal(content: HTMLElement, cls = ''): () => void {
  const back = h('div', 'modal-back');
  const card = h('div', 'card ' + cls);
  card.append(content);
  back.append(card);
  document.body.append(back);
  // Commit the start state, then animate in (transform and opacity only: the compositor runs it).
  void back.offsetWidth;
  back.classList.add('in');
  let closed = false;
  return () => {
    if (closed) return; closed = true;
    back.classList.remove('in'); back.classList.add('out');
    setTimeout(() => back.remove(), 200);
  };
}

export function button(label: string, cls: string, on: () => void) {
  const b = h('button', 'btn ' + cls, label);
  b.onclick = () => { click(); on(); };
  return b;
}

/** Marks the button that Android's back button (and Escape) presses on its card: close, later, continue… */
export function asBack<T extends HTMLElement>(b: T): T { b.dataset.back = ''; return b; }

/** The topmost card that is open (not closing), or null. */
export function topCard(): HTMLElement | null {
  const open = document.querySelectorAll<HTMLElement>('.modal-back:not(.out)');
  return open[open.length - 1] ?? null;
}

/**
 * Back on the top card: press its back button. A card without one (a choice that must be made, like the lose
 * card) stays and gives a small shake. Returns false when no card is open.
 */
export function backPress(): boolean {
  const top = topCard();
  if (!top) return false;
  const marked = top.querySelectorAll<HTMLButtonElement>('[data-back]:not([disabled])');
  const b = marked[marked.length - 1];
  if (b) b.click();
  else { const card = top.querySelector('.card'); card?.classList.remove('nudge'); void (card as HTMLElement | null)?.offsetWidth; card?.classList.add('nudge'); }
  return true;
}

/** A short note that shows over any screen (the HUD's toast is hidden under menus). */
export function note(text: string, ms = 1800) {
  const n = h('div', 'note', text);
  document.body.append(n);
  void n.offsetWidth; n.classList.add('show');
  setTimeout(() => { n.classList.remove('show'); setTimeout(() => n.remove(), 300); }, ms);
}
