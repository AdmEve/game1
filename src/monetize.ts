/** Cafe Bazaar billing (Poolakey) and Tapsell ads through the native plugins in android/. */
import { Capacitor, registerPlugin } from '@capacitor/core';
import { CONFIG, PRODUCTS, type Product } from './config';
import { persist, save } from './save';

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
  if (!CONFIG.BAZAAR_RSA_KEY) return;
  try {
    bazaarReady = (await Bazaar.connect({ rsaKey: CONFIG.BAZAAR_RSA_KEY })).connected;
    if (!bazaarReady) return;
    Object.assign(prices, (await Bazaar.getPrices({ skus: PRODUCTS.map((x) => x.sku) })).prices);
    const { skus, tokens } = await Bazaar.owned();
    for (const sku of skus) {
      const p = PRODUCTS.find((x) => x.sku === sku);
      if (!p) continue;
      // A consumable paid for but never delivered (app closed mid-purchase).
      if (p.consumable && tokens[sku]) { await Bazaar.consume({ token: tokens[sku] }); deliver(p); }
      else if (!p.consumable) deliver(p, true);
    }
  } catch { bazaarReady = false; }
}

export const iapAvailable = () => !native || bazaarReady;

function deliver(p: Product, restoring = false) {
  if (!restoring) {
    if (p.coins) save.coins += p.coins;
    if (p.boosters) for (const k of ['crane', 'whistle', 'bay'] as const) save.boosters[k] += p.boosters;
  }
  if (p.sku === 'starter') save.owned.starter = true;
  if (p.sku === 'no_ads') save.owned.no_ads = true;
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

export const priceLabel = (p: Product) => prices[p.sku] ?? `${p.fallbackPrice.toLocaleString('fa-IR')} تومان`;

export const rewardedAvailable = () => !native || (!!CONFIG.TAPSELL_APP_ID && !!CONFIG.TAPSELL_REWARDED_ZONE);

/** Show a rewarded video; resolves true if the player earned the reward. */
export async function showRewarded(): Promise<boolean> {
  if (!native) { await new Promise((r) => setTimeout(r, 700)); return true; }
  if (!rewardedAvailable()) return false;
  try { return (await Ads.rewarded({ zoneId: CONFIG.TAPSELL_REWARDED_ZONE })).rewarded; } catch { return false; }
}

/**
 * Interstitial between levels: never before level 20, never right after a loss, at most one every
 * four minutes and three wins, never for players who bought anything that removes ads.
 */
export async function maybeInterstitial(levelIndex: number): Promise<void> {
  save.ads.winsSince++;
  persist();
  if (save.owned.no_ads || save.owned.starter || levelIndex < 20) return;
  if (save.ads.winsSince < 3 || Date.now() - save.ads.lastInterstitial < 4 * 60 * 1000) return;
  if (!native || !CONFIG.TAPSELL_APP_ID || !CONFIG.TAPSELL_INTERSTITIAL_ZONE) return;
  save.ads.winsSince = 0; save.ads.lastInterstitial = Date.now(); persist();
  try { await Ads.interstitial({ zoneId: CONFIG.TAPSELL_INTERSTITIAL_ZONE }); } catch { /* no fill */ }
}

export function rateApp() {
  if (native) Bazaar.rate({ packageName: CONFIG.BAZAAR_PACKAGE }).catch(() => {});
  else window.open(`https://cafebazaar.ir/app/${CONFIG.BAZAAR_PACKAGE}`, '_blank');
}
