# «زندگی ایرونی» — game design

A text-first Persian life simulator for Android (Cafe Bazaar first, Myket second). You are born
somewhere in Iran, then tap «+۱ سال» to live year by year. Every year brings events with choices,
and you also act on your own (study, work, invest, marry, emigrate…). When you die you get an
«اعلامیه‌ی ترحیم» card to share, and you can start again or continue as your child.

## Pillars

1. **"This is so us."** Every event should make an Iranian smile in recognition. The tone is
   warm satire, like «پایتخت», never political.
2. **One tap, one year.** Each year shows 0–3 short events, and every choice has a visible
   result (stat chips).
3. **Shareable.** The obituary card and milestone cards (konkur rank, wedding, emigration) are
   made to be posted to Instagram stories.
4. **Replayable.** Random city, family, traits and economy, 60+ achievements («نشان»),
   generations and a family tree.
5. **Fair money.** Everything can be played free. Paying buys convenience, control and fun extras.

## The person

- Name, family name and gender (پسر/دختر), chosen or random. Birth city is one of 31 province
  centres, each with a housing multiplier and its own flavour.
- **Stats (0–100):** 😊 شادی, ❤️ سلامت, 🧠 هوش, ✨ قیافه, 🎖 آبرو (reputation, very Iranian).
- **Hidden stats:** شانس (luck), پشتکار (discipline), plus 0–2 birth traits from a list of about
  16 (e.g. نابغه، خوش‌صدا، ورزشکار، تنبل، خوش‌زبون، شکمو، زودرنج، بدشانس، خوش‌شانس).
- **Family:** parents (job, wealth class, traits), 0–3 siblings and grandparents. Relatives
  (عمه/خاله/دایی/عمو) appear in events.
- **Money** in toman. Parents pay until you are independent. Loans («وام»), cheques.

## Economy (the Iranian hook)

The model starts in 1405: dollar 270k, gold coin 270M, Tehran 220M per m², minimum wage about
16M a month. Each year:

- **Inflation** follows a random walk around 35% with occasional shocks (15–70%).
- **Prices:** the dollar, gold coin and housing index follow inflation with noise and jumps. The
  stock index is volatile, crypto more so. Bank deposits pay about 23%, which is below inflation
  on purpose.
- **Salaries** are multiples of the minimum wage, which grows a few points slower than inflation.
- **Living cost** depends on lifestyle and city. Rent («اجاره») is the big pain if you own no home.
- **Assets:**
  - houses, in city tiers with neighbourhood names
  - cars (پراید → ساینا → پژو ۲۰۶ → دنا → تارا → خارجی)
  - gold coins, dollars, stocks, crypto, bank deposits

  Buying a car or house includes haggling («چونه زدن»).

## Life stages and systems

| Age | Systems |
|---|---|
| 0–6 | Baby and childhood events, parents' decisions, پیش‌دبستانی |
| 7–12 | دبستان, report card (معدل out of 20), classes (زبان، شنا، موسیقی، فوتبال), Sampad exam at 12 |
| 13–18 | متوسطه. At 15 choose a رشته (ریاضی/تجربی/انسانی/هنر/فنی‌حرفه‌ای). At 18 the **Konkur**: rank from هوش, study effort, کلاس کنکور and luck |
| 18+ (men) | **Military service**: serve 21 months (barracks events), student deferral, buy-out (expensive), medical exemption, or دکترا/نخبگی. As a «غایب» you can't get a passport, a government job or a loan |
| 18–30 | University (tier from rank: سراسری روزانه / شبانه / آزاد / پیام‌نور / غیرانتفاعی), majors with years, ارشد/دکترا, part-time jobs, Instagram page |
| 22+ | **خواستگاری**: candidates from family, university or work. The session is a mini-dialogue, then **مهریه** (14 → 1404 coins), عقد, عروسی (budget), children, and in-law events. Divorce makes the مهریه payable, which can mean prison or instalments |
| Work | 70+ jobs with requirements (degree, major, stats, military card), performance, promotions, raises, layoffs, your own business |
| Abroad | Emigration needs money, IELTS and a passport. Destinations: کانادا، آلمان، ترکیه، استرالیا، امارات، ایتالیا, plus the green-card lottery. Homesickness, residency and citizenship; you can return |
| 60+ | Retirement (بازنشستگی) and pension, grandchildren, illnesses |
| Death | Gompertz base risk × health. Shows the obituary card, then the graveyard («بهشت زهرا» of past lives), new life, or continue as a child (inheritance split) |

**Activities** (the «کارها» tab, limited uses per year):

- Health: gym, mountain, doctor, diet
- Mind: books, language class, Konkur class, music
- Fun: travel, cinema, café, party
- Looks: hairdresser, nose job (risky), hair transplant
- Money: invest, deposit, loan, buy or sell assets
- Social: Instagram, charity, نذری
- Risky choices with consequences

**Calendar events** (based on age and year): نوروز and عیدی, سیزده‌به‌در, چهارشنبه‌سوری, یلدا with a
real Hafez couplet as a fortune («فال حافظ»), birthdays.

## Events engine

Events are TypeScript data (`src/content/events/*.ts`):
`{id, age:[min,max], gender?, when?(ctx), weight, once, cooldown, emoji, text(ctx), choices:[{label, when?, do(ctx) → outcome}] | effect(ctx)}`.
A context object gives helpers for stats, money, flags, relations, chance, pick and gendered
text. Outcomes return text, and the UI shows stat-delta chips. Each year draws 1–3 random eligible
events by weight, plus scripted milestones (school start, رشته, Konkur, service, retirement).

## Meta

- **💎 currency.** Start with 30. Earn it from achievements, daily gift and rewarded ads.
- **Achievements («نشان‌ها»):** 60+, e.g. خرپول، نابغه، رتبه تک‌رقمی، مهاجر، دماوندنورد، صدساله، مهریه ۱۴۰۴ سکه.
- **Graveyard** of past lives with their obituary cards. Family tree across generations.

## Monetization (Bazaar Poolakey, Tapsell Plus)

| SKU | What | Type |
|---|---|---|
| `vip` | «زندگی VIP»: no forced ads, hidden stats visible, choose city/gender/family at birth, +5💎 daily, golden theme | non-consumable |
| `god_mode` | «قدرت سرنوشت»: edit stats and traits any time | non-consumable |
| `rich_family` | Option to be born into a rich family | non-consumable |
| `careers` | Special careers: pro footballer, actor/singer, bazaar tycoon, pilot | non-consumable |
| `no_ads` | Remove interstitials | non-consumable |
| `gems_*` | 💎 50 / 150 / 400 / 1000 | consumable |

**💎 sinks:** «ماشین زمان» (undo death, or undo the last year), «پارتی» (guarantee a hire,
admission or exemption), «دکتر خصوصی» (cure), «عمل تضمینی», «پول توجیبی» (cash that scales with
inflation).

**Ads:**
- Interstitial every 6–8 aged years, never in the first 15 minutes and never for VIP or no-ads.
- Rewarded:
  - 💎 +3, up to 5 a day
  - one free time-machine per life
  - an "advice from a friend" hint on Konkur prep

## Tech

Vite, TypeScript and Capacitor 8 (Android), with a DOM UI in RTL, the Vazirmatn font and
Twemoji SVG emoji copied at build time. Saves go to localStorage. Sound is WebAudio synthesis.
The share card is drawn on a canvas and shared through Filesystem and Share. Tests use vitest:
thousands of fuzzed lives with random choices must not crash, stats stay in range, and no text
contains `undefined` or `NaN`.
