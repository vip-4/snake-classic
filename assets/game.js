(() => {
  "use strict";

  const canvas = document.getElementById("game");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const COLS = 20;
  const ROWS = 15;
  const CELL = 24;
  const W = COLS * CELL;
  const H = ROWS * CELL;
  const TICK_MS = 150;
  const BEST_KEY = "snake-classic-best";
  const SOUND_KEY = "snake-classic-sound";

  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const soundBtn = document.getElementById("sound");
  const soundLabel = document.getElementById("sound-label");
  const pauseBtn = document.getElementById("pause");
  const pauseIcon = document.getElementById("pause-icon");
  const pauseLabel = document.getElementById("pause-label");
  const overlay = document.getElementById("overlay");
  const overlayKicker = document.getElementById("overlay-kicker");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayText = document.getElementById("overlay-text");
  const startBtn = document.getElementById("start");
  const liveEl = document.getElementById("live");

  const state = {
    mode: "ready",
    snake: [],
    queue: ["right"],
    food: { x: 0, y: 0 },
    score: 0,
    best: 0,
    acc: 0,
    lastTime: 0,
    soundOn: true,
    dead: false
  };

  let audioCtx = null;
  let rafId = 0;
  let reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener?.("change", (e) => {
    reducedMotion = e.matches;
  });

  function readNumber(key) {
    try {
      const value = Number(window.localStorage.getItem(key));
      return Number.isFinite(value) && value > 0 ? value : 0;
    } catch {
      return 0;
    }
  }

  function readBool(key, fallback) {
    try {
      const value = window.localStorage.getItem(key);
      return value === null ? fallback : value === "1";
    } catch {
      return fallback;
    }
  }

  function save(key, value) {
    try {
      window.localStorage.setItem(key, String(value));
    } catch {
      /* storage may be unavailable in private mode */
    }
  }

  state.best = readNumber(BEST_KEY);
  state.soundOn = readBool(SOUND_KEY, true);
  bestEl.textContent = String(state.best);
  updateSoundButton();

  function updateSoundButton() {
    soundBtn.setAttribute("aria-pressed", String(state.soundOn));
    soundBtn.querySelector("span[aria-hidden]").textContent = state.soundOn ? "🔊" : "🔇";
    if (soundLabel) soundLabel.textContent = state.soundOn ? "音效开" : "音效关";
  }

  function updatePauseButton() {
    if (!pauseBtn) return;
    const labels = {
      ready: ["▶", "开始"],
      playing: ["❚❚", "暂停"],
      paused: ["▶", "继续"],
      over: ["↻", "重开"],
      won: ["↻", "重开"]
    };
    const [icon, label] = labels[state.mode] || labels.ready;
    if (pauseIcon) pauseIcon.textContent = icon;
    if (pauseLabel) pauseLabel.textContent = label;
    pauseBtn.setAttribute("aria-pressed", String(state.mode === "paused"));
    pauseBtn.setAttribute("aria-label", label);
  }

  function ensureAudio() {
    if (!state.soundOn) return null;
    if (audioCtx) {
      if (audioCtx.state === "suspended") audioCtx.resume();
      return audioCtx;
    }
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return null;
    try {
      audioCtx = new AudioCtor();
      return audioCtx;
    } catch {
      return null;
    }
  }

  function tone(freq, duration, type = "square", volume = 0.045, endFreq = null) {
    const ac = ensureAudio();
    if (!ac) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const now = ac.currentTime;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain).connect(ac.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function setupCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
  }

  function roundRect(x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function freeCells() {
    const occupied = new Set(state.snake.map((s) => s.x + "," + s.y));
    const cells = [];
    for (let x = 0; x < COLS; x += 1) {
      for (let y = 0; y < ROWS; y += 1) {
        if (!occupied.has(x + "," + y)) cells.push({ x, y });
      }
    }
    return cells;
  }

  function placeFood() {
    const cells = freeCells();
    if (!cells.length) {
      state.food = null;
      return;
    }
    state.food = cells[Math.floor(Math.random() * cells.length)];
  }

  function resetGame() {
    state.snake = [
      { x: 4, y: 7 },
      { x: 3, y: 7 },
      { x: 2, y: 7 }
    ];
    state.queue = ["right"];
    state.score = 0;
    state.acc = 0;
    state.dead = false;
    state.lastTime = performance.now();
    scoreEl.textContent = "0";
    placeFood();
  }

  function announce(message) {
    if (liveEl) liveEl.textContent = message;
  }

  function showOverlay({ kicker, title, text, button }) {
    overlayKicker.textContent = kicker;
    overlayTitle.textContent = title;
    overlayText.textContent = text;
    startBtn.textContent = button;
    overlay.hidden = false;
  }

  function hideOverlay() {
    overlay.hidden = true;
  }

  function startGame() {
    ensureAudio();
    resetGame();
    state.mode = "playing";
    hideOverlay();
    updatePauseButton();
    announce("游戏开始。得分 0。");
    tone(520, 0.07, "square", 0.035, 760);
    state.lastTime = performance.now();
    canvas.focus({ preventScroll: true });
  }

  function pauseGame(auto = false) {
    if (state.mode !== "playing") return;
    state.mode = "paused";
    showOverlay({
      kicker: auto ? "已自动暂停" : "休息一下",
      title: auto ? "页面切换，游戏暂停" : "游戏已暂停",
      text: "按空格、P 或点击下方按钮继续。",
      button: "继续游戏"
    });
    updatePauseButton();
    announce("游戏已暂停。");
    tone(340, 0.06, "sine", 0.025);
  }

  function resumeGame() {
    if (state.mode !== "paused") return;
    state.mode = "playing";
    state.lastTime = performance.now();
    hideOverlay();
    updatePauseButton();
    announce("继续游戏。");
    canvas.focus({ preventScroll: true });
  }

  function updateBest() {
    if (state.score > state.best) {
      state.best = state.score;
      bestEl.textContent = String(state.best);
      save(BEST_KEY, state.best);
      return true;
    }
    return false;
  }

  function die() {
    state.mode = "over";
    state.dead = true;
    const isRecord = updateBest();
    tone(220, 0.28, "sawtooth", 0.05, 70);
    showOverlay({
      kicker: isRecord ? "新纪录" : "本局结束",
      title: "游戏结束",
      text: "得分 " + state.score + " · 最高分 " + state.best + (isRecord ? "（刚刚刷新）" : ""),
      button: "再玩一次"
    });
    updatePauseButton();
    announce("游戏结束。得分 " + state.score + "，最高分 " + state.best + "。");
  }

  function win() {
    state.mode = "won";
    updateBest();
    tone(660, 0.1, "square", 0.04);
    setTimeout(() => tone(880, 0.16, "square", 0.04), 110);
    showOverlay({
      kicker: "满屏了",
      title: "完美通关",
      text: "你填满了整个棋盘，得分 " + state.score + "。",
      button: "再来一局"
    });
    updatePauseButton();
    announce("完美通关，得分 " + state.score + "。");
  }

  function queueDirection(dir) {
    if (state.mode !== "playing") return;
    const last = state.queue[state.queue.length - 1];
    const opposite =
      (dir === "left" && last === "right") ||
      (dir === "right" && last === "left") ||
      (dir === "up" && last === "down") ||
      (dir === "down" && last === "up");
    if (dir === last || opposite) return;
    if (state.queue.length < 3) state.queue.push(dir);
  }

  function pressDirection(dir) {
    ensureAudio();
    if (state.mode === "ready" || state.mode === "over" || state.mode === "won") {
      startGame();
    } else if (state.mode === "paused") {
      resumeGame();
    }
    queueDirection(dir);
  }

  function tick() {
    if (state.queue.length > 1) state.queue.shift();
    const dir = state.queue[0];
    const head = state.snake[0];
    let nx = head.x;
    let ny = head.y;

    if (dir === "right") nx += 1;
    else if (dir === "left") nx -= 1;
    else if (dir === "down") ny += 1;
    else if (dir === "up") ny -= 1;

    if (nx >= COLS) nx = 0;
    if (nx < 0) nx = COLS - 1;
    if (ny >= ROWS) ny = 0;
    if (ny < 0) ny = ROWS - 1;

    const body = state.snake.slice(0, -1);
    if (body.some((segment) => segment.x === nx && segment.y === ny)) {
      die();
      return;
    }

    state.snake.unshift({ x: nx, y: ny });

    if (state.food && nx === state.food.x && ny === state.food.y) {
      state.score += 10;
      scoreEl.textContent = String(state.score);
      tone(720, 0.06, "square", 0.035, 980);
      placeFood();
      if (!state.food) {
        win();
        return;
      }
      announce("得分 " + state.score + "。");
    } else {
      state.snake.pop();
    }
  }

  function drawGrid() {
    ctx.fillStyle = "#080d18";
    ctx.fillRect(0, 0, W, H);

    const glow = ctx.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, W / 1.4);
    glow.addColorStop(0, "rgba(30, 60, 48, 0.22)");
    glow.addColorStop(1, "rgba(8, 13, 24, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(140, 173, 230, 0.055)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= COLS; x += 1) {
      const px = Math.round(x * CELL) + 0.5;
      ctx.moveTo(px, 0);
      ctx.lineTo(px, H);
    }
    for (let y = 0; y <= ROWS; y += 1) {
      const py = Math.round(y * CELL) + 0.5;
      ctx.moveTo(0, py);
      ctx.lineTo(W, py);
    }
    ctx.stroke();
  }

  function drawFood(now) {
    if (!state.food) return;
    const pulse = reducedMotion ? 1 : 1 + Math.sin(now / 240) * 0.09;
    const cx = state.food.x * CELL + CELL / 2;
    const cy = state.food.y * CELL + CELL / 2;
    const radius = 6.4 * pulse;

    ctx.save();
    ctx.shadowColor = "rgba(255, 90, 122, 0.85)";
    ctx.shadowBlur = reducedMotion ? 8 : 14 + Math.sin(now / 240) * 4;
    ctx.fillStyle = "#ff5a7a";
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    ctx.beginPath();
    ctx.arc(cx - radius * 0.32, cy - radius * 0.34, radius * 0.26, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawSnake() {
    const total = state.snake.length;
    for (let i = total - 1; i >= 0; i -= 1) {
      const segment = state.snake[i];
      const t = total <= 1 ? 1 : i / (total - 1);
      const x = segment.x * CELL + 1.5;
      const y = segment.y * CELL + 1.5;
      const size = CELL - 3;

      if (state.dead) {
        ctx.fillStyle = i === 0 ? "#8891a8" : "rgba(104, 114, 138, 0.72)";
      } else if (i === 0) {
        ctx.fillStyle = "#c3ffb5";
      } else {
        const r = Math.round(92 + 44 * (1 - t));
        const g = Math.round(238 + 10 * (1 - t));
        const b = Math.round(84 + 50 * (1 - t));
        ctx.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
      }

      if (i === 0 && !state.dead) {
        ctx.shadowColor = "rgba(124, 255, 107, 0.55)";
        ctx.shadowBlur = 12;
      }

      roundRect(x, y, size, size, 5.5);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    if (state.snake.length && !state.dead) drawEyes();
  }

  function drawEyes() {
    const head = state.snake[0];
    const neck = state.snake[1] || { x: head.x - 1, y: head.y };
    let dx = Math.sign(head.x - neck.x);
    let dy = Math.sign(head.y - neck.y);
    if (dx === 0 && dy === 0) dx = 1;

    const cx = head.x * CELL + CELL / 2;
    const cy = head.y * CELL + CELL / 2;
    const along = 4.2;
    const side = 4.4;

    const fx = cx + dx * along;
    const fy = cy + dy * along;
    const px = -dy * side;
    const py = dx * side;

    ctx.fillStyle = "#0b1a10";
    ctx.beginPath();
    ctx.arc(fx + px, fy + py, 1.9, 0, Math.PI * 2);
    ctx.arc(fx - px, fy - py, 1.9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.beginPath();
    ctx.arc(fx + px - 0.6, fy + py - 0.7, 0.65, 0, Math.PI * 2);
    ctx.arc(fx - px - 0.6, fy - py - 0.7, 0.65, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawVignette() {
    const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.72);
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignette.addColorStop(1, "rgba(0, 0, 0, 0.42)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);
  }

  function render(now) {
    drawGrid();
    drawFood(now);
    drawSnake();
    drawVignette();
  }

  function frame(now) {
    if (!state.lastTime) state.lastTime = now;
    const delta = Math.min(now - state.lastTime, 250);
    state.lastTime = now;

    if (state.mode === "playing") {
      state.acc += delta;
      let guard = 0;
      while (state.acc >= TICK_MS && state.mode === "playing" && guard < 8) {
        state.acc -= TICK_MS;
        tick();
        guard += 1;
      }
    }

    render(now);
    rafId = window.requestAnimationFrame(frame);
  }

  function stopLoop() {
    if (rafId) window.cancelAnimationFrame(rafId);
    rafId = 0;
  }

  function handleKey(event) {
    const key = event.key;
    const lowered = typeof key === "string" ? key.toLowerCase() : "";
    const directionMap = {
      arrowup: "up",
      arrowdown: "down",
      arrowleft: "left",
      arrowright: "right",
      w: "up",
      s: "down",
      a: "left",
      d: "right"
    };

    if (directionMap[lowered]) {
      event.preventDefault();
      pressDirection(directionMap[lowered]);
      return;
    }

    if (key === " " || event.code === "Space" || lowered === "p") {
      event.preventDefault();
      if (state.mode === "playing") pauseGame(false);
      else if (state.mode === "paused") resumeGame();
      else if (state.mode === "ready") startGame();
      return;
    }

    if (key === "Enter" && (state.mode === "ready" || state.mode === "over" || state.mode === "won")) {
      event.preventDefault();
      startGame();
    }
  }

  document.addEventListener("keydown", handleKey);

  startBtn.addEventListener("click", () => {
    if (state.mode === "paused") resumeGame();
    else startGame();
  });

  if (pauseBtn) {
    pauseBtn.addEventListener("click", () => {
      if (state.mode === "playing") pauseGame(false);
      else if (state.mode === "paused") resumeGame();
      else startGame();
    });
  }

  soundBtn.addEventListener("click", () => {
    state.soundOn = !state.soundOn;
    save(SOUND_KEY, state.soundOn ? "1" : "0");
    updateSoundButton();
    if (state.soundOn) {
      ensureAudio();
      tone(620, 0.06, "sine", 0.03, 840);
    }
  });

  document.querySelectorAll(".dpad button[data-dir]").forEach((button) => {
    button.addEventListener("click", () => {
      pressDirection(button.dataset.dir);
    });
  });

  let swipeStart = null;

  canvas.addEventListener("pointerdown", (event) => {
    swipeStart = { x: event.clientX, y: event.clientY };
    canvas.setPointerCapture?.(event.pointerId);
  });

  canvas.addEventListener("pointerup", (event) => {
    if (!swipeStart) return;
    const dx = event.clientX - swipeStart.x;
    const dy = event.clientY - swipeStart.y;
    swipeStart = null;
    if (Math.abs(dx) < 16 && Math.abs(dy) < 16) {
      if (state.mode === "paused") resumeGame();
      return;
    }
    if (Math.abs(dx) > Math.abs(dy)) {
      pressDirection(dx > 0 ? "right" : "left");
    } else {
      pressDirection(dy > 0 ? "down" : "up");
    }
  });

  canvas.addEventListener("pointercancel", () => {
    swipeStart = null;
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.mode === "playing") pauseGame(true);
    if (!document.hidden && state.mode === "paused") {
      state.lastTime = performance.now();
    }
  });

  const header = document.querySelector(".site-header");
  if (header) {
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  setupCanvas();
  resetGame();
  state.mode = "ready";
  state.lastTime = 0;
  showOverlay({
    kicker: "准备好了吗？",
    title: "开始你的贪吃蛇",
    text: "方向键 / WASD 转向，吃掉红点得分。",
    button: "开始游戏"
  });
  updatePauseButton();
  stopLoop();
  rafId = window.requestAnimationFrame(frame);

  window.addEventListener("resize", setupCanvas);

  // Optional read-only/step hook for automated smoke tests: open the page with ?debug=1.
  if (new URLSearchParams(window.location.search).has("debug")) {
    window.__snakeClassicDebug = {
      snapshot() {
        return {
          mode: state.mode,
          score: state.score,
          snake: state.snake.map((segment) => ({ x: segment.x, y: segment.y })),
          food: state.food ? { x: state.food.x, y: state.food.y } : null,
          queue: state.queue.slice()
        };
      },
      start: startGame,
      step() {
        if (state.mode === "playing") tick();
      },
      setFood(x, y) {
        if (Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x < COLS && y >= 0 && y < ROWS) {
          state.food = { x, y };
        }
      }
    };
  }

  if ("serviceWorker" in navigator && /^https?:$/.test(window.location.protocol)) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {
        /* offline support is optional */
      });
    });
  }
})();
