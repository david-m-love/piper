// Phase 0 checks, run in headless Chromium (Playwright is preinstalled; there is no npm dependency).
//   node tests/phase0.cjs [path-to-old-copy]
// The optional path is a copy of the game from BEFORE Phase 0 (git archive of the previous commit). With it, the
// scenery of all 8 islands and the map after migrating the fixture save are compared against the old code.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OLD = process.argv[2] ? path.resolve(process.argv[2]) : null;
const fixture = fs.readFileSync(path.join(__dirname, "fixtures", "v2-save.json"), "utf8");
const url = (dir, query = "?input=choices") => `file://${dir}/index.html${query}`;

let failures = 0;
const check = (ok, label, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : `  -> ${detail}`}`);
  if (!ok) failures++;
};

// Makes the page deterministic: seeded Math.random, a clock and animation frames that only move when told to.
const deterministic = () => {
  let seed = 12345;
  Math.random = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  let clock = 1000;
  let queue = [];
  performance.now = () => clock;
  window.requestAnimationFrame = (cb) => { queue.push(cb); return queue.length; };
  window.__frames = (count) => { for (let i = 0; i < count; i++) { clock += 16; const run = queue; queue = []; run.forEach((cb) => cb(clock)); } };
};

async function seed(context, json) {
  await context.addInitScript((value) => {
    if (value !== null && !localStorage.getItem("__seeded")) { localStorage.setItem("piperDolphinMath2", value); localStorage.setItem("__seeded", "1"); }
  }, json);
}

async function newPage(browser, { saved = null, viewport = { width: 1100, height: 800 }, init = null } = {}) {
  const context = await browser.newContext({ viewport });
  if (init) await context.addInitScript(init);
  await seed(context, saved);
  const page = await context.newPage();
  page.errors = [];
  page.on("pageerror", (error) => page.errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") page.errors.push(message.text()); });
  return page;
}

const answerOf = async (page) => {
  const [a, b] = (await page.textContent("#equation")).match(/\d+/g).map(Number);
  return { a, b, answer: a + b };
};
// A wrong answer that is actually one of the buttons on screen.
const wrongOf = async (page, answer) => {
  const texts = await page.locator(".answer-button").allTextContents();
  return Number(texts.find((t) => Number(t) !== answer));
};
async function click(page, value) { await page.locator(".answer-button", { hasText: new RegExp(`^${value}$`) }).click(); }

// Answer 6 questions correctly and land in the race for the given island (0-based).
async function playToRace(page, island) {
  await page.locator(".island").nth(island).click();
  for (let q = 0; q < 6; q++) {
    await page.waitForSelector(".answer-button:not([disabled])");
    const { answer } = await answerOf(page);
    await click(page, answer);
    await page.waitForTimeout(q === 5 ? 1900 : 1800);
  }
  await page.waitForSelector("#raceScreen:not(.hidden)");
}

(async () => {
  const browser = await chromium.launch();
  const fx = JSON.parse(fixture);

  /* 1. Existing v2 save */
  {
    const page = await newPage(browser, { saved: fixture });
    await page.goto(url(ROOT));
    const raw = await page.evaluate(() => localStorage.getItem("piperDolphinMath2"));
    const saved = JSON.parse(raw);
    const backup = await page.evaluate(() => localStorage.getItem("piperDolphinMath2_backup_v2"));
    check(saved.v === 3, "v2 save is migrated to v3");
    check(backup === fixture, "backup key holds the exact original v2 JSON");
    check(JSON.stringify(Object.keys(saved.done).sort()) === JSON.stringify(["bubble-bay", "coral-cove", "kelp-forest", "shell-shore"]), "done flags moved from index to area id", JSON.stringify(saved.done));
    check(JSON.stringify(saved.facts) === JSON.stringify(fx.facts), "facts unchanged");
    check(saved.coins === 137 && saved.correct === 212 && saved.name === "Piper" && saved.color === 2 && saved.music === false, "coins, name, color, counts, music setting unchanged");
    check(JSON.stringify(saved.mysteryField) === '{"keep":"me"}', "unknown fields are kept");
    check(saved.stars === 0 && saved.worldsUnlocked[0] === "sunny-sea" && saved.collection && saved.shop && saved.playToday && saved.friend.met === false && saved.theater.unlocked === false && saved.stats.swims === 0 && saved.hats.wearing, "new v3 fields have defaults");
    check(await page.locator(".island.done").count() === 4 && (await page.locator(".island.current strong").textContent()).includes("Pirate Wreck"), "map shows 4 mastered, Pirate Wreck current");
    const html = await page.innerHTML("#islandList");
    await page.reload();
    check(await page.evaluate(() => localStorage.getItem("piperDolphinMath2_backup_v2")) === fixture, "backup is written once (still the original after reload)");
    check(await page.innerHTML("#islandList") === html, "map is the same after reload");
    check(JSON.parse(await page.evaluate(() => localStorage.getItem("piperDolphinMath2"))).v === 3, "still v3 after reload");
    check(page.errors.length === 0, "no console errors (existing save)", page.errors.join(" | "));
    if (OLD) {
      const old = await newPage(browser, { saved: fixture });
      await old.goto(url(OLD));
      const oldHtml = await old.innerHTML("#islandList");
      check(oldHtml === html, "map after migration is identical to the old game's map for the same save");
      await old.context().close();
    }
    await page.context().close();
  }

  /* 2. Fresh start and unreadable save */
  {
    const page = await newPage(browser);
    await page.goto(url(ROOT));
    check(await page.isVisible("#startScreen"), "fresh start shows the start screen");
    await page.click("#startButton");
    check(await page.isVisible("#mapScreen") && await page.locator(".island:not(.locked)").count() === 1, "fresh start: map with only the first island open");
    check(JSON.parse(await page.evaluate(() => localStorage.getItem("piperDolphinMath2"))).v === 3, "fresh profile is v3");
    check(await page.evaluate(() => localStorage.getItem("piperDolphinMath2_backup_v2")) === null, "no v2 backup when there was no save");
    check(page.errors.length === 0, "no console errors (fresh)", page.errors.join(" | "));
    await page.context().close();

    const bad = await newPage(browser, { saved: "{this is not json" });
    await bad.goto(url(ROOT));
    check(await bad.evaluate(() => localStorage.getItem("piperDolphinMath2_backup_unreadable")) === "{this is not json", "an unreadable save is backed up before anything can overwrite it");
    check(await bad.isVisible("#startScreen"), "unreadable save: game still starts");
    await bad.context().close();
  }

  /* 3. Attempt log, math flow, Start over */
  {
    let page = await newPage(browser, { saved: fixture });
    await page.goto(url(ROOT));
    await page.locator(".island").nth(4).click();
    const q = await answerOf(page);
    await click(page, await wrongOf(page, q.answer));
    await click(page, q.answer);
    await page.waitForTimeout(1200);
    const log = JSON.parse(await page.evaluate(() => localStorage.getItem("piperDolphinLog")));
    const fam = `${Math.min(q.a, q.b)}+${Math.max(q.a, q.b)}`;
    check(log.length === 2, "log has an entry per answer (wrong and right)", `entries=${log.length}`);
    if (log.length === 2) {
      const [w, r] = log;
      check(w.factId === `${q.a}+${q.b}` && w.family === fam && w.op === "add" && w.mode === "choice" && w.context === "practice", "log entry has fact, family, op, mode, context");
      check(w.correct === false && w.firstTry === true && w.hint === false, "first wrong answer: correct false, firstTry true, no hint yet");
      check(r.correct === true && r.firstTry === false && r.hint === true, "right answer after a miss: firstTry false, hint true");
      check(Number.isInteger(w.rtRaw) && w.rtRaw >= 0 && w.rtAdj === null && w.session === r.session && typeof w.t === "number", "rtRaw in ms, rtAdj null until calibration exists, one session");
    }
    const csv = await page.evaluate(() => DD.log.toCSV());
    check(csv.split("\n")[0] === "t,session,factId,family,op,mode,rtRaw,rtAdj,correct,firstTry,hint,context,timing" && csv.split("\n").length === log.length + 1, "CSV export has a header and one row per entry");
    check(JSON.parse(await page.evaluate(() => DD.log.toJSON())).length === log.length, "JSON export works");
    // The log survives a reload (checked above). Next: the cap and the 15-minute session rule, on a page that starts with a big old log.
    await page.context().close();
    const full = await newPage(browser, { saved: fixture, init: `
      if (!localStorage.getItem("__seededLog")) {
        const old = Date.now() - 3e9;
        localStorage.setItem("piperDolphinLog", JSON.stringify(Array.from({ length: 20005 }, (_, i) => ({ t: old + i, session: "sold", factId: "x" + i, family: "x", op: "add", mode: "choice", rtRaw: 1, rtAdj: null, correct: true, firstTry: true, hint: false, context: "practice", timing: "shown" }))));
        localStorage.setItem("__seededLog", "1");
      }` });
    await full.goto(url(ROOT));
    await full.locator(".island").nth(4).click();
    const q2 = await answerOf(full);
    await click(full, q2.answer);
    await full.waitForTimeout(1200);
    const capped = JSON.parse(await full.evaluate(() => localStorage.getItem("piperDolphinLog")));
    check(capped.length === 20000 && capped[capped.length - 1].factId === `${q2.a}+${q2.b}` && capped[0].factId === "x6", "log is capped at 20,000, oldest dropped", `len=${capped.length} first=${capped[0].factId}`);
    check(capped[capped.length - 1].session !== capped[capped.length - 2].session, "a new session starts after a long idle gap");
    await full.context().close();

    const page2 = await newPage(browser, { saved: fixture });
    await page2.goto(url(ROOT));
    await page2.locator(".island").nth(4).click();
    await click(page2, (await answerOf(page2)).answer);
    await page2.waitForTimeout(1200);
    await page2.reload();
    await page2.locator(".island").nth(4).click();
    await click(page2, (await answerOf(page2)).answer);
    await page2.waitForTimeout(1200);
    const two = JSON.parse(await page2.evaluate(() => localStorage.getItem("piperDolphinLog")));
    check(two.length === 2 && two[0].session === two[1].session, "the session continues across a reload within 15 minutes");

    // Start over keeps coins etc.
    page = page2;
    await page.evaluate(() => {
      const p = JSON.parse(localStorage.getItem("piperDolphinMath2"));
      p.stars = 5; p.collection.owned = ["flower-crown"]; p.theater.unlocked = true; p.friend.met = true; p.hats.wearing.me = "flower-crown";
      localStorage.setItem("piperDolphinMath2", JSON.stringify(p));
    });
    await page.reload();
    page.once("dialog", (dialog) => { page.dialogText = dialog.message(); dialog.accept(); });
    await page.click("#resetButton");
    await page.waitForFunction(() => Object.keys(JSON.parse(localStorage.getItem("piperDolphinMath2")).done).length === 0);
    const after = JSON.parse(await page.evaluate(() => localStorage.getItem("piperDolphinMath2")));
    check(/coins, hats, treasures and friends are always kept/.test(page.dialogText || ""), "Start over confirm text says what is kept", page.dialogText);
    check(Object.keys(after.done).length === 0 && Object.keys(after.facts).length === 0, "Start over clears math progress");
    check(after.coins === 137 && after.stars === 5 && after.collection.owned[0] === "flower-crown" && after.theater.unlocked && after.friend.met && after.hats.wearing.me === "flower-crown" && after.name === "Piper" && after.music === false, "Start over keeps coins, stars, collection, theater, Violet, name, music", JSON.stringify({ coins: after.coins, stars: after.stars, owned: after.collection.owned, th: after.theater.unlocked, met: after.friend.met, wear: after.hats.wearing, name: after.name, music: after.music }));
    const kept = await page.evaluate(() => DD.log.count());
    check(kept === 2, "Start over keeps the attempt log", `count=${kept}`);
    check(!!(await page.evaluate(() => localStorage.getItem("piperDolphinMath2_backup_before_reset"))), "Start over leaves a copy of the save it replaced");
    check(page.errors.length === 0, "no console errors (math flow)", page.errors.join(" | "));
    await page.context().close();
  }

  /* 4. Counting voice stays in step with the glowing pieces */
  // A stand-in for the browser voice that behaves like iPad Safari: it queues utterances and plays them one at a time, slowly.
  const speechStub = (delay, neverEnds = false) => `
    window.__events = [];
    window.SpeechSynthesisUtterance = function (text) { this.text = text; };
    (() => {
      const queue = []; let current = null; let timer = 0;
      const next = () => {
        if (current || !queue.length) return;
        const u = current = queue.shift();
        window.__events.push({ k: "say", text: u.text, at: Date.now() });
        if (${neverEnds}) return;
        timer = setTimeout(() => { window.__events.push({ k: "end", text: u.text, at: Date.now() }); current = null; u.onend && u.onend(); next(); }, ${delay});
      };
      Object.defineProperty(window, "speechSynthesis", { configurable: true, value: {
        speak(u) { queue.push(u); next(); },
        cancel() { clearTimeout(timer); const stopped = [current, ...queue.splice(0)].filter(Boolean); current = null; stopped.forEach((u) => u.onerror && u.onerror({})); }
      } });
    })();`;
  async function countRun(dir, init, { mute = false } = {}) {
    const nearEnd = JSON.stringify({ ...fx, facts: {}, done: Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((i) => [String(i), true])) });
    const page = await newPage(browser, { saved: nearEnd, init });
    await page.goto(url(dir));
    if (mute) await page.click("#soundButton");
    await page.locator(".island").nth(7).click(); // Dolphin Palace: every sum is 10 or close, so there are plenty of pieces to count
    await page.evaluate(() => {
      window.__lit = [];
      new MutationObserver((records) => records.forEach((r) => { if (r.target.classList.contains("counted") && r.target.dataset.n) window.__lit.push({ n: Number(r.target.dataset.n), at: Date.now() }); }))
        .observe(document.getElementById("tokens"), { subtree: true, attributes: true, attributeFilter: ["class"] });
    });
    const q = await answerOf(page);
    await page.evaluate(() => { window.__events.length = 0; });
    await click(page, await wrongOf(page, q.answer));
    await page.waitForTimeout(1200 + (q.answer) * 1900 + 2500);
    const result = await page.evaluate(() => ({ lit: window.__lit, events: window.__events }));
    result.q = q; result.errors = page.errors;
    await page.context().close();
    return result;
  }
  {
    const slow = await countRun(ROOT, speechStub(1200));
    const numbers = slow.events.filter((e) => e.k === "say" && /^\d+$/.test(e.text));
    const ends = slow.events.filter((e) => e.k === "end" && /^\d+$/.test(e.text));
    check(numbers.length === slow.q.answer && slow.lit.length === slow.q.answer, `slow voice (1.2 s per word): ${slow.q.answer} pieces lit and ${numbers.length} numbers spoken`, `lit=${slow.lit.length}`);
    let together = true; let waits = true;
    for (let i = 0; i < numbers.length; i++) {
      if (Math.abs(slow.lit[i].at - numbers[i].at) > 120) together = false;               // glow and voice start together
      if (i > 0 && slow.lit[i].at < ends[i - 1].at - 5) waits = false;                  // next piece waits for the previous word to end
    }
    check(together, "each piece lights up within 120 ms of its number being spoken");
    check(waits, "the next piece never lights before the previous number has finished");

    const never = await countRun(ROOT, speechStub(0, true));
    const gaps = never.lit.slice(1).map((l, i) => l.at - never.lit[i].at);
    check(never.lit.length === never.q.answer && gaps.every((g) => g > 1300 && g < 2300), "if the voice never reports its end, a ~1.5 s fallback keeps counting", `lit=${never.lit.length} gaps=${gaps.join(",")}`);

    const muted = await countRun(ROOT, speechStub(1200), { mute: true });
    const mgaps = muted.lit.slice(1).map((l, i) => l.at - muted.lit[i].at);
    check(muted.events.length === 0, "sound off: no speech fires at all");
    check(muted.lit.length === muted.q.answer && mgaps.every((g) => g > 620 && g < 800), "sound off: counting uses the old fixed 700 ms timing", `gaps=${mgaps.join(",")}`);

    if (OLD) {
      const old = await countRun(OLD, speechStub(1200));
      const oldNumbers = old.events.filter((e) => e.k === "say" && /^\d+$/.test(e.text));
      const drift = oldNumbers.map((e, i) => old.lit[i] ? Math.round(e.at - old.lit[i].at) : null);
      console.log(`INFO  old code, same slow voice: ${old.lit.length} pieces lit, ${oldNumbers.length} numbers spoken; voice starts this many ms after its glow: ${drift.join(", ")}`);
    }
    check(slow.errors.length + never.errors.length + muted.errors.length === 0, "no console errors while counting");
  }

  /* 5. Scenery is unchanged on all 8 islands (needs the old copy) */
  if (OLD) {
    const grabs = async (dir) => {
      const results = await Promise.all(Array.from({ length: 8 }, async (_, island) => {
        const saved = JSON.stringify({ ...fx, facts: { "0+0": { streak: 0, right: 0, wrong: 1 } }, done: Object.fromEntries(Array.from({ length: island }, (_, i) => [String(i), true])) });
        const page = await newPage(browser, { saved, init: deterministic });
        await page.goto(url(dir));
        await playToRace(page, island);
        await page.evaluate(() => window.__frames(70));
        const picture = await page.evaluate(() => document.getElementById("raceCanvas").toDataURL());
        await page.context().close();
        return picture;
      }));
      return results;
    };
    const [before, after] = [await grabs(OLD), await grabs(ROOT)];
    before.forEach((picture, i) => check(picture === after[i], `island ${i + 1} race scenery is pixel-identical to the old game`));
    fs.writeFileSync("/tmp/claude-0/-home-user-piper/702fccd2-bd81-5fb7-b884-51ebf9d6e024/scratchpad/island8-new.png", Buffer.from(after[7].split(",")[1], "base64"));
  }

  /* 6. Race in every orientation, rotating mid-swim, phone size, tap targets */
  {
    const playable = JSON.stringify({ ...fx, facts: {} }); // islands 1-4 done, nothing half-learned, so a round never ends early
    for (const [label, viewport] of [["iPad landscape", { width: 1180, height: 820 }], ["iPad portrait", { width: 820, height: 1180 }], ["phone portrait", { width: 390, height: 844 }]]) {
      const page = await newPage(browser, { saved: playable, viewport });
      await page.goto(url(ROOT));
      await playToRace(page, 4);
      await page.waitForTimeout(1500);
      const pads = await page.evaluate(() => ["moveUp", "moveDown"].map((id) => { const r = document.getElementById(id).getBoundingClientRect(); return Math.round(Math.min(r.width, r.height)); }));
      check(pads.every((size) => size >= 64), `${label}: race steering buttons are 64 px or larger`, pads.join(","));
      const dims = await page.evaluate(() => ({ w: raceCanvas.width, h: raceCanvas.height }));
      if (label === "iPad landscape") {
        await page.setViewportSize({ width: 820, height: 1180 });
      } else {
        await page.setViewportSize({ width: viewport.height, height: viewport.width });
      }
      await page.waitForTimeout(800);
      const rotated = await page.evaluate(() => ({ w: raceCanvas.width, h: raceCanvas.height }));
      check(page.errors.length === 0 && (dims.w > dims.h) !== (rotated.w > rotated.h), `${label}: race runs, and rotating mid-swim re-lays out the canvas without errors`, `${JSON.stringify(dims)} -> ${JSON.stringify(rotated)} ${page.errors.join("|")}`);
      await page.context().close();
    }

    const page = await newPage(browser, { saved: playable, viewport: { width: 820, height: 1180 } });
    await page.goto(url(ROOT));
    const small = [];
    const measure = async (screen) => {
      const list = await page.evaluate(() => [...document.querySelectorAll("button, input, a")].filter((el) => el.offsetParent !== null).map((el) => {
        const r = el.getBoundingClientRect();
        const before = getComputedStyle(el, "::before");
        const bw = before.content !== "none" && before.position === "absolute" ? parseFloat(before.width) || 0 : 0;
        const bh = before.content !== "none" && before.position === "absolute" ? parseFloat(before.height) || 0 : 0;
        return { id: el.id || el.className || el.tagName, w: Math.max(r.width, bw), h: Math.max(r.height, bh) };
      }));
      list.filter((e) => e.w < 63.5 || e.h < 63.5).forEach((e) => small.push(`${screen}: ${e.id} ${Math.round(e.w)}x${Math.round(e.h)}`));
    };
    await measure("map");
    await page.locator(".island").nth(4).click();
    await measure("math");
    await click(page, (await answerOf(page)).answer);
    await page.waitForSelector("#raceScreen:not(.hidden)", { timeout: 40000 }).catch(() => {});
    await page.evaluate(() => document.getElementById("backToMap")?.click());
    check(small.length === 0, "tap targets on the map and math screens are 64 px or larger", small.join(" ; "));
    const startSmall = small.splice(0);
    await page.evaluate(() => document.getElementById("homeButton").click());
    await measure("start");
    console.log(`INFO  start screen controls still under 64 px (existing design, not changed in Phase 0): ${small.join(" ; ")}`);
    void startSmall;
    await page.context().close();
  }

  await browser.close();
  console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll checks passed");
  process.exit(failures ? 1 : 0);
})();
