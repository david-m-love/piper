// Phase 2 checks: hat shop, the coin counter (drag/tap, gold coins, Trade), My Treasures, hats everywhere.
//   node tests/phase2.cjs
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SHOTS = process.env.SHOT_DIR || null;
const fx = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "v2-save.json"), "utf8"));
let failures = 0;
const check = (ok, label, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : `  -> ${detail}`}`); if (!ok) failures++; };

// A v3 profile with exactly the coins we want (four islands mastered, so the shop is open).
const profile = (coins, extra = {}) => JSON.stringify({ ...fx, v: 2, coins, facts: {}, ...extra });
const speechSpy = `
  window.__said = [];
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { speak(u) { window.__said.push(u.text); setTimeout(() => u.onend && u.onend(), 30); }, cancel() {} } });`;

async function open(browser, coins, { extra = {}, viewport = { width: 1180, height: 820 }, init = speechSpy, raw = null } = {}) {
  const context = await browser.newContext({ viewport });
  if (init) await context.addInitScript(init);
  const saved = raw ?? profile(coins, extra);
  await context.addInitScript((v) => { if (!localStorage.getItem("__s")) { localStorage.setItem("piperDolphinMath2", v); localStorage.setItem("__s", "1"); } }, saved);
  const page = await context.newPage();
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") page.errors.push(m.text()); });
  await page.goto(`file://${ROOT}/index.html?input=choices`);
  return page;
}
const save = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("piperDolphinMath2")));
const logOf = async (page) => { await page.waitForTimeout(1000); return page.evaluate(() => JSON.parse(localStorage.getItem("piperDolphinLog") || "[]")); };
const card = (page, id) => page.locator(`.hat-card[data-id="${id}"]`);
const buy = async (page, id) => { await card(page, id).locator(".hat-act").click(); await page.waitForSelector("#payOverlay:not(.hidden)"); };
const purse = (page, kind) => page.locator(`#purse .coin[data-kind="${kind}"]`);
const tray = (page) => page.evaluate(() => ({ gold: document.querySelectorAll('#tray .coin.gold:not(.ghost)').length, reg: document.querySelectorAll('#tray .coin:not(.gold):not(.ghost)').length, total: Number(document.getElementById("trayTotal").textContent) }));
const say = (page) => page.textContent("#paySay");

