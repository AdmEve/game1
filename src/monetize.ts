/**
 * The store's in-app billing (Cafe Bazaar's Poolakey, or Myket's billing service, in the Myket build: config.ts STORE)
 * and Tapsell ads, through the native plugins in android/.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';
import { CONFIG, PRODUCTS, STORE, type Product } from './config';
import { persist, save } from './save';
import { faNum, note } from './ui/hud';

/** The same in both builds: android/app/src/bazaar/ and android/app/src/myket/ each have their own StorePlugin. */
interface StorePlugin {
  connect(o: { rsaKey: string }): Promise<{ connected: boolean }>;
  getPrices(o: { skus: string[] }): Promise<{ prices: Record<string, string> }>;
  /** `reason` when not purchased: «canceled» by the player, «failed», the flow could not «begin», or already «owned». */
  purchase(o: { sku: string }): Promise<{ purchased: boolean; token?: string; reason?: string }>;
  consume(o: { token: string }): Promise<void>;
  owned(): Promise<{ skus: string[]; tokens: Record<string, string> }>;
  rate(o: { packageName: string }): Promise<void>;
}
interface AdsPlugin {
  init(o: { appId: string }): Promise<void>;
  /** `reason` without a reward: «nofill» (nothing to show), «closed» before the end, or «error» while playing. */
  rewarded(o: { zoneId: string }): Promise<{ rewarded: boolean; reason?: string }>;
  interstitial(o: { zoneId: string }): Promise<{ shown: boolean }>;
}

const native = Capacitor.isNativePlatform();
const Store = registerPlugin<StorePlugin>('Store');
const Ads = registerPlugin<AdsPlugin>('Ads');
let storeReady = false;
export const prices: Record<string, string> = {};
/** The browser build simulates the stores; `?iap=fail` and `?ads=none` make them fail, for tests. */
const sim = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);

export async function initMonetization() {
  if (!native) return;
  if (CONFIG.TAPSELL_APP_ID) Ads.init({ appId: CONFIG.TAPSELL_APP_ID }).catch(() => {});
  await connectStore();
}

/** The store can sell in this build (an RSA key is set), whether or not it is reachable right now. */
export const iapConfigured = () => !native || !!STORE.rsaKey;
let lastTry = 0;
/**
 * The store again, if it wasn't reachable at start (no network, the store app updating): the shop asks on opening, so
 * the coin packs come back without a restart. At most every 15 s.
 */
export async function ensureStore(): Promise<boolean> {
  if (iapAvailable() || !iapConfigured() || Date.now() - lastTry < 15_000) return iapAvailable();
  // Never longer than 8 s: a purchase or the shop waits on this.
  await Promise.race([connectStore(), new Promise((w) => setTimeout(w, 8000))]);
  return iapAvailable();
}

async function connectStore() {
  if (!STORE.rsaKey) return;
  lastTry = Date.now();
  try {
    storeReady = (await Store.connect({ rsaKey: STORE.rsaKey })).connected;
    if (!storeReady) return;
    Object.assign(prices, (await Store.getPrices({ skus: PRODUCTS.map((x) => x.sku) })).prices);
    await restoreOwned();
  } catch { storeReady = false; }
}

/** What the store says the player owns: one-time products back, and a consumable paid for but never delivered (the app closed mid-purchase) delivered now. */
async function restoreOwned() {
  const { skus, tokens } = await Store.owned();
  for (const sku of skus) {
    const p = PRODUCTS.find((x) => x.sku === sku);
    if (!p) continue;
    if (p.consumable && tokens[sku]) { await Store.consume({ token: tokens[sku] }); deliver(p); }
    else if (!p.consumable) deliver(p, true);
  }
}

export const iapAvailable = () => !native || storeReady;

function deliver(p: Product, restoring = false) {
  if (!restoring) {
    if (p.coins) save.coins += p.coins;
    if (p.boosters) for (const k of ['crane', 'whistle', 'bay'] as const) save.boosters[k] += p.boosters;
  }
  if (p.sku === 'pass' && !restoring) {
    // A purchase delivered late (on a later start) belongs to the current month's card.
    const month = new Date().toISOString().slice(0, 7);
    if (save.pass.month !== month) save.pass = { month, punches: 0, free: [], prem: [], premium: false };
    save.pass.premium = true;
  }
  if (p.sku === 'piggy' && !restoring) { save.coins += save.piggy; save.piggy = 0; }
  if (p.sku === 'starter') save.owned.starter = true;
  if (p.sku === 'no_ads') save.owned.no_ads = true;
  persist();
}

