/** Death screen: the «اعلامیه‌ی ترحیم» card, sharing, time machine and the next life. */
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { sfx } from '../audio';
import { GEM_COST } from '../config';
import { achById } from '../engine/achieve';
import { countryById } from '../content/cities';
import { DEGREE_NAMES, majorName } from '../content/edu';
import { jobById } from '../content/jobs';
import { fa, money, num } from '../engine/fmt';
import { cityName } from '../engine/life';
import { continueAs, heirs, revive } from '../engine/play';
import type { Life } from '../engine/types';
import { netWorth } from '../engine/wealth';
import { rateApp, rewardedAvailable, showRewarded } from '../monetize';
import { bury, collectAchievements, collectChallenges, meta, persist, spendGems, type Grave } from '../save';
import { lifeTitle } from '../engine/challenges';
import { btn, closeAll, h, modal, rt, toast } from './dom';
import { avatarEmoji, emo } from './emoji';
import { hooks, needGems } from './flow';

/** Facts for the obituary, most interesting first. */
export function lifeFacts(L: Life): string[] {
  const f: string[] = [];
  const top = L.edu.degrees.filter((d) => d.kind !== 'diploma').slice(-1)[0];
  if (L.edu.konkur && L.edu.konkur.rank < 5000) f.push(`رتبه‌ی ${num(L.edu.konkur.rank)} کنکور`);
  if (top) f.push(`${DEGREE_NAMES[top.kind]} ${majorName(top.major)}${top.tier <= 1 ? ` از ${top.uni}` : ''}`);
  const longest = [...L.career].sort((a, b) => b.years - a.years)[0];
  if (longest && longest.years >= 2) f.push(`${fa(longest.years)} سال ${longest.title}`);
  if (L.mil.status === 'done') f.push('سربازی رفته');
  if (L.mil.status === 'bought') f.push('سربازی رو خریده');
  if (L.mil.status === 'absent') f.push('غایب سربازی');
  const spouse = L.people.find((p) => p.rel === 'spouse' || p.flags?.widow);
  if ('married' in L.flags) f.push(spouse ? `همسر ${spouse.first}` : 'یه بار ازدواج کرده');
  const kids = L.people.filter((p) => p.rel === 'child').length;
  if (kids) f.push(`${fa(kids)} فرزند`);
  if (L.flags.mehrMax) f.push(`مهریه‌ی ${fa(L.flags.mehrMax)} سکه`);
  if (L.country !== 'ir') f.push(`مهاجر به ${countryById(L.country)?.name}`);
  if (L.followers >= 10000) f.push(`${num(L.followers)} فالوور`);
  if ('nose' in L.flags) f.push('دماغ عملی');
  if ('damavand' in L.flags) f.push('فاتح دماوند');
  if (L.flags['jail:چک برگشتی'] || L.flags['jail:مهریه'] || L.flags['jail:رشوه']) f.push('سابقه‌ی زندان');
  return f.slice(0, 7);
}

function lastJob(L: Life): string {
  if (L.job) return jobById(L.job.id)?.levels[L.job.level] ?? '';
  const c = [...L.career].sort((a, b) => b.years - a.years)[0];
  if (L.pension) return `${c?.title ?? 'کارمند'} بازنشسته`;
  if (L.edu.stage === 'uni') return 'دانشجو';
  if (L.edu.stage === 'school') return L.age < 13 ? 'دانش‌آموز دبستانی' : 'دانش‌آموز';
  if (L.mil.status === 'serving') return 'سرباز';
  return c?.title ?? (L.age < 7 ? 'کودک' : 'بیکار');
}

// ───────── obituary card (canvas, for sharing) ─────────

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => res(null);
    i.src = src;
  });
}

