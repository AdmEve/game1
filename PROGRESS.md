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
- The app loads `src/game/levels.pack.json`, a compact text form of `levels.json` (`src/game/pack.ts`, ~67 KB instead
  of ~590 KB). `npm run levels` writes both; after editing `levels.json` by hand run `npm run pack-levels` (a test
  checks they match).
- `npm run levels -- --from 210` keeps the first 210 levels and only regenerates the rest. `npm run levels` regenerates `src/game/levels.json` from the specs in `scripts/gen-levels.ts`. It picks
  each level from many seeds to hit a target win rate for a simulated casual player.
- Icons and splash: render the hero car with `scripts/icon-car.html` (served by the dev server, captured with
  an omitBackground screenshot into `scripts/art/hero-taxi.png`), then run `node scripts/make-icons.mjs`.
- CI (`.github/workflows/build.yml`) tests, builds and publishes the APK to the `android-latest` release.

## Code map

| Path | What |
|---|---|
| `src/game/rules.ts` | Pure rules: grid, exits, bays, boarding, win/lose, boosters (crane = force exit, whistle = reorder queue head, extra bay) |
| `src/game/solver.ts` | DFS solver with dead-state memo, and simulated random/greedy players for difficulty |
| `src/game/levels.json` | The 240 Journey levels (generated) |
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
- Rules, solver (with locks, reveals, VIP, plate camera, officer, fruit carts, wedding cars, grandmas, tunnels), 240 solver-verified levels in 8 chapters
- Chapters: 1 Tajrish (day), 2 Valiasr (sunset, plane-tree boulevard), 3 Azadi Square (night, lit windows),
  4 Tochal in snow (snowy world, falling snow, cable car; «پلیس راهور» traffic officer from level 93),
  5 Grand Bazaar (domes, arcade, tiled portal; «گاری میوه» rolling fruit carts from level 122),
  6 Darband in autumn (stream, teahouse terraces with daybeds and samovars; «ماشین عروس» wedding cars from level 152:
  a flower-decked car that must be among the first N to leave, with a honking convoy bonus),
  7 Tabiat Bridge in spring (the curving two-deck bridge on tree columns, blossoms; «حاج‌خانم با خرید» from 182:
  a grandma in a floral chador who takes two seats in one car),
  8 Milad Tower at dusk (blue-hour light, lit city; «تونل نیایش» from 212: paired tunnel mouths, a car driving into one
  comes out of the other and carries on; `lane()` in rules.ts walks the hops)
- «ساعت شلوغی» daily challenge generated on the phone from the date (`src/game/daily.ts`, `src/game/generator.ts`)
- Mechanics: «چادر ماشین» covers, «پیکان خراب» wait counter, «دربست» VIP passengers, «طرح زوج و فرد» plates
  with an auto-switching camera (never wedges); Mash Rahim intro cards
- Real 3D Iranian cars, driving around the ring road into bays, boarding, departure with coins and combos
- Feel: press squash, honk bubbles, combos, camera shake, idle passengers, waddle, confetti
- Adaptive music (6/8 tombak, santur in Mahur, tension layer), synthesized SFX
- Meta: «دکه» shop (boosters for coins, coin packs and starter pack via Poolakey), daily gift calendar,
  chest every 5 levels, rewarded ads (double coins, continue), capped interstitials, Bazaar rating prompt
- Adaptive quality tiers (frame-rate probe), tilt-shift + vignette + per-chapter colour grading
- Mechanic: «پیک موتوری» courier bikes (wild card, from level 41); colour-blind mode; garage with 9 classics (incl. Jeep Willys, Peykan Vanet, Benz O302 bus)
- Level select (settings → «انتخاب مرحله»); tap the version label 7 times to unlock every level (testers)
- Fair lose screen (names and highlights the car the queue needed), tips on levels 1–3, radio bulletins,
  per-chapter music moods, street life (pigeons, idling cars, kerb parking)
- «افتخارات» achievements (`src/ui/achieve.ts`): 8 tiered goals (wins, passengers, combo, clean wins, bosses,
  rush streak, garage, chapters) with bronze/silver/gold rewards; trophy button with a badge on the home screen
- «شب یلدا» seasonal event (`src/game/events.ts`, `src/ui/yalda.ts`), 14–28 December: seven night levels in a
  Tajrish decked out for Yalda (pomegranate and watermelon stands, lights, banner); each win earns a pomegranate,
  a «فال حافظ» couplet and coins, the last night 3 keys. Test with `?yalda`; `node scripts/playthrough.cjs y1 y7`
