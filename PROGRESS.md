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
- Pride: wrapped wedge headlamps, slatted grille, wedge tail lamps.

## AAA overhaul (realism pass)
- Render: HDR multisampled scene → bloom (1/4 + 1/8 blur chain), ACES, color grade (saturation/contrast/split-tone per chapter and weather), lens vignette, film grain (`render/post.ts`). Tilt-shift (miniature look) removed. Physical Preetham sky + city ring baked to PMREM for reflections (`skyEnv`), per chapter sun direction; overcast sky in rain/snow.
- Cars: toon outlines removed; automotive metallic paints with clearcoat; mesh density 0.14 → 0.3 (0.22 on phones); car-shaped AO under every car; slim navigation arrows. Car covers are now silver satin draped over a sedan silhouette.
- World: procedural PBR surfaces (`render/surfaces.ts`: fast lattice fBm → albedo + normal + roughness): weathered asphalt with sealed cracks/oil, grass, concrete paving, worn road paint; leaf-card plane trees and shrubs (no back-face darkening); Alborz ridge from displaced noise; real-proportion people.
- Level design: each chapter has its own lot ground (asphalt / bazaar brick / Darband cobbles / Tabiat concrete deck / Azadi stone plaza) and its own obstacles (cones, produce crates, stone planters, water barriers).
- Weather: fine motion-blurred rain (2–2.6k streaks), ripples, puddle reflections, drifting fog banks, three-size snow, patchy snow on roofs and slushy roads, tumbling 3D leaves, multi-stroke lightning. Night: moonlight, warm city glow, floodlights over the lot.
- UI: premium theme (`theme.css`): dark glass, hairlines, amber accent, line icons (`ui/icons.ts`), cinematic wordmark.
- City: instanced Tehran blocks out to the Alborz (world-space window facades, lit windows at night, sightline kept clear of high-rises in front of the landmark), urban ground, physical sky as the backdrop. Azadi and Milad towers rebuilt to their real shapes. Flower beds as blossom cards, reflective fountain water.
- Settings: «کیفیت گرافیک» (auto / high / balanced / simple). Auto keeps the frame-rate probe that steps down; fixed tiers set pixel ratio, post on/off and shadow resolution.

## Performance pass (phones)
Measured per feature (headless, CPU-rasterised as a fill-rate proxy): the AAA build cost ~2.4× the pre-AAA build — leaf cards (18.5k alpha-tested quads, also redrawn into the shadow map) ~48%, cars ~33%, periodic shadow-map refresh ~30%.
- `render/profile.ts`: render profile chosen at load (before materials exist). Phones default to **lite**: no film post pass (static CSS vignette), standard instead of clearcoat/sheen materials, no plate/rim/lamp-face textures (12 → ~7 draw calls per car), car mesh density 0.17, ground without normal maps and 256² textures, 45% weather particles, one fog bank, pixel ratio 1.1.
- Foliage: far fewer, bigger leaf cards; cards no longer cast shadows — an invisible low-poly proxy per crown does.
- Baked meshes re-indexed after merging (mergeVertices).
- Lite: nothing that moves casts shadows, so the shadow map is drawn once per level / camera fit (no every-8-frames spike).
- Scene renders at half rate behind menus; auto-quality probe reacts faster (1.5 s, < 52 fps).
- Settings «بالا» opts a phone into the full look (app restarts to apply).

## AAA fluidity pass (Nov 2026)
Plan: `rahbandoon/AAA_PLAN.md` (every aspect of the game, measured, prioritised; fluidity first).
Tools: `scripts/perf.cjs` (startup timings, long tasks, frame stats per scenario on a throttled CPU),
`scripts/cpuprof.cjs` (self time per function), `scripts/gpucost.cjs` (render cost per scene part),
`scripts/fpsprobe.cjs` (real-loop frame rate under variations).
- **Instanced drawing** (`render/instancer.ts`): placed models keep their node tree but their leaves are `Slot`s;
  before every render (scene.onBeforeRender) the slots under the level's group are gathered into one
  InstancedMesh per (geometry, material). Cars are built once per *kind* (paint is a marker material; each car
  tints a shared white paint with its instance color), arrows and shadow blobs are slots too, passengers are 8
  prebuilt looks with the coat color per instance. Level 60: draw calls 384 → ~169, car draws no longer grow
  with the number of cars. `?noinst` draws cars on their own for comparison.
