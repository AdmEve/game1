# راه‌بندون (Rahbandoon) — Game Design Document v0.1

> «ترافیک تهران، تو دستای تو.» Tehran's traffic, in your hands.

A premium-quality 3D traffic puzzle for Iranian players (Cafe Bazaar and Myket first). You untangle jammed Tehran streets full of real Iranian cars and send every passenger home. The core is a proven global hit (Bus Jam / Car Jam / Crowd Express). Our edge is that it's **made for Iran**: real cars, real places, real humor, and real Persian voices. It also meets a production bar no Iranian casual game has reached yet.

---

## 1. Pillars

Every feature has to pass these four tests.

1. **Every tap feels good.** Each tap gets a physical, readable, juicy response: suspension squat, tire chirp, honk, drift, passengers cheering, coins flying.
2. **This is our Tehran.** The cars, streets, voices and jokes are recognizably ours. A player should screenshot it and send it to the family group: «اینو ببین، پیکان بابامه!» ("Look, it's Dad's Peykan!")
3. **Fair, readable puzzles.** You can read the board in one second. Every level is solver-verified. A loss always feels like *my* mistake, never the game's.
4. **A city that grows with you.** Progress is visible. You turn grandpa's rusty taxi agency into the best transport company in Iran, one neighborhood at a time.

---

## 2. Core loop (one level, 40–120 s)

1. **The board** is a lot or street grid packed with vehicles. Each one has a facing direction, a color and a seat count. Real models: Pride (4 seats), Peykan (4), Samand taxi (4), 405 (4), Zamyad pickup (2 + cargo), BRT bus (10).
2. **Tap a vehicle.** If its lane is clear, it pulls out along a spline path: squat on launch, body roll in the turn, tire smoke on hard exits. If it's blocked, it lunges a few centimetres, honks and bounces back. That costs nothing, but see «اعصاب» below.
3. Freed vehicles drive to an empty **bay** at the bus stop (5 bays; a 6th can be unlocked per level with an ad or coins).
4. **Passengers** wait in a colored queue at the stop. Matching passengers at the front of the queue board automatically. When a vehicle is full it drives off with a honk, a wave and a coin burst.
5. **Win** when the queue is empty. **Lose** when every bay is full and nobody at the front matches.

**Moment-to-moment goals:** look ahead in the queue, choose which vehicle to release *now* versus *later*, and avoid clogging the bays.

### Readability rules (non-negotiable)
- Every vehicle color is distinct in hue *and* in its pattern/icon, so color-blind mode is built in from day one.
- Direction is shown three ways: the car's real nose (headlights), a clean white chevron decal on the roof, and a soft ground arrow that appears while you hover or touch.
- The camera never hides a cell. Tilt-shift blur is applied only outside the board.

---

## 3. Novel mechanics (our differentiation)

These are introduced every 8–15 levels, each with a one-screen intro card in the voice of «مش‌رحیم» (Mash Rahim; see §5). **★ = launch set**; the rest ship in live ops.

