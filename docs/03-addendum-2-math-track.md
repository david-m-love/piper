# Dolphin Dash Build Plan: Addendum 2 (Math Track Spec)

Paste this after the main build plan (`dolphin-dash-build-plan.md`) and Addendum 1. It replaces the short summary in the plan's **Part D** with the full math design. Where this addendum and the earlier docs disagree on math, **this addendum wins**. It uses the Worlds and Areas structure from Addendum 1.

Sources behind these choices: Idaho Content Standards, Mathematics (Jan 2022); IES practice guides (2009, 2021); Fuchs et al. 2013 (speeded practice, randomized trial with first graders); Rohrer et al. 2020 (interleaving); Baroody 2006 (three phases of fact mastery); XtraMath, Reflex, and MathFactLab designs.

## 1. Targets (what Piper should reach)

| Grade | Idaho standard | Game target |
|---|---|---|
| K | K.OA.A.5 add and subtract within 5; K.OA.A.3 to 4 number pairs and partners of 10 | Facts within 5, both operations, including 0 |
| 1 (Piper now) | 1.OA.C.6 fluency adding and subtracting **within 10**, strategies within 20; 1.OA.B.4 subtraction as missing addend; 1.OA.D.8 unknown in any position | Within 10 at 5 seconds or less; strategies to 20 |
| 2 | 2.OA.B.2 recall all add and subtract facts within 20 automatically | Within 20 at 3 seconds or less |

Idaho says recall "typically" means answering in 3 to 5 seconds, and that strategy use counts as fluent in Grade 1. **Subtraction is the biggest gap today**: the game is addition only.

## 2. Content map: Worlds, Areas, and fact sets

Themes (names, art) belong to Piper. Fact sets belong to David. Areas keep their current names; only the fact set inside changes. Strategy sequence follows Baroody: counting, then reasoning strategies, then recall. Each subtraction set comes right after its addition partner.

**World 1: Sunny Sea (Kindergarten review to Grade 1 within 10)**

| Area | Fact set id | Content | Picture model |
|---|---|---|---|
| 1 Bubble Bay | `within5` | All + and − within 5, including 0 | 5-frame |
| 2 Coral Cove | `plusMinus12` | n+1, n+2, n−1, n−2 within 10 | Number line, hop forward or back |
| 3 Shell Shore | `partners10` | a+b=10, 10−a, ?+a=10 | Ten-frame |
| 4 Kelp Forest | `doubles10` | Doubles to 5+5 and halves (8−4) | Mirror pictures |
| 🐚 Challenge Reef 1A | | Mixed check of Areas 1 to 4 | No hints |
| 5 Pirate Wreck | `nearDoubles10` | Near doubles to 10 (3+4 = 3+3+1) | Double plus one |
| 6 Rainbow Reef | `families10` | All sums within 10 plus subtraction by think-addition (8−5: "5 + ? = 8") | Fact triangle |
| 7 Glow Grotto | `missing10` | Unknown in any position: 3+?=7, ?−2=5 | Bar model |
| 8 Dolphin Palace | `mixed10` | Mixed within 10, both operations | Numerals only |
| 🐚 Challenge Reef 1B | | World 1 final: fluency within 10 (1.OA.C.6) | No hints |

**World 2: Snowy Island (Grade 1 strategies within 20).** Area names below are placeholders; Piper can rename them.

| Area | Fact set id | Content |
|---|---|---|
| Penguin Point | `tenPlus` | 10+n and teen numbers as 10 and some ones |
| Ice Bridge | `makeTen` | 9+n, 8+n, 7+n by making ten (9+6 = 10+5) |
| Glacier Twins | `doubles20` | Doubles and near doubles to 20 |
| Snowball Slide | `subtract20` | Subtraction within 20 by going back through ten (14−6 = 14−4−2) or think-addition |
| Igloo Tens | `tens` | Ten more, ten less; adding and subtracting multiples of 10 |
| 🐚 Challenge Reef 2 | | Strategies within 20 |

**World 3: Sky Island (Grade 2 look-ahead)**

| Area | Fact set id | Content |
|---|---|---|
| Cloud Hop | `auto20` | All facts within 20, mixed, 3 s target |
| Bunny Burrows | `twoDigit` | Two-digit plus or minus one-digit within 100 |
| Rainbow Bridge | `patterns` | Skip count by 2, 5, 10; odd and even; arrays up to 5×5 as repeated addition |
| 🐚 Challenge Reef 3 | | Automatic within 20 |

**Where Piper starts:** the placement test (section 7) decides. Expect a mid first grader to test out of Areas 1 to 3 quickly.

