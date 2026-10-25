/** Home screen, new-life setup, graveyard, achievements, shop, settings and «قدرت سرنوشت». */
import { sfx } from '../audio';
import { PRODUCTS } from '../config';
import { CITIES } from '../content/cities';
import { FEMALE, LAST, MALE } from '../content/names';
import { TRAITS } from '../content/traits';
import { ACHS } from '../engine/achieve';
import { fa, money } from '../engine/fmt';
import { CLASS_NAMES, newLife } from '../engine/life';
import type { Gender, Life, StatKey } from '../engine/types';
import { buy, iapAvailable, priceLabel, rateApp, rewardedAvailable, showRewarded } from '../monetize';
import { meta, persist, today } from '../save';
import { btn, clear, closeAll, h, modal, rt, sheet, toast } from './dom';
import { avatarEmoji, emo } from './emoji';
import { STAT_META, hooks } from './flow';
import { currentLife } from './game';
import { shareObituary } from './death';

export const app = { play: (_L: Life) => {}, home: () => {} };

// ───────── home ─────────

export function showHome() {
  closeAll();
  const screen = document.getElementById('screen')!;
  clear(screen);
  const L = meta.life;
  const hero = h('div', { class: 'hero' },
    h('div', { class: 'hero-emoji', html: ['👶', '🎒', '🎓', '💍', '👴'].map((e) => emo(e, 'emo hero-e')).join('') }),
    h('h1', { class: 'title', text: 'زندگی ایرونی' }),
    h('div', { class: 'tagline', text: 'از تولد تا پیری؛ کنکور، سربازی، خواستگاری، مهاجرت… هر تصمیمی با خودته!' }));
  const buttons = h('div', { class: 'home-btns' },
    L && !L.dead ? btn(`▶️ ادامه‌ی زندگی ${L.first} (${fa(L.age)} ساله)`, () => app.play(L), 'btn primary big') : null,
    btn('👶 یه زندگی جدید', () => newLifeSheet(), L && !L.dead ? 'btn ghost big' : 'btn primary big'),
    h('div', { class: 'row' },
      btn('🪦 بهشت زهرا', () => graveyard(), 'btn ghost'),
      btn('🏅 نشان‌ها', () => achievements(), 'btn ghost')),
    h('div', { class: 'row' },
      btn('💎 فروشگاه', () => shop(), 'btn gold'),
      btn('⚙️ تنظیمات', () => settings(), 'btn ghost')));
  screen.append(h('div', { class: 'home' }, hero, buttons, h('div', { class: 'home-foot', html: `${fa(meta.stats.lives)} زندگی · ${fa(meta.stats.years)} سال زندگی‌شده` })));
  dailyGift();
}

function dailyGift() {
  if (meta.daily.last === today()) return;
  const y = new Date(Date.now() - 86400000);
  const yesterday = `${y.getFullYear()}-${y.getMonth() + 1}-${y.getDate()}`;
  meta.daily.streak = meta.daily.last === yesterday ? (meta.daily.streak % 7) + 1 : 1;
  meta.daily.last = today();
  const gift = [2, 2, 3, 3, 4, 5, 10][meta.daily.streak - 1] + (meta.owned.vip ? 5 : 0);
  meta.gems += gift;
  persist();
  setTimeout(() => {
    const m = modal(h('div', { class: 'ask' },
      h('div', { class: 'event-emoji', html: emo('🎁', 'emo big') }),
      rt('div', 'event-title', `هدیه‌ی روز ${fa(meta.daily.streak)}`),
      rt('p', 'ask-q', `${fa(gift)} 💎 گرفتی!${meta.owned.vip ? ' (۵ تاش هدیه‌ی VIP)' : ''} هر روز بیا، روز هفتم ۱۰ الماس!`),
      btn('مرسی!', () => m.close(), 'btn primary wide')));
    sfx('coin');
  }, 500);
}

// ───────── new life ─────────

