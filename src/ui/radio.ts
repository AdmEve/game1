/** «رادیو راه‌بندون»: short, funny traffic bulletins in the style of a Tehran traffic report. */
import { audioOut } from '../audio';
import { today } from '../game/daily';
import { MISSIONS_FROM, todayMissions } from '../missions';
import { save } from '../save';
import { emo } from './emoji';
import { fa, h } from './hud';

const BULLETINS = [
  'ترافیک سنگین در بزرگراه همت… به‌جز یه پراید که داره از لاین سبقت ویراژ می‌ده!',
  'خبر فوری: یه پیکان ۵۴ تو میدان آزادی خاموش کرده؛ مش‌رحیم با یه پیچ‌گوشتی تو راهه.',
  'امروز طرح زوج و فرد اجراست؛ صاحب پلاک‌های فرد، لطفاً با لبخند صبر کنید.',
  'پیک‌موتوری‌های عزیز، پیاده‌رو جای موتور نیست! البته اگه عجله دارید، ما چیزی ندیدیم.',
  'هوای تهران امروز: آفتابی، با احتمال بارش بوق در ساعات اوج.',
  'یه زامیاد هندونه تو ولیعصر چپ کرده؛ رهگذرها دارن کمک می‌کنن… هندونه‌ها رو می‌خورن!',
  'آقای عجول باز دوبله پارک کرده. شنونده‌های عزیز، گزارش بدید!',
  'تاکسی‌های خط تجریش–ونک: فقط دو تا جای خالی، یکی جلو یکی عقب!',
  'آمار امروز: میانگین سرعت در خیابان انقلاب سه کیلومتر بر ساعت. لاک‌پشت‌ها در حال سبقت‌اند.',
  'شنونده‌ای از نارمک پیام داده: «ماشینم رو پارک کردم، یادم رفت کجا!» احتمالاً پشت یه اتوبوس تندرو.',
  'اتوبوس تندروی خط آزادی به‌خاطر سوار شدن یه دسته گل عروس با تأخیر حرکت کرد.',
  'توصیه‌ی پلیس راهور: قبل از بوق زدن یه نفس عمیق بکشید. بعد بوق بزنید.',
  'گزارش رسیده که یه ژیان تو سربالایی دربند جا مونده. مسافرها مشغول هل دادن‌اند.',
  'مسافر دربستی خیابان پاسداران هنوز منتظر یه ماشین خالیه. رانندگان محترم، لطفاً!',
];

let idx = Math.floor(Math.random() * BULLETINS.length);

/** The station ident: a bright three-note chime. */
function jingle() {
  // Audio may only start after the player has touched the page.
  if (!save.settings.sound || !(navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive) return;
  const o = audioOut(); if (!o) return;
  const c = o.c;
  [784, 988, 1319].forEach((f, i) => {
    const t = c.currentTime + i * 0.12;
    const osc = c.createOscillator(); osc.type = 'triangle'; osc.frequency.value = f;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.1, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    osc.connect(g).connect(o.out); osc.start(t); osc.stop(t + 0.55);
  });
}

/** Ms. Sabouri on the agency radio (P4): today's missions, while any is left, on one visit in three. */
function dispatch(): string | null {
  if (save.level < MISSIONS_FROM || Math.random() > 1 / 3) return null;
  const ms = todayMissions(save, today()), done = ms.list.filter((m) => m.got >= m.goal).length;
  if (done === ms.list.length) return null;
  return done ? `خانم صبوری از آژانس: ${fa(done)} تا از مأموریت‌های امروز رو انجام دادی؛ ${fa(ms.list.length - done)} تای دیگه تو «امروز» منتظرتن!`
    : 'خانم صبوری از آژانس: مأموریت‌های امروز رسید! یه سر به «امروز» بزن؛ هر سه تا رو بری، یه سوئیچ جایزه داری.';
}

export function radioCard(): HTMLElement {
  const text = dispatch() ?? BULLETINS[idx++ % BULLETINS.length];
  const card = h('div', 'radio', `<div class="rhead">${emo('📻', 'emo sm')} <b>رادیو راه‌بندون</b> <span class="live">زنده</span></div><div class="rtext">${text}</div>`);
  setTimeout(jingle, 300);
  return card;
}
