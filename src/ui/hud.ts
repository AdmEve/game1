/** The DOM layer over the 3D view: top bar, booster bar, toasts and the modal screens. */
import { click } from '../audio';
import { save } from '../save';
import { emo } from './emoji';

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
  { id: 'bay', name: 'جای پارک', icon: '🅿️', price: 300, hint: 'یه جای پارک اضافه باز می‌شه' },
  { id: 'whistle', name: 'سوت پلیس', icon: '👮', price: 250, hint: 'مسافرها به ترتیب ماشین‌های منتظر صف می‌کشن' },
  { id: 'crane', name: 'جرثقیل', icon: '🏗️', price: 400, hint: 'یه ماشین رو انتخاب کن تا جرثقیل برش داره' },
];

export class Hud {
  readonly root = h('div', 'hud');
  private coins = h('button', 'pill coins');
  private plate = h('div', 'plate');
  private people = h('div', 'pill people');
  private bar = h('div', 'boosters');
  private toastEl = h('div', 'toast');
  private camSign = h('div', 'camsign hidden');
  private btns = new Map<BoosterId, HTMLButtonElement>();
  onBooster: (id: BoosterId) => void = () => {};
  onSettings: () => void = () => {};
  onCoins: () => void = () => {};

  constructor(parent: HTMLElement) {
    const top = h('div', 'topbar');
    const gear = h('button', 'iconbtn gear', emo('⚙️'));
    gear.onclick = () => { click(); this.onSettings(); };
    this.coins.onclick = () => { click(); this.onCoins(); };
    top.append(gear, this.plate, this.coins);
    this.root.append(top, this.people, this.camSign, this.bar, this.toastEl);
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
    this.camSign.innerHTML = `${emo('📸', 'emo sm')}<span>طرح <b>${p ? 'فرد' : 'زوج'}</b></span><span class="dots">${dots}</span>`;
  }
  setQueue(n: number) { this.people.innerHTML = `${emo('🧍')}<b>${fa(n)}</b><span>مسافر</span>`; }
  refresh() {
    this.coins.innerHTML = `${emo('🪙')}<b>${faNum(save.coins)}</b><i class="plus">+</i>`;
    for (const b of BOOSTERS) {
      const n = save.boosters[b.id];
      this.btns.get(b.id)!.innerHTML = `<span class="ic">${emo(b.icon)}</span><span class="nm">${b.name}</span>` +
        (n > 0 ? `<span class="cnt">${fa(n)}</span>` : `<span class="cnt buy">${emo('🪙', 'emo xs')}${fa(b.price)}</span>`);
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
  requestAnimationFrame(() => back.classList.add('in'));
  return () => { back.classList.remove('in'); setTimeout(() => back.remove(), 250); };
}

export function button(label: string, cls: string, on: () => void) {
  const b = h('button', 'btn ' + cls, label);
  b.onclick = () => { click(); on(); };
  return b;
}