function newLifeSheet() {
  const s = sheet('👶 یه زندگی جدید', { full: true });
  let gender: Gender = Math.random() < 0.5 ? 'm' : 'f';
  let first = '';
  let last = LAST[Math.floor(Math.random() * LAST.length)];
  let city = '';
  let rich = -1;
  const traits: string[] = [];
  const vip = meta.owned.vip;
  const pickName = () => { first = (gender === 'm' ? MALE : FEMALE)[Math.floor(Math.random() * (gender === 'm' ? MALE.length : FEMALE.length))]; };
  pickName();
  const render = () => {
    clear(s.body);
    s.body.append(
      h('div', { class: 'newlife-av', html: emo(avatarEmoji(0, gender, 1), 'emo big') }),
      h('div', { class: 'section' }, rt('div', 'section-h', '🚻 جنسیت'),
        h('div', { class: 'row' },
          btn('👦 پسر', () => { gender = 'm'; pickName(); render(); }, `btn ${gender === 'm' ? 'primary' : 'ghost'}`),
          btn('👧 دختر', () => { gender = 'f'; pickName(); render(); }, `btn ${gender === 'f' ? 'primary' : 'ghost'}`))),
      h('div', { class: 'section' }, rt('div', 'section-h', '✏️ اسم'),
        h('div', { class: 'row' },
          nameInput(first, (v) => { first = v; }),
          nameInput(last, (v) => { last = v; }),
          btn('🎲', () => { pickName(); last = LAST[Math.floor(Math.random() * LAST.length)]; render(); }, 'btn ghost sq'))),
      h('div', { class: 'section' }, rt('div', 'section-h', `📍 شهر تولد ${vip ? '' : '(👑 VIP)'}`),
        vip ? selectEl([['', '🎲 شانسی'], ...CITIES.map((c) => [c.id, `${c.name}`] as [string, string])], city, (v) => { city = v; }) : rt('div', 'act-d', 'شانسی؛ با VIP خودت انتخاب کن.')),
      h('div', { class: 'section' }, rt('div', 'section-h', `💰 وضع مالی خانواده ${meta.owned.rich_family ? '' : '(🔒 بسته‌ی خانواده‌ی پولدار)'}`),
        meta.owned.rich_family || vip
          ? selectEl([['-1', '🎲 شانسی'], ...CLASS_NAMES.map((n, i) => [String(i), n] as [string, string]).filter(([i]) => meta.owned.rich_family || +i < 4)], String(rich), (v) => { rich = +v; })
          : rt('div', 'act-d', 'شانسی؛ با بسته‌ی «خانواده‌ی پولدار» می‌تونی تو یه خانواده‌ی خیلی پولدار به دنیا بیای.')),
      h('div', { class: 'section' }, rt('div', 'section-h', `🧬 ویژگی‌ها ${meta.owned.god_mode ? '(تا ۲ تا)' : '(🔒 قدرت سرنوشت)'}`),
        meta.owned.god_mode
          ? h('div', { class: 'traits' }, ...TRAITS.map((t) => {
            const on = traits.includes(t.id);
            return btn(`${t.emoji} ${t.name}`, () => {
              if (on) traits.splice(traits.indexOf(t.id), 1);
              else if (traits.length < 2 && !traits.some((x) => t.not?.includes(x))) traits.push(t.id);
              render();
            }, `tag ${on ? 'on' : ''}`);
          }))
          : rt('div', 'act-d', 'ویژگی‌ها شانسی انتخاب می‌شن.')),
      btn('🍼 به دنیا بیا!', () => {
        const L = newLife({ gender, first: first.trim() || undefined, last: last.trim() || undefined, city: city || undefined, rich: rich >= 0 ? rich : undefined, traits: traits.length ? traits : undefined });
        L.log.push({ age: 0, year: L.year, lines: [{ t: `👶 ${L.first} ${L.last} در ${CITIES.find((c) => c.id === L.city)!.name} به دنیا اومد! بابات ${L.people.find((p) => p.rel === 'father')?.job ?? ''}ه و مامانت ${L.people.find((p) => p.rel === 'mother')?.job ?? ''}.`, k: 'big' }] });
        for (const t of L.traits) {
          const d = TRAITS.find((x) => x.id === t);
          if (d) L.log[0].lines.push({ t: `${d.emoji} ویژگی: «${d.name}» — ${d.desc}` });
        }
        meta.life = L;
        meta.prev = null;
        persist();
        s.close();
        app.play(L);
      }, 'btn primary big wide'),
    );
  };
  render();
}

