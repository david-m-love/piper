(() => {
  "use strict";

  const COLORS = [
    { name: "Pink", value: "#ff62a3", filter: "hue-rotate(112deg) saturate(1.5)" },
    { name: "Blue", value: "#26a7e8", filter: "none" },
    { name: "Purple", value: "#8b67e8", filter: "hue-rotate(55deg) saturate(1.25)" },
    { name: "Green", value: "#2fd3a5", filter: "hue-rotate(290deg) saturate(1.2)" },
    { name: "Orange", value: "#ff9a45", filter: "hue-rotate(175deg) saturate(1.5)" },
    { name: "Yellow", value: "#ffd447", filter: "hue-rotate(190deg) saturate(1.6)" }
  ];

  // A fact counts as "learned" after GOAL right answers in a row on the first try; learn them all to unlock the next area.
  const GOAL = 2;
  const ROUND_LENGTH = 6;
  const RACE_SECONDS = 25;

  /* ---------- content shape: themes, fact sets, areas, worlds ----------
     Piper's worlds (look, scenery) and David's math (fact sets) are separate on purpose:
       THEMES     what a place looks like in the race (water, reef, scenery layers, obstacle)
       FACT_SETS  which facts are practiced
       AREAS      one stop on the map: a theme + a fact set. Progress is saved by the area's id, never by its position
       WORLDS     a group of areas (only Sunny Sea exists so far)
     Never reuse or rename an id: saves point at them. */

  // Today's eight islands look exactly as before: each keeps all the scenery the earlier ones had. Layer names are explained at SCENERY.
  const THEMES = [
    { id: "sunny-sea", name: "Sunny Sea", emoji: "🌊", water: ["#b8fcff", "#20d4eb", "#0797ce", "#034f98"], reef: ["#ff668a", "#734fd1", "#17bb92"], scenery: ["fish"], obstacle: "jelly", fish: { count: 13, colored: false }, rays: { count: 8, spacing: 155, alpha: .13 }, hoop: { color: "#ffdb39", glow: 14 } },
    { id: "bubble-bay", name: "Bubble Bay", emoji: "🏝️", water: ["#b8fcff", "#20d4eb", "#0797ce", "#034f98"], reef: ["#ff668a", "#734fd1", "#17bb92"], scenery: ["fish"], obstacle: "jelly", fish: { count: 13, colored: false }, rays: { count: 8, spacing: 155, alpha: .13 }, hoop: { color: "#ffdb39", glow: 14 } },
    { id: "coral-cove", name: "Coral Cove", emoji: "🐠", water: ["#c9fff2", "#2fe0c8", "#07a9b8", "#046f8f"], reef: ["#ff7a59", "#ff4f9a", "#17bb92"], scenery: ["fish"], obstacle: "jelly", fish: { count: 16, colored: true }, rays: { count: 8, spacing: 155, alpha: .13 }, hoop: { color: "#ffdb39", glow: 14 } },
    { id: "shell-shore", name: "Shell Shore", emoji: "🐚", water: ["#ffe9c9", "#4fd9e6", "#0c9ad0", "#05549a"], reef: ["#ffb347", "#ff668a", "#e6c27a"], scenery: ["fish", "chests"], obstacle: "jelly", fish: { count: 19, colored: true }, rays: { count: 8, spacing: 155, alpha: .13 }, hoop: { color: "#ffdb39", glow: 14 } },
    { id: "kelp-forest", name: "Kelp Forest", emoji: "🌿", water: ["#d3ffc9", "#3fd6b0", "#0a9a9f", "#065a78"], reef: ["#2fbf71", "#7ed957", "#1b8f5a"], scenery: ["fish", "kelp", "chests"], obstacle: "jelly", fish: { count: 22, colored: true }, rays: { count: 8, spacing: 155, alpha: .13 }, hoop: { color: "#ffdb39", glow: 14 } },
    { id: "pirate-wreck", name: "Pirate Wreck", emoji: "🚢", water: ["#b8e8ff", "#2aa9e8", "#0b6fb8", "#06336f"], reef: ["#c9a46b", "#e8c98c", "#4f6a73"], scenery: ["ship", "fish", "kelp", "chests"], obstacle: "jelly", fish: { count: 25, colored: true }, rays: { count: 8, spacing: 155, alpha: .13 }, hoop: { color: "#ffdb39", glow: 14 } },
    { id: "rainbow-reef", name: "Rainbow Reef", emoji: "🌈", water: ["#ffd9f0", "#7fd2ff", "#27a0e6", "#0a56b8"], reef: ["#ff6bd6", "#7a6cff", "#35dfa0"], scenery: ["rainbow", "ship", "fish", "kelp", "chests"], obstacle: "jelly", fish: { count: 28, colored: true }, rays: { count: 11, spacing: 112, alpha: .2 }, hoop: { color: "#ffdb39", glow: 14 } },
    { id: "glow-grotto", name: "Glow Grotto", emoji: "🦑", water: ["#6fb8ff", "#2a6fe0", "#1a2f9a", "#0c1459"], reef: ["#7af0ff", "#b57aff", "#2d3ea8"], scenery: ["rainbow", "ship", "fish", "glow", "kelp", "chests"], obstacle: "jelly", fish: { count: 31, colored: true }, rays: { count: 11, spacing: 112, alpha: .2 }, hoop: { color: "#ffdb39", glow: 14 } },
    { id: "dolphin-palace", name: "Dolphin Palace", emoji: "🏰", water: ["#fff2b8", "#52e0e8", "#1aa0dd", "#0a4fa0"], reef: ["#ffd447", "#ff8fd1", "#ffe28a"], scenery: ["rainbow", "palace", "ship", "fish", "glow", "kelp", "chests"], obstacle: "jelly", fish: { count: 34, colored: true }, rays: { count: 11, spacing: 112, alpha: .2 }, hoop: { color: "#ffc400", glow: 26 } }
  ];

  // Today's eight fact lists, unchanged. (David assigns new ones later; "placeholder" is a mixed review of every earlier area.)
  const FACT_SETS = [
    { id: "add-to-4", label: "Adding up to 4", facts: [[1, 1], [1, 2], [2, 1], [1, 3], [3, 1], [2, 2]] },
    { id: "add-to-5", label: "Adding up to 5", facts: [[1, 4], [4, 1], [2, 3], [3, 2]] },
    { id: "plus-1", label: "Plus 1", facts: [[5, 1], [6, 1], [7, 1], [8, 1], [9, 1]] },
    { id: "plus-2", label: "Plus 2", facts: [[2, 4], [2, 5], [2, 6], [2, 7], [2, 8]] },
    { id: "doubles", label: "Doubles", facts: [[3, 3], [4, 4], [5, 5]] },
    { id: "add-to-7", label: "Adding up to 7", facts: [[3, 4], [4, 3], [2, 5], [5, 2], [1, 6]] },
    { id: "add-to-9", label: "Adding up to 9", facts: [[4, 5], [5, 4], [3, 6], [6, 3], [7, 2], [1, 8]] },
    { id: "make-10", label: "Make 10!", facts: [[1, 9], [9, 1], [2, 8], [8, 2], [3, 7], [7, 3], [4, 6], [6, 4], [5, 5]] },
    { id: "placeholder", label: "Mixed review", facts: null }
  ];

  const AREAS = [
    { id: "bubble-bay", worldId: "sunny-sea", name: "Bubble Bay", sub: "Adding up to 4", emoji: "🏝️", theme: "bubble-bay", factSet: "add-to-4" },
    { id: "coral-cove", worldId: "sunny-sea", name: "Coral Cove", sub: "Adding up to 5", emoji: "🐠", theme: "coral-cove", factSet: "add-to-5" },
    { id: "shell-shore", worldId: "sunny-sea", name: "Shell Shore", sub: "Plus 1", emoji: "🐚", theme: "shell-shore", factSet: "plus-1" },
    { id: "kelp-forest", worldId: "sunny-sea", name: "Kelp Forest", sub: "Plus 2", emoji: "🌿", theme: "kelp-forest", factSet: "plus-2" },
    { id: "pirate-wreck", worldId: "sunny-sea", name: "Pirate Wreck", sub: "Doubles", emoji: "🚢", theme: "pirate-wreck", factSet: "doubles" },
    { id: "rainbow-reef", worldId: "sunny-sea", name: "Rainbow Reef", sub: "Adding up to 7", emoji: "🌈", theme: "rainbow-reef", factSet: "add-to-7" },
    { id: "glow-grotto", worldId: "sunny-sea", name: "Glow Grotto", sub: "Adding up to 9", emoji: "🦑", theme: "glow-grotto", factSet: "add-to-9" },
    { id: "dolphin-palace", worldId: "sunny-sea", name: "Dolphin Palace", sub: "Make 10!", emoji: "🏰", theme: "dolphin-palace", factSet: "make-10" }
  ];

  const WORLDS = [
    { id: "sunny-sea", name: "Sunny Sea", theme: "sunny-sea", areas: AREAS.map((area) => area.id) }
  ];

  // The v2 save kept progress by position in the old island list. This frozen order is used only to migrate those saves.
  const V2_ISLAND_ORDER = ["bubble-bay", "coral-cove", "shell-shore", "kelp-forest", "pirate-wreck", "rainbow-reef", "glow-grotto", "dolphin-palace"];

  const byId = (list) => Object.fromEntries(list.map((item) => [item.id, item]));
  const THEME_BY_ID = byId(THEMES);
  const FACT_SET_BY_ID = byId(FACT_SETS);

  const themeOf = (area) => THEME_BY_ID[area.theme] || THEME_BY_ID["sunny-sea"];
  // The facts practiced in an area. A "placeholder" set reviews everything from the areas before it.
  function factsOf(area) {
    const set = FACT_SET_BY_ID[area.factSet];
    if (set && set.facts) return set.facts;
    return AREAS.slice(0, AREAS.indexOf(area)).flatMap(factsOf);
  }

  const FISH_COLORS = ["#ffd447", "#ff8a5c", "#ff62a3", "#9ef0ff", "#b9ff8a"];

  const PRAISE = ["Great job!", "You got it!", "Awesome!", "Super swimmer!", "Splashtastic!", "Amazing!", "Yes! That's right!", "Wow, so smart!"];
  const OOPS = ["Almost! Let's count together.", "Good try! Count with me.", "Nice thinking! Let's count it."];
  const KEEP = ["You can do it! Tap the glowing one.", "Keep going, you're so close!", "I believe in you! Try the glowing one."];

  const $ = (id) => document.getElementById(id);
  const pick = (items) => items[Math.floor(Math.random() * items.length)];
  const screens = ["startScreen", "mapScreen", "mathScreen", "raceScreen", "finishScreen", "shopScreen", "treasuresScreen", "theaterScreen"]; // theaterScreen arrives in a later phase
  const canvas = $("raceCanvas");
  const ctx = canvas.getContext("2d");
  const mascotCanvas = $("mascot");
  const mctx = mascotCanvas.getContext("2d");
  let VIEW_W = 1100; // length of the swim (forward); VIEW_H is the width across the lanes
  let portrait = false;
  const VIEW_H = 620;
  const PIXEL_RATIO = Math.min(2, window.devicePixelRatio || 1);

  // Phones held upright get a vertical race: the same scene turned a quarter turn, so the dolphin swims up the screen
  // and the lanes run left to right. Everywhere else it is the usual sideways swim.
  function layoutRace() {
    portrait = window.innerHeight > window.innerWidth;
    const wrap = canvas.parentElement;
    if (portrait) {
      const width = Math.min(window.innerWidth - 20, 620);
      wrap.style.maxWidth = `${width}px`;
      const top = wrap.getBoundingClientRect().top;
      const room = Math.max(320, window.innerHeight - top - 125);
      VIEW_W = Math.max(800, Math.min(1500, Math.round(VIEW_H * room / width)));
      canvas.style.aspectRatio = `${VIEW_H} / ${VIEW_W}`;
      canvas.width = Math.round(VIEW_H * PIXEL_RATIO);
      canvas.height = Math.round(VIEW_W * PIXEL_RATIO);
    } else {
      wrap.style.maxWidth = "";
      VIEW_W = 1100;
      canvas.style.aspectRatio = "";
      canvas.width = Math.round(VIEW_W * PIXEL_RATIO);
      canvas.height = Math.round(VIEW_H * PIXEL_RATIO);
    }
    $("moveUp").textContent = portrait ? "◀" : "▲";
    $("moveDown").textContent = portrait ? "▶" : "▼";
    $("moveUp").setAttribute("aria-label", portrait ? "Swim left" : "Swim up");
    $("moveDown").setAttribute("aria-label", portrait ? "Swim right" : "Swim down");
  }

  function applyView() {
    ctx.setTransform(PIXEL_RATIO, 0, 0, PIXEL_RATIO, 0, 0);
    if (portrait) { ctx.translate(0, VIEW_W); ctx.rotate(-Math.PI / 2); }
  }

  /* ---------- saving (profile v3) ----------
     piperDolphinMath2            the profile (same key as always)
     piperDolphinMath2_backup_v2  raw copy of the old v2 save, written once before it is migrated
     piperDolphinLog              the attempt log (see below), kept apart so the profile stays small */

  const SAVE_KEY = "piperDolphinMath2";
  const SAVE_VERSION = 3;
  const BACKUP_V2_KEY = "piperDolphinMath2_backup_v2";
  const BACKUP_UNREADABLE_KEY = "piperDolphinMath2_backup_unreadable";
  const BACKUP_BEFORE_RESET_KEY = "piperDolphinMath2_backup_before_reset";
  const LOG_KEY = "piperDolphinLog";

  function defaultProfile() {
    return {
      v: SAVE_VERSION,
      name: "Bubbles", color: 0, coins: 0, correct: 0, sound: true, music: true,
      facts: {}, // "3+4": { streak, right, wrong }
      done: {}, // by area id: { "bubble-bay": true }
      worldsUnlocked: ["sunny-sea"],
      hats: { owned: [], wearing: { me: null, violet: null } },
      friend: { met: false, name: "Violet", color: "#ff8fc8" },
      theater: { unlocked: false, visits: 0, moviesSeen: [] },
      stats: { swims: 0, rings: 0, flips: 0, rainbowBubbles: 0, payments: 0 },
      collection: { owned: [], seenNew: [], custom: [] },
      shop: { lastRefresh: null, featured: [] },
      stars: 0,
      starLog: [],
      playToday: { date: null, minutes: 0 }
    };
  }

  const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

  // Fill in anything missing (including inside nested objects). Stored values always win and unknown fields are kept.
  function withDefaults(defaults, stored) {
    const out = { ...stored };
    Object.keys(defaults).forEach((key) => {
      const fallback = defaults[key];
      if (out[key] === undefined || out[key] === null) out[key] = JSON.parse(JSON.stringify(fallback));
      else if (isPlainObject(fallback) && isPlainObject(out[key])) out[key] = withDefaults(fallback, out[key]);
    });
    return out;
  }

  // Best-effort copy of a raw save under another key. With onlyIfMissing it never overwrites an earlier copy.
  function backUp(key, raw, onlyIfMissing = false) {
    try {
      if (onlyIfMissing && localStorage.getItem(key) !== null) return true;
      localStorage.setItem(key, raw);
      return true;
    } catch (_) {
      return false;
    }
  }

  // v2 -> v3: done flags move from position (0, 1, 2...) to area id. Nothing is removed; new fields get defaults.
  function migrateToV3(stored, raw) {
    if (!backUp(BACKUP_V2_KEY, raw, true)) console.warn("Dolphin Dash: could not back up the old save before migrating it.");
    const done = {};
    Object.entries(isPlainObject(stored.done) ? stored.done : {}).forEach(([key, value]) => {
      const id = /^\d+$/.test(key) ? (V2_ISLAND_ORDER[Number(key)] || key) : key;
      done[id] = done[id] || value;
    });
    const migrated = withDefaults(defaultProfile(), { ...stored, done, v: SAVE_VERSION });
    // Any hats already owned join the collection (addendum 1, section 4).
    if (Array.isArray(stored.hats?.owned)) {
      migrated.collection.owned = [...new Set([...migrated.collection.owned, ...stored.hats.owned])];
    }
    return migrated;
  }

  function loadProfile() {
    let raw = null;
    try { raw = localStorage.getItem(SAVE_KEY); } catch (_) { return defaultProfile(); }
    if (raw === null) return defaultProfile();
    let stored = null;
    try { stored = JSON.parse(raw); } catch (_) { /* handled below */ }
    if (!isPlainObject(stored)) {
      backUp(BACKUP_UNREADABLE_KEY, raw); // keep what we could not read, since the next save would overwrite it
      return defaultProfile();
    }
    if (!(stored.v >= SAVE_VERSION)) {
      const migrated = migrateToV3(stored, raw);
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(migrated)); } catch (_) { /* saved again on the next change */ }
      return migrated;
    }
    return withDefaults(defaultProfile(), stored);
  }

  function saveProfile() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(game.profile)); } catch (_) { /* Saving is best effort. */ }
  }

  /* ---------- attempt log (math track, step M0) ----------
     One entry for every answer she gives (right or wrong), kept for the parent report and for tuning.
     { t, session, factId, family, op, mode, rtRaw, rtAdj, correct, firstTry, hint, context, timing }
       t        when (ms since 1970)           session  a play period; a new one starts after 15 idle minutes
       factId   "3+4"                          family   the same for 3+4 and 4+3 ("3+4")
       op       "add"                          mode     "choice" | "pad" | "typed"
       rtRaw    ms from the question appearing to her answer (it still includes the dolphin reading the question aloud)
       rtAdj    ms after taking away her tap speed: null until the calibration step (M1) exists
       correct  this answer was right          firstTry this was her first answer to this question
       hint     the counting hint was already showing
       context  "practice" | "warmup" | "reef" | "placement" | "check" | "money"
       timing   how rtRaw was started: "shown" now; M1 switches it to "narrated" (after the narration ends)
       price, dragged, prompts, trades   only on "money" entries: the price, coins she put on the tray, gentle prompts she needed, gold coins traded
     The newest 20,000 are kept. */

  const LOG_MAX = 20000;
  const LOG_IDLE_MS = 15 * 60 * 1000;
  const LOG_COLUMNS = ["t", "session", "factId", "family", "op", "mode", "rtRaw", "rtAdj", "correct", "firstTry", "hint", "context", "timing", "price", "dragged", "prompts", "trades"];
  const attemptLog = { entries: null, session: null, lastT: 0, timer: 0 };

  function logEntries() {
    if (attemptLog.entries) return attemptLog.entries;
    let entries = [];
    try {
      const raw = localStorage.getItem(LOG_KEY);
      if (raw !== null) {
        let parsed = null;
        try { parsed = JSON.parse(raw); } catch (_) { /* handled below */ }
        if (Array.isArray(parsed)) entries = parsed;
        else backUp(`${LOG_KEY}_backup_unreadable`, raw);
      }
    } catch (_) { /* no storage: the log lives in memory only */ }
    attemptLog.entries = entries;
    const last = entries[entries.length - 1];
    if (last) { attemptLog.session = last.session; attemptLog.lastT = last.t; }
    return entries;
  }

  function logAttempt(fields) {
    const entries = logEntries();
    const t = Date.now();
    if (!attemptLog.session || t - attemptLog.lastT > LOG_IDLE_MS) attemptLog.session = `s${t.toString(36)}`;
    attemptLog.lastT = t;
    entries.push({
      t, session: attemptLog.session,
      factId: fields.factId, family: fields.family, op: fields.op, mode: fields.mode,
      rtRaw: fields.rtRaw, rtAdj: null,
      correct: fields.correct, firstTry: fields.firstTry, hint: fields.hint,
      context: fields.context || "practice", timing: "shown",
      // Paying in the shop is logged too (context "money"); it is kept out of fact-fluency scoring.
      ...(fields.price === undefined ? {} : { price: fields.price, dragged: fields.dragged, prompts: fields.prompts, trades: fields.trades })
    });
    if (entries.length > LOG_MAX) entries.splice(0, entries.length - LOG_MAX);
    // The log can be a few MB, so it is written a moment after the last answer (and when the page is hidden), not on every tap.
    clearTimeout(attemptLog.timer);
    attemptLog.timer = setTimeout(flushLog, 800);
  }

  function flushLog() {
    clearTimeout(attemptLog.timer);
    if (!attemptLog.entries) return;
    for (let tries = 0; tries < 2; tries++) {
      try { localStorage.setItem(LOG_KEY, JSON.stringify(attemptLog.entries)); return; } catch (_) {
        attemptLog.entries.splice(0, Math.ceil(attemptLog.entries.length / 4)); // storage full: drop the oldest quarter and try again
      }
    }
  }

  const csvCell = (value) => {
    const text = value === null || value === undefined ? "" : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  // No button yet: the export screen lives behind the grown-up gate, which is built with the parent area. Until then
  // these can be run from a browser console, e.g. DD.log.download("csv").
  window.DD = window.DD || {};
  DD.log = {
    count: () => logEntries().length,
    entries: () => logEntries().slice(),
    toJSON: () => JSON.stringify(logEntries(), null, 1),
    toCSV: () => [LOG_COLUMNS.join(","), ...logEntries().map((entry) => LOG_COLUMNS.map((column) => csvCell(entry[column])).join(","))].join("\n"),
    download(format = "json") {
      flushLog();
      const csv = format === "csv";
      const link = document.createElement("a");
      link.href = URL.createObjectURL(new Blob([csv ? DD.log.toCSV() : DD.log.toJSON()], { type: csv ? "text/csv" : "application/json" }));
      link.download = `dolphin-dash-log.${csv ? "csv" : "json"}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 4000);
    }
  };

  // A big, friendly button for new screens (64 px tall at least, 88 px for the main action).
  DD.ui = {
    bigButton({ label, icon = "", primary = false, onClick }) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `big-button${primary ? " primary" : ""}`;
      if (icon) {
        const art = document.createElement("span");
        art.className = "big-button-icon";
        art.setAttribute("aria-hidden", "true");
        art.textContent = icon;
        button.appendChild(art);
      }
      button.append(label);
      if (onClick) button.addEventListener("click", onClick);
      return button;
    }
  };

  const game = {
    profile: loadProfile(),
    selectedColor: 0,
    name: "Bubbles",
    sound: true,
    music: true,
    areaIndex: 0,
    questionIndex: 0,
    question: null,
    questionStarted: 0,
    attempts: 0,
    hintShown: false,
    mode: "choice",
    hintId: 0,
    locked: false,
    recent: [],
    boost: 0,
    streak: 0,
    bestStreak: 0,
    roundCoins: 0,
    justMastered: null,
    nextTimer: 0,
    race: null
  };
  game.selectedColor = Math.min(COLORS.length - 1, game.profile.color || 0);
  game.name = game.profile.name || "Bubbles";
  game.sound = game.profile.sound !== false;
  game.music = game.profile.music !== false;

  /* ---------- screens ---------- */

  function showScreen(id) {
    screens.forEach((screen) => $(screen)?.classList.toggle("hidden", screen !== id));
    window.scrollTo(0, 0);
    setMusicLevel(id === "mathScreen" ? .45 : 1);
  }

  function initColors() {
    COLORS.forEach((color, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "color-choice";
      button.style.background = color.value;
      button.setAttribute("role", "radio");
      button.setAttribute("aria-label", color.name);
      button.addEventListener("click", () => { selectColor(index); tone(420 + index * 40, .08); });
      $("colorPicker").appendChild(button);
    });
    selectColor(game.selectedColor);
    $("dolphinName").value = game.name;
    $("soundButton").textContent = game.sound ? "🔊" : "🔇";
    $("soundButton").setAttribute("aria-label", game.sound ? "Turn sound off" : "Turn sound on");
    updateMusicButton();
  }

  function selectColor(index) {
    game.selectedColor = index;
    document.querySelectorAll(".color-choice").forEach((choice, i) => {
      choice.classList.toggle("selected", i === index);
      choice.setAttribute("aria-checked", String(i === index));
    });
  }

  function startAdventure() {
    game.name = $("dolphinName").value.trim() || "Bubbles";
    game.profile.name = game.name;
    game.profile.color = game.selectedColor;
    saveProfile();
    showMap();
  }

  /* ---------- progress ---------- */

  const factKey = (a, b) => `${a}+${b}`;
  const factRecord = (a, b) => game.profile.facts[factKey(a, b)] || { streak: 0, right: 0, wrong: 0 };
  const isDone = (i) => Boolean(game.profile.done[AREAS[i].id]);
  const isUnlocked = (i) => i === 0 || isDone(i - 1);
  const areaProgress = (i) => factsOf(AREAS[i]).filter(([a, b]) => factRecord(a, b).streak >= GOAL).length;
  const currentArea = () => {
    const open = AREAS.findIndex((_, i) => isUnlocked(i) && !isDone(i));
    return open < 0 ? AREAS.length - 1 : open;
  };

  function showMap(afterRace = false) {
    $("mapTitle").textContent = `${game.name}'s adventure`;
    $("mapCoins").textContent = game.profile.coins;
    const banner = $("mapBanner");
    if (game.justMastered !== null) {
      const next = AREAS[game.justMastered + 1];
      banner.textContent = next
        ? `🎉 You mastered ${AREAS[game.justMastered].name}! ${next.name} is open!`
        : `🎉 You mastered ${AREAS[game.justMastered].name}!`;
      banner.classList.remove("hidden");
    } else if (afterRace) {
      banner.textContent = `Great swimming! You found ${game.roundCoins} coins!`;
      banner.classList.remove("hidden");
    } else {
      banner.classList.add("hidden");
    }
    const unlockedNow = game.justMastered;
    game.justMastered = null;
    renderMap(unlockedNow === null ? -1 : unlockedNow + 1);
    updateShopButton();
    showScreen("mapScreen");
    if (unlockedNow !== null) sparkle(8);
    const current = document.querySelector(".island.current");
    if (current) current.scrollIntoView({ block: "center" });
  }

  function renderMap(fresh) {
    const list = $("islandList");
    list.replaceChildren();
    const current = currentArea();
    AREAS.forEach((island, i) => {
      const facts = factsOf(island);
      const unlocked = isUnlocked(i);
      const done = isDone(i);
      const button = document.createElement("button");
      button.type = "button";
      button.disabled = !unlocked;
      button.className = `island${unlocked ? "" : " locked"}${done ? " done" : ""}${i === current ? " current" : ""}${i === fresh ? " fresh" : ""}`;
      const dots = facts.map(([a, b]) => `<i class="${done || factRecord(a, b).streak >= GOAL ? "on" : ""}"></i>`).join("");
      const status = !unlocked ? `Finish ${AREAS[i - 1].name} first` : done ? "⭐ Mastered!" : `${areaProgress(i)} of ${facts.length} facts learned`;
      button.innerHTML = `<span class="island-art">${unlocked ? island.emoji : "🔒"}${i === current ? `<canvas class="marker" width="112" height="88" aria-hidden="true"></canvas>` : ""}</span>` +
        `<span class="island-info"><strong>${i + 1}. ${island.name}</strong><small>${island.sub}</small><span class="fact-dots">${dots}</span><em>${status}</em></span>`;
      button.addEventListener("click", () => startIsland(i));
      const marker = button.querySelector("canvas.marker");
      if (marker) drawDolphin(marker.getContext("2d"), 66, 60, COLORS[game.selectedColor].value, .56, "happy", worn());
      list.appendChild(button);
    });
  }

  function resetProgress() {
    if (!window.confirm("Start over from the first island? Your math progress goes back to the start. Your coins, hats, treasures and friends are always kept.")) return;
    backUp(BACKUP_BEFORE_RESET_KEY, JSON.stringify(game.profile));
    // Only the math goes back to the start. Coins, hats, collection, Violet, stars and the theater are never touched.
    const fresh = defaultProfile();
    game.profile = { ...game.profile, facts: fresh.facts, done: fresh.done, correct: 0, worldsUnlocked: fresh.worldsUnlocked };
    saveProfile();
    game.justMastered = null;
    showMap();
  }

  /* ---------- math ---------- */

  function startIsland(i) {
    game.areaIndex = i;
    game.questionIndex = 0;
    game.streak = 0;
    game.recent = [];
    game.boost = 0;
    game.roundCoins = 0;
    $("mathDolphinName").textContent = game.name;
    $("mathCoins").textContent = game.profile.coins;
    $("islandLabel").textContent = AREAS[i].name.toUpperCase();
    showScreen("mathScreen");
    renderQuestion();
  }

  const weightOf = (record) => (record.streak >= GOAL ? 1 : 4 - record.streak + (record.wrong > record.right ? 2 : 0));

  function chooseQuestion() {
    let facts = factsOf(AREAS[game.areaIndex]);
    // Now and then, revisit facts from earlier islands so nothing gets forgotten.
    if (game.areaIndex > 0 && Math.random() < .2) facts = AREAS.slice(0, game.areaIndex).flatMap(factsOf);
    let options = facts.filter(([a, b]) => !game.recent.includes(factKey(a, b)));
    if (!options.length) options = facts;
    const weighted = options.flatMap(([a, b]) => Array(weightOf(factRecord(a, b))).fill([a, b]));
    const [a, b] = pick(weighted);
    game.recent = [...game.recent, factKey(a, b)].slice(-2);
    const answer = a + b;
    return { a, b, answer, choices: shuffle([answer, ...makeDistractors(a, b, answer)]) };
  }

  // Three wrong answers (all within 0-10): common slips first (one off, only one number counted), then other near misses.
  function makeDistractors(a, b, answer) {
    const wrong = new Set();
    const consider = (n) => { if (n >= 0 && n <= 10 && n !== answer && wrong.size < 3) wrong.add(n); };
    shuffle([answer - 1, answer + 1, Math.max(a, b)]).forEach(consider);
    shuffle([answer - 2, answer + 2, answer - 3, answer + 3, answer + 4]).forEach(consider);
    for (let n = 0; n <= 10; n++) consider(n);
    return [...wrong];
  }

  // Phones and iPads get big answer buttons; a computer with a mouse and keyboard has her type the number.
  function useKeyboard() {
    const forced = new URLSearchParams(location.search).get("input");
    if (forced === "keys") return true;
    if (forced === "choices") return false;
    return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  }

  function renderQuestion() {
    const q = game.question = chooseQuestion();
    game.attempts = 0;
    game.hintShown = false;
    game.locked = false;
    game.hintId += 1;
    game.questionStarted = performance.now();
    $("questionCounter").textContent = `Question ${game.questionIndex + 1} of ${ROUND_LENGTH}`;
    $("equation").textContent = `${q.a} + ${q.b} = ?`;
    renderTokens(q);
    say("How many in all?", `${q.a} plus ${q.b}. How many in all?`);
    setMascot("idle");

    $("answers").replaceChildren();
    const typing = useKeyboard();
    game.mode = typing ? "typed" : "choice";
    $("answers").classList.toggle("hidden", typing);
    $("typeAnswer").classList.toggle("hidden", !typing);
    if (typing) {
      const input = $("answerInput");
      input.value = "";
      input.placeholder = "";
      input.disabled = false;
      input.className = "";
      input.focus();
    } else {
      q.choices.forEach((value) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "answer-button";
        button.textContent = value;
        button.addEventListener("click", () => checkAnswer(value, button));
        $("answers").appendChild(button);
      });
    }
    renderDots();
    animateBoostTimer();
    startMascot();
  }

  function renderTokens(q) {
    const tokens = $("tokens");
    tokens.replaceChildren();
    const group = (count, kind) => {
      const wrap = document.createElement("span");
      wrap.className = "token-group";
      for (let i = 0; i < count; i++) {
        const token = document.createElement("span");
        token.className = `token ${kind}`;
        wrap.appendChild(token);
      }
      return wrap;
    };
    const plus = document.createElement("span");
    plus.className = "plus";
    plus.textContent = "+";
    tokens.append(group(q.a, "a"), plus, group(q.b, "b"));
  }

  function renderDots() {
    $("questionDots").replaceChildren();
    for (let i = 0; i < ROUND_LENGTH; i++) {
      const dot = document.createElement("span");
      dot.className = `question-dot${i < game.questionIndex ? " done" : i === game.questionIndex ? " current" : ""}`;
      $("questionDots").appendChild(dot);
    }
  }

  // The boost bar drains quickly at first, then slows to a crawl and never runs out: no pressure, just a little bonus for being quick.
  function animateBoostTimer() {
    const startedFor = game.questionStarted;
    const tick = () => {
      if (game.questionStarted !== startedFor || $("mathScreen").classList.contains("hidden")) return;
      const p = Math.min(1, (performance.now() - startedFor) / 25000);
      const remaining = 1 - .65 * (1 - (1 - p) * (1 - p));
      $("boostFill").style.width = `${remaining * 100}%`;
      $("boostText").textContent = remaining > .75 ? "Super fast!" : remaining > .45 ? "Nice and steady!" : "Take your time!";
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function checkAnswer(value, el) {
    if (game.locked || !game.question || el.disabled) return;
    const q = game.question;
    const key = factKey(q.a, q.b);
    const record = game.profile.facts[key] || (game.profile.facts[key] = { streak: 0, right: 0, wrong: 0 });
    const typed = el === $("answerInput");

    logAttempt({
      factId: key, family: `${Math.min(q.a, q.b)}+${Math.max(q.a, q.b)}`, op: "add", mode: game.mode,
      rtRaw: Math.round(performance.now() - game.questionStarted),
      correct: value === q.answer, firstTry: game.attempts === 0, hint: game.hintShown
    });

    if (value !== q.answer) {
      game.attempts += 1;
      if (game.attempts === 1) { record.wrong += 1; record.streak = 0; game.streak = 0; }
      el.classList.add("try-again");
      if (typed) {
        setTimeout(() => { el.classList.remove("try-again"); el.value = ""; }, 350);
      } else {
        el.disabled = true;
        el.classList.add("ruled-out");
      }
      oops();
      setMascot("oops");
      if (game.attempts === 1) {
        startCount(say(pick(OOPS)));
      } else {
        say(pick(KEEP));
        glowAnswer();
      }
      saveProfile();
      return;
    }

    game.locked = true;
    game.hintId += 1; // stops any counting hint that is still playing
    const firstTry = game.attempts === 0;
    const seconds = (performance.now() - game.questionStarted) / 1000;
    document.querySelectorAll(".answer-button").forEach((item) => { item.disabled = true; item.classList.remove("hint"); });
    $("answerInput").disabled = true;
    el.classList.add("correct");
    if (firstTry) {
      record.streak += 1;
      record.right += 1;
      game.streak += 1;
      game.bestStreak = Math.max(game.bestStreak, game.streak);
      game.boost += Math.max(.5, 1.6 - seconds / 10);
    } else {
      game.boost += .4;
    }
    game.profile.correct += 1;
    game.profile.facts[key] = record;

    let praise = pick(PRAISE);
    if (!firstTry) praise = "You did it! Mistakes help us learn!";
    else if (game.streak === 3 || game.streak === 5 || game.streak === 8) praise = `${game.streak} in a row! You're on fire!`;
    else if (Math.random() < .3) praise = `${praise.replace(/[!.]$/, "")}, ${game.name}!`;

    const island = AREAS[game.areaIndex];
    if (!isDone(game.areaIndex) && areaProgress(game.areaIndex) === factsOf(island).length) {
      game.profile.done[island.id] = true;
      game.justMastered = game.areaIndex;
      praise = `You mastered ${island.name}! Hooray!`;
    }
    mascotFlip(firstTry && game.streak > 0 && game.streak % 3 === 0);
    saveProfile();
    say(praise);
    burstStars();
    if (game.justMastered === game.areaIndex) fanfare(); else { chirp(); sparkle(4); }
    game.nextTimer = setTimeout(() => {
      game.questionIndex += 1;
      if (game.justMastered !== null || game.questionIndex >= ROUND_LENGTH) startRaceRound(); else renderQuestion();
    }, game.justMastered !== null ? 2300 : 1700);
  }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Count the pieces one at a time with her dolphin, then point at the right answer.
  // Each piece lights up, plays its note, and the NEXT one waits until her dolphin has finished saying the number, so the
  // voice and the glowing pieces stay together however slowly the device speaks. With sound off it uses fixed timing.
  async function startCount(narration = Promise.resolve()) {
    const id = ++game.hintId;
    game.hintShown = true;
    const q = game.question;
    const tokens = [...document.querySelectorAll("#tokens .token")];
    tokens.forEach((token) => { token.classList.remove("counted"); delete token.dataset.n; });
    const alive = () => game.hintId === id;
    const voiced = () => game.sound && "speechSynthesis" in window;
    await narration; // "Almost! Let's count together." finishes first
    await sleep(voiced() ? 350 : 1100);
    for (let i = 0; i < tokens.length; i++) {
      if (!alive()) return;
      tokens[i].classList.add("counted");
      tokens[i].dataset.n = i + 1;
      note(SCALE[Math.min(i, SCALE.length - 1)], 0, .3, "triangle", .07);
      if (voiced()) await speak(String(i + 1), true);
      await sleep(voiced() ? 250 : 700);
    }
    if (!voiced()) await sleep(150);
    if (!alive()) return;
    say(`${q.a} plus ${q.b} makes ${q.answer}!`, undefined, true);
    glowAnswer();
  }

  function glowAnswer() {
    const q = game.question;
    document.querySelectorAll(".answer-button").forEach((button) => {
      if (Number(button.textContent) === q.answer) button.classList.add("hint");
    });
    if (!$("typeAnswer").classList.contains("hidden")) $("answerInput").placeholder = String(q.answer);
  }

  function leaveToMap() {
    clearTimeout(game.nextTimer);
    game.hintId += 1;
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    showMap();
  }

  /* ---------- hats ----------
     Every hat is drawn in code. Its art is drawn around (0, 0), the point on top of the head where it sits, about 60 wide,
     with its bottom edge near y = 0. drawDolphin puts that point on the head and tilts it to follow the forehead. */

  const ECONOMY = {
    goldValue: 10, // one gold coin is worth ten regular coins (display only: the save stores a single number)
    hatPrice: { common: 20, fancy: 45 },
    hatShopOpensAfterAreas: 1, // areas mastered before the hat shop opens
    priceTagPictureUntil: 3 // the price tag shows its coins as a picture until she has paid this many times
  };

  const HEAD = { x: 21, y: -30, tilt: .18 }; // where hats sit on the dolphin, in drawDolphin's own units

  const HAT_ART = {
    "flower-crown"(c) {
      // A full ring of flowers around the head, seen from a little above: the far side peeks up behind, the near side dips over the forehead.
      const petals = ["#ff8fc8", "#ffe14d", "#ffffff", "#c9a6ff", "#ff9a7a"];
      const flower = (x, y, r, i) => {
        c.fillStyle = petals[i % petals.length];
        for (let k = 0; k < 5; k++) { const a = k * 1.2566; c.beginPath(); c.arc(x + Math.cos(a) * r * .72, y + Math.sin(a) * r * .72, r * .6, 0, 7); c.fill(); }
        c.fillStyle = "#ffb300"; c.beginPath(); c.arc(x, y, r * .42, 0, 7); c.fill();
      };
      const cy = -5, rx = 31, ry = 11, count = 8;
      c.lineCap = "round"; c.strokeStyle = "#1f9a5f"; c.lineWidth = 6;
      c.beginPath(); c.ellipse(0, cy, rx, ry, 0, 0, Math.PI * 2); c.stroke();
      [false, true].forEach((front) => {
        for (let i = 0; i < count; i++) {
          const a = (i + .5) / count * Math.PI * 2, y = cy + Math.sin(a) * ry;
          if ((Math.sin(a) > 0) !== front) continue;
          c.fillStyle = "#2fbf71"; c.beginPath(); c.ellipse(Math.cos(a + .4) * rx, cy + Math.sin(a + .4) * ry, 7, 3.2, a + .4, 0, 7); c.fill();
          flower(Math.cos(a) * rx, y, front ? 8.5 : 6.5, i);
        }
      });
    },
    "violet-sparkle"(c, t) {
      c.fillStyle = "#7a3fd1"; c.beginPath(); c.ellipse(0, -1, 36, 9, 0, 0, 7); c.fill();
      c.fillStyle = "#9a5cf0"; c.beginPath(); c.moveTo(-22, -3); c.lineTo(-18, -46); c.quadraticCurveTo(0, -54, 18, -46); c.lineTo(22, -3); c.closePath(); c.fill();
      c.fillStyle = "#ff8fd1"; c.fillRect(-21, -15, 42, 8);
      [[-8, -30], [8, -37], [2, -22], [-14, -42], [14, -26]].forEach(([x, y], i) => {
        c.save(); c.translate(x, y); c.rotate(i);
        const glint = .35 + .65 * Math.max(0, Math.sin(t * 4 + i * 1.7)); // each sparkle twinkles on its own beat
        c.globalAlpha = glint; c.fillStyle = "white"; c.scale(.6 + glint * .6, .6 + glint * .6);
        c.fillRect(-1.5, -5, 3, 10); c.fillRect(-5, -1.5, 10, 3);
        c.restore();
      });
    },
    "party-hat"(c) {
      c.fillStyle = "#ff5a8a"; c.beginPath(); c.moveTo(-20, 1); c.lineTo(0, -56); c.lineTo(20, 1); c.closePath(); c.fill();
      c.fillStyle = "#ffd83d"; [[-8, -12], [6, -24], [-2, -38]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 4, 0, 7); c.fill(); });
      c.fillStyle = "#4db8ff"; c.beginPath(); c.arc(0, -58, 8, 0, 7); c.fill();
    },
    "crown"(c) {
      c.fillStyle = "#ffcd2e"; c.strokeStyle = "#e6a512"; c.lineWidth = 3;
      c.beginPath(); c.moveTo(-26, 3); c.lineTo(-30, -32); c.lineTo(-14, -16); c.lineTo(0, -38); c.lineTo(14, -16); c.lineTo(30, -32); c.lineTo(26, 3); c.closePath(); c.fill(); c.stroke();
      [[-30, -32], [0, -38], [30, -32]].forEach(([x, y]) => { c.fillStyle = "#ff5a8a"; c.beginPath(); c.arc(x, y, 5, 0, 7); c.fill(); });
    },
    "pirate-hat"(c) {
      c.fillStyle = "#2a2a3a"; c.beginPath(); c.moveTo(-38, 3); c.quadraticCurveTo(-30, -44, 0, -40); c.quadraticCurveTo(30, -44, 38, 3); c.quadraticCurveTo(0, -7, -38, 3); c.fill();
      c.fillStyle = "white"; c.beginPath(); c.arc(0, -20, 6, 0, 7); c.fill(); c.fillRect(-9, -12, 18, 3);
    },
    "sun-hat"(c) {
      c.fillStyle = "#f5d27a"; c.beginPath(); c.ellipse(0, -1, 44, 10, 0, 0, 7); c.fill();
      c.beginPath(); c.moveTo(-20, -1); c.quadraticCurveTo(-20, -34, 0, -34); c.quadraticCurveTo(20, -34, 20, -1); c.fill();
      c.fillStyle = "#ff5a8a"; c.fillRect(-20, -12, 40, 7);
    },
    "bow"(c) {
      c.fillStyle = "#ff5a8a";
      c.beginPath(); c.moveTo(0, -10); c.quadraticCurveTo(-34, -40, -34, -6); c.quadraticCurveTo(-30, 14, 0, -10);
      c.moveTo(0, -10); c.quadraticCurveTo(34, -40, 34, -6); c.quadraticCurveTo(30, 14, 0, -10); c.fill();
      c.fillStyle = "#d93a74"; c.beginPath(); c.arc(0, -10, 8, 0, 7); c.fill();
    },
    "chef-hat"(c) {
      c.fillStyle = "white"; c.strokeStyle = "#cfe3ea"; c.lineWidth = 2;
      [[-14, -34, 16], [0, -42, 18], [14, -34, 16]].forEach(([x, y, r]) => { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.stroke(); });
      c.fillRect(-22, -30, 44, 31); c.fillStyle = "#eaf6fa"; c.fillRect(-22, -5, 44, 8);
    },
    "snow-beanie"(c) {
      c.fillStyle = "#7fd2ff"; c.beginPath(); c.moveTo(-24, 3); c.quadraticCurveTo(-26, -40, 0, -40); c.quadraticCurveTo(26, -40, 24, 3); c.closePath(); c.fill();
      c.fillStyle = "white"; c.fillRect(-26, -7, 52, 10); c.beginPath(); c.arc(0, -42, 9, 0, 7); c.fill();
    },
    "bubble-halo"(c, t) {
      c.strokeStyle = "rgba(255,255,255,.95)"; c.lineWidth = 3.5; c.fillStyle = "rgba(180,240,255,.35)";
      for (let i = 0; i < 7; i++) {
        const x = -30 + i * 10, y = -18 + Math.sin(i * 1.3) * 4 + Math.sin(t * 2 + i) * 1.5;
        c.beginPath(); c.arc(x, y, 6.5 + i % 2 * 2, 0, 7); c.fill(); c.stroke();
      }
    },
    "starfish-clip"(c) {
      c.fillStyle = "#ff9a45"; c.beginPath();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 7 : 18, a = i * Math.PI / 5 - Math.PI / 2; c.lineTo(Math.cos(a) * r, -14 + Math.sin(a) * r); }
      c.closePath(); c.fill(); c.fillStyle = "#ffd9a8"; c.beginPath(); c.arc(0, -14, 4, 0, 7); c.fill();
    },
    "rainbow-hat"(c) {
      ["#ff5a5a", "#ff9a45", "#ffe14d", "#5fdc7b", "#4db8ff", "#9a6cff"].forEach((color, i) => {
        c.strokeStyle = color; c.lineWidth = 6; c.beginPath(); c.arc(0, 4, 34 - i * 5.4, Math.PI, 0); c.stroke();
      });
    }
  };

  // In the order the dressing room shows them. "found" hats cannot be bought.
  const HATS = [
    { id: "flower-crown", name: "Flower Crown", tier: "fancy" },
    { id: "party-hat", name: "Party Hat", tier: "common" },
    { id: "violet-sparkle", name: "Violet Sparkle Hat", tier: "fancy" },
    { id: "crown", name: "Crown", tier: "fancy" },
    { id: "pirate-hat", name: "Pirate Hat", tier: "common" },
    { id: "sun-hat", name: "Sun Hat", tier: "common" },
    { id: "bow", name: "Big Bow", tier: "common" },
    { id: "chef-hat", name: "Chef Hat", tier: "common" },
    { id: "snow-beanie", name: "Snow Beanie", tier: "common" },
    { id: "bubble-halo", name: "Bubble Halo", tier: "common" },
    { id: "starfish-clip", name: "Starfish Clip", tier: "common" },
    { id: "rainbow-hat", name: "Rainbow Hat", tier: "found", how: "Hiding in a rainbow bubble…" }
  ];
  const HAT_BY_ID = byId(HATS);
  const priceOf = (hat) => ECONOMY.hatPrice[hat.tier] || 0;

  const owns = (id) => game.profile.collection.owned.includes(id);
  const worn = () => HAT_BY_ID[game.profile.hats.wearing.me] && owns(game.profile.hats.wearing.me) ? game.profile.hats.wearing.me : null;

  // Puts a hat on the head. Called by drawDolphin, so a hat shows everywhere the dolphin is drawn.
  function drawHat(c, id) {
    const art = HAT_ART[id];
    if (!art) return;
    c.save();
    c.translate(HEAD.x, HEAD.y); c.rotate(HEAD.tilt);
    c.shadowColor = "rgba(0,34,80,.22)"; c.shadowBlur = 6; c.shadowOffsetY = 3;
    art(c, performance.now() / 1000);
    c.restore();
  }

  /* ---------- the hat shop: dressing room, counter, treasures ---------- */

  const mastered = () => AREAS.filter((_, i) => isDone(i)).length;
  const shopOpen = () => mastered() >= ECONOMY.hatShopOpensAfterAreas;
  const coinSplit = (n) => ({ gold: Math.floor(n / ECONOMY.goldValue), reg: n % ECONOMY.goldValue });
  const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
  const word = (n) => NUMBER_WORDS[n] ?? String(n);
  const capital = (text) => text[0].toUpperCase() + text.slice(1);

  // Her coins shown as gold 10-coins and regular coins (display only: the save keeps one number).
  function coinPillHtml(total) {
    const { gold, reg } = coinSplit(total);
    return `<span aria-hidden="true">🪙</span> <strong>${total}</strong> coins <span class="split">${gold ? `<i class="mini-coin gold">10</i>×${gold} ` : ""}<i class="mini-coin">★</i>×${reg}</span>`;
  }

  // A hat on its own (for the shop cards and the treasure shelf). silhouette = a grey shape for things not found yet.
  function drawHatIcon(canvas, id, silhouette = false) {
    const c = canvas.getContext("2d");
    c.setTransform(2, 0, 0, 2, 0, 0);
    c.clearRect(0, 0, 112, 84);
    c.save(); c.translate(56, 60);
    HAT_ART[id](c, 0);
    if (silhouette) { c.globalCompositeOperation = "source-atop"; c.fillStyle = "#9db4bd"; c.fillRect(-60, -70, 120, 90); }
    c.restore();
  }

  function hatCanvas() {
    const canvas = document.createElement("canvas");
    canvas.width = 224; canvas.height = 168;
    return canvas;
  }

  const shop = { preview: null, hopAt: -1e9, running: false };

  function shopSay(text, speakIt = true) {
    $("stageSay").textContent = text;
    if (speakIt) speak(text);
  }

  function openShop() {
    if (!shopOpen()) return;
    shop.preview = worn();
    showScreen("shopScreen");
    $("stageName").textContent = game.name;
    renderShop();
    shopSay(worn() ? `Welcome back! Tap a hat to try it on.` : "Welcome to the hat shop! Tap a hat to try it on.");
    if (!shop.running) { shop.running = true; requestAnimationFrame(shopStageLoop); }
  }

  function renderShop() {
    const coins = game.profile.coins;
    $("shopCoins").innerHTML = coinPillHtml(coins);
    const grid = $("hatGrid");
    grid.replaceChildren();
    HATS.forEach((hat) => {
      const have = owns(hat.id);
      const price = priceOf(hat);
      const card = document.createElement("div");
      card.className = `hat-card${shop.preview === hat.id ? " sel" : ""}`;
      card.dataset.id = hat.id;
      const icon = hatCanvas();
      drawHatIcon(icon, hat.id, hat.tier === "found" && !have);
      const name = document.createElement("b");
      name.textContent = hat.tier === "found" && !have ? "? ? ?" : hat.name;
      const act = document.createElement("button");
      act.type = "button";
      if (have && worn() === hat.id) { act.className = "hat-act on"; act.textContent = "⭐ Wearing"; }
      else if (have) { act.className = "hat-act wear"; act.textContent = "👒 Wear"; }
      else if (hat.tier === "found") { act.className = "hat-act soon"; act.textContent = "Found in rainbow bubbles"; }
      else if (coins >= price) { act.className = "hat-act buy"; act.textContent = `Buy · ${price} 🪙`; }
      else { act.className = "hat-act soon"; act.textContent = `Save up! ${price} 🪙`; }
      act.addEventListener("click", () => hatAction(hat.id));
      card.append(icon, name, act);
      card.addEventListener("click", (event) => { if (!event.target.closest(".hat-act")) tryOn(hat.id); });
      grid.appendChild(card);
    });
    const shown = HAT_BY_ID[shop.preview];
    $("stageWear").textContent = !shown ? "No hat on" : owns(shown.id) ? `Wearing: ${shown.name}` : `Trying on: ${shown.name} (not yours yet)`;
  }

  function tryOn(id) {
    shop.preview = id;
    shop.hopAt = performance.now();
    const hat = HAT_BY_ID[id];
    if (hat.tier === "found" && !owns(id)) shopSay(`${hat.name}! ${hat.how}`);
    else if (owns(id)) shopSay(`${hat.name}! It looks great on you!`);
    else shopSay(`Ooh, the ${hat.name}! It costs ${priceOf(hat)} coins.`);
    renderShop();
  }

  function hatAction(id) {
    const hat = HAT_BY_ID[id];
    if (owns(id)) {
      if (worn() === id) { game.profile.hats.wearing.me = null; shop.preview = null; shopSay("No hat today!"); }
      else { game.profile.hats.wearing.me = id; shop.preview = id; shop.hopAt = performance.now(); chirp(); sparkle(4); shopSay(`${hat.name} on! Beautiful!`); }
      saveProfile(); renderShop();
    } else if (hat.tier === "found") {
      tryOn(id);
    } else if (game.profile.coins >= priceOf(hat)) {
      shop.preview = id;
      openPay(id);
    } else {
      shop.preview = id; renderShop();
      shopSay(`You need ${priceOf(hat) - game.profile.coins} more coins for that one. Keep swimming!`);
    }
  }

  function shopStageLoop(now) {
    if ($("shopScreen").classList.contains("hidden")) { shop.running = false; return; }
    const c = $("shopStage").getContext("2d");
    c.setTransform(2, 0, 0, 2, 0, 0);
    const W = 384, H = 300, t = now / 1000;
    const sea = c.createLinearGradient(0, 0, 0, H);
    sea.addColorStop(0, "#b8fcff"); sea.addColorStop(.3, "#20d4eb"); sea.addColorStop(1, "#0797ce");
    c.fillStyle = sea; c.fillRect(0, 0, W, H);
    c.globalAlpha = .16; c.fillStyle = "white";
    for (let i = 0; i < 7; i++) { const x = 20 + i * 62 + Math.sin(t + i) * 8; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 24, 0); c.lineTo(x + 84, H); c.lineTo(x + 52, H); c.fill(); }
    c.globalAlpha = 1;
    c.fillStyle = "#ffd83d"; c.font = "900 26px sans-serif"; c.textAlign = "center";
    [[56, 56], [330, 84], [310, 236], [60, 226]].forEach(([x, y], i) => { c.globalAlpha = .45 + .55 * Math.abs(Math.sin(t * 2 + i * 1.3)); c.fillText("✦", x, y); });
    c.globalAlpha = 1;
    const p = (performance.now() - shop.hopAt) / 900;
    let y = 172 + Math.sin(t * 2) * 5;
    if (p < 1) y -= Math.abs(Math.sin(p * Math.PI * 2)) * (calmMotion.matches ? 10 : 36) * (1 - p * .5);
    drawDolphin(c, 196, y, COLORS[game.selectedColor].value, 1.9, p < 1 ? "cheer" : "happy", shop.preview);
    requestAnimationFrame(shopStageLoop);
  }

  /* The counter. She pays by moving coins (drag or tap) onto the tray; each is counted aloud. No buzzers, no penalties. */

  const pay = { hat: null, price: 0, gold: 0, reg: 0, trayGold: 0, trayReg: 0, placed: 0, drags: 0, prompts: 0, trades: 0, started: 0, done: false, timer: 0, running: false, mood: "happy", drag: null };
  const trayValue = () => pay.trayGold * ECONOMY.goldValue + pay.trayReg;

  function paySay(text, speakIt = true, spoken = text) {
    $("paySay").textContent = text;
    if (speakIt) speak(spoken);
  }

  function openPay(id) {
    const hat = HAT_BY_ID[id];
    const { gold, reg } = coinSplit(game.profile.coins);
    Object.assign(pay, { hat, price: priceOf(hat), gold, reg, trayGold: 0, trayReg: 0, placed: 0, drags: 0, prompts: 0, trades: 0, started: performance.now(), done: false, mood: "happy", drag: null });
    $("payTitle").textContent = `Pay for your ${hat.name}`;
    $("payOverlay").classList.remove("hidden");
    $("payOverlay").scrollTop = 0;
    renderPay();
    paySay(`The ${hat.name} costs ${pay.price}. Put your coins on the tray!`);
    clearTimeout(pay.timer);
    pay.timer = setTimeout(() => payNudge(false), 9000);
    if (!pay.running) { pay.running = true; requestAnimationFrame(payLoop); }
  }

  function closePay() {
    clearTimeout(pay.timer);
    if (pay.drag?.clone) pay.drag.clone.remove();
    pay.drag = null;
    $("payOverlay").classList.add("hidden");
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    shop.preview = worn() === pay.hat?.id ? pay.hat.id : shop.preview;
    renderShop();
  }

  function coinEl(kind, where) {
    const coin = document.createElement("button");
    coin.type = "button";
    coin.className = `coin${kind === "gold" ? " gold" : ""}`;
    coin.dataset.kind = kind;
    coin.dataset.where = where;
    coin.setAttribute("aria-label", kind === "gold" ? "gold coin worth 10" : "coin worth 1");
    return coin;
  }

  const moreText = (rest) => {
    const tens = Math.floor(rest / ECONOMY.goldValue), ones = rest % ECONOMY.goldValue;
    if (!tens) return ones === 1 ? "Just one more!" : `${capital(word(ones))} more!`;
    if (!ones) return tens === 1 ? "Just one more gold coin!" : `${capital(word(tens))} more gold coins!`;
    return `${capital(word(tens))} gold and ${word(ones)} more!`;
  };

  function renderPay(glow = false) {
    $("payCoins").innerHTML = coinPillHtml(game.profile.coins);
    const price = pay.price, tens = Math.floor(price / ECONOMY.goldValue), ones = price % ECONOMY.goldValue;
    // The price tag shows its coins as a picture until she has paid a few times, then just the number.
    const pic = $("priceCoins");
    pic.replaceChildren();
    if (game.profile.stats.payments < ECONOMY.priceTagPictureUntil) {
      for (let i = 0; i < tens; i++) { const coin = coinEl("gold", "tag"); coin.classList.add("small"); coin.tabIndex = -1; pic.appendChild(coin); }
      for (let i = 0; i < ones; i++) { const coin = coinEl("reg", "tag"); coin.classList.add("small"); coin.tabIndex = -1; pic.appendChild(coin); }
    }
    $("priceNum").textContent = `${price} coins`;

    const tray = $("tray");
    tray.replaceChildren();
    for (let i = 0; i < pay.trayGold; i++) tray.appendChild(coinEl("gold", "tray"));
    for (let i = 0; i < pay.trayReg; i++) tray.appendChild(coinEl("reg", "tray"));
    const rest = price - trayValue();
    for (let i = 0; i < Math.floor(rest / ECONOMY.goldValue); i++) { const ghost = coinEl("gold", "ghost"); ghost.classList.add("ghost"); ghost.disabled = true; if (glow) ghost.classList.add("glow"); tray.appendChild(ghost); }
    for (let i = 0; i < rest % ECONOMY.goldValue; i++) { const ghost = coinEl("reg", "ghost"); ghost.classList.add("ghost"); ghost.disabled = true; if (glow) ghost.classList.add("glow"); tray.appendChild(ghost); }
    const total = trayValue();
    $("trayTotal").textContent = total;
    const tt = pay.trayGold, to = pay.trayReg;
    $("trayTens").textContent = total ? `${tt} ${tt === 1 ? "ten" : "tens"} and ${to} ${to === 1 ? "one" : "ones"}` : "Nothing yet";

    const purse = $("purse");
    purse.replaceChildren();
    const goldCap = tens + 1; // enough gold to pay with, plus one to trade
    for (let i = 0; i < Math.min(pay.gold, goldCap); i++) purse.appendChild(coinEl("gold", "purse"));
    for (let i = 0; i < pay.reg; i++) purse.appendChild(coinEl("reg", "purse"));
    const hidden = pay.gold - Math.min(pay.gold, goldCap);
    $("purseNote").textContent = hidden > 0 ? `+ ${hidden} more gold coin${hidden === 1 ? "" : "s"} waiting in your purse` : "";
    $("tradeButton").disabled = pay.gold < 1 || pay.done;
  }

  function popLast(kind) {
    const coins = [...$("tray").querySelectorAll(`.coin[data-kind="${kind}"]:not(.ghost)`)];
    coins[coins.length - 1]?.classList.add("pop");
  }

  function payPlace(kind) {
    if (pay.done) return;
    const value = kind === "gold" ? ECONOMY.goldValue : 1;
    if ((kind === "gold" ? pay.gold : pay.reg) < 1) return;
    if (trayValue() + value > pay.price) {
      // Too many: the coin comes straight back. No buzzer.
      pay.prompts += 1;
      const coin = [...$("purse").querySelectorAll(`.coin[data-kind="${kind}"]`)][0];
      coin?.classList.add("back");
      setTimeout(() => coin?.classList.remove("back"), 600);
      paySay(kind === "gold" ? "Here's one back! That gold coin is too big for now. Try the little coins." : "Here's one back!");
      return;
    }
    if (kind === "gold") { pay.gold -= 1; pay.trayGold += 1; } else { pay.reg -= 1; pay.trayReg += 1; }
    pay.placed += 1;
    coinPing();
    renderPay();
    popLast(kind);
    const total = trayValue();
    if (total === pay.price) { payComplete(); return; }
    paySay(String(total));
    clearTimeout(pay.timer);
    pay.timer = setTimeout(() => payNudge(true), 3500);
  }

  function payTake(kind) {
    if (pay.done) return;
    if (kind === "gold" && pay.trayGold > 0) { pay.trayGold -= 1; pay.gold += 1; }
    else if (kind === "reg" && pay.trayReg > 0) { pay.trayReg -= 1; pay.reg += 1; }
    else return;
    note(660, 0, .12, "sine", .05);
    renderPay();
    clearTimeout(pay.timer);
    pay.timer = setTimeout(() => payNudge(trayValue() > 0), 3500);
  }

  // She has paused: gently say how much is left and make the empty spots glow.
  function payNudge(started) {
    if (pay.done || $("payOverlay").classList.contains("hidden")) return;
    if (!started) { paySay("Drag a coin to the tray, or tap it!"); return; }
    pay.prompts += 1;
    const rest = pay.price - trayValue();
    renderPay(true);
    const needOnes = rest % ECONOMY.goldValue, spareGold = pay.gold - Math.floor(rest / ECONOMY.goldValue);
    if (needOnes > pay.reg && spareGold > 0) {
      $("tradeButton").classList.add("glow");
      paySay(`${moreText(rest)} Tap Trade: a gold coin turns into ten coins!`);
    } else {
      paySay(moreText(rest));
    }
    pay.timer = setTimeout(() => payNudge(true), 8000);
  }

  function payTrade() {
    if (pay.done || pay.gold < 1) return;
    pay.gold -= 1; pay.reg += ECONOMY.goldValue; pay.trades += 1;
    $("tradeButton").classList.remove("glow");
    clearTimeout(pay.timer);
    renderPay();
    // The gold coin bursts into ten coins.
    [...$("purse").querySelectorAll(`.coin[data-kind="reg"]`)].slice(-ECONOMY.goldValue).forEach((coin, i) => { coin.classList.add("pop"); coin.style.animationDelay = `${i * 45}ms`; });
    sparkle(5);
    paySay("Ten ones! One gold coin is the same as ten coins.");
    pay.timer = setTimeout(() => payNudge(trayValue() > 0), 5000);
  }

  function payComplete() {
    pay.done = true;
    clearTimeout(pay.timer);
    const id = pay.hat.id;
    // Spending is the only way coins ever go down.
    game.profile.coins -= pay.price;
    if (!owns(id)) game.profile.collection.owned.push(id);
    game.profile.hats.wearing.me = id;
    game.profile.stats.payments += 1;
    saveProfile();
    logAttempt({
      factId: `pay:${id}`, family: "money", op: "pay", mode: pay.drags ? "drag" : "tap", rtRaw: Math.round(performance.now() - pay.started),
      correct: true, firstTry: pay.prompts === 0, hint: pay.prompts > 0, context: "money",
      price: pay.price, dragged: pay.placed, prompts: pay.prompts, trades: pay.trades
    });
    pay.mood = "cheer";
    $("tradeButton").disabled = true;
    fanfare();
    paySay(`Paid! Enjoy your new ${pay.hat.name}!`, true, `${pay.price}. Paid! Enjoy your new ${pay.hat.name}!`); // the last coin is counted too
    $("payCoins").innerHTML = coinPillHtml(game.profile.coins);
    shop.hopAt = performance.now() + 900;
    setTimeout(() => { closePay(); shop.preview = id; shop.hopAt = performance.now(); shopSay(`${pay.hat.name} on! You look amazing!`, false); }, 2200);
  }

  function payLoop(now) {
    if ($("payOverlay").classList.contains("hidden")) { pay.running = false; return; }
    const c = $("payDolphin").getContext("2d");
    c.clearRect(0, 0, 360, 270);
    const bob = Math.sin(now / 480) * 6, hop = pay.mood === "cheer" ? -Math.abs(Math.sin(now / 220)) * 26 : 0;
    drawDolphin(c, 190, 140 + bob + hop, COLORS[game.selectedColor].value, 1.55, pay.mood, worn());
    requestAnimationFrame(payLoop);
  }

  // Dragging a coin: it follows her finger, and lands on the tray (or back in the purse). A plain tap works too.
  function overRect(el, x, y, pad = 28) {
    const r = el.getBoundingClientRect();
    return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
  }

  function coinDown(event) {
    const el = event.target.closest?.(".coin");
    if (!el || pay.done || el.classList.contains("ghost") || el.classList.contains("small") || !["purse", "tray"].includes(el.dataset.where)) return;
    event.preventDefault();
    pay.drag = { el, kind: el.dataset.kind, from: el.dataset.where, x0: event.clientX, y0: event.clientY, moved: false, clone: null, id: event.pointerId };
    try { el.setPointerCapture(event.pointerId); } catch (_) { /* fine without capture */ }
  }

  function coinMove(event) {
    const drag = pay.drag;
    if (!drag || event.pointerId !== drag.id) return;
    if (!drag.moved && Math.hypot(event.clientX - drag.x0, event.clientY - drag.y0) > 10) {
      drag.moved = true;
      drag.clone = drag.el.cloneNode(true);
      drag.clone.classList.add("drag");
      document.body.appendChild(drag.clone);
      drag.el.classList.add("lifted");
    }
    if (drag.clone) {
      drag.clone.style.left = `${event.clientX}px`;
      drag.clone.style.top = `${event.clientY}px`;
      $("tray").classList.toggle("over", drag.from === "purse" && overRect($("tray"), event.clientX, event.clientY));
    }
  }

  function coinUp(event) {
    const drag = pay.drag;
    if (!drag || event.pointerId !== drag.id) return;
    pay.drag = null;
    drag.clone?.remove();
    drag.el.classList.remove("lifted");
    $("tray").classList.remove("over");
    if (drag.moved) pay.drags += 1;
    if (drag.from === "purse") {
      if (!drag.moved || overRect($("tray"), event.clientX, event.clientY)) payPlace(drag.kind);
    } else if (!drag.moved || overRect($("purse"), event.clientX, event.clientY)) {
      payTake(drag.kind);
    }
  }

  /* My Treasures: everything she owns, and grey shapes for what is still out there. */

  function openTreasures() {
    showScreen("treasuresScreen");
    renderTreasures();
  }

  function renderTreasures() {
    $("treasureCoins").innerHTML = coinPillHtml(game.profile.coins);
    const shelf = $("treasureShelf");
    shelf.replaceChildren();
    const seen = new Set(game.profile.collection.seenNew);
    let found = 0;
    HATS.forEach((hat) => {
      const have = owns(hat.id);
      if (have) found += 1;
      const item = document.createElement("button");
      item.type = "button";
      item.className = `treasure${have ? "" : " missing"}${have && worn() === hat.id ? " on" : ""}`;
      const icon = hatCanvas();
      drawHatIcon(icon, hat.id, !have);
      const name = document.createElement("b");
      name.textContent = have ? hat.name : "? ? ?";
      const small = document.createElement("small");
      small.textContent = have ? (worn() === hat.id ? "⭐ Wearing" : "Tap to wear") : hat.how || "In the hat shop!";
      item.append(icon, name, small);
      if (have && !seen.has(hat.id)) item.insertAdjacentHTML("beforeend", '<div class="ribbon">NEW!</div>');
      if (have) item.addEventListener("click", () => {
        game.profile.hats.wearing.me = worn() === hat.id ? null : hat.id;
        saveProfile();
        if (worn()) { chirp(); speak(hat.name); }
        renderTreasures();
      });
      else item.disabled = true;
      shelf.appendChild(item);
    });
    $("treasureCount").textContent = `COLLECTION · ${found} of ${HATS.length} found`;
    // Anything she has now seen here loses its NEW! ribbon next time.
    game.profile.collection.seenNew = [...new Set([...game.profile.collection.seenNew, ...game.profile.collection.owned])];
    saveProfile();
  }

  function updateShopButton() {
    const open = shopOpen();
    $("shopButton").classList.toggle("soon", !open);
    $("shopButtonText").textContent = open ? "Hat Shop" : "Hat Shop 🔒";
  }

  function mapNote(text) {
    const banner = $("mapBanner");
    banner.textContent = text;
    banner.classList.remove("hidden");
    banner.style.animation = "none"; void banner.offsetWidth; banner.style.animation = "";
  }

  /* ---------- the dolphin coach ---------- */

  const mascot = { state: "idle", t0: 0, running: false, flip: null, flipDir: -1 };
  const FLIP_MS = { 1: 650, 2: 1000 }; // both finish well inside the 1.7 s pause before the next question
  const calmMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function setMascot(state, flip = null) {
    mascot.state = state;
    mascot.flip = flip;
    mascot.t0 = performance.now();
  }

  // A correct answer earns a flip: front flips and back flips take turns, and a 3-in-a-row streak earns a double.
  function mascotFlip(double) {
    mascot.flipDir = -mascot.flipDir; // +1 = front flip (nose dips first), -1 = back flip
    const turns = double ? 2 : 1;
    game.profile.stats.flips += turns;
    setMascot("cheer", { dir: mascot.flipDir, turns, ms: FLIP_MS[turns] });
  }

  function startMascot() {
    if (mascot.running) return;
    mascot.running = true;
    requestAnimationFrame(mascotLoop);
  }

  function mascotLoop(now) {
    if ($("mathScreen").classList.contains("hidden")) { mascot.running = false; return; }
    const p = (now - mascot.t0) / 1200;
    let y = Math.sin(now / 480) * 6;
    let rotate = 0;
    let mood = "happy";
    let size = 1.55;
    const flip = mascot.state === "cheer" ? mascot.flip : null;
    if (flip) {
      const t = Math.min(1, (now - mascot.t0) / flip.ms);
      const arc = Math.sin(t * Math.PI); // 0 -> 1 -> 0: up and back down
      y -= arc * (calmMotion.matches ? 22 : 30);
      if (!calmMotion.matches) {
        rotate = flip.dir * flip.turns * Math.PI * 2 * (1 - Math.cos(t * Math.PI)) / 2;
        size *= 1 - .5 * arc; // tucked in while turning, so the dolphin stays inside the picture
      }
      if (t < 1 || p < 1.4) mood = "cheer";
    } else if (mascot.state === "cheer" && p < 1.4) {
      y -= Math.abs(Math.sin(Math.min(p, 1) * Math.PI * 2)) * 62 * (1 - Math.min(p, 1) * .35);
      rotate = Math.sin(Math.min(p, 1) * Math.PI * 4) * .14;
      mood = "cheer";
    } else if (mascot.state === "oops" && p < 1.6) {
      rotate = .1;
      y += 8;
      mood = "oops";
    }
    mctx.clearRect(0, 0, 360, 270);
    if (mood === "cheer") drawSparkles(now);
    mctx.save();
    mctx.translate(190, 140 + y);
    mctx.rotate(rotate);
    drawDolphin(mctx, 0, 0, COLORS[game.selectedColor].value, size, mood, worn());
    mctx.restore();
    requestAnimationFrame(mascotLoop);
  }

  function drawSparkles(now) {
    mctx.save();
    mctx.fillStyle = "#ffd83d";
    mctx.font = "900 34px sans-serif";
    mctx.textAlign = "center";
    for (let i = 0; i < 5; i++) {
      const t = ((now - mascot.t0) / 900 + i * .2) % 1;
      mctx.globalAlpha = 1 - t;
      mctx.fillText("★", 60 + i * 60, 90 - t * 50 + (i % 2) * 40);
    }
    mctx.restore();
  }

  function burstStars() {
    const coach = document.querySelector(".coach");
    for (let i = 0; i < 7; i++) {
      const star = document.createElement("span");
      star.className = "burst";
      star.textContent = pick(["⭐", "✨", "🌟"]);
      star.style.left = `${8 + Math.random() * 20}%`;
      star.style.setProperty("--dx", `${(Math.random() - .3) * 120}px`);
      star.style.animationDelay = `${i * 50}ms`;
      coach.appendChild(star);
      setTimeout(() => star.remove(), 1400);
    }
  }

  // Says the text and returns a Promise that resolves when the voice has finished (or when sound is off).
  function say(text, spoken, queue = false) {
    $("mascotSay").textContent = text;
    return speak(spoken || text, queue);
  }

  // Utterances stay referenced until they end: iOS Safari can drop the "end" event of one that was garbage collected.
  const speaking = new Set();

  // Resolves when the utterance ends or fails. iOS Safari sometimes never reports the end, so a timeout (about 1.5 s plus
  // a little per letter) resolves it anyway. Never rejects. Resolves at once if sound is off or speech is missing.
  function speak(text, queue = false) {
    if (!game.sound || !("speechSynthesis" in window)) return Promise.resolve();
    return new Promise((resolve) => {
      let utterance = null;
      let timer = 0;
      const finish = () => {
        clearTimeout(timer);
        if (utterance) speaking.delete(utterance);
        resolve();
      };
      try {
        if (!queue) speechSynthesis.cancel();
        utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = .88;
        utterance.pitch = 1.3;
        utterance.onend = finish;
        utterance.onerror = finish;
        speaking.add(utterance);
        timer = setTimeout(finish, 1500 + text.length * 60);
        speechSynthesis.speak(utterance);
      } catch (_) { finish(); /* Speech is optional. */ }
    });
  }

  /* ---------- the race ---------- */

  function startRaceRound() {
    showScreen("raceScreen");
    layoutRace();
    const theme = themeOf(AREAS[game.areaIndex]);
    const lanes = [155, 310, 465];
    game.roundCoins = 0;
    game.race = {
      active: true,
      started: performance.now(),
      duration: RACE_SECONDS * 1000,
      lastFrame: performance.now(),
      playerY: lanes[1],
      targetY: lanes[1],
      lanes,
      objects: [],
      spawnClock: 0,
      bubbles: Array.from({ length: 42 }, () => ({ x: Math.random() * VIEW_W, y: Math.random() * VIEW_H, r: 2 + Math.random() * 8 })),
      fish: Array.from({ length: theme.fish.count }, (_, i) => ({
        x: Math.random() * VIEW_W, y: 110 + Math.random() * 400, size: 6 + Math.random() * 10, depth: .2 + (i % 4) * .1,
        color: theme.fish.colored ? FISH_COLORS[i % FISH_COLORS.length] : null
      })),
      glow: Array.from({ length: 34 }, () => ({ x: Math.random() * VIEW_W, y: 80 + Math.random() * 480, r: 3 + Math.random() * 5, phase: Math.random() * 6 })),
      wake: [],
      world: 0,
      flash: 0
    };
    $("raceIsland").textContent = AREAS[game.areaIndex].name;
    $("raceCoins").textContent = "0";
    $("raceCallout").textContent = portrait ? "Tap left or right to swim!" : "Swipe or use ↑ ↓ to swim!";
    $("raceCallout").style.opacity = "1";
    setTimeout(() => { if (game.race?.active) $("raceCallout").style.opacity = "0"; }, 2800);
    requestAnimationFrame(raceLoop);
  }

  function raceLoop(now) {
    const race = game.race;
    if (!race || !race.active) return;
    const dt = Math.min(.035, (now - race.lastFrame) / 1000);
    race.lastFrame = now;
    const elapsed = now - race.started;
    $("raceTimer").textContent = Math.max(0, Math.ceil((race.duration - elapsed) / 1000));
    updateRace(dt);
    drawRace();
    $("raceCoins").textContent = game.roundCoins;
    if (elapsed >= race.duration) endRaceRound();
    else requestAnimationFrame(raceLoop);
  }

  function updateRace(dt) {
    const race = game.race;
    race.playerY += (race.targetY - race.playerY) * Math.min(1, dt * 9);
    const speed = 255 + game.boost * 32;
    race.world += speed * dt;
    if (Math.random() < dt * 24) {
      race.wake.push({ x: 178, y: race.playerY + (Math.random() - .5) * 34, r: 3 + Math.random() * 8, life: 1 });
    }
    race.wake.forEach((p) => { p.x -= (130 + speed * .22) * dt; p.r += dt * 8; p.life -= dt * 1.4; });
    race.wake = race.wake.filter((p) => p.life > 0);
    race.spawnClock -= dt;
    if (race.spawnClock <= 0) {
      spawnPath();
      race.spawnClock = .65 + Math.random() * .42;
    }
    race.objects.forEach((obj) => { obj.x -= speed * dt; obj.spin += dt * 5; });
    const dolphinX = 245;
    race.objects.forEach((obj) => {
      if (obj.hit || Math.abs(obj.x - dolphinX) > 54 || Math.abs(obj.y - race.playerY) > 55) return;
      obj.hit = true;
      if (obj.type === "coin") {
        game.roundCoins += 1; race.flash = .25; coinPing();
      } else if (obj.type === "hoop") {
        game.roundCoins += 2; race.flash = .4; hoopPing();
      } else {
        game.boost = Math.max(0, game.boost - .6); race.flash = -.35; boing();
      }
    });
    race.objects = race.objects.filter((obj) => obj.x > -90 && !obj.hit);
    race.flash += race.flash > 0 ? -dt : race.flash < 0 ? dt : 0;
  }

  function spawnPath() {
    const race = game.race;
    const lane = Math.floor(Math.random() * 3);
    const chance = Math.random();
    if (chance < .1) {
      race.objects.push({ type: "jelly", x: VIEW_W + 70, y: race.lanes[lane], spin: 0, hit: false });
    } else if (chance < .24) {
      race.objects.push({ type: "hoop", x: VIEW_W + 70, y: race.lanes[lane], spin: 0, hit: false });
    } else {
      const count = Math.random() < .3 ? 3 : 1;
      for (let i = 0; i < count; i++) race.objects.push({ type: "coin", x: VIEW_W + 70 + i * 92, y: race.lanes[lane], spin: i, hit: false });
    }
  }

  function drawRace() {
    const race = game.race;
    const theme = themeOf(AREAS[game.areaIndex]);
    const now = performance.now() / 1000;
    applyView();
    const stops = theme.water;
    const gradient = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    gradient.addColorStop(0, stops[0]); gradient.addColorStop(.14, stops[1]); gradient.addColorStop(.5, stops[2]); gradient.addColorStop(1, stops[3]);
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // Animated sunlight.
    ctx.save();
    ctx.globalAlpha = theme.rays.alpha;
    for (let i = 0; i < theme.rays.count; i++) {
      const topX = 70 + i * theme.rays.spacing + Math.sin(now + i) * 22;
      const ray = ctx.createLinearGradient(topX, 0, topX + 140, 500);
      ray.addColorStop(0, "rgba(255,255,255,.9)"); ray.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = ray; ctx.beginPath(); ctx.moveTo(topX, 0); ctx.lineTo(topX + 65, 0); ctx.lineTo(topX + 260, 570); ctx.lineTo(topX + 100, 570); ctx.closePath(); ctx.fill();
    }
    ctx.restore();

    drawScenery("sky", race, now, theme);
    ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 5;
    ctx.beginPath();
    for (let x = 0; x <= VIEW_W; x += 18) {
      const y = 25 + Math.sin(x * .025 + now * 2.3) * 7;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    drawScenery("far", race, now, theme);

    ctx.globalAlpha = .22; ctx.fillStyle = "white";
    race.bubbles.forEach((b, i) => {
      const x = (b.x - race.world * (.12 + i % 3 * .03) + VIEW_W * 3) % VIEW_W;
      const y = (b.y - now * (4 + i % 4) + VIEW_H) % VIEW_H;
      ctx.beginPath(); ctx.arc(x, y, b.r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;

    drawScenery("fish", race, now, theme);

    ctx.fillStyle = "rgba(0,92,126,.25)";
    for (let x = -80 - (race.world * .18 % 140); x < VIEW_W + 100; x += 140) {
      ctx.beginPath(); ctx.moveTo(x, VIEW_H); ctx.quadraticCurveTo(x + 40 + Math.sin(now + x) * 8, 500, x + 75, VIEW_H); ctx.fill();
    }

    drawScenery("mid", race, now, theme);
    drawReef(race.world, now, theme.reef);
    drawScenery("near", race, now, theme);

    race.objects.forEach((obj) => drawObject(obj, theme));
    race.wake.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.life) * .55; ctx.strokeStyle = "white"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.stroke();
    });
    ctx.globalAlpha = 1;
    drawSpeedLines(game.boost, now);
    drawDolphin(ctx, 245, race.playerY + Math.sin(now * 5) * 4, COLORS[game.selectedColor].value, 1.14, "happy", worn());

    if (race.flash) {
      ctx.fillStyle = race.flash > 0 ? `rgba(255,239,91,${Math.abs(race.flash)})` : `rgba(255,80,120,${Math.abs(race.flash)})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }

  function drawFish(race, now) {
    race.fish.forEach((fish, i) => {
      const x = (fish.x - race.world * fish.depth + VIEW_W * 4) % (VIEW_W + 80) - 40;
      const y = fish.y + Math.sin(now * 1.7 + i) * 8;
      ctx.save(); ctx.translate(x, y);
      ctx.globalAlpha = fish.color ? .5 + fish.depth * .3 : .16 + fish.depth * .22;
      ctx.fillStyle = fish.color || (i % 2 ? "#003e73" : "#b9fcff");
      ctx.beginPath(); ctx.ellipse(0, 0, fish.size * 1.55, fish.size, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(fish.size, 0); ctx.lineTo(fish.size * 2.2, -fish.size); ctx.lineTo(fish.size * 2.2, fish.size); ctx.closePath(); ctx.fill(); ctx.restore();
    });
  }

  // Named scenery layers. A theme lists the ones it wants (THEMES[].scenery). Each layer belongs to a stage, and the
  // stages are drawn back to front: sky, far, (bubbles), fish, (sea bumps), mid, (reef), near.
  // Layers within a stage are drawn in the order of this list, whatever order a theme names them in.
  const SCENERY = {
    rainbow: { stage: "sky", draw: () => drawRainbow() },
    palace: { stage: "far", draw: (race) => drawPalace(race.world) },
    ship: { stage: "far", draw: (race) => drawShip(race.world) },
    fish: { stage: "fish", draw: drawFish },
    glow: { stage: "mid", draw: (race, now) => drawGlow(race, now) },
    kelp: { stage: "near", draw: (race, now) => drawKelp(race.world, now) },
    chests: { stage: "near", draw: (race, now) => drawChests(race.world, now) }
  };

  function drawScenery(stage, race, now, theme) {
    Object.entries(SCENERY).forEach(([name, layer]) => {
      if (layer.stage === stage && theme.scenery.includes(name)) layer.draw(race, now);
    });
  }

  function drawReef(world, now, colors) {
    ctx.save();
    ctx.translate(-(world * .42 % 220), 0);
    for (let x = -100; x < VIEW_W + 260; x += 220) {
      ctx.fillStyle = x % 440 === 0 ? colors[0] : colors[1];
      for (let stem = 0; stem < 5; stem++) {
        ctx.lineWidth = 9 - stem; ctx.strokeStyle = ctx.fillStyle; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(x + stem * 16, 620); ctx.quadraticCurveTo(x + stem * 14 + Math.sin(now * 1.4 + stem) * 9, 565, x + stem * 20 - 8, 530 - stem * 9); ctx.stroke();
      }
      ctx.fillStyle = colors[2]; ctx.beginPath(); ctx.ellipse(x + 115, 610, 72, 24, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawKelp(world, now) {
    ctx.save();
    ctx.strokeStyle = "#1fa968"; ctx.lineWidth = 11; ctx.lineCap = "round"; ctx.globalAlpha = .75;
    const offset = world * .55 % 330;
    for (let x = -offset; x < VIEW_W + 60; x += 330) {
      for (let s = 0; s < 2; s++) {
        const bx = x + s * 46;
        ctx.beginPath(); ctx.moveTo(bx, 625);
        ctx.bezierCurveTo(bx + Math.sin(now * 1.3 + s) * 26, 560, bx - Math.sin(now * 1.3 + s) * 26, 480, bx + Math.sin(now + s) * 20, 400 - s * 30);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawChests(world, now) {
    const period = 880;
    const offset = world * .42 % period;
    for (let x = 640 - offset; x < VIEW_W + 100; x += period) {
      ctx.save(); ctx.translate(x, 580);
      ctx.fillStyle = "#8a4b1f"; ctx.fillRect(-32, 0, 64, 34);
      ctx.fillStyle = "#a8602a"; ctx.beginPath(); ctx.moveTo(-32, 0); ctx.quadraticCurveTo(0, -34, 32, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#ffd447"; ctx.fillRect(-5, -4, 10, 16);
      ctx.globalAlpha = .6 + Math.sin(now * 4 + x) * .4; ctx.fillStyle = "white"; ctx.font = "900 20px sans-serif"; ctx.textAlign = "center"; ctx.fillText("✦", 22, -24);
      ctx.restore();
    }
  }

  function drawShip(world) {
    const x = 1300 - (world * .1 % 1900);
    ctx.save(); ctx.translate(x, 470); ctx.globalAlpha = .32; ctx.fillStyle = "#06203f";
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(230, 0); ctx.lineTo(195, 60); ctx.lineTo(35, 60); ctx.closePath(); ctx.fill();
    ctx.fillRect(108, -110, 8, 110);
    ctx.beginPath(); ctx.moveTo(118, -105); ctx.lineTo(178, -40); ctx.lineTo(118, -40); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawRainbow() {
    const colors = ["#ff5a5a", "#ff9a45", "#ffe14d", "#5fdc7b", "#4db8ff", "#9a6cff"];
    ctx.save(); ctx.globalAlpha = .26; ctx.lineWidth = 13;
    colors.forEach((color, i) => { ctx.strokeStyle = color; ctx.beginPath(); ctx.arc(560, 330, 400 - i * 13, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke(); });
    ctx.restore();
  }

  function drawGlow(race, now) {
    ctx.save();
    race.glow.forEach((g, i) => {
      const x = (g.x - race.world * .2 + VIEW_W * 4) % VIEW_W;
      const y = g.y + Math.sin(now + g.phase) * 14;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, g.r * 4);
      glow.addColorStop(0, i % 2 ? "rgba(140,255,255,.85)" : "rgba(255,170,255,.85)"); glow.addColorStop(1, "rgba(255,255,255,0)");
      ctx.globalAlpha = .55 + Math.sin(now * 2 + g.phase) * .35;
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, g.r * 4, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  }

  function drawPalace(world) {
    const x = 1300 - (world * .12 % 2100);
    ctx.save(); ctx.translate(x, 330); ctx.globalAlpha = .38; ctx.fillStyle = "#ffe28a";
    ctx.fillRect(0, 60, 300, 140);
    [[10, 0], [130, -40], [250, 0]].forEach(([tx, ty]) => {
      ctx.fillRect(tx, 20 + ty, 40, 180 - ty);
      ctx.beginPath(); ctx.moveTo(tx - 6, 20 + ty); ctx.lineTo(tx + 20, -30 + ty); ctx.lineTo(tx + 46, 20 + ty); ctx.closePath(); ctx.fill();
    });
    ctx.restore();
  }

  function drawSpeedLines(boost, now) {
    if (boost < .5) return;
    ctx.save(); ctx.globalAlpha = Math.min(.42, boost * .05); ctx.strokeStyle = "white"; ctx.lineWidth = 3; ctx.lineCap = "round";
    for (let i = 0; i < 11; i++) {
      const x = (now * -380 - i * 137 + VIEW_W * 4) % VIEW_W;
      const y = 90 + (i * 83 % 450);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 55 - boost * 3, y); ctx.stroke();
    }
    ctx.restore();
  }

  function drawObject(obj, theme) {
    const upright = () => { if (portrait) ctx.rotate(Math.PI / 2); };
    ctx.save(); ctx.translate(obj.x, obj.y);
    if (obj.type === "coin") {
      const width = 13 + Math.abs(Math.cos(obj.spin)) * 20;
      ctx.fillStyle = "#ffcd2e"; ctx.strokeStyle = "#fff39c"; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.ellipse(0, 0, width, 31, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#e6a512"; ctx.font = "900 26px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; upright(); ctx.fillText("★", 0, 2);
    } else if (obj.type === "hoop") {
      ctx.strokeStyle = theme.hoop.color; ctx.lineWidth = 15; ctx.shadowColor = "#fff59d"; ctx.shadowBlur = theme.hoop.glow;
      ctx.beginPath(); ctx.ellipse(0, 0, 35, 68, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0; ctx.fillStyle = "white"; ctx.font = "900 18px sans-serif"; ctx.textAlign = "center"; upright(); ctx.fillText("+2", 0, 6);
    } else {
      ctx.font = "75px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; upright(); ctx.fillText("🪼", 0, 0);
    }
    ctx.restore();
  }

  function drawDolphin(c, x, y, color, scale = 1, mood = "happy", hat = null) {
    c.save(); c.translate(x, y); c.scale(scale, scale);
    c.shadowColor = "rgba(0,34,80,.28)"; c.shadowBlur = 16; c.shadowOffsetY = 9;
    const body = c.createLinearGradient(0, -50, 0, 38);
    body.addColorStop(0, adjustColor(color, 42)); body.addColorStop(.46, color); body.addColorStop(1, adjustColor(color, -28));
    c.fillStyle = body; c.strokeStyle = "rgba(0,43,84,.25)"; c.lineWidth = 3;
    c.beginPath();
    c.moveTo(-74, 4); c.bezierCurveTo(-50, -43, 28, -48, 70, -3); c.bezierCurveTo(28, 22, -25, 33, -60, 20); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-62, 7); c.lineTo(-105, -23); c.lineTo(-91, 8); c.lineTo(-107, 37); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-5, -31); c.quadraticCurveTo(8, -68, 27, -30); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(9, 19); c.quadraticCurveTo(25, 50, 44, 15); c.closePath(); c.fill();
    c.shadowBlur = 0;
    c.fillStyle = "rgba(255,255,255,.38)"; c.beginPath(); c.ellipse(9, 14, 47, 13, -.08, 0, Math.PI * 2); c.fill();
    c.fillStyle = "rgba(255,255,255,.6)"; c.beginPath(); c.ellipse(9, -29, 30, 7, -.08, 0, Math.PI * 2); c.fill();
    c.fillStyle = "white"; c.beginPath(); c.arc(39, -15, 7, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#062f4f"; c.beginPath(); c.arc(42, -15, 3, 0, Math.PI * 2); c.fill();
    c.strokeStyle = "#063b5a"; c.lineWidth = 2;
    if (mood === "cheer") {
      c.fillStyle = "#7a1e3d"; c.beginPath(); c.ellipse(52, 1, 11, 8, .35, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#ff8aa6"; c.beginPath(); c.ellipse(53, 5, 6, 3.5, .35, 0, Math.PI * 2); c.fill();
    } else if (mood === "oops") {
      c.beginPath(); c.arc(54, 12, 9, 3.5, 5.9); c.stroke();
    } else {
      c.beginPath(); c.arc(54, -2, 10, .2, 1.6); c.stroke();
    }
    if (hat) drawHat(c, hat);
    c.restore();
  }

  function adjustColor(hex, amount) {
    const value = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, (value >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((value >> 8) & 255) + amount));
    const b = Math.max(0, Math.min(255, (value & 255) + amount));
    return `rgb(${r},${g},${b})`;
  }

  function endRaceRound() {
    if (!game.race?.active) return;
    game.race.active = false;
    game.profile.coins += game.roundCoins;
    saveProfile();
    if (game.justMastered === AREAS.length - 1) { setTimeout(finishGame, 800); return; }
    $("raceCallout").textContent = `Great swimming! ${game.roundCoins} coins!`;
    $("raceCallout").style.opacity = "1";
    setTimeout(() => showMap(true), 1300);
  }

  function finishGame() {
    game.justMastered = null;
    showScreen("finishScreen");
    $("finishTitle").textContent = `${game.name} won the Dolphin Cup!`;
    $("finishMessage").textContent = `You explored all ${AREAS.length} islands and made ${game.name} super speedy.`;
    $("correctStat").textContent = game.profile.correct;
    $("coinStat").textContent = game.profile.coins;
    $("islandStat").textContent = AREAS.length;
    fanfare();
  }

  function moveLane(direction) {
    if (!game.race?.active) return;
    const race = game.race;
    const nearest = race.lanes.reduce((best, y, i) => Math.abs(y - race.targetY) < Math.abs(race.lanes[best] - race.targetY) ? i : best, 0);
    const before = race.targetY;
    race.targetY = race.lanes[Math.max(0, Math.min(2, nearest + direction))];
    if (race.targetY !== before) splash();
  }

  function setLaneFromPointer(event) {
    if (!game.race?.active) return;
    const rect = canvas.getBoundingClientRect();
    const y = (event.clientY - rect.top) * VIEW_H / rect.height;
    const before = game.race.targetY;
    game.race.targetY = game.race.lanes.reduce((best, lane) => Math.abs(lane - y) < Math.abs(best - y) ? lane : best);
    if (game.race.targetY !== before) splash();
  }

  function shuffle(items) {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }

  /* ---------- sound ---------- */
  // Everything is made with the Web Audio API (no sound files), so it also works offline.

  const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760]; // C major pentatonic

  function getAudio() {
    if (!getAudio.audio) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audio = getAudio.audio = new AudioContext();
      getAudio.sfx = audio.createGain();
      getAudio.sfx.connect(audio.destination);
      getAudio.music = audio.createGain();
      getAudio.music.gain.value = 0;
      getAudio.music.connect(audio.destination);
    }
    if (getAudio.audio.state === "suspended") getAudio.audio.resume();
    return getAudio.audio;
  }

  function noiseBuffer(audio) {
    if (!noiseBuffer.buffer) {
      const buffer = audio.createBuffer(1, audio.sampleRate * 2, audio.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < data.length; i++) {
        last = (last + .02 * (Math.random() * 2 - 1)) / 1.02; // brown noise: soft and rumbly like water
        data[i] = last * 3.5;
      }
      noiseBuffer.buffer = buffer;
    }
    return noiseBuffer.buffer;
  }

  function note(frequency, delay = 0, duration = .25, type = "sine", volume = .07) {
    if (!game.sound) return;
    try {
      const audio = getAudio();
      const t = audio.currentTime + delay;
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, t);
      gain.gain.setValueAtTime(.0001, t);
      gain.gain.exponentialRampToValueAtTime(volume, t + .012);
      gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
      oscillator.connect(gain).connect(getAudio.sfx);
      oscillator.start(t); oscillator.stop(t + duration + .03);
    } catch (_) { /* Sound is optional. */ }
  }

  function tone(frequency, duration) { note(frequency, 0, duration, "sine", .055); }

  // A whistle that glides from one pitch to another, with a little wobble and a quieter overtone.
  function whistle(from, to, delay, duration, volume = .06) {
    if (!game.sound) return;
    try {
      const audio = getAudio();
      const t = audio.currentTime + delay;
      [[1, volume], [2, volume * .3]].forEach(([multiple, level]) => {
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        const wobble = audio.createOscillator();
        const wobbleDepth = audio.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(from * multiple, t);
        oscillator.frequency.exponentialRampToValueAtTime(to * multiple, t + duration * .8);
        wobble.frequency.value = 26;
        wobbleDepth.gain.value = 22 * multiple;
        wobble.connect(wobbleDepth).connect(oscillator.frequency);
        gain.gain.setValueAtTime(.0001, t);
        gain.gain.exponentialRampToValueAtTime(level, t + .02);
        gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
        oscillator.connect(gain).connect(getAudio.sfx);
        oscillator.start(t); wobble.start(t);
        oscillator.stop(t + duration + .03); wobble.stop(t + duration + .03);
      });
    } catch (_) { /* Sound is optional. */ }
  }

  function clicks(count, delay) {
    if (!game.sound) return;
    try {
      const audio = getAudio();
      for (let i = 0; i < count; i++) {
        const t = audio.currentTime + delay + i * .045;
        const source = audio.createBufferSource();
        const filter = audio.createBiquadFilter();
        const gain = audio.createGain();
        source.buffer = noiseBuffer(audio);
        filter.type = "bandpass"; filter.frequency.value = 3200; filter.Q.value = 4;
        gain.gain.setValueAtTime(.35, t);
        gain.gain.exponentialRampToValueAtTime(.001, t + .02);
        source.connect(filter).connect(gain).connect(getAudio.sfx);
        source.start(t, Math.random(), .03);
      }
    } catch (_) { /* Sound is optional. */ }
  }

  // The happy dolphin call: two whistles and a few clicks.
  function chirp() {
    whistle(1000, 2400, 0, .11);
    whistle(2400, 1500, .12, .15);
    clicks(3, .32);
  }

  function pop() {
    if (!game.sound) return;
    try {
      const audio = getAudio();
      const t = audio.currentTime;
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.frequency.setValueAtTime(320, t);
      oscillator.frequency.exponentialRampToValueAtTime(1100, t + .06);
      gain.gain.setValueAtTime(.09, t);
      gain.gain.exponentialRampToValueAtTime(.001, t + .08);
      oscillator.connect(gain).connect(getAudio.sfx);
      oscillator.start(t); oscillator.stop(t + .1);
    } catch (_) { /* Sound is optional. */ }
  }

  function splash() {
    if (!game.sound) return;
    try {
      const audio = getAudio();
      const t = audio.currentTime;
      const source = audio.createBufferSource();
      const filter = audio.createBiquadFilter();
      const gain = audio.createGain();
      source.buffer = noiseBuffer(audio);
      filter.type = "bandpass"; filter.Q.value = .8;
      filter.frequency.setValueAtTime(2400, t);
      filter.frequency.exponentialRampToValueAtTime(600, t + .3);
      gain.gain.setValueAtTime(.0001, t);
      gain.gain.exponentialRampToValueAtTime(.5, t + .04);
      gain.gain.exponentialRampToValueAtTime(.001, t + .32);
      source.connect(filter).connect(gain).connect(getAudio.sfx);
      source.start(t, Math.random(), .35);
    } catch (_) { /* Sound is optional. */ }
  }

  // A springy "boing" for bumping a jellyfish.
  function boing() {
    if (!game.sound) return;
    try {
      const audio = getAudio();
      const t = audio.currentTime;
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const wobble = audio.createOscillator();
      const wobbleDepth = audio.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(260, t);
      oscillator.frequency.exponentialRampToValueAtTime(100, t + .45);
      wobble.frequency.value = 15;
      wobbleDepth.gain.value = 45;
      wobble.connect(wobbleDepth).connect(oscillator.frequency);
      gain.gain.setValueAtTime(.12, t);
      gain.gain.exponentialRampToValueAtTime(.001, t + .5);
      oscillator.connect(gain).connect(getAudio.sfx);
      oscillator.start(t); wobble.start(t);
      oscillator.stop(t + .55); wobble.stop(t + .55);
    } catch (_) { /* Sound is optional. */ }
  }

  function oops() { note(330, 0, .2, "sine", .05); note(262, .17, .3, "sine", .05); }
  function coinPing() { note(988, 0, .12, "sine", .06); note(1319, .07, .22, "sine", .06); }
  function hoopPing() { [784, 988, 1175, 1568].forEach((f, i) => note(f, i * .06, .22, "triangle", .06)); }

  // A run of twinkling notes going up.
  function sparkle(count = 6) {
    for (let i = 0; i < count; i++) {
      note(SCALE[Math.min(i + 2, SCALE.length - 1)], i * .07, .3, "triangle", .045);
      note(SCALE[Math.min(i + 2, SCALE.length - 1)] * 2, i * .07 + .02, .18, "sine", .02);
    }
  }

  // The big one: for mastering an island or winning the cup.
  function fanfare() {
    sparkle(9);
    [[523.25, 659.25, 783.99], [659.25, 783.99, 1046.5]].forEach((chord, i) => chord.forEach((f) => note(f, .65 + i * .35, .8, "triangle", .05)));
    whistle(1100, 2500, .7, .12);
    whistle(1500, 2800, 1.05, .12);
    whistle(2800, 1400, 1.4, .2);
    clicks(4, 1.7);
  }

  /* Calm ocean background: slow waves (filtered noise), little bubbles, and the odd soft twinkle. */

  const ambience = { on: false, nodes: [], timer: 0, level: 1 };

  function musicPlaying() { return game.sound && game.music; }

  function startAmbience() {
    if (ambience.on || !musicPlaying() || !("AudioContext" in window || "webkitAudioContext" in window)) return;
    try {
      const audio = getAudio();
      const source = audio.createBufferSource();
      const lowpass = audio.createBiquadFilter();
      const swell = audio.createGain();
      const wave = audio.createOscillator();
      const waveDepth = audio.createGain();
      const waveVolume = audio.createGain();
      source.buffer = noiseBuffer(audio); source.loop = true;
      lowpass.type = "lowpass"; lowpass.frequency.value = 520;
      wave.frequency.value = .11; waveDepth.gain.value = 260; wave.connect(waveDepth).connect(lowpass.frequency);
      swell.gain.value = .55;
      waveVolume.gain.value = .22; wave.connect(waveVolume).connect(swell.gain);
      source.connect(lowpass).connect(swell).connect(getAudio.music);
      source.start(); wave.start();
      ambience.nodes = [source, wave];
      ambience.on = true;
      setMusicLevel(ambience.level);
      const bubble = () => {
        if (!ambience.on) return;
        if (!document.hidden) {
          const f = 500 + Math.random() * 700;
          const t = audio.currentTime;
          const oscillator = audio.createOscillator();
          const gain = audio.createGain();
          oscillator.frequency.setValueAtTime(f, t);
          oscillator.frequency.exponentialRampToValueAtTime(f * 1.9, t + .07);
          gain.gain.setValueAtTime(.05, t);
          gain.gain.exponentialRampToValueAtTime(.001, t + .09);
          oscillator.connect(gain).connect(getAudio.music);
          oscillator.start(t); oscillator.stop(t + .1);
          if (Math.random() < .25) {
            const n = pick(SCALE);
            const chime = audio.createOscillator();
            const chimeGain = audio.createGain();
            chime.type = "sine"; chime.frequency.value = n / 2;
            chimeGain.gain.setValueAtTime(.0001, t + .05);
            chimeGain.gain.exponentialRampToValueAtTime(.05, t + .12);
            chimeGain.gain.exponentialRampToValueAtTime(.0001, t + 2.2);
            chime.connect(chimeGain).connect(getAudio.music);
            chime.start(t + .05); chime.stop(t + 2.3);
          }
        }
        ambience.timer = setTimeout(bubble, 900 + Math.random() * 1800);
      };
      bubble();
    } catch (_) { ambience.on = false; }
  }

  function stopAmbience() {
    ambience.on = false;
    clearTimeout(ambience.timer);
    if (getAudio.music) getAudio.music.gain.setTargetAtTime(0, getAudio.audio.currentTime, .15);
    const nodes = ambience.nodes;
    ambience.nodes = [];
    setTimeout(() => nodes.forEach((node) => { try { node.stop(); } catch (_) { /* already stopped */ } }), 600);
  }

  // The music is a little quieter on the math screen so she can hear her dolphin.
  function setMusicLevel(level) {
    ambience.level = level;
    if (getAudio.music && ambience.on) getAudio.music.gain.setTargetAtTime(.5 * level, getAudio.audio.currentTime, .4);
  }

  function updateMusicButton() {
    const on = musicPlaying();
    $("musicButton").textContent = "🎵";
    $("musicButton").classList.toggle("off", !on);
    $("musicButton").setAttribute("aria-label", game.music ? "Turn music off" : "Turn music on");
  }

  /* ---------- wiring ---------- */

  $("startButton").addEventListener("click", startAdventure);
  $("playAgainButton").addEventListener("click", () => showMap());
  $("backToMap").addEventListener("click", leaveToMap);
  $("homeButton").addEventListener("click", () => showScreen("startScreen"));
  $("resetButton").addEventListener("click", resetProgress);
  $("shopButton").addEventListener("click", () => {
    if (shopOpen()) openShop();
    else mapNote(`Master ${AREAS[0].name} to open the hat shop!`);
  });
  $("treasuresButton").addEventListener("click", openTreasures);
  $("shopBack").addEventListener("click", () => { if ("speechSynthesis" in window) speechSynthesis.cancel(); showMap(); });
  $("treasuresBack").addEventListener("click", () => { if ("speechSynthesis" in window) speechSynthesis.cancel(); showMap(); });
  $("shopToTreasures").addEventListener("click", openTreasures);
  $("payCancel").addEventListener("click", closePay);
  $("tradeButton").addEventListener("click", payTrade);
  $("payOverlay").addEventListener("pointerdown", coinDown);
  $("payOverlay").addEventListener("pointermove", coinMove);
  $("payOverlay").addEventListener("pointerup", coinUp);
  $("payOverlay").addEventListener("pointercancel", coinUp);
  // Keyboard: Enter or Space on a focused coin moves it (a mouse or finger tap is handled by the pointer events above).
  $("payOverlay").addEventListener("click", (event) => {
    const el = event.target.closest?.(".coin");
    if (!el || event.detail !== 0 || el.classList.contains("ghost") || el.classList.contains("small")) return;
    if (el.dataset.where === "purse") payPlace(el.dataset.kind); else if (el.dataset.where === "tray") payTake(el.dataset.kind);
  });
  window.addEventListener("keydown", (event) => { if (event.key === "Escape" && !$("payOverlay").classList.contains("hidden")) closePay(); });
  $("moveUp").addEventListener("click", () => moveLane(-1));
  $("moveDown").addEventListener("click", () => moveLane(1));
  // Upright phone: tap the left or right half to swim one lane that way, or swipe sideways. Otherwise the dolphin follows her finger.
  let touch = null;
  canvas.addEventListener("pointerdown", (event) => {
    if (portrait) touch = { x: event.clientX, y: event.clientY, moved: false };
    else setLaneFromPointer(event);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!portrait) { if (event.buttons) setLaneFromPointer(event); return; }
    if (!touch || touch.moved) return;
    const dx = event.clientX - touch.x;
    if (Math.abs(dx) > 24 && Math.abs(dx) > Math.abs(event.clientY - touch.y)) { touch.moved = true; moveLane(dx > 0 ? 1 : -1); }
  });
  canvas.addEventListener("pointerup", (event) => {
    if (!portrait || !touch) return;
    const wasSwipe = touch.moved;
    touch = null;
    if (wasSwipe) return;
    const rect = canvas.getBoundingClientRect();
    moveLane(event.clientX < rect.left + rect.width / 2 ? -1 : 1);
  });
  canvas.addEventListener("pointercancel", () => { touch = null; });
  window.addEventListener("resize", () => {
    if (!$("raceScreen").classList.contains("hidden") && (window.innerHeight > window.innerWidth) !== portrait) layoutRace();
  });
  mascotCanvas.addEventListener("click", () => {
    const q = game.question;
    if (q && !game.locked) speak(`${q.a} plus ${q.b}. How many in all?`);
  });
  $("typeAnswer").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = $("answerInput");
    if (input.value !== "") checkAnswer(Number(input.value), input);
  });
  $("answerInput").addEventListener("input", (event) => {
    const input = event.target;
    input.value = input.value.replace(/\D/g, "");
    // Single-digit answers are checked as soon as the digit is typed; "10" once both digits are in (or on Enter).
    if (game.question && input.value.length >= String(game.question.answer).length) checkAnswer(Number(input.value), input);
  });
  $("mathScreen").addEventListener("pointerup", () => {
    if (!$("typeAnswer").classList.contains("hidden") && !$("answerInput").disabled) $("answerInput").focus();
  });
  window.addEventListener("keydown", (event) => {
    if (event.target instanceof HTMLInputElement) return;
    if (["ArrowUp", "ArrowLeft", "w", "a"].includes(event.key)) { event.preventDefault(); moveLane(-1); }
    if (["ArrowDown", "ArrowRight", "s", "d"].includes(event.key)) { event.preventDefault(); moveLane(1); }
  });
    $("soundButton").addEventListener("click", () => {
    game.sound = !game.sound;
    game.profile.sound = game.sound;
    saveProfile();
    if (!game.sound && "speechSynthesis" in window) speechSynthesis.cancel();
    $("soundButton").textContent = game.sound ? "🔊" : "🔇";
    $("soundButton").setAttribute("aria-label", game.sound ? "Turn sound off" : "Turn sound on");
    if (game.sound) startAmbience(); else stopAmbience();
    updateMusicButton();
  });
  $("musicButton").addEventListener("click", () => {
    game.music = !game.music;
    game.profile.music = game.music;
    saveProfile();
    if (musicPlaying()) startAmbience(); else stopAmbience();
    updateMusicButton();
  });
  // Browsers only allow sound after a tap, so the ocean starts on her first tap.
  const unlockAudio = () => { try { getAudio(); startAmbience(); } catch (_) { /* Sound is optional. */ } };
  document.addEventListener("pointerup", unlockAudio, { passive: true });
  document.addEventListener("keydown", unlockAudio);
  document.addEventListener("pointerdown", (event) => {
    const button = event.target.closest?.("button");
    if (button && !["moveUp", "moveDown"].includes(button.id)) pop();
  }, { passive: true });
  // The attempt log is written shortly after each answer; make sure the last ones are saved when she leaves.
  document.addEventListener("visibilitychange", () => { if (document.hidden) flushLog(); });
  window.addEventListener("pagehide", flushLog);
  document.addEventListener("visibilitychange", () => {
    if (!getAudio.audio) return;
    if (document.hidden) getAudio.audio.suspend(); else if (game.sound) getAudio.audio.resume();
  });

  layoutRace();
  initColors();
  // Come back to where she left off: straight to the map if she has played before.
  if (Object.keys(game.profile.facts).length || Object.keys(game.profile.done).length) showMap();
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
})();
