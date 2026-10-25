/** The main life screen: header, life log, stat bars and the bottom bar with «+۱ سال». */
import { sfx } from '../audio';
import { countryById } from '../content/cities';
import { jobById } from '../content/jobs';
import { fa, moneyShort } from '../engine/fmt';
import { cityName } from '../engine/life';
import { nextYear } from '../engine/play';
import type { Life, StatKey } from '../engine/types';
import { haptic } from '../haptics';
import { maybeInterstitial } from '../monetize';
import { collectAchievements, isVip, meta, persist, syncOwned } from '../save';
import { clear, h, layers, rt, toast } from './dom';
import { avatarEmoji, emo, rich } from './emoji';
import { STAT_META, hooks, runQueue } from './flow';

let L: Life | null = null;
let busy = false;
const els: { header?: HTMLElement; log?: HTMLElement; stats?: HTMLElement; nav?: HTMLElement; screen?: HTMLElement } = {};

export function currentLife(): Life | null {
  return L;
}

export function statusLine(L: Life): string {
  const parts: string[] = [`${fa(L.age)} ساله`];
  if (L.prison) parts.push('زندانی');
  else if (L.mil.status === 'serving') parts.push('سرباز');
  else if (L.job) parts.push(jobById(L.job.id)?.levels[L.job.level] ?? '');
  else if (L.edu.stage === 'uni') parts.push('دانشجو');
  else if (L.edu.stage === 'school') parts.push(L.edu.grade >= 13 ? 'پشت کنکوری' : `کلاس ${fa(L.edu.grade)}`);
  else if (L.edu.stage === 'pre') parts.push('پیش‌دبستانی');
  else if (L.pension) parts.push('بازنشسته');
  else if (L.age >= 18) parts.push('بیکار');
  const co = countryById(L.country);
  parts.push(co ? `${co.flag} ${co.name}` : cityName(L));
  return parts.join('، ');
}

function renderHeader() {
  if (!L || !els.header) return;
  const av = avatarEmoji(L.age, L.gender, L.skin, L.gender === 'm' && L.age >= 25 && L.born % 3 === 0);
  els.header.innerHTML = '';
  els.header.append(
    h('button', { class: 'avatar', html: emo(av, 'emo av'), onclick: () => hooks.openMe() }),
    h('div', { class: 'who' },
      h('div', { class: 'name', text: `${L.first} ${L.last}` }),
      rt('div', 'sub', statusLine(L))),
    h('div', { class: 'wallet' },
      h('button', { class: `pill money ${L.money < 0 ? 'neg' : ''}`, html: `${emo('💰')} ${moneyShort(L.money)}`, onclick: () => hooks.openTab('assets') }),
      h('button', { class: 'pill gems', html: `${emo('💎')} ${fa(meta.gems)}`, onclick: () => hooks.openShop() })),
  );
}

function renderStats() {
  if (!L || !els.stats) return;
  clear(els.stats);
  const bar = (label: string, emoji: string, v: number, cls = '') =>
    h('div', { class: `stat ${cls}`, title: label },
      h('span', { class: 'stat-top', html: `${emo(emoji)}<b>${fa(Math.round(v))}</b>` }),
      h('span', { class: 'track' }, h('span', { class: `fill ${v < 25 ? 'low' : v < 50 ? 'mid' : 'hi'}`, style: `width:${Math.max(3, v)}%` })),
      h('span', { class: 'stat-n', text: label }));
  for (const k of Object.keys(STAT_META) as StatKey[]) els.stats.append(bar(STAT_META[k].name, STAT_META[k].emoji, L.stats[k]));
  if (isVip()) {
    els.stats.append(bar('شانس', '🍀', L.luck, 'vip'), bar('پشتکار', '💪', L.grit, 'vip'));
  }
  els.stats.style.gridTemplateColumns = `repeat(${els.stats.childElementCount}, 1fr)`;
}

function renderLog(scroll = true) {
  if (!L || !els.log) return;
  const log = els.log;
  clear(log);
  const start = Math.max(0, L.log.length - 60);
  for (let i = start; i < L.log.length; i++) {
    const y = L.log[i];
    const block = h('div', { class: 'year' },
      h('div', { class: 'year-h', text: `${fa(y.age)} سالگی، ${fa(y.year)}` }));
    for (const line of y.lines) {
      if (!line.t) continue;
      block.append(h('div', { class: `line ${line.k ?? ''}`, html: rich(line.t) }));
    }
    if (block.childElementCount === 1) block.append(h('div', { class: 'line quiet', text: '…یه سال آروم گذشت.' }));
    log.append(block);
  }
  if (scroll) requestAnimationFrame(() => { log.scrollTop = log.scrollHeight; });
}

export function refresh(scroll = true) {
  renderHeader();
  renderStats();
  renderLog(scroll);
  const age = els.nav?.querySelector('.age-btn .age-n');
  if (age && L) age.textContent = fa(L.age + 1);
}

async function ageUp() {
  if (!L || busy || L.dead) return;
  if (L.queue.length) { await runQueue(L); return; }
  busy = true;
  sfx('year');
  haptic('light');
  meta.prev = JSON.stringify(L);
  nextYear(L);
  meta.stats.years++;
  syncOwned(L);
  const got = collectAchievements(L);
  persist();
  refresh();
  const btnEl = els.nav?.querySelector('.age-btn');
  btnEl?.classList.remove('pop');
  void (btnEl as HTMLElement | undefined)?.offsetWidth;
  btnEl?.classList.add('pop');
  if (got.gems) toast(`🏅 نشان جدید! +${fa(got.gems)} 💎`);
  await runQueue(L);
  const got2 = collectAchievements(L);
  if (got2.gems) toast(`🏅 نشان جدید! +${fa(got2.gems)} 💎`);
  persist();
  refresh();
  busy = false;
  if (!L.dead) void maybeInterstitial();
}

export function showGame(life: Life) {
  L = life;
  syncOwned(L);
  const screen = document.getElementById('screen')!;
  clear(screen);
  els.header = h('div', { class: 'header' });
  els.log = h('div', { class: 'log' });
  els.stats = h('div', { class: 'stats' });
  const navBtn = (emoji: string, label: string, tab: string) =>
    h('button', { class: 'nav-b', html: `${emo(emoji, 'emo nav-e')}<span>${label}</span>`, onclick: () => { sfx('tap'); hooks.openTab(tab); } });
  els.nav = h('div', { class: 'nav' },
    navBtn('💼', 'کار و درس', 'life'),
    navBtn('🎯', 'کارها', 'acts'),
    h('button', { class: 'age-btn', onclick: () => void ageUp() }, h('span', { class: 'age-plus', text: 'سال' }), h('span', { class: 'age-n', text: fa(life.age + 1) })),
    navBtn('💰', 'دارایی', 'assets'),
    navBtn('👨‍👩‍👧', 'آدم‌ها', 'people'));
  const top = h('div', { class: 'topbar' },
    h('button', { class: 'menu-b', 'aria-label': 'منو', html: emo('🏠'), onclick: () => hooks.openMenu() }),
    h('div', { class: 'brand', html: `زندگی ${emo('🇮🇷')} ایرونی` }),
    h('button', { class: 'menu-b', 'aria-label': 'نشان‌ها', html: emo('🏅'), onclick: () => hooks.openAchievements() }));
  els.screen = h('div', { class: 'game' }, top, els.header, els.stats, els.log, els.nav);
  screen.append(els.screen);
  refresh();
  if (L.dead) hooks.afterDeath();
  else if (L.queue.length) void runQueue(L);
}

export function isBusy() {
  return busy || layers.length > 0;
}

