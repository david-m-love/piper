# Piper's Dolphin Dash: Next-Step Build Plan

Repo: `david-m-love/piper` (game.js, index.html, styles.css, sw.js, build.mjs). Vanilla JS, canvas drawing, generated Web Audio, speechSynthesis, localStorage. No asset files for new art or sound.

Two design tracks feed this plan:
- **Play track (designed by Piper, age 7, 1st grade):** new islands, hats, a dolphin friend, tricks, rings, a rainbow surprise, a movie theater.
- **Math track (designed by David):** a research-based fluency plan (fact logging, response time, spaced review, subtraction, checkpoints, reports). It is summarized in Part D and can ship on its own schedule.

## How to use this plan (instructions for Claude Code)

1. Read this whole document and the current code before changing anything.
2. Build **one phase at a time**, in the order in Part E. Stop at the end of each phase, summarize what changed, and wait for David to say "next phase."
3. Where a feature lists options, build the one marked **Recommended** unless David says otherwise.
4. Every phase must pass the test checklist in Part F before it is called done.
5. Do not change math fact content (the facts on each island) unless the phase says so. New islands get a **placeholder fact set** only.

## Ground rules (apply to everything)

- **Gentle, no penalties.** Nothing ever takes away coins, hats, or progress. Mistakes get encouragement. No visible countdowns on math screens.
- **Big touch targets.** Minimum 64 px tap targets for anything Piper uses; 88 px or more for primary actions.
- **iPad portrait and landscape.** The race already rotates the scene for portrait (`layoutRace`, `applyView`). Every new race feature must be drawn inside the existing view transform so it works both ways.
- **Never break existing saves.** Current key is `piperDolphinMath2`, profile `v: 2`. `loadProfile` spreads defaults over the stored JSON, so new fields with defaults are safe. Any change to the *shape* of existing fields needs a migration (Phase 0).
- **No asset files.** Hats, Violet, penguins, clouds, the movie: all drawn with canvas paths. Sounds built with the existing `note`, `whistle`, `noiseBuffer` helpers.
- **No copyrighted characters.** Piper asked for a movie "like The Cat in the Hat." Make an **original** silly story and character instead (see 2.7). Do not draw a cat in a tall striped hat or use Dr. Seuss names, titles, or text.
- **Works offline.** `sw.js` uses cache `dolphin-dash-v2` and a fixed `CORE` file list. Every release must bump the cache name, and any new file must be added to `CORE` in `sw.js` **and** to the file list in `build.mjs`.
- **Open index.html directly must keep working.** That rules out ES modules (`type="module"` fails over `file://`). If code is split into files, use classic `<script>` tags that share one namespace object (for example `window.DD`).

---

## Part A. Facts about the current code that drive the plan

| Area | How it works today | Why it matters |
|---|---|---|
| Islands | `ISLANDS` array of 8 `{ name, sub, emoji, facts }` | Theme and math content are welded together in one object |
| Progress | `profile.done` keyed by **array index**; `profile.facts` keyed by `"a+b"` | Reordering or inserting islands silently moves "mastered" flags to the wrong island |
| Scenery | `drawRace` adds layers with `n >= X` checks; every island keeps all earlier scenery | Snowy and Sky islands would inherit the pirate ship, rainbow, and palace |
| Water colors | `WATER[]` and `REEF[]` arrays indexed by island | Need entries per new island, or a theme object |
| Dolphin | `drawDolphin(c, x, y, color, scale, mood)` draws on any canvas (mascot and race) | One place to add hats and flips; Violet reuses it |
| Map marker | Emoji `🐬` with a CSS `filter` for color | Will not show hats; needs a tiny canvas if hats should appear on the map |
| Race objects | `spawnPath` makes `coin` (1), `hoop` (2), `jelly` (boing, lowers boost) | New objects (high rings, rainbow bubble) slot in here |
| Lanes | 3 lanes at y = 155, 310, 465 in a 620-unit view | Jumping needs a new vertical (or "toward camera") dimension |
| Voice counting | `startCount` fires `speak("1")`, `speak("2")`... on a fixed 700 ms `setTimeout` | Speech on iPad runs slower than the timer, so the voice falls behind the glowing tokens. This is the known timing bug |
| Question timer | `questionStarted` is set before the question is read aloud | Response times include narration (fix in the math track) |
| End of game | `finishGame` runs when the last island is mastered; text says "all 8 islands" | Must use `ISLANDS.length` and allow islands added later |
| Coins | Roughly 15 to 25 coins per 25-second swim (estimate from spawn rates; measure it) | Sets shop and theater prices |

