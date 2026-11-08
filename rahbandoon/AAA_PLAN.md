# «راه‌بندون» — AAA plan (November 2026)

The owner's brief: make the game top notch in every aspect, and above all **fluid**: no lag in normal play,
none when many cars move, a smooth startup and smooth menus with smooth transitions. Plan first, then act.

## 1. The aspects every game has

| # | Aspect | What it covers |
|---|---|---|
| A | **Performance & technical feel** | Frame rate, frame pacing (no hitches), loading/startup time, transitions, memory, battery, crash-free |
| B | Core gameplay | The tap → drive → park → board → leave loop, rules, mechanics |
| C | Level design & difficulty | Curve, variety, fairness, boss levels |
| D | Controls & input | Tap accuracy, response latency, feedback on touch |
| E | Game feel ("juice") | Anticipation, impact, follow-through, camera, haptics, combos |
| F | Visual art | Cars, world dioramas, lighting, weather, VFX |
| G | Animation | Car driving physics, people, camera moves |
| H | UI / UX | HUD, menus, navigation, transitions, typography (Persian, RTL), readability |
| I | Audio | Music, SFX, ambience, mix, voice limits |
| J | Onboarding | First-time experience, tutorials, mechanic intros |
| K | Progression & meta | Coins, keys, stars, garage, agency, pass, achievements, chests |
| L | Theme, narrative, characters | Tehran identity, آقای عجول, مش‌رحیم, radio bulletins, events |
| M | Accessibility & settings | Colorblind mode, sound/music/haptics, graphics quality |
| N | Platform integration | Android splash, back button, pause/resume, save safety, APK |
| O | Monetization & fairness | Rewarded ads, shop, lives |
| P | Retention / live-ops | Daily rush hour, Yalda, Nowruz, streaks |
| Q | QA & tooling | Tests, solver checks, perf harness, screenshot tooling |

## 2. Where the game stands, measured

Measured with `scripts/perf.cjs`, `scripts/cpuprof.cjs`, `scripts/gpucost.cjs` (headless Chromium, SwiftShader,
mobile UA so the phone 'lite' profile applies), level 60:

- **Draw calls per frame: 384** (triangles 387k). Cars alone: **237 calls, 249k triangles**, about 9 draw calls
  per car (body, glass, three decals, arrow, arrow edge, shadow blob, badges). People: 64 calls, 78k triangles.
  World: 85 calls. On Android WebView every draw call goes through Chrome's GPU process and the GL driver, so on
  a mid-range phone that is about 10–30 ms per frame on draw calls alone. **This is why play lags, and why it
  gets worse with more cars.**
- Game logic is cheap: about 5% of a frame in the profile. The JS isn't the problem; the rendering is.
- **Hitches during play:** a new passenger joining the queue is built and merged on the spot (`person()` +
  `bake()`, several ms of mesh work plus a GPU upload). Every smoke puff clones and later disposes a material,
  so its shader can be thrown away and compiled again. These are the "lots of cars moving" stutters.
- **Startup:** about 4.4 s of one blocked main thread on a phone-speed CPU (4× slowdown): world 2.3 s, people
  0.7 s, cars 0.6 s, streets 0.5 s, then shader compile. `KHR_parallel_shader_compile` is often missing, so
  "async" compile blocks too.
- **Menus lag because of background work behind them:** after the menu opens, the game builds 37 more car
  templates (one every 120 ms, each a long task on a phone) and renders music stems. Measured on the home
  screen: 9 long tasks in 4 s, worst frame 2.2 s. On top of that the 3D scene keeps rendering at 30 fps under
  the menu and competes with the menu's own animations.
- Some CSS animations repaint every frame (animated `box-shadow` and `filter`: `claimglow`, `glow`).
- Chapter changes rebuild a world synchronously with no transition: a visible freeze.

## 3. Plan per aspect

### A. Performance & technical feel (P0, most of the effort)

Targets: **≤ 80 draw calls** in any level (from 384); **no frame over 50 ms** during play; menus at steady
60 fps with no background work; startup with a real loading screen that never freezes and hands over to the
menu with a crossfade; level-to-level and chapter-to-chapter changes behind a smooth fade.

1. **Instanced fleet.** Each car model is built once per *kind* (not per kind × color), and every car of that
   kind is drawn with one instanced mesh per material, with its paint color per instance (a paint mask
   in the shader). Arrows, arrow edges and the shadow blobs are one instanced mesh each for all cars. Cars
   keep their scene-graph nodes for movement (root/body/arrow), and the visible meshes follow them.
   Expected: cars from ~237 calls to ~30, car building at startup from 42 builds to ~9.
2. **Instanced people.** A fixed set of passenger looks, each baked once; all passengers drawn instanced,
   coat color per instance. No mesh building during play. Expected: 64 calls to ~12.
3. **No hitches in play:** pooled smoke and coin particles with persistent materials, no material clones or
   disposals during play, a cap on smoke emitters; every shader warmed up once at load (effects, weather,
   covers, badges, confetti) and kept alive.
4. **Startup pipeline.** A branded loading screen with a progress bar. The work runs in stages (fonts, fleet,
   people, world, shaders, music), yielding a frame between stages so the screen keeps moving. After loading,
   **nothing heavy runs behind a menu**. The loader crossfades into the title screen.