- «آژانس آقاجون» renovation meta (`src/render/agency.ts`, `src/ui/agency.ts`): stars from new wins (1, hard 2, boss 3)
  rebuild grandpa's taxi agency in a 3D diorama: 12 renovations from rubbish clearing to a new Pride, then phase 2
  «محله‌ی آقاجون» (12 more around the street: mural, sangak bakery, saqqakhaneh, kiosk, bus stop, Samand, Vanet); old saves
  are credited for levels already won
- Lives «جون» (`src/lives.ts`, `src/ui/lives.ts`): 5 hearts, giving up on a lost Journey level from level 13 on
  costs one, one grows back every 30 minutes; out of lives → refill for 900 coins, a rewarded ad for one, or wait.
  The daily challenge and events are free
- «قلک» clay money box (`src/ui/piggy.ts`): from level 11 each new win drops 40 coins in (up to 4,000); from 1,000
  it can be broken open with the `piggy` Bazaar product (shown in the shop with its amount)
- «کارت بلیت» monthly pass (`src/ui/pass.ts`): Tehran Metro Line 1 from Tajrish to Shush, 20 stations; every new
  win punches the ticket, two punches per station; a free and a premium («کارت طلایی», `pass` product) reward each
- Level-start camera: when a chapter's place is new in the session, the camera opens on its landmark (Milad, Azadi,
  Tochal, the bazaar portal, Darband, Tabiat Bridge) over the rooftops and sweeps down onto the lot
  (`World.landmark`/`view`; `__rb.swoop(k)` renders any point of the move in `?shot` mode)
- Characters (`src/ui/characters.ts`): SVG portraits of «مش‌رحیم» (speaks the mechanic intro cards) and «آقای عجول»,
  who taunts before each chapter's boss level and makes his excuses on the win screen after it
- «نوروز» event (14 March – 3 April, `?nowruz` to test): seven days in a spring Tajrish with a Haft-Sin table, goldfish
  and sabzeh; each win collects one «سین» and its «عیدی», the last 5 keys. Event and daily levels now show the intro
  card of any mechanic the player hasn't met yet. `node scripts/playthrough.cjs n1 n7`
- Store: `store/listing-fa.md` and captioned screenshots (`node scripts/store-shots.cjs`)
- Tests: `npm test` (rules + all levels solvable), `node scripts/playthrough.cjs 1 7 30 61` (real client),
  `node scripts/stress.cjs 12 30 55` (random rapid taps, visual/rules sync)

### Next
- Chapter 6+ (Darband / Shiraz / Isfahan), district league (needs a backend)
- Real-device performance check (owner), real recorded horns and voice lines
- Before publishing: permanent signing key secrets, Bazaar RSA key and Tapsell ids in `src/config.ts`; create the
  Bazaar SKUs from `PRODUCTS` (including `piggy` and `pass`)

## Performance
- Boot and level building leave `performance.measure` entries (`before-boot`, `fonts`, `level`, `world`, `vehicles`,
  `queue`, `streets`, `first-frame`). Read them with `performance.getEntriesByType('measure')`.
- Measured on the production build (headless, software GPU): about 1 s of the page's own work to the first frame, about
  2.5 s with the CPU throttled 4×, mostly building the world (~0.9 s) and the first level's car models (~0.6 s, later
  ones come from the background warmup).

## Gotchas
- Never `pkill -f` a pattern that also appears in your own command line: it kills your shell.
- Background commands are capped at 2 hours: for screenshots, start vite inside the same command if it is not running.
- `scripts/copy-emoji.mjs` only adds missing emoji SVGs (safe while the dev server runs).
- In `?shot` mode the render loop is off: call `window.__rb.advance(sec)` to step animations.

## Traffic & smoothness pass (Oct 2026)
- Bays are handed out in turn (no two cars in one bay); cars brake for the nearest car body, settle standoffs fairly, and steer round a blocker after waiting 2.5 s.
- Overlap check (`scripts/overlap.cjs`, 1.5 s taps): level 5 went from 401 overlapping frames to 9; level 95 has 24 brief near-touches (worst: 2 cars at once), counting only cars that are actually moving; the earlier ~180 included parked cars.
- Phones: pixel ratio 1.5, cheaper shadows, no backdrop blur, automatic quality step-down below 50 fps.
- Known: with very fast taps the queue can take about 35 s to clear after the last move.

## Exit lane (Oct 2026)
- Cars now leave forward through the top of the bay onto a new exit lane above the bays (no more backing out into arriving cars); the front row of buildings is gone and a low skyline sits further back. The camera frames the whole ring road above the boosters bar.
- Measured (1.5 s taps): level 95 has 1 overlap frame (was 24, originally ~180); cars waited 7 s in total (was 53 s). Level 160 clears 16 s after the last tap (was 33 s).
- Ideas queued: passenger patience and tips by speed, pipelined bays, shorter trips for cars leaving by the bottom, hidden queue, par-move stars.

