/** Bottom-sheet tabs: life status, activities, assets and people. */
import { GROUPS } from '../content';
import { countryById } from '../content/cities';
import { DEGREE_NAMES, TIER_NAMES, majorName, trackName } from '../content/edu';
import { jobById } from '../content/jobs';
import { TRAITS } from '../content/traits';
import { fa, gpa, money, num } from '../engine/fmt';
import { CLASS_NAMES, cityName } from '../engine/life';
import { actionOptions, actionsFor, personActs, runAction, runPersonAct, type ActionView } from '../engine/play';
import type { ActionOption } from '../engine/registry';
import type { Asset, Life, Npc } from '../engine/types';
import { assetValue, debts, netWorth } from '../engine/wealth';
import { LIFESTYLES, livingCost, rentCost, salaryOf } from '../engine/year';
import { collectAchievements, persist, spendGems } from '../save';
import { ask, btn, clear, h, rt, sheet, toast } from './dom';
import { avatarEmoji, emo, rich } from './emoji';
import { hooks, needGems, runQueue, showOutcome } from './flow';
import { currentLife } from './game';

let open: { render: () => void; close: () => void } | null = null;

function life(): Life {
  return currentLife()!;
}

function section(title: string, ...kids: (Node | null)[]): HTMLElement {
  return h('div', { class: 'section' }, rt('div', 'section-h', title), ...kids);
}

function kv(k: string, v: string): HTMLElement {
  return h('div', { class: 'kv' }, rt('span', 'k', k), rt('span', 'v', v));
}

function meter(v: number, cls = ''): HTMLElement {
  return h('span', { class: `track ${cls}` }, h('span', { class: `fill ${v < 25 ? 'low' : v < 50 ? 'mid' : 'hi'}`, style: `width:${Math.max(3, v)}%` }));
}

// ───────── actions ─────────

function actionRow(a: ActionView): HTMLElement {
  const el = h('button', { class: `act ${a.off ? 'off' : ''}` },
    h('span', { class: 'act-e', html: emo(a.def.emoji, 'emo act-emo') }),
    h('span', { class: 'act-t' }, rt('span', 'act-l', a.label), a.desc || a.off ? rt('span', 'act-d', a.off ? String(a.off) : a.desc) : null),
    a.def.gems ? h('span', { class: 'gem-tag', html: `${fa(a.def.gems)} ${emo('💎')}` }) : a.def.options ? h('span', { class: 'chev', text: '‹' }) : null);
  el.addEventListener('click', () => void doAction(a));
  return el;
}

async function doAction(a: ActionView) {
  const L = life();
  if (a.off) { toast(String(a.off)); return; }
  let opt: ActionOption | undefined;
  if (a.def.options) {
    opt = await pickOption(a);
    if (!opt) return;
  }
  const gems = opt?.gems ?? a.def.gems;
  if (gems && !needGems(gems)) return;
  if (a.def.confirm && !(await ask(typeof a.def.confirm === 'string' ? a.def.confirm : a.label))) return;
  if (gems) spendGems(gems);
  const out = runAction(L, a.def.id, opt);
  collectAchievements(L);
  persist();
  hooks.refresh();
  open?.render();
  await showOutcome(out);
  if (L.queue.length) await runQueue(L);
  open?.render();
  if (L.dead) { open?.close(); hooks.afterDeath(); }
}

