/** Shareable cards (obituary, konkur report card) and the native share sheet. */
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { CITIES } from '../content/cities';
import { trackName } from '../content/edu';
import { fa, num } from '../engine/fmt';
import type { Life } from '../engine/types';
import { toast } from './dom';
import { avatarEmoji, codeOf } from './emoji';

export function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => res(null);
    i.src = src;
  });
}

export function emojiImg(e: string) {
  return loadImg(`./emoji/${codeOf(e)}.svg`);
}

/** A filled capsule (canvas roundRect is missing on older Android WebViews). */
export function pill(x: CanvasRenderingContext2D, left: number, top: number, w: number, hh: number, r = hh / 2) {
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
export function wrap(x: CanvasRenderingContext2D, text: string, cx: number, y: number, max: number, lh: number): number {
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

export async function shareCanvas(cv: HTMLCanvasElement, text: string, name: string) {
  const data = cv.toDataURL('image/png');
  if (Capacitor.isNativePlatform()) {
    try {
      const file = await Filesystem.writeFile({ path: `${name}.png`, data: data.split(',')[1], directory: Directory.Cache });
      await Share.share({ title: 'زندگی ایرونی', text, files: [file.uri], dialogTitle: 'اشتراک‌گذاری' });
    } catch { toast('اشتراک‌گذاری انجام نشد'); }
    return;
  }
  const a = document.createElement('a');
  a.href = data;
  a.download = `${name}.png`;
  a.click();
}

/** «کارنامه‌ی کنکور» card. */
export async function drawKarname(L: Life, rank: number, n: number): Promise<HTMLCanvasElement> {
  await document.fonts.ready;
  const W = 1080, H = 1350;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const x = cv.getContext('2d')!;
  x.fillStyle = '#eef4fb';
  x.fillRect(0, 0, W, H);
  x.fillStyle = '#1e4f8a';
  x.fillRect(0, 0, W, 210);
  x.direction = 'rtl';
  x.textAlign = 'center';
  x.fillStyle = '#fff';
  x.font = '800 54px Vazirmatn';
  x.fillText('کارنامه‌ی آزمون سراسری', W / 2, 105);
  x.font = '500 34px Vazirmatn';
  x.fillText(`سال ${fa(L.year)} — گروه ${trackName(L.edu.track)}`, W / 2, 165);
  // Paper.
  x.fillStyle = '#fff';
  pill(x, 70, 260, W - 140, 900, 36);
  const av = await emojiImg(avatarEmoji(L.age, L.gender, L.skin));
  if (av) x.drawImage(av, W / 2 - 80, 300, 160, 160);
  x.fillStyle = '#1b2733';
  x.font = '800 64px Vazirmatn';
  x.fillText(`${L.first} ${L.last}`, W / 2, 545);
  x.font = '500 34px Vazirmatn';
  x.fillStyle = '#5a6b7d';
  x.fillText('رتبه‌ی کشوری', W / 2, 640);
  x.font = '900 170px Vazirmatn';
  x.fillStyle = rank < 1000 ? '#c48a00' : '#1e4f8a';
  x.fillText(num(rank), W / 2, 810);
  x.font = '500 34px Vazirmatn';
  x.fillStyle = '#5a6b7d';
  x.fillText(`از ${num(n)} داوطلب`, W / 2, 875);
  x.font = '700 38px Vazirmatn';
  x.fillStyle = '#1b2733';
  const line = rank < 100 ? 'از فردا مصاحبه با خبرگزاری‌ها!' : rank < 2000 ? 'فامیل از الان می‌گن «آقای/خانم دکتر»!'.replace('آقای/خانم', L.gender === 'm' ? 'آقای' : 'خانم') : rank < 20000 ? 'خاله پرسید: «بقیه چند شدن؟»' : 'بابا: «فدای سرت، مهم سلامتیه!»';
  wrap(x, line, W / 2, 990, 820, 54);
  x.font = '400 28px Vazirmatn';
  x.fillStyle = '#8796a6';
  x.fillText('این کارنامه فقط تو بازیه! 😄', W / 2, 1110);
  x.fillStyle = '#1F6F6B';
  x.font = '800 46px Vazirmatn';
  x.fillText('زندگی ایرونی', W / 2, 1245);
  x.font = '400 26px Vazirmatn';
  x.fillStyle = '#44556a';
  x.fillText('شبیه‌ساز زندگی ایرانی، دانلود از کافه‌بازار', W / 2, 1290);
  return cv;
}

export async function shareKarname(L: Life, rank: number, n: number) {
  const cv = await drawKarname(L, rank, n);
  await shareCanvas(cv, `رتبه‌ی کنکورم تو «زندگی ایرونی» شد ${num(rank)}! تو چند می‌شی؟ 😎`, `konkur-${L.id}`);
}

/** «کارت عروسی» card, after the wedding. */
export async function drawWedding(L: Life): Promise<HTMLCanvasElement | null> {
  const sp = L.people.find((p) => p.rel === 'spouse' && p.alive);
  if (!sp) return null;
  await document.fonts.ready;
  const W = 1080, H = 1350;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const x = cv.getContext('2d')!;
  x.fillStyle = '#fbf5e6';
  x.fillRect(0, 0, W, H);
  // Gold double frame.
  x.strokeStyle = '#c9a24a';
  x.lineWidth = 10;
  x.strokeRect(40, 40, W - 80, H - 80);
  x.lineWidth = 3;
  x.strokeRect(66, 66, W - 132, H - 132);
  const flower = await emojiImg('🌸');
  if (flower) for (const [fx, fy] of [[44, 44], [W - 124, 44], [44, H - 124], [W - 124, H - 124]]) x.drawImage(flower, fx, fy, 80, 80);
  x.direction = 'rtl';
  x.textAlign = 'center';
  x.fillStyle = '#a07a2c';
  x.font = '500 34px Vazirmatn';
  x.fillText('به نام آنکه عشق را آفرید', W / 2, 170);
  const ring = await emojiImg('💍');
  if (ring) x.drawImage(ring, W / 2 - 70, 210, 140, 140);
  x.fillStyle = '#7a5a1c';
  x.font = '700 40px Vazirmatn';
  x.fillText('دعوت‌نامه‌ی جشن عروسی', W / 2, 410);
  const [groom, bride] = L.gender === 'm' ? [L.first, sp.first] : [sp.first, L.first];
  x.fillStyle = '#3b2a10';
  x.font = '900 96px Vazirmatn';
  x.fillText(bride, W / 2, 560);
  x.font = '400 54px Vazirmatn';
  x.fillStyle = '#c9a24a';
  x.fillText('و', W / 2, 640);
  x.font = '900 96px Vazirmatn';
  x.fillStyle = '#3b2a10';
  x.fillText(groom, W / 2, 750);
  x.font = '500 36px Vazirmatn';
  x.fillStyle = '#5c4a2a';
  const city = CITIES.find((c) => c.id === L.city)?.name;
  x.fillText(`سال ${fa(L.year)}${L.country === 'ir' && city ? `، ${city}` : ''}`, W / 2, 840);
  const mehr = L.mehr ?? L.flags.mehrMax ?? 0;
  if (mehr > 0) {
    x.font = '700 38px Vazirmatn';
    x.fillStyle = '#7a5a1c';
    x.fillText(`مهریه: ${fa(mehr)} سکه‌ی بهار آزادی`, W / 2, 930);
    x.font = '400 32px Vazirmatn';
    x.fillStyle = '#8a7650';
    x.fillText(mehr >= 1000 ? '(خدا به داماد رحم کنه!)' : mehr <= 14 ? '(ساده و صمیمی)' : '(مبارکه!)', W / 2, 985);
  }
  x.font = '500 32px Vazirmatn';
  x.fillStyle = '#8a7650';
  x.fillText('شام: چلوکباب و زرشک‌پلو با مرغ', W / 2, 1075);
  x.fillText('ورود کودکان ممنوع!', W / 2, 1125);
  x.fillStyle = '#1F6F6B';
  x.font = '800 42px Vazirmatn';
  x.fillText('زندگی ایرونی', W / 2, 1215);
  x.font = '400 26px Vazirmatn';
  x.fillStyle = '#5c4a2a';
  x.fillText('شبیه‌ساز زندگی ایرانی، دانلود از کافه‌بازار', W / 2, 1258);
  return cv;
}

export async function shareWedding(L: Life) {
  const cv = await drawWedding(L);
  if (!cv) return;
  const mehr = L.mehr ?? L.flags.mehrMax ?? 0;
  await shareCanvas(cv, `عروسی‌مون تو «زندگی ایرونی»!${mehr ? ` مهریه ${fa(mehr)} سکه 😅` : ''} تو هم بیا زندگیت رو بساز!`, `wedding-${L.id}`);
}
