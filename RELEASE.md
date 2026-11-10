# Releasing «راه‌بندون» — the owner's steps

The game is feature-complete. Every push to the branch builds two signed APKs on the
[release page](https://github.com/AdmEve/game1/releases/tag/android-latest):

| File | For | Billing inside |
|---|---|---|
| `Rahbandoon.apk` | Cafe Bazaar | Poolakey (Bazaar) |
| `Rahbandoon-myket.apk` | Myket | Myket's billing service |

Each build names only its own store (Bazaar's review rejects apps that mention another store), so upload each file
only to its own store. What is left is the steps below: accounts and keys that only you can create, then a check on a
real phone. They are in order.

## 1. A release key (once, and keep it forever)

A store ties every update to the key of the first upload. Lose it and the game can never be updated.

```sh
keytool -genkeypair -keystore zendegi.keystore -alias zendegi -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 zendegi.keystore > keystore.b64      # on macOS: base64 -i zendegi.keystore -o keystore.b64
```

- Use one password for both the store and the key.
- In GitHub → the repository → Settings → Secrets and variables → Actions, add `KEYSTORE_BASE64` (the contents of
  `keystore.b64`) and `KEYSTORE_PASSWORD`.
- Keep `zendegi.keystore` and its password in two safe places (not in the repository).

Until these secrets exist, CI signs with a throwaway key, and the release page says
"temporary test key (NOT for store upload)".

## 2. Store accounts, products and keys

**Cafe Bazaar** (developer panel): create the app with the package name `com.admeve.rahbandoon`. In «پرداخت
درون‌برنامه‌ای», copy the RSA key and create these products. SKUs must match exactly. Prices are in Toman; these are
the defaults, change them as you like (the game shows the store's own price).

| SKU | Type | What it is | Default price |
|---|---|---|---|
| `starter` | non-consumable | «بسته‌ی شروع»: 2,000 coins, 3 of each help, no ads | 29,000 |
| `coins_s` | consumable | 1,000 coins | 19,000 |
| `coins_m` | consumable | 3,000 coins | 49,000 |
| `coins_l` | consumable | 8,000 coins | 99,000 |
| `coins_xl` | consumable | 20,000 coins | 199,000 |
| `piggy` | consumable | «قلک»: the coins saved up from wins | 39,000 |
| `pass` | consumable | «کارت طلایی»: this month's premium pass | 79,000 |
| `no_ads` | non-consumable | no ads between levels | 59,000 |

**Myket** (optional second store): the same app, package name and products, and its own RSA key.

**Tapsell** (tapsell.ir, Tapsell Plus): create the app and two zones: a rewarded video and an interstitial. Copy the
app id and both zone ids.

## 3. Fill in `src/config.ts`

```ts
TAPSELL_APP_ID: '…', TAPSELL_REWARDED_ZONE: '…', TAPSELL_INTERSTITIAL_ZONE: '…',
const BAZAAR_RSA_KEY = '…';
const MYKET_RSA_KEY = '…';       // only if you publish on Myket
export const UNLOCK_ALL_LEVELS = false;   // true opens every level, for testing only
```

With a key left empty the game still runs: that store's purchases (or the ads) are just unavailable.

## 4. Privacy policy

Both stores ask for a link. Put `store/privacy-fa.md` somewhere public (a GitHub Pages page or any site) and give its
link in Bazaar. For Myket, host a copy with «کافه‌بازار» changed to «مایکت». That is what the Myket build shows in
Settings → حریم خصوصی.

## 5. The store page

- Text: `store/listing-fa.md` (name, short and long description, keywords, «تازه‌ها» for what's new).
- Icon: `store/icon-512.png`. Feature graphic: `store/feature-1024x500.jpg`.
- Screenshots: `store/screenshot-1…8.jpg` (1242×2688).

## 6. Check on a real phone before uploading

Install the release-signed APK from the release page on a phone with the store app installed and signed in.
Uninstall any test build first: a different key won't install over it.

- [ ] A fresh install starts straight into level 1; the first 12 levels play smoothly.
- [ ] Buy the smallest coin pack: coins arrive, and the note says so.
- [ ] Buy «حذف تبلیغات» (or the starter pack); uninstall, reinstall, open the shop: it comes back by itself.
- [ ] Cancel a purchase halfway: nothing is charged, no coins arrive, the shop stays open.
- [ ] Watch a rewarded video (double the coins on a win card): the reward arrives.
- [ ] From level 21, an interstitial shows now and then between levels (never after a loss), and never once ads are
      removed.
- [ ] After level 13, the reminders question; say yes and allow notifications.
- [ ] The phone's back button closes cards and pauses a level; on home, a note says to press again, and a second
      press within 2 seconds leaves the game.
- [ ] Settings → «انتقال پیشرفت به گوشی دیگه»: make a code and enter it on a second phone.
- [ ] Turn the internet off and start the game: it plays; the shop says the store can't be reached.
- [ ] On the oldest, slowest phone you have: levels and menus stay smooth.
- [ ] The Myket APK, on a phone with Myket: one purchase end to end.

For testers: three taps on the version line at the bottom of Settings show the frame-rate meter, the levels this phone
found hardest («آمار مرحله‌ها», shareable) and a device report («گزارش دستگاه»). Seven taps open every level.

## 7. Upload

Push (or re-run the last CI build) after step 3, wait for the green build, download both APKs from the release page,
and upload each to its own store. The version number rises with every CI build, so each upload is a valid update.

## Optional: a smaller download

About 2–4 MB less: turn on R8 in `android/app/build.gradle` (`minifyEnabled true`, `shrinkResources true`) with keep
rules for the Capacitor plugins, Poolakey, Myket's billing AIDL and Tapsell Plus. Then repeat the purchase and ad
checks above before uploading.