- **Atlas in bake()**: parts with their own canvas texture but otherwise equal materials (building facades,
  plates) are packed into one texture and merged: world draw calls 85 → 38.
- **No hitches in play**: no passenger is built during play (looks prebuilt; grandmas cached per color), smoke
  puffs come from a fixed pool with persistent materials, effect shaders compiled at load with the real
  materials, arrow materials kept across levels, shader-log checks off outside `?debug`.
- **Startup**: a loading screen with a progress bar (`index.html`, compositor-only animation); the boot builds
  every model, every passenger look and the first world (sliced: `buildWorldSteps` is a generator), compiles
  all shaders and draws the first frame under it. Nothing heavy runs behind the menus afterwards.
- **Menus**: the 3D view draws a few frames after a card opens and then holds still (the win keeps its confetti
  live ~3 s); cards animate transform/opacity only (rise-and-fade in 280 ms, out 160 ms), the backdrop fades
  via a pseudo-element, buttons squash on press, glow keyframes are transform-only.
- **Level changes**: `goLevel()` dips to a veil, builds a new chapter's world in slices (loading dots), compiles,
  draws one frame underneath and lifts the veil.
- **Next level ready before you tap**: the world depends on the lot size, so most level changes need a new one.
  While the win card is up (after the confetti) the next level's world is built in thin slices and its
  textures uploaded one per frame; `worlds` keeps two (on screen + prepared), builds in progress are shared.
  Next-level change: ~3.7 s → ~0.5 s headless (the veil's dip).
- Level cleanup no longer disposes materials (only textures/geometry): their shader programs stay compiled,
  so the next level doesn't stall recompiling weather, badges and props.
- Hints are searched in a worker (`src/workers/hint.worker.ts`); the tutorial hand waits for the answer.
- Garage and agency share one persistent small WebGL view (`ui/stage.ts`) with cached models.
- Pigeons and car covers are instanced; parity/officer signs sit under the time/taps counter.
- Idle board renders at 30 fps (`pacer.frame(t, calm)`; back to full rate on any touch, tween or drive), so a phone
  stays cool and doesn't throttle itself into stutter. The governor can also raise resolution (up to 1.5×) when
  there's headroom. The perf HUD's fps reads 30 on an idle board by design.
- Startup builds only the first level's car kinds; the rest are built behind the veil or during the win card.
- Launch: `scripts/make-icons.mjs --splash` draws the Android splash from `index.html`'s own splash markup (navy,
  hero taxi, logo); WebView/native/Android 12 splash colors are the same navy; the logo font is preloaded.
- Home screen fits every phone height (it overflowed on 360×640 / 360×740: the play button was off-screen).
- Checks used this pass: `npm test`, `scripts/stress.cjs` against `vite preview` (URL=… env), an end-to-end
  play-to-win-and-next run, screenshots at 360×640 / 360×740 / 412×915.
- **Sharpness (owner: "fluid now, but blurry")**: phones drew the 3D view at ~1.1 pixels per point (screens have
  2.5–3). Lite tiers are now 1.0 / 1.4 / 1.8 (full: 1 / 1.5 / 2), ground textures use 4× anisotropy, and the
  'auto' governor steps down only if a phone can't hold its frame rate (two steps at once when far behind). What it
  settles on is remembered per phone (`rahbandoon.pace.v1`), including the sharpest step it proved it can't hold.
  Two governor flaws found by `tests/pacing.test.ts` are fixed: a struggling phone's slow rAF read as a "30 Hz
  screen" (refresh is now snapped to 60/90/120), and intervals over 40 ms were ignored (a ~20 fps phone never
  measured anything).