function pickOption(a: ActionView): Promise<ActionOption | undefined> {
  return new Promise((resolve) => {
    let picked: ActionOption | undefined;
    const s = sheet(`${a.def.emoji} ${a.label}`, { onClose: () => resolve(picked) });
    const opts = actionOptions(life(), a.def.id);
    if (!opts.length) s.body.append(h('div', { class: 'empty', text: 'فعلاً گزینه‌ای نیست.' }));
    const sorted = [...opts.filter((o) => !o.off), ...opts.filter((o) => o.off)];
    for (const o of sorted) {
      const row = h('button', { class: `act ${o.off ? 'off' : ''}` },
        o.emoji ? h('span', { class: 'act-e', html: emo(o.emoji, 'emo act-emo') }) : null,
        h('span', { class: 'act-t' }, rt('span', 'act-l', o.label), o.desc || o.off ? rt('span', 'act-d', o.off ?? o.desc ?? '') : null),
        o.gems ? h('span', { class: 'gem-tag', html: `${fa(o.gems)} ${emo('💎')}` }) : o.cost ? h('span', { class: 'price', text: money(o.cost) }) : null);
      row.addEventListener('click', () => {
        if (o.off) { toast(o.off); return; }
        picked = o;
        s.close();
      });
      s.body.append(row);
    }
  });
}

function actionList(L: Life, group: string): HTMLElement {
  const list = actionsFor(L, group);
  const wrap = h('div', { class: 'acts' });
  if (!list.length) wrap.append(h('div', { class: 'empty', text: 'فعلاً کاری از این دسته نمی‌تونی بکنی.' }));
  for (const a of list) wrap.append(actionRow(a));
  return wrap;
}

// ───────── life tab ─────────

function lifeTab(body: HTMLElement) {
  const L = life();
  const e = L.edu;
  const eduBits: HTMLElement[] = [];
  if (e.stage === 'home') eduBits.push(kv('📚 تحصیل', 'هنوز مدرسه نمی‌ری'));
  if (e.stage === 'pre') eduBits.push(kv('📚 تحصیل', 'پیش‌دبستانی'));
  if (e.stage === 'school') {
    eduBits.push(kv('📚 کلاس', e.grade >= 13 ? 'پشت کنکور' : `${fa(e.grade)}ام`));
    eduBits.push(kv('🏫 مدرسه', { dolati: 'دولتی', gheyr: 'غیرانتفاعی', sampad: 'تیزهوشان', nemune: 'نمونه دولتی' }[e.school]));
    if (e.track) eduBits.push(kv('🧭 رشته', trackName(e.track)));
    if (e.gpa) eduBits.push(kv('📘 معدل پارسال', gpa(e.gpa)));
    eduBits.push(kv('✏️ درس امسال', e.effort >= 3 ? 'عالی' : e.effort >= 1.5 ? 'خوب' : e.effort >= 0.5 ? 'کم' : 'هیچی!'));
  }
  if (e.stage === 'uni' && e.uni) {
    eduBits.push(kv('🎓 دانشگاه', e.uni.uni));
    eduBits.push(kv('📖 رشته', `${DEGREE_NAMES[e.uni.kind]} ${majorName(e.uni.major)}`));
    eduBits.push(kv('📅 سال', `${fa(e.uni.year)} از ${fa(e.uni.length)}`));
    if (e.uni.gpa) eduBits.push(kv('📘 معدل کل', gpa(e.uni.gpa)));
    eduBits.push(kv('🏷️ نوع', TIER_NAMES[e.uni.tier]));
  }
  if (e.konkur) eduBits.push(kv('📝 رتبه‌ی کنکور', num(e.konkur.rank)));
  for (const d of e.degrees) eduBits.push(kv(`📜 ${DEGREE_NAMES[d.kind]}`, d.kind === 'diploma' ? trackName(d.major as never) || 'دیپلم' : `${majorName(d.major)}، ${d.uni}`));
  body.append(section('📚 تحصیل', ...eduBits));

  const jobBits: HTMLElement[] = [];
  if (L.job) {
    const d = jobById(L.job.id)!;
    jobBits.push(kv(`${d.emoji} شغل`, d.levels[L.job.level]));
    jobBits.push(kv('💵 حقوق ماهانه', money(salaryOf(L))));
    jobBits.push(kv('📅 سابقه', `${fa(L.year - L.job.since)} سال`));
    jobBits.push(h('div', { class: 'kv' }, rt('span', 'k', '📈 عملکرد'), meter(L.job.perf)));
  } else if (L.pension) {
    jobBits.push(kv('🪑 وضعیت', 'بازنشسته'));
    jobBits.push(kv('💵 حقوق بازنشستگی', money((L.pension * L.econ.price) / (L.flags.pensionPrice ?? 1))));
  } else jobBits.push(kv('💼 شغل', L.age < 15 ? 'هنوز بچه‌ای!' : 'نداری'));
  if (L.gender === 'm' && L.age >= 17 && L.country === 'ir') {
    const st = { na: 'هنوز نرسیده', due: 'مشمول (باید بری!)', deferred: 'معافیت تحصیلی', serving: `در حال خدمت (${fa(L.mil.months ?? 0)} ماه مونده)`, done: 'کارت پایان خدمت ✅', exempt: 'معاف ✅', bought: 'خریداری‌شده ✅', absent: 'غایب ⚠️' }[L.mil.status];
    jobBits.push(kv('🪖 سربازی', st));
  }
  body.append(section('💼 کار', ...jobBits));

  const home = { parents: 'خونه‌ی بابا اینا', rent: 'مستاجر', own: 'خونه‌ی خودت', dorm: 'خوابگاه', barracks: 'پادگان', abroad: `${countryById(L.country)?.flag ?? ''} خارج از کشور` }[L.home];
  body.append(section('🏠 زندگی',
    kv('📍 شهر', L.country === 'ir' ? cityName(L) : countryById(L.country)?.name ?? ''),
    kv('🏠 محل زندگی', home),
    L.home !== 'parents' && L.age >= 18 ? kv('🛋️ سبک زندگی', `${LIFESTYLES[L.lifestyle].name}، خرج سالانه ${money(livingCost(L) + rentCost(L))}`) : null,
    kv('👪 خانواده', CLASS_NAMES[L.flags.rich ?? 2]),
    kv('🧬 ویژگی‌ها', L.traits.map((t) => { const x = TRAITS.find((y) => y.id === t); return x ? `${x.emoji} ${x.name}` : ''; }).join('  '))));

  for (const g of ['edu', 'job', 'home']) {
    const list = actionsFor(L, g);
    if (list.length) body.append(section(`${GROUPS.find((x) => x.id === g)!.emoji} ${GROUPS.find((x) => x.id === g)!.name}`, actionList(L, g)));
  }
}

