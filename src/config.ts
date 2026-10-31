/**
 * Store and ad-network keys. Fill these in from the dashboards before publishing:
 *  - BAZAAR_RSA_KEY: Cafe Bazaar developer panel → the app → «پرداخت درون‌برنامه‌ای» → RSA key.
 *  - TAPSELL_APP_ID and zone ids: tapsell.ir dashboard → the app (Tapsell Plus).
 * With empty values the game still runs: purchases and ads are simply unavailable on phones
 * (and simulated in the browser build so the flows can be tested).
 */
export const CONFIG = {
  BAZAAR_RSA_KEY: '',
  TAPSELL_APP_ID: '',
  TAPSELL_REWARDED_ZONE: '',
  TAPSELL_INTERSTITIAL_ZONE: '',
  BAZAAR_PACKAGE: 'com.admeve.rahbandoon',
};

export interface Product {
  sku: string;
  title: string;
  desc: string;
  icon: string;
  /** Toman, shown until Bazaar returns its own localized price. */
  fallbackPrice: number;
  consumable: boolean;
  coins?: number;
  boosters?: number;
  badge?: string;
}

/** In-app products. Create the same SKUs in the Bazaar panel. */
export const PRODUCTS: Product[] = [
  { sku: 'starter', icon: '🎁', title: 'بسته‌ی شروع', desc: '۲٬۰۰۰ سکه + از هر کمکی ۳ تا', fallbackPrice: 29000, consumable: false, coins: 2000, boosters: 3, badge: 'یک‌بار' },
  { sku: 'coins_s', icon: '🪙', title: '۱٬۰۰۰ سکه', desc: 'یه کیسه سکه', fallbackPrice: 19000, consumable: true, coins: 1000 },
  { sku: 'coins_m', icon: '💰', title: '۳٬۰۰۰ سکه', desc: '۲۰٪ بیشتر', fallbackPrice: 49000, consumable: true, coins: 3000, badge: 'محبوب' },
  { sku: 'coins_l', icon: '💰', title: '۸٬۰۰۰ سکه', desc: '۴۰٪ بیشتر', fallbackPrice: 99000, consumable: true, coins: 8000 },
  { sku: 'coins_xl', icon: '🏦', title: '۲۰٬۰۰۰ سکه', desc: 'به‌صرفه‌ترین', fallbackPrice: 199000, consumable: true, coins: 20000, badge: 'به‌صرفه‌ترین' },
  // «قلک»: breaks open the coins saved up from wins (see src/ui/piggy.ts); not listed with the packs.
  { sku: 'piggy', icon: '🏺', title: 'قلک', desc: 'سکه‌های جمع‌شده‌ی قلکت', fallbackPrice: 39000, consumable: true },
  // «کارت بلیت»: this month's premium pass track.
  { sku: 'pass', icon: '🎫', title: 'کارت طلایی', desc: 'جایزه‌های طلایی کارت بلیت این ماه', fallbackPrice: 79000, consumable: true },
  { sku: 'no_ads', icon: '🚫', title: 'حذف تبلیغات', desc: 'برای همیشه بدون تبلیغ بین مرحله‌ها', fallbackPrice: 59000, consumable: false },
];

/** While testing, every Journey level is open from the start (the level picker ignores progress). */
export const UNLOCK_ALL_LEVELS = true;
