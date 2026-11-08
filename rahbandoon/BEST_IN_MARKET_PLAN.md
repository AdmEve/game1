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