// ───────── activities tab ─────────

let actGroup = 'body';
function actsTab(body: HTMLElement) {
  const L = life();
  const groups = GROUPS.filter((g) => !['edu', 'job', 'home', 'money'].includes(g.id) && actionsFor(L, g.id).length);
  if (!groups.some((g) => g.id === actGroup)) actGroup = groups[0]?.id ?? 'body';
  const chips = h('div', { class: 'tabs' }, ...groups.map((g) => {
    const b = h('button', { class: `tab ${g.id === actGroup ? 'on' : ''}`, html: `${emo(g.emoji)} ${g.name}` });
    b.addEventListener('click', () => { actGroup = g.id; open?.render(); });
    return b;
  }));
  body.append(chips, actionList(L, actGroup));
}

// ───────── assets tab ─────────

const KIND_EMOJI: Record<string, string> = { coin: '🪙', dollar: '💵', stock: '📈', crypto: '🪙', deposit: '🏦', house: '🏠', car: '🚗', shop: '🏪' };

function assetRow(L: Life, a: Asset): HTMLElement {
  const v = assetValue(L, a);
  const gain = a.paid > 0 ? v / a.paid - 1 : 0;
  const label = a.kind === 'coin' ? `${fa(a.qty)} سکه‌ی طلا` : a.kind === 'dollar' ? `${num(a.qty)} دلار` : a.name;
  return h('div', { class: 'asset' },
    h('span', { class: 'act-e', html: emo(KIND_EMOJI[a.kind] ?? '📦', 'emo act-emo') }),
    h('span', { class: 'act-t' }, rt('span', 'act-l', label + (a.rented ? ' (اجاره داده‌شده)' : '')), h('span', { class: 'act-d', text: `خرید: ${money(a.paid)}` })),
    h('span', { class: 'asset-v' }, h('span', { text: money(v) }), Math.abs(gain) < 0.005 ? h('span', { class: 'gain', text: 'بدون تغییر' }) : h('span', { class: `gain ${gain >= 0 ? 'up' : 'down'}`, text: `${gain >= 0 ? '▲' : '▼'} ${fa(Math.round(Math.abs(gain) * 100))}٪` })));
}

