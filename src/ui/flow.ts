/** Showing events, choices and outcomes one after another. */
import { sfx } from '../audio';
import type { Deltas } from '../engine/ctx';
import { fa, money, moneyShort } from '../engine/fmt';
import { choose, currentEvent, type EventView, type Outcome } from '../engine/play';
import type { Life, StatKey } from '../engine/types';
import { haptic } from '../haptics';
import { meta, persist, spendGems } from '../save';
import { ask, btn, h, modal, rt } from './dom';
import { rateApp } from '../monetize';
import { emo } from './emoji';
import { haggleWhat } from '../content/actions/money';
import { drivingTest } from './driving';
import { fireJump } from './fire';
import { tvQuiz } from './tvquiz';
import { haggleGame } from './haggle';
import { konkurQuiz } from './quiz';
import { shareBoardingPass, shareKarname, shareWedding } from './share';

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

function eventCard(ev: EventView, onPick: (i: number) => void, L?: Life): HTMLElement {
  const choices = ev.choices.map((c, i) => {
    const b = h('button', { class: `choice ${c.off ? 'off' : ''}`, disabled: c.off ? 'true' : undefined },
      rt('span', 'choice-label', c.label),
      c.gems ? h('span', { class: 'gem-tag', html: `${fa(c.gems)} ${emo('💎')}` }) : null,
      c.note || c.off ? rt('span', 'choice-note', c.off ? `${c.note ? c.note + '، ' : ''}${c.off}` : c.note!) : null);
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
    ev.meter ? h('div', { class: 'meter' }, rt('span', 'meter-label', ev.meter.label), h('span', { class: 'track' }, h('span', { class: `fill ${ev.meter.v >= 60 ? 'hi' : ev.meter.v >= 35 ? 'mid' : 'low'}`, style: `width:${ev.meter.v}%` })),
      ev.meter.d ? h('span', { class: `chip ${ev.meter.d > 0 ? 'up' : 'down'}`, text: `${ev.meter.d > 0 ? '▲' : '▼'}${fa(Math.abs(ev.meter.d))}` }) : null) : null,
    deltaChips(ev.deltas),
    ev.id === 'm_konkur' && L?.queue[0]?.p ? btn('📤 اشتراک کارنامه', () => void shareKarname(L, L.queue[0].p!.rank as number, L.queue[0].p!.n as number), 'btn share small') : null,
    h('div', { class: 'choices' }, ...choices));
}

/** Once, after a really happy moment for someone who has played a while: ask for a Bazaar rating. */
export async function maybeAskRating(out: Outcome) {
  if (meta.rated || meta.rateAsked || meta.stats.years < 40 || (out.deltas.happy ?? 0) < 10 || out.died) return;
  meta.rateAsked = true;
  persist();
  if (await ask('⭐ داری خوش می‌گذرونی؟ با یه امتیاز پنج ستاره تو کافه‌بازار کلی کمکمون می‌کنی!', 'باشه، امتیاز می‌دم', 'بعداً')) rateApp();
}

/** A share button for a big moment that just happened (a move abroad), or null. */
export function momentButton(L: Life, countryBefore: string): HTMLElement | null {
  if (L.country !== countryBefore && L.country !== 'ir') return btn('📤 اشتراک کارت پرواز', () => void shareBoardingPass(L), 'btn share small');
  return null;
}

/** `extra` goes under the text (e.g. a share button). */
export function showOutcome(out: Outcome, extra?: HTMLElement | null): Promise<void> {
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
      extra ?? null,
      btn('ادامه', () => finish(), 'btn primary wide')), { onClose: () => finish() });
    function finish() {
      if (done) return;
      done = true;
      m.close();
      resolve();
    }
  });
}

const MINIGAMES: Record<string, (L: Life) => Promise<object>> = {
  driving_test: drivingTest,
  fire_jump: fireJump,
  tv_quiz: tvQuiz,
};

/** Show every queued event of this year, one at a time. */
export async function runQueue(L: Life): Promise<void> {
  for (let guard = 0; guard < 20; guard++) {
    if (L.dead) break;
    // The konkur results come after sitting the exam.
    const head = L.queue[0];
    if (head?.id === 'm_konkur' && !head.p?._prep && L.flags.konkurQuiz === undefined) {
      L.flags.konkurQuiz = await konkurQuiz(L);
      persist();
    }
    // Mini-games that settle an event: play, then take its one remaining choice.
    const game = head && MINIGAMES[head.id];
    if (head && game && !head.p?.played) {
      head.p = { ...(head.p ?? {}), ...(await game(L)), played: 1 };
      const out = choose(L, 0);
      persist();
      hooks.refresh();
      await showOutcome(out);
      continue;
    }
    // Buying a car or a house: haggle with the seller, then settle the deal.
    if (head?.id === 'haggle' && head.p && head.p.deal === undefined && !head.p.walk) {
      const r = await haggleGame(L, head.p, haggleWhat(head.p));
      Object.assign(head.p, r);
      const out = choose(L, 0);
      persist();
      hooks.refresh();
      if ('deal' in r) await showOutcome(out);
      continue;
    }
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
      }, L), { locked: true, cls: 'event-modal' });
    });
    const was = L.country;
    const out = choose(L, idx);
    persist();
    hooks.refresh();
    // Just married: offer the wedding card.
    const married = out.event === 'wedding' && L.people.some((p) => p.rel === 'spouse' && p.alive);
    if (!ev.notice) {
      await showOutcome(out, married ? btn('📤 اشتراک کارت عروسی', () => void shareWedding(L), 'btn share small') : momentButton(L, was));
      await maybeAskRating(out);
    }
  }
  persist();
  hooks.refresh();
  if (L.dead) hooks.afterDeath();
}

export function moneyText(n: number) {
  return money(n);
}