## Best-in-market pass, aspect by aspect (Nov 2026)
Plan and per-item results: `rahbandoon/BEST_IN_MARKET_PLAN.md` (17 aspects: now / bar / gaps / actions with checks).
- **Taps** pick the car drawn under the finger (`Session.pickRay`: the ray against each car's real shape,
  instanced parts tested as the meshes they stand for, `raycastModel` in instancer.ts). `scripts/tapprobe.cjs`:
  100% right against real-mesh raycasts (old ground-cell pick 93.7–99.3%). Tap ring on press (fx.ts `tapRing`).
- **Back button**: `asBack(button)` marks a card's back target; `backPress()` presses the top card's. Play → crane
  off → pause card. Home → press twice to exit. Pause card: continue, restart, levels, home, then settings; also
  opens on returning from another app mid-level. Home on the win card. `scripts/backnav.cjs` (Escape = back).
- **Save**: main + `.bak` copy, versioned (`v`), loads the first whole copy. Error log (`errlog.ts`), shareable
  from Settings.
- **Onboarding**: level 1 spotlight for two taps (`seen.spot`); after a mechanic's card, a ring and its name mark
  it (`Session.mechanicSpot`, `pointAt`). Cover intro text fixed (covers come off only when the car drives out).
  Level start cancels a running swoop (`swoopId`). `scripts/onboarding.cjs`.
- **Win**: camera drifts back during the beat (`cheer` hook); reward counts up, coins fly into a wallet over
  the card (`ui/juice.ts`). `scripts/winpayout.cjs`.
- **Accessibility/audio**: music and SFX sliders (`sfxVol`/`musicVol`, `sound`/`music` kept in sync), ducking
  under jingles (`duckMusic`), reduced motion (follows the OS; `.reduce-motion`), larger text (`.big-text`).
  `scripts/access.cjs`.
- **Win streak** (`streak.ts`): free bay → + crane → + whistle on the next new level (`hud.free`, never in the
  inventory); asks before giving a played level up. **Last bay** glows red (`bayWarning`). **Level stats**
  (`levelstats.ts`) for testers. `scripts/streak.cjs`.
- **Reminders** (`notify.ts`, @capacitor/local-notifications): lives full / next-day rush hour, only while away,
  never 22:00–09:00; asked after level 10. Icon `res/drawable/ic_stat_rb.xml`.
- **Colours**: purple → violet, orange → amber, per-chapter paint lift (`setPaintLift`); minimum ΔE per chapter
  24–39 (was 17–32), `scripts/colorsep.cjs`.
- Measured and left: draw calls 74–169 on the phone profile (`scripts/draws.cjs`; badges matter only on plate
  levels); weather update < 0.35 ms/frame at 4× CPU.
- Test hooks: `__rb.pick`, `__rb.swooping`, `__rb.pointAt`, `__rb.advance` now also runs `session.idle`.
- **Motion pops** (`scripts/popcheck.cjs`): corners are circular arcs (`roundedPath`, cubic Bézier), lane-offset double
  kinks merge (`mergeKinks`), `drive()` limits speed in bends (`grip`, planned ahead) and heading turn rate
  (`MAX_YAW_RATE`), and overtaking cars merge back before a stop. 0 pops on five levels.
- Route set-up is cheap: `roundedPath` returns its `bends` (arc spans and radii) for `drive()`'s bend speed limit, and sets
  `arcLengthDivisions` to 1 per straight and 24 per arc (0.47 ms per route at 4× CPU, was 2.7). `scripts/perf.cjs` takes `URL=`.
- Polish: the home streak line no longer collides with the lives pill (checked at 360×640/740; Play still fits); the level
  list opens centred on the current level; the boarding twirl is time-based (it spun twice as fast at 60 fps).
- Start-of-level notes (tips, streak gift, clock/tap limits) go through a queue (`queueNote`/`pumpNotes`) shown only
  while the level is in view. Before, they fired 0.9 s after the level was built, often behind the home screen, a
  boss card or the daily gift, and were never seen. Bosses now announce both their clock and their tap budget.
  `scripts/notes.cjs`.
