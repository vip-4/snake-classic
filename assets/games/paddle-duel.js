(() => {
  "use strict";

  const canvas = document.getElementById("paddle-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const W = 720;
  const H = 450;
  const TARGET = 7;
  const PADDLE_W = 12;
  const PADDLE_H = 78;
  const MARGIN = 26;
  const PLAYER_X = MARGIN;
  const AI_X = W - MARGIN - PADDLE_W;
  const PLAYER_SPEED = 780;
  const BASE_SPEED = 430;
  const MAX_SPEED = 880;
  const BEST_KEY = "arcade:paddle:best-rally";
  const DIFFICULTIES = {
    easy: { speed: 270, error: 52, label: "轻松" },
    normal: { speed: 380, error: 30, label: "标准" },
    hard: { speed: 520, error: 12, label: "挑战" }
  };

  const playerScoreEl = document.getElementById("player-score");
  const aiScoreEl = document.getElementById("ai-score");
  const rallyEl = document.getElementById("rally");
  const bestRallyEl = document.getElementById("best-rally");
  const pauseBtn = document.getElementById("pause");
  const pauseLabel = document.getElementById("pause-label");
  const soundBtn = document.getElementById("sound");
  const soundLabel = document.querySelector("[data-sound-label]");
  const restartBtn = document.getElementById("restart");
  const overlay = document.getElementById("overlay");
  const overlayKicker = document.getElementById("overlay-kicker");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayText = document.getElementById("overlay-text");
  const overlayAction = document.getElementById("overlay-action");
  const liveEl = document.getElementById("live");
  const difficultyButtons = Array.from(document.querySelectorAll("[data-difficulty]"));

  let mode = "ready";
  let overlayMode = "ready";
  let scores = { player: 0, ai: 0 };
  let rally = 0;
  let bestRally = window.Arcade.storage.getNumber(BEST_KEY, 0);
  let difficulty = "normal";
  let playerY = H / 2 - PADDLE_H / 2;
  let aiY = H / 2 - PADDLE_H / 2;
  let pointerTarget = null;
  let pointerDown = false;
  let touchDir = 0;
  let keys = { up: false, down: false };
  let ball = { x: W / 2, y: H / 2, vx: 0, vy: 0, r: 7 };
  let serving = true;
  let serveTimer = 0.8;
  let serveDirection = 1;
  let aiError = 0;
  let lastTime = 0;
  let rafId = 0;

  function config() {
    return DIFFICULTIES[difficulty];
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function setupCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function updateHud() {
    playerScoreEl.textContent = String(scores.player);
    aiScoreEl.textContent = String(scores.ai);
    rallyEl.textContent = String(rally);
    bestRallyEl.textContent = String(bestRally);
  }

  function updatePauseButton() {
    if (mode === "playing") {
      pauseBtn.setAttribute("aria-pressed", "false");
      pauseLabel.textContent = "暂停";
      pauseBtn.setAttribute("aria-label", "暂停比赛");
    } else if (mode === "paused") {
      pauseBtn.setAttribute("aria-pressed", "true");
      pauseLabel.textContent = "继续";
      pauseBtn.setAttribute("aria-label", "继续比赛");
    } else if (mode === "over") {
      pauseBtn.setAttribute("aria-pressed", "false");
      pauseLabel.textContent = "重开";
      pauseBtn.setAttribute("aria-label", "重开比赛");
    } else {
      pauseBtn.setAttribute("aria-pressed", "false");
      pauseLabel.textContent = "开始";
      pauseBtn.setAttribute("aria-label", "开始比赛");
    }
  }

  function announce(message) {
    window.Arcade.announce(liveEl, message);
  }

  function showOverlay(kind) {
    overlayMode = kind;
    if (kind === "ready") {
      overlayKicker.textContent = "准备好了吗？";
      overlayTitle.textContent = "Paddle Duel";
      overlayText.textContent = "先得 7 分获胜。鼠标 / 手指拖动球拍，或使用 ↑↓ / W S。";
      overlayAction.textContent = "开始对决";
    } else if (kind === "paused") {
      overlayKicker.textContent = "比赛暂停";
      overlayTitle.textContent = "休息一下";
      overlayText.textContent = "点击下方按钮继续；当前比分 " + scores.player + " : " + scores.ai + "。";
      overlayAction.textContent = "继续比赛";
    } else {
      overlayKicker.textContent = "比赛结束";
      overlayTitle.textContent = "本场结束";
      overlayText.textContent = "比分 " + scores.player + " : " + scores.ai + "。";
      overlayAction.textContent = "再来一局";
    }
    overlay.hidden = false;
    window.Arcade.focusWithoutScroll(overlayAction);
  }

  function hideOverlay() {
    overlay.hidden = true;
  }

  function updateAriaLabel() {
    canvas.setAttribute(
      "aria-label",
      "Paddle Duel 球场：比分 " + scores.player + " 比 " + scores.ai + "，你先得 7 分获胜。当前回合 " + rally + " 次击球。"
    );
  }

  function serve() {
    serving = false;
    ball.x = W / 2;
    ball.y = H / 2;
    const angle = (Math.random() * 0.7 - 0.35);
    ball.vx = Math.cos(angle) * BASE_SPEED * serveDirection;
    ball.vy = Math.sin(angle) * BASE_SPEED;
    aiError = (Math.random() * 2 - 1) * config().error;
    window.Arcade.sound.tone(420, 0.05, "sine", 0.025, 560);
  }

  function resetPositions() {
    playerY = H / 2 - PADDLE_H / 2;
    aiY = H / 2 - PADDLE_H / 2;
    pointerTarget = null;
    touchDir = 0;
    keys = { up: false, down: false };
    ball = { x: W / 2, y: H / 2, vx: 0, vy: 0, r: 7 };
    serving = true;
    serveTimer = 0.8;
    serveDirection = Math.random() < 0.5 ? -1 : 1;
    aiError = 0;
  }

  function startMatch() {
    scores = { player: 0, ai: 0 };
    rally = 0;
    resetPositions();
    mode = "playing";
    hideOverlay();
    updateHud();
    updatePauseButton();
    updateAriaLabel();
    lastTime = performance.now();
    window.Arcade.sound.tone(520, 0.08, "square", 0.035, 760);
    announce("比赛开始。先得 7 分获胜。");
    window.Arcade.focusWithoutScroll(canvas);
  }

  function pauseGame(auto = false) {
    if (mode !== "playing") return;
    mode = "paused";
    keys = { up: false, down: false };
    touchDir = 0;
    pointerTarget = null;
    updatePauseButton();
    showOverlay("paused");
    if (auto) {
      overlayKicker.textContent = "已自动暂停";
      overlayTitle.textContent = "页面切换，比赛暂停";
    }
    window.Arcade.sound.tone(320, 0.06, "sine", 0.025);
    announce("比赛已暂停。");
  }

  function resumeGame() {
    if (mode !== "paused") return;
    mode = "playing";
    hideOverlay();
    updatePauseButton();
    lastTime = performance.now();
    announce("继续比赛。");
    window.Arcade.focusWithoutScroll(canvas);
  }

  function togglePause() {
    if (mode === "playing") pauseGame(false);
    else if (mode === "paused") resumeGame();
    else startMatch();
  }

  function scorePoint(who) {
    if (mode !== "playing") return;
    scores[who] += 1;
    rally = 0;
    updateHud();
    updateAriaLabel();
    window.Arcade.sound.tone(who === "player" ? 760 : 220, 0.12, who === "player" ? "square" : "sawtooth", 0.04, who === "player" ? 980 : 150);
    if (scores[who] >= TARGET) {
      win(who);
      return;
    }
    serving = true;
    serveTimer = 0.85;
    serveDirection = who === "player" ? 1 : -1;
    ball = { x: W / 2, y: H / 2, vx: 0, vy: 0, r: 7 };
    announce(
      (who === "player" ? "你得 1 分" : "AI 得 1 分") +
        "，当前比分 " + scores.player + " 比 " + scores.ai + "。"
    );
  }

  function win(who) {
    mode = "over";
    updatePauseButton();
    showOverlay("over");
    if (who === "player") {
      overlayKicker.textContent = "比赛结束";
      overlayTitle.textContent = "你赢了";
      overlayText.textContent = "比分 " + scores.player + " : " + scores.ai + "，最长回合 " + bestRally + " 次击球。";
      window.Arcade.sound.tone(660, 0.1, "square", 0.04);
      window.setTimeout(() => window.Arcade.sound.tone(880, 0.18, "square", 0.04), 120);
      announce("你赢了，比分 " + scores.player + " 比 " + scores.ai + "。");
    } else {
      overlayKicker.textContent = "比赛结束";
      overlayTitle.textContent = "AI 获胜";
      overlayText.textContent = "比分 " + scores.player + " : " + scores.ai + "，再试一次挑战更高难度。";
      window.Arcade.sound.tone(220, 0.28, "sawtooth", 0.05, 80);
      announce("AI 获胜，比分 " + scores.player + " 比 " + scores.ai + "。");
    }
    updateAriaLabel();
  }

  function hitPaddle(paddleY, direction) {
    rally += 1;
    if (rally > bestRally) {
      bestRally = rally;
      window.Arcade.storage.setNumber(BEST_KEY, bestRally);
    }
    updateHud();
    updateAriaLabel();
    const speed = Math.min(MAX_SPEED, Math.max(BASE_SPEED, Math.hypot(ball.vx, ball.vy) * 1.045));
    const offset = (ball.y - (paddleY + PADDLE_H / 2)) / (PADDLE_H / 2);
    const angle = clamp(offset, -1, 1) * 0.92;
    ball.vx = direction * Math.cos(angle) * speed;
    ball.vy = Math.sin(angle) * speed;
    if (Math.abs(ball.vy) < 60) {
      ball.vy = (Math.random() < 0.5 ? -1 : 1) * 60;
    }
    if (direction > 0) {
      aiError = (Math.random() * 2 - 1) * config().error;
    }
    window.Arcade.sound.tone(direction > 0 ? 620 : 520, 0.045, "square", 0.028, direction > 0 ? 840 : 680);
    announce("回合 " + rally + " 次击球。");
  }

  function simulate(dt) {
    if (mode !== "playing") return;
    if (serving) {
      serveTimer -= dt;
      if (serveTimer <= 0) serve();
      return;
    }

    const direction = (keys.down ? 1 : 0) - (keys.up ? 1 : 0) + touchDir;
    if (direction) {
      pointerTarget = null;
      playerY += direction * PLAYER_SPEED * dt;
    } else if (pointerTarget !== null) {
      const step = PLAYER_SPEED * 1.7 * dt;
      playerY += clamp(pointerTarget - playerY, -step, step);
    }
    playerY = clamp(playerY, 0, H - PADDLE_H);

    const ai = config();
    if (ball.vx > 0) {
      const target = ball.y + aiError - PADDLE_H / 2;
      const step = ai.speed * dt;
      aiY += clamp(target - aiY, -step, step);
    } else {
      const target = H / 2 - PADDLE_H / 2;
      const step = ai.speed * 0.4 * dt;
      aiY += clamp(target - aiY, -step, step);
    }
    aiY = clamp(aiY, 0, H - PADDLE_H);

    const previousX = ball.x;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (ball.y - ball.r < 0) {
      ball.y = ball.r;
      ball.vy = Math.abs(ball.vy);
      window.Arcade.sound.tone(360, 0.035, "sine", 0.02, 300);
    } else if (ball.y + ball.r > H) {
      ball.y = H - ball.r;
      ball.vy = -Math.abs(ball.vy);
      window.Arcade.sound.tone(360, 0.035, "sine", 0.02, 300);
    }

    if (
      ball.vx < 0 &&
      previousX - ball.r > PLAYER_X + PADDLE_W &&
      ball.x - ball.r <= PLAYER_X + PADDLE_W &&
      ball.y + ball.r >= playerY &&
      ball.y - ball.r <= playerY + PADDLE_H
    ) {
      ball.x = PLAYER_X + PADDLE_W + ball.r;
      hitPaddle(playerY, 1);
    } else if (
      ball.vx > 0 &&
      previousX + ball.r < AI_X &&
      ball.x + ball.r >= AI_X &&
      ball.y + ball.r >= aiY &&
      ball.y - ball.r <= aiY + PADDLE_H
    ) {
      ball.x = AI_X - ball.r;
      hitPaddle(aiY, -1);
    }

    if (ball.x + ball.r < 0) {
      scorePoint("ai");
    } else if (ball.x - ball.r > W) {
      scorePoint("player");
    }
  }

  function roundRect(x, y, w, h, radius) {
    const r = Math.min(radius, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawPaddle(x, y, color) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = color;
    roundRect(x, y, PADDLE_W, PADDLE_H, 6);
    ctx.fill();
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#0a1322");
    bg.addColorStop(1, "#060a12");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const glow = ctx.createRadialGradient(W / 2, H / 2, 30, W / 2, H / 2, W * 0.7);
    glow.addColorStop(0, "rgba(110, 231, 255, 0.07)");
    glow.addColorStop(1, "rgba(10, 19, 34, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(148, 173, 230, 0.06)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 45) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, H);
      ctx.stroke();
    }
    for (let y = 0; y <= H; y += 45) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(W, y + 0.5);
      ctx.stroke();
    }

    ctx.save();
    ctx.strokeStyle = "rgba(148, 173, 230, 0.25)";
    ctx.lineWidth = 2;
    ctx.setLineDash([9, 12]);
    ctx.beginPath();
    ctx.moveTo(W / 2, 18);
    ctx.lineTo(W / 2, H - 18);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = '700 72px Consolas, "Courier New", monospace';
    ctx.fillStyle = "rgba(124, 255, 107, 0.12)";
    ctx.fillText(String(scores.player), W * 0.32, 92);
    ctx.fillStyle = "rgba(110, 231, 255, 0.12)";
    ctx.fillText(String(scores.ai), W * 0.68, 92);
    ctx.restore();

    drawPaddle(PLAYER_X, playerY, "#7cff6b");
    drawPaddle(AI_X, aiY, "#6ee7ff");

    if (serving) {
      const pulse = 1 + Math.sin(performance.now() / 180) * 0.25;
      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, 16 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.shadowColor = "rgba(255, 255, 255, 0.85)";
    ctx.shadowBlur = 16;
    ctx.fillStyle = "#f6fbff";
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = "rgba(148, 173, 230, 0.16)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, W - 2, H - 2);
  }

  function frame(now) {
    const dt = Math.min((now - lastTime) / 1000 || 0, 0.025);
    lastTime = now;
    simulate(dt);
    draw();
    rafId = window.requestAnimationFrame(frame);
  }

  function updatePointer(event) {
    if (mode !== "playing") return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.height) return;
    const y = ((event.clientY - rect.top) / rect.height) * H;
    pointerTarget = clamp(y - PADDLE_H / 2, 0, H - PADDLE_H);
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (mode !== "playing") return;
    pointerDown = true;
    canvas.setPointerCapture?.(event.pointerId);
    updatePointer(event);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (event.pointerType === "mouse" || pointerDown) updatePointer(event);
  });

  const endPointer = () => {
    pointerDown = false;
  };
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);

  document.querySelectorAll("[data-paddle]").forEach((button) => {
    const direction = button.dataset.paddle === "up" ? -1 : 1;
    const press = (event) => {
      event.preventDefault();
      touchDir = direction;
      pointerTarget = null;
      button.setPointerCapture?.(event.pointerId);
    };
    const release = () => {
      if (touchDir === direction) touchDir = 0;
    };
    button.addEventListener("pointerdown", press);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointerleave", release);
    button.addEventListener("pointercancel", release);
  });

  difficultyButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const next = button.dataset.difficulty;
      if (!DIFFICULTIES[next]) return;
      difficulty = next;
      difficultyButtons.forEach((item) => {
        item.setAttribute("aria-pressed", String(item === button));
      });
      aiError = (Math.random() * 2 - 1) * config().error;
      window.Arcade.sound.tone(560, 0.05, "sine", 0.025, 700);
      announce("AI 难度已切换为" + config().label + "。");
    });
  });

  document.addEventListener("keydown", (event) => {
    const key = typeof event.key === "string" ? event.key.toLowerCase() : "";
    if (key === "arrowup" || key === "w") {
      if (mode === "playing") {
        event.preventDefault();
        keys.up = true;
        pointerTarget = null;
      }
    } else if (key === "arrowdown" || key === "s") {
      if (mode === "playing") {
        event.preventDefault();
        keys.down = true;
        pointerTarget = null;
      }
    } else if (key === " " || key === "p") {
      if (mode === "playing" || mode === "paused") {
        event.preventDefault();
        togglePause();
      }
    }
  });

  document.addEventListener("keyup", (event) => {
    const key = typeof event.key === "string" ? event.key.toLowerCase() : "";
    if (key === "arrowup" || key === "w") keys.up = false;
    else if (key === "arrowdown" || key === "s") keys.down = false;
  });

  pauseBtn.addEventListener("click", togglePause);
  restartBtn.addEventListener("click", startMatch);
  overlayAction.addEventListener("click", () => {
    if (overlayMode === "paused") resumeGame();
    else startMatch();
  });
  window.Arcade.bindSound(soundBtn, soundLabel);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && mode === "playing") pauseGame(true);
  });

  window.addEventListener("resize", () => {
    setupCanvas();
    draw();
  });

  setupCanvas();
  resetPositions();
  updateHud();
  updatePauseButton();
  updateAriaLabel();
  showOverlay("ready");
  draw();
  lastTime = performance.now();
  rafId = window.requestAnimationFrame(frame);

  if (window.Arcade.debug) {
    window.__paddleDuelDebug = {
      snapshot() {
        return {
          mode,
          overlay: overlay.hidden ? null : overlayMode,
          scores: { player: scores.player, ai: scores.ai },
          rally,
          bestRally,
          difficulty,
          serving,
          ball: { x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy, r: ball.r },
          playerY,
          aiY,
          target: TARGET
        };
      },
      start: startMatch,
      pause: togglePause,
      step(ms = 16) {
        simulate(Math.min(0.05, Math.max(0.001, ms / 1000)));
        draw();
      },
      setBall(x, y, vx, vy) {
        if ([x, y, vx, vy].some((value) => !Number.isFinite(Number(value)))) return false;
        serving = false;
        ball = { x: Number(x), y: Number(y), vx: Number(vx), vy: Number(vy), r: ball.r };
        return true;
      },
      setDifficulty(next) {
        if (!DIFFICULTIES[next]) return false;
        difficulty = next;
        difficultyButtons.forEach((button) => {
          button.setAttribute("aria-pressed", String(button.dataset.difficulty === next));
        });
        return true;
      },
      score(who) {
        if (who !== "player" && who !== "ai") return false;
        scorePoint(who);
        return true;
      }
    };
  }
})();
