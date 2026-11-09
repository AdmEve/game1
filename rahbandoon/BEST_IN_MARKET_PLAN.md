# «راه‌بندون» — best-in-market plan, aspect by aspect (November 2026)

The owner's brief: every aspect of the game should be top notch and best in the market. Plan before acting,
and don't change things just for the sake of it. For each aspect this file sets out what the game does
today (measured where possible), the bar the best games in the genre set, the gaps, and the actions, each
with a check that shows it is done. The fluidity pass (`AAA_PLAN.md`) came first; this builds on it.

Standing decisions from the owner that this plan keeps:
- **Difficulty stays chess-like from level 9 on** (owner's requests "make levels seriously difficult" and
  "chess-level difficulty"). Onboarding gets better at *teaching*; levels don't get easier.
- **All Journey levels stay unlocked while testing** (`UNLOCK_ALL_LEVELS`). Set it to false for the store build
  (see "Release checklist").

Measurement tools: `scripts/perf.cjs`, `gpucost.cjs`, `cpuprof.cjs`, `fpsprobe.cjs`, `stress.cjs`,
`playthrough.cjs`, `scripts/tapprobe.cjs` (new), vitest.

---

## A. Performance & technical feel

**Now.** Draw calls on level 60 went from 384 to ~153. Idle board runs at 30 fps and play at 60. Startup is
staged behind a loading bar. The next level loads in ~0.5 s (headless). The APK is 11.8 MB.
**Bar.** The GDD targets: 60 fps on a Galaxy A12-class phone, < 120 draw calls, cold start < 4 s, install
< 60 MB, crash-free > 99.5%.
**Gaps.** ~153 draws is above the 120 target. Plate-rule levels add up to ~26 badge sprites, each its own
draw call. Rain streaks are rewritten on the CPU every frame. The game has no field crash data.
**Actions.**
- A1. Draw badges as one instanced billboard batch with an atlas. *Done when* level 60 and an odd/even level
  are each ≤ 120 draws (perf.cjs).
- A2. Animate rain streaks in the vertex shader (static buffers, a time uniform). *Done when* the rain update
  drops out of the CPU profile of a rainy level.
- A3. Error log (see N4).

## B. Core gameplay

**Now.** The loop is tap → drive → park in a bay → board → leave. There are 10 mechanics, 3 boosters, combos,
paid or ad continues, and the car to blame is highlighted on a loss.
**Bar.** The leaders in the Bus Jam and Parking Jam genre make every tap give an instant, readable result,
warn you before you lose, and make every loss clear.
**Gaps.** A loss comes without warning: the last free bay looks like any other.
**Actions.**
- B1. Last free bay warning: when only one bay is left, it pulses red, the music tension rises (that part
  exists already) and a light haptic plays once. *Done when* it shows in a screenshot of a board one bay from
  full, and never shows while two or more bays are free.

## C. Level design & difficulty

**Now.** 240 solver-verified levels in 8 chapters, hardened by hill-climbing (average ~2300 solver nodes), with
tap budgets and clocks. The difficulty curve is a sawtooth, with a «سخت» level every five.
**Bar.** The best games tune their curve from fail-rate data per level.
**Gaps.** The game records no attempts per level, so the real fail rates are unknown.
**Actions.**
- C1. Count attempts, fails and wins per level on the device. A tester view (the perf overlay, or a list under
  the version line) shows the hardest levels, so the owner can report them. *Done when* unit tests cover the
  counts and the tester list shows them.
