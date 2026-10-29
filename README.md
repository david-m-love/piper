# Piper's Dolphin Dash

A kindergarten addition game. Piper explores an island map; each of the 8 islands is a small family of addition facts (nothing adds up to more than 10): up to 4, up to 5, plus 1, plus 2, doubles, up to 7, up to 9, make 10.

- Questions repeat and cycle through the island's facts (missed facts come up more, and facts from earlier islands pop back in now and then). Each question shows the objects to count; a wrong answer starts a "count together" hint and rules out the wrong choice. No penalties.
- A fact is learned after 2 right answers in a row on the first try. Learn every fact on an island to master it and unlock the next one.
- After each round of 6 questions there is a 25-second free swim. The scenery gets richer on every island (more fish, treasure, kelp, a rainbow, glowing lights, a palace).
- Her dolphin coaches on the math screen: it chirps, cheers, counts with her and reads each question aloud (turn the speaker off in the top bar). Tap the dolphin to hear the question again.
- Progress, coins, name and dolphin color are saved in the browser (`localStorage`), so she picks up where she left off. "Start over" on the map resets it.

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

- **Phone / iPad (touch):** math questions show four big answer buttons; swim by swiping on the water or using the ▲ ▼ buttons.
- **Computer (mouse + keyboard):** she types the answer (auto-checked as soon as the digits are in, or press Enter) and swims with the ↑ ↓ arrow keys (W/S also work).
- Add `?input=keys` or `?input=choices` to the URL to force one mode.

Math progress is stored in the browser so the difficulty can adapt over time.

## Home-screen app

The game is an installable web app (`manifest.webmanifest`, `sw.js`, icons in `assets/`). On iPhone/iPad: open the site in Safari, tap Share, then **Add to Home Screen**. After the first visit it also works offline.