| # | Mechanic | What it does | Why it's great |
|---|---|---|---|
| ★1 | **«دربست!»** (private hire) | A passenger with a «دربست» badge rides alone: the car leaves at once, even with empty seats. | Gives you a strategic "emergency release" to clear a clogged bay. Deep, and instantly understood by every Iranian. |
| ★2 | **Broken-down Peykan** «پیکان خراب» | Needs 3 taps (passers-by push it, comically) or the tow-truck booster. | Funny, very visual, a natural booster sink. |
| ★3 | **Car cover** «چادر ماشین» | The car's color is hidden under a grey cover until a neighbouring car leaves; then the wind blows the cover off. | The classic "hidden" mechanic with a 100% Tehran-alley look. |
| ★4 | **Odd/even plates** «طرح زوج و فرد» | A traffic camera switches between odd and even every 3 moves. Only cars whose plate matches may leave the lot. Plates glow on their turn. | **Unique in the genre.** Adds timing and planning, and is pure Tehran satire. |
| ★5 | **Traffic officer** «پلیس راهور» | An officer at the lot exit alternates letting horizontal or vertical lanes through with every tap. | Rhythm and planning; a strong character. |
| ★6 | **Motorcycle courier** «پیک موتوری» | A 1-cell motorbike squeezes through gaps (it can pass beside a car) and carries **one passenger of any color**. | A wild card you can save for later; decision depth. |
| 7 | **Wedding car** «ماشین عروس» | A car decorated with flowers that must leave within N moves; the honking convoy pays bonus coins. | Emotional, culturally beloved, great for screenshots. |
| 8 | **Ambulance** «آمبولانس» | Arrives with a siren and needs a clear lane within 4 moves. | Short urgency spikes inside calm puzzles. |
| 9 | **Azadi Square roundabout** «میدان آزادی» | A ring-shaped board: cars on the ring rotate one slot with each move. | A brand-new board topology. |
| 10 | **Snow day** «برف تهران» | Icy cells: a car sliding over ice drifts one lane sideways. | A seasonal (winter) event mechanic. |
| 11 | **Fruit cart** «گاری میوه» | A street vendor's cart moves one cell every 3 moves. | Obstacles that move. |
| 12 | **Tunnel** «تونل نیایش» | A car that enters one tunnel mouth comes out of another. | Spatial puzzles for late chapters. |
| 13 | **Grandma with shopping bags** «حاج‌خانم با خرید» | Takes 2 seats. | Changes the seat math. |
| 14 | **Petrol queue** «صف بنزین» | Some cars must visit the pump bay before picking anyone up. | A different level goal, for variety. |
| 15 | **Double parking** «دوبله‌پارک» | A car parked across two lanes; honk three times and its owner runs back to move it. | Comic, and a chance to "tap the right thing". |

**Street nerves meter «اعصاب»** (optional rule for «سخت» (hard) levels only): blocked taps raise the street's anger. When it's full, the rival «آقای عجول» (Mr. Ajool) sends in an extra blocker. This punishes random tapping without punishing thinking.

---

## 4. Modes

- **Journey** (main progression): 600+ hand-curated levels at launch-plus-3-months, grouped into neighborhood chapters of about 30 levels.
- **«ساعت شلوغی»** (Rush Hour, daily): one hard level a day, the same for everyone; scored on time and moves; national leaderboard. It's introduced by the in-game radio (below).
- **Districts league** «لیگ منطقه‌ها»: at signup you pick your Tehran district (1–22) or your city (Mashhad, Isfahan, Shiraz, Tabriz…). Each week your stars count toward your district or city table. *City-vs-city rivalry is a powerful organic-sharing engine in Iran.*
- **Agencies** «آژانس‌ها» (teams, from version 1.1): clubs of up to 30 people who share lives and run team events.
- **Live events** (two-week cycles, tied to the calendar): Yalda (watermelons and pomegranates on the Zamyads), Nowruz (goldfish passengers, a Haft-sin bus, Chaharshanbe Suri sparklers), the summer Kish Island trip, and the first day of Mehr (school buses).

---

## 5. Meta, story and characters

**Premise:** you inherit **«آژانس آقاجون»** ("Grandpa's Agency"), a run-down taxi agency in Tajrish with one rusty Peykan. Stars earned in levels pay for renovating the agency and its neighborhood. Each chapter is a real place, rebuilt in 3D as a miniature diorama with tilt-shift:

Tajrish Square → Valiasr Street (the plane trees) → Darband → Tabiat Bridge → Milad Tower → Azadi Square → Grand Bazaar → Enghelab and City Theater → Tochal cable car → then other cities: Isfahan (Naqsh-e Jahan, Si-o-se-pol), Shiraz (Eram), Mashhad, Tabriz (the bazaar), Yazd (a Peykan in the desert), Rasht (rain), Kish (summer).

**Characters** (voiced in a Tehrani accent; voice lines are short, funny and skippable):
- **مش‌رحیم** (Mash Rahim): a veteran taxi driver who taught grandpa; the mentor and tutorial voice. *«جوون، اول اونی که جلوئه رو رد کن!»* ("Young one, clear the one in front first!")
- **خانم صبوری** (Ms. Sabouri): the agency dispatcher; delivers daily rewards and missions over the radio.
- **آقای عجول** (Mr. Ajool): owner of the rival agency and a comic villain who causes jams. Boss levels are his.
- **Passengers:** about 20 archetypes, including a student, a bazaar merchant, a grandma with shopping, a footballer, a bride and groom, and a tourist. Each has idle and boarding animations and one voice line.

