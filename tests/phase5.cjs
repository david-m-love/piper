// Phase 5 checks: phones. Upright and held wide on an iPhone Pro Max (and a smaller iPhone), tap-the-water steering,
// no steering buttons on a phone, nothing cut off.   node tests/phase5.cjs
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const serve = require("./serve.cjs");

const ROOT = path.resolve(__dirname, "..");
const fx = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "v2-save.json"), "utf8"));
let failures = 0;
const check = (ok, label, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : `  -> ${detail}`}`); if (!ok) failures++; };

const frozen = `
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { speak(u) { setTimeout(() => u.onend && u.onend(), 20); }, cancel() {} } });
  (() => { let seed = 31337, clock = 1000, queue = [];
    Math.random = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    performance.now = () => clock;
    window.requestAnimationFrame = (cb) => { queue.push(cb); return queue.length; };
    window.__frames = (n, ms = 16) => { for (let i = 0; i < n; i++) { clock += ms; const run = queue; queue = []; run.forEach((cb) => cb(clock)); } }; })();`;

const PHONES = [
  ["iPhone Pro Max upright", { width: 430, height: 932 }],
  ["iPhone Pro Max wide (installed app)", { width: 932, height: 430 }],
  ["iPhone Pro Max wide (Safari, bars showing)", { width: 932, height: 370 }],
  ["iPhone 14 upright", { width: 390, height: 844 }],
  ["iPhone 14 wide", { width: 844, height: 390 }]
];

let base;
const save = JSON.stringify({ ...fx, v: 2, facts: {}, sound: false, done: { 0: true, 1: true, 2: true, 3: true } });
async function open(browser, viewport, { touch = true } = {}) {
  const context = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch, deviceScaleFactor: 2 });
  await context.addInitScript(frozen);
  await context.addInitScript((v) => { if (!localStorage.getItem("__s")) { localStorage.setItem("piperDolphinMath2", v); localStorage.setItem("__s", "1"); } }, save);
  const page = await context.newPage();
  page.touch = touch;
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") page.errors.push(m.text()); });
  await page.goto(`${base}/index.html?input=choices`);
  return page;
}
const frames = (page, n) => page.evaluate((n) => window.__frames(n), n);
const toSwim = async (page, onMath) => {
  await page.locator(".island").nth(4).click();
  await page.waitForSelector(".answer-button:not([disabled])");
  if (onMath) await onMath();
  for (let q = 0; q < 6; q++) {
    await page.waitForSelector(".answer-button:not([disabled])");
    const [a, b] = (await page.textContent("#equation")).match(/\d+/g).map(Number);
    const answer = page.locator(".answer-button", { hasText: new RegExp(`^${a + b}$`) });
    if (page.touch) await answer.tap(); else await answer.click();
    await page.waitForTimeout(q === 5 ? 1900 : 1800);
  }
  await page.waitForSelector("#raceScreen:not(.hidden)");
  await frames(page, 40);
};
const fits = (page, selectors) => page.evaluate((selectors) => {
  const bad = [];
  selectors.forEach((sel) => document.querySelectorAll(sel).forEach((el) => {
    if (el.offsetParent === null) return;
    const r = el.getBoundingClientRect();
    if (r.bottom > innerHeight + 1 || r.top < -1 || r.right > innerWidth + 1 || r.left < -1) bad.push(`${sel} [${Math.round(r.left)},${Math.round(r.top)}-${Math.round(r.right)},${Math.round(r.bottom)}] in ${innerWidth}x${innerHeight}`);
  }));
  return { bad, scroll: document.documentElement.scrollHeight - innerHeight, sideways: document.documentElement.scrollWidth - innerWidth };
}, selectors);

// Where Piper (purple) is in the water picture: the median of her body pixels, as a fraction of the picture across the lanes.
const whereIsPiper = (page, portrait) => page.evaluate((portrait) => {
  const c = document.getElementById("raceCanvas"), g = c.getContext("2d"), { data } = g.getImageData(0, 0, c.width, c.height);
  const xs = [], ys = [];
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], gr = data[i + 1], b = data[i + 2];
    if (r > 100 && r < 200 && gr > 70 && gr < 160 && b > 200 && r > gr + 20 && b - r > 40) { xs.push((i / 4) % c.width); ys.push(Math.floor(i / 4 / c.width)); }
  }
  const median = (a) => a.sort((p, q) => p - q)[Math.floor(a.length / 2)];
  return xs.length < 200 ? null : portrait ? median(xs) / c.width : median(ys) / c.height;
}, portrait);

(async () => {
  const server = await serve(ROOT);
  base = server.base;
  const browser = await chromium.launch();

  /* 1. Nothing cut off on a phone, held either way */
  for (const [label, viewport] of PHONES) {
    const page = await open(browser, viewport);
    const wide = viewport.width > viewport.height;
    let math = null;
    await toSwim(page, async () => {
      math = await fits(page, [".math-card", ".answer-button", ".boost-wrap", ".round-row", ".equation", ".coach"]);
      math.small = await page.$$eval(".answer-button", (b) => b.map((x) => Math.round(Math.min(x.getBoundingClientRect().width, x.getBoundingClientRect().height))));
    });
    check(math.bad.length === 0 && math.scroll <= 1 && math.sideways <= 1, `${label}: the whole math question fits, no scrolling needed`, `${math.bad.join(" ; ")} scroll=${math.scroll} sideways=${math.sideways}`);
    check(math.small.every((n) => n >= 64), `${label}: the answer buttons are 64 px or larger`, math.small.join(","));

    const race = await fits(page, ["#raceCanvas", "#jumpButton", ".race-status"]);
    check(race.bad.length === 0 && race.scroll <= 1 && race.sideways <= 1, `${label}: the whole swim fits (water, Jump button, coins and timer), no scrolling`, `${race.bad.join(" ; ")} scroll=${race.scroll} sideways=${race.sideways}`);
    const jump = await page.locator("#jumpButton").boundingBox();
    check(jump.height >= 88 && jump.width >= 88, `${label}: the Jump button is 88 px or larger`, `${Math.round(jump.width)}x${Math.round(jump.height)}`);
    const hidden = await page.evaluate(() => ["moveUp", "moveDown"].map((id) => getComputedStyle(document.getElementById(id)).display).concat(getComputedStyle(document.querySelector(".race-hint")).display));
    check(hidden.every((d) => d === "none"), `${label}: no steering buttons or hint text on a phone`, hidden.join(","));
    check(await page.textContent("#raceCallout") === "Tap the water to swim there!", `${label}: it says to tap the water`);

    // tapping the water sends her to that lane
    const box = await page.locator("#raceCanvas").boundingBox();
    const spots = [[.15, .25], [.5, .5], [.85, .75]]; // where to tap across the picture -> where she should end up
    const seen = [];
    for (const [tapAt] of spots) {
      const x = wide ? box.x + box.width * .55 : box.x + box.width * tapAt, y = wide ? box.y + box.height * tapAt : box.y + box.height * .5;
      await page.touchscreen.tap(x, y);
      await frames(page, 45);
      seen.push(await whereIsPiper(page, !wide));
    }
    const good = seen.every((v, i) => v !== null && Math.abs(v - spots[i][1]) < .09);
    check(good, `${label}: tapping the water sends her to that lane (left/top, middle, right/bottom)`, seen.map((v) => v && v.toFixed(2)).join(" "));

    // the Jump button still jumps
    const before = await page.evaluate(() => document.getElementById("raceCanvas").toDataURL());
    await page.locator("#jumpButton").tap();
    await frames(page, 30);
    check(before !== await page.evaluate(() => document.getElementById("raceCanvas").toDataURL()), `${label}: tapping Jump makes her jump`);
    check(page.errors.length === 0, `${label}: no console errors`, page.errors.join("|"));
    await page.context().close();
  }

  /* 2. Turning the phone during a swim: it re-fits, nothing breaks */
  {
    const page = await open(browser, { width: 430, height: 932 });
    await toSwim(page);
    const results = [];
    for (const size of [{ width: 932, height: 430 }, { width: 430, height: 932 }, { width: 932, height: 370 }]) {
      await page.setViewportSize(size);
      await page.waitForTimeout(500);
      await frames(page, 20);
      const r = await fits(page, ["#raceCanvas", "#jumpButton"]);
      results.push(r.bad.length === 0 && r.scroll <= 1);
    }
    check(results.every(Boolean) && page.errors.length === 0, "turning the phone back and forth in the middle of a swim keeps everything on screen", `${results.join(",")} ${page.errors.join("|")}`);
    await page.context().close();
  }

  /* 3. The meeting with Violet, held wide */
  for (const [label, viewport] of [["wide (installed app)", { width: 932, height: 430 }], ["wide (Safari)", { width: 932, height: 370 }], ["upright", { width: 430, height: 932 }]]) {
    const page = await open(browser, viewport);
    await page.evaluate(() => {
      document.querySelectorAll(".screen").forEach((el) => el.classList.add("hidden"));
      document.getElementById("meetScreen").classList.remove("hidden");
      document.getElementById("meetHi").classList.remove("hidden");
      document.getElementById("meetSay").textContent = "Hi, Piper! I'm Violet! 💗";
    });
    const r = await fits(page, [".meet-banner", "#meetCanvas", "#meetSay", "#meetHi"]);
    const hi = await page.locator("#meetHi").boundingBox();
    check(r.bad.length === 0 && r.scroll <= 1 && hi.height >= 88, `Meet Violet, ${label}: everything fits and Say hi! is 88 px or larger`, `${r.bad.join(" ; ")} scroll=${r.scroll} hi=${Math.round(hi.height)}`);
    await page.context().close();
  }

  /* 4. Other screens on a wide phone scroll if they must but never spill sideways; iPad and computers keep their buttons */
  {
    const page = await open(browser, { width: 932, height: 430 });
    const out = [];
    const side = async (screen) => { const r = await fits(page, ["body"]); if (r.sideways > 1) out.push(`${screen}: ${r.sideways}px sideways`); };
    await side("map");
    await page.click("#shopButton"); await page.waitForTimeout(300); await side("shop");
    await page.locator('.hat-card[data-id="party-hat"] .hat-act').tap(); await page.waitForSelector("#payOverlay:not(.hidden)"); await side("counter");
    check(out.length === 0 && page.errors.length === 0, "wide phone: map, hat shop and counter never spill sideways", out.join(";") + page.errors.join("|"));
    await page.context().close();
  }
  for (const [label, viewport, touch] of [["iPad portrait", { width: 820, height: 1180 }, true], ["iPad landscape", { width: 1180, height: 820 }, true], ["computer", { width: 1280, height: 800 }, false]]) {
    const page = await open(browser, viewport, { touch });
    await toSwim(page);
    const sizes = await page.evaluate(() => ["moveUp", "moveDown"].map((id) => { const e = document.getElementById(id), r = e.getBoundingClientRect(); return getComputedStyle(e).display === "none" ? 0 : Math.round(Math.min(r.width, r.height)); }));
    check(sizes.every((n) => n >= 64), `${label}: keeps its steering buttons (64 px or larger)`, sizes.join(","));
    const portrait = viewport.height > viewport.width;
    if (touch) {
      const box = await page.locator("#raceCanvas").boundingBox();
      await page.touchscreen.tap(portrait ? box.x + box.width * .85 : box.x + box.width * .5, portrait ? box.y + box.height * .5 : box.y + box.height * .85);
      await frames(page, 45);
      const v = await whereIsPiper(page, portrait);
      check(v !== null && Math.abs(v - .75) < .09, `${label}: tapping the water works here too`, String(v));
    }
    await page.context().close();
  }

  await browser.close();
  server.close();
  console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll checks passed");
  process.exit(failures ? 1 : 0);
})();