function assetsTab(body: HTMLElement) {
  const L = life();
  const e = L.econ;
  body.append(section('💰 پول و دارایی',
    kv('💵 نقدی', money(L.money)),
    kv('🏦 ارزش کل دارایی', money(netWorth(L))),
    debts(L) ? kv('📉 بدهی و قسط', money(debts(L))) : null,
    L.job ? kv('💼 درآمد ماهانه', money(salaryOf(L))) : null));
  body.append(section('📊 قیمت‌های بازار',
    h('div', { class: 'market' },
      h('div', { class: 'mk', html: `${emo('💵')}<b>دلار</b><span>${money(e.dollar)}</span>` }),
      h('div', { class: 'mk', html: `${emo('🪙')}<b>سکه</b><span>${money(e.coin)}</span>` }),
      h('div', { class: 'mk', html: `${emo('🏢')}<b>متری خونه (تهران)</b><span>${money(e.m2)}</span>` }),
      h('div', { class: 'mk', html: `${emo('📈')}<b>تورم امسال</b><span>${fa(Math.round(e.infl * 100))}٪</span>` }))));
  if (L.assets.length) body.append(section('📦 دارایی‌ها', ...L.assets.map((a) => assetRow(L, a))));
  if (L.loans.length) body.append(section('🏛️ وام‌ها', ...L.loans.map((l) => kv(l.name, `${money(l.left)} مونده، قسط سالانه ${money(l.yearly)}`))));
  body.append(section('💰 خرید و فروش', actionList(L, 'money')));
}

// ───────── people tab ─────────

const REL_ORDER = ['spouse', 'fiance', 'child', 'father', 'mother', 'brother', 'sister', 'grandpa', 'grandma', 'friend', 'ex'];

function npcEmoji(L: Life, n: Npc) {
  return avatarEmoji(L.year - n.born, n.gender, (n.id + L.skin) % 4);
}

function peopleTab(body: HTMLElement) {
  const L = life();
  const people = L.people.filter((p) => p.alive && !p.flags?.gone).sort((a, b) => REL_ORDER.indexOf(a.rel) - REL_ORDER.indexOf(b.rel));
  const groups: [string, (n: Npc) => boolean][] = [
    ['💞 همسر و بچه‌ها', (n) => ['spouse', 'fiance', 'child'].includes(n.rel)],
    ['🏡 خانواده', (n) => ['father', 'mother', 'brother', 'sister', 'grandpa', 'grandma'].includes(n.rel)],
    ['🤝 دوست‌ها', (n) => n.rel === 'friend'],
    ['💔 سابق', (n) => n.rel === 'ex'],
  ];
  for (const [title, test] of groups) {
    const list = people.filter(test);
    if (!list.length) continue;
    body.append(section(title, ...list.map((n) => {
      const row = h('button', { class: 'person' },
        h('span', { class: 'p-av', html: emo(npcEmoji(L, n), 'emo p-emo') }),
        h('span', { class: 'act-t' }, h('span', { class: 'act-l', text: `${n.first} ${n.last}` }), h('span', { class: 'act-d', text: `${relLabel(n)}، ${fa(L.year - n.born)} ساله${n.job && n.rel !== 'child' ? `، ${n.job}` : ''}` })),
        meter(n.close, 'small'));
      row.addEventListener('click', () => personSheet(n.id));
      return row;
    })));
  }
  const gone = L.people.filter((p) => !p.alive && p.died);
  if (gone.length) body.append(section('🕊️ درگذشتگان', ...gone.map((n) => h('div', { class: 'kv', html: `<span class="k">${rich(`${n.first} ${n.last}`)}</span><span class="v">${relLabel(n)}، ${fa(n.died! - n.born)} ساله</span>` }))));
  if (!people.length) body.append(h('div', { class: 'empty', text: 'هیچ‌کس رو نداری… تنهایی.' }));
}

