/** Showing events, choices and outcomes one after another. */
import { sfx } from '../audio';
import type { Deltas } from '../engine/ctx';
import { fa, money, moneyShort } from '../engine/fmt';
import { choose, currentEvent, type EventView, type Outcome } from '../engine/play';
import type { Life, StatKey } from '../engine/types';
import { haptic } from '../haptics';
import { meta, persist, spendGems } from '../save';
import { btn, h, modal, rt } from './dom';
import { emo } from './emoji';

export const STAT_META: Record<StatKey, { name: string; emoji: string }> = {
  happy: { name: 'شادی', emoji: '😊' },
  health: { name: 'سلامت', emoji: '❤️' },
  smarts: { name: 'هوش', emoji: '🧠' },
  looks: { name: 'قیافه', emoji: '✨' },
  rep: { name: 'آبرو', emoji: '🎖️' },
};

export function deltaChips(d: Deltas | undefined): HTMLElement | null {
  if (!d) return null;
  const chips: HTMLElement[] = [];
  for (const k of Object.keys(STAT_META) as StatKey[]) {
    const v = d[k];
    if (!v) continue;
    chips.push(h('span', { class: `chip ${v > 0 ? 'up' : 'down'}`, html: `${emo(STAT_META[k].emoji)} ${v > 0 ? '+' : '−'}${fa(Math.abs(v))}` }));
  }
  if (d.money && Math.abs(d.money) >= 1000) chips.push(h('span', { class: `chip ${d.money > 0 ? 'up' : 'down'}`, html: `${emo('💰')} ${d.money > 0 ? '+' : '−'}${moneyShort(Math.abs(d.money))}` }));
  if (!chips.length) return null;
  return h('div', { class: 'chips' }, ...chips);
}

/** Ask the shop to open when the player lacks gems. Set by the menu module. */
export const hooks = {
  openShop: () => {},
  refresh: () => {},
  afterDeath: () => {},
  openTab: (_tab: string) => {},
  openMenu: () => {},
  openAchievements: () => {},
  openMe: () => {},
};

export function needGems(n: number): boolean {
  if (meta.gems >= n) return true;
  const m = modal(h('div', { class: 'ask' },
    rt('p', 'ask-q', `برای این کار ${fa(n)} 💎 لازم داری ولی ${fa(meta.gems)} 💎 داری.`),
    btn('💎 گرفتن الماس', () => { m.close(); hooks.openShop(); }, 'btn primary')));
  return false;
}

function eventCard(ev: EventView, onPick: (i: number) => void): HTMLElement {
  const choices = ev.choices.map((c, i) => {
    const b = h('button', { class: `choice ${c.off ? 'off' : ''}`, disabled: c.off ? 'true' : undefined },
      rt('span', 'choice-label', c.label),
      c.gems ? h('span', { class: 'gem-tag', html: `${fa(c.gems)} ${emo('💎')}` }) : null,
      c.note || c.off ? rt('span', 'choice-note', c.off ? `${c.note ? c.note + ' · ' : ''}${c.off}` : c.note!) : null);
    b.addEventListener('click', () => {
      if (c.off) return;
      sfx('tap');
      haptic('light');
      onPick(i);
    });
    return b;
  });
  return h('div', { class: 'event' },
    h('div', { class: 'event-emoji', html: emo(ev.emoji || '✨', 'emo big') }),
    ev.title ? rt('div', 'event-title', ev.title) : null,
    rt('div', 'event-text', ev.text),
    deltaChips(ev.deltas),
    h('div', { class: 'choices' }, ...choices));
}

export function showOutcome(out: Outcome): Promise<void> {
  return new Promise((resolve) => {
    if (!out.text) { resolve(); return; }
    const d = out.deltas;
    const good = Object.entries(d).reduce((s, [k, v]) => s + (k === 'money' ? Math.sign(v ?? 0) * 2 : v ?? 0), 0);
    sfx(out.died ? 'death' : good > 3 ? 'good' : good < -3 ? 'bad' : 'tap');
    let done = false;
    const m = modal(h('div', { class: 'outcome' },
      out.emoji ? h('div', { class: 'event-emoji small', html: emo(out.emoji, 'emo big') }) : null,
      rt('div', 'event-text', out.text),
      deltaChips(d),
      btn('ادامه', () => finish(), 'btn primary wide')), { onClose: () => finish() });
    function finish() {
      if (done) return;
      done = true;
      m.close();
      resolve();
    }
  });
}

/** Show every queued event of this year, one at a time. */
export async function runQueue(L: Life): Promise<void> {
  for (let guard = 0; guard < 20; guard++) {
    if (L.dead) break;
    const ev = currentEvent(L);
    if (!ev) break;
    const idx = await new Promise<number>((resolve) => {
      sfx('open');
      const m = modal(eventCard(ev, (i) => {
        const c = ev.choices[i];
        if (c.gems && !needGems(c.gems)) return;
        if (c.gems) spendGems(c.gems);
        m.close();
        resolve(i);
      }), { locked: true, cls: 'event-modal' });
    });
    const out = choose(L, idx);
    persist();
    hooks.refresh();
    if (!ev.notice) await showOutcome(out);
  }
  persist();
  hooks.refresh();
  if (L.dead) hooks.afterDeath();
}

export function moneyText(n: number) {
  return money(n);
}