**My Garage «گاراژ من»** (the collection): restore classic Iranian vehicles and use them as skins in levels:
Peykan 1346, Jiane (Citroën), Jeep Willys, Chevrolet Royale, Paykan Vanet, Renault 5 Sepand, Benz 302 «بنز دودر» bus, Land Rover, the first Pride, and the 405 GLX.
Each one has a short nostalgic story card («این ماشین، ماشین عروسی بابات بود…», "This was your dad's wedding car…"). This is a deep emotional hook for adults 25–55.

**«رادیو راه‌بندون»**: a 10-second in-game radio bulletin between sessions, in the style of a real traffic report («ترافیک سنگین در بزرگراه همت… به‌جز یه پراید که داره ویراژ می‌ده», "heavy traffic on Hemmat Highway… except for one Pride weaving through"). It announces the daily challenge, events and league results. It's cheap to produce and has a lot of personality.

---

## 6. Economy and monetization (Iranian market)

- **Stores:** Cafe Bazaar (primary) and Myket. In-app purchases via **Poolakey** (Bazaar) and the Myket billing SDK. No dependency on Google Play Services.
- **Currencies:** coins (soft); keys «سوئیچ» (car keys) for garage restorations; lives (5, regenerating every 30 minutes).
- **Boosters:** جرثقیل (crane: removes one car), سوت پلیس (police whistle: shuffles colors), جای پارک (parking spot: extra bay), بوق (horn: next three passengers re-sort by color).
- **Ads** (Tapsell or Adivery): rewarded ads for continues, bay unlocks and double rewards; interstitials only after level 20, at most one every 4 minutes, never after a loss.
- **IAP products:**
  - Starter pack «بسته‌ی شروع»
  - No ads
  - Piggy bank «قلک»
  - Season pass «کارت بلیت»: a monthly pass designed as a Tehran metro card, with free and premium tracks
  - Booster bundles
  - Life refills
- All prices are set by remote config in Toman (tiers from 9,000 to 490,000) so we can follow inflation.
- **No gambling mechanics** (no paid loot boxes): every reward is shown before you claim it. This respects local norms and store policy.
- **Fair continue:** at the failure screen, *show* which car would have saved you, so the offer feels honest, not predatory.

---

## 7. Art direction — "miniature Tehran"

- **Style: stylized realism.** Real proportions and real brand details (grilles, lamps, chrome, plates), rendered like a premium toy: soft studio light, clearcoat paint with sky reflections, ambient occlusion and contact shadows. Tilt-shift blur at the edges makes Tehran look like a model city.
- **Vehicles:** every car is modeled from real dimensions (L/W/H, wheelbase, wheel size). Details include Iranian plates (white for private cars, yellow for taxis and public transport, with the I.R. IRAN strip and the city code), taxi roof signs, Samand chrome grilles, Peykan chrome bumpers and hubcaps, the 405's black rubbing strip, Zamyad watermelons, and the BRT's red livery with the «تندرو» lettering.
- **Damage and wear:** a mud and dust layer on chapter-specific cars; rust on the broken Peykan.
- **The world:** each chapter is a hand-built diorama: Tehran street furniture (blue «ایستگاه» shelters, newspaper kiosks, juice stands, plane trees, «جوی آب» gutters, metro entrances), murals, and Persian signage. Time of day changes per chapter (morning in Tajrish, sunset at Milad, night at Azadi with light trails).
- **UI language, taken from the streets of Tehran:**
  - level badge = an Iranian license plate
  - coin counter = a taxi meter
  - timers = traffic lights
  - shop = a newspaper kiosk «دکه»
  - settings = the glove box
  - season pass = a metro card
  - Logo in Nastaliq calligraphy fused with a road-sign shape; Vazirmatn as the UI font.
- **Color system:** six game colors chosen for maximum hue separation and real car-paint plausibility (paint red, taxi yellow, Peykan sky blue, bottle green, metallic purple, orange), each paired with a passenger-shirt pattern for color-blind players.

## 8. Audio

- **Original score:** upbeat modern pop driven by Persian instruments (tar, santur, tombak, kamancheh). Adaptive layers: the calm layer drops out as bays fill, and a tension layer comes in at 4 of 5 bays.
- **Foley:** a real Peykan horn, a Pride starter motor, the hiss of BRT doors, a Zamyad's diesel rattle, tire chirps, the jingle of a fruit vendor's bell, the hand clap of a traffic officer.
- **Voice:** drivers calling out «تجریش! تجریش! یه نفر!» ("Tajrish! Tajrish! One more!"), passenger lines, and radio host bulletins, all recorded with professional voice talent.
- **Haptics:** a light tap for each car launch, a medium one when a car fills, a success pattern on a win.

