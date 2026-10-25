/** Shareable cards (obituary, konkur report card) and the native share sheet. */
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
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