(async () => {
  const browser = await chromium.launch();

  /* 1. The shop is closed until the first island is mastered */
  {
    const page = await open(browser, 30, { raw: "", init: null });
    await page.evaluate(() => localStorage.removeItem("piperDolphinMath2"));
    await page.reload();
    await page.click("#startButton");
    check(await page.locator("#shopButton.soon").count() === 1, "before any island is mastered the hat shop button is locked");
    await page.click("#shopButton");
    check(await page.isVisible("#mapScreen") && /to open the hat shop/.test(await page.textContent("#mapBanner")), "tapping it says what to do, and nothing opens");
    await page.context().close();
  }

  /* 2. Dressing room */
  {
    const page = await open(browser, 137);
    check(await page.locator("#shopButton.soon").count() === 0, "an existing save with mastered islands has the shop open");
    await page.click("#shopButton");
    check(await page.locator(".hat-card").count() === 12, "dressing room shows 12 hats");
    const prices = await page.$$eval(".hat-card", (cards) => cards.map((c) => [c.dataset.id, c.querySelector(".hat-act").textContent]));
    const fancy = ["flower-crown", "violet-sparkle", "crown"], common = ["party-hat", "pirate-hat", "sun-hat", "bow", "chef-hat", "snow-beanie", "bubble-halo", "starfish-clip"];
    check(fancy.every((id) => prices.find((p) => p[0] === id)[1].includes("45")) && common.every((id) => prices.find((p) => p[0] === id)[1].includes("20")), "fancy hats cost 45, the other eight cost 20");
    check(prices.find((p) => p[0] === "rainbow-hat")[1].includes("rainbow bubbles"), "the Rainbow Hat cannot be bought (found in rainbow bubbles)");
    check(await page.locator(".hat-card .hat-act.on").count() === 0 && (await save(page)).collection.owned.length === 0 && (await save(page)).hats.wearing.me === null, "she starts owning and wearing no hat");
    check(/137/.test(await page.textContent("#shopCoins")) && /×13/.test(await page.textContent("#shopCoins")) && /×7/.test(await page.textContent("#shopCoins")), "coins shown as 13 gold + 7 regular", await page.textContent("#shopCoins"));
    await card(page, "flower-crown").click();
    check(/Trying on: Flower Crown/.test(await page.textContent("#stageWear")) && (await save(page)).hats.wearing.me === null, "tapping a hat tries it on without owning or saving it");
    const stage = await page.evaluate(() => document.getElementById("shopStage").toDataURL());
    await card(page, "party-hat").click();
    check(stage !== await page.evaluate(() => document.getElementById("shopStage").toDataURL()), "the dolphin picture changes with the hat");
    if (SHOTS) { await card(page, "flower-crown").click(); await page.waitForTimeout(1200); await page.screenshot({ path: `${SHOTS}/shop.png` }); }
    check(page.errors.length === 0, "no console errors in the dressing room", page.errors.join("|"));
    await page.context().close();
  }

  /* 3. Paying: tapping, exact amount, hat is mine and worn, coins go down, logged */
  {
    const page = await open(browser, 137);
    await page.click("#shopButton");
    await buy(page, "party-hat");
    check(await page.locator("#priceCoins .coin.gold").count() === 2 && /20/.test(await page.textContent("#priceNum")), "price tag shows 20 as two gold coins at first");
    check(await page.locator("#tray .coin.ghost").count() === 2, "the tray shows two empty spots");
    await purse(page, "gold").first().click();
    let t = await tray(page);
    check(t.total === 10 && t.gold === 1, "tapping a gold coin puts it on the tray");
    check((await page.evaluate(() => window.__said)).includes("10"), "the total is counted aloud (10)");
    await purse(page, "gold").first().click();
    await page.waitForTimeout(300);
    const s = await save(page);
    check(s.coins === 117 && s.collection.owned.includes("party-hat") && s.hats.wearing.me === "party-hat" && s.stats.payments === 1, "paid exactly: 20 coins spent, hat owned and worn", JSON.stringify({ c: s.coins, o: s.collection.owned, w: s.hats.wearing.me }));
    check((await page.evaluate(() => window.__said)).some((x) => /^20\. Paid!/.test(x)), "counted 20 and said Paid!");
    await page.waitForSelector("#payOverlay.hidden", { state: "attached", timeout: 6000 });
    check(await card(page, "party-hat").locator(".hat-act.on").count() === 1 && /117/.test(await page.textContent("#shopCoins")), "back in the dressing room: Wearing, and the coin total went down");
    const log = (await logOf(page)).filter((e) => e.context === "money");
    check(log.length === 1 && log[0].price === 20 && log[0].dragged === 2 && log[0].prompts === 0 && log[0].trades === 0 && log[0].firstTry === true && log[0].factId === "pay:party-hat", "payment is in the attempt log as context money", JSON.stringify(log[0]));
    check(page.errors.length === 0, "no console errors while paying", page.errors.join("|"));
    await page.context().close();
  }

  /* 4. Dragging with the mouse; coins can be taken back; cancel changes nothing */
  {
    const page = await open(browser, 137);
    await page.click("#shopButton");
    await buy(page, "bow");
    const coin = purse(page, "gold").first(), from = await coin.boundingBox(), to = await page.locator("#tray").boundingBox();
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + 60, from.y - 40, { steps: 5 });
    check(await page.locator(".coin.drag").count() === 1, "a coin follows the pointer while dragging");
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
    check(await page.locator("#tray.over").count() === 1, "the tray lights up when a coin is over it");
    await page.mouse.up();
    check((await tray(page)).gold === 1 && await page.locator(".coin.drag").count() === 0, "dropping a coin on the tray puts it there");
    // dropped in the wrong place: nothing happens, the coin stays in the purse
    const c2 = purse(page, "gold").first(), f2 = await c2.boundingBox();
    await page.mouse.move(f2.x + f2.width / 2, f2.y + f2.height / 2); await page.mouse.down();
    await page.mouse.move(f2.x + 300, 6, { steps: 6 }); await page.mouse.up();
    check((await tray(page)).gold === 1, "letting go away from the tray leaves the coin in the purse");
    // take it back by tapping it on the tray
    await page.locator("#tray .coin.gold:not(.ghost)").first().click();
    check((await tray(page)).total === 0, "tapping a coin on the tray takes it back");
    await page.click("#payCancel");
    const s = await save(page);
    check(await page.locator("#payOverlay.hidden").count() === 1 && s.coins === 137 && s.collection.owned.length === 0, "Not now closes the counter and costs nothing");
    check((await logOf(page)).filter((e) => e.context === "money").length === 0, "an unfinished payment is not logged as a payment");
    await page.context().close();
  }

  /* 5. Gentle prompts: too many, stopping short, Trade */
  {
    const page = await open(browser, 57); // 5 gold + 7 coins
    await page.click("#shopButton");
    await buy(page, "crown"); // 45
    check(await page.locator("#priceCoins .coin").count() === 9, "price 45 is pictured as 4 gold + 5 coins");
    for (let i = 0; i < 4; i++) await purse(page, "gold").first().click();
    await purse(page, "gold").first().click(); // a 5th gold would be 50: too many
    let t = await tray(page);
    check(t.total === 40 && /Here's one back/.test(await say(page)), "a coin that is too big is handed back with \"Here's one back!\" (no buzzer)", `${t.total} ${await say(page)}`);
    check(await purse(page, "gold").count() >= 1, "the coin is still in the purse");
    for (let i = 0; i < 4; i++) await purse(page, "reg").first().click();
    t = await tray(page);
    await page.waitForTimeout(4200);
    check(t.total === 44 && /Just one more!/.test(await say(page)) && await page.locator("#tray .coin.ghost.glow").count() === 1, "stopping one short: \"Just one more!\" and the empty spot glows", await say(page));
    await purse(page, "reg").first().click();
    await page.waitForTimeout(300);
    const s = await save(page);
    const log = (await logOf(page)).filter((e) => e.context === "money")[0];
    check(s.coins === 12 && s.collection.owned.includes("crown"), "paid 45 with 4 gold + 5 coins (57 -> 12)", String(s.coins));
    check(log.prompts >= 2 && log.firstTry === false && log.hint === true, "the log records that prompts were needed", JSON.stringify(log));
    await page.context().close();

    // Trade: 6 gold and no coins, price 45
    const trade = await open(browser, 60);
    await trade.click("#shopButton");
    await buy(trade, "crown");
    check(await trade.locator("#purse .coin:not(.gold)").count() === 0, "6 gold and no little coins to start");
    for (let i = 0; i < 4; i++) await purse(trade, "gold").first().click();
    await trade.click("#tradeButton");
    await trade.waitForTimeout(300);
    check(await purse(trade, "reg").count() === 10, "Trade turns one gold coin into ten coins");
    for (let i = 0; i < 5; i++) await purse(trade, "reg").first().click();
    await trade.waitForTimeout(300);
    const ts = await save(trade);
    const tlog = (await logOf(trade)).filter((e) => e.context === "money")[0];
    check(ts.coins === 15 && tlog.trades === 1 && tlog.price === 45, "paid after trading (60 -> 15), trade logged", `${ts.coins} ${JSON.stringify(tlog)}`);
    await trade.context().close();

    // The nudge points at Trade when she needs little coins she does not have
    const nudge = await open(browser, 60);
    await nudge.click("#shopButton");
    await buy(nudge, "crown");
    for (let i = 0; i < 4; i++) await purse(nudge, "gold").first().click();
    await nudge.waitForTimeout(4200);
    check(await nudge.locator("#tradeButton.glow").count() === 1 && /Trade/.test(await say(nudge)), "when she needs little coins she has none of, Trade glows and the dolphin says so", await say(nudge));
    await nudge.context().close();
  }

  /* 6. Not enough coins: gentle, nothing opens */
  {
    const page = await open(browser, 10);
    await page.click("#shopButton");
    check(/Save up/.test(await card(page, "party-hat").locator(".hat-act").textContent()), "a hat she cannot afford yet says \"Save up!\"");
    await card(page, "party-hat").locator(".hat-act").click();
    check(await page.locator("#payOverlay.hidden").count() === 1 && /10 more coins/.test(await page.textContent("#stageSay")) && (await save(page)).coins === 10, "tapping it says how many more coins are needed; nothing is taken");
    await page.context().close();
  }

  /* 7. Keyboard: a focused coin moves with Enter */
  {
    const page = await open(browser, 137);
    await page.click("#shopButton");
    await buy(page, "party-hat");
    await purse(page, "gold").first().focus();
    await page.keyboard.press("Enter");
    check((await tray(page)).gold === 1, "Enter on a focused coin puts it on the tray");
    await page.keyboard.press("Escape");
    check(await page.locator("#payOverlay.hidden").count() === 1, "Escape closes the counter");
    await page.context().close();
  }

  /* 8. My Treasures, Wear/Take off, hats show in the other screens */
  {
    const page = await open(browser, 137, { extra: { collection: { owned: ["flower-crown", "bow"], seenNew: ["bow"], custom: [] }, hats: { owned: [], wearing: { me: "bow", violet: null } } } });
    await page.click("#treasuresButton");
    check(await page.locator(".treasure").count() === 12 && await page.locator(".treasure.missing").count() === 10, "treasures: 12 shelf spots, 2 found, 10 grey shapes");
    check(/2 of 12 found/.test(await page.textContent("#treasureCount")), "treasure count is shown");
    check(await page.locator(".treasure .ribbon").count() === 1, "only the hat she has not looked at yet has a NEW! ribbon");
    check((await page.locator(".treasure.missing").first().textContent()).includes("? ? ?"), "unfound items are hidden as ? ? ?");
    await page.locator(".treasure:not(.missing)").first().click(); // flower crown
    check((await save(page)).hats.wearing.me === "flower-crown", "tapping an owned treasure wears it");
    await page.click("#treasuresBack");
    await page.click("#treasuresButton");
    check(await page.locator(".treasure .ribbon").count() === 0, "NEW! goes away once she has seen it");
    await page.click("#treasuresBack");
    // marker on the map is a drawn dolphin that shows the hat
    const withHat = await page.evaluate(() => document.querySelector("canvas.marker").toDataURL());
    await page.click("#shopButton"); await page.locator(".hat-card .hat-act.on").click(); await page.click("#shopBack");
    const without = await page.evaluate(() => document.querySelector("canvas.marker").toDataURL());
    check(withHat !== without, "the map marker shows the hat she is wearing");
    check(page.errors.length === 0, "no console errors in treasures", page.errors.join("|"));
    await page.context().close();
  }

  /* 9. Hats on the math-screen dolphin and in the swim (same picture with and without a hat, seeded) */
  {
    const frozen = () => {
      let seed = 777, clock = 1000, queue = [];
      Math.random = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      performance.now = () => clock;
      window.requestAnimationFrame = (cb) => { queue.push(cb); return queue.length; };
      window.__frames = (n) => { for (let i = 0; i < n; i++) { clock += 16; const run = queue; queue = []; run.forEach((cb) => cb(clock)); } };
    };
    const grab = async (hat, viewport) => {
      const page = await open(browser, 137, { init: frozen, viewport, extra: { collection: { owned: ["crown"], seenNew: [], custom: [] }, hats: { owned: [], wearing: { me: hat, violet: null } } } });
      await page.locator(".island").nth(4).click();
      await page.evaluate(() => window.__frames(5));
      const mascot = await page.evaluate(() => document.getElementById("mascot").toDataURL());
      for (let q = 0; q < 6; q++) {
        await page.waitForSelector(".answer-button:not([disabled])");
        const [a, b] = (await page.textContent("#equation")).match(/\d+/g).map(Number);
        await page.locator(".answer-button", { hasText: new RegExp(`^${a + b}$`) }).click();
        await page.waitForTimeout(q === 5 ? 1900 : 1800);
      }
      await page.waitForSelector("#raceScreen:not(.hidden)");
      await page.evaluate(() => window.__frames(40));
      const race = await page.evaluate(() => document.getElementById("raceCanvas").toDataURL());
      await page.context().close();
      return { mascot, race };
    };
    for (const [label, viewport] of [["landscape", { width: 1180, height: 820 }], ["portrait", { width: 820, height: 1180 }]]) {
      const [plain, hatted] = [await grab(null, viewport), await grab("crown", viewport)];
      check(plain.mascot !== hatted.mascot, `${label}: the coach dolphin on the math screen wears the hat`);
      check(plain.race !== hatted.race, `${label}: the swimming dolphin wears the hat`);
    }
  }

  /* 10. Other screen sizes: nothing spills sideways, tap targets */
  {
    for (const [label, viewport] of [["iPad portrait", { width: 820, height: 1180 }], ["phone", { width: 390, height: 844 }], ["iPad landscape", { width: 1180, height: 820 }]]) {
      const page = await open(browser, 137, { viewport, extra: { collection: { owned: ["flower-crown", "bow"], seenNew: [], custom: [] } } });
      const small = [];
      const measure = async (screen) => {
        const list = await page.evaluate(() => [...document.querySelectorAll("button")].filter((el) => el.offsetParent !== null && !el.disabled && !el.classList.contains("ghost") && !el.classList.contains("small")).map((el) => {
          const r = el.getBoundingClientRect(), b = getComputedStyle(el, "::before");
          const bw = b.content !== "none" && b.position === "absolute" ? parseFloat(b.width) || 0 : 0, bh = b.content !== "none" && b.position === "absolute" ? parseFloat(b.height) || 0 : 0;
          return { id: el.id || el.className, w: Math.max(r.width, bw), h: Math.max(r.height, bh) };
        }));
        list.filter((e) => e.w < 63.5 || e.h < 63.5).forEach((e) => small.push(`${screen}: ${e.id} ${Math.round(e.w)}x${Math.round(e.h)}`));
      };
      const overflow = async (screen) => {
        // The app clips anything past the screen edge, so look at every visible piece: none may stick out sideways.
        const out = await page.evaluate(() => [...document.querySelectorAll(".shop-head > *, .pay-head > *, .map-shortcuts > *, .hat-card, .treasure, .pay-row > *, .purse, .tray, .coin")].filter((el) => el.offsetParent !== null).filter((el) => { const r = el.getBoundingClientRect(); return r.right > window.innerWidth + 1 || r.left < -1; }).map((el) => el.id || el.className));
        if (out.length) small.push(`${screen}: sticks out sideways: ${[...new Set(out)].join(", ")}`);
      };
      await measure("map"); await overflow("map");
      await page.click("#shopButton"); await page.waitForTimeout(300);
      await measure("shop"); await overflow("shop");
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/shop-${label.replace(/ /g, "-")}.png`, fullPage: true });
      await buy(page, "party-hat");
      await measure("counter"); await overflow("counter");
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/pay-${label.replace(/ /g, "-")}.png` });
      const coins = await page.evaluate(() => [...document.querySelectorAll("#purse .coin")].map((c) => Math.round(c.getBoundingClientRect().width)));
      if (coins.some((w) => w < 72)) small.push(`counter: coin ${Math.min(...coins)}px`);
      await page.click("#payCancel");
      await page.click("#shopToTreasures"); await page.waitForTimeout(200);
      await measure("treasures"); await overflow("treasures");
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/treasures-${label.replace(/ /g, "-")}.png`, fullPage: true });
      check(small.length === 0, `${label}: tap targets are 64 px or larger (coins 72+), nothing spills sideways`, small.join(" ; "));
      check(page.errors.length === 0, `${label}: no console errors`, page.errors.join("|"));
      await page.context().close();
    }
  }

  await browser.close();
  console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll checks passed");
  process.exit(failures ? 1 : 0);
})();