function nameInput(v: string, on: (v: string) => void): HTMLInputElement {
  const i = h('input', { class: 'input', value: v, maxlength: '14' });
  i.addEventListener('input', () => on(i.value));
  return i;
}

function selectEl(opts: [string, string][], val: string, on: (v: string) => void): HTMLSelectElement {
  const s = h('select', { class: 'input' }, ...opts.map(([k, t]) => h('option', { value: k, text: t, selected: k === val ? 'selected' : undefined })));
  s.addEventListener('change', () => on(s.value));
  return s;
}

// ───────── graveyard ─────────

function graveyard() {
  const s = sheet('🪦 بهشت زهرا', { full: true });
  if (!meta.graves.length) { s.body.append(h('div', { class: 'empty', text: 'هنوز کسی اینجا نیست. اول یه زندگی کن!' })); return; }
  for (const g of meta.graves) {
    const row = h('button', { class: 'grave' },
      h('span', { class: 'p-av', html: emo(avatarEmoji(g.age, g.gender, g.skin), 'emo p-emo') }),
      h('span', { class: 'act-t' }, h('span', { class: 'act-l', text: `${g.first} ${g.last}${g.gen > 1 ? ` (نسل ${fa(g.gen)})` : ''}` }), rt('span', 'act-d', `${fa(g.age)} ساله · ${g.job} · ${g.cause}`)),
      h('span', { class: 'price', text: money(g.net) }));
    row.addEventListener('click', () => void shareObituary(g));
    s.body.append(row);
  }
  s.body.append(rt('div', 'act-d center', 'روی هر سنگ‌قبر بزنی، اعلامیه‌اش رو می‌تونی به اشتراک بذاری.'));
}

// ───────── achievements ─────────

export function achievements() {
  const s = sheet(`🏅 نشان‌ها (${fa(meta.achs.length)} از ${fa(ACHS.length)})`, { full: true });
  const L = currentLife();
  const grid = h('div', { class: 'ach-grid' });
  for (const a of ACHS) {
    const got = meta.achs.includes(a.id);
    const now = L?.ach.includes(a.id);
    grid.append(h('div', { class: `ach ${got ? 'got' : ''} ${now ? 'now' : ''}` },
      h('span', { class: 'ach-e', html: emo(got ? a.emoji : '🔒', 'emo ach-emo') }),
      h('span', { class: 'ach-n', text: a.name }),
      h('span', { class: 'ach-d', text: a.desc }),
      a.gems ? h('span', { class: 'ach-g', html: `+${fa(a.gems)} ${emo('💎')}` }) : null));
  }
  s.body.append(grid);
}

// ───────── shop ─────────

export function shop() {
  const s = sheet('💎 فروشگاه', { full: true });
  const render = () => {
    clear(s.body);
    s.body.append(h('div', { class: 'gem-balance', html: `${emo('💎')} ${fa(meta.gems)} الماس` }));
    if (rewardedAvailable()) {
      const left = meta.adGems.day === today() ? 5 - meta.adGems.count : 5;
      s.body.append(btn(`🎬 دیدن تبلیغ: +۳ 💎 (${fa(Math.max(0, left))} بار دیگه امروز)`, async () => {
        if (left <= 0) { toast('امروز دیگه نمی‌شه، فردا بیا!'); return; }
        if (await showRewarded()) {
          if (meta.adGems.day !== today()) meta.adGems = { day: today(), count: 0 };
          meta.adGems.count++;
          meta.gems += 3;
          persist();
          sfx('coin');
          toast('+۳ 💎');
          render();
          hooks.refresh();
        } else toast('تبلیغی پیدا نشد');
      }, 'btn ghost wide'));
    }
    if (!iapAvailable()) s.body.append(rt('div', 'act-d center', 'برای خرید، بازی رو از کافه‌بازار نصب کن و بازار رو باز کن.'));
    for (const p of PRODUCTS) {
      const owned = !p.consumable && (meta.owned as Record<string, boolean>)[p.sku];
      const row = h('div', { class: `product ${owned ? 'owned' : ''}` },
        h('span', { class: 'act-e', html: emo(p.emoji, 'emo act-emo') }),
        h('span', { class: 'act-t' }, h('span', { class: 'act-l', html: `${p.title}${p.badge ? ` <span class="badge">${p.badge}</span>` : ''}` }), rt('span', 'act-d', p.desc)),
        owned ? h('span', { class: 'price', text: '✓ داری' }) : btn(priceLabel(p), async () => {
          if (await buy(p.sku)) {
            sfx('big');
            toast(`${p.emoji} خرید انجام شد!`);
            const L = currentLife();
            if (L && p.sku === 'careers') L.flags.vipCareers = 1;
            persist();
            render();
            hooks.refresh();
          }
        }, 'btn buy'));
      s.body.append(row);
    }
  };
  render();
}

