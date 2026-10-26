# Progress log: «راه‌بندون» (Rahbandoon)

Read this first when resuming. The design is in `rahbandoon/GDD.md` (approved by the owner). This repo
used to hold the life simulator «زندگی ایرونی»; its final state is commit `2904b60` on this branch
(local tag `zendegi-irooni-final`; pushing tags is blocked here).

## How to work on it

- `npm run dev` serves the game (mobile viewport 390×844). Query flags:
  - `?play` skips the home screen
  - `?shot` stops the render loop (for headless screenshots) and exposes `window.__rb`:
    `session()`, `advance(sec)` (steps animations and draws one frame), `startLevel()`, `save`
- `node scripts/shot.cjs "<query>" out.png <ms> "<js to run first>"` takes a 390×844@3x screenshot from the
  dev server with SwiftShader. Example: `node scripts/shot.cjs play /tmp/a.png 2000 "window.__rb.session().tap(3)"`.
- `npm test` checks the rules and that all levels are valid and solvable (solver replay).
- `npm run levels` regenerates `src/game/levels.json` from the specs in `scripts/gen-levels.ts`. It picks
  each level from many seeds to hit a target win rate for a simulated casual player.
- Icons and splash: render the hero car with `scripts/icon-car.html` (served by the dev server, captured with
  an omitBackground screenshot into `scripts/art/hero-taxi.png`), then run `node scripts/make-icons.mjs`.
- CI (`.github/workflows/build.yml`) tests, builds and publishes the APK to the `android-latest` release.

## Code map

| Path | What |
|---|---|
| `src/game/rules.ts` | Pure rules: grid, exits, bays, boarding, win/lose, boosters (crane = force exit, whistle = reorder queue head, extra bay) |
| `src/game/solver.ts` | DFS solver with dead-state memo, and simulated random/greedy players for difficulty |
| `src/game/levels.json` | The 30 Journey levels (generated) |
| `src/render/cars.js` | Parametric Iranian cars (Peykan, Pride, 405, Samand taxi, Zamyad, BRT bus): swept bodies, exact glass/trim edges via marching-triangle clipping, decals by raycast, Iranian plates |
| `src/render/fleet.ts` | Bakes each model+color into a few merged meshes, caches it, wraps it for the board (faces −z, `body` child for suspension) |
| `src/render/world.ts` | The Tajrish diorama: lot, ring road, bays, sidewalk, جوی, shelter, kiosk, plane trees, apartments, Milad/Azadi, Alborz |
| `src/render/anim.ts` | Tweens, rounded paths, `drive()` with acceleration, pitch and roll |
| `src/render/people.ts`, `fx.ts` | Passengers (men, women in manteau and scarf), smoke, coins, confetti |
| `src/play/session.ts` | One level in play: turns taps into rule events and those into ordered animations |
| `src/main.ts` | Renderer, camera fit (the lot sits above the booster bar), input picking, level flow, screens |
| `src/ui/hud.ts`, `src/style.css` | DOM HUD (plate-shaped level badge, coins, boosters), modals |
| `src/audio.ts` | Synthesised SFX: horns per car type, engine, chirps, pops, coins, whistle, crane, santur plucks |

## Status

### Done
- Rules, solver (with locks, reveals, VIP, plate camera, officer), 120 solver-verified levels in 4 chapters
- Chapters: 1 Tajrish (day), 2 Valiasr (sunset, plane-tree boulevard), 3 Azadi Square (night, lit windows),
  4 Tochal in snow (snowy world, falling snow, cable car; «پلیس راهور» traffic officer from level 93)
- «ساعت شلوغی» daily challenge generated on the phone from the date (`src/game/daily.ts`, `src/game/generator.ts`)
- Mechanics: «چادر ماشین» covers, «پیکان خراب» wait counter, «دربست» VIP passengers, «طرح زوج و فرد» plates
  with an auto-switching camera (never wedges); Mash Rahim intro cards
- Real 3D Iranian cars, driving around the ring road into bays, boarding, departure with coins and combos
- Feel: press squash, honk bubbles, combos, camera shake, idle passengers, waddle, confetti
- Adaptive music (6/8 tombak, santur in Mahur, tension layer), synthesized SFX
- Meta: «دکه» shop (boosters for coins, coin packs and starter pack via Poolakey), daily gift calendar,
  chest every 5 levels, rewarded ads (double coins, continue), capped interstitials, Bazaar rating prompt
- Adaptive quality tiers (frame-rate probe), tilt-shift + vignette + per-chapter colour grading
- Mechanic: «پیک موتوری» courier bikes (wild card, from level 41); colour-blind mode; garage with 4 classics
- Level select (settings → «انتخاب مرحله»); tap the version label 7 times to unlock every level (testers)
- Fair lose screen (names and highlights the car the queue needed), tips on levels 1–3, radio bulletins,
  per-chapter music moods, street life (pigeons, idling cars, kerb parking)
- Store: `store/listing-fa.md` and captioned screenshots (`node scripts/store-shots.cjs`)
- Tests: `npm test` (rules + all levels solvable), `node scripts/playthrough.cjs 1 7 30 61` (real client),
  `node scripts/stress.cjs 12 30 55` (random rapid taps, visual/rules sync)

### Next
- Chapter 5+ (Grand Bazaar), district league (needs a backend), more garage classics (Jeep Willys, Benz bus)
- «رادیو راه‌بندون» bulletins, district league (needs a backend), chapter 4+ (Grand Bazaar, Tochal)
- Real-device performance check (owner), real recorded horns and voice lines
- Before publishing: permanent signing key secrets, Bazaar RSA key and Tapsell ids in `src/config.ts`

## Gotchas
- Never `pkill -f` a pattern that also appears in your own command line: it kills your shell.
- `scripts/copy-emoji.mjs` only adds missing emoji SVGs (safe while the dev server runs).
- In `?shot` mode the render loop is off: call `window.__rb.advance(sec)` to step animations.
