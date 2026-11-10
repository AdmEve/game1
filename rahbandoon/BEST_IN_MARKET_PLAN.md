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
- C3. Hints on request (added after the first pass). The hint hand showed the solver's next move after 10 s
  without a tap on every level; from level 9, where the puzzles are built to make you think, a player who
  stops to plan gets the answer pushed at them. Plan: the ramp (levels 1–8) keeps the automatic hand; from
  level 9 (and in the daily rush and events) nothing shows unasked: after 20 s idle a small «راهنما؟» chip
  offers it, a tap shows the hand on the next move, and a move clears both. If no hint comes back, the chip
  says so gently and suggests starting over. *Done when* a browser check sees no hand after 12 s idle on a
  level past 9, the chip after 20 s, the hand on a tap, both gone after a move, and the ramp's automatic hand
  unchanged.
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
- H5. Small screens (added after the first pass). Android's "display size" setting at Large, and small phones,
  give 320×568 in CSS pixels, below the 360×640 every audit assumed. There the home row's achievements button
  and the level grid run off the side, and a boss win card is 580 px tall, putting Double, Home and Share
  below the screen. Plan: the home row and level grid size to the width they have; short screens get a
  tighter win card. *Done when* the card audit passes all 22 cards at 320×568 with normal and larger text,
  and 360×640 and 412×915 still pass.

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
- J4. Helps one at a time (added after the first pass; GDD §9 "first booster at level 6"). Level 1 shows all three
  helps (park, crane, whistle) under the board before the player knows the basic loop. The bar now stays away
  for levels 1–5; the parking help opens at level 6, the crane at 9, the whistle at 12 (the win streak's order),
  each with Mash Rahim's card the first time and a pulse on its button; helps not yet open show dimmed with
  their level. Openness follows progress, so players already past a level keep its help and replays have it.
  The streak's free helps only give helps that are open, and the win card's "next level: … free" says the
  same. *Done when* unit tests cover the rule, and a browser check on a fresh save sees no bar on 1–5, the
  card once on 6, 9 and 12 with the right buttons open, a locked tap explained, and an old save with all open.

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
- Privacy policy: put `store/privacy-fa.md` somewhere public and give its link in the Bazaar developer panel (the
  same text is in the game: Settings → حریم خصوصی).
- Optional, smaller download (about 2–4 MB less): turn on R8 (`minifyEnabled true`, `shrinkResources true`) for the
  release build, with keep rules for Capacitor plugins, Poolakey and Tapsell Plus, then test an ad and a purchase on a
  phone before uploading. Most of the APK's code is the ad SDK's dependencies (Guava, Play Services, ExoPlayer, Glide).

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
| H5 small screens | Android's "display size" at Large (and small phones) gives 320×568 CSS px, below what every audit assumed. Found there: the home row's trophy button off the left edge (its `1fr` columns couldn't shrink below their unwrapped labels), the level grid's sixth column at the card's edge, a boss win card 580 px tall with Double, Home and Share below the screen, and on busy levels the two-line start note 5–11 px over the bottom row of cars. Now: columns are `minmax(0, 1fr)` and labels wrap under 340 px; short screens (< 600 px) get a smaller win emblem and tighter notes; beside Share, Home keeps only its icon so Double stays on one line. Card audit: 22 cards × 3 sizes × normal/larger text, 132/132; HUD audit 18/18. 320×568 is now in both audits' defaults. |
| R1 store page and privacy | Release readiness. There was no privacy policy, which Bazaar asks of apps with ads. `store/privacy-fa.md` (Persian) says what the game really does: everything stays on the phone, no servers of ours; Tapsell Plus may collect the advertising ID and device details for ads; purchases go through Bazaar; reminders are local; sharing happens only when the player taps it; the permissions it asks for and why. The game shows the same file (imported, so the two can't drift) in Settings → «حریم خصوصی», in a card that scrolls with its close button kept in reach (fits 320×568 to 412×915, normal and larger text). Unit-tested renderer (headings, lists, escaping). The listing text gains hold-to-see, sharing and the accessibility options. |
| R2 store screenshots | The eight store screenshots (Oct 27) showed the old HUD (blue gear, green coin pill, bright booster tiles) and the older render. Re-shot from the production build with the phone profile at 3× (the desktop profile at 3× no longer finishes in software GL, and isn't what players see). Checked each caption against its level: the Tochal shot promised the traffic officer on a level without one (off by one), now level 96 with the officer's sign in view. JPEG at quality 92: 4.4 MB for all eight instead of 19 MB. `scripts/store-shots.cjs` now runs on the production build (no source imports) and takes `ONLY=` to re-shoot some. |
| J4 helps one at a time | GDD §9 ("first booster at level 6"): level 1 showed all three helps under the board before the player knew the basic loop. Now the help bar stays away on levels 1–5; the parking help opens on level 6, the crane on 9, the whistle on 12 (the streak's own order), each with Mash Rahim's «کمک تازه!» card the first time (what it does, how many you have) and a pulse on its button; helps still waiting show dimmed with a lock and their level, and a tap on one says when it opens. Openness follows progress (players already past keep everything, replays and events too). The streak gives only open helps, and the win card's "next level: … free" line says the same (no line when none is open). `game/helps.ts` with 4 unit tests; `scripts/helpsopen.cjs` as a fresh player: no bar on 1–5, the card once on 6 (parking open, crane «مرحله‌ی ۹», whistle «مرحله‌ی ۱۲»), a locked tap explained, crane on 9, whistle on 12, a streak of 3 on level 7 gives no locked help, a save at level 121 has all three and no card. `streak.cjs` moved to level 13, where its free crane is open. |
| C2 difficulty ramp | `scripts/difficulty.ts` plays each level 400 times with two simulated players on the real rules (casual: 75% sensible picks, 10% careless taps; attentive: 95% / 2%; no helps, no clock, covered colours unseen). Levels 9 and on lose ~100% for both: those puzzles need the planning heuristics can't do (the owner's chess-level difficulty, unchanged). The ramp had a spike: level 7, a normal level and the cover mechanic's first, lost 45% (casual) and 36% (attentive), more than level 5, the «سخت» one; and the GDD wants the first fail-and-continue at level 9. Mash Rahim's extra bay on a would-be loss (levels 1–3 before) now covers levels 1–8 (clock and tap-budget losses stay real): level 7 falls to 7% / 3%; level 5 stays ~30% (its losses run deeper than one bay: a fitting first «سخت»; no life is spent before level 12). `firstsession.cjs`: levels 3 and 8 open a bay instead of losing, level 9 brings the first lose card. |
| C3 hints on request | The hint hand showed the solver's next move after 10 s without a tap on every level, so from level 9 (puzzles built to be thought through) a player who stopped to plan was handed the answer. Now the ramp (levels 1–8) keeps the automatic hand; past it, and in the daily rush and events, nothing shows unasked: after 20 s idle a «راهنما؟» chip (bulb icon, above the booster bar) offers it; a tap shows the hand on the next move; the next move clears both and the clock starts over. The search starts 3 s before the offer so the hand comes at once; if none comes back, a note suggests starting the level over. `scripts/hintoffer.cjs` (in CI): level 13 shows nothing at 12 s idle, the chip at 21 s, the hand on a tap, nothing after the move; level 8 still shows the hand by itself at 11 s. |
| M4 screen-reader names | Only two controls in the game had an accessible name. An axe-core audit (WCAG 2 A/AA) of home, play, pause and settings, level select, win card, shop, garage and privacy found the icon-only buttons unnamed: the gear on every screen, the metro-card and trophy buttons on home. Now named for what they do (with their badge counts), the coin pill reads its balance and that it opens the shop, the garage arrows say previous/next car, and the settings switches are read as on/off switches. `scripts/a11y.cjs` (in CI): 8/8 screens clean, plus checks that the key controls are found by role and name. Left out on purpose: page zoom (a game's pinch must not zoom the page) and contrast (measured by colorsep.cjs). |
| H6 first-session pass | `scripts/journey.cjs` plays a fresh install the way a new player does (home, «بزن بریم», each level won, the win card's «مرحله‌ی بعد») and logs every card that opens on the way. Found: the daily gift was the very first thing after «بزن بریم», before level 1; the chest's loot tiles kept the old light theme's cream under near-white text (unreadable); two floating texts at one spot printed over each other («افسانه‌ای!» twice); after level 8 the rating ask stacked with the crane's card, and on Android level 10 would have stacked the chest, the reminders ask and the broken-car card. Now: the daily gift waits until three levels are done; the loot tiles use the win card's gold-on-dark; floats at one spot stack upwards; the rating ask comes after level 7 and the reminders ask after level 13 (the first level that costs a life), each the only card there; the out-of-lives card offers «وقتی جون‌ها پر شد خبرم کن» where it means something (Android). A contrast sweep of all 24 cards plus the play HUD (axe colour-contrast, and the nodes axe can't decide checked against the card's surface) found light-theme colours still on dark cards: the out-of-lives clock (2.6:1), slate hints in the shop, garage and agency (3.7:1), the daily gift's violet (3.1:1), the piggy-bank and new-medal notes (2.4–2.5:1); all now ≥ 4.5:1. |
| R3 download size | Downloads cost Iranian players real money, and Bazaar shows the size beside Install. The APK was 11.8 MB for a 1.8 MB game: 3.8 MB of it was the launch splash as PNG at eleven densities and orientations (4.7 MB in the repo), 5.9 MB unshrunk code (mostly the ad SDK's dependencies: Guava, Play Services, ExoPlayer, Glide). The splash is now WebP at quality 90, written by `scripts/make-icons.mjs` with Chromium's own encoder: 0.31 MB for all eleven, the same picture (mean difference under 1/255, nothing over 40/255 anywhere), about 3.5 MB off the APK. Shrinking the code (R8) would take a few MB more but can break ads or purchases in ways only a phone shows, so it is in the release checklist with a device test instead of shipped blind. |
| J5 straight into play | Time to the first move is the first number a puzzle game is judged on, and the best ones start a new player in level 1, not on a menu. A fresh install here landed on home, whose only use before the first win is its Play button: one more screen and tap between the store and the game. Now a save that hasn't won level 1 boots straight into it: the loading screen cross-fades into the landmark shot, the camera sweeps down, then the first tip and the spotlight on the first car (about 2.5 s from "ready" on a phone). Home comes from the first win on, as before; back in level 1 opens the pause card, whose Home still leads there. `smoke.cjs` (CI), `backnav.cjs`, `onboarding.cjs` and `journey.cjs` now start a fresh save in level 1 (backnav checks back-on-home after pause → home instead). |
| C4 hard levels and the life at stake | Every fifth level is «سخت» (more coins, a key, stars), but it was marked only by small text on the plate, so a hard level felt like any other; and from level 13 «از اول» on the lose card costs a life without saying so, which hid the one reason to pay to continue. Now hard levels carry the yellow public (taxi) plate and bosses the red government plate; a hard level opens with a «مرحله‌ی سخت!» ribbon across the board once the camera settles (through the start-notes queue, so never under a card or mid-swoop; taps go through it), naming the key and extra coins when the level is new; and «از اول» reads «💔 یه جون» when it costs one (not in the ramp, the daily rush or events). Checked: level 15 shows the ribbon with its reward, a replay without, level 16 none; the lose card at 15 shows the cost; card audit (lose cards, normal and larger text) and HUD audit pass; contrast unchanged. |
| C5 quitting costs what losing costs | From level 13 a loss's «از اول» costs a life, but leaving through the pause card (restart, home, another level) was free, so a player about to lose could quit instead and keep the life: the lives economy, and C4's «یه جون», only bound players who didn't know the trick. Now leaving a Journey level that costs lives, once a move is made, asks first («ول می‌کنی؟», what goes: the life, and the win streak when there is one) with «ادامه می‌دم» as the main button and back, and takes the life on «ول کن» (the no-lives card follows if it was the last). Before the first move, on the ramp, in the daily rush and in events, leaving stays free and asks nothing. `scripts/quitcost.cjs` (in CI): level 13 after a move asks on restart, home and another level; staying keeps the move and the life; leaving takes one and starts over or goes home; no move yet and level 5 ask nothing. |
| I5 a sting for hard and boss levels | The «مرحله‌ی سخت!» ribbon (C4) and Mr. Ajool's entrance card were silent: the two moments meant to raise the stakes had no sound while every tap, horn and win had one. Now both play a short sting from the game's own instruments: two deep tombak strokes and a rim knock, then a low santur chord in Homayun (G, B♭, C♯, G), a fourth lower for the boss; the music ducks under it. The boss card's sting waits until the level-change veil is down, so it lands with the card. Measured on the game's output: peak 0.45 and RMS 0.056 (the win run: 0.52 and 0.054), so it punctuates without topping the win. |
| H7 labels inside their buttons | A mid-game look at home found «ساعت شلوغی» running past its button under the metro-card button on a 360-wide phone (the most common size), and the medal badge's digit pushed against its circle's edge. The card audit couldn't see either: it checked cards against the screen, not text against its own button. `scripts/cardfit.cjs` now checks every line of text inside each button's box (count badges excepted, they sit across the corner on purpose) and has a mid-game home (rush hour open, a streak, medals waiting). Fixes: home-row labels wrap under 380 px wide (a cell there is ~93 px; the label needs ~118 on one line); badge digits centred. Card audit 72/72 and 72/72 with larger text; the same check on the play HUD at all three sizes is clean. |
| R4 store banner and listing | The store folder had the icon, eight screenshots and the text, but no feature graphic: the 1024×500 banner Cafe Bazaar and Myket show when they feature an app, often the first thing a player sees. `scripts/store-feature.cjs` now makes it from the game itself: Milad tower at dusk from the level-start camera (darkened into the splash's navy on the right), a phone with real play on a busy Tajrish lot, the splash's yellow taxi in front, and the logo, tagline and three selling points («۲۴۰ مرحله», «ماشین‌های ایرانی», «۸ محله‌ی تهران») on the right, where Persian starts. Wide shots of the dioramas were tried first and dropped: the game is framed for portrait, so in landscape the camera pulls back to small boxes on flat ground. The listing named 7 of the 10 mechanics: the wedding car, Haj-Khanum and the Niayesh tunnel are in now (checked against the rules: she takes two seats), with Mr. Ajool's hard and boss levels (every fifth level, every chapter's last) and the Nowruz event. |
| F3 Tehran rooftops on the city | Every level opens on its landmark over the city (the level-start camera), and the city behind the near rows was bare boxes with flat grey roofs, the one part of the frame that didn't look like Tehran. Now the near city (about 40 units back; further rows are too small to show it) carries the rooftop clutter Tehran is known for: a water tank on its side (white, galvanized or blue), one or two evaporative coolers, now and then a satellite dish. One instanced mesh per kind, low-poly, with its own seeded draws so the city and everything built after it stay exactly as they were. Cost, measured with `scripts/draws.cjs` on the phone profile: +3 draw calls and +10–13k triangles a level (e.g. L240 169 → 172 draws, 405k → 417k), nothing on Darband (no city). Freed with their world (reuse and leak checks). |
| M5 left-handed layout | The GDD's accessibility list (§9) promised a left-handed layout, the one item there not built. The board is tapped in the middle, but the controls a thumb rests near are at the edges: the gear (pause) in one top corner, coins in the other, the help bar along the bottom with «جای پارک» at the right end. Settings now has «چپ‌دست» (off by default; old saves keep the usual layout): the corner buttons swap sides and the help bar runs the other way. The plate-camera and officer signs are information, not controls, and stay put. Checked: positions mirror (gear 304 → 10 px, «جای پارک» 244 → 24 px), the choice is saved, the switch is found by role and name (`a11y.cjs`), the settings card fits at all sizes, and a unit test covers old saves. |
| C3b hint clock counts board time only (bug) | A quality-tier check booted straight into level 63 and the «راهنما؟» chip was already up as the board came into view. The idle clock behind the offer (and the ramp's hand) ran from the session's start, and a level is built behind the loading screen, home and the level-change veil; time on a card also counted the moment it closed. So a player who spent 20 s in the shop or on the pause card was offered the answer the instant they came back. Idle now counts from the later of the last move and the moment the level came into view (no card, no veil, the opening camera done), kept apart from the last move so a card can't pass for a move. `hintoffer.cjs` (in CI) gains the case (25 s on the pause card, back to the level: no chip), and its idle simulation uses a test hook that ages both clocks; the boot repro (a 33 s software-GL boot, then 2.5 s on the board) shows no chip. Onboarding and first-session checks unchanged. |
| I6 music from the first frame (app) | Music started on the first touch, the browser's rule. Since J5 a new player lands straight in level 1, so the opening camera move over the landmark played in silence and the music cut in on the first move. Inside the app media may play without a touch (Capacitor sets the WebView's `setMediaPlaybackRequiresUserGesture(false)`), so the game now resumes its audio at the end of boot and starts the music if the audio really runs; otherwise, and always in a browser, the first touch starts it as before. Checked with Chromium's no-gesture autoplay flag: as a web page, silent until a touch; with the app's platform check stubbed, the music comes in on its own once the chapter's loop is rendered (a few seconds on a phone; 35 s under software GL, where every render yield waits a slow frame). |
| C6 the end of the road (bug) | A player who wins all 240 levels was offered «مرحله‌ی ۲۴۱» on home, and Play (like the final win card's «همه‌ی مرحله‌ها رو تموم کردی!») quietly replayed the final boss under that number. Now: the final win card's button goes home (after the chapter chest); the first time home opens with every level won, a card marks it («تبریک! راه‌بندون باز شد», the whole journey, Mr. Ajool conceding, new levels coming and the daily rush meanwhile), once; home then says «همه‌ی ۲۴۰ مرحله رو بردی!» beside the lives pill, and Play becomes «دوباره بازی کن», opening the level list, which closes back to home. Checked by playing the final boss through the real flow (win → chest → celebration → home → list → back to home → next launch: home only); card audit with both new cards at three sizes, normal and larger text; back navigation 10/10. |
| C7 finished states of the meta | After C6 found the Journey's end unhandled, every meta system was put in its finished state and looked at: Grandpa's Agency with all 24 renovations («۲۴ از ۲۴ بازسازی … مثل روز اولش شد!», and home's «آژانس کامل بازسازی شد!»), every garage classic restored («بازسازی شد!»), and the metro card with the whole line ridden. The first two were already written for; the metro card still said «تا ایستگاه بعد» over a half-punched ticket with no station left. It now says «آخر خط! تا شوش رفتی؛ کارت ماه بعد دوباره از تجریش شروع می‌شه.» Card audit gains «pass (end of line)» (3 sizes, normal and larger text). |
| H8 "not enough coins" says so | Continuing the edge-state sweep (the chapter change from the level-30 boss runs clean: chest, «فصل ۲» card, level 31): in the shop, a help the player can't afford only shook for 0.35 s with a buzz, which reads as "broken" to someone who doesn't know why. Now it also says how many coins are missing («۲۰۰ سکه‌ی دیگه لازم داری») and scrolls the shop to where coins come from (the free video, then the packs); with neither on offer it says coins come from winning levels. Notes everywhere are now opaque (the shop's packs showed through the 88% glass one). Shop card fit, back navigation 10/10. |
| H9 floats measured, rush done says so | The daily rush played through (home → «چالش روزانه» → win card → home marks «امروز رد شد!») showed two «افسانه‌ای!» combo texts printed into each other at the top of the screen: H6's stacking compared anchor points within 90 px, but that text is ~140 px wide, and stacking upward near the top runs under the counters. Floats now measure: each is placed against the boxes of the ones still showing (its own from its layout size, as the pop-in starts it at 60%), steps up past the one it meets, or down near the top of the board, and never goes above the passenger counter. A finished rush button, silent before, now says «چالش امروز رو رد کردی؛ فردا یه ترافیک تازه منتظرته!». Checked with a new test hook placing floats at exact points (two wide combos near the top, three at one spot): no overlap, all below the counter. |
| C8 the hint tells the truth | `scripts/hintbudget.ts` measured the hint where it matters, levels 9–240: from the start and from positions a player reaches (the solution part way, then one move that may be a mistake), 406 positions. The 60,000-node budget never ran out on a winnable one (the hardest took 9,565), so when it finds nothing the position is lost, certainly; and 133 of those 154 lost positions are still won with one more parking bay. The hint still said «این‌بار راهنمایی پیدا نشد؛ شاید بهتره مرحله رو از اول شروع کنی»: sending players to start over (a life, from level 13) where one «جای پارک» would have won. The worker now returns a verdict (`hintFor` in the solver, also used by the main-thread fallback): a move; or lost-but-one-more-bay-wins, said as «بدون کمک دیگه راهی نیست؛ با یه «جای پارک» هنوز می‌شه برد!» with the parking help pulsing; or lost, said plainly; the old "maybe" stays only for a search that ran out. `hintoffer.cjs` (CI) finds such a position on level 13 and asks through the chip; unit tests check each verdict against the solver. |
| C9 a fair continue | The GDD asks for a fair continue: the offer must feel honest, not predatory. `scripts/continueodds.ts` played levels 9–240 with the simulated casual and attentive players until the bays filled, then added the bay the lose card sells (300 coins or a video): from where players actually lose, one more bay still wins only 32% of the time (12–57% by chapter). Two thirds of continues were paid for a level already lost. Now the solver is asked the moment the loss is decided (in the hint worker, with the hint's search; usually answered before the card shows, patched in if not): winnable → the offer stays, with «با یه جای پارک دیگه هنوز می‌شه برد!»; hopeless → no paid continue, «حتی با یه جای پارک دیگه هم راهی نمی‌مونه؛ این یکی رو باید از اول بری.», «از اول» the main button; unknown (search ran out) → as before. Clocks, tap budgets and the wedding car keep their continue. The last in-level toast («آخرین جای پارک!») now clears when the card opens. `scripts/fairgo.cjs` (CI) loses levels for real until it has met both cases and checks each card. |
| H10 no dead end on a help | C8 sends players to the «جای پارک» help (it pulses when one more bay still wins), but with none left and fewer than its 300 coins, tapping it only said «سکه کافی نداری!»: the honest hint led to a wall. Now a card opens instead: the help's tile and name, «۳۰۰ سکه می‌خواد و ۱۲۰ سکه داری.», then one for a video (where ads are on; the help goes in at once), the shop («دکه», closing back to the level), or «بی‌خیال». Same for the crane and the whistle. With all six bays already open, the bay button now says so before any coins or card. The help-intro tile, which sits over the card's top edge, is now opaque (the scene showed through). `hintoffer.cjs` (CI) goes on from its bay-verdict position with no help and 100 coins: card, three choices, the video's bay in the lot; card audit gains «help offer» (3 sizes, normal and larger text). |
| N11 progress to a new phone | Cafe Bazaar has no cloud save and the game no server, so a new phone or a reinstall lost everything (Android's own backup may carry the WebView's storage, but only where Google backup is on, and not reliably); losing progress is the commonest complaint in reviews of games like this. Settings now has «انتقال پیشرفت به گوشی دیگه»: «کد این گوشی» gives the whole save as a text code (`RB1.` + deflated save in base64url + a check; ~1,000 characters at level 119, under 2,500 for a full save) to send to oneself («فرستادن» through Android's share sheet, or «کپی»), with a note to keep it somewhere safe such as Telegram's Saved Messages; «وارد کردن کد» on the other phone reads it back even wrapped by a messenger, with the words it was sent with or Persian direction marks, refuses junk («این کد راه‌بندون نیست…»), a code cut short or changed («کد کامل نیست…») and one from a newer version («…اول بازی رو از بازار به‌روز کن»), then shows both phones' progress side by side (level and coins, a warning when the code's is behind) before «آره، جایگزین کن». The game restarts on the new progress and says «پیشرفتت اومد! مرحله‌ی ۱۱۹ · ۸۴۵ سکه». What stays with the phone: Bazaar purchases (restored from the Bazaar account; a code can't hand out no-ads), the graphics quality (that phone's GPU) and the reminders (that phone's permission); the replaced progress is kept under a third key. Cards are now opaque (one opened over another showed the one beneath through 4% glass). `src/transfer.ts` (6 unit tests), `scripts/transfer.cjs` (CI, two browser profiles as two phones, 13 checks), card audit gains three transfer cards; privacy policy and store «تازه‌ها» say so. |
| H11 settings from home | The home screen had no way to the settings: the gear lives in the HUD, which home hides, so music, sounds, larger text, the left-handed layout, colour-blind symbols, graphics quality, the privacy policy and now the progress transfer were only reachable from inside a level (a returning player on a new phone had to start a level to find «انتقال پیشرفت»). Home now has the gear in the corner it has in play (mirrored with «چپ‌دست»), opening the same card under «تنظیمات» without the pause controls (resume, restart, levels, home) and with a close in its corner, since the card is taller than most screens; Android's back closes it to home. On tall screens, where home shows the radio line at the top, the line moved below the gear. Checked: no overlap at 320×568 and 412×915, card audit «settings (home)» at three sizes with normal and larger text, back navigation (`backnav.cjs` gains the gear and its back), axe audit clean. |
| H12 purchases and videos say what happened | After H10, the other silent ends: a Bazaar purchase that was cancelled and one that failed (no network, not signed in to Bazaar) both just did nothing; success gave no word of what arrived; a second tap could start a second payment; if Bazaar wasn't reachable at launch, the coin packs stayed hidden until a restart (Iran's networks drop often); and a reward video with nothing to show (Tapsell no-fill, common) or closed early only quietly re-enabled its button. Now the native plugins report why (`canceled`/`failed`/`begin`; `nofill`/`closed`/`error`); `buy()` returns ok, cancel, error or pending, one purchase at a time; a cancel says nothing, a failure says «خرید انجام نشد. اینترنت و ورودت به کافه‌بازار رو چک کن و دوباره امتحان کن.», success names it («۳٬۰۰۰ سکه اومد تو کیفت!», «تبلیغ‌های بین مرحله‌ها برای همیشه حذف شد!»), and a payment Bazaar wouldn't confirm (consume failed twice) says it will be delivered on the next start, which initMonetization already does. The pack being bought breathes and the others wait. Opening the shop asks Bazaar again (at most every 15 s, never more than 8 s) with «در حال وصل شدن به کافه‌بازار…», then shows the packs or says Bazaar can't be reached. Videos: «الان تبلیغی برای نمایش نیست؛ چند دقیقه‌ی دیگه دوباره امتحان کن.» or «جایزه مال وقتیه که تبلیغ تا آخر دیده بشه.». Numbers with thousands now use the Persian separator «٬» everywhere (was an ASCII comma beside titles written «۳٬۰۰۰»). Unit tests for the outcomes (the result is now a word, so a check written `if (await buy(…))` would count a cancel as bought; every caller compares with «ok», and the tests pin a cancel to nothing delivered); browser check with `?iap=fail` and `?ads=none`. |
