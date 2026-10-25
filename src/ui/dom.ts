import { sfx } from '../audio';
import { rich } from './emoji';

type Attrs = Record<string, unknown> & { class?: string; html?: string; text?: string; style?: string };
type Child = Node | string | null | undefined | false;

/** Tiny element builder: h('div', {class:'x', onclick}, child, …). */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...kids: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = String(v);
    else if (k === 'html') el.innerHTML = String(v);
    else if (k === 'text') el.textContent = String(v);
    else if (k === 'style') el.setAttribute('style', String(v));
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
    else el.setAttribute(k, String(v));
  }
  for (const c of kids) {
    if (c === null || c === undefined || c === false) continue;
    el.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return el;
}

/** Element whose content is rich text (emoji → images). */
export function rt<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text: string): HTMLElementTagNameMap[K] {
  return h(tag, { class: cls, html: rich(text) });
}

export function btn(label: string, onclick: () => void, cls = 'btn'): HTMLButtonElement {
  return h('button', {
    class: cls,
    html: rich(label),
    onclick: (e: Event) => {
      e.stopPropagation();
      sfx('tap');
      onclick();
    },
  });
}

// ───────── layers: sheets and modals ─────────

export interface Layer {
  el: HTMLElement;
  close: () => void;
  /** Called by the back button; return false to keep it open. */
  onBack?: () => boolean;
}

export const layers: Layer[] = [];

function root(): HTMLElement {
  return document.getElementById('layers')!;
}

export function closeTop(): boolean {
  const l = layers[layers.length - 1];
  if (!l) return false;
  if (l.onBack && !l.onBack()) return true;
  l.close();
  return true;
}

export function closeAll() {
  while (layers.length) layers[layers.length - 1].close();
}

/** Bottom sheet with a title; content is filled by the caller. */
export function sheet(title: string, opts: { full?: boolean; onClose?: () => void } = {}): { body: HTMLElement; close: () => void; setTitle: (t: string) => void } {
  sfx('open');
  const titleEl = rt('div', 'sheet-title', title);
  const body = h('div', { class: 'sheet-body' });
  const panel = h('div', { class: `sheet ${opts.full ? 'sheet-full' : ''}` },
    h('div', { class: 'sheet-head' }, titleEl, h('button', { class: 'x', 'aria-label': 'بستن', html: '✕', onclick: () => close() })),
    body);
  const back = h('div', { class: 'backdrop', onclick: (e: Event) => { if (e.target === back) close(); } }, panel);
  root().append(back);
  requestAnimationFrame(() => back.classList.add('in'));
  let closed = false;
  const layer: Layer = { el: back, close: () => close() };
  layers.push(layer);
  function close() {
    if (closed) return;
    closed = true;
    const i = layers.indexOf(layer);
    if (i >= 0) layers.splice(i, 1);
    back.classList.remove('in');
    back.classList.add('out');
    setTimeout(() => back.remove(), 220);
    opts.onClose?.();
  }
  return { body, close, setTitle: (t) => { titleEl.innerHTML = rich(t); } };
}

/** Centered card. `locked` modals can't be dismissed by tapping outside or back. */
export function modal(content: HTMLElement, opts: { locked?: boolean; cls?: string; onClose?: () => void } = {}): { close: () => void; card: HTMLElement } {
  const card = h('div', { class: `card modal ${opts.cls ?? ''}` }, content);
  const back = h('div', { class: 'backdrop center', onclick: (e: Event) => { if (e.target === back && !opts.locked) close(); } }, card);
  root().append(back);
  requestAnimationFrame(() => back.classList.add('in'));
  let closed = false;
  const layer: Layer = { el: back, close: () => close(), onBack: () => !opts.locked };
  layers.push(layer);
  function close() {
    if (closed) return;
    closed = true;
    const i = layers.indexOf(layer);
    if (i >= 0) layers.splice(i, 1);
    back.classList.remove('in');
    back.classList.add('out');
    setTimeout(() => back.remove(), 200);
    opts.onClose?.();
  }
  return { close, card };
}

/** Yes/no question. */
export function ask(question: string, yes = 'آره', no = 'نه'): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: boolean) => { if (!done) { done = true; m.close(); resolve(v); } };
    const m = modal(h('div', { class: 'ask' },
      rt('p', 'ask-q', question),
      h('div', { class: 'row' }, btn(yes, () => finish(true), 'btn primary'), btn(no, () => finish(false), 'btn ghost'))), { onClose: () => finish(false) });
  });
}

let toastTimer = 0;
export function toast(text: string) {
  let t = document.getElementById('toast');
  if (!t) {
    t = h('div', { id: 'toast' });
    document.body.append(t);
  }
  t.innerHTML = rich(text);
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => t!.classList.remove('show'), 2400);
}

export function clear(el: HTMLElement) {
  while (el.firstChild) el.firstChild.remove();
}
