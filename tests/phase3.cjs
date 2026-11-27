// Phase 3 checks: stars, Meet Violet, Violet in the swim (and her coins), dressing Violet.   node tests/phase3.cjs
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const serve = require("./serve.cjs");

const ROOT = path.resolve(__dirname, "..");
const fx = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "v2-save.json"), "utf8"));
let failures = 0;
const check = (ok, label, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : `  -> ${detail}`}`); if (!ok) failures++; };

const speechSpy = `
  window.__said = [];
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { speak(u) { window.__said.push(u.text); setTimeout(() => u.onend && u.onend(), 30); }, cancel() {} } });`;
// Seeded randomness plus a clock that only moves when we say, so two swims can be compared exactly.
const frozen = `
  (() => { let seed = 4242, clock = 1000, queue = [];
    Math.random = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    performance.now = () => clock;
    window.requestAnimationFrame = (cb) => { queue.push(cb); return queue.length; };
    window.__frames = (n, ms = 16) => { for (let i = 0; i < n; i++) { clock += ms; const run = queue; queue = []; run.forEach((cb) => cb(clock)); } }; })();`;

let base;
const doneUpTo = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [String(i), true]));
// A v2-shaped save (so the migration and the star backfill run too) with n islands mastered.
const save = (n, extra = {}) => JSON.stringify({ ...fx, v: 2, facts: {}, done: doneUpTo(n), ...extra });

async function open(browser, saved, { init = speechSpy, viewport = { width: 1180, height: 820 } } = {}) {
  const context = await browser.newContext({ viewport });
  if (init) await context.addInitScript(init);
  await context.addInitScript((v) => { if (!localStorage.getItem("__s")) { localStorage.setItem("piperDolphinMath2", v); localStorage.setItem("__s", "1"); } }, saved);
  const page = await context.newPage();
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") page.errors.push(m.text()); });
  await page.goto(`${base}/index.html?input=choices`);
  return page;
}
const profile = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("piperDolphinMath2")));
const answerRound = async (page, island, questions = 6) => {
  await page.locator(".island").nth(island).click();
  for (let q = 0; q < questions; q++) {
    await page.waitForSelector(".answer-button:not([disabled])");
    const [a, b] = (await page.textContent("#equation")).match(/\d+/g).map(Number);
    await page.locator(".answer-button", { hasText: new RegExp(`^${a + b}$`) }).click();
    await page.waitForTimeout(q === questions - 1 ? 1900 : 1800);
  }
  await page.waitForSelector("#raceScreen:not(.hidden)");
};
const swim = async (page, island) => { await answerRound(page, island); await page.evaluate(() => window.__frames(1650)); };

(async () => {
  const server = await serve(ROOT);
  base = server.base;
  const browser = await chromium.launch();

  /* 1. Stars */
  {
    const page = await open(browser, save(4));
    const p = await profile(page);
    check(p.stars === 4 && p.starLog.length === 4 && p.starLog.every((e) => e.source === "area"), "the 4 islands she already mastered each count as a star", `stars=${p.stars}`);
    check(await page.textContent("#mapStars") === "4", "the map shows her stars");
    await page.reload();
    check((await profile(page)).stars === 4, "reloading does not hand out the stars again");
    page.once("dialog", (d) => d.accept());
    await page.click("#resetButton");
    await page.waitForFunction(() => Object.keys(JSON.parse(localStorage.getItem("piperDolphinMath2")).done).length === 0);
    const after = await profile(page);
    check(after.stars === 4 && after.starLog.length === 4, "Start over never takes stars away");
    check(page.errors.length === 0, "no console errors (stars)", page.errors.join("|"));
    await page.context().close();
  }

  /* 2. Mastering an island earns one star, once */
  {
    let ok = false, detail = "";
    for (let attempt = 0; attempt < 3 && !ok; attempt++) { // a round can end before the last fact comes up: try again
      const facts = { "3+3": { streak: 2, right: 3, wrong: 0 }, "4+4": { streak: 2, right: 3, wrong: 0 }, "5+5": { streak: 1, right: 1, wrong: 0 } };
      const page = await open(browser, save(4, { facts }), { init: speechSpy });
      await page.locator(".island").nth(4).click();
      for (let q = 0; q < 6; q++) {
        await page.waitForSelector(".answer-button:not([disabled])");
        const [a, b] = (await page.textContent("#equation")).match(/\d+/g).map(Number);
        await page.locator(".answer-button", { hasText: new RegExp(`^${a + b}$`) }).click();
        await page.waitForTimeout(500);
        if (JSON.parse(await page.evaluate(() => localStorage.getItem("piperDolphinMath2"))).done["pirate-wreck"]) break;
        await page.waitForTimeout(1300);
      }
      const p = await profile(page);
      if (p.done["pirate-wreck"]) {
        ok = p.stars === 5 && p.starLog.filter((e) => e.id === "pirate-wreck").length === 1;
        detail = `stars=${p.stars}`;
        await page.waitForSelector("#raceScreen:not(.hidden)", { timeout: 8000 });
      } else detail = "island was not mastered in the round";
      await page.context().close();
    }
    check(ok, "mastering an island earns exactly one new star", detail);
  }

  /* 3. Meet Violet: after a swim, once she has 3 stars */
  {
    const page = await open(browser, save(4), { init: speechSpy + frozen });
    await swim(page, 4);
    await page.waitForSelector("#meetScreen:not(.hidden)", { timeout: 6000 });
    let p = await profile(page);
    check(p.friend.met === true && p.hats.wearing.violet === "violet-sparkle" && !p.collection.owned.includes("violet-sparkle"), "Violet is met, wears her own sparkle hat, and Piper's treasures are untouched");
    await page.evaluate(() => window.__frames(140)); // Violet's leap
    await page.waitForSelector("#meetHi:not(.hidden)", { timeout: 4000 });
    check((await page.evaluate(() => window.__said)).some((t) => /Hi, Piper! I'm Violet!/.test(t)), "Violet says hi out loud");
    const box = await page.locator("#meetHi").boundingBox();
    check(box.height >= 88 && box.width >= 88, "the Say hi! button is 88 px or larger", `${Math.round(box.width)}x${Math.round(box.height)}`);
    await page.click("#meetHi");
    await page.waitForSelector("#mapScreen:not(.hidden)", { timeout: 6000 });
    check(/Violet is your new friend/.test(await page.textContent("#mapBanner")), "back on the map with a note about her new friend");
    check(page.errors.length === 0, "no console errors (meeting Violet)", page.errors.join("|"));
    await page.context().close();
  }

  /* 4. Not before 3 stars, and only once */
  {
    const page = await open(browser, save(2), { init: speechSpy + frozen });
    await swim(page, 2);
    await page.waitForSelector("#mapScreen:not(.hidden)", { timeout: 6000 });
    check(await page.locator("#meetScreen.hidden").count() === 1 && (await profile(page)).friend.met === false, "with only 2 stars she does not meet Violet yet");
    await page.context().close();

    const met = await open(browser, save(4, { friend: { met: true, name: "Violet", color: "#ff8fc8" }, hats: { owned: [], wearing: { me: null, violet: "violet-sparkle" } } }), { init: speechSpy + frozen });
    await swim(met, 4);
    await met.waitForSelector("#mapScreen:not(.hidden)", { timeout: 6000 });
    check(await met.locator("#meetScreen.hidden").count() === 1, "once she has met Violet, the moment never plays again");
    await met.context().close();
  }

  /* 5. Violet in the swim: she shows up, wears her hat, and finds at most 3 coins */
  {
    const run = async (friend, violetHat) => {
      const extra = friend ? { friend: { met: true, name: "Violet", color: "#ff8fc8" }, hats: { owned: [], wearing: { me: null, violet: violetHat } } } : {};
      const page = await open(browser, save(4, extra), { init: speechSpy + frozen });
      await answerRound(page, 4);
      await page.evaluate(() => window.__frames(130)); // 2 s into the swim
      const early = await page.evaluate(() => document.getElementById("raceCanvas").toDataURL());
      const start = (await profile(page)).coins;
      await page.evaluate(() => window.__frames(1500));
      await page.waitForFunction(() => JSON.parse(localStorage.getItem("piperDolphinMath2")).coins > 0, null, { timeout: 5000 });
      const end = (await profile(page)).coins;
      const callout = await page.textContent("#raceCallout");
      await page.context().close();
      return { early, gained: end - start, callout };
    };
    const alone = await run(false), withViolet = await run(true, "violet-sparkle"), noHat = await run(true, null);
    check(alone.early !== withViolet.early, "Violet is in the picture beside Piper once they have met");
    check(withViolet.early !== noHat.early, "Violet's hat shows in the swim");
    check(withViolet.gained - alone.gained === 3, "Violet finds 3 coins in a full swim (and no more)", `with=${withViolet.gained} alone=${alone.gained}`);
    check(/Violet found 3/.test(withViolet.callout), "the end-of-swim message says what Violet found", withViolet.callout);
  }

  /* 6. Dressing Violet */
  {
    const met = { friend: { met: true, name: "Violet", color: "#ff8fc8" }, hats: { owned: [], wearing: { me: null, violet: "violet-sparkle" } } };
    const none = await open(browser, save(4, { coins: 137 }));
    await none.click("#shopButton");
    check(await none.locator("#shopWho.hidden").count() === 1, "before she meets Violet there is no Me / Violet switch");
    await none.context().close();

    const page = await open(browser, save(4, { coins: 137, ...met }));
    await page.click("#shopButton");
    check(await page.locator("#shopWho button").count() === 2, "after meeting Violet there is a Me / Violet switch");
    const sizes = await page.$$eval("#shopWho button", (b) => b.map((x) => Math.round(Math.min(x.getBoundingClientRect().width, x.getBoundingClientRect().height))));
    check(sizes.every((n) => n >= 64), "the switch buttons are 64 px or larger", sizes.join(","));
    const both = await page.evaluate(() => document.getElementById("shopStage").toDataURL());
    await page.locator("#shopWho button").nth(1).click();
    check(await page.textContent("#stageName") === "Violet" && /Violet Sparkle Hat/.test(await page.textContent("#stageWear")), "choosing Violet shows her and the hat she has on");
    check(/Wearing/.test(await page.locator('.hat-card[data-id="violet-sparkle"] .hat-act').textContent()), "her own sparkle hat shows as Wearing for her");
    await page.locator('.hat-card[data-id="violet-sparkle"] .hat-act').click();
    check((await profile(page)).hats.wearing.violet === null, "tapping it takes it off her");
    await page.locator('.hat-card[data-id="violet-sparkle"] .hat-act').click();
    // buy a hat for Violet
    await page.locator('.hat-card[data-id="party-hat"] .hat-act').click();
    await page.waitForSelector("#payOverlay:not(.hidden)");
    for (let i = 0; i < 2; i++) await page.locator('#purse .coin[data-kind="gold"]').first().click();
    await page.waitForSelector("#payOverlay.hidden", { state: "attached", timeout: 6000 });
    const p = await profile(page);
    check(p.hats.wearing.violet === "party-hat" && p.hats.wearing.me === null && p.collection.owned.includes("party-hat") && p.coins === 117, "a hat bought while dressing Violet goes on Violet", JSON.stringify({ v: p.hats.wearing.violet, me: p.hats.wearing.me, c: p.coins }));
    await page.locator("#shopWho button").nth(0).click();
    check(/Buy · 45/.test(await page.locator('.hat-card[data-id="violet-sparkle"] .hat-act').textContent()), "Piper can still buy her own Violet Sparkle Hat for 45");
    check(/Wear/.test(await page.locator('.hat-card[data-id="party-hat"] .hat-act').textContent()), "a hat bought for Violet is Piper's to wear too");
    check(both !== await page.evaluate(() => document.getElementById("shopStage").toDataURL()), "the stage picture changes as hats change");
    // treasures: wearing follows the switch
    await page.click("#shopToTreasures");
    await page.locator("#treasureWho button").nth(1).click();
    await page.locator(".treasure:not(.missing)").first().click(); // party hat
    check((await profile(page)).hats.wearing.violet === null, "in My Treasures, tapping what Violet already wears takes it off her");
    check(page.errors.length === 0, "no console errors (dressing Violet)", page.errors.join("|"));
    await page.context().close();
  }

  /* 7. Sizes: the meeting screen and the map on a phone and iPad portrait */
  for (const [label, viewport] of [["iPad portrait", { width: 820, height: 1180 }], ["phone", { width: 390, height: 844 }]]) {
    const page = await open(browser, save(4), { viewport });
    const out = [];
    const sideways = async (screen) => { const bad = await page.evaluate(() => [...document.querySelectorAll(".map-head > *, .map-pills > *, .meet-banner, #meetCanvas, #meetSay, #meetHi, .shop-head > *, #shopWho button")].filter((el) => el.offsetParent !== null).filter((el) => { const r = el.getBoundingClientRect(); return r.right > window.innerWidth + 1 || r.left < -1; }).map((el) => el.id || el.className)); if (bad.length) out.push(`${screen}: ${bad.join(",")} sticks out`); };
    await sideways("map");
    check(await page.textContent("#mapStars") === "4", `${label}: stars show on the map`);
    await page.context().close();
    check(out.length === 0, `${label}: the map header fits`, out.join(" ; "));
  }
  {
    const page = await open(browser, save(4), { viewport: { width: 390, height: 844 }, init: speechSpy + frozen });
    await swim(page, 4);
    await page.waitForSelector("#meetScreen:not(.hidden)", { timeout: 6000 });
    await page.evaluate(() => window.__frames(140));
    await page.waitForSelector("#meetHi:not(.hidden)");
    const bad = await page.evaluate(() => [".meet-banner", "#meetCanvas", "#meetSay", "#meetHi"].map((s) => [s, document.querySelector(s).getBoundingClientRect()]).filter(([, r]) => r.right > window.innerWidth + 1 || r.left < -1).map(([s]) => s));
    check(bad.length === 0, "phone: the Meet Violet screen fits the screen", bad.join(","));
    await page.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/meet-phone.png` : "/dev/null" }).catch(() => {});
    await page.context().close();
  }

  await browser.close();
  server.close();
  console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll checks passed");
  process.exit(failures ? 1 : 0);
})();
