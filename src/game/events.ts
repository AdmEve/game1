/**
 * Seasonal events. «شب یلدا»: the longest night of the year (30 Azar, about 21 December). For two
 * weeks around it there are seven special night levels; each win earns a pomegranate and a Hafez
 * fortune, the way families read «فال حافظ» on Yalda night.
 */
import { solvable, type Spec } from './generator';
import type { Level } from './rules';

export const YALDA_NIGHTS = 7;

/** The event runs from 14 to 28 December (local time); `?yalda` turns it on for testing. */
export function yaldaActive(now = new Date()): boolean {
  if (typeof location !== 'undefined' && location.search.includes('yalda')) return true;
  return now.getMonth() === 11 && now.getDate() >= 14 && now.getDate() <= 28;
}

const cache = new Map<number, Level | null>();

/** Night `i` (0-based) of the event: the same for everyone, a little harder each night. */
export function yaldaLevel(i: number): Level | null {
  if (cache.has(i)) return cache.get(i)!;
  const k = i / (YALDA_NIGHTS - 1);
  const spec: Spec = {
    w: 7, h: 8 + Math.round(k * 2), fill: 0.82 + k * 0.06, colors: 5 + (i > 2 ? 1 : 0), mix: Math.round(6 + k * 6), target: 0.6,
    zamyad: 0.12, bus: 0.06, cones: 1,
    cover: i % 2 ? 0.25 : undefined, vip: i >= 2 ? 1 : undefined, bikes: i >= 3 ? 1 : undefined,
    wedding: i === 4 || i === 6 ? 1 : undefined, broken: i >= 5 ? 1 : undefined,
  };
  const seed = 1403_09_30 + i * 7919;
  const level = solvable(spec, seed) ?? solvable({ ...spec, mix: 4, wedding: undefined }, seed + 1, 200);
  if (level && i === YALDA_NIGHTS - 1) level.tag = 'boss';
  cache.set(i, level);
  return level;
}

/** Couplets from the Divan of Hafez, read as fortunes. */
export const HAFEZ: [string, string][] = [
  ['صبح امید که بُد معتکف پرده‌ی غیب', 'گو برون آی که کار شب تار آخر شد'],
  ['یوسف گم‌گشته بازآید به کنعان غم مخور', 'کلبه‌ی احزان شود روزی گلستان غم مخور'],
  ['ستاره‌ای بدرخشید و ماه مجلس شد', 'دل رمیده‌ی ما را انیس و مونس شد'],
  ['مژده ای دل که مسیحا نفسی می‌آید', 'که ز انفاس خوشش بوی کسی می‌آید'],
  ['بیا تا گل برافشانیم و می در ساغر اندازیم', 'فلک را سقف بشکافیم و طرحی نو دراندازیم'],
  ['سال‌ها دل طلب جام جم از ما می‌کرد', 'وان چه خود داشت ز بیگانه تمنا می‌کرد'],
  ['اگر آن ترک شیرازی به دست آرد دل ما را', 'به خال هندویش بخشم سمرقند و بخارا را'],
  ['الا یا ایها الساقی ادر کأسا و ناولها', 'که عشق آسان نمود اول ولی افتاد مشکل‌ها'],
  ['شب تاریک و بیم موج و گردابی چنین هایل', 'کجا دانند حال ما سبکباران ساحل‌ها'],
  ['دوش دیدم که ملائک در میخانه زدند', 'گل آدم بسرشتند و به پیمانه زدند'],
];

/** «نوروز»: the Persian New Year (1 Farvardin, about 21 March). Seven days, one «سین» of the Haft-Sin each. */
export const NOWRUZ_DAYS = 7;

/** From 14 March to 3 April; `?nowruz` turns it on for testing. */
export function nowruzActive(now = new Date()): boolean {
  if (typeof location !== 'undefined' && location.search.includes('nowruz')) return true;
  const m = now.getMonth(), d = now.getDate();
  return (m === 2 && d >= 14) || (m === 3 && d <= 3);
}

/** The seven «سین»s, in the order they are collected. */
export const HAFT_SIN: { name: string; icon: string; wish: string }[] = [
  { name: 'سبزه', icon: '🌱', wish: 'سبزه، نشونه‌ی زندگی و رویش دوباره‌ست.' },
  { name: 'سیب', icon: '🍎', wish: 'سیب، برای سلامتی و زیبایی.' },
  { name: 'سنجد', icon: '🫒', wish: 'سنجد، نشونه‌ی عشق و محبت.' },
  { name: 'سیر', icon: '🧄', wish: 'سیر، برای تندرستی.' },
  { name: 'سرکه', icon: '🍶', wish: 'سرکه، نشونه‌ی صبر و حوصله.' },
  { name: 'سمنو', icon: '🥣', wish: 'سمنو، برای برکت و فراوونی.' },
  { name: 'سکه', icon: '🪙', wish: 'سکه، برای روزی و ثروت. سال نو مبارک!' },
];

const nowruzCache = new Map<number, Level | null>();

/** Day `i` (0-based) of the event: the same for everyone, a little harder each day. */
export function nowruzLevel(i: number): Level | null {
  if (nowruzCache.has(i)) return nowruzCache.get(i)!;
  const k = i / (NOWRUZ_DAYS - 1);
  const spec: Spec = {
    w: 7, h: 8 + Math.round(k * 2), fill: 0.82 + k * 0.06, colors: 5 + (i > 2 ? 1 : 0), mix: Math.round(6 + k * 6), target: 0.6,
    zamyad: 0.12, bus: 0.08, cones: 1,
    granny: i >= 1 ? 2 : undefined, wedding: i === 3 || i === 6 ? 1 : undefined, tunnels: i >= 4 ? 1 : undefined, bikes: i % 2 ? 1 : undefined,
  };
  const seed = 1406_01_01 + i * 7919;
  const level = solvable(spec, seed) ?? solvable({ ...spec, mix: 4, wedding: undefined, tunnels: undefined }, seed + 1, 200);
  if (level && i === NOWRUZ_DAYS - 1) level.tag = 'boss';
  nowruzCache.set(i, level);
  return level;
}
