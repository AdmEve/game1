/**
 * Store and ad-network keys. Fill these in from your dashboards before publishing:
 *  - BAZAAR_RSA_KEY: Cafe Bazaar developer panel → your app → «پرداخت درون‌برنامه‌ای» → RSA key.
 *  - TAPSELL_APP_ID and zone ids: tapsell.ir dashboard → your app (Tapsell Plus).
 * With empty values the game still runs: purchases and ads are simply unavailable.
 */
export const CONFIG = {
  BAZAAR_RSA_KEY: '',
  TAPSELL_APP_ID: '',
  TAPSELL_REWARDED_ZONE: '',
  TAPSELL_INTERSTITIAL_ZONE: '',
  BAZAAR_PACKAGE: 'com.admeve.zendegi',
};

export interface Product {
  sku: string;
  title: string;
  desc: string;
  emoji: string;
  /** Toman, shown until Bazaar returns its own price. */
  fallbackPrice: number;
  consumable: boolean;
  gems?: number;
  badge?: string;
}

/** In-app products. Create the same SKUs in the Bazaar panel (prices are set there). */
export const PRODUCTS: Product[] = [
  { sku: 'vip', emoji: '👑', title: 'زندگی VIP', desc: 'بدون تبلیغ اجباری، انتخاب شهر و خانواده، دیدن شانس و پشتکار، روزی ۵ الماس هدیه', fallbackPrice: 149000, consumable: false, badge: 'پرطرفدار' },
  { sku: 'god_mode', emoji: '🔮', title: 'قدرت سرنوشت', desc: 'هر وقت خواستی آمار و ویژگی‌هات رو عوض کن', fallbackPrice: 99000, consumable: false },
  { sku: 'rich_family', emoji: '💰', title: 'تولد در خانواده‌ی پولدار', desc: 'موقع شروع زندگی، خانواده‌ات رو خیلی پولدار انتخاب کن', fallbackPrice: 49000, consumable: false },
  { sku: 'careers', emoji: '🌟', title: 'شغل‌های ویژه', desc: 'فوتبالیست حرفه‌ای، بازیگر، خواننده، خلبان و تاجر بازار', fallbackPrice: 69000, consumable: false },
  { sku: 'no_ads', emoji: '🚫', title: 'حذف تبلیغات', desc: 'برای همیشه بدون تبلیغ بین سال‌ها', fallbackPrice: 59000, consumable: false },
  { sku: 'gems_50', emoji: '💎', title: '۵۰ الماس', desc: 'برای ماشین زمان، پارتی و دکتر خصوصی', fallbackPrice: 29000, consumable: true, gems: 50 },
  { sku: 'gems_150', emoji: '💎', title: '۱۵۰ الماس', desc: '۲۰٪ بیشتر', fallbackPrice: 69000, consumable: true, gems: 150, badge: 'محبوب' },
  { sku: 'gems_400', emoji: '💎', title: '۴۰۰ الماس', desc: '۴۰٪ بیشتر', fallbackPrice: 149000, consumable: true, gems: 400 },
  { sku: 'gems_1000', emoji: '💎', title: '۱۰۰۰ الماس', desc: 'به‌صرفه‌ترین', fallbackPrice: 299000, consumable: true, gems: 1000, badge: 'به‌صرفه‌ترین' },
];

/** 💎 prices of things you can buy with gems. */
export const GEM_COST = {
  revive: 20,
  undoYear: 12,
  cash: 10,
};