**Existing saves:** World 1 Area content changes, so old "mastered" flags no longer mean the same thing. When the new fact sets ship (Phase M4): keep all old addition fact records as seed data, clear the Area `done` flags, and send Piper to the placement test, which re-marks Areas she already knows. Coins, hats, collection, Violet, and stars are never touched.

**Fact ids:** `"3+4"`, `"8-5"`, `"3+?=7"`, `"?-2=5"`. Commutative pairs (3+4, 4+3) are separate facts but share a family id for reports.

## 3. Attempt log (Phase M0)

Store in localStorage key `piperDolphinLog` (separate from the profile). One entry per answer:

`{ t, session, factId, family, op, mode: "choice"|"pad"|"typed", rtRaw, rtAdj, correct, firstTry, hint, context: "practice"|"warmup"|"reef"|"placement"|"check"|"money" }`

- Cap at about 20,000 entries; drop the oldest.
- Session = a continuous play period; a new session after 15 minutes idle.
- Export to JSON and CSV from the parent area (section 9).

## 4. Measuring speed honestly (Phase M1)

- **Start the timer when narration finishes** (await the `speak` Promise from plan Part B4). With sound off, start when the question appears.
- Tapping the dolphin to hear the question again pauses the timer until the narration ends.
- **Input calibration:** on first launch and every 30 days, a fun "tap the number you see" warm-up, 10 times; store the median tap time. `rtAdj = rtRaw − calibratedTapTime` (minimum 0.3 s).
- **Number pad:** big buttons 0 to 20 (0 to 10 for World 1). Use multiple choice only for New and Learning facts. Multiple choice overstates fluency because she can guess or recognize the answer, and removing wrong choices makes guessing easier.
- **Never show a countdown or a clock** on math screens.

Speed bands (correct answers):

| Adjusted time | Meaning |
|---|---|
| 3 s or less | Likely recall |
| 3 to 5 s | Fast strategy; meets Grade 1 |
| 5 to 10 s | Counting or slow strategy |
| Over 10 s, or hint used | Not known yet |

Very fast answers on tiny sums can be quick counting, so speed alone is never the verdict. After about 1 in 8 fast correct answers, optionally ask "How did you know?" with three big buttons: 🧠 I just knew, 🧮 I used a trick, ✋ I counted. Log the answer.

Start Piper with a gentle 6 s "fast" bar for a fact until it is accurate, then tighten to 5 s (Grade 1 mode) and later 3 s (Grade 2 mode). A parent setting chooses the mode.

## 5. Fact states (Phase M2; replaces "2 in a row")

| State | Rule to enter | Report color |
|---|---|---|
| New | Never seen | Gray |
| Learning | Seen; errors or hints | Red |
| Accurate | 3 correct with no hint, across 2 or more sessions; median time over 5 s | Orange |
| Strategy-fluent | Median adjusted time 3 to 5 s over the last 4 attempts, all correct | Yellow |
| Automatic | 3 of the last 4 correct at 3 s or less, across 2 or more days | Green |
| Maintained | Still Automatic on a review 7 or more days later | Dark green |

- An error or a hint moves a fact **back one state**, never to the start.
- Hinted answers never count toward Strategy-fluent or Automatic.
- **Area mastered** (earns 1 star, per Addendum 1) = every fact in the Area at Accurate or better, and at least 70% at Strategy-fluent or better.
- Map dots per fact use the state colors so Piper sees progress grow.

## 6. Choosing questions (Phase M3)

**Leitner boxes** per fact:

| Box | Review again |
|---|---|
| 1 | Same session |
| 2 | Next session |
| 3 | 2 days |
| 4 | 5 days |
| 5 | 12 days, then 25 days |

Correct within the current speed bar: up one box. Correct but slow: stay. Error: back to Box 1 (or Box 2 if it was in Box 4 or 5).

**Each 6-question round:**
- 1 target fact (New or Learning), asked **twice**, spaced apart in the round.
- 1 to 2 recently learned facts (Accurate or Strategy-fluent).
- 2 to 3 review facts that are due, pulled from **every unlocked Area**, not just the current one.
- Aim for 70 to 85% of questions she will probably get right. If her rolling accuracy drops below 70%, swap the target fact for a known one. Above 90%, add a second target fact.

**Mixing across Areas:**
- Early in an Area, about half the questions come from that Area. Once most of its facts are Accurate, that drops to about a third, and the rest are review from earlier Areas.
- Include "contrast" neighbors so she has to choose a strategy: 6+6, then 6+7, then 13−6.
- Never the same fact twice in a row.
- Mixed practice feels harder and accuracy may dip a little. That is expected and fine.