- Effects mix (`scripts/sfxmix.cjs`, `renderSound` in audio.ts): the effects bus (`SFX_BUS`) and per-sound gains set so feedback
  sits level with the music's average; thunder down 10 dB; weather beds and thunder on `ambBus`, which follows the sound slider.
- CI smoke test (`scripts/smoke.cjs`, before the APK is built): the production build boots, wins level 1 following the hints
  with real taps, goes home with back and opens the garage, with no page errors or error-log entries. `__rb.solve` and
  `__rb.errors` are exposed for it.
- Hint worker: if it fails after creation (older WebViews without module workers), waiting requests are answered on the main
  thread and later ones are searched there (before, the hint for that position never came: no hand, no spotlight).
- Event pacing: Yalda nights and Nowruz «سین»s open one a day (`stageOpen` in events.ts; `last` day saved). The banner says
  when the next opens. The two-week windows (14–28 Dec, 14 Mar – 3 Apr) let anyone who starts in the first week finish.
  `?yalda`/`?nowruz` skip the gate for testing. `scripts/eventpace.cjs` runs with the clock set to Yalda week.
- GDD first-session and haptics rules: levels 1–3 can't be lost (a would-be loss opens another bay with a note from Mash
  Rahim, while a bay is left to open); a full car leaving buzzes medium, the success pattern is kept for the win, and
  passengers no longer buzz one by one. The win card shows progress to the next chest (one every five levels).
  `scripts/firstsession.cjs`.
- Win card fits a 360×640 phone even in the worst case (boss win with keys, stars, streak, chest, piggy, Ajool and a new
  medal): rewards share a row, Double and Home share a row under Next, short screens drop the flavour line (journey
  wins only), and card backdrops scroll as a safety net. Before, Next and Home were below the screen there. The lose card's
  streak line no longer promises a continue when none is offered.
- Card layout audit (`scripts/cardfit.cjs`, cards exposed on `__rb.cards`): every card (22: home, pause, levels, shop, garage,
  agency, pass, achievements, chest, intro, no lives, daily, rate, chapter, boss, lose ×2, win, rush/Yalda/Nowruz wins,
  give-up) at 360×640 and 412×915. It must fit, every button must show without scrolling (cards built to scroll need
  only fit), and nothing may overflow sideways. Found: the garage ran 20 px off a 640-tall screen and hid its close
  button; its turntable is now 160 px on short screens. 44/44 pass.
- Card audit with larger text (`BIG=1 node scripts/cardfit.cjs`): all 22 cards fit at 360×640 except the home row, whose
  icon buttons were pushed past the screen edge. The home row now keeps its size and wraps labels in that mode.
- HUD audit in play (`scripts/hudfit.cjs`): on the levels with the most HUD (clock, tap budget, plate-rule or officer
  sign), at 360×640 and 412×915, with and without larger text: no overlaps, nothing off-screen, the top HUD never covers a
  car, and toasts never sit over cars. Fixed: toasts now show in the free band between the lot and the booster bar (they
  covered the top rows of cars right when the player was deciding). Larger text sizes positioned HUD pieces by font size,
  not zoom (zoom pushed the centred toast off the right edge). 12/12.
- Graphics qualities (`scripts/qualities.cjs`, normal play mode; `?shot` pins a 3× ratio for screenshots): every setting
  boots and plays. Auto: lite, ratio 1.8. High: full profile, 2.0. Balanced: 1.4. Simple: 1.0, no shadows, and now also
  lighter geometry (`profile.low`: car tessellation 0.12, coarser passengers, fewer leaf cards and weather particles), at
  287k triangles instead of 341k on level 60, still readable.
- The home screen with event banners (Yalda, Nowruz, both) still fits a 360×640 phone (Play ends at 616 px).