- The level curve itself stays as it is (owner's decision).

## D. Controls & input

**Now (measured).** A tap is picked by projecting it onto the ground plane (y = 0.45) and taking the cell
under it. Cars are ~1.4 high and the camera looks down at 48°, so a tap high on a car's body can land on the
cell behind it. `scripts/tapprobe.cjs` samples points over every visible car body at 360×740 (a point counts
only where that car is the first thing the ray hits):

| Level | Right car | Wrong car | Nothing |
|---|---|---|---|
| 6 | 97.1% | 1.9% | 1.0% |
| 31 | 95.2% | 2.8% | 2.1% |
| 61 | 97.6% | 1.9% | 0.5% |
| 121 | 95.1% | 2.8% | 2.1% |
| 201 | 90.0% | 6.8% | 3.1% |
| 240 | 92.8% | 5.0% | 2.2% |

The dense late levels are where it matters most. There, about one tap in 15–20 on a car moves a different
car, and on move-limited levels that costs a move.
**Bar.** You tap what you see, and a near miss still counts. That is the norm for top touch games.
**Actions.**
- D1. Pick the car whose shape the tap ray hits first (the ray against each car's oriented box, in its own
  frame). When the ray hits no car, fall back to the nearest car footprint within half a cell of the ground
  point. *Done when* tapprobe shows ≥ 98% right and ≤ 1% wrong on the six levels, and agrees with real-mesh
  raycasts in `?noinst`.
- D2. A soft ring pulse on the ground under the tapped car on `pointerdown`: instant, cheap feedback.
- D3. Back button cancels crane mode (see H1).
- D4. Hold to see the way out (added after the first pass; the GDD's third direction cue, "a soft ground arrow
  while you touch"). A blocked tap costs a tap on budget levels, and on dense boards it is hard to see whether a
  lane is clear. Holding a finger on a car for a moment lays a strip on the ground along its route, through any
  tunnel: clear and ending in an arrow past the lot edge when it can leave; red and stopping at the first thing
  in the way when it can't; amber when a rule holds it back right now (broken car, plate day, officer). Quick
  taps never show it (it waits ~0.15 s), sliding off cancels the tap as before, covered cars stay unspoiled, and
  crane mode shows nothing. One tip line teaches it. *Done when* unit tests cover the route (edge, blocker,
  tunnel, rule hold) and screenshots of a held clear car, a held blocked car and a tunnel route read at a glance,
  and a quick tap never shows the strip.

## E. Game feel ("juice")

**Now.** Press squash, a wiggle for blocked cars, floating coins, combo texts, smooth camera shake, confetti,
a coin chime.
**Bar.** Royal Match-class games give the win a beat of its own: the last piece leaves, the camera breathes, and
the reward counts up and flies to the wallet.
**Gaps.** The win card appears as soon as the last car leaves, and its numbers are static.
**Actions.**
- E1. Win finale: when the lot is clear, hold a short beat (~0.7 s) while the camera eases back and the
  confetti falls, then show the card. The coin reward counts up, and coins fly from the card to the wallet
  pill. *Done when* the win sequence is captured as a frame sequence and the e2e win flow still passes.
- E2. Camera settles at level start with a critically damped ease instead of a linear stop.

## F. Visual art

**Now.** Several AAA passes, sharp on phones since the last pass.
**Bar.** Every car color can be told apart at a glance in every chapter's light, even at night.
**Gaps.** Nobody has measured color separation per chapter.
**Actions.**
- F1. Screenshot audit of all 8 chapters at 360×740, fixing any defect found.
- F2. Measure rendered car colors per chapter (mean color of each car's roof pixels) and the minimum ΔE
  between any two colors. *Done when* every chapter has a minimum ΔE ≥ 20 (CIE76), or the paint/lighting is
  adjusted until it does.

## G. Animation

**Now.** Suspension pitch and roll, cars keeping their distance, passengers walking and boarding, the camera
swoop.
**Actions.**
- G1. Covered by E1 and E2 (camera). Review boarding and leaving in slow motion while doing E1, and fix any pop.

## H. UI / UX

**Now.** Premium dark-glass theme, compositor-only card motion, pressed states, a responsive home screen.
**Bar.** Android's core app quality guidelines: standard back navigation, and app state kept when the app
leaves the foreground ([Core app quality](https://developer.android.com/docs/quality-guidelines/core-app-quality)).
**Gaps.** The back button only opens Settings when no card is open. It can't close a card, cancel the crane
or leave the game. Settings doubles as the pause screen.
**Actions.**
- H1. A back stack: every card registers how to close it. Back closes the top card (or does its "later"
  action). During play, back cancels crane mode first, otherwise opens the pause card. On the home screen,
  back twice within 2 s exits, with a toast after the first press. *Done when* unit tests cover the stack and
  a headless run of `backButton` presses closes cards in order.
- H2. Pause card (resume, restart, level select, settings) for a level in progress, opened by back, by the gear
  and on returning from the background (N2).

## I. Audio

**Now.** Synthesized SFX with voice limits, a compressor on master, rendered music stems that loop, weather
ambience.
**Bar.** Separate music and SFX volumes, music that ducks under jingles, and audio that comes back after the
app returns to the foreground (Android guidelines).
**Gaps.** Sound and music are on/off only, music doesn't duck under the win/lose jingles, and the audio
context is not explicitly resumed after a pause.
**Actions.**
- I1. Volume sliders for music and SFX (0–100) instead of on/off switches. Old saves migrate (off = 0).
- I2. Duck music by about 8 dB for the length of the win/lose jingles.
- I3. Resume the AudioContext on `visibilitychange` and `resume`. *Done when* a headless check shows the
  context state is `running` after a hide/show cycle.

## J. Onboarding

**Now.** A hand hint on levels 1–3, three text toasts, and mechanic intro cards (emoji and text by Mash Rahim).
**Bar.** Teach by showing ([Playtestcloud on Metacore's FTUE](https://start.playtestcloud.com/blog/perfecting-the-first-time-user-experience-in-mobile-games),
[GameRefinery onboarding](https://www.gamerefinery.com/first-impression-seals-the-deal-onboarding-best-practices-part-1)):
the first move is guided with everything else dimmed, and each new mechanic is pointed at in the world, not
only described.
**Actions.**
- J1. Level 1 spotlight: for the first two taps, the board dims except for the hinted car, and a tap
  elsewhere is gently refused (the hand bounces). *Done when* a screenshot shows the spotlight and the e2e run
  still wins level 1.
- J2. In-world mechanic intro: after the intro card closes, a pulsing ring and a short label mark the first car
  (or obstacle) with that mechanic for ~2.5 s.
- J3. Shorter tips (one line each).

## K. Progression & meta

**Now.** Coins, keys, stars, garage, Grandpa's agency, metro-card pass, achievements, chests, piggy bank,
lives.
**Bar.** Win streaks are the one proven feature this game lacks. Candy Crush added them in 2022 and Royal
Match's version reportedly lifted revenue ~38% with a stable D30
([Deconstructor of Fun](https://www.deconstructoroffun.com/blog/2024/8/5/win-streak-the-gift-that-keeps-on-giving),
[Liquid & Grit](https://www.liquidandgrit.com/resource/eight-top-puzzle-apps-use-nearly-identical-win-streak-mechanics-casual-report/)).
**Actions.**
- K1. «گاز بده» win streak: consecutive first-try wins of new Journey levels fill three steps. Each step
  grants a free help at the start of the next level: 1 = an extra bay for this level, 2 = + a whistle,
  3 = + a crane. A loss or a retry resets it. It shows on the home screen and at level start. *Done when*
  unit tests cover the streak rules and a screenshot shows the HUD badge.
- K2. Share a win (added after the first pass). Puzzle games spread by word of mouth, and in Iran that means
  Telegram and WhatsApp; the game has no way to show off a hard win. On «سخت» and chapter-final wins, and the
  daily rush, a share button sends an image: the level's starting layout drawn as a clean top-down puzzle
  diagram (covered cars stay hidden, so it doesn't spoil anything), the level and chapter, "solved in N taps,
  can you?", and the Bazaar link, plus the same as text. Drawn in 2D from the level data (the 3D board is
  empty at the win, and a WebGL capture would stall a phone). Native: written to the app cache and shared
  with the Android share sheet; browser: Web Share, or a download. *Done when* the button shows only on
  those wins, the image is checked by eye for several level types (buses, bikes, covers, obstacles, tunnels),
  fits 1080×1350, and the share call carries the image and the link.

## L. Theme, narrative, characters

**Now.** Tehran chapters with landmarks, Mash Rahim, Mr. Ajool's boss levels, radio bulletins, Yalda and Nowruz.
**Gaps.** None blocking. Characters already open chapters and bosses.
**Actions.** L1. Mr. Ajool's beaten line also shows on the chapter-complete chest (story closure). Low cost.

## M. Accessibility & settings

**Now.** Colorblind symbols, sound, music, haptics and quality settings.
**Bar.** [Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/basic/): readable default text,
adjustable text size, a way to turn off screen shake and heavy motion, adjustable volumes.
**Actions.**
- M1. Reduced motion: a setting that defaults to the OS `prefers-reduced-motion`. It turns off camera shake,
  shortens the swoop to a fade, stops the menu Ken Burns drift and softens card motion.
- M2. Large text: scales all UI text by 1.15 (one CSS variable) without breaking the 360×640 layout
  (screenshot check).
- M3. Volume sliders (I1).

## N. Platform integration

**Now.** Android splash, portrait lock, `allowBackup=true`, music stops when hidden, the clock only runs while
frames render.
**Gaps.** Back navigation (H1). No pause on return (N2). The save is one localStorage key: a corrupted write
resets all progress. JS errors leave no trace.
**Actions.**
- N1. = H1.
- N2. Returning from the background to a level in progress opens the pause card.
- N3. Save safety: every save is written to the main key and a rolling backup (`.bak`). Loading checks both
  and uses the newest copy that parses, and the save carries a schema version. *Done when* unit tests
  corrupt the main key and the progress survives.
- N4. Error log: `error` and `unhandledrejection` go to a ring buffer of 20 in localStorage. Testers can copy
  it from Settings.
- N5. Long sessions: GPU memory, scene, DOM and heap stay bounded over 20+ levels across chapter changes.
  *Done when* `scripts/leakcheck.cjs` shows no growth on the second round.
- N6. GPU context loss (added after the first pass). Android WebViews drop the WebGL context when the GPU
  process restarts or memory runs short, often after the app sat in the background. three.js re-uploads
  geometry and textures by itself, but whatever was drawn once into a render target is gone: the sky
  reflections (PMREM) on every car and building, the garage's and agency's own reflections, and the shadow
  map, which phones draw once per level. Plan: rebuild the reflection maps and redraw the shadow map on
  `webglcontextrestored` (main renderer and the shared stage renderer); bound the shader-compile wait so a
  loss during a level change can't leave the veil up; if no restore comes within a few seconds of being
  visible, reload (the save is already on disk). *Done when* `scripts/ctxloss.cjs` (lose and restore the
  context with `WEBGL_lose_context`) shows the same frame before and after, in play on three chapters and
  in the garage, with no errors, and it failed before the fix.
- N10. Older WebViews (added after the first pass). Many players in Iran keep auto-updates off to save data,
  so Android System WebView can lag years behind. The build needs more than its ES2019 target says:
  `Array.prototype.at` (Chrome 92) and canvas `roundRect` (99) crash at load before those versions, and 19
  CSS `:has()` rules (105) carry the home screen's layout and the HUD's stacking. Capacitor only refuses
  WebViews older than 60, and the game's "didn't open" card then gives the wrong advice. Plan: polyfill the
  JS APIs; replace every `:has()` with a class the code sets, and `inset` with longhands, so Chrome 84 lays
  out the same; set Capacitor's minimum to 84 with its own static page (ES5, no modern CSS) that explains
  updating Android System WebView, with store links; and when a failure happens on an old WebView, the card
  says to update it. *Done when* the smoke test passes with those APIs removed from the page, the CSS has no
  `:has(`/`inset:`, home and HUD screenshots match before/after, and the update page is checked by eye.
- N7. A game that can't start must say so. Without WebGL (a blocklisted GPU driver, an old System WebView) or
  after a failure while loading, the splash sat there with its loading bar forever. Plan: a message on the
  splash saying what's wrong and what to do (update Android System WebView and Chrome, restart the phone), with
  a retry; the save is untouched. *Done when* `scripts/fatal.cjs` sees the message, fitting the screen, and a
  working retry in both cases, and CI runs it.

## O. Monetization & fairness

**Now.** Poolakey IAP, Tapsell rewarded and interstitial ads (none before level 20, none after a loss, at most
one per 4 minutes and 3 wins), no-ads and starter packs, double-coins and continue by ad.
**Gaps.** The keys are empty (owner: Bazaar RSA key, Tapsell app and zone IDs, release keystore).
**Actions.** Nothing in code; the owner supplies the keys (Release checklist).

## P. Retention / live-ops

**Now.** Daily «ساعت شلوغی» with a streak, daily gift calendar, Yalda and Nowruz events, monthly pass.
**Bar.** Local notifications for "lives are full" and "today's challenge is waiting", asked for at a moment
the player sees value in them, not at first launch.
**Actions.**
- P1. Local notifications (`@capacitor/local-notifications`): lives full, and one daily reminder at the time
  of day the player usually plays (never between 22:00 and 09:00). The permission is asked after the 10th
  level win, with a short explanation card first, and can be turned off in Settings.

## Q. QA & tooling

**Now.** 285 unit tests; CI runs the tests and builds the APK; stress, e2e and screenshot scripts.
**Actions.**
- Q1. `scripts/tapprobe.cjs` committed (D1's measurement).
- Q2. Unit tests for every new rule (back stack, streak, save backup, level stats, volume migration).

---

## Order of work (impact first)

1. D1–D2 tap accuracy. Measurable, and it decides games on the dense late levels.
2. H1, H2, N2, N3, N4: back navigation, pause, save safety, error log.
3. J1–J3 onboarding.
4. E1–E2 win finale, camera settle.
5. M1, M2, I1–I3: accessibility and audio.
6. K1 win streak; B1 last-bay warning; C1 level stats.
7. P1 notifications.
8. A1–A2: badges batch, rain on the GPU.
9. F1–F2 screenshot audit and color separation; L1.
10. Re-measure, tests, stress and e2e, screenshots, APK.

## Release checklist (owner)

- `UNLOCK_ALL_LEVELS = false` in `src/config.ts`.
- Bazaar RSA key, Tapsell app and zone IDs in `src/config.ts`.
- Release keystore secrets in GitHub (`KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`).

## Status

| Item | Result |
|---|---|
| D1 tap pick | Picks the car whose drawn shape (body, cover, arrow, badges) the ray hits first, with slots tested as the meshes they stand for. A tap within a third of a cell of a car's body still counts. tapprobe, measured against real-mesh raycasts: **100% right on all six levels** (old pick 93.7–99.3% right, up to 5.5% wrong car). The instanced build gives the same answers in ~1 ms per tap. `REAL=1 scripts/playthrough.cjs` wins levels 1, 7, 34, 120 and 201 through pointer events. |
| D2 tap ring | A warm outline around the pressed car on `pointerdown` (one reused mesh, shader warmed at load). |
| H1 back | Back (and Escape in a browser) presses the top card's marked back button (close, later, got it, continue…). A card that needs a choice (lose) shakes instead. In play, back cancels the crane, then pauses. On the home screen, back twice within 2 s exits, with a note after the first press. `scripts/backnav.cjs`: 11/11 checks. |
| H2 pause + Home | The gear and back open a pause card: Continue, Restart, Levels, **Home**, then the settings. It scrolls on short screens. The win card has Home too, so the garage, the agency, the pass and achievements are reachable mid-journey (before, only at launch). |
| N2 | Coming back from another app in the middle of a level opens the pause card. |
| N3 save | Each save is written to the main key and a backup key, with a format version. Loading takes the first copy that parses and looks like a save. Unit tests corrupt the main copy, return non-saves, and fail the main write. |
| N4 errors | Script errors and rejections go to a 20-entry log on the phone, repeats counted. Settings shows «گزارش خطا (n)» to share it (Android share sheet, or the clipboard in a browser). |
| J1 spotlight | The first time on level 1, the board dims around the suggested car for the first two taps. A tap on another car is refused (the hand shakes, with a light haptic), and the suggested car always answers. Once only (`seen.spot`). `scripts/onboarding.cjs` checks the refusal and acceptance. |
| J2 marker | After a mechanic's intro card, an amber ring and the mechanic's name mark where it first shows (covered car, broken Peykan, courier, wedding car, cart, tunnel, VIP or granny passenger). The plate rule and the officer pulse their HUD sign instead. |
| J3 tips | Level 1–3 tips cut to one line each. |
| Fixes found | The cover intro taught an old rule ("the cover blows off when the neighbour leaves"). Covers now come off only when the car drives out, and the card says so. A level-start camera swoop still running when the level changed kept steering the camera (two swoops fighting); level start now cancels it. |
| E1 win finale | During the existing 1.1 s win beat (confetti, jingle), the camera drifts back 8% along its view. On the card, the coin reward counts up from zero and 4–10 coins arc into a wallet pill shown over the card, which ticks up as each lands (by landings, so the order doesn't matter) and ends on the saved total. The doubled reward flies in too. Also on the daily rush card. Transform and opacity only (Web Animations API). |
| E2 camera settle | Already in place: the level-start swoop ends on an ease-in-out (zero velocity) and the shake decays exponentially. No change needed. |
| I1 volumes | Music and SFX sliders (0–100, squared curve; zero is off). Old saves migrate (off → 0); unit-tested. |
| I2 ducking | Music dips ~8 dB under the win beat (2.2 s) and the lose card (1.6 s), then comes back. |
| I3 audio resume | Already in place: every sound and the music restart resume a suspended context. Checked headlessly: suspended → hide/show → next sound → `running`. |
| M1 reduced motion | «حرکت کمتر» follows the phone's own setting until changed. On: no camera shake, no level-start swoop, no camera drift on win, no home-screen drift, no coin flight or count-up (shown at once), no looping decorations, cards fade without scaling, and the photo-radar flash is soft (photosensitivity). |
| M2 large text | «متن بزرگ‌تر» scales card, settings, toast and HUD label text by 1.15. At 360×640 nothing goes off-screen (`scripts/access.cjs`); cards scroll if they must. |
| K1 win streak | «پشت‌سرهم»: each new Journey level won adds one. Retrying after a loss, or restarting or leaving a played level, resets it, and the pause card asks first when a streak is at stake. The next new level starts with free help: 1 → an extra bay (the barrier lifts), 2 → + a free crane, 3+ → + a free whistle, marked «مجانی» on the booster and never added to the inventory. Shown on the win card, the home screen and the lose card ("at risk"). Rules unit-tested; `scripts/streak.cjs` 7/7. |
| B1 last bay | When one bay is left (logically) with cars still in the lot, its outline glows red. It pulses for 2.4 s, then holds steady, with a light haptic and one toast per level. Checked by a careless-player run: on exactly when one bay is free. |
| C1 level stats | Attempts (from the first tap), losses and wins per Journey level are kept on the phone. Three taps on the version line show the five hardest and copy or share the CSV. Unit-tested. |
| P1 reminders | `@capacitor/local-notifications` 8.3.1. "Lives are full" at the moment they refill (only if that is more than 10 minutes away), and "today's rush hour is here" the next day at the hour this player usually opens the game (median of the last 9 opens, 10–21). Nothing between 22:00 and 09:00. Scheduled only while the game is in the background and cleared on return. Asked once after level 10 with an explainer card, and switchable in Settings (native only). White car status-bar icon. The planner is unit-tested; the native build is verified by CI. |
| F2 colour separation | `scripts/colorsep.cjs` renders all colours under each chapter's light and reads the pixels back. Before: minimum ΔE 17–32 (Darband rain 17, Tochal snow 18, Valiasr sunset 20). Weak pairs were blue/purple almost everywhere, and red/orange in warm light. Purple moved to violet (0x76288c) and orange to a brighter amber (0xe0661a); queue coats follow the same palette. Paint gets a per-chapter self-lift in dim light (strongest 0.16 in the autumn rain). After: **minimum ΔE 24–39 in every chapter** (Darband 26, Tochal 24, Valiasr 27). |
| F1 screenshot audit | All 8 chapters at 360×740 (contact sheet): no rendering defects. Noted: the level-start limit toast briefly overlaps the lot's top edge on levels with a HUD sign (transient, left as is). |
| A1 draw calls (not done, measured) | Lite profile: L1 74, L22 140, L60 155, L93 135, L122 140, L153 111, L183 131, L213 158, L240 169. Sprites (badges) are 25–27 draws only on plate-rule levels and 0–5 elsewhere, so batching them reaches ≤ 120 only on some levels. The rest is a long tail of small, distinct world meshes and instanced batches (1–4 draws each). Reaching 120 everywhere means many separate merges, for a game the owner reports as fluid, so it stays below the line. |
| A2 rain on the GPU (dropped, measured) | Weather update at 4× CPU slowdown: storm 0.26 ms, rain 0.24 ms, snow 0.33 ms per frame (< 2% of a frame). Not worth the code. |
| L1 | Already in place: a chapter's last level is its boss level, and the win card shows Mr. Ajool's "beaten" line. |
| G1 motion review | `scripts/popcheck.cjs` plays level solutions in 1/30 s steps and tracks every car and passenger. A "pop" is a one-step jump far bigger than its neighbours. Found and fixed: (1) cars pivoted ~90° in one or two frames at corners. Corner curves had a curvature spike, so they became true circular arcs, and cars now ease off for bends (a curvature speed limit planned ahead along the route). (2) Lane offsets split one corner into two kinks joined by a 0.64 leg; such kinks merge into one corner (unit-tested). (3) A car that ended a leg while overtaking snapped 0.9 back into lane; it now merges back before stopping, and the next leg starts where it stands. (4) Cars setting off at an angle to the route turned in one frame; the heading now turns at most 12 rad/s. Result: 0 pops on levels 5, 22, 64, 124 and 161 (before: 4–10 per level). Cost: level 5's solution takes 3.5% longer (450 → 466 steps). |
| Regression check | The pre-pass build (88ace8e) against now, production builds at 4× CPU. Startup ready 15.0 s → 14.2 s (software GL; same shape). Game CPU per frame with drawing stubbed: home 0.57 → 0.61 ms, fast tapping 0.51 → 0.45 ms. A new spike found that way: the bend-aware drive set up its speed profile by sampling the route (2.4 ms per route at 4× CPU, 1–3 routes per tap). Bends now come straight from `roundedPath` (radius and span of each arc), and arc-length tables use 1 division per straight and 24 per arc (three.js default 200). Route set-up went 2.7 → 0.47 ms, cheaper than before the pass. |
| I4 effects mix | `scripts/sfxmix.cjs` renders every effect offline through the real output chain (`renderSound` hook). Before: gameplay feedback sat 13–20 dB under the music's loudest moments (boarding pop −47 dB, coin −37, against music −17 loudest and −23.5 average). Thunder was +22 dB over gameplay sounds. The tyre chirp (−66) and UI click (−62) were inaudible. After: effects bus +7.5 dB, per-sound gains set to targets. Gameplay sounds sit at −24…−29 dB (level with the music's average), the win jingle is on top, thunder is +2 dB, and the click and chirp are subtle but audible (−42/−43). A worst-case burst (3 departures, 5 boardings, coins and the win jingle together) peaks at −4.4 dBFS, no clipping. Rain and thunder now follow the sound slider (they bypassed it): −19.1 dB from 90 to 30, as the curve says. |
| Q3 CI smoke test | Before any APK is built, CI starts the production build in a headless browser (`scripts/smoke.cjs`). It must boot, win level 1 following the hints with real taps, go home with back and open the garage's 3D view, with no page errors and nothing in the game's error log. Locally: passes in 118 s. Before this, CI shipped an APK after unit tests only. |
| Hint worker robustness | Found while building the smoke test: if the module worker fails after creation (older Android WebViews), waiting hint requests were never answered, so that position had no hand and no spotlight. They are now answered on the main thread, which then serves all later hints. Checked by replacing `Worker` with one that fails 0.3 s after creation: both hints still arrive. |
| P2 event pacing | Checked before the first live event (Yalda, from 14 Dec). The windows are right (14–28 Dec around 20/21 Dec; 14 Mar – 3 Apr around Nowruz) and progress resets each year. But all seven "nights" could be played in one sitting, against the event's own naming and the plan's day-1/day-7 retention targets. Stages now open one a day (unit-tested rule); the banner says when the next one opens, and a two-week window lets late starters finish. |
| GDD alignment | First session: levels 1–3 can't be lost (Mash Rahim opens another bay). Haptics as specified: light per launch, medium per full car, success on the win; no per-passenger buzz. Session hook: the win card shows progress to the next chest. |
| Win card fit (bug) | On a 360×640 phone a boss win's card was 746 px tall: Next level and Home were off-screen and the card didn't scroll. Now 584 px in that worst case (rewards in one row, Double and Home side by side, compact short-screen rules), and card backdrops scroll as a safety net. |
| H3 card fit audit | All 22 cards at 360×640 and 412×915 (`scripts/cardfit.cjs`): fit on screen, buttons visible without scrolling, no sideways overflow. One failure found and fixed: the garage's close button was 20 px below a 640-tall screen. 44/44. |
| M2b larger text × card fit | The card audit with larger text on (`BIG=1`): at 360×640 the home row's icon buttons overflowed the screen edge. Fixed (the row keeps its size and lets labels wrap). 22/22. |
| H4 HUD audit | `scripts/hudfit.cjs`: busiest HUD levels × two phone sizes × larger text on/off. Found: toasts (level notes, "last bay", "bays full") covered the top rows of cars, so they moved to the free band above the booster bar. With larger text the toast slid off the right edge (zoom scales its `left: 50%`), so positioned HUD pieces now scale by font size. 12/12. |
| A3 quality settings | All four settings boot and play without errors (`scripts/qualities.cjs`) and set the intended pixel ratio (1.8 / 2.0 full / 1.4 / 1.0) and shadows. "Simple" also lightens geometry now, for the weakest phones: −16% triangles on level 60. |

| N5 long-session memory | `scripts/leakcheck.cjs` plays 20 levels in a row (chapter 1 → 2 → 1 → 2, real `goLevel` path) and records GPU objects, scene size, DOM and heap after each. Before: geometries 75 → 540 and textures 40 → 165 with no plateau, heap 35 → 74 MB; on a phone that ends in a WebView crash after an hour or so. Two leaks: worlds evicted from the two-world cache were never freed (the bake flagged its merged mesh "keep", so 53k-vertex meshes and 2048² atlases piled up), and pieces removed mid-level (wedding, broken-car and plate badges with canvas textures, covers, crane cable and hook, departed cars, boarded passengers) were detached but never disposed. Now a world's bake is freed when it leaves the cache, and the session keeps what it removes and frees it with the level. After: geometries plateau at 156–163, textures and shader programs flat, DOM flat, heap 35–49 MB with no trend; second round vs first: +0 geometries, −4 textures, +0 programs, +0 DOM. Evicted and rebuilt worlds checked by screenshot (chapters 1 → 2 → 3 → 4 → 1). |
| N6 GPU context loss | `scripts/ctxloss.cjs` drops the WebGL context (`WEBGL_lose_context`) in play on three chapters and in the garage, then restores it and compares the frame with the one before. Before: the level came back nearly black (board brightness 120 → 9, mean difference 111/255): the sky backdrop and every reflection are drawn once into render targets, and phones draw the shadow map once per level, so all three were empty after the restore; the garage lost its reflections (difference 25). Now reflection maps are cached per renderer and rebuilt when its context returns (main view, and the garage/agency view), and the shadow map is redrawn. After: difference 0.1–0.4 on levels 1, 31 and 91, 0.0 in the garage and in the agency yard, no errors. If the context never comes back, the game reloads from the save after 6 s on screen instead of showing a dead screen. Shader-compile waits are capped at 8 s, so a loss during a level change can't leave the veil up. |
| N7 can't-start message | Before: with WebGL disabled the game stayed on the splash with its loading bar forever (checked headless with WebGL off); a failure while loading did the same. Now a card on the splash says what's wrong (no 3D graphics on this phone: update Android System WebView and Chrome from Bazaar or Google Play, restart the phone; or "the game didn't open, your progress is safe"), with a retry button and a short error line for support. It catches failures in any module (the handler loads first) and in boot, but not the harmless errors after loading. `scripts/fatal.cjs`: no WebGL at 360×640 and 412×915, and a failure while loading: message shown, fits, retry reloads. Runs in CI after the smoke test. |
| A4 start-up on real phones | Headless boot can't measure real start-up: software GL makes every frame slow (frame waits of ~400 ms, and the splash animation is drawn in software too), so "ready at 4.4 s" here says little about a phone. Each start's stage timings are now kept on the device (last five), and the tester view (three taps on the version line) gains «گزارش دستگاه»: GPU name, render profile, pixel ratio and governor state, screen, memory, and those cold starts by stage, shared as text. That is how the GDD's < 4 s target gets checked on the phones that matter. Unit-tested (keeps five, format, survives blocked storage and hidden GPU names). |
| K2 share a win | On new «سخت» and chapter-final wins and the daily rush, a share button sends a 1080×1350 picture: the level's starting layout as a top-down puzzle diagram (cars in their paint with the arrow they'll drive, covered cars kept as «؟», cones, fruit carts, tunnel pairs in their board colors), the level and chapter, "solved in N taps, can you?", and the Bazaar link, with the same as text. Drawn in 2D from the level data (the 3D board is empty at the win; reading back a WebGL frame would stall a phone). Android: written to the app cache and shared with the system sheet (Telegram, WhatsApp…); browsers: Web Share or a download. JPEG, ~140 KB (the PNG was 1.2 MB). `scripts/sharecard.cjs`: seven level types drawn and checked by eye (found and fixed: white arrows invisible on white bikes, the subtitle touching the logo), the button only on those wins (not ordinary wins or replays), and the share carries the picture and the link. With the button in the row, Home shrinks to its label so «دو برابرش کن!» stays on one line; win cards still fit 360×640 with larger text (587 px). |
| N8 a result lands on the wrong level (bug) | Found while checking the leak fix across mechanics. A win is decided on the last tap and its card follows after the finale (a few seconds); a loss after a short beat. The pause gear wasn't blocked in that window (back was), so Restart, Levels or Home could start another level, and the old result then landed on it: the win card over a fresh board, crediting coins and a star to the wrong attempt, or the loss card; either way the new level stopped taking taps. Now a level's callbacks go silent once it is left, the gear is ignored once the outcome is decided (as back is), and a result decided while the pause card is up closes it instead of stacking. `scripts/staleresult.cjs`: all six checks failed before (stale win +30 coins, stale loss card, next level frozen, pause card under the win card) and pass now. |
| N9 shared textures freed with each level | `scripts/reuse.cjs` marks every geometry, material and texture as it is freed, plays two levels of each of ten mechanics back to back (colour-blind symbols on, crane and whistle used) and lists anything in the scene that was already freed. Every level freed four textures that all levels share (worn road-paint mask, city wall and window maps, the weather particle dot), so the next level uploaded them again at its start. Cause: `disposeMaterial` honoured "keep" on materials but not on their textures, so even textures already flagged (leaf cards) were freed. Now textures flagged keep are skipped, and every module-level texture cache flags its texture (`keepTex`); per-level clones opt back in. After: nothing freed is in use at any level start, across all ten mechanics. |
| N10 older WebViews | Many players in Iran keep auto-updates off, so Android System WebView can lag years. The game needed Chrome 99+ (canvas `roundRect`, drawn while the world is built: a crash at load before that) and laid out its home screen and HUD with CSS `:has()` (105); Capacitor accepted anything from 60, and the load-failure card then advised a restart. Now: `roundRect` is polyfilled (loaded before every module); all 19 `:has()` rules became classes the code sets (home backdrop and camera drift, home row, speech bubbles, HUD rows), `inset` became longhands and the CSS is built for Chrome 84 (the minifier was folding them back); Capacitor refuses WebViews below 84 with its own ES5 page (update Android System WebView from Bazaar or Google Play, or Chrome; on a newer WebView, which means the page failed to load, it offers a retry instead); and a load failure on a WebView older than 110 says to update it, with its version. Checked: home, three busy HUD levels, shop and boss cards match before/after at two sizes (≤ 0.6% of pixels, 3D noise); `scripts/oldwebview.cjs` (in CI): Chrome 90 without `roundRect` boots, wins a level, opens the garage and draws a share picture with no errors; without the polyfill the card names the WebView version; the update page fits 360×640 and reads right. |
| D4 hold to see the way out | The GDD's third direction cue was missing. Holding a finger on a car for 0.15 s lays green chevrons on the ground along its way out, through any tunnel, ending in an arrow past the curb; red ending in a bar at whatever is in the way; amber when a rule holds it back now (broken car, plate day, officer). The chevrons drift along the route (still with reduced motion). Quick taps never show it, sliding off hides it and cancels the tap, covered cars show nothing, crane mode shows nothing. Level 4's tip teaches it. The route comes from the rules (`route()`: legs, end, blocker, hold; 8 unit tests: edge, blocker in front or further up, opened lane, cone, tunnel, rule hold). `scripts/holdpreview.cjs`, real pointer events on levels 60 and 218 and a covered-car level: quick tap shows nothing, a held free car shows green, slide-off hides it and the car stays, a held blocked car shows red to the blocker, a tunnel route shows both legs, a covered car nothing. First look by eye: near-white chevrons were too faint on grey asphalt, so "go" became green. |