**Hints by phase:**
- New and Learning facts: keep "count together" (with the fixed voice timing).
- Accurate facts and beyond: a strategy hint instead. Examples: "Use the double! 6 + 6 and one more." "Make a ten: 9 + 1 + 4." "Think addition: 5 plus what makes 8?"
- Ruling out a wrong choice is fine in practice, never in checkpoints.

**Speed boost bar:** compare each answer to **her own** median time for that fact ("beat your own time"). Only facts at Accurate or better can earn a speed boost. Slower answers still earn a normal swim.

**Session size:** about 8 to 12 minutes of math plus swims. This matches the 12-minute sleepy-dolphin break in Addendum 1.

## 7. Checkpoints, kept separate from practice (Phase M5)

1. **Placement test** (first launch after M4 ships, or from the parent area). About 3 minutes, can split over 2 days. Starts at Area 2 content and moves forward by Area; a section stops after 3 errors. Number pad, no hints. Sets her starting Area and pre-marks facts as Accurate or Automatic.
2. **Daily warm-up** (about 1 minute, 10 facts due for review), once per day before the first round. Scored silently. Framed as "Stretch your fins!"
3. **Challenge Reef** (at the points in the content map). 20 to 30 mixed questions from everything so far. No hints, no removed choices, number pad, question read once.
   - **Pass:** 90% or more correct AND 80% or more within the current speed bar (5 s Grade 1 mode, 3 s Grade 2 mode). Earns 3 stars. A World's final Reef opens the next World.
   - **Not yet:** "The currents are strong today! Let's practice and try again." Show a happy recap of facts she got right. Missed facts go to Leitner Box 1. She can retry after 2 more practice sessions. Nothing is lost.
4. **Fluency Check every 2 weeks.** 1 minute, same fixed pool of mixed facts each time so scores compare over weeks. Record facts correct per minute and median adjusted time.
5. **Untimed first:** a new kind of question (for example, missing addend) appears untimed for accuracy before it can show up in any timed check.

## 8. Money math (from Addendum 1)

Drag-to-pay in the shop and theater is logged with `context: "money"` (price, coins dragged, prompts needed, gold-coin trades). It is not scored as fact fluency. The report shows it as "Counting coins."

## 9. Parent and teacher report (Phase M6)

A **parent area** behind a simple grown-up gate (for example, "press and hold for 3 seconds" plus a small question an adult can answer, such as "type 7 × 8"). Inside:

1. **Summary strip:** minutes played this week and month, sessions, days with a completed daily goal, facts answered, overall accuracy, median adjusted time.
2. **Fact heat maps:** an 11 × 11 addition grid (0 to 10 plus 0 to 10) and a matching subtraction grid, each cell colored by fact state, with median time on tap. A second view goes to 20.
3. **Growth graph:** count of Automatic and Strategy-fluent facts over time, with Challenge Reef results marked.
4. **Fluency Check trend:** facts correct per minute and median time per check.
5. **Recall vs strategy:** share of correct answers at 3 s or less, 3 to 5 s, over 5 s, plus "How did you know?" answers by strategy family (doubles, make ten, +1/+2, think-addition).
6. **Standards view:** K.OA.A.5, 1.OA.C.6, 1.OA.B.4, 1.OA.D.8, 2.OA.B.2 each marked Not started, Developing, Meets, or Automatic.
7. **Stuck list:** the 5 facts with the most errors or slowest times, each with a home tip ("8 + 6: make a ten, 8 + 2 + 4").
8. **Counting coins:** shop and theater payment accuracy.
9. **Share with teacher:** a printable one-page summary (browser print, styled with a print CSS) and a CSV with one row per fact (fact, attempts, accuracy, median time, state, last seen). Plus a settings section: speed mode (Grade 1 at 5 s, Grade 2 at 3 s), speed features on or off, rerun placement, export log.

## 10. Math build order (fits around the play phases)

| Step | What | When |
|---|---|---|
| M0 | Attempt log | Phase 0 |
| M1 | Timer after narration, tap calibration, number pad | After Phase 1 |
| M2 | Fact states and new map dots | With M1 |
| M3 | Leitner scheduler, round mix, strategy hints, personal-best boost | After Phase 3 |
| M4 | New World 1 fact sets with subtraction, save handling in section 2, placement test | After Phase 6 (Worlds exist) |
| M5 | Daily warm-up, Challenge Reefs, Fluency Check | After M4 |
| M6 | Parent area and report | Last |

Each step stops for David's review, same as the play phases.

## 11. Guardrails

- No countdowns, no lost progress, no lost coins, no red X sounds.
- If speed features ever upset Piper, the parent setting turns them off; accuracy and strategy work still count.
- Speed bands are estimates, not a verdict on her. The report says so in small print.
