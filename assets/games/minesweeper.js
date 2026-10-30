(() => {
  "use strict";

  const boardEl = document.getElementById("board");
  if (!boardEl) return;

  const LEVELS = {
    beginner: { label: "初级", rows: 9, cols: 9, mines: 10 },
    intermediate: { label: "中级", rows: 16, cols: 16, mines: 40 },
    expert: { label: "高级", rows: 16, cols: 24, mines: 75 }
  };

  const minesLeftEl = document.getElementById("mines-left");
  const timerEl = document.getElementById("timer");
  const bestEl = document.getElementById("best");
  const statusEl = document.getElementById("status");
  const liveEl = document.getElementById("live");
  const soundBtn = document.getElementById("sound");
  const soundLabel = document.querySelector("[data-sound-label]");
  const restartBtn = document.getElementById("restart");
  const flagBtn = document.getElementById("flag-mode");
  const flagLabel = document.getElementById("flag-label");
  const overlay = document.getElementById("overlay");
  const overlayKicker = document.getElementById("overlay-kicker");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayText = document.getElementById("overlay-text");
  const overlayAction = document.getElementById("overlay-action");
  const levelButtons = Array.from(document.querySelectorAll("[data-level]"));

  let level = "beginner";
  let rows = LEVELS.beginner.rows;
  let cols = LEVELS.beginner.cols;
  let mineCount = LEVELS.beginner.mines;
  let board = [];
  let cells = [];
  let flags = 0;
  let revealed = 0;
  let started = false;
  let over = false;
  let won = false;
  let flagMode = false;
  let startedAt = 0;
  let elapsed = 0;
  let timerId = 0;
  let suppressClickUntil = 0;
  let longPressTimer = 0;
  let best = 0;

  function bestKey() {
    return "arcade:minesweeper:best:" + level;
  }

  function neighborIndexes(index) {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const list = [];
    for (let r = row - 1; r <= row + 1; r += 1) {
      for (let c = col - 1; c <= col + 1; c += 1) {
        if (r < 0 || c < 0 || r >= rows || c >= cols) continue;
        if (r === row && c === col) continue;
        list.push(r * cols + c);
      }
    }
    return list;
  }

  function createBoardData() {
    return Array.from({ length: rows * cols }, () => ({
      mine: false,
      adjacent: 0,
      revealed: false,
      flagged: false,
      exploded: false
    }));
  }

  function buildBoard() {
    boardEl.textContent = "";
    boardEl.style.setProperty("--cols", String(cols));
    boardEl.classList.toggle("mine-board--expert", cols > 16);
    cells = [];
    for (let i = 0; i < rows * cols; i += 1) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "mine-cell";
      cell.dataset.index = String(i);
      cell.tabIndex = i === 0 ? 0 : -1;
      cell.addEventListener("focus", () => {
        cells.forEach((item) => {
          item.tabIndex = -1;
        });
        cell.tabIndex = 0;
      });
      cell.addEventListener("click", () => handleCellClick(i));
      cell.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        if (over) return;
        toggleFlag(i);
      });
      cell.addEventListener("pointerdown", (event) => {
        if (event.button === 2 || over) return;
        window.clearTimeout(longPressTimer);
        longPressTimer = window.setTimeout(() => {
          if (over) return;
          suppressClickUntil = performance.now() + 650;
          toggleFlag(i);
        }, 480);
      });
      const clearLongPress = () => window.clearTimeout(longPressTimer);
      cell.addEventListener("pointerup", clearLongPress);
      cell.addEventListener("pointercancel", clearLongPress);
      cell.addEventListener("pointerleave", clearLongPress);
      boardEl.appendChild(cell);
      cells.push(cell);
    }
  }

  function updateBest() {
    best = window.Arcade.storage.getNumber(bestKey(), 0);
    bestEl.textContent = best ? window.Arcade.formatTime(best) : "--:--";
  }

  function updateHud() {
    minesLeftEl.textContent = String(Math.max(0, mineCount - flags));
    if (!started) {
      timerEl.textContent = "00:00";
    }
  }

  function updateStatus() {
    if (won) {
      statusEl.textContent = "排雷成功 · 用时 " + window.Arcade.formatTime(elapsed);
      return;
    }
    if (over) {
      statusEl.textContent = "踩到地雷 · 点击“重开”再试一次";
      return;
    }
    if (!started) {
      statusEl.textContent = "点击任意格子开始 · 数字表示相邻地雷数";
      return;
    }
    statusEl.textContent =
      "已翻开 " + revealed + " / " + (rows * cols - mineCount) + " 个安全格 · 剩余雷 " +
      Math.max(0, mineCount - flags);
  }

  function renderCell(index) {
    const cell = board[index];
    const el = cells[index];
    if (!el) return;
    el.className = "mine-cell";
    el.textContent = "";
    let label = "第 " + (Math.floor(index / cols) + 1) + " 行第 " + (index % cols + 1) + " 列";

    if (cell.revealed) {
      el.classList.add("is-revealed");
      if (cell.mine) {
        el.classList.add(cell.exploded ? "is-exploded" : "is-mine");
        el.textContent = "✹";
        label += "，地雷";
      } else if (cell.adjacent > 0) {
        el.textContent = String(cell.adjacent);
        el.classList.add("n" + cell.adjacent);
        label += "，已翻开，相邻 " + cell.adjacent + " 颗雷";
      } else {
        label += "，已翻开，空白格";
      }
    } else if (cell.flagged) {
      el.classList.add("is-flagged");
      if (over && !cell.mine) {
        el.classList.add("is-wrong");
        el.textContent = "✕";
        label += "，错误的旗标";
      } else {
        el.textContent = "⚑";
        label += "，已插旗";
      }
    } else if (over && cell.mine) {
      el.classList.add("is-mine");
      el.textContent = "✹";
      label += "，地雷";
    } else {
      label += "，未翻开";
    }
    el.setAttribute("aria-label", label);
  }

  function renderAll() {
    for (let i = 0; i < board.length; i += 1) renderCell(i);
    updateHud();
    updateStatus();
  }

  function announce(message) {
    window.Arcade.announce(liveEl, message);
  }

  function stopTimer() {
    if (timerId) {
      window.clearInterval(timerId);
      timerId = 0;
    }
    if (startedAt) {
      elapsed = Math.max(1, Math.ceil((performance.now() - startedAt) / 1000));
      timerEl.textContent = window.Arcade.formatTime(elapsed);
    }
  }

  function startTimer() {
    startedAt = performance.now();
    elapsed = 0;
    timerEl.textContent = "00:00";
    if (timerId) window.clearInterval(timerId);
    timerId = window.setInterval(() => {
      const seconds = Math.max(1, Math.ceil((performance.now() - startedAt) / 1000));
      elapsed = seconds;
      timerEl.textContent = window.Arcade.formatTime(seconds);
    }, 250);
  }

  function placeMines(safeIndex) {
    const safe = new Set([safeIndex, ...neighborIndexes(safeIndex)]);
    let candidates = [];
    for (let i = 0; i < board.length; i += 1) {
      if (!safe.has(i)) candidates.push(i);
    }
    if (candidates.length < mineCount) {
      candidates = [];
      for (let i = 0; i < board.length; i += 1) {
        if (i !== safeIndex) candidates.push(i);
      }
    }
    for (let i = candidates.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    for (let i = 0; i < mineCount && i < candidates.length; i += 1) {
      board[candidates[i]].mine = true;
    }
    computeAdjacency();
    started = true;
    startTimer();
  }

  function computeAdjacency() {
    for (let i = 0; i < board.length; i += 1) {
      if (board[i].mine) continue;
      board[i].adjacent = neighborIndexes(i).filter((index) => board[index].mine).length;
    }
  }

  function toggleFlag(index) {
    if (over || board[index].revealed) return;
    const cell = board[index];
    if (cell.flagged) {
      cell.flagged = false;
      flags -= 1;
      window.Arcade.sound.tone(360, 0.04, "sine", 0.02, 300);
      announce("已取消第 " + (index + 1) + " 格的旗标。");
    } else {
      if (flags >= mineCount) {
        announce("旗标已用完。请先取消一个旗标。");
        return;
      }
      cell.flagged = true;
      flags += 1;
      window.Arcade.sound.tone(620, 0.04, "square", 0.025, 720);
      announce("已插旗，剩余 " + Math.max(0, mineCount - flags) + " 个旗标。");
    }
    renderCell(index);
    updateHud();
    updateStatus();
  }

  function reveal(index) {
    if (over) return;
    if (!started) placeMines(index);
    const cell = board[index];
    if (cell.revealed || cell.flagged) return;
    if (cell.mine) {
      lose(index);
      return;
    }
    let opened = 0;
    const stack = [index];
    while (stack.length) {
      const current = stack.pop();
      const item = board[current];
      if (item.revealed || item.flagged || item.mine) continue;
      item.revealed = true;
      revealed += 1;
      opened += 1;
      renderCell(current);
      if (item.adjacent === 0) {
        neighborIndexes(current).forEach((next) => {
          if (!board[next].revealed && !board[next].flagged) stack.push(next);
        });
      }
    }
    if (opened) {
      window.Arcade.sound.tone(opened > 1 ? 540 : 460, 0.05, "sine", 0.026, opened > 1 ? 720 : 520);
    }
    updateHud();
    updateStatus();
    if (revealed >= rows * cols - mineCount) {
      win();
    } else {
      announce("已翻开 " + revealed + " 个安全格，共 " + (rows * cols - mineCount) + " 个。");
    }
  }

  function lose(index) {
    over = true;
    won = false;
    board[index].exploded = true;
    stopTimer();
    for (let i = 0; i < board.length; i += 1) renderCell(i);
    updateStatus();
    overlayKicker.textContent = "踩到地雷";
    overlayTitle.textContent = "本局结束";
    overlayText.textContent =
      "已翻开 " + revealed + " / " + (rows * cols - mineCount) + " 个安全格。点击下方按钮再试一次。";
    overlayAction.textContent = "再来一局";
    overlay.hidden = false;
    window.Arcade.focusWithoutScroll(overlayAction);
    window.Arcade.sound.tone(220, 0.3, "sawtooth", 0.05, 70);
    announce("踩到地雷，游戏结束。已翻开 " + revealed + " 个安全格。");
  }

  function win() {
    over = true;
    won = true;
    stopTimer();
    const previousBest = best;
    const isRecord = !previousBest || elapsed < previousBest;
    if (isRecord) {
      best = elapsed;
      window.Arcade.storage.setNumber(bestKey(), best);
      bestEl.textContent = window.Arcade.formatTime(best);
    }
    updateStatus();
    overlayKicker.textContent = isRecord ? "新纪录" : "排雷成功";
    overlayTitle.textContent = "全部安全格已翻开";
    overlayText.textContent =
      "用时 " + window.Arcade.formatTime(elapsed) +
      (isRecord ? "，刷新了" + LEVELS[level].label + "最佳成绩。" : "，本档最佳 " + window.Arcade.formatTime(best) + "。");
    overlayAction.textContent = "再来一局";
    overlay.hidden = false;
    window.Arcade.focusWithoutScroll(overlayAction);
    window.Arcade.sound.tone(660, 0.1, "square", 0.04);
    window.setTimeout(() => window.Arcade.sound.tone(880, 0.16, "square", 0.04), 110);
    announce("排雷成功，用时 " + window.Arcade.formatTime(elapsed) + "。");
  }

  function handleCellClick(index) {
    if (performance.now() < suppressClickUntil) {
      suppressClickUntil = 0;
      return;
    }
    suppressClickUntil = 0;
    if (over) return;
    if (flagMode) toggleFlag(index);
    else reveal(index);
  }

  function handleBoardKey(event) {
    const active = document.activeElement;
    if (!active || !active.classList || !active.classList.contains("mine-cell")) return;
    const index = Number(active.dataset.index);
    const row = Math.floor(index / cols);
    const col = index % cols;
    let next = null;
    if (event.key === "ArrowUp" && row > 0) next = index - cols;
    else if (event.key === "ArrowDown" && row < rows - 1) next = index + cols;
    else if (event.key === "ArrowLeft" && col > 0) next = index - 1;
    else if (event.key === "ArrowRight" && col < cols - 1) next = index + 1;
    if (next !== null) {
      event.preventDefault();
      cells[next].focus();
      return;
    }
    if (event.key === "f" || event.key === "F") {
      event.preventDefault();
      toggleFlag(index);
    }
  }

  function newGame(nextLevel, focus = false) {
    if (nextLevel && LEVELS[nextLevel]) level = nextLevel;
    const config = LEVELS[level];
    rows = config.rows;
    cols = config.cols;
    mineCount = config.mines;
    stopTimer();
    startedAt = 0;
    elapsed = 0;
    flags = 0;
    revealed = 0;
    started = false;
    over = false;
    won = false;
    suppressClickUntil = 0;
    window.clearTimeout(longPressTimer);
    board = createBoardData();
    overlay.hidden = true;
    updateBest();
    buildBoard();
    renderAll();
    levelButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.level === level));
    });
    timerEl.textContent = "00:00";
    if (focus && cells[0]) cells[0].focus();
    announce("新一局" + config.label + "扫雷，点击任意格子开始。");
  }

  function toggleFlagMode() {
    flagMode = !flagMode;
    flagBtn.setAttribute("aria-pressed", String(flagMode));
    flagLabel.textContent = flagMode ? "旗标模式：开" : "旗标模式";
    announce(flagMode ? "旗标模式已开启，点击格子插旗。" : "旗标模式已关闭。");
    if (flagMode) window.Arcade.sound.tone(700, 0.05, "sine", 0.025, 800);
  }

  levelButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.level === level && !over) return;
      newGame(button.dataset.level);
      window.Arcade.sound.tone(520, 0.05, "sine", 0.025, 640);
    });
  });

  flagBtn.addEventListener("click", toggleFlagMode);
  restartBtn.addEventListener("click", () => newGame(level, true));
  overlayAction.addEventListener("click", () => newGame(level, true));
  window.Arcade.bindSound(soundBtn, soundLabel);
  boardEl.addEventListener("keydown", handleBoardKey);
  boardEl.addEventListener("contextmenu", (event) => event.preventDefault());

  newGame("beginner");

  if (window.Arcade.debug) {
    window.__minesweeperDebug = {
      snapshot() {
        return {
          level,
          rows,
          cols,
          mines: mineCount,
          flags,
          revealed,
          started,
          over,
          won,
          elapsed,
          cells: board.map((cell) => ({
            mine: cell.mine,
            adjacent: cell.adjacent,
            revealed: cell.revealed,
            flagged: cell.flagged,
            exploded: cell.exploded
          }))
        };
      },
      reveal,
      flag: toggleFlag,
      newGame,
      setMines(indexes) {
        if (!Array.isArray(indexes)) return false;
        stopTimer();
        startedAt = 0;
        elapsed = 0;
        flags = 0;
        revealed = 0;
        over = false;
        won = false;
        board = createBoardData();
        overlay.hidden = true;
        indexes.forEach((value) => {
          const index = Number(value);
          if (Number.isInteger(index) && index >= 0 && index < board.length) {
            board[index].mine = true;
          }
        });
        computeAdjacency();
        started = true;
        startTimer();
        renderAll();
        return true;
      }
    };
  }
})();