---

## Part B. Phase 0 foundation (required before Piper's features and the math track)

These are the **larger refactors**. Doing them first keeps every later phase small.

### B1. Split island "theme" from island "content" (larger refactor)
- Give every island a stable `id` (for example `"bubble-bay"`). Never key saves by index again.
- New structure:
  - `THEMES`: `{ id, name, emoji, water: [4 colors], reef: [3 colors], scenery: [layer names], obstacle: "jelly" | "snowpuff" | "cloudpuff", music: optional }`
  - `FACT_SETS`: `{ id, label, facts }` (today's 8 fact lists move here unchanged)
  - `ISLANDS`: ordered list of `{ id, theme, factSet, sub }`
- New islands Snowy and Sky point to a `factSet: "placeholder"` that, for now, reuses a mixed review of all earlier facts. David will assign real fact sets later.
- Why this matters for both tracks: the math plan re-maps islands (subtraction paired in, up to 16 islands, Challenge Reefs). With themes separate, David can change content without touching Piper's worlds, and Piper can add worlds without touching math.

### B2. Scenery as named layers (medium refactor)
- Convert the `n >= X` chain in `drawRace` into named layer functions (`fish`, `chests`, `kelp`, `ship`, `rainbow`, `glow`, `palace`, `snow`, `icebergs`, `penguins`, `clouds`, `cloudBunnies`, ...).
- Each theme lists its layers. For islands 1 to 8, generate the same cumulative lists they have today so they look identical.

### B3. Save migration to v3 (medium)
- Before migrating, copy the raw v2 JSON to `piperDolphinMath2_backup_v2`.
- Map `done[index]` to `done[id]` using the original 8-island order.
- Add new fields with defaults (schema in Part G). Never delete unknown fields.
- `resetProgress` ("Start over"): **Recommended**: reset math progress only and keep coins, hats, Violet, and theater. Piper would be sad to lose hats. Confirm with David.

### B4. Fix the counting-voice timing bug (small)
- Make `speak` return a Promise that resolves on `utterance.onend` (with a fallback timeout of about 1.5 s, because iOS Safari sometimes never fires `onend`).
- Rewrite `startCount` as an async loop: highlight token i, play the note, `await speak(String(i + 1))`, short pause, next. Then say the sum and glow the answer.
- Keep the `hintId` cancel check inside the loop.
- With sound off, fall back to the current fixed timing.

### B5. Small shared pieces (small)
- `screens` list: add `shopScreen`, `theaterScreen` (Phase 2 and Phase 7).
- A tiny `DD.ui.bigButton()` helper so new buttons are consistently large.
- Optional: move new features into separate classic script files (`hats.js`, `friend.js`, `theater.js`) loaded before `game.js`, sharing `window.DD`. Add each file to `sw.js` CORE and `build.mjs`.

---

## Part C. Piper's ideas: options for each

Effort key: **Small** (an hour or two of Claude Code work), **Medium** (a focused session), **Large** (multiple sessions).

### C1. New islands after Dolphin Palace

**a. Snowy Island with penguins**

| Option | Description | Fit with code | Effort | Tradeoffs |
|---|---|---|---|---|
| **1. Themed race world (Recommended)** | Icy blue water palette, falling snowflakes, icebergs on the horizon, penguins that slide off ice and dive alongside her lane. Jellyfish become soft "snow puffs" that boing. Map emoji 🐧. | Uses B1 themes + B2 layers; new layer functions only | Medium | Needs Phase 0 first. Clean, and later islands get the same treatment |
| 2. Special-case branch | `if (island.id === "snowy")` inside today's `drawRace` | No refactor | Small | Fast but messy; inherits palace and ship unless hacked around; gets worse with every new island |
| 3. Penguin buddies as collectibles | Option 1 plus penguins that wave and give +1 coin when she swims by | Adds an object type in `spawnPath` | Medium | More fun, but more coins entering the economy |

**b. Sky Island with clouds and cloud bunnies (the dolphin gets there with a big jump)**

| Option | Description | Fit with code | Effort | Tradeoffs |
|---|---|---|---|---|
| **1. Big-jump cutscene plus cloud sea (Recommended)** | When she taps Sky Island on the map, a 3-second canvas cutscene: the dolphin leaps out of the ocean, arcs up past a rainbow, splashes into a "cloud sea." In the race, pastel sky gradient, puffy clouds she swims through, cloud bunnies hopping on cloud tops. Obstacle becomes a "cloud puff" boing. | Theme + layers; cutscene is a small canvas animation reused from the jump mechanic (C4/C5) | Medium | Depends on the jump animation, so build after Phase 4 |
| 2. Map-only jump | Animate the 🐬 marker hopping across the map to the Sky Island card (CSS), then a normal sky-themed race | CSS keyframes on the map | Small | Easy, but less magical than a real leap |
| 3. Jump every time | Every Sky Island swim starts with the dolphin launching from the sea | Cutscene runs at `startRaceRound` | Small extra on top of 1 | Delightful at first, may slow repeat play; add a skip tap |

### C2. Coin shop: hats (flower hat for her dolphin, violet sparkly hat for Violet)

Starter hat list (each is a small canvas draw function, about 20 to 40 lines): Flower crown, Violet sparkle hat (violet top hat with twinkling sparkles), Party hat, Crown, Pirate hat, Snow beanie with pom-pom, Sun hat, Bow, Chef hat, Bubble halo, Starfish clip, Rainbow hat (special, see C6).

| Option | Description | Fit with code | Effort | Tradeoffs |
|---|---|---|---|---|
| **1. Dressing room screen (Recommended)** | New `shopScreen` with a big preview canvas of her dolphin (and Violet once she has met her), a grid of hat cards with prices, and "Buy" then "Wear." A toggle picks who wears it: "Me" or "Violet." | Hats drawn inside `drawDolphin` via a `hat` argument, so they show on the mascot, in the race, and in the shop automatically | Medium | Best experience; most UI work |
| 2. Simple list on the map screen | A row of hat buttons under the island list; tap to buy and wear | Reuses map screen | Small | Quick, but cramped on a phone and no preview |
| 3. Shop plus found hats | Option 1, plus some hats can only be found (rainbow bubble, mastering an island, theater visit) | Adds unlock sources | Medium+ | Adds surprise and collecting; more to balance |

Paying: reuse the **Coin Counter** from the theater (C7). For hats, prices are big (10 to 60), so do not make her drag 40 coins. Recommended: hats are bought with one "Buy for 25 🪙" button; the drag-to-pay counter is used only for small theater prices.

Pricing (tune after measuring coins per swim): common hats 15 to 25, fancy hats 40 to 60. Put all prices in one `PRICES` config.

Hat on the map: replace the emoji marker with a 48 px canvas that calls `drawDolphin` so the hat shows (small, optional).

### C3. Dolphin friend: Violet, a pink dolphin

| Option | Description | Fit with code | Effort | Tradeoffs |
|---|---|---|---|---|
| **1. Swim buddy (Recommended)** | Violet swims just behind and to the side of Piper's dolphin, following her lane with a gentle lag, wearing her own hat. She waves after a ring, does a flip when Piper does. Her coins add to Piper's total ("Violet found 2 coins!"). | `drawDolphin` again with a pink color (distinct from the existing "Pink" option, for example `#ff8fc8`) and a smaller scale; follows `race.playerY` with easing | Small to Medium | Cooperative and gentle; no losing |
| 2. Helper | Option 1, plus on the math screen Violet sits beside the mascot and cheers, and in the swim she grabs coins in a lane Piper is not in | Extra canvas on math screen; extra collision check | Medium | More presence; keep her from stealing the spotlight |
| 3. Friendly race | Violet races beside her; at the end both get a medal ("You both win!") | New end-of-swim screen | Medium | Piper asked for "race" as an option, but competition can feel like losing; keep it opt-in and always a tie or celebration |

Meeting Violet: **Recommended**: a short "Meet Violet!" moment the first time Piper finishes a swim after this ships (Violet pops up, whistles, says hi). Existing saves get the moment too. Alternative: Violet is there from the start.

### C4. Tricks: back flips and front flips (including a flip for a right answer)

| Option | Description | Fit with code | Effort | Tradeoffs |
|---|---|---|---|---|
| **1. Mascot flips on correct answers (Recommended, do first)** | On a correct answer the math-screen dolphin does a full 360 degree flip in about 0.6 s, alternating front and back flips; a double flip at a 3-in-a-row streak | Add `flip` state to `setMascot` and rotate in `mascotLoop` before `drawDolphin` | Small | Must finish inside the existing 1.7 s gap before the next question |
| 2. Trick button in the swim | During a jump (C5), tapping Jump again does a flip; landing a flip gives a sparkle and a happy whistle (no coins, so no economy change) | Rotation during the jump arc | Small once C5 exists | Fun, no pressure; needs the jump |
| 3. CSS flip | Rotate the whole mascot `<canvas>` with a CSS keyframe | One CSS rule plus a class toggle | Very small | Quickest, but the speech bubble and canvas box rotate as a block; looks cheaper |

### C5. Rings to jump through, worth 5

The race already has underwater **hoops worth 2**. Make the new rings clearly different: **golden sky rings floating above the water** that only count if she is mid-jump.

| Option | Description | Fit with code | Effort | Tradeoffs |
|---|---|---|---|---|
| **1. "Hop" jump plus high rings (Recommended)** | Add a big **Jump** button in the controls row (portrait: ◀ Jump ▶, landscape: ▲ Jump ▼). A jump lasts about 0.9 s: the dolphin grows a little, a shadow appears on the water, a splash on landing. Golden rings spawn in a lane, drawn with a shadow; passing through mid-jump gives **5 coins**, a sparkle chime, and an automatic flip | Scale-and-shadow "toward camera" jump works inside the existing rotated view, so portrait and landscape both work | Medium | Most new controls; rings must be rare (about 1 in 12 spawns) to protect the economy |
| 2. Surface leap | Treat the top of the view as the water surface; Jump makes the dolphin leap up out of the water to hit rings above the surface | Needs a surface band and lane-to-surface travel | Medium to Large | Looks most realistic in landscape, awkward in portrait (the "up" direction becomes sideways) |
| 3. No jump button | Rings sit in a lane and give 5 when she swims through, like a big hoop | One new object type | Small | Easiest, but loses "jump," which is the fun Piper described |

Decision for David: are rings worth **5 coins** (Recommended, simplest) or **5 "points"** in a separate score? A second currency adds complexity for little gain.

### C6. Surprise: a rainbow bubble

At most **one per swim**, appearing in about half of swims, floating slowly so it is easy to catch. Popping it plays a rising rainbow arpeggio and a burst of colored sparkles. What it does:

| Option | Description | Effort | Tradeoffs |
|---|---|---|---|
| **1. Random "rainbow treat" (Recommended)** | One of: **Rainbow Rush** (6 seconds where every lane fills with coins), **Coin Magnet** (8 seconds where nearby coins float to her), or rarely a **Rainbow Hat** that can only be found this way | Medium | Variety keeps it a surprise; the rare hat links to the shop |
| 2. Rainbow trail only | The dolphin leaves a rainbow trail for 8 seconds and swims a little faster | Small | Pretty, but no reward to look forward to |
| 3. Friend call | Popping it calls Violet for a joint double flip and a shower of 5 coins | Small once Violet exists | Nice story moment; less variety |

### C7. Dolphin movie theater

Piper's design (keep it exactly):
- Unlocked with **a lot of coins** (one-time).
- Each visit: **movie ticket 3 coins**, **popcorn 1 coin**, **candy 1 coin**, **soda free**, **blanket free**.
- It is **dark** and cozy, with a **blanket**.
- At the snack counter she picks what she wants, the game shows the total, and she **drags her coins over to pay**. (Light money math with small numbers; this is not part of the fact-fluency data.)
- The movie is **short and made up**. Piper's inspiration was The Cat in the Hat, so make an **original** silly, rhymey story. Suggested: "Captain Wobble's Hat Tower," about a giggly sea otter who stacks too many hats and they wobble, topple, and land on everyone in the audience. It ties into the hat shop.

| Option | Description | Fit with code | Effort | Tradeoffs |
|---|---|---|---|---|
| **1. Full theater (Recommended)** | Map shows a locked 🎬 theater with progress ("87 of 150 coins"). Visit flow: snack counter, then pay with the drag counter, then the theater dims, then both dolphins snuggle under the blanket with the snacks she bought, then a 45 to 60 second canvas movie with narration plays on the screen | New `theaterScreen`; Coin Counter component; movie as a scene list (6 scenes, each a draw function plus a narration line, chained by `await speak()` from B4) | Large | Biggest feature; best kept as the "big goal" after hats |
| 2. Storybook movie | Same flow, but the movie is 6 still canvas pictures that change with each narrated line | Same screen; simpler scenes | Medium | Much less animation work, still charming |
| 3. Grow the movie library | Option 1 or 2, plus a new short movie unlocks after each newly mastered island | Scene-list format makes new movies data, not code | Large total, small per movie | Gives a reason to keep playing; more content to write |

Coin Counter component (shared):
- Shows the total as coin pictures and a number. Her coins appear in a pile; she **drags** (pointer events) or **taps** each coin to move it to the tray. Each coin says its count aloud ("1, 2, 3...").
- When the tray matches the total: "Paid! Enjoy the movie!" If she adds one too many, the cashier gently hands it back ("Here's one back!"). No penalty, no wrong buzzer.
- Big coins (at least 72 px). Works with mouse too.

Theater unlock price: about 150 coins (roughly 6 to 10 swims). Tune after measuring.

---

## Part D. Math track summary (David's design; separate from Piper's play features)

From the research report (Idaho Content Standards, Mathematics, Jan 2022; IES practice guides; Fuchs et al. 2013; Rohrer et al. 2020). Idaho's 1st grade standard 1.OA.C.6 expects **addition and subtraction fluency within 10** and strategies within 20. The game currently does addition only, so subtraction is the top content gap. Idaho defines fact recall as typically answering in **3 to 5 seconds**.

| Step | Change |
|---|---|
| M0 | **Per-attempt log** in a separate key `piperDolphinLog` (fact id, time, session id, input mode, raw RT, adjusted RT, first try, hint used, practice or checkpoint). Cap at about 20,000 entries. JSON/CSV export button behind a parent gate |
| M1 | Start the response timer **after narration ends** (uses B4's speak Promise). Input-speed calibration ("tap the number you see" 10 times, use the median). Number pad (0 to 20, big buttons) for facts that are already accurate; keep multiple choice for new facts |
| M2 | Replace "2 in a row" with fact states: New, Learning, Accurate (more than 5 s), Strategy-fluent (3 to 5 s), Automatic (3 s or less, across 2 or more days), Maintained (still automatic 7 or more days later). An error or hint moves a fact back one state, not to the start |
| M3 | Leitner spaced review (boxes reviewed same session, next session, 2 days, 5 days, 12 then 25 days). Rounds aim for 70 to 85 percent known facts, pull review from **all** unlocked islands, and mix strategy types (6+6 next to 6+7 next to 13−6). Strategy hints ("Use the double!", "Make a ten!") replace one-by-one counting once a fact is accurate. Boost bar compares her to her own past times |
| M4 | Subtraction paired with addition (fact families, think-addition, missing addend). New fact sets assigned to island slots through B1 |
| M5 | Placement test, 1-minute daily warm-up, **Challenge Reef** checkpoints every 3 to 4 islands (no hints, pass at 90 percent accuracy and 80 percent within the time band; not passing just means "strong currents today," never lost progress), fluency check every 2 weeks |
| M6 | Parent/teacher report: minutes played, sessions, accuracy, median time, addition and subtraction **heat maps** (color by fact state), growth graph, "stuck" list with a home strategy tip, printable page and CSV, standards view by Idaho code |

The math track should never show a countdown clock to Piper. If speed features upset her, turn them off.

---

## Part E. Build order

Each phase ends with a stop for David's review.

| Phase | What | Effort | Why this order |
|---|---|---|---|
| **0** | Foundation: B1 theme/content split, B2 scenery layers, B3 save migration v3, B4 voice timing fix, B5 helpers. Plus **M0 attempt log** (tiny and needs to start collecting data early) | Large | Every later feature depends on it; fixes the bug David noticed |
| **1** | C4 option 1: mascot flips on correct answers | Small | Quick, visible win for Piper right after the plumbing work |
| **2** | C2 hat shop (dressing room), hats in `drawDolphin`, hat on map marker | Medium | Gives coins a purpose before more coin sources are added |
| **3** | C3 Violet swim buddy, plus "Meet Violet" moment and hats for Violet | Small to Medium | Uses hats from Phase 2 (violet sparkly hat) |
| **4** | Jump button, C5 high rings worth 5, C4 option 2 flips in the swim | Medium | Jump is needed by Sky Island |
| **5** | C6 rainbow bubble (random treat), including the shop-only Rainbow Hat | Medium | Builds on shop and swim |
| **6** | C1 Snowy Island and Sky Island (themes, layers, big-jump cutscene), with placeholder fact sets; make `finishGame` text use `ISLANDS.length` | Medium | Needs B1/B2 and the jump |
| **7** | C7 movie theater with Coin Counter and the original short movie | Large | The big saving goal; best once coins have several uses |
| **Math** | M1 to M6 can run in parallel phases whenever David chooses. Suggested: M1 and M2 after Phase 1, M3 after Phase 3, M4 after Phase 6, M5 and M6 last | Medium to Large each | Independent of play features thanks to Phase 0 |

---

## Part F. Test checklist (every phase)

- [ ] Load an **existing v2 save** (keep a copy of a real one in a test fixture): islands still show the same mastered state, coins and facts intact, backup key written once.
- [ ] Fresh start works with no save.
- [ ] iPad **portrait** and **landscape**, plus rotating mid-swim (the existing `resize` handler).
- [ ] Desktop with keyboard (typed answers, arrow keys; add a key for Jump, for example Space).
- [ ] Sound on, music off, all muted: nothing breaks and no speech fires when muted.
- [ ] Counting hint voice stays in sync with the glowing tokens on iPad Safari.
- [ ] All tap targets 64 px or larger.
- [ ] Opening `index.html` directly from the file system still works.
- [ ] `sw.js` cache name bumped; new files listed in `CORE` and `build.mjs`; `npm run build` succeeds; the home-screen app picks up the update.
- [ ] No penalties anywhere: coins, hats, and progress never decrease except by spending in the shop or theater.

---

## Part G. Save schema v3

```js
// localStorage "piperDolphinMath2" (keep the same key)
{
  v: 3,
  name, color, coins, correct, sound, music,   // unchanged
  facts: { "3+4": { streak, right, wrong } },   // unchanged (math track adds fields later)
  done: { "bubble-bay": true },                 // was keyed by index in v2
  hats: {
    owned: ["flower-crown"],
    wearing: { me: "flower-crown", violet: "violet-sparkle" }
  },
  friend: { met: false, name: "Violet", color: "#ff8fc8" },
  theater: { unlocked: false, visits: 0, moviesSeen: [] },
  stats: { swims: 0, rings: 0, flips: 0, rainbowBubbles: 0 }
}
// localStorage "piperDolphinMath2_backup_v2": raw v2 JSON, written once before migrating
// localStorage "piperDolphinLog": attempt log for the math track (separate so the profile stays small)
```

---

## Part H. Open questions (defaults in bold)

1. Rings: **5 coins** or a separate 5-point score?
2. Violet: **meet her with a short moment** or have her there from the start?
3. "Start over": **keep coins, hats, Violet, theater** or erase everything?
4. Theater unlock: about **150 coins**? Hat prices **15 to 60**?
5. Shop payment: **one Buy button** for hats, drag-to-pay only in the theater?
6. Piper's next island ideas after Sky Island go into new theme slots the same way.
