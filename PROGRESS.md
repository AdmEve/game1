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

### Phase 0: vertical slice (in progress)
- [x] Rules, solver, 30 solver-verified levels with a sawtooth difficulty curve
- [x] Real 3D Iranian cars in the game, driving routes around the ring road into bays
- [x] Passengers board, cars depart with horn and coins; win and lose flow; continue with the 6th bay
- [x] Boosters: crane, police whistle, parking bay; coins economy
- [x] Home screen, win and lose screens, settings; icon and splash from a 3D render
- [ ] Verify the APK on a real phone (performance tiers if needed)
- [ ] Music (adaptive layers), real recorded horns and voice lines
- [ ] Polish: car idle animations, passenger walk cycles, a tutorial hand on level 1–3, a hint for blocked taps
- [ ] Chapter diorama polish: Tajrish square details, time-of-day lighting

### Next phases
See the roadmap in `rahbandoon/GDD.md` §12 (alpha: meta, garage, shop, Poolakey, ads, 150 levels).