5. **Menus.** While a menu covers the game, the 3D view renders only when something changes (it stays as a
   still backdrop with a slow, compositor-only drift), so the GPU is free for the menu. Card transitions use
   only `transform`/`opacity` (a 240 ms decelerating ease), buttons get a pressed state, and every
   per-frame-repaint animation (`box-shadow` and `filter` keyframes) is replaced with an opacity/transform
   version.
6. **Transitions between levels and chapters.** A fade (iris) overlay while the next level is set up; a new
   chapter's world is built in slices behind it.
7. **Frame pacing governor.** Dynamic resolution with hysteresis, at most one change every few seconds. If a
   device can't hold 60, it settles on an even 30 (every other vsync) instead of jittering between 40 and 60.
8. **Per-frame hygiene.** No allocations in the drive loop (reused vectors), no array spreads of the traffic
   set, a cap on simultaneous engine/horn voices.
9. **Perf HUD for testers:** `?perf` or seven taps on the version label shows fps, worst frame, draw calls
   and resolution scale, so a phone can report what it sees.

### B–C. Gameplay, levels (P2: already solid)

240 solver-verified levels, 8 chapters, 10 mechanics, a tuned difficulty curve. No rule changes in this pass;
the stress tests must still pass (`scripts/stress.cjs`). Keep the solver/validity tests green.

### D. Controls & input (P1)

- Respond within the same frame: the press squash starts on `pointerdown` (already). Add a soft ring pulse on
  the tapped car (instanced-friendly), and make sure no input is lost while a transition plays.

### E. Game feel (P1)

- Camera: critically damped follow for shake and swoop end (no snapping), a gentle settle at level start.
- A subtle win sequence: the camera eases back while the confetti falls (no extra cost).

### F–G. Visual art & animation (P1, within the frame budget)

- Everything visual must pay its way inside the budget above; the instanced fleet keeps the current car
  look. People keep their look at fewer triangles.
- Title screen: a slow cinematic camera over the chapter's diorama (rendered while it moves, then held).

### H. UI / UX (P1)

- The loading screen, title and transitions as above. A consistent motion language: every card enters with
  the same scale-and-fade from 96% and leaves faster than it came (160 ms).
- Pressed states on all buttons; no layout jumps.

### I. Audio (P1)

- A voice cap (engine and horn sounds), so a burst of departures doesn't pile up dozens of nodes.
- Music stems rendered during loading, never behind a menu.

### J–P (P2)

Onboarding, meta, events, settings, monetization and live-ops are in place. This pass only touches them where
fluidity needs it (e.g. the settings quality switch).

### Q. QA & tooling (P0, supports A)

- `scripts/perf.cjs`, `scripts/gpucost.cjs`, `scripts/cpuprof.cjs`, `scripts/fpsprobe.cjs`: measure before and
  after every step; tests and stress runs stay green; screenshots compared before and after so the look
  doesn't change by accident.

## 4. Order of work

1. Instanced fleet (A1) — biggest win.
2. Instanced, prebuilt people (A2) and hitch removal (A3).
3. Startup pipeline and loading screen (A4), nothing behind menus.
4. Menu rendering and motion (A5), level/chapter transitions (A6).
5. Frame pacing governor and perf HUD (A7, A9), per-frame hygiene and audio voice cap (A8, I).
6. Feel and presentation polish (D, E, F, H) inside the budget.
7. Re-measure, screenshots, tests, APK.

## 5. Status (end of this pass)

Done, measured on level 60 (a full lot) unless noted:

| Plan item | Result |
|---|---|
| A1 instanced fleet | Cars drawn per kind with per-instance paint; arrows, blobs, covers, pigeons instanced. Car draws no longer grow with the number of cars. |
| A2 instanced people | 8 prebuilt looks, coat color per instance, coarser meshes on phones; nothing built during play. |
| Atlas merge | Facades/plates packed into shared textures: world draw calls 85 → 38. |
| Draw calls | 384 → ~153 per frame. Triangles 387k → ~330k. |
| A3 hitches | Pooled smoke; effect shaders warmed with the real materials; materials kept across levels (programs never recompiled); hint search in a worker (it froze the game every 4 s while a player was thinking); music tension no longer schedules an automation event every frame. |
| A4 startup | Loading screen with progress; only the first level's car kinds, the passenger looks and the first world are built; everything compiled and drawn once before the menu appears. No background work behind menus. |
| A5 menus | 3D view holds still behind cards; compositor-only card motion; pressed states; garage/agency reuse one persistent 3D view (2nd open 3.3 s → 65 ms headless). |
| A6 transitions | Veil dips for level changes; a new world is built in slices behind it, or ahead of time while the win card shows (next level ~3.7 s → ~0.5 s headless). |
| A7 pacing | Refresh-aware (even 60 on 120 Hz screens), resolution governor in 'auto' (steps down when late, up to 1.5× when there's headroom, half rate only as a last resort). |
| A9 perf HUD | `?perf` or three taps on the version line. |
| A8 / I | Allocation-free drive loop; voice limits for engine/horn/chirp/pop/coin. |
| H | Shop icons fixed (were broken images), HUD sign/counter overlap fixed, toasts below counters, dim boxes on the dark theme. |
| E | Smooth (sine-noise) camera shake. |

Not done (lower value per cost): badge sprites as one instanced billboard batch (saves up to ~26 draws on plate-rule
levels, more with colour-blind symbols on), rain streaks animated on the GPU, an offline asset cache for car
models (would cut the remaining loading time).
