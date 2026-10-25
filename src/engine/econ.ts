import { money, pct } from './fmt';
import type { Rng } from './rng';
import type { Econ } from './types';

/** Mehr 1405 prices (see docs/market-research.md). */
export const START_YEAR = 1405;

export function startEcon(): Econ {
  return {
    infl: 0.38,
    price: 1,
    dollar: 270_000,
    coin: 270_000_000,
    m2: 220_000_000,
    stock: 1_000_000,
    crypto: 95_000,
    wage: 16_000_000,
    car: 1,
    rate: 0.23,
  };
}

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

/** Move the economy one year. Returns headline lines for big moves. */
export function stepEcon(e: Econ, r: Rng): string[] {
  const news: string[] = [];
  const prevDollar = e.dollar;
  const prevCoin = e.coin;
  const prevM2 = e.m2;
  const prevStock = e.stock;
  const prevCrypto = e.crypto;

  let infl = e.infl * 0.55 + 0.35 * 0.45 + r.gauss(0, 0.07);
  if (r.chance(0.07)) infl += r.range(0.15, 0.3); // shock year
  if (r.chance(0.06)) infl -= r.range(0.08, 0.15); // calm year
  e.infl = clamp(infl, 0.12, 0.75);
  e.price *= 1 + e.infl;

  let d = (1 + e.infl) * Math.exp(r.gauss(-0.04, 0.1));
  if (r.chance(0.09)) d *= r.range(1.2, 1.5);
  else if (r.chance(0.06)) d *= r.range(0.8, 0.92);
  e.dollar = Math.max(50, e.dollar * d);

  // Gold follows the dollar and the world gold price.
  e.coin = Math.max(20_000, e.coin * (e.dollar / prevDollar) * Math.exp(r.gauss(0.02, 0.09)));

  let h = (1 + e.infl) * Math.exp(r.gauss(-0.01, 0.08));
  if (r.chance(0.06)) h *= r.range(1.15, 1.35);
  e.m2 *= h;

  e.stock = Math.max(50, e.stock * Math.exp(r.gauss(Math.log(1 + e.infl) + 0.02, 0.28)));
  e.crypto = clamp(e.crypto * Math.exp(r.gauss(0.04, 0.5)), 3_000, 50_000_000);
  e.wage *= 1 + e.infl - r.range(0, 0.05);
  e.car *= (1 + e.infl) * Math.exp(r.gauss(0.01, 0.07));
  e.rate = clamp(0.17 + e.infl * 0.15, 0.18, 0.3);

  const ch = (a: number, b: number) => a / b - 1;
  const dd = ch(e.dollar, prevDollar);
  if (dd > 0.6) news.push(`💵 دلار امسال ${pct(dd)} گرون شد و رسید به ${money(e.dollar)}! همه دارن از گرونی حرف می‌زنن.`);
  else if (dd < -0.05) news.push(`💵 دلار امسال ${pct(-dd)} ارزون شد. خریدارهای دلار ناراحتن!`);
  const cd = ch(e.coin, prevCoin);
  if (cd > 0.7) news.push(`🪙 سکه طلا امسال ${pct(cd)} رشد کرد. قیمت هر سکه: ${money(e.coin)}`);
  const hd = ch(e.m2, prevM2);
  if (hd > 0.65) news.push(`🏢 بازار مسکن داغ شد؛ قیمت خونه ${pct(hd)} رفت بالا.`);
  const sd = ch(e.stock, prevStock);
  if (sd > 0.8) news.push(`📈 بورس امسال ${pct(sd)} سود داد! همه شدن کارشناس بورس.`);
  else if (sd < -0.3) news.push(`📉 بورس امسال ${pct(-sd)} ریخت. سهام‌دارها عزادارن.`);
  const kd = ch(e.crypto, prevCrypto);
  if (kd > 1.2) news.push(`🪙 رمزارزها امسال ${pct(kd)} پریدن بالا!`);
  else if (kd < -0.5) news.push(`🪙 بازار رمزارز ${pct(-kd)} سقوط کرد.`);
  if (e.infl > 0.55) news.push(`🛒 تورم امسال ${pct(e.infl)} بود. قیمت‌ها روزانه عوض می‌شن!`);
  return news;
}