/**
 * How a purchase ended: «ok» (delivered), «cancel» (the player backed out, or one was already under way), «error»
 * (the store unreachable or the payment failed), «pending» (paid, but the store didn't confirm the delivery: it comes on
 * the next start, see initMonetization).
 */
export type BuyResult = 'ok' | 'cancel' | 'error' | 'pending';
let buying = false;

/** Buy a product, and say how it went. In the browser build purchases are simulated so the flow can be tested. */
export async function buy(sku: string): Promise<BuyResult> {
  const p = PRODUCTS.find((x) => x.sku === sku);
  if (!p || buying) return 'cancel';
  buying = true;
  try {
    const r = await purchase(p);
    purchaseNote(p, r);
    return r;
  } finally { buying = false; }
}

async function purchase(p: Product): Promise<BuyResult> {
  if (!native) {
    if (sim.get('iap') === 'fail') return 'error';
    if (!confirm('نسخه‌ی آزمایشی: خرید شبیه‌سازی شود؟')) return 'cancel';
    deliver(p);
    return 'ok';
  }
  if (!(await ensureStore())) return 'error';
  let r: { purchased: boolean; token?: string; reason?: string };
  try { r = await Store.purchase({ sku: p.sku }); } catch { return 'error'; }
  // Already theirs (bought before, or paid for and never delivered): take back what the store says they own.
  if (!r.purchased && r.reason === 'owned') { try { await restoreOwned(); return 'ok'; } catch { return 'error'; } }
  if (!r.purchased) return r.reason === 'canceled' ? 'cancel' : 'error';
  if (p.consumable && r.token) {
    // Consumed before it is delivered, so it can never be delivered twice; one retry for a blip.
    const consume = () => Store.consume({ token: r.token! }).then(() => true, () => false);
    if (!(await consume()) && !(await new Promise((w) => setTimeout(w, 1500)).then(consume))) return 'pending';
  }
  deliver(p);
  return 'ok';
}

/** What the player is told after a purchase (the cards add their own celebration on «ok»). */
function purchaseNote(p: Product, r: BuyResult) {
  if (r === 'ok') {
    note(p.sku === 'no_ads' ? 'تبلیغ‌های بین مرحله‌ها برای همیشه حذف شد!' : p.sku === 'pass' ? 'کارت طلایی این ماه مال تو شد!'
      : p.sku === 'starter' ? 'بسته‌ی شروع مال تو شد!' : p.coins ? `${faNum(p.coins)} سکه اومد تو کیفت!` : 'خرید انجام شد!', 2600);
  } else if (r === 'error') note(`خرید انجام نشد. اینترنت و ورودت به ${STORE.name} رو چک کن و دوباره امتحان کن.`, 3600);
  else if (r === 'pending') note('پولش رو دادی و ثبت شد؛ بازی رو دوباره که باز کنی تحویلت می‌دیم.', 4000);
}

export const priceLabel = (p: Product) => prices[p.sku] ?? `${p.fallbackPrice.toLocaleString('fa-IR')} تومان`;

export const rewardedAvailable = () => !native || (!!CONFIG.TAPSELL_APP_ID && !!CONFIG.TAPSELL_REWARDED_ZONE);

let watching = false;
/**
 * Show a rewarded video; resolves true if the player earned the reward. Without one, it says why (nothing to show
 * right now, or closed before the end) rather than leaving the button to quietly come back.
 */
export async function showRewarded(): Promise<boolean> {
  if (watching) return false;
  watching = true;
  try {
    const reason = await rewarded();
    if (reason === 'nofill' || reason === 'error') note('الان تبلیغی برای نمایش نیست؛ چند دقیقه‌ی دیگه دوباره امتحان کن.', 3200);
    else if (reason === 'closed') note('جایزه مال وقتیه که تبلیغ تا آخر دیده بشه.', 2800);
    return reason === 'ok';
  } finally { watching = false; }
}

async function rewarded(): Promise<string> {
  if (!native) { await new Promise((r) => setTimeout(r, 700)); return sim.get('ads') === 'none' ? 'nofill' : 'ok'; }
  if (!rewardedAvailable()) return 'nofill';
  try {
    const r = await Ads.rewarded({ zoneId: CONFIG.TAPSELL_REWARDED_ZONE });
    return r.rewarded ? 'ok' : r.reason ?? 'closed';
  } catch { return 'nofill'; }
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
  if (native) Store.rate({ packageName: CONFIG.PACKAGE }).catch(() => {});
  else window.open(STORE.page, '_blank');
}
