# Piper's Dolphin Dash

A bright, touch-friendly first-grade math game. Answer six adaptive addition questions to charge a speed boost, then swim for 30 seconds to collect coins, jump through hoops, and avoid jellyfish. The first dolphin to reach 30 miles wins.

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