- Long-session memory (`scripts/leakcheck.cjs`, 20 levels across chapter changes and back): GPU memory grew without
  limit (geometries 75 → 540, textures 40 → 165, heap 35 → 74 MB), which on a phone ends in a WebView crash in a long
  sitting. Worlds dropped from the two-world cache are now freed (their bake no longer marks itself "keep"), and things
  removed during a level (badges with canvas textures, covers, crane parts, departed cars, boarded passengers) are freed
  with the level. Now geometries plateau at ~160, textures, shader programs and DOM stay flat, heap 35–49 MB with no trend.
  Rebuilt worlds draw correctly after eviction (screenshots across four chapters and back).
- GPU context loss (`scripts/ctxloss.cjs`): Android WebViews drop the WebGL context when the GPU process restarts or
  memory runs short, often after the app sat in the background. The game came back nearly black (no sky, no
  reflections, no sunlight: the sky maps and the phone's once-per-level shadow map are drawn once on the GPU and were
  lost). They are now rebuilt on restore, in play and in the garage/agency view: the frame after a restore matches
  the one before (mean difference 0.1–0.4 of 255, was 111). A context that never returns reloads the game from the
  save after 6 s on screen. Shader-compile waits are capped so a loss mid-level-change can't leave the veil up.
- Can't-start message (`scripts/fatal.cjs`, in CI): with WebGL unavailable (blocklisted GPU driver, old System
  WebView) the game sat on the splash forever. Now the splash says what's wrong and what to do (update Android System
  WebView and Chrome, restart the phone), with a retry; a failure while loading gets its own message ("progress is
  safe"). Checked at 360×640 and 412×915; the retry reloads.
- Device report for testers (three taps on the version line in Settings → «گزارش دستگاه»): GPU name, render profile,
  pixel ratio and frame governor, screen and memory, and the last five cold starts broken down by stage (fonts, car
  models, world build, shader compile, first frame). Headless tests can't measure real start-up, so this is how the
  < 4 s start target gets checked on a real phone.
- Share a win: on new «سخت» and chapter-final wins and the daily rush, a share button sends friends a picture of the
  level's starting layout (a clean top-down puzzle diagram that never reveals covered cars), "solved in N taps, can
  you?", and the Bazaar link, through the phone's share sheet (Telegram, WhatsApp…). 140 KB JPEG. Checked for seven
  kinds of level by eye (`scripts/sharecard.cjs`); the button shows only on those wins; win cards still fit.
- Bug fixed: a level's result could land on the next level. In the few seconds between the last tap and the win
  card (or a loss and its card), the pause gear still worked, so Restart/Levels/Home started another level and the old
  card then appeared over it, crediting coins and a star to the wrong attempt and freezing the new level. Now a level
  that has been left can't report back, the gear waits like back does, and a result closes the pause card rather than
  stacking on it (`scripts/staleresult.cjs`: 6/6, all six failed before).
- Shared textures (road paint, city windows, weather particles) were freed at the end of every level and uploaded
  again at the start of the next: the disposer ignored the "keep" flag on textures. Fixed, and checked across ten
  mechanics with `scripts/reuse.cjs` (nothing freed is still in use at any level start).
- Older phones: the game needed a 2022 WebView (Chrome 99 to start, 105 for the home screen's layout); many players in
  Iran keep updates off. It now runs and lays out the same on WebView 84+ (a polyfill, and CSS without `:has()` or
  `inset`), checked by screenshots before/after and by `scripts/oldwebview.cjs` in CI. Below 84, the app shows its own
  page explaining how to update Android System WebView (Bazaar or Google Play links) instead of a frozen splash, and a
  failure on an old WebView now says to update it rather than to restart the phone.
- Hold to see the way out: keep a finger on a car for a moment and its route appears on the ground. Green chevrons
  ending in an arrow past the curb if it can leave, red ending at whatever blocks it, amber if a rule holds it back
  right now; it follows tunnels. Quick taps never show it; sliding off cancels the tap as before; covered cars stay
  secret. Useful on dense boards and tap-budget levels, where a blocked tap costs a tap. Level 4's tip teaches it.
  Unit-tested route logic (8 cases) and `scripts/holdpreview.cjs` with real pointer events.
- Small screens (Android "display size: Large", small phones, 320×568 CSS px): the home row and level grid ran off the
  side, a boss win card hid its buttons below the screen, and level-start notes covered the bottom row of cars. All
  fixed; every card fits at 320×568, 360×640 and 412×915 with normal and larger text (132/132), and the HUD audit passes
  at all three sizes (18/18). Both audits now include 320×568 by default.
- Store readiness: a Persian privacy policy (`store/privacy-fa.md`, accurate to what the app does: no servers of ours,
  Tapsell Plus ads, Bazaar purchases, local reminders, opt-in sharing), shown in the game too (Settings → حریم خصوصی)
  from the same file. The store listing text now covers hold-to-see, sharing wins and the accessibility options.
- Store screenshots re-shot with the current look (they still showed the old HUD and render), each caption checked
  against its level (the Tochal shot now really shows the traffic officer). 4.4 MB for all eight (JPEG) instead of 19 MB.
- Helps one at a time (GDD: first booster at level 6): no help bar on levels 1–5; the parking help opens on level 6,
  the crane on 9, the whistle on 12, each introduced by Mash Rahim with a «کمک تازه!» card; helps still waiting show
  locked with their level. Players already further on keep everything. The win streak only gives helps that are open.
  Checked as a fresh player with `scripts/helpsopen.cjs` (10/10) and unit tests.
- Difficulty ramp measured (`scripts/difficulty.ts`, two simulated players on the real rules): level 7, where car covers
  first appear, lost 36–45% of them, more than the «سخت» level 5. Mash Rahim's extra bay on a would-be loss now covers
  levels 1–8 (it was 1–3), so the first lose card comes at level 9 as the GDD says; level 7 falls to 3–7%. Levels 9 and
  on are untouched (chess-level, as decided).
- Hints on request: past the first eight levels the game no longer shows the answer after 10 s of thinking. After
  20 s a small «راهنما؟» chip offers a hint; tapping it shows the hand on the next move. The first eight levels keep
  the automatic hand for beginners. Checked by `scripts/hintoffer.cjs` (in CI).
- Screen readers: every control on the main screens now says what it is (the gear, metro card, trophies, coins, garage
  arrows; settings switches read as on/off). axe-core audit (WCAG 2 A/AA) of eight screens clean, in CI (`scripts/a11y.cjs`).
- A new player's first session, played end to end (`scripts/journey.cjs`): the daily gift no longer pops up before
  level 1 (it starts after three levels), the chest's prizes are readable (they were cream tiles under white text),
  overlapping "great move" texts stack instead of printing over each other, and no two asks pile up after a win (rating
  after level 7, reminders after level 13, the first level that costs a life). The out-of-lives card can turn on the
  "lives are full" reminder right there. A contrast sweep of every card and the HUD fixed seven texts still in the old
  light theme's colours (the out-of-lives clock, shop/garage/agency hints, the daily gift, piggy-bank and medal notes).
- Smaller download: the APK carried its launch splash as eleven PNGs (3.8 MB inside the APK). They are WebP now (0.31 MB, the
  same picture), so the APK drops from 11.8 MB to about 8.3 MB. Shrinking the ad SDK's code could save a few MB more; it is
  listed for the release build, to be tested on a phone first.
- A new player starts playing at once: the first launch goes from the loading screen straight into level 1 (the camera
  sweeps down from the Milad tower, then the first tip and the spotlight), instead of stopping on the home screen
  first. Home appears from the first win on.
- Hard levels feel like an event: the plate turns into a yellow taxi plate (bosses get the red government plate), and a
  «مرحله‌ی سخت!» ribbon opens across the board naming the extra reward (a key and more coins). The lose card's
  «از اول» now says it costs a life when it does, so paying to continue is an informed choice.
- Quitting a level now costs what losing it costs: from level 13, leaving through the pause menu after a move asks
  «ول می‌کنی؟» and takes a life (before, quitting just before a loss dodged it). Before the first move, on the first
  twelve levels, in the daily rush and in events, leaving stays free. Checked in CI by `scripts/quitcost.cjs`.
- Sound for the big moments: a hard level's ribbon and Mr. Ajool's boss card now play a short sting (tombak strokes
  and a low santur chord in Homayun, deeper for the boss), with the music ducking under it.
- Home screen fix: on 360-wide phones (the most common size) «ساعت شلوغی» ran past its button under the metro-card
  button; it now wraps neatly, and the medal badge's number is centred. The card audit now catches any label that
  spills out of its button, on every card at three screen sizes.
- Store banner: `store/feature-1024x500.jpg`, the 1024×500 feature graphic Bazaar and Myket use for featured apps,
  made from the game itself (Milad at dusk, real play on a phone, the yellow taxi, the logo). The listing text now
  names all ten mechanics, the hard and boss levels, and the Nowruz event.
- The city behind each level looks like Tehran from above now: rooftops carry water tanks, evaporative coolers and
  satellite dishes (they were flat grey boxes). Seen in every level's opening camera move; costs 3 draw calls.
- Left-handed layout (Settings → «چپ‌دست»): the gear and coins swap corners and the help bar runs the other way, so
  the controls sit under the left thumb. The last accessibility option the design document promised.
- Fix: the «راهنما؟» hint offer could appear the moment a level came into view, because the 20 s idle clock also
  counted time on the loading screen, home or a card. It now counts only time spent looking at the board.
- Music from the start: inside the app the music now begins as the game opens (with level 1's opening camera move for
  a new player) instead of waiting for the first tap. A browser still waits for a touch, as browsers require.
- Finishing the game: after the 240th level the game used to offer a nonexistent level 241 and replay the final boss.
  Now there's a one-off «تبریک! راه‌بندون باز شد» card (with Mr. Ajool conceding), home says all 240 levels are won,
  and Play opens the level list to replay any level.
- Checked every "all done" state: the fully renovated agency and the fully restored garage were already handled; the
  metro card at the end of the line still pointed to a "next station" and now says the line is finished and that next
  month's card starts again at Tajrish.
- Shop: tapping a help you can't afford now says how many coins you're missing and scrolls to where to get more (it
  only shook before). On-screen notes are solid so they read over anything.
- Floating combo texts («افسانه‌ای!») no longer print into each other or under the counters at the top of the screen;
  a finished daily rush says so when tapped.
- Smarter hints when you're stuck: on the hard levels, when no move can win any more, the hint used to say "maybe
  start over" (which costs a life). It now tells the truth: in 86% of those positions one more parking spot still
  wins, so it says so and the «جای پارک» help pulses; if even that can't save it, it says the level is lost.
- A fair continue: the lose card used to sell «یه جای پارک دیگه» (300 coins or a video) even when one more bay could
  no longer win, which was two times out of three. The game now checks first: if the extra bay can still win, it says
  so; if not, it doesn't sell it and says honestly that this one has to be started over.
- No dead end on a help: tapping a help you have none of, without the coins for it, used to just say «سکه کافی نداری!»
  (right after the hint pointed at it). It now opens a small card: watch a video for one (it's used at once), go to
  the shop, or not now.
- Progress to a new phone: Settings → «انتقال پیشرفت به گوشی دیگه» gives a code with all your progress (send it to
  yourself, e.g. Telegram Saved Messages); on the new phone, «وارد کردن کد» shows both phones' progress and swaps
  after you say yes. Bazaar purchases come back from your Bazaar account as before.
- Settings from the home screen: a gear in the top corner (same place as in play) opens the settings without leaving
  home. Before, they were only reachable from inside a level.
- Purchases and reward videos now say what happened: a failed purchase says to check the internet and Bazaar, a good
  one says what arrived, no ad available says so, and the coin packs reconnect to Bazaar if it was offline at start.
