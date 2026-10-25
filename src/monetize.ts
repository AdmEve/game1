import { Capacitor, registerPlugin } from '@capacitor/core';
import { CONFIG, PRODUCTS, type Product } from './config';
import { meta, persist } from './save';

interface BazaarPlugin {
  connect(o: { rsaKey: string }): Promise<{ connected: boolean }>;
  getPrices(o: { skus: string[] }): Promise<{ prices: Record<string, string> }>;
  purchase(o: { sku: string }): Promise<{ purchased: boolean; token?: string }>;
  consume(o: { token: string }): Promise<void>;
  owned(): Promise<{ skus: string[]; tokens: Record<string, string> }>;
  rate(o: { packageName: string }): Promise<void>;
}

interface AdsPlugin {
  init(o: { appId: string }): Promise<void>;
  rewarded(o: { zoneId: string }): Promise<{ rewarded: boolean }>;
  interstitial(o: { zoneId: string }): Promise<{ shown: boolean }>;
}

const native = Capacitor.isNativePlatform();
const Bazaar = registerPlugin<BazaarPlugin>('Bazaar');
const Ads = registerPlugin<AdsPlugin>('Ads');

let bazaarReady = false;
export const prices: Record<string, string> = {};

export async function initMonetization() {
  if (!native) return;
  if (CONFIG.TAPSELL_APP_ID) Ads.init({ appId: CONFIG.TAPSELL_APP_ID }).catch(() => {});
  if (CONFIG.BAZAAR_RSA_KEY) {
    try {
      bazaarReady = (await Bazaar.connect({ rsaKey: CONFIG.BAZAAR_RSA_KEY })).connected;
      if (!bazaarReady) return;
      const p = await Bazaar.getPrices({ skus: PRODUCTS.map((x) => x.sku) });
      Object.assign(prices, p.prices);
      await restorePurchases();
    } catch { bazaarReady = false; }
  }
}

export function iapAvailable(): boolean {
  return !native || bazaarReady;
}

export async function restorePurchases() {
  if (!bazaarReady) return;
  const { skus, tokens } = await Bazaar.owned();
  for (const sku of skus) {
    const p = PRODUCTS.find((x) => x.sku === sku);
    if (!p) continue;
    // Consumables that were paid for but never delivered (app closed mid-purchase).
    if (p.consumable && tokens[sku]) {
      await Bazaar.consume({ token: tokens[sku] });
      deliver(p);
    } else if (!p.consumable) deliver(p);
  }
  persist();
}

function deliver(p: Product) {
  if (p.gems) meta.gems += p.gems;
  if (p.sku in meta.owned) (meta.owned as Record<string, boolean>)[p.sku] = true;
  if (p.sku === 'vip') meta.owned.no_ads = true;
  persist();
}

/** Buy a product. In the browser build purchases are simulated so the flow can be tested. */
export async function buy(sku: string): Promise<boolean> {
  const p = PRODUCTS.find((x) => x.sku === sku);
  if (!p) return false;
  if (!native) {
    if (!confirm('نسخه‌ی آزمایشی: خرید شبیه‌سازی شود؟')) return false;
    deliver(p);
    return true;
  }
  if (!bazaarReady) return false;
  try {
    const r = await Bazaar.purchase({ sku });
    if (!r.purchased) return false;
    if (p.consumable && r.token) await Bazaar.consume({ token: r.token });
    deliver(p);
    return true;
  } catch { return false; }
}

export function priceLabel(p: Product): string {
  return prices[p.sku] ?? `${p.fallbackPrice.toLocaleString('fa-IR')} تومان`;
}

export function rewardedAvailable(): boolean {
  return !native || (!!CONFIG.TAPSELL_APP_ID && !!CONFIG.TAPSELL_REWARDED_ZONE);
}

/** Show a rewarded video; resolves true if the player earned the reward. */
export async function showRewarded(): Promise<boolean> {
  if (!native) {
    await new Promise((r) => setTimeout(r, 700));
    return true;
  }
  if (!rewardedAvailable()) return false;
  try { return (await Ads.rewarded({ zoneId: CONFIG.TAPSELL_REWARDED_ZONE })).rewarded; } catch { return false; }
}

/** Interstitial between years: never in the first 15 minutes, never for VIP / no-ads. */
export async function maybeInterstitial(): Promise<void> {
  meta.yearsSinceAd++;
  if (meta.owned.no_ads || meta.owned.vip) return;
  if (Date.now() - meta.firstOpen < 15 * 60 * 1000) return;
  if (meta.yearsSinceAd < 8) return;
  if (!native || !CONFIG.TAPSELL_APP_ID || !CONFIG.TAPSELL_INTERSTITIAL_ZONE) return;
  meta.yearsSinceAd = 0;
  try { await Ads.interstitial({ zoneId: CONFIG.TAPSELL_INTERSTITIAL_ZONE }); } catch { /* no fill */ }
}

export function rateApp() {
  meta.rated = true;
  persist();
  if (native) Bazaar.rate({ packageName: CONFIG.BAZAAR_PACKAGE }).catch(() => {});
  else window.open(`https://cafebazaar.ir/app/${CONFIG.BAZAAR_PACKAGE}`, '_blank');
}
