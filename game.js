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

  // Eight islands, each a small family of facts (nothing adds up to more than 10).
  // A fact counts as "learned" after GOAL right answers in a row on the first try; learn them all to unlock the next island.
  const GOAL = 2;
  const ROUND_LENGTH = 6;
  const RACE_SECONDS = 25;
  const ISLANDS = [
    { name: "Bubble Bay", sub: "Adding up to 4", emoji: "🏝️", facts: [[1, 1], [1, 2], [2, 1], [1, 3], [3, 1], [2, 2]] },
    { name: "Coral Cove", sub: "Adding up to 5", emoji: "🐠", facts: [[1, 4], [4, 1], [2, 3], [3, 2]] },
    { name: "Shell Shore", sub: "Plus 1", emoji: "🐚", facts: [[5, 1], [6, 1], [7, 1], [8, 1], [9, 1]] },
    { name: "Kelp Forest", sub: "Plus 2", emoji: "🌿", facts: [[2, 4], [2, 5], [2, 6], [2, 7], [2, 8]] },
    { name: "Pirate Wreck", sub: "Doubles", emoji: "🚢", facts: [[3, 3], [4, 4], [5, 5]] },
    { name: "Rainbow Reef", sub: "Adding up to 7", emoji: "🌈", facts: [[3, 4], [4, 3], [2, 5], [5, 2], [1, 6]] },
    { name: "Glow Grotto", sub: "Adding up to 9", emoji: "🦑", facts: [[4, 5], [5, 4], [3, 6], [6, 3], [7, 2], [1, 8]] },
    { name: "Dolphin Palace", sub: "Make 10!", emoji: "🏰", facts: [[1, 9], [9, 1], [2, 8], [8, 2], [3, 7], [7, 3], [4, 6], [6, 4], [5, 5]] }
  ];

  // Race scenery gets richer with every island (each island keeps everything the earlier ones had).
  const WATER = [
    ["#b8fcff", "#20d4eb", "#0797ce", "#034f98"],
    ["#c9fff2", "#2fe0c8", "#07a9b8", "#046f8f"],
    ["#ffe9c9", "#4fd9e6", "#0c9ad0", "#05549a"],
    ["#d3ffc9", "#3fd6b0", "#0a9a9f", "#065a78"],
    ["#b8e8ff", "#2aa9e8", "#0b6fb8", "#06336f"],
    ["#ffd9f0", "#7fd2ff", "#27a0e6", "#0a56b8"],
    ["#6fb8ff", "#2a6fe0", "#1a2f9a", "#0c1459"],
    ["#fff2b8", "#52e0e8", "#1aa0dd", "#0a4fa0"]
  ];
  const REEF = [
    ["#ff668a", "#734fd1", "#17bb92"], ["#ff7a59", "#ff4f9a", "#17bb92"], ["#ffb347", "#ff668a", "#e6c27a"], ["#2fbf71", "#7ed957", "#1b8f5a"],
    ["#c9a46b", "#e8c98c", "#4f6a73"], ["#ff6bd6", "#7a6cff", "#35dfa0"], ["#7af0ff", "#b57aff", "#2d3ea8"], ["#ffd447", "#ff8fd1", "#ffe28a"]
  ];
  const FISH_COLORS = ["#ffd447", "#ff8a5c", "#ff62a3", "#9ef0ff", "#b9ff8a"];

  const PRAISE = ["Great job!", "You got it!", "Awesome!", "Super swimmer!", "Splashtastic!", "Amazing!", "Yes! That's right!", "Wow, so smart!"];
  const OOPS = ["Almost! Let's count together.", "Good try! Count with me.", "Nice thinking! Let's count it."];
  const KEEP = ["You can do it! Tap the glowing one.", "Keep going, you're so close!", "I believe in you! Try the glowing one."];

  const $ = (id) => document.getElementById(id);
  const pick = (items) => items[Math.floor(Math.random() * items.length)];
  const screens = ["startScreen", "mapScreen", "mathScreen", "raceScreen", "finishScreen"];
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

  function defaultProfile() {
    return { v: 2, name: "Bubbles", color: 0, coins: 0, correct: 0, sound: true, music: true, done: {}, facts: {} };
  }

  function loadProfile() {
    try {
      return { ...defaultProfile(), ...(JSON.parse(localStorage.getItem("piperDolphinMath2")) || {}) };
    } catch (_) {
      return defaultProfile();
    }
  }

  function saveProfile() {
    try { localStorage.setItem("piperDolphinMath2", JSON.stringify(game.profile)); } catch (_) { /* Saving is best effort. */ }
  }

  const game = {
    profile: loadProfile(),
    selectedColor: 0,
    name: "Bubbles",
    sound: true,
    music: true,
    island: 0,
    questionIndex: 0,
    question: null,
    questionStarted: 0,
    attempts: 0,
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
    screens.forEach((screen) => $(screen).classList.toggle("hidden", screen !== id));
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
  const isUnlocked = (i) => i === 0 || Boolean(game.profile.done[i - 1]);
  const islandProgress = (i) => ISLANDS[i].facts.filter(([a, b]) => factRecord(a, b).streak >= GOAL).length;
  const currentIsland = () => {
    const open = ISLANDS.findIndex((_, i) => isUnlocked(i) && !game.profile.done[i]);
    return open < 0 ? ISLANDS.length - 1 : open;
  };

  function showMap(afterRace = false) {
    $("mapTitle").textContent = `${game.name}'s adventure`;
    $("mapCoins").textContent = game.profile.coins;
    const banner = $("mapBanner");
    if (game.justMastered !== null) {
      const next = ISLANDS[game.justMastered + 1];
      banner.textContent = next
        ? `🎉 You mastered ${ISLANDS[game.justMastered].name}! ${next.name} is open!`
        : `🎉 You mastered ${ISLANDS[game.justMastered].name}!`;
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
    showScreen("mapScreen");
    if (unlockedNow !== null) sparkle(8);
    const current = document.querySelector(".island.current");
    if (current) current.scrollIntoView({ block: "center" });
  }

  function renderMap(fresh) {
    const list = $("islandList");
    list.replaceChildren();
    const current = currentIsland();
    ISLANDS.forEach((island, i) => {
      const unlocked = isUnlocked(i);
      const done = Boolean(game.profile.done[i]);
      const button = document.createElement("button");
      button.type = "button";
      button.disabled = !unlocked;
      button.className = `island${unlocked ? "" : " locked"}${done ? " done" : ""}${i === current ? " current" : ""}${i === fresh ? " fresh" : ""}`;
      const dots = island.facts.map(([a, b]) => `<i class="${done || factRecord(a, b).streak >= GOAL ? "on" : ""}"></i>`).join("");
      const status = !unlocked ? `Finish ${ISLANDS[i - 1].name} first` : done ? "⭐ Mastered!" : `${islandProgress(i)} of ${island.facts.length} facts learned`;
      button.innerHTML = `<span class="island-art">${unlocked ? island.emoji : "🔒"}${i === current ? `<span class="marker" style="filter:${COLORS[game.selectedColor].filter}">🐬</span>` : ""}</span>` +
        `<span class="island-info"><strong>${i + 1}. ${island.name}</strong><small>${island.sub}</small><span class="fact-dots">${dots}</span><em>${status}</em></span>`;
      button.addEventListener("click", () => startIsland(i));
      list.appendChild(button);
    });
  }

  function resetProgress() {
    if (!window.confirm("Start over from the first island? This erases all saved progress.")) return;
    const { name, color, sound } = game.profile;
    game.profile = { ...defaultProfile(), name, color, sound };
    saveProfile();
    game.justMastered = null;
    showMap();
  }

  /* ---------- math ---------- */

  function startIsland(i) {
    game.island = i;
    game.questionIndex = 0;
    game.streak = 0;
    game.recent = [];
    game.boost = 0;
    game.roundCoins = 0;
    $("mathDolphinName").textContent = game.name;
    $("mathCoins").textContent = game.profile.coins;
    $("islandLabel").textContent = ISLANDS[i].name.toUpperCase();
    showScreen("mathScreen");
    renderQuestion();
  }

  const weightOf = (record) => (record.streak >= GOAL ? 1 : 4 - record.streak + (record.wrong > record.right ? 2 : 0));

  function chooseQuestion() {
    let facts = ISLANDS[game.island].facts;
    // Now and then, revisit facts from earlier islands so nothing gets forgotten.
    if (game.island > 0 && Math.random() < .2) facts = ISLANDS.slice(0, game.island).flatMap((island) => island.facts);
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
        say(pick(OOPS));
        startCount();
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

    const island = ISLANDS[game.island];
    if (!game.profile.done[game.island] && islandProgress(game.island) === island.facts.length) {
      game.profile.done[game.island] = true;
      game.justMastered = game.island;
      praise = `You mastered ${island.name}! Hooray!`;
    }
    saveProfile();
    say(praise);
    setMascot("cheer");
    burstStars();
    if (game.justMastered === game.island) fanfare(); else { chirp(); sparkle(4); }
    game.nextTimer = setTimeout(() => {
      game.questionIndex += 1;
      if (game.justMastered !== null || game.questionIndex >= ROUND_LENGTH) startRaceRound(); else renderQuestion();
    }, game.justMastered !== null ? 2300 : 1700);
  }

  // Count the pieces one at a time with her dolphin, then point at the right answer.
  function startCount() {
    const id = ++game.hintId;
    const q = game.question;
    const tokens = [...document.querySelectorAll("#tokens .token")];
    tokens.forEach((token) => { token.classList.remove("counted"); delete token.dataset.n; });
    tokens.forEach((token, i) => setTimeout(() => {
      if (game.hintId !== id) return;
      token.classList.add("counted");
      token.dataset.n = i + 1;
      note(SCALE[Math.min(i, SCALE.length - 1)], 0, .3, "triangle", .07);
      speak(String(i + 1), true);
    }, 1100 + i * 700));
    setTimeout(() => {
      if (game.hintId !== id) return;
      say(`${q.a} plus ${q.b} makes ${q.answer}!`, undefined, true);
      glowAnswer();
    }, 1100 + tokens.length * 700 + 150);
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

  /* ---------- the dolphin coach ---------- */

  const mascot = { state: "idle", t0: 0, running: false };

  function setMascot(state) {
    mascot.state = state;
    mascot.t0 = performance.now();
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
    if (mascot.state === "cheer" && p < 1.4) {
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
    drawDolphin(mctx, 0, 0, COLORS[game.selectedColor].value, 1.55, mood);
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

  function say(text, spoken, queue = false) {
    $("mascotSay").textContent = text;
    speak(spoken || text, queue);
  }

  function speak(text, queue = false) {
    if (!game.sound || !("speechSynthesis" in window)) return;
    try {
      if (!queue) speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = .88;
      utterance.pitch = 1.3;
      speechSynthesis.speak(utterance);
    } catch (_) { /* Speech is optional. */ }
  }

  /* ---------- the race ---------- */

  function startRaceRound() {
    showScreen("raceScreen");
    layoutRace();
    const n = game.island + 1;
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
      fish: Array.from({ length: 10 + n * 3 }, (_, i) => ({
        x: Math.random() * VIEW_W, y: 110 + Math.random() * 400, size: 6 + Math.random() * 10, depth: .2 + (i % 4) * .1,
        color: n >= 2 ? FISH_COLORS[i % FISH_COLORS.length] : null
      })),
      glow: Array.from({ length: 34 }, () => ({ x: Math.random() * VIEW_W, y: 80 + Math.random() * 480, r: 3 + Math.random() * 5, phase: Math.random() * 6 })),
      wake: [],
      world: 0,
      flash: 0
    };
    $("raceIsland").textContent = ISLANDS[game.island].name;
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
    const n = game.island + 1;
    const now = performance.now() / 1000;
    applyView();
    const stops = WATER[n - 1];
    const gradient = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    gradient.addColorStop(0, stops[0]); gradient.addColorStop(.14, stops[1]); gradient.addColorStop(.5, stops[2]); gradient.addColorStop(1, stops[3]);
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // Animated sunlight (more rays on later islands).
    ctx.save();
    ctx.globalAlpha = n >= 6 ? .2 : .13;
    for (let i = 0; i < (n >= 6 ? 11 : 8); i++) {
      const topX = 70 + i * (n >= 6 ? 112 : 155) + Math.sin(now + i) * 22;
      const ray = ctx.createLinearGradient(topX, 0, topX + 140, 500);
      ray.addColorStop(0, "rgba(255,255,255,.9)"); ray.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = ray; ctx.beginPath(); ctx.moveTo(topX, 0); ctx.lineTo(topX + 65, 0); ctx.lineTo(topX + 260, 570); ctx.lineTo(topX + 100, 570); ctx.closePath(); ctx.fill();
    }
    ctx.restore();

    if (n >= 6) drawRainbow();
    ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 5;
    ctx.beginPath();
    for (let x = 0; x <= VIEW_W; x += 18) {
      const y = 25 + Math.sin(x * .025 + now * 2.3) * 7;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    if (n >= 8) drawPalace(race.world);
    if (n >= 5) drawShip(race.world);

    ctx.globalAlpha = .22; ctx.fillStyle = "white";
    race.bubbles.forEach((b, i) => {
      const x = (b.x - race.world * (.12 + i % 3 * .03) + VIEW_W * 3) % VIEW_W;
      const y = (b.y - now * (4 + i % 4) + VIEW_H) % VIEW_H;
      ctx.beginPath(); ctx.arc(x, y, b.r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;

    race.fish.forEach((fish, i) => {
      const x = (fish.x - race.world * fish.depth + VIEW_W * 4) % (VIEW_W + 80) - 40;
      const y = fish.y + Math.sin(now * 1.7 + i) * 8;
      ctx.save(); ctx.translate(x, y);
      ctx.globalAlpha = fish.color ? .5 + fish.depth * .3 : .16 + fish.depth * .22;
      ctx.fillStyle = fish.color || (i % 2 ? "#003e73" : "#b9fcff");
      ctx.beginPath(); ctx.ellipse(0, 0, fish.size * 1.55, fish.size, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(fish.size, 0); ctx.lineTo(fish.size * 2.2, -fish.size); ctx.lineTo(fish.size * 2.2, fish.size); ctx.closePath(); ctx.fill(); ctx.restore();
    });

    ctx.fillStyle = "rgba(0,92,126,.25)";
    for (let x = -80 - (race.world * .18 % 140); x < VIEW_W + 100; x += 140) {
      ctx.beginPath(); ctx.moveTo(x, VIEW_H); ctx.quadraticCurveTo(x + 40 + Math.sin(now + x) * 8, 500, x + 75, VIEW_H); ctx.fill();
    }

    if (n >= 7) drawGlow(race, now);
    drawReef(race.world, now, REEF[n - 1]);
    if (n >= 4) drawKelp(race.world, now);
    if (n >= 3) drawChests(race.world, now);

    race.objects.forEach((obj) => drawObject(obj, n));
    race.wake.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.life) * .55; ctx.strokeStyle = "white"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.stroke();
    });
    ctx.globalAlpha = 1;
    drawSpeedLines(game.boost, now);
    drawDolphin(ctx, 245, race.playerY + Math.sin(now * 5) * 4, COLORS[game.selectedColor].value, 1.14);

    if (race.flash) {
      ctx.fillStyle = race.flash > 0 ? `rgba(255,239,91,${Math.abs(race.flash)})` : `rgba(255,80,120,${Math.abs(race.flash)})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
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

  function drawObject(obj, n) {
    const upright = () => { if (portrait) ctx.rotate(Math.PI / 2); };
    ctx.save(); ctx.translate(obj.x, obj.y);
    if (obj.type === "coin") {
      const width = 13 + Math.abs(Math.cos(obj.spin)) * 20;
      ctx.fillStyle = "#ffcd2e"; ctx.strokeStyle = "#fff39c"; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.ellipse(0, 0, width, 31, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#e6a512"; ctx.font = "900 26px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; upright(); ctx.fillText("★", 0, 2);
    } else if (obj.type === "hoop") {
      ctx.strokeStyle = n >= 8 ? "#ffc400" : "#ffdb39"; ctx.lineWidth = 15; ctx.shadowColor = "#fff59d"; ctx.shadowBlur = n >= 8 ? 26 : 14;
      ctx.beginPath(); ctx.ellipse(0, 0, 35, 68, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0; ctx.fillStyle = "white"; ctx.font = "900 18px sans-serif"; ctx.textAlign = "center"; upright(); ctx.fillText("+2", 0, 6);
    } else {
      ctx.font = "75px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; upright(); ctx.fillText("🪼", 0, 0);
    }
    ctx.restore();
  }

  function drawDolphin(c, x, y, color, scale = 1, mood = "happy") {
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
    if (game.justMastered === ISLANDS.length - 1) { setTimeout(finishGame, 800); return; }
    $("raceCallout").textContent = `Great swimming! ${game.roundCoins} coins!`;
    $("raceCallout").style.opacity = "1";
    setTimeout(() => showMap(true), 1300);
  }

  function finishGame() {
    game.justMastered = null;
    showScreen("finishScreen");
    $("finishTitle").textContent = `${game.name} won the Dolphin Cup!`;
    $("finishMessage").textContent = `You explored all 8 islands and made ${game.name} super speedy.`;
    $("correctStat").textContent = game.profile.correct;
    $("coinStat").textContent = game.profile.coins;
    $("islandStat").textContent = ISLANDS.length;
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