## 9. UX and accessibility

- **First session:** no text in the first 5 levels; you can't lose the first 3; first booster at level 6; first fail-and-continue at level 9.
- **Accessibility:** a color-blind mode (patterns), a large-text option, reduced motion, a left-handed layout, and haptics on/off.
- **Session length:** a level takes about 60 s; a session is about 8 minutes, ending with a "one more" hook (a chest needing 1 more star, or a district rank that's about to change).
- **Performance budget:** 60 fps on a Galaxy A12-class phone, a cold start under 4 s, and an install under 60 MB, because mobile data is expensive in Iran.

## 10. Technology

**Engine: three.js (WebGL2) inside a Capacitor Android shell.** This is the pipeline we already have, with an APK built in CI.
- *Why not Unity:* Unity's licence and services are restricted for sanctioned countries, which is a real business risk for an Iranian studio. Godot is the fallback if a native engine is ever needed.
- *Quality tiers:* auto-detected at first launch.
  - **High:** PCF soft shadows, GTAO, SMAA, tilt-shift.
  - **Low:** baked AO, FXAA, a single blob shadow per car.
- *Draw calls:* fewer than 120 per frame, by merging static geometry, instancing passengers, and using one shared paint material per color.
- **Vehicles:** today they are procedural parametric models built from real dimensions (see the prototype). Production plan: an artist does a hero pass on each model in Blender, exported as glTF with Draco compression and baked AO, keeping the same rigging conventions (wheels, doors, lights) so the code doesn't change.
- **Level pipeline:**
  - a web **level editor**
  - an automatic **solver** (A* over board states) that proves every level is solvable and measures difficulty: minimum moves, branching factor, dead ends, and how many distinct queue look-ahead decisions it needs
  - a generator that proposes candidates, which designers curate
  - a sawtooth difficulty curve, with a «سخت» (hard) level every 7–10 levels and a «خیلی سخت» (very hard) one each chapter end
- **Live-ops backend:** a small self-hosted service in Iran for remote config, events, leagues and cloud save (no Firebase dependency), plus analytics (level funnel, fail points, booster and ad usage) and a Bazaar login for cloud save.

## 11. Targets

| Metric | Target |
|---|---|
| D1 / D7 / D30 retention | 45% / 18% / 8% |
| Average session length | 8 min, 4 sessions a day |
| Level fail rate (normal / hard) | 10–20% / 40–55% |
| Crash-free sessions | > 99.5% |
| Bazaar rating | ≥ 4.6 |

## 12. Roadmap

| Phase | Weeks | Deliverable |
|---|---|---|
| **0. Vertical slice** | 1–2 | One chapter (Tajrish), 30 levels, 6 vehicle models, full juice, placeholder audio, Android APK for internal playtest |
| **1. Alpha** | 3–6 | Renovation meta, garage, boosters, shop, Poolakey + rewarded ads, 150 levels across 5 chapters, level editor + solver, analytics |
| **2. Closed beta on Bazaar** | 7–10 | Daily rush hour, district league backend, radio bulletins, voice lines, tuning from funnel data |
| **3. Soft launch: Yalda event** | ~Dec 2026 | Public release on Bazaar and Myket, first live event |
| **4. Big launch: Nowruz 1406** | Mar 2027 | Nowruz event, Isfahan chapter, agencies (teams), marketing push |

## 13. What a real AAA bar needs beyond code
- A 3D vehicle artist for the hero pass on every car, plus an environment artist for the chapter dioramas.
- A composer, a sound designer, and two or three voice actors with a Tehrani accent.
- A device lab: the 10 most common Android phones on Bazaar.
- An ESRA age rating and local legal review of IAP and ads.

## 14. Risks and mitigations
| Risk | Mitigation |
|---|---|
| WebView performance on low-end phones | Quality tiers, aggressive instancing, perf tests on a device lab every sprint |
| Clones copy the game | Speed, local content depth, and live ops (clones can't copy voices, places and events) |
| The puzzle feels samey | A new mechanic every 10 levels, new board shapes, boss levels, seasonal mechanics |
| Payment and SDK fragility in Iran | Abstract all SDKs behind one interface; dual-store builds |
