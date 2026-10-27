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

  const $ = (id) => document.getElementById(id);
  const screens = ["startScreen", "mathScreen", "raceScreen", "finishScreen"];
  const canvas = $("raceCanvas");
  const ctx = canvas.getContext("2d");
  const VIEW_W = 1100;
  const VIEW_H = 620;
  const PIXEL_RATIO = Math.min(2.5, window.devicePixelRatio || 1);

  function setupCanvas() {
    canvas.width = Math.round(VIEW_W * PIXEL_RATIO);
    canvas.height = Math.round(VIEW_H * PIXEL_RATIO);
    ctx.setTransform(PIXEL_RATIO, 0, 0, PIXEL_RATIO, 0, 0);
  }

  const game = {
    selectedColor: 0,
    name: "Bubbles",
    miles: 0,
    coins: 0,
    opponents: [],
    round: 0,
    questionIndex: 0,
    question: null,
    questionStarted: 0,
    boost: 0,
    correct: 0,
    streak: 0,
    bestStreak: 0,
    sound: true,
    profile: loadProfile(),
    race: null
  };

  function loadProfile() {
    try {
      return JSON.parse(localStorage.getItem("piperDolphinMath")) || { level: 1, focus: "1+1", facts: {} };
    } catch (_) {
      return { level: 1, focus: "1+1", facts: {} };
    }
  }

  function saveProfile() {
    localStorage.setItem("piperDolphinMath", JSON.stringify(game.profile));
  }

  function showScreen(id) {
    screens.forEach((screen) => $(screen).classList.toggle("hidden", screen !== id));
  }

  function initColors() {
    COLORS.forEach((color, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `color-choice${index === 0 ? " selected" : ""}`;
      button.style.background = color.value;
      button.setAttribute("role", "radio");
      button.setAttribute("aria-label", color.name);
      button.setAttribute("aria-checked", String(index === 0));
      button.addEventListener("click", () => {
        game.selectedColor = index;
        document.querySelectorAll(".color-choice").forEach((choice, i) => {
          choice.classList.toggle("selected", i === index);
          choice.setAttribute("aria-checked", String(i === index));
        });
        tone(420 + index * 40, .08);
      });
      $("colorPicker").appendChild(button);
    });
  }

  function startGame() {
    game.name = $("dolphinName").value.trim() || "Bubbles";
    game.miles = 0;
    game.coins = 0;
    game.round = 0;
    game.correct = 0;
    game.streak = 0;
    game.bestStreak = 0;
    game.opponents = COLORS.filter((_, i) => i !== game.selectedColor).map((color, i) => ({
      color: color.value,
      name: ["Splash", "Sunny", "Twinkle", "Finn", "Coral"][i],
      miles: 0
    }));
    $("mathDolphinName").textContent = game.name;
    startMathRound();
  }

  function makeFactPool(level) {
    const facts = [];
    const maxSum = [5, 7, 10, 12, 15, 18][Math.min(level - 1, 5)];
    for (let a = 0; a <= Math.min(9, maxSum); a++) {
      for (let b = 0; b <= Math.min(9, maxSum - a); b++) {
        const sum = a + b;
        if (sum >= 2 && sum <= maxSum && (level > 1 || a <= 3 && b <= 3)) facts.push({ a, b, answer: sum });
      }
    }
    return facts;
  }

  function chooseQuestion() {
    const profile = game.profile;
    const pool = makeFactPool(profile.level);
    let fact;
    const focus = profile.focus && profile.focus.split("+").map(Number);
    const useFocus = focus && Math.random() < .38;
    if (useFocus && focus[0] + focus[1] <= [5, 7, 10, 12, 15, 18][Math.min(profile.level - 1, 5)]) {
      fact = { a: focus[0], b: focus[1], answer: focus[0] + focus[1] };
    } else {
      const weighted = pool.flatMap((item) => {
        const record = profile.facts[`${item.a}+${item.b}`];
        const weight = !record ? 3 : Math.max(1, 4 - record.correct + record.wrong * 2);
        return Array(weight).fill(item);
      });
      fact = weighted[Math.floor(Math.random() * weighted.length)];
    }
    const wrong = new Set();
    while (wrong.size < 2) {
      const offset = Math.floor(Math.random() * 7) - 3;
      const candidate = Math.max(0, fact.answer + (offset || 1));
      if (candidate !== fact.answer) wrong.add(candidate);
    }
    return { ...fact, choices: shuffle([fact.answer, ...wrong]) };
  }

  function startMathRound() {
    game.questionIndex = 0;
    game.boost = 0;
    game.round += 1;
    $("mathMiles").textContent = game.miles;
    showScreen("mathScreen");
    renderQuestion();
  }

  function renderQuestion() {
    game.question = chooseQuestion();
    game.questionStarted = performance.now();
    $("questionCounter").textContent = `Question ${game.questionIndex + 1} of 6`;
    $("equation").textContent = `${game.question.a} + ${game.question.b} = ?`;
    $("mathMessage").textContent = game.questionIndex === 0 ? "Answer quickly to charge your speed boost!" : encouragement();
    $("answers").replaceChildren();
    game.question.choices.forEach((value) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "answer-button";
      button.textContent = value;
      button.addEventListener("click", () => checkAnswer(value, button));
      $("answers").appendChild(button);
    });
    renderDots();
    animateBoostTimer();
  }

  function renderDots() {
    $("questionDots").replaceChildren();
    for (let i = 0; i < 6; i++) {
      const dot = document.createElement("span");
      dot.className = `question-dot${i < game.questionIndex ? " done" : i === game.questionIndex ? " current" : ""}`;
      $("questionDots").appendChild(dot);
    }
  }

  function animateBoostTimer() {
    const startedFor = game.questionStarted;
    const tick = () => {
      if (game.questionStarted !== startedFor || $("mathScreen").classList.contains("hidden")) return;
      const elapsed = (performance.now() - startedFor) / 1000;
      const remaining = Math.max(.18, 1 - elapsed / 12);
      $("boostFill").style.width = `${remaining * 100}%`;
      $("boostText").textContent = remaining > .7 ? "Super fast!" : remaining > .4 ? "Keep going!" : "You can do it!";
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function checkAnswer(value, button) {
    if (button.disabled) return;
    const q = game.question;
    const key = `${q.a}+${q.b}`;
    const record = game.profile.facts[key] || { correct: 0, wrong: 0 };
    if (value !== q.answer) {
      button.classList.add("try-again");
      setTimeout(() => button.classList.remove("try-again"), 350);
      record.wrong += 1;
      game.streak = 0;
      game.profile.focus = key;
      game.profile.facts[key] = record;
      $("mathMessage").textContent = `Good try! Count on from ${Math.max(q.a, q.b)}.`;
      tone(190, .12);
      return;
    }

    document.querySelectorAll(".answer-button").forEach((item) => { item.disabled = true; });
    button.classList.add("correct");
    const seconds = (performance.now() - game.questionStarted) / 1000;
    game.boost += Math.max(.5, 1.6 - seconds / 10);
    game.correct += 1;
    game.streak += 1;
    game.bestStreak = Math.max(game.bestStreak, game.streak);
    record.correct += 1;
    record.lastSeconds = Math.round(seconds * 10) / 10;
    game.profile.facts[key] = record;
    adaptDifficulty(key, record);
    saveProfile();
    $("mathMessage").textContent = seconds < 5 ? "Lightning fast! ⚡" : "You got it! ⭐";
    tone(620, .09); setTimeout(() => tone(820, .12), 90);
    setTimeout(() => {
      game.questionIndex += 1;
      if (game.questionIndex >= 6) startRaceRound(); else renderQuestion();
    }, 650);
  }

  function adaptDifficulty(key, record) {
    const attempted = Object.values(game.profile.facts);
    const recentAccuracy = attempted.reduce((n, item) => n + item.correct, 0) /
      Math.max(1, attempted.reduce((n, item) => n + item.correct + item.wrong, 0));
    if (key === game.profile.focus && record.correct >= 3 && record.correct > record.wrong * 2) {
      const nextPool = makeFactPool(Math.min(6, game.profile.level + 1)).filter((f) => !game.profile.facts[`${f.a}+${f.b}`]);
      const next = nextPool[Math.floor(Math.random() * nextPool.length)];
      if (next) game.profile.focus = `${next.a}+${next.b}`;
    }
    if (game.streak >= 5 && recentAccuracy > .82) game.profile.level = Math.min(6, game.profile.level + 1);
    if (recentAccuracy < .58 && attempted.length >= 4) game.profile.level = Math.max(1, game.profile.level - 1);
  }

  function startRaceRound() {
    showScreen("raceScreen");
    const lanes = [155, 310, 465];
    game.race = {
      active: true,
      started: performance.now(),
      duration: 30000,
      lastFrame: performance.now(),
      playerY: lanes[1],
      targetY: lanes[1],
      lanes,
      objects: [],
      spawnClock: 0,
      bubbles: Array.from({ length: 42 }, () => ({ x: Math.random() * VIEW_W, y: Math.random() * VIEW_H, r: 2 + Math.random() * 8 })),
      fish: Array.from({ length: 14 }, (_, i) => ({ x: Math.random() * VIEW_W, y: 110 + Math.random() * 400, size: 6 + Math.random() * 10, depth: .2 + (i % 4) * .1 })),
      wake: [],
      world: 0,
      flash: 0
    };
    $("raceCallout").style.opacity = "1";
    setTimeout(() => { if (game.race) $("raceCallout").style.opacity = "0"; }, 2800);
    requestAnimationFrame(raceLoop);
  }

  function raceLoop(now) {
    const race = game.race;
    if (!race || !race.active) return;
    const dt = Math.min(.035, (now - race.lastFrame) / 1000);
    race.lastFrame = now;
    const elapsed = now - race.started;
    const remaining = Math.max(0, Math.ceil((race.duration - elapsed) / 1000));
    $("raceTimer").textContent = remaining;
    updateRace(dt);
    drawRace();
    updateRaceHud();
    if (elapsed >= race.duration || game.miles >= 30) endRaceRound();
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
        game.coins += 1; game.miles = Math.min(30, game.miles + 1); race.flash = .25; tone(740, .06);
      } else if (obj.type === "hoop") {
        game.coins += 2; game.miles = Math.min(30, game.miles + 2); race.flash = .4; tone(780, .07); setTimeout(() => tone(980, .09), 70);
      } else {
        game.boost = Math.max(0, game.boost - .6); race.flash = -.35; tone(150, .14);
      }
    });
    race.objects = race.objects.filter((obj) => obj.x > -90 && !obj.hit);
    race.flash += race.flash > 0 ? -dt : race.flash < 0 ? dt : 0;
    game.opponents.forEach((opponent, i) => {
      const pace = .24 + i * .018 + Math.random() * .11;
      opponent.miles = Math.min(29, opponent.miles + pace * dt);
      if (opponent.miles > game.miles + 5) opponent.miles -= .3 * dt;
    });
  }

  function spawnPath() {
    const race = game.race;
    const lane = Math.floor(Math.random() * 3);
    const chance = Math.random();
    if (chance < .13) {
      race.objects.push({ type: "jelly", x: 1170, y: race.lanes[lane], spin: 0, hit: false });
    } else if (chance < .25) {
      race.objects.push({ type: "hoop", x: 1170, y: race.lanes[lane], spin: 0, hit: false });
    } else {
      const count = Math.random() < .25 ? 3 : 1;
      for (let i = 0; i < count; i++) race.objects.push({ type: "coin", x: 1170 + i * 92, y: race.lanes[lane], spin: i, hit: false });
    }
  }

  function drawRace() {
    const race = game.race;
    const now = performance.now() / 1000;
    const gradient = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    gradient.addColorStop(0, "#b8fcff"); gradient.addColorStop(.14, "#20d4eb"); gradient.addColorStop(.5, "#0797ce"); gradient.addColorStop(1, "#034f98");
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // Animated sunlight and water caustics.
    ctx.save();
    ctx.globalAlpha = .13;
    for (let i = 0; i < 8; i++) {
      const topX = 70 + i * 155 + Math.sin(now + i) * 22;
      const ray = ctx.createLinearGradient(topX, 0, topX + 140, 500);
      ray.addColorStop(0, "rgba(255,255,255,.9)"); ray.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = ray; ctx.beginPath(); ctx.moveTo(topX, 0); ctx.lineTo(topX + 65, 0); ctx.lineTo(topX + 260, 570); ctx.lineTo(topX + 100, 570); ctx.closePath(); ctx.fill();
    }
    ctx.restore();

    ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 5;
    ctx.beginPath();
    for (let x = 0; x <= VIEW_W; x += 18) {
      const y = 25 + Math.sin(x * .025 + now * 2.3) * 7;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

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
      ctx.save(); ctx.translate(x, y); ctx.globalAlpha = .16 + fish.depth * .22; ctx.fillStyle = i % 2 ? "#003e73" : "#b9fcff";
      ctx.beginPath(); ctx.ellipse(0, 0, fish.size * 1.55, fish.size, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(fish.size, 0); ctx.lineTo(fish.size * 2.2, -fish.size); ctx.lineTo(fish.size * 2.2, fish.size); ctx.closePath(); ctx.fill(); ctx.restore();
    });

    ctx.fillStyle = "rgba(0,92,126,.25)";
    for (let x = -80 - (race.world * .18 % 140); x < VIEW_W + 100; x += 140) {
      ctx.beginPath(); ctx.moveTo(x, VIEW_H); ctx.quadraticCurveTo(x + 40 + Math.sin(now + x) * 8, 500, x + 75, VIEW_H); ctx.fill();
    }

    drawReef(race.world, now);

    race.objects.forEach(drawObject);
    race.wake.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.life) * .55; ctx.strokeStyle = "white"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.stroke();
    });
    ctx.globalAlpha = 1;
    drawSpeedLines(game.boost, now);
    drawDolphin(245, race.playerY + Math.sin(now * 5) * 4, COLORS[game.selectedColor].value, 1.14);

    if (race.flash) {
      ctx.fillStyle = race.flash > 0 ? `rgba(255,239,91,${Math.abs(race.flash)})` : `rgba(255,80,120,${Math.abs(race.flash)})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }

  function drawReef(world, now) {
    ctx.save();
    ctx.translate(-(world * .42 % 220), 0);
    for (let x = -100; x < VIEW_W + 260; x += 220) {
      ctx.fillStyle = x % 440 === 0 ? "#ff668a" : "#734fd1";
      for (let stem = 0; stem < 5; stem++) {
        ctx.lineWidth = 9 - stem; ctx.strokeStyle = ctx.fillStyle; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(x + stem * 16, 620); ctx.quadraticCurveTo(x + stem * 14 + Math.sin(now * 1.4 + stem) * 9, 565, x + stem * 20 - 8, 530 - stem * 9); ctx.stroke();
      }
      ctx.fillStyle = "#17bb92"; ctx.beginPath(); ctx.ellipse(x + 115, 610, 72, 24, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawSpeedLines(boost, now) {
    if (boost < .5) return;
    ctx.save(); ctx.globalAlpha = Math.min(.42, boost * .05); ctx.strokeStyle = "white"; ctx.lineWidth = 3; ctx.lineCap = "round";
    for (let i = 0; i < 11; i++) {
      const x = (now * -380 - i * 137 + 1100 * 4) % 1100;
      const y = 90 + (i * 83 % 450);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 55 - boost * 3, y); ctx.stroke();
    }
    ctx.restore();
  }

  function drawObject(obj) {
    ctx.save(); ctx.translate(obj.x, obj.y);
    if (obj.type === "coin") {
      const width = 13 + Math.abs(Math.cos(obj.spin)) * 20;
      ctx.fillStyle = "#ffcd2e"; ctx.strokeStyle = "#fff39c"; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.ellipse(0, 0, width, 31, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#e6a512"; ctx.font = "900 26px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("★", 0, 2);
    } else if (obj.type === "hoop") {
      ctx.strokeStyle = "#ffdb39"; ctx.lineWidth = 15; ctx.shadowColor = "#fff59d"; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.ellipse(0, 0, 35, 68, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0; ctx.fillStyle = "white"; ctx.font = "900 18px sans-serif"; ctx.textAlign = "center"; ctx.fillText("+2", 0, 6);
    } else {
      ctx.font = "75px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("🪼", 0, 0);
    }
    ctx.restore();
  }

  function drawDolphin(x, y, color, scale = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    ctx.shadowColor = "rgba(0,34,80,.28)"; ctx.shadowBlur = 16; ctx.shadowOffsetY = 9;
    const body = ctx.createLinearGradient(0, -50, 0, 38);
    body.addColorStop(0, lighten(color, 42)); body.addColorStop(.46, color); body.addColorStop(1, shade(color, 28));
    ctx.fillStyle = body; ctx.strokeStyle = "rgba(0,43,84,.25)"; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-74, 4); ctx.bezierCurveTo(-50, -43, 28, -48, 70, -3); ctx.bezierCurveTo(28, 22, -25, 33, -60, 20); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-62, 7); ctx.lineTo(-105, -23); ctx.lineTo(-91, 8); ctx.lineTo(-107, 37); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-5, -31); ctx.quadraticCurveTo(8, -68, 27, -30); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(9, 19); ctx.quadraticCurveTo(25, 50, 44, 15); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,.38)"; ctx.beginPath(); ctx.ellipse(9, 14, 47, 13, -.08, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.beginPath(); ctx.ellipse(9, -29, 30, 7, -.08, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(39, -15, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#062f4f"; ctx.beginPath(); ctx.arc(42, -15, 3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#063b5a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(54, -2, 10, .2, 1.6); ctx.stroke();
    ctx.restore();
  }

  function lighten(hex, amount) {
    return adjustColor(hex, amount);
  }

  function shade(hex, amount) {
    return adjustColor(hex, -amount);
  }

  function adjustColor(hex, amount) {
    const value = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, (value >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((value >> 8) & 255) + amount));
    const b = Math.max(0, Math.min(255, (value & 255) + amount));
    return `rgb(${r},${g},${b})`;
  }

  function updateRaceHud() {
    $("raceMiles").textContent = game.miles;
    const place = 1 + game.opponents.filter((o) => o.miles > game.miles).length;
    $("racePlace").textContent = `${place}${place === 1 ? "st" : place === 2 ? "nd" : place === 3 ? "rd" : "th"}`;
  }

  function endRaceRound() {
    if (!game.race?.active) return;
    game.race.active = false;
    if (game.miles >= 30) return finishGame();
    $("raceCallout").textContent = `Great swimming! ${game.miles} miles so far!`;
    $("raceCallout").style.opacity = "1";
    setTimeout(startMathRound, 1300);
  }

  function finishGame() {
    showScreen("finishScreen");
    $("finishTitle").textContent = `${game.name} won the Dolphin Cup!`;
    $("finishMessage").textContent = `You raced 30 miles and made ${game.name} super speedy.`;
    $("correctStat").textContent = game.correct;
    $("coinStat").textContent = game.coins;
    $("bestStat").textContent = game.bestStreak;
    tone(520, .12); setTimeout(() => tone(660, .12), 130); setTimeout(() => tone(880, .25), 260);
  }

  function moveLane(direction) {
    if (!game.race?.active) return;
    const race = game.race;
    const nearest = race.lanes.reduce((best, y, i) => Math.abs(y - race.targetY) < Math.abs(race.lanes[best] - race.targetY) ? i : best, 0);
    race.targetY = race.lanes[Math.max(0, Math.min(2, nearest + direction))];
    tone(330, .04);
  }

  function setLaneFromPointer(event) {
    if (!game.race?.active) return;
    const rect = canvas.getBoundingClientRect();
    const y = (event.clientY - rect.top) * VIEW_H / rect.height;
    game.race.targetY = game.race.lanes.reduce((best, lane) => Math.abs(lane - y) < Math.abs(best - y) ? lane : best);
  }

  function shuffle(items) {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }

  function encouragement() {
    return ["You are getting faster!", "Great focus!", "Your dolphin believes in you!", "Keep that streak swimming!"][Math.floor(Math.random() * 4)];
  }

  function tone(frequency, duration) {
    if (!game.sound) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audio = tone.audio || (tone.audio = new AudioContext());
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.frequency.value = frequency;
      oscillator.type = "sine";
      gain.gain.setValueAtTime(.055, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start(); oscillator.stop(audio.currentTime + duration);
    } catch (_) { /* Sound is optional. */ }
  }

  $("startButton").addEventListener("click", startGame);
  $("playAgainButton").addEventListener("click", () => { showScreen("startScreen"); });
  $("moveUp").addEventListener("click", () => moveLane(-1));
  $("moveDown").addEventListener("click", () => moveLane(1));
  canvas.addEventListener("pointerdown", setLaneFromPointer);
  canvas.addEventListener("pointermove", (event) => { if (event.buttons) setLaneFromPointer(event); });
  window.addEventListener("keydown", (event) => {
    if (event.key === "ArrowUp" || event.key === "w") { event.preventDefault(); moveLane(-1); }
    if (event.key === "ArrowDown" || event.key === "s") { event.preventDefault(); moveLane(1); }
    if (!$("mathScreen").classList.contains("hidden") && ["1", "2", "3"].includes(event.key)) {
      document.querySelectorAll(".answer-button")[Number(event.key) - 1]?.click();
    }
  });
  $("soundButton").addEventListener("click", () => {
    game.sound = !game.sound;
    $("soundButton").textContent = game.sound ? "🔊" : "🔇";
    $("soundButton").setAttribute("aria-label", game.sound ? "Turn sound off" : "Turn sound on");
  });

  setupCanvas();
  initColors();
})();
