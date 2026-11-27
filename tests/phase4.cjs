// Phase 4 checks: Jump button, golden rings (5 coins), flips in the swim, Violet joining in.   node tests/phase4.cjs
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const serve = require("./serve.cjs");

const ROOT = path.resolve(__dirname, "..");
const fx = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "v2-save.json"), "utf8"));
let failures = 0;
const check = (ok, label, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : `  -> ${detail}`}`); if (!ok) failures++; };

// Seeded randomness and a clock that only moves when told to, so swims can be compared exactly.
const frozen = `
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { speak(u) { setTimeout(() => u.onend && u.onend(), 20); }, cancel() {} } });
  (() => { let seed = 9001, clock = 1000, queue = [];
    Math.random = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    performance.now = () => clock;
    window.requestAnimationFrame = (cb) => { queue.push(cb); return queue.length; };
    window.__frames = (n, ms = 16) => { for (let i = 0; i < n; i++) { clock += ms; const run = queue; queue = []; run.forEach((cb) => cb(clock)); } }; })();`;

let base;
const meet = { friend: { met: true, name: "Violet", color: "#ff8fc8" }, hats: { owned: [], wearing: { me: null, violet: "violet-sparkle" } } };
const doneUpTo = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [String(i), true]));
// Sound is off in these runs: the sound effects use Math.random, which would change a seeded swim whenever she jumps.
const save = (extra = {}) => JSON.stringify({ ...fx, v: 2, facts: {}, done: doneUpTo(4), coins: 100, sound: false, ...extra });

async function open(browser, { extra = {}, viewport = { width: 1180, height: 820 }, reduced = false } = {}) {
  const context = await browser.newContext({ viewport, reducedMotion: reduced ? "reduce" : "no-preference" });
  await context.addInitScript(frozen);
  const saved = save(extra);
  await context.addInitScript((v) => { if (!localStorage.getItem("__s")) { localStorage.setItem("piperDolphinMath2", v); localStorage.setItem("__s", "1"); } }, saved);
  const page = await context.newPage();
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") page.errors.push(m.text()); });
  await page.goto(`${base}/index.html?input=choices`);
  return page;
}
const profile = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("piperDolphinMath2")));
const toSwim = async (page, island = 4) => {
  await page.locator(".island").nth(island).click();
  for (let q = 0; q < 6; q++) {
    await page.waitForSelector(".answer-button:not([disabled])");
    const [a, b] = (await page.textContent("#equation")).match(/\d+/g).map(Number);
    await page.locator(".answer-button", { hasText: new RegExp(`^${a + b}$`) }).click();
    await page.waitForTimeout(q === 5 ? 1900 : 1800);
  }
  await page.waitForSelector("#raceScreen:not(.hidden)");
  page.flips0 = (await profile(page)).stats.flips; // flips so far (the math screen counts too)
};
const tap = (page) => page.evaluate(() => document.getElementById("jumpButton").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true })));
const frames = (page, n, ms) => page.evaluate(([n, ms]) => window.__frames(n, ms), [n, ms]);
const canvas = (page) => page.evaluate(() => document.getElementById("raceCanvas").toDataURL());
// stats.flips also counts the math-screen flips, so look at how many were added during the swim itself.
const finish = async (page) => {
  await frames(page, 1700);
  await page.waitForFunction(() => JSON.parse(localStorage.getItem("piperDolphinMath2")).stats.swims >= 1, null, { timeout: 8000 });
  const p = await profile(page);
  p.swimFlips = p.stats.flips - page.flips0;
  return p;
};

(async () => {
  const server = await serve(ROOT);
  base = server.base;
  const browser = await chromium.launch();

  /* 1. The controls */
  for (const [label, viewport] of [["landscape", { width: 1180, height: 820 }], ["iPad portrait", { width: 820, height: 1180 }], ["phone", { width: 390, height: 844 }]]) {
    const page = await open(browser, { viewport });
    await toSwim(page);
    const box = (id) => page.locator(id).boundingBox();
    const [up, jump, down] = [await box("#moveUp"), await box("#jumpButton"), await box("#moveDown")];
    check(jump.height >= 88 && jump.width >= 88, `${label}: the Jump button is 88 px or larger`, `${Math.round(jump.width)}x${Math.round(jump.height)}`);
    check(up.height >= 64 && down.height >= 64 && up.width >= 64 && down.width >= 64, `${label}: the steering buttons are 64 px or larger`);
    check(up.x < jump.x && jump.x < down.x, `${label}: the order is steer, Jump, steer`);
    const arrows = await page.evaluate(() => [moveUp.textContent, moveDown.textContent]);
    check(label === "landscape" ? arrows.join("") === "▲▼" : arrows.join("") === "◀▶", `${label}: the steering arrows match the orientation`, arrows.join(""));
    const off = await page.evaluate(() => [...document.querySelectorAll(".race-controls > *")].filter((e) => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 1 || r.left < -1; }).length);
    check(off === 0, `${label}: the controls fit the screen`);
    check(page.errors.length === 0, `${label}: no console errors`, page.errors.join("|"));
    await page.context().close();
  }

  /* 2. A jump: button and Space look the same, and Space does not scroll the page */
  {
    const shot = async (how) => {
      const page = await open(browser);
      await toSwim(page);
      await frames(page, 20);
      if (how === "button") await tap(page);
      if (how === "space") { await page.keyboard.press("Space"); }
      await frames(page, 30);
      const picture = await canvas(page), scroll = await page.evaluate(() => window.scrollY);
      await page.context().close();
      return { picture, scroll };
    };
    const [none, button, space] = [await shot("none"), await shot("button"), await shot("space")];
    check(none.picture !== button.picture, "tapping Jump changes the picture (she hops up toward the camera)");
    check(button.picture === space.picture, "the Space key jumps exactly like the button");
    check(space.scroll === 0, "Space does not scroll the page");
  }

  /* 3. Flips in the air: one per jump, a late tap is a quick spin, and no coins */
  {
    const run = async (taps) => {
      const page = await open(browser);
      await toSwim(page);
      await frames(page, 10);
      for (const [wait, kind] of taps) { await frames(page, wait); await tap(page); void kind; }
      const p = await finish(page);
      await page.context().close();
      return p;
    };
    const base0 = await run([]);
    // early in the swim, well before the first ring can arrive
    const flips = await run([[0], [20], [10], [50], [0], [20]]);
    check(base0.swimFlips === 0, "a swim with no jumping has no flips");
    check(flips.swimFlips === 2, "jump + tap = a flip; a third tap in the same jump does nothing; the next jump can flip again", String(flips.swimFlips));
    check(flips.coins === base0.coins && flips.stats.rings === 0, "jumping and flipping give no coins by themselves", `${flips.coins} vs ${base0.coins}`);
  }

  /* 4. Golden rings: 5 coins mid-jump, rare, at most 2, nothing happens if she swims under */
  {
    const run = async (lane, jumping, extra = {}) => {
      const page = await open(browser, { extra });
      await toSwim(page);
      if (lane === 0) await page.keyboard.press("ArrowUp");
      if (lane === 2) await page.keyboard.press("ArrowDown");
      await frames(page, 20);
      if (jumping) { for (let i = 0; i < 26; i++) { await tap(page); await frames(page, 63); } } // a new jump the moment she lands
      const p = await finish(page);
      await page.context().close();
      return p;
    };
    const results = await Promise.all([0, 1, 2].flatMap((lane) => [run(lane, false), run(lane, true)]));
    let rings = 0, allExact = true, detail = [];
    [0, 1, 2].forEach((lane) => {
      const [still, hopping] = [results[lane * 2], results[lane * 2 + 1]];
      rings += hopping.stats.rings;
      const exact = hopping.coins - still.coins === 5 * hopping.stats.rings && still.stats.rings === 0;
      if (!exact) allExact = false;
      detail.push(`lane${lane}: rings=${hopping.stats.rings} extra=${hopping.coins - still.coins}`);
    });
    check(allExact, "every golden ring is worth exactly 5 coins, and swimming under one (no jump) is worth nothing", detail.join(" "));
    check(rings === 2, "there are 2 rings in a swim (rare, and never more than 2)", `rings across the three lanes = ${rings}`);
    const flipsOk = results.filter((_, i) => i % 2 === 1).every((p) => p.swimFlips >= p.stats.rings);
    check(flipsOk, "going through a ring is an automatic flip", results.filter((_, i) => i % 2 === 1).map((p) => `rings=${p.stats.rings} flips=${p.swimFlips}`).join("; "));
  }

  /* 5. Violet flips when Piper flips (look at the part of the picture only Violet reaches) */
  {
    const region = async (flip) => {
      const page = await open(browser, { extra: meet });
      await toSwim(page);
      await page.keyboard.press("ArrowDown"); // Piper in the bottom lane, Violet above her
      await frames(page, 90);
      await tap(page);
      await frames(page, 6);
      if (flip) await tap(page);
      await frames(page, 22); // mid-flip
      const pixels = await page.evaluate(() => { const c = document.getElementById("raceCanvas"); return Array.from(c.getContext("2d").getImageData(40, 250, 220, 95).data); });
      await page.context().close();
      return pixels;
    };
    const [flat, flipped] = [await region(false), await region(true)];
    let different = 0;
    for (let i = 0; i < flat.length; i += 4) if (Math.abs(flat[i] - flipped[i]) + Math.abs(flat[i + 1] - flipped[i + 1]) + Math.abs(flat[i + 2] - flipped[i + 2]) > 60) different++;
    check(different > 400, "Violet turns over too when Piper flips", `${different} pixels differ`);
  }

  /* 6. Reduced motion, rotation, quiet: nothing breaks */
  {
    const calm = await open(browser, { reduced: true });
    await toSwim(calm);
    await frames(calm, 20); const before = await canvas(calm);
    await tap(calm); await frames(calm, 8); await tap(calm); await frames(calm, 20);
    check(before !== await canvas(calm), "reduced motion: she still hops");
    check((await finish(calm)).swimFlips === 1 && calm.errors.length === 0, "reduced motion: the flip still counts, no errors", calm.errors.join("|"));
    await calm.context().close();

    const turn = await open(browser);
    await toSwim(turn);
    await frames(turn, 20); await tap(turn); await frames(turn, 10);
    await turn.setViewportSize({ width: 820, height: 1180 });
    await turn.waitForTimeout(500);
    await tap(turn); await frames(turn, 40);
    await turn.setViewportSize({ width: 1180, height: 820 });
    await turn.waitForTimeout(500); await frames(turn, 20);
    check(turn.errors.length === 0, "rotating the iPad in the middle of a jump causes no errors", turn.errors.join("|"));
    await turn.context().close();

    const quiet = await open(browser, { extra: { sound: true } });
    await quiet.click("#soundButton"); // mute it
    await toSwim(quiet);
    await frames(quiet, 10); await tap(quiet); await frames(quiet, 8); await tap(quiet);
    const p = await finish(quiet);
    check(p.swimFlips === 1 && quiet.errors.length === 0, "with sound off a jump and flip work and nothing errors", quiet.errors.join("|"));
    await quiet.context().close();

    const phone = await open(browser, { viewport: { width: 390, height: 844 } });
    await toSwim(phone);
    await frames(phone, 20); await phone.locator("#jumpButton").click(); await frames(phone, 8); await phone.locator("#jumpButton").click();
    check((await finish(phone)).swimFlips === 1 && phone.errors.length === 0, "on a phone, tapping the Jump button works (jump, then flip)", phone.errors.join("|"));
    await phone.context().close();
  }

  await browser.close();
  server.close();
  console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll checks passed");
  process.exit(failures ? 1 : 0);
})();
