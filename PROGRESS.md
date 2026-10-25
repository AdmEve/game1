# Progress log — «زندگی ایرونی»

Read this first when resuming. Design: `docs/design.md`. Market research: `docs/market-research.md`.

## How to work on it

- `npm run dev` runs the game in a browser (mobile viewport 390×844). `?debug` exposes `window.__z`
  (`meta`, `currentLife()`, `kill()`).
- `npm test` plays 300 random lives (crash, NaN and `undefined` checks). `npx vite-node scripts/sim.ts 300`
  prints balance numbers: life expectancy, causes of death, net worth, achievements, prison reasons.
- `npm run build` copies the used Twemoji SVGs into `public/emoji/`, typechecks and builds `dist/`.
- `node scripts/make-icons.mjs` regenerates launcher icons, splash screens and `store/icon-512.png`.
- CI (`.github/workflows/build.yml`) tests, builds and publishes the APK to the `android-latest` release
  of AdmEve/game1. It is signed with a throwaway key until `KEYSTORE_BASE64`/`KEYSTORE_PASSWORD` secrets exist.

## Code map

| Path | What |
|---|---|
| `src/engine/` | Pure simulation: `life.ts` (new life, family), `year.ts` (one year: school, uni, army, work, money, family, health, death, events), `econ.ts` (inflation, dollar, gold, housing, stocks, crypto), `ctx.ts` (helpers events use), `registry.ts` (event/action types), `play.ts` (API for the UI), `hire.ts` (jobs), `achieve.ts` |
| `src/content/` | Data and writing: cities, names, traits, majors, jobs, assets, Hafez; `events/*.ts` (random and milestone events), `actions/*.ts` (activities, money, love/marriage, people, fun) |
| `src/ui/` | DOM UI: `game.ts` (main screen), `flow.ts` (event modals), `tabs.ts` (sheets), `death.ts` (obituary + share), `menu.ts` (home, new life, shop, achievements, graveyard, god mode) |
| `src/save.ts` | Meta progress (gems, purchases, achievements, graveyard) and the current life in localStorage |
| `src/monetize.ts`, `src/config.ts` | Bazaar Poolakey billing + Tapsell ads; SKUs and gem prices |

## Done

- Engine: full year loop, 66 jobs, 40 majors, Konkur with ranks and offers, military service, marriage
  (khastegari → mehriyeh → wedding → kids → divorce/mehr claim), inflation and a currency reform when
  prices pass 1000×, markets, houses/cars with haggling, businesses, emigration, prison, generations.
- About 150 events and actions, 53 achievements, Hafez fortunes on Yalda.
- UI: all screens, the obituary share card, the shop, the daily gift, god mode, VIP extra stats.
- Icons and splash are this game's own.

## Next (most valuable first)

1. More events: aim for 300+ with more Iranian humour, job-specific events (doctor, teacher, driver,
   engineer), more abroad life, more old-age events.
2. A first-run tutorial (explain «+۱ سال», the tabs and the obituary).
3. Upsells: VIP card on the death screen, rate prompt after the 3rd life, gem shortcut when broke.
4. Store listing (`store/listing-fa.md`) and screenshots (`store/*.png`) taken with Playwright.
5. Local notifications for retention (needs a notification icon drawable).
6. Balance pass with `scripts/sim.ts` after each content batch.