function relLabel(n: Npc): string {
  const m = n.gender === 'm';
  switch (n.rel) {
    case 'father': return 'پدر';
    case 'mother': return 'مادر';
    case 'brother': return 'برادر';
    case 'sister': return 'خواهر';
    case 'grandpa': return n.side === 'p' ? 'پدربزرگ (پدری)' : 'پدربزرگ (مادری)';
    case 'grandma': return n.side === 'p' ? 'مادربزرگ (پدری)' : 'مادربزرگ (مادری)';
    case 'spouse': return m ? 'همسر (شوهر)' : 'همسر (خانوم)';
    case 'fiance': return 'نامزد';
    case 'child': return m ? 'پسر' : 'دختر';
    case 'friend': return `دوست${n.met ? ` (${n.met})` : ''}`;
    case 'ex': return 'همسر سابق';
    default: return '';
  }
}

function personSheet(id: number) {
  const L = life();
  const n = L.people.find((p) => p.id === id);
  if (!n) return;
  const s = sheet(`${n.first} ${n.last}`);
  const render = () => {
    clear(s.body);
    s.body.append(h('div', { class: 'person-card' },
      h('span', { class: 'p-av big', html: emo(npcEmoji(L, n), 'emo p-emo') }),
      h('div', {}, h('div', { class: 'act-l', text: relLabel(n) }), h('div', { class: 'act-d', text: `${fa(L.year - n.born)} ساله${n.job ? `، ${n.job}` : ''}` })),
    ), h('div', { class: 'kv' }, rt('span', 'k', '❤️ رابطه'), meter(n.close)));
    const acts = personActs(L, id);
    const wrap = h('div', { class: 'acts' });
    for (const a of acts) {
      const row = h('button', { class: `act ${a.off ? 'off' : ''}` },
        h('span', { class: 'act-e', html: emo(a.def.emoji, 'emo act-emo') }),
        h('span', { class: 'act-t' }, rt('span', 'act-l', a.label), a.off ? rt('span', 'act-d', a.off) : null));
      row.addEventListener('click', async () => {
        if (a.off) { toast(a.off); return; }
        const out = runPersonAct(L, id, a.def.id);
        collectAchievements(L);
        persist();
        hooks.refresh();
        render();
        await showOutcome(out);
        if (L.dead) { s.close(); hooks.afterDeath(); }
      });
      wrap.append(row);
    }
    s.body.append(wrap);
  };
  render();
}

// ───────── open/close ─────────

const TABS: Record<string, { title: string; render: (b: HTMLElement) => void; full?: boolean }> = {
  life: { title: '💼 کار و درس', render: lifeTab, full: true },
  acts: { title: '🎯 کارها', render: actsTab, full: true },
  assets: { title: '💰 دارایی', render: assetsTab, full: true },
  people: { title: '👨‍👩‍👧 آدم‌ها', render: peopleTab, full: true },
};

export function openTab(tab: string) {
  const L = currentLife();
  if (!L || L.dead) return;
  const t = TABS[tab];
  const s = sheet(t.title, { full: t.full, onClose: () => { if (open?.close === s.close) open = null; } });
  const render = () => {
    const y = s.body.scrollTop;
    clear(s.body);
    t.render(s.body);
    s.body.scrollTop = y;
  };
  open = { render, close: s.close };
  render();
}

export { btn };