export async function drawObituary(g: Grave): Promise<HTMLCanvasElement> {
  await document.fonts.ready;
  const W = 1080, H = 1350;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const x = cv.getContext('2d')!;
  x.fillStyle = '#fbf7ef';
  x.fillRect(0, 0, W, H);
  // Black mourning frame with a corner ribbon.
  x.strokeStyle = '#111';
  x.lineWidth = 28;
  x.strokeRect(40, 40, W - 80, H - 80);
  x.lineWidth = 3;
  x.strokeRect(78, 78, W - 156, H - 156);
  x.fillStyle = '#111';
  x.beginPath();
  x.moveTo(W - 40, 40); x.lineTo(W - 40, 260); x.lineTo(W - 260, 40); x.closePath();
  x.fill();
  x.direction = 'rtl';
  x.textAlign = 'center';
  x.fillStyle = '#222';
  x.font = '500 40px Vazirmatn';
  x.fillText('این قافله‌ی عمر عجب می‌گذرد', W / 2, 175);
  x.fillText('دریاب دمی که با طرب می‌گذرد', W / 2, 228);
  x.font = '400 30px Vazirmatn';
  x.fillStyle = '#555';
  x.fillText('(خیام)', W / 2, 272);
  const av = await loadImg(`./emoji/${[...avatarEmoji(g.age, g.gender, g.skin)].map((c) => c.codePointAt(0)!.toString(16)).filter((c) => c !== 'fe0f').join('-')}.svg`);
  // Portrait in an oval with a black ribbon.
  x.save();
  x.beginPath();
  x.ellipse(W / 2, 430, 120, 140, 0, 0, Math.PI * 2);
  x.fillStyle = '#e9e1d2';
  x.fill();
  x.lineWidth = 8;
  x.strokeStyle = '#111';
  x.stroke();
  x.clip();
  if (av) x.drawImage(av, W / 2 - 95, 335, 190, 190);
  x.restore();
  // Black mourning band across the photo's corner.
  x.save();
  x.translate(W / 2 + 88, 318);
  x.rotate(Math.PI / 4);
  x.fillStyle = '#111';
  x.fillRect(-70, -14, 140, 28);
  x.restore();
  x.fillStyle = '#111';
  x.font = '800 74px Vazirmatn';
  x.fillText(`${g.first} ${g.last}`, W / 2, 655);
  if (g.title) {
    x.font = '800 34px Vazirmatn';
    const tw = x.measureText(`«${g.title}»`).width + 60;
    x.fillStyle = '#f0a12e';
    pill(x, W / 2 - tw / 2, 676, tw, 52);
    x.fillStyle = '#3b2300';
    x.fillText(`«${g.title}»`, W / 2, 714);
    x.fillStyle = '#111';
  }
  x.font = '500 36px Vazirmatn';
  x.fillStyle = '#333';
  let y = wrap(x, `با نهایت تأسف درگذشت ${g.gender === 'm' ? 'مرحوم' : 'مرحومه'} ${g.first} را در سن ${fa(g.age)} سالگی بر اثر «${g.cause}» به اطلاع می‌رساند.`, W / 2, g.title ? 790 : 735, 840, 54);
  x.font = '600 32px Vazirmatn';
  x.fillStyle = '#7a5b1e';
  x.fillText(`${fa(g.born)} تا ${fa(g.died)}، ${g.job}`, W / 2, y + 12);
  // Facts as two-per-line rows.
  x.font = '400 31px Vazirmatn';
  x.fillStyle = '#222';
  const facts = [...g.facts, `دارایی: ${money(g.net)}`].slice(0, 6);
  y += 80;
  for (let i = 0; i < facts.length && y < 1110; i += 2) {
    y = wrap(x, facts.slice(i, i + 2).join('  ◆  '), W / 2, y, 860, 50) + 4;
  }
  x.font = '400 28px Vazirmatn';
  x.fillStyle = '#555';
  x.fillText('مراسم ختم: هیچ‌وقت، چون این فقط یه بازیه!', W / 2, 1140);
  x.fillStyle = '#1F6F6B';
  x.font = '800 44px Vazirmatn';
  x.fillText('زندگی ایرونی', W / 2, 1205);
  x.font = '400 25px Vazirmatn';
  x.fillStyle = '#444';
  x.fillText('شبیه‌ساز زندگی ایرانی، دانلود از کافه‌بازار', W / 2, 1243);
  return cv;
}

/** A filled capsule (canvas roundRect is missing on older Android WebViews). */
function pill(x: CanvasRenderingContext2D, left: number, top: number, w: number, hh: number) {
  const r = hh / 2;
  x.beginPath();
  x.moveTo(left + r, top);
  x.arcTo(left + w, top, left + w, top + hh, r);
  x.arcTo(left + w, top + hh, left, top + hh, r);
  x.arcTo(left, top + hh, left, top, r);
  x.arcTo(left, top, left + w, top, r);
  x.closePath();
  x.fill();
}

/** Fill centred text wrapped to a width; returns the y after the last line. */
function wrap(x: CanvasRenderingContext2D, text: string, cx: number, y: number, max: number, lh: number): number {
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (x.measureText(t).width > max && line) {
      x.fillText(line, cx, y);
      y += lh;
      line = w;
    } else line = t;
  }
  if (line) { x.fillText(line, cx, y); y += lh; }
  return y;
}

export async function shareObituary(g: Grave) {
  sfx('tap');
  const cv = await drawObituary(g);
  const data = cv.toDataURL('image/png');
  const text = `${g.first} ${g.last} تو «زندگی ایرونی» در ${fa(g.age)} سالگی درگذشت 😅 تو چند سال عمر می‌کنی؟`;
  if (Capacitor.isNativePlatform()) {
    try {
      const file = await Filesystem.writeFile({ path: `obituary-${g.id}.png`, data: data.split(',')[1], directory: Directory.Cache });
      await Share.share({ title: 'زندگی ایرونی', text, files: [file.uri], dialogTitle: 'اشتراک‌گذاری اعلامیه' });
    } catch { toast('اشتراک‌گذاری انجام نشد'); }
    return;
  }
  const a = document.createElement('a');
  a.href = data;
  a.download = `obituary-${g.id}.png`;
  a.click();
}

// ───────── death screen ─────────

