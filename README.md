# Piper's Dolphin Dash

A kindergarten addition game. Piper explores an island map; each of the 8 islands is a small family of addition facts (nothing adds up to more than 10): up to 4, up to 5, plus 1, plus 2, doubles, up to 7, up to 9, make 10.

- Questions repeat and cycle through the island's facts (missed facts come up more, and facts from earlier islands pop back in now and then). Each question shows the objects to count; a wrong answer starts a "count together" hint and rules out the wrong choice. No penalties.
- A fact is learned after 2 right answers in a row on the first try. Learn every fact on an island to master it and unlock the next one.
- After each round of 6 questions there is a 25-second free swim. The scenery gets richer on every island (more fish, treasure, kelp, a rainbow, glowing lights, a palace).
- Sound is all generated in code (no audio files): a calm ocean background with bubbles, bubble pops on taps, splashes when she changes lane, coin and hoop pings, a springy jellyfish boing, a layered dolphin whistle, and a fanfare for mastering an island. 🎵 turns just the music off; 🔊 mutes everything.
- Her dolphin coaches on the math screen: it does a flip for every right answer (front and back flips take turns, and a double flip for 3 in a row), chirps, cheers, counts with her and reads each question aloud (turn the speaker off in the top bar). Tap the dolphin to hear the question again.
- **Hat shop:** once she has mastered her first island, the map has a Hat Shop (a dressing room with 12 hats drawn in code; tap a hat to try it on) and My Treasures (everything she owns, with grey shapes for what is still out there). She pays at a counter by dragging or tapping coins onto a tray: gold coins are worth 10, and Trade turns one gold coin into ten little ones. The dolphin counts each coin aloud and gently says how many more are needed. Hats show on the coach dolphin, in the swim and on the map.
- **Stars and Violet:** every island she masters earns a star (stars are never spent or lost). At 3 stars, after her next swim, a pink dolphin named Violet leaps out of the sea to meet her. From then on Violet swims beside her, finds up to 3 coins per swim, wears her own sparkle hat, and can be dressed in the hat shop with the Me / Violet switch.
- Progress, coins, name and dolphin color are saved in the browser (`localStorage`), so she picks up where she left off. "Start over" on the map resets the math progress only; coins, hats and treasures are always kept.

Open `index.html` directly, or use the included preview server. No packages need to be installed.

For a local server, run:

```sh
npm start
```

Then visit `http://localhost:4173` (or the port supplied in `PORT`).

Create the production bundle with:

```sh
npm run build
```

Vercel uses `vercel.json` to publish the generated `dist` directory.

## Controls

- **Phone / iPad (touch):** math questions show four big answer buttons. Held upright, the race is vertical (the dolphin swims up the screen): tap the left or right half of the screen, swipe sideways, or use the ◀ ▶ buttons. Held sideways, touch the water where she should swim, or use the ▲ ▼ buttons.
- **Computer (mouse + keyboard):** she types the answer (auto-checked as soon as the digits are in, or press Enter) and swims with the arrow keys (↑ ↓, or ← →; WASD also work).
- Add `?input=keys` or `?input=choices` to the URL to force one mode.

Math progress is stored in the browser so the difficulty can adapt over time.

## Home-screen app

The game is an installable web app (`manifest.webmanifest`, `sw.js`, icons in `assets/`). On iPhone/iPad: open the site in Safari, tap Share, then **Add to Home Screen**. After the first visit it also works offline.

## Planning docs and save data

The plan for the next rounds of work is in `docs/` (start with `docs/00-start-here.md`).

Saved in `localStorage`: `piperDolphinMath2` (the profile, version 3; progress is keyed by area id), `piperDolphinMath2_backup_v2` (a copy of the old v2 save, written once before it was migrated) and `piperDolphinLog` (an attempt log, one entry per answer). From a browser console, `DD.log.download("csv")` or `DD.log.download("json")` saves the log.
