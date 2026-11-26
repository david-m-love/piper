// Phase 1 checks: the math-screen dolphin flips on right answers.   node tests/phase1.cjs
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const fx = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "v2-save.json"), "utf8"));
const saved = JSON.stringify({ ...fx, facts: {} });
let failures = 0;
const check = (ok, label, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : `  -> ${detail}`}`); if (!ok) failures++; };

const deterministic = () => {
  let clock = 1000, queue = [];
  performance.now = () => clock;
  window.requestAnimationFrame = (cb) => { queue.push(cb); return queue.length; };
  window.__step = (ms) => { clock += ms; const run = queue; queue = []; run.forEach((cb) => cb(clock)); };
};

// Looks at the mascot canvas: bounding box of everything drawn, and where the (pure white) eye is.
const inspect = () => {
  const c = document.getElementById("mascot"), g = c.getContext("2d"), { data } = g.getImageData(0, 0, c.width, c.height);
  let minX = 1e9, minY = 1e9, maxX = -1, maxY = -1, ex = 0, ey = 0, en = 0;
  for (let i = 0; i < data.length; i += 4) {
    const x = (i / 4) % c.width, y = Math.floor(i / 4 / c.width);
    if (data[i + 3] > 8) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    if (data[i] > 250 && data[i + 1] > 250 && data[i + 2] > 250 && data[i + 3] === 255) { ex += x; ey += y; en++; }
  }
  return { minX, minY, maxX, maxY, w: c.width, h: c.height, eye: en ? [ex / en, ey / en] : null };
};

async function run(browser, reducedMotion) {
  const context = await browser.newContext({ viewport: { width: 1100, height: 800 }, reducedMotion: reducedMotion ? "reduce" : "no-preference" });
  await context.addInitScript(deterministic);
  await context.addInitScript((v) => { if (!localStorage.getItem("__s")) { localStorage.setItem("piperDolphinMath2", v); localStorage.setItem("__s", "1"); } }, saved);
  const page = await context.newPage();
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`file://${ROOT}/index.html?input=choices`);
  await page.locator(".island").nth(4).click();
  const flips = [];
  for (let answer = 1; answer <= 4; answer++) {
    await page.waitForSelector(".answer-button:not([disabled])");
    await page.evaluate(() => window.__step(16));
    const base = await page.evaluate(inspect);
    const [a, b] = (await page.textContent("#equation")).match(/\d+/g).map(Number);
    await page.locator(".answer-button", { hasText: new RegExp(`^${a + b}$`) }).click();
    const frames = [];
    for (let ms = 0; ms <= 1300; ms += 50) {
      await page.evaluate(() => window.__step(50));
      frames.push({ ms: ms + 50, ...(await page.evaluate(inspect)) });
    }
    flips.push({ base, frames });
    await page.waitForTimeout(1900); // the real pause before the next question
  }
  const stats = JSON.parse(await page.evaluate(() => localStorage.getItem("piperDolphinMath2"))).stats;
  await context.close();
  return { flips, stats, errors };
}

(async () => {
  const browser = await chromium.launch();
  const normal = await run(browser, false);
  const calm = await run(browser, true);

  const all = normal.flips.flatMap((f) => f.frames);
  const clipped = all.filter((f) => f.minX <= 0 || f.minY <= 0 || f.maxX >= f.w - 1 || f.maxY >= f.h - 1);
  check(clipped.length === 0, "the dolphin is never cut off by the picture edge during any flip", clipped.slice(0, 2).map((f) => `${f.ms}ms [${f.minX},${f.minY}-${f.maxX},${f.maxY}]`).join(" "));

  // Direction: an early frame of a front flip has the eye lower than at rest, a back flip higher.
  const early = (n) => normal.flips[n].frames.find((f) => f.ms === 150);
  const dy = (n) => early(n).eye[1] - normal.flips[n].base.eye[1];
  check(dy(0) > 10 && dy(1) < -10 && dy(2) > 10, "front and back flips take turns (front, back, front)", [0, 1, 2].map((n) => Math.round(dy(n))).join(","));

  // Length: single flip is done by ~650 ms, the double by ~1000 ms, and the dolphin is upright again after.
  const endX = (n, ms) => Math.abs(normal.flips[n].frames.find((f) => f.ms === ms).eye[0] - normal.flips[n].base.eye[0]);
  check(endX(0, 700) < 2 && endX(1, 700) < 2, "a single flip is complete (upright again) by 0.7 s", `${endX(0, 700).toFixed(1)} ${endX(1, 700).toFixed(1)}`);
  const mid = normal.flips[2].frames.find((f) => f.ms === 700);
  check(Math.abs(mid.eye[0] - normal.flips[2].base.eye[0]) > 5 || Math.abs(mid.eye[1] - normal.flips[2].base.eye[1]) > 10, "the 3rd right answer in a row is still turning at 0.7 s (double flip)");
  check(endX(2, 1050) < 2, "the double flip is complete by about 1 s, inside the 1.7 s pause", endX(2, 1050).toFixed(1));
  check(normal.flips[3].frames.find((f) => f.ms === 700).eye && endX(3, 700) < 2, "the 4th answer goes back to a single flip");
  check(normal.stats.flips === 5, "flips are counted in stats (1 + 1 + 2 + 1)", String(normal.stats.flips));

  // Reduced motion: still hops, but does not turn over or shrink.
  const calmFrames = calm.flips.flatMap((f) => f.frames);
  const eyeDrift = Math.max(...calm.flips.map((f) => Math.max(...f.frames.map((fr) => Math.abs(fr.eye[0] - f.base.eye[0])))));
  const calmClipped = calmFrames.filter((f) => f.minX <= 0 || f.minY <= 0 || f.maxX >= f.w - 1 || f.maxY >= f.h - 1);
  check(eyeDrift < 3 && calmClipped.length === 0, "with reduced motion the dolphin hops without turning over", `drift=${eyeDrift.toFixed(1)}`);
  check(normal.errors.length + calm.errors.length === 0, "no console errors", [...normal.errors, ...calm.errors].join("|"));
  await browser.close();
  console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll checks passed");
  process.exit(failures ? 1 : 0);
})();
