(() => {
  "use strict";

  const boardEl = document.getElementById("board");
  if (!boardEl) return;

  const SIZE = 4;
  const CELLS = SIZE * SIZE;
  const BEST_KEY = "arcade:2048:best";
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const undoBtn = document.getElementById("undo");
  const newBtn = document.getElementById("new-game");
  const soundBtn = document.getElementById("sound");
  const soundLabel = document.querySelector("[data-sound-label]");
  const overlay = document.getElementById("overlay");
  const overlayKicker = document.getElementById("overlay-kicker");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayText = document.getElementById("overlay-text");
  const overlayAction = document.getElementById("overlay-action");
  const liveEl = document.getElementById("live");

  const grid = new Array(CELLS).fill(0);
  const cells = [];
  let score = 0;
  let best = window.Arcade.storage.getNumber(BEST_KEY, 0);
  let won = false;
  let over = false;
  let history = null;
  let overlayMode = "win";

  function buildBoard() {
    boardEl.textContent = "";
    for (let row = 0; row < SIZE; row += 1) {
      const rowEl = document.createElement("div");
      rowEl.className = "board-row";
      rowEl.setAttribute("role", "row");
      for (let col = 0; col < SIZE; col += 1) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.setAttribute("role", "gridcell");
        cell.setAttribute("aria-rowindex", String(row + 1));
        cell.setAttribute("aria-colindex", String(col + 1));
        rowEl.appendChild(cell);
        cells.push(cell);
      }
      boardEl.appendChild(rowEl);
    }
  }

  function saveBest() {
    if (score > best) {
      best = score;
      bestEl.textContent = String(best);
      window.Arcade.storage.setNumber(BEST_KEY, best);
      return true;
    }
    return false;
  }

  function render() {
    for (let i = 0; i < CELLS; i += 1) {
      const cell = cells[i];
      const value = grid[i];
      cell.textContent = "";
      cell.setAttribute(
        "aria-label",
        value
          ? "第 " + (Math.floor(i / SIZE) + 1) + " 行第 " + (i % SIZE + 1) + " 列，数字 " + value
          : "第 " + (Math.floor(i / SIZE) + 1) + " 行第 " + (i % SIZE + 1) + " 列，空"
      );
      if (value) {
        const tile = document.createElement("span");
        tile.className = "tile-2048" + (value > 2048 ? " is-super" : "");
        tile.dataset.value = String(value);
        tile.textContent = String(value);
        cell.appendChild(tile);
      }
    }
    boardEl.setAttribute(
      "aria-label",
      "2048 棋盘，4 行 4 列，当前得分 " + score + "，最高分 " + best
    );
    scoreEl.textContent = String(score);
    bestEl.textContent = String(best);
    undoBtn.disabled = !history;
  }

  function emptyCells() {
    const list = [];
    for (let i = 0; i < CELLS; i += 1) {
      if (!grid[i]) list.push(i);
    }
    return list;
  }

  function addRandomTile() {
    const empty = emptyCells();
    if (!empty.length) return false;
    const index = empty[Math.floor(Math.random() * empty.length)];
    grid[index] = Math.random() < 0.9 ? 2 : 4;
    return true;
  }

  function linesFor(direction) {
    const lines = [];
    for (let i = 0; i < SIZE; i += 1) {
      const line = [];
      for (let j = 0; j < SIZE; j += 1) {
        if (direction === "left") line.push(i * SIZE + j);
        else if (direction === "right") line.push(i * SIZE + (SIZE - 1 - j));
        else if (direction === "up") line.push(j * SIZE + i);
        else line.push((SIZE - 1 - j) * SIZE + i);
      }
      lines.push(line);
    }
    return lines;
  }

  function collapseLine(line) {
    const values = line.map((index) => grid[index]).filter(Boolean);
    const merged = [];
    let gained = 0;
    for (let i = 0; i < values.length; i += 1) {
      if (i + 1 < values.length && values[i] === values[i + 1]) {
        const value = values[i] * 2;
        merged.push(value);
        gained += value;
        i += 1;
      } else {
        merged.push(values[i]);
      }
    }
    while (merged.length < SIZE) merged.push(0);
    let changed = false;
    line.forEach((index, position) => {
      if (grid[index] !== merged[position]) changed = true;
      grid[index] = merged[position];
    });
    return { changed, gained };
  }

  function canMove() {
    if (emptyCells().length) return true;
    for (let row = 0; row < SIZE; row += 1) {
      for (let col = 0; col < SIZE; col += 1) {
        const value = grid[row * SIZE + col];
        if (col + 1 < SIZE && grid[row * SIZE + col + 1] === value) return true;
        if (row + 1 < SIZE && grid[(row + 1) * SIZE + col] === value) return true;
      }
    }
    return false;
  }

  function announce(message) {
    window.Arcade.announce(liveEl, message);
  }

  function showOverlay(mode) {
    overlayMode = mode;
    if (mode === "win") {
      overlayKicker.textContent = "达成目标";
      overlayTitle.textContent = "合成 2048";
      overlayText.textContent = "你可以继续挑战更高数字，或开始新的一局。";
      overlayAction.textContent = "继续挑战";
    } else {
      overlayKicker.textContent = "本局结束";
      overlayTitle.textContent = "棋盘满了";
      overlayText.textContent = "没有可移动的方块。得分 " + score + "，最高分 " + best + "。";
      overlayAction.textContent = "再来一局";
    }
    overlay.hidden = false;
    window.Arcade.focusWithoutScroll(overlayAction);
    window.Arcade.sound.tone(mode === "win" ? 760 : 220, mode === "win" ? 0.16 : 0.3, "square", 0.045, mode === "win" ? 1040 : 70);
  }

  function hideOverlay() {
    overlay.hidden = true;
  }

  function checkState() {
    if (!won && grid.indexOf(2048) !== -1) {
      won = true;
      showOverlay("win");
      announce("你合成了 2048。可以继续挑战更高数字。");
      return;
    }
    if (!canMove()) {
      over = true;
      saveBest();
      render();
      showOverlay("over");
      announce("棋盘已满，游戏结束。得分 " + score + "，最高分 " + best + "。");
    }
  }

  function move(direction) {
    if (over || !overlay.hidden) return false;
    const before = grid.slice();
    let gained = 0;
    let changed = false;
    linesFor(direction).forEach((line) => {
      const result = collapseLine(line);
      if (result.changed) changed = true;
      gained += result.gained;
    });
    if (!changed) {
      announce("这个方向无法移动。");
      if (!canMove()) {
        over = true;
        saveBest();
        render();
        showOverlay("over");
        announce("棋盘已满，游戏结束。得分 " + score + "，最高分 " + best + "。");
      }
      return false;
    }
    history = { grid: before, score };
    score += gained;
    const isRecord = saveBest();
    addRandomTile();
    render();
    const directionName = { left: "左", right: "右", up: "上", down: "下" }[direction];
    announce(
      "向" + directionName + "移动" +
        (gained ? "，合并得分 " + gained : "") +
        "，当前得分 " + score + (isRecord ? "，刷新最高分" : "") + "。"
    );
    window.Arcade.sound.tone(gained ? 520 : 300, 0.05, "sine", 0.028, gained ? 720 : 360);
    checkState();
    return true;
  }

  function undo() {
    if (!history || over) return;
    grid.splice(0, CELLS, ...history.grid);
    score = history.score;
    history = null;
    hideOverlay();
    render();
    announce("已撤销上一步，当前得分 " + score + "。");
    window.Arcade.sound.tone(420, 0.06, "sine", 0.03, 320);
    boardEl.focus({ preventScroll: true });
  }

  function newGame() {
    grid.fill(0);
    score = 0;
    won = false;
    over = false;
    history = null;
    hideOverlay();
    addRandomTile();
    addRandomTile();
    render();
    announce("新游戏开始。使用方向键、WASD 或滑动合并数字。");
    boardEl.focus({ preventScroll: true });
  }

  function handleKey(event) {
    const key = typeof event.key === "string" ? event.key.toLowerCase() : "";
    if (!overlay.hidden) return;
    const directions = {
      arrowleft: "left",
      arrowright: "right",
      arrowup: "up",
      arrowdown: "down",
      a: "left",
      d: "right",
      w: "up",
      s: "down"
    };
    if (directions[key]) {
      event.preventDefault();
      move(directions[key]);
      return;
    }
    if (key === "u") {
      event.preventDefault();
      undo();
    }
  }

  let pointerStart = null;

  boardEl.addEventListener("pointerdown", (event) => {
    pointerStart = { x: event.clientX, y: event.clientY };
    boardEl.setPointerCapture?.(event.pointerId);
  });

  boardEl.addEventListener("pointerup", (event) => {
    if (!pointerStart) return;
    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;
    pointerStart = null;
    if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return;
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? "right" : "left");
    else move(dy > 0 ? "down" : "up");
  });

  boardEl.addEventListener("pointercancel", () => {
    pointerStart = null;
  });

  overlayAction.addEventListener("click", () => {
    if (overlayMode === "over") {
      newGame();
      return;
    }
    hideOverlay();
    if (!canMove()) {
      over = true;
      saveBest();
      render();
      showOverlay("over");
      return;
    }
    announce("继续挑战。");
    boardEl.focus({ preventScroll: true });
  });

  document.querySelectorAll("[data-move]").forEach((button) => {
    button.addEventListener("click", () => {
      move(button.dataset.move);
    });
  });

  undoBtn.addEventListener("click", undo);
  newBtn.addEventListener("click", newGame);
  window.Arcade.bindSound(soundBtn, soundLabel);

  document.addEventListener("keydown", handleKey);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && !overlay.hidden) return;
  });

  buildBoard();
  newGame();

  if (window.Arcade.debug) {
    window.__merge2048Debug = {
      snapshot() {
        return {
          grid: grid.slice(),
          score,
          best,
          won,
          over,
          history: Boolean(history),
          overlay: overlay.hidden ? null : overlayMode
        };
      },
      move,
      undo,
      newGame,
      setGrid(values, nextScore = 0) {
        if (!Array.isArray(values) || values.length !== CELLS) return false;
        const parsed = values.map((value) => {
          const number = Number(value);
          return Number.isFinite(number) && number > 0 ? number : 0;
        });
        grid.splice(0, CELLS, ...parsed);
        score = Number(nextScore) || 0;
        won = false;
        over = false;
        history = null;
        hideOverlay();
        render();
        return true;
      }
    };
  }
})();
