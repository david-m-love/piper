# Dolphin Dash Build Plan: Addendum 1

Paste this after the main build plan (dolphin-dash-build-plan.md). Where this addendum and the plan disagree, **this addendum wins**.

## 1. Decisions confirmed by David and Piper

- **Violet:** Piper meets Violet later with a short "Meet Violet!" moment, not from the start. (Matches the plan's default.)
- **Start over:** resets math progress only. Coins, hats, the collection, Violet, and the theater are always kept. Update the confirm text to say so.

## 2. Two-level world map: Worlds and Areas

This replaces the flat list of islands with a structure that feels like real leveling up.

- **World** = a big new place (for example Ocean World, Snowy Island, Sky Island, or a future "Monkey Island"). Each World has its own theme: water and sky colors, scenery layers, obstacle style, music mood, and map art.
- **Area** = a smaller stop inside a World (a bay, a cove, a grotto). Each Area holds one fact set and its own little challenge. Piper swims from Area to Area along a path on the World map.
- **Arriving in a new World must feel big:** a short travel cutscene (the dolphin swims off the edge of the old map, or leaps for Sky Island), a new map screen with a new color palette, a fanfare, and a banner such as "Welcome to Snowy Island!"
- **Mapping today's game:** the current 8 islands become 8 Areas inside the first World ("Sunny Sea"). Snowy Island and Sky Island become World 2 and World 3, each with 3 to 4 Areas using placeholder fact sets.
- **Challenge Reef fit (math track):** each World ends with its Challenge Reef checkpoint before the next World opens.
- **Data shape (extends Part B1):** `WORLDS: [{ id, name, theme, areas: [areaId, ...] }]` and `AREAS: [{ id, worldId, name, emoji, factSet, sub }]`. Progress keyed by area id (`done: { "bubble-bay": true }`), plus `worldsUnlocked: ["sunny-sea"]`.
- **Build timing:** put the data shape into Phase 0 (it is part of the theme/content split). Build the World map screen and travel cutscene in Phase 6, with Snowy and Sky.

## 3. Drag-to-pay everywhere (math while shopping)

This replaces the plan's "one Buy button for hats." The Coin Counter is now used in the hat shop **and** the theater.

- Her **coin purse** shows coins she can drag (or tap) over the counter to the tray. Each coin is counted aloud as it lands ("1, 2, 3...").
- **Gentle prompts, no penalties:**
  - Stops short: after a short pause the dolphin says "Just one more!" (or "Two more!"), and the remaining spots on the tray glow.
  - Too many: the cashier hands the extra back ("Here's one back!"). No buzzer.
  - Exact: "Paid! Enjoy your new hat!" with a sparkle.
- **Gold 10-coins for bigger prices (place value):**
  - The purse shows **gold coins worth 10** and **regular coins worth 1**. Her total is displayed as tens and ones (47 coins = 4 gold + 7 regular). This is display only; the save still stores a single coin number.
  - Prices up to 10 are paid with regular coins only, so early shopping is plain counting.
  - Bigger prices are paid with gold and regular coins, for example 25 = 2 gold + 5 regular. The price tag shows the same picture (two gold coins and five regular) until she has done it a few times, then just the number.
  - **Making change:** if she has a gold coin but not enough regular coins, she can tap "Trade" to swap 1 gold for 10 regular coins (animated as the gold coin bursting into ten). This teaches that 10 ones make a ten (Idaho 1.NBT.B.2).
- **Logging:** record shop and theater payments in the attempt log as type `"money"` (price, coins dragged, prompts needed). Keep them out of fact-fluency scoring, but show them in the parent report as "Counting coins."
- **Big targets:** coins at least 72 px; gold coins slightly larger with a "10" stamp.

## 4. Surprise items and a collection

- **New in the shop:** every so often (for example after every 3 swims, or on a new day), 1 or 2 new items appear with a "NEW!" ribbon and a little jingle. Some relate to where she is (a snow beanie when Snowy Island opens, a cloud hat for Sky Island). Some are random surprises.
- **Item types beyond hats:** shells for her map, sea pets that follow in the swim (a tiny fish or a baby penguin), trail colors, and theater snacks.
- **Collection screen ("My Treasures"):** a shelf of everything she owns, with empty silhouettes for items not found yet so she can see what is still out there. Tap an item to wear it, use it, or hear its name.
- **Make your own item (later, optional):** a simple maker where she picks a base (hat, bow, shell), a color, and a sticker or pattern, and names it. It is saved to her collection. It can cost a few coins so it still uses drag-to-pay. All drawn with canvas; no image upload.
- **Save shape (extends Part G):** `collection: { owned: [itemId, ...], seenNew: [itemId, ...], custom: [{ id, base, color, pattern, name }] }`, plus `shop: { lastRefresh, featured: [itemId, ...] }`. Existing `hats.owned` folds into `collection.owned` during the v3 migration.

## 5. Economy: coins, stars, and unlock numbers

David asked Claude to set the numbers. Goal: steady progress, nothing all at once, and math always comes before play. Put every number below in one `ECONOMY` config so it can be tuned after watching real play.

**Two kinds of rewards (this answers "rings: coins or points?"):**

- **Coins** are the only money. Earned in the swim. Spent in the shop and theater. Rings are worth **5 coins**, hoops 2, plain coins 1.
- **Stars** are never spent. Earned **only from math**: 1 star per Area mastered, 3 stars per Challenge Reef passed. Stars unlock the big things, so swimming alone can never get her everything.
- Coins show as gold 10-coins and regular coins (place value, section 3).

**Keep learning ahead of play:**

- A swim only happens after a math round, as today (6 questions, then a 25-second swim). Never add a way to swim or earn coins without math.
- Rings are rare: about 1 in 12 spawns, and at most 2 per swim. The rainbow bubble shows up in about half of swims, once at most.
- After about 12 minutes of play in a day, the dolphin says it is getting sleepy and suggests a break. Her next math round of the day still earns its swim, but swim coins are halved after 20 minutes. No hard lockout, no lost coins.
- Aim for roughly 60% of a session in math and 40% in swimming and shopping.

**Unlock numbers (starting values):**

| Thing | Needs | About how long |
| --- | --- | --- |
| Hat shop opens | Finish the first Area | First day |
| Common hat | 20 coins | 1 to 2 swims |
| Fancy hat (flower crown, violet sparkle hat) | 45 coins | 2 to 3 swims |
| Rainbow Hat | Rainbow bubble only (rare) | Surprise |
| Meet Violet | 3 stars | Several days |
| Theater unlock | 6 stars and 100 coins | 1 to 2 weeks |
| Theater visit | Ticket 3, popcorn 1, candy 1, soda and blanket free | Each visit |
| New World (Snowy, Sky) | All Areas in the current World plus its Challenge Reef | A few weeks each |
| Surprise "NEW!" shop items | Every 3 swims, at most 2 per day | Ongoing |
| Make-your-own item | 10 stars, then 15 coins per item | Later |

Coins per swim are estimated at 15 to 25; measure real numbers in the first week and adjust prices so a fancy hat takes about 2 to 3 swims.

Save shape: add `stars: 0` and `starLog: []` to the v3 profile. Add `playToday: { date, minutes }` for the sleepy-dolphin break.

## 5b. Visual design: keep it beautiful

The current look is the standard. Do not restyle what exists; every new screen and object must look like it belongs to the same game.

**Style rules for all new art:**

- **Match the existing style:** soft gradients, rounded shapes, gentle drop shadows, glossy highlights, and the bright tropical palette already in `WATER`, `REEF` and `COLORS`. Reuse `adjustColor` for light and dark shades.
- **Drawn in code:** all new art is canvas paths and CSS, no image files, so it stays crisp on iPad Retina and works offline. Build small reusable draw helpers (`drawHat`, `drawPenguin`, `drawCloud`, `drawCoin`, `drawGoldCoin`) in the same style as `drawDolphin`.
- **Everything feels alive:** idle motion on every character (bob, blink, wiggle), sparkles on rewards, squash-and-stretch on taps, easing on all movement. Nothing pops in or out without a short animation (about 0.2 to 0.4 s).
- **Each World has its own palette,** while keeping the shared UI (buttons, pills, fonts, rounded cards):
  - Sunny Sea: today's turquoise, coral and gold.
  - Snowy Island: icy blues, white, soft lavender shadows, pink-cheeked penguins.
  - Sky Island: pastel pink, peach and baby blue, white puffy clouds, a soft rainbow.
  - Theater: deep navy and plum, warm glowing screen, twinkly aisle lights, a cozy red blanket.
- **Big, friendly UI:** chunky rounded buttons with a pressed state, clear icons plus words, high contrast text, and the 64 px minimum touch size.
- **Celebrate, never scold:** wins get confetti, stars and a happy sound. Mistakes get a soft wobble and encouragement only.
- **Respect motion settings:** if `prefers-reduced-motion` is on, keep the art but tone down shaking, flashing and big camera moves.

**Process for Claude Code:**

1. Before building a new screen or character, show David a quick static preview (one frame drawn on a test canvas, or a screenshot) and wait for a thumbs up.
2. Test every new screen on iPad portrait and landscape and a phone.
3. Keep a small `style` section in `styles.css` with shared colors and sizes so new screens stay consistent.

## 6. Updated build order

| Phase | Change from the plan |
| --- | --- |
| 0 | Also add the World/Area data shape and keep "Start over" from clearing coins and collection |
| 2 | Hat shop uses the Coin Counter with drag-to-pay, gold 10-coins, and Trade. Add the "My Treasures" collection screen |
| 5 | Add surprise "NEW!" shop items alongside the rainbow bubble |
| 6 | World map screen, travel cutscene, and Snowy and Sky as full Worlds with several Areas each |
| 7 | Theater reuses the same Coin Counter |
| 8 (new, optional) | Make-your-own item maker |
