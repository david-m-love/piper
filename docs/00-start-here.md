# Piper's Dolphin Dash: START HERE

Planning docs for the next round of work on Piper's Dolphin Dash (repo `david-m-love/piper`). Read them in this order. Where two docs disagree, the **later doc wins**.

| Order | File | What it covers |
|---|---|---|
| 1 | `01-build-plan.md` | Main plan: ground rules, what the current code does, Phase 0 foundation work, 2 to 3 options per Piper idea (new islands, hat shop, Violet, flips, rings, rainbow bubble, movie theater), build order, test checklist, save schema |
| 2 | `02-addendum-1.md` | Decisions from David and Piper: Worlds and Areas map, drag-to-pay with gold 10-coins, surprise items and "My Treasures" collection, coins vs stars and all unlock prices, the 12-minute sleepy-dolphin break, visual design rules, updated build order |
| 3 | `03-addendum-2-math-track.md` | Full math design: Idaho targets, the fact sequence for every Area (subtraction included), attempt log, speed measurement, fact states, spaced review and round mix, Challenge Reefs and placement test, parent and teacher report, math build order |

## How the work should run

1. Copy these docs into the repo under `docs/` and commit them first.
2. Read all three docs and the current code (`game.js`, `index.html`, `styles.css`, `sw.js`, `build.mjs`) before changing anything.
3. Build **one phase at a time**, starting with Phase 0 (which includes the math attempt log, M0). Where a feature lists options, build the one marked Recommended.
4. At the end of each phase: run the test checklist (build plan Part F), summarize what changed, and **stop**. Wait for David to say "next phase."
5. Before building any new screen or character, show David a quick preview and wait for a thumbs up (Addendum 1, section 5b).

## The non-negotiables

- Gentle, no penalties, no visible countdowns. Nothing ever takes away coins, hats, or progress.
- Never break Piper's existing save (localStorage key `piperDolphinMath2`). Back it up before migrating.
- Works on iPad portrait and landscape; big touch targets; works offline and when `index.html` is opened directly.
- All new art drawn in code in the current style. No image or audio files. No copyrighted characters.
- Math comes before play: no way to swim or earn coins without a math round.
- Bump the service worker cache name on every release.