// ───────── settings ─────────

function settings() {
  const s = sheet('⚙️ تنظیمات');
  const render = () => {
    clear(s.body);
    const toggle = (label: string, key: 'sound' | 'haptics') =>
      btn(`${label}: ${meta.settings[key] ? 'روشن' : 'خاموش'}`, () => { meta.settings[key] = !meta.settings[key]; persist(); render(); }, 'btn ghost wide');
    s.body.append(
      toggle('🔊 صدا', 'sound'),
      toggle('📳 لرزش', 'haptics'),
      btn('⭐ امتیاز به بازی در کافه‌بازار', () => rateApp(), 'btn ghost wide'),
      rt('div', 'act-d center', 'زندگی ایرونی · ساخته‌شده با ❤️ برای ایرانی‌ها\nایموجی‌ها: Twemoji (CC-BY 4.0) · فونت: وزیرمتن'),
    );
  };
  render();
}

// ───────── in-game menu ─────────

export function gameMenu() {
  const s = sheet('🏠 منو');
  s.body.append(
    btn('🏠 صفحه‌ی اصلی', () => { s.close(); app.home(); }, 'btn ghost wide'),
    btn('💎 فروشگاه', () => { s.close(); shop(); }, 'btn gold wide'),
    btn('🏅 نشان‌ها', () => { s.close(); achievements(); }, 'btn ghost wide'),
    btn('🪦 بهشت زهرا', () => { s.close(); graveyard(); }, 'btn ghost wide'),
    btn('⚙️ تنظیمات', () => { s.close(); settings(); }, 'btn ghost wide'),
  );
}

// ───────── «قدرت سرنوشت» (god mode) ─────────

export function meSheet() {
  const L = currentLife();
  if (!L || L.dead) return;
  const s = sheet(`${L.first} ${L.last}`);
  const render = () => {
    clear(s.body);
    s.body.append(h('div', { class: 'person-card' },
      h('span', { class: 'p-av big', html: emo(avatarEmoji(L.age, L.gender, L.skin), 'emo p-emo') }),
      h('div', {}, h('div', { class: 'act-l', text: `${fa(L.age)} ساله` }), h('div', { class: 'act-d', text: L.traits.map((t) => TRAITS.find((x) => x.id === t)?.name).join('، ') }))));
    if (!meta.owned.god_mode) {
      s.body.append(rt('div', 'act-d center', '🔮 با «قدرت سرنوشت» می‌تونی آمار و ویژگی‌هات رو هر وقت خواستی عوض کنی.'), btn('🔮 قدرت سرنوشت', () => { s.close(); shop(); }, 'btn gold wide'));
      return;
    }
    for (const k of Object.keys(STAT_META) as StatKey[]) {
      const r = h('input', { type: 'range', min: '0', max: '100', value: String(L.stats[k]), class: 'range' });
      const v = h('span', { class: 'stat-v', text: fa(L.stats[k]) });
      r.addEventListener('input', () => { L.stats[k] = +r.value; v.textContent = fa(+r.value); });
      r.addEventListener('change', () => { persist(); hooks.refresh(); });
      s.body.append(h('div', { class: 'stat' }, h('span', { class: 'stat-l', html: `${emo(STAT_META[k].emoji)} ${STAT_META[k].name}` }), r, v));
    }
  };
  render();
}

export { money };