## Hard mode, weather and music (Oct 2026)
- Levels from 9 on are regenerated with much lower casual win rates (`scripts/gen-levels.ts`: target × 0.55 / 0.42 / 0.33 by chapter, «سخت» levels ≤ 8%, bosses ~4%). Most levels now have 4 pickup bays (a few have 3), every level is still solver-verified.
- `scripts/challenges.ts` then adds tap budgets (blocked taps count), clocks (start at the first tap) and, for bosses, both. Run order: `gen-levels.ts --from 8`, `challenges.ts`, `pack-levels.ts`.
- Weather per map (`src/render/weather.ts`): Tajrish sun motes, Valiasr golden leaves, Azadi night storm with lightning, Tochal snow, Bazaar dust, Darband autumn rain, Tabiat petals, Milad mist with fireflies. Fog never starts closer than the camera distance (42), or the lot disappears.
- Music rewritten (`src/music.ts`): calm 4/4, electric-piano arpeggio, soft pad, seeded pentatonic melody per chapter, round bass, quiet drums, low-passed. Offline render check: centroid 600–1200 Hz, no clipping.

## Fluidity, chess-level levels, hidden cars (Oct 2026)
- Profiling (production build, 4× CPU throttle, software GL): first paint was 1.4 s, now 0.24 s (CSS splash with compositor animation); the first-frame stall (1.6 s) was shader linking, now `renderer.compileAsync` before the first frame; effect shaders (weather, puffs, confetti) are precompiled at idle. Triangles per car 15k → ~7k; phones draw cars without a shadow pass, refresh the shadow map every 4th frame and render at pixel ratio 1.25.
- Scenery is shared by a chapter's levels and kept between them (`worldFor` in session.ts), so the next level builds only cars and people. `disposeTree` now frees every texture slot, sprite and point/line material (textures used to leak between levels).
- Music is rendered once offline (two stems, 8 bars) and looped: no live synthesis, no crackle. Settings shows the build (commit) so testers know which APK they run.
- Levels from 9 on were hardened by hill-climbing (`src/game/harden.ts`, `scripts/harden-levels.ts`): the solver tries the obvious move first, so the nodes it explores measure how often that move is a trap. Average went from ~60 to ~2300 nodes (181 of 232 levels ≥ 1000). Re-run order: `gen-levels.ts` → `harden-levels.ts` (parts, then `--merge`) → `challenges.ts` → `pack-levels.ts`.
- Covered cars only lose their cover when pressed themselves (also when stuck), never when a neighbour leaves.

## Art pass 2 (Oct 2026)
- Camera pitch 54° → 48°: the park and its fountain now sit in the top third instead of a flat grass strip. Cars get a dark back-face outline (`bake(..., { outline })` in fleet.ts: normals welded per position so hard edges don't tear). Park: flower beds (plain meshes: InstancedMesh does not survive `bake`), blue fountain water, benches, hedges, strolling passengers-to-be, lamp posts.
- All Journey levels are open (`UNLOCK_ALL_LEVELS` in config.ts, set it false to restore progress locking).
- Covered cars keep their cover until they actually drive out; a stuck covered car gives nothing away.
- Tried and dropped: a home-screen camera on the chapter landmark (the fog washes it out), and a moving-traffic boulevard behind the park (hidden under the HUD).

## Iranian car accuracy pass
- Headlamps/tail lamps now carry printed faces (reflector bowl + amber indicator; red lens with reverse light), thinner bezels, body-coloured bezels on Samand/Pars.
- New `pars` spec (Peugeot Pars): half of the 405s render as Pars. Peykan: round twin lamps, wide chrome grille.
- `scripts/showroom.html` renders one car for comparison with reference photos.

## Realistic weather pass
- Rain is now camera-facing streaks with a fading tail (not 1px lines), wind gusts vary the slant, ripples bloom on the tarmac, and rainy chapters wet the ground (darker, glossy, reflects the env map). First frame already rains (drops laid out in the constructor).

## Peugeot Pars model (from photos)
- Dedicated `pars` spec + `parsExtra`: shrink-wrapped decals (ray-projected grid meshes) for wedge multi-reflector headlamps with amber indicators, slatted body-colour grille, lion badge, smoked-red wedge tail lamps; black bumper bands with teal pinstripe, fog lamps, silver 5-pocket wheel covers, body-colour mirrors, boot lettering and plate lip. All 405 vehicles now render as Pars.
- Samand: wrapped wedge headlamps, slatted grille + lion, wedge tail lamps, black lower bumper strip (shared `wrapper()` decal helper).
- Peykan: round multi-reflector headlamp faces with chrome rims (new 'round' lamp face, alpha-cut).
