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
import { rewardedAvailable, showRewarded } from '../monetize';
import { bury, collectAchievements, meta, persist, spendGems, type Grave } from '../save';
import { btn, closeAll, h, modal, rt, toast } from './dom';
import { avatarEmoji, emo } from './emoji';
import { needGems } from './flow';

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
  return c?.title ?? (L.age < 18 ? 'کودک' : 'بیکار');
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
  x.fillStyle = '#111';
  x.beginPath();
  x.moveTo(W / 2 + 70, 300); x.lineTo(W / 2 + 150, 300); x.lineTo(W / 2 + 40, 420); x.closePath();
  x.fill();
  x.fillStyle = '#111';
  x.font = '800 74px Vazirmatn';
  x.fillText(`${g.first} ${g.last}`, W / 2, 660);
  x.font = '500 38px Vazirmatn';
  x.fillStyle = '#333';
  x.fillText(`با نهایت تأسف درگذشت ${g.gender === 'm' ? 'مرحوم' : 'مرحومه'} ${g.first} را در سن ${fa(g.age)} سالگی`, W / 2, 740);
  x.fillText(`بر اثر «${g.cause}» به اطلاع می‌رساند.`, W / 2, 795);
  x.font = '500 34px Vazirmatn';
  x.fillStyle = '#7a5b1e';
  x.fillText(`${fa(g.born)} — ${fa(g.died)} · ${g.job}`, W / 2, 860);
  // Facts.
  x.font = '400 34px Vazirmatn';
  x.fillStyle = '#222';
  const facts = [...g.facts, `دارایی: ${money(g.net)}`].slice(0, 6);
  let y = 935;
  for (let i = 0; i < facts.length; i += 2) {
    const line = facts.slice(i, i + 2).join('  •  ');
    x.fillText(line, W / 2, y);
    y += 56;
  }
  x.font = '400 30px Vazirmatn';
  x.fillStyle = '#555';
  x.fillText('مراسم ختم: هیچ‌وقت، چون این فقط یه بازیه! 😄', W / 2, 1150);
  x.fillStyle = '#1F6F6B';
  x.font = '800 44px Vazirmatn';
  x.fillText('زندگی ایرونی', W / 2, 1235);
  x.font = '400 26px Vazirmatn';
  x.fillStyle = '#444';
  x.fillText('شبیه‌ساز زندگی ایرانی · دانلود از کافه‌بازار', W / 2, 1275);
  return cv;
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
    cause: L.dead?.cause ?? '', real: Math.round(netWorth(L) / L.econ.price), net: Math.round(netWorth(L)), job: lastJob(L),
    city: L.country === 'ir' ? cityName(L) : countryById(L.country)?.name ?? '', country: L.country, ach: [...L.ach], gen: L.gen, facts: lifeFacts(L),
  };
}

export function showDeath(L: Life, actions: { newLife: () => void; play: (L: Life) => void }) {
  sfx('death');
  closeAll();
  collectAchievements(L);
  persist();
  const g = graveOf(L);
  const preview = h('div', { class: 'obit' },
    h('div', { class: 'obit-poem', html: 'این قافله‌ی عمر عجب می‌گذرد<br>دریاب دمی که با طرب می‌گذرد' }),
    h('div', { class: 'obit-av', html: emo(avatarEmoji(L.age, L.gender, L.skin), 'emo big') }),
    h('div', { class: 'obit-name', text: `${L.first} ${L.last}` }),
    rt('div', 'obit-line', `${fa(L.born)} — ${fa(L.year)} · ${fa(L.age)} ساله · ${g.job}`),
    rt('div', 'obit-cause', `علت فوت: ${g.cause}`),
    h('div', { class: 'obit-facts' }, ...[...g.facts, `دارایی: ${money(g.net)}`].map((f) => rt('span', 'fact', f))),
    L.ach.length ? h('div', { class: 'obit-ach', html: L.ach.map((id) => achById(id)).filter(Boolean).map((a) => `<span class="ach-mini" title="${a!.name}">${emo(a!.emoji)}</span>`).join('') }) : null);

  const kids = heirs(L).filter((k) => L.year - k.born >= 1);
  const freeRevive = !L.flags.freeRevive && rewardedAvailable();
  const m = modal(h('div', { class: 'death' },
    preview,
    btn('📤 اشتراک‌گذاری اعلامیه', () => void shareObituary(g), 'btn share wide'),
    L.revived < 3 ? h('div', { class: 'row' },
      btn(`⏳ ماشین زمان · ${fa(GEM_COST.revive)} 💎`, () => {
        if (!needGems(GEM_COST.revive)) return;
        spendGems(GEM_COST.revive);
        doRevive();
      }, 'btn gold'),
      freeRevive ? btn('🎬 ماشین زمان رایگان (تبلیغ)', async () => {
        if (await showRewarded()) { L.flags.freeRevive = 1; doRevive(); } else toast('تبلیغی پیدا نشد، بعداً امتحان کن');
      }, 'btn ghost') : null) : null,
    kids.length ? h('div', { class: 'heirs' }, rt('div', 'section-h', '🌱 ادامه‌ی نسل با یکی از بچه‌ها'), ...kids.map((k) => btn(`${k.gender === 'm' ? '👦' : '👧'} ${k.first} (${fa(L.year - k.born)} ساله)`, () => {
      finish();
      const N = continueAs(L, k.id);
      meta.life = N;
      meta.prev = null;
      persist();
      actions.play(N);
    }, 'btn ghost'))) : null,
    btn('👶 یه زندگی جدید', () => { finish(); actions.newLife(); }, 'btn primary wide')), { locked: true, cls: 'death-modal' });

  function doRevive() {
    m.close();
    revive(L);
    persist();
    actions.play(L);
    toast('⏳ برگشتی به زندگی!');
  }
  function finish() {
    bury(L, g.facts, g.job);
    meta.life = null;
    meta.prev = null;
    persist();
    m.close();
  }
}

export { modal };