export function graveOf(L: Life): Grave {
  return {
    id: L.id, first: L.first, last: L.last, gender: L.gender, skin: L.skin, born: L.born, died: L.year, age: L.age,
    cause: L.dead?.cause ?? '', real: Math.round(netWorth(L) / L.econ.price), net: Math.round(netWorth(L)), job: lastJob(L), title: lifeTitle(L),
    city: L.country === 'ir' ? cityName(L) : countryById(L.country)?.name ?? '', country: L.country, ach: [...L.ach], gen: L.gen, facts: lifeFacts(L),
  };
}

export function showDeath(L: Life, actions: { newLife: () => void; play: (L: Life) => void }) {
  sfx('death');
  closeAll();
  collectAchievements(L);
  const challenges = collectChallenges(L);
  persist();
  const g = graveOf(L);
  if (challenges.length) setTimeout(() => toast(`🎯 چالش «${challenges[0].title}» انجام شد! +${fa(challenges[0].gems)} 💎`), 800);
  const preview = h('div', { class: 'obit' },
    h('div', { class: 'obit-poem', html: 'این قافله‌ی عمر عجب می‌گذرد<br>دریاب دمی که با طرب می‌گذرد' }),
    h('div', { class: 'obit-av', html: emo(avatarEmoji(L.age, L.gender, L.skin), 'emo big') }),
    h('div', { class: 'obit-name', text: `${L.first} ${L.last}` }),
    h('div', { class: 'obit-title', text: `«${g.title}»` }),
    rt('div', 'obit-line', `${fa(L.born)} — ${fa(L.year)}، ${fa(L.age)} ساله، ${g.job}`),
    rt('div', 'obit-cause', `علت فوت: ${g.cause}`),
    h('div', { class: 'obit-facts' }, ...[...g.facts, `دارایی: ${money(g.net)}`].map((f) => rt('span', 'fact', f))),
    L.ach.length ? h('div', { class: 'obit-ach', html: L.ach.map((id) => achById(id)).filter(Boolean).map((a) => `<span class="ach-mini" title="${a!.name}">${emo(a!.emoji)}</span>`).join('') }) : null);

  const kids = heirs(L).filter((k) => L.year - k.born >= 1);
  const freeRevive = !L.flags.freeRevive && rewardedAvailable();
  const m = modal(h('div', { class: 'death' },
    preview,
    btn('📤 اشتراک‌گذاری اعلامیه', () => void shareObituary(g), 'btn share wide'),
    L.revived < 3 ? h('div', { class: 'death-opts' },
      btn(`⏳ ماشین زمان: ${fa(GEM_COST.revive)} الماس`, () => {
        if (!needGems(GEM_COST.revive)) return;
        spendGems(GEM_COST.revive);
        doRevive();
      }, 'btn gold wide'),
      meta.prev ? btn(`⏪ برگرد به یه سال قبل: ${fa(GEM_COST.undoYear)} الماس`, () => {
        if (!needGems(GEM_COST.undoYear)) return;
        spendGems(GEM_COST.undoYear);
        const prev = JSON.parse(meta.prev!) as Life;
        meta.prev = null;
        m.close();
        persist();
        actions.play(prev);
        toast('⏪ برگشتی به یه سال قبل!');
      }, 'btn ghost wide') : null,
      freeRevive ? btn('🎬 ماشین زمان رایگان (تبلیغ)', async () => {
        if (await showRewarded()) { L.flags.freeRevive = 1; doRevive(); } else toast('تبلیغی پیدا نشد، بعداً امتحان کن');
      }, 'btn ghost wide') : null) : null,
    kids.length ? h('div', { class: 'heirs' }, rt('div', 'section-h', '🌱 ادامه‌ی نسل با یکی از بچه‌ها'), ...kids.map((k) => btn(`${k.gender === 'm' ? '👦' : '👧'} ${k.first} (${fa(L.year - k.born)} ساله)`, () => {
      finish();
      const N = continueAs(L, k.id);
      meta.life = N;
      meta.prev = null;
      persist();
      actions.play(N);
    }, 'btn ghost'))) : null,
    btn('👶 یه زندگی جدید', () => { finish(); actions.newLife(); }, 'btn primary wide'),
    !meta.owned.vip ? h('button', { class: 'upsell', html: `${emo('👑')} <b>زندگی VIP</b><span>زندگی بعدی رو خودت انتخاب کن: شهر، خانواده و بدون تبلیغ</span>`, onclick: () => hooks.openShop() }) : null,
    meta.stats.lives >= 1 && !meta.rated ? h('button', { class: 'upsell rate', html: `${emo('⭐')} <b>از بازی خوشت اومده؟</b><span>با پنج ستاره تو کافه‌بازار کمکمون کن!</span>`, onclick: () => rateApp() }) : null), { locked: true, cls: 'death-modal' });

  function doRevive() {
    m.close();
    revive(L);
    persist();
    actions.play(L);
    toast('⏳ برگشتی به زندگی!');
  }
  function finish() {
    bury(L, g.facts, g.job, g.title);
    meta.life = null;
    meta.prev = null;
    persist();
    m.close();
  }
}

export { modal };
