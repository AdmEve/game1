import { CARS, HOUSES, SHOPS } from '../content/assets';
import type { Asset, Life } from './types';

/** Current market value of an asset, toman. */
export function assetValue(L: Life, a: Asset): number {
  const e = L.econ;
  switch (a.kind) {
    case 'coin': return a.qty * e.coin;
    case 'dollar': return a.qty * e.dollar;
    case 'stock': return a.qty * e.stock;
    case 'crypto': return a.qty * e.crypto * e.dollar;
    case 'deposit': return a.qty;
    case 'house': {
      const h = HOUSES.find((x) => x.id === a.ref);
      const age = Math.max(0, L.year - a.year);
      const wear = Math.max(0.75, 1 - age * 0.006);
      return Math.round(a.qty * e.m2 * (a.mul ?? 1) * (h?.mul ?? 1) * wear);
    }
    case 'car': {
      const c = CARS.find((x) => x.id === a.ref);
      const cond = (a.cond ?? 100) / 100;
      return Math.round((c?.price ?? 0) * e.car * (0.45 + 0.5 * cond));
    }
    case 'shop': {
      const s = SHOPS.find((x) => x.id === a.ref);
      return Math.round((s?.cost ?? 0) * e.price * ((a.cond ?? 100) / 100));
    }
  }
}

export function assetsValue(L: Life): number {
  return L.assets.reduce((s, a) => s + assetValue(L, a), 0);
}

export function debts(L: Life): number {
  return L.loans.reduce((s, l) => s + l.left, 0);
}

export function netWorth(L: Life): number {
  return L.money + assetsValue(L) - debts(L);
}
