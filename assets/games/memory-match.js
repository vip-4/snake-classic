(() => {
  "use strict";

  const boardEl = document.getElementById("board");
  if (!boardEl) return;

  const SYMBOLS = [
    { icon: "🚀", name: "火箭" },
    { icon: "🌙", name: "月亮" },
    { icon: "🍀", name: "四叶草" },
    { icon: "🎧", name: "耳机" },
    { icon: "🍕", name: "披萨" },
    { icon: "🧩", name: "拼图" },
    { icon: "⭐", name: "星星" },
    { icon: "🐙", name: "章鱼" }
  ];
  const PAIRS = SYMBOLS.length;
  const MOVES_KEY = "arcade:memory:best-moves";
  const TIME_KEY = "arcade:memory:best-time";

  const movesEl = document.getElementById("moves");
  const pairsEl = document.getElementById("pairs");
  const timerEl = document.getElementById("timer");
  const bestEl = document.getElementById("best");
  const statusEl = document.getElementById("status");
  const liveEl = document.getElementById("live");
  const soundBtn = document.getElementById("sound");
  const soundLabel = document.querySelector("[data-sound-label]");
  const restartBtn = document.getElementById("restart");
  const overlay = document.getElementById("overlay");
  const overlayKicker = document.getElementById("overlay-kicker");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayText = document.getElementById("overlay-text");
  const overlayAction = document.getElementById("overlay-action");

  let deck = [];
  let cards = [];
  let first = null;
  let second = null;
  let locked = false;
  let over = false;
  let moves = 0;
  let pairs = 0;
  let started = false;
  let startedAt = 0;
  let elapsed = 0;
  let timerId = 0;
  let bestMoves = 0;
  let bestTime = 0;

  function updateBest() {
    bestMoves = window.Arcade.storage.getNumber(MOVES_KEY, 0);
    bestTime = window.Arcade.storage.getNumber(TIME_KEY, 0);
    bestEl.textContent = bestMoves ? bestMoves + " 步" : "--";
    bestEl.title = bestTime ? "最佳用时 " + window.Arcade.formatTime(bestTime) : "还没有完成记录";
  }

  function updateStatus() {
    if (over) {
      statusEl.textContent = "全部配对完成 · 用 " + moves + " 步 · " + window.Arcade.formatTime(elapsed);
      return;
    }
    if (!started) {
      statusEl.textContent = "点击任意卡片开始 · 每次翻开两张";
      return;
    }
    statusEl.textContent = "已配对 " + pairs + " / " + PAIRS + " · 步数 " + moves;
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
      elapsed = Math.max(1, Math.ceil((performance.now() - startedAt) / 1000));
      timerEl.textContent = window.Arcade.formatTime(elapsed);
    }, 250);
  }

  function cardLabel(index) {
    const card = deck[index];
    const position =
      "第 " + (Math.floor(index / 4) + 1) + " 行第 " + (index % 4 + 1) + " 列";
    if (!card) return position;
    if (card.matched) return position + "，" + card.name + "，已配对";
    if (card.flipped) return position + "，" + card.name + "，已翻开";
    return position + "，未翻开";
  }

  function buildBoard() {
    boardEl.textContent = "";
    cards = [];
    deck = window.Arcade.shuffle(
      SYMBOLS.concat(SYMBOLS).map((symbol) => ({
        icon: symbol.icon,
        name: symbol.name,
        flipped: false,
        matched: false
      }))
    );

    for (let i = 0; i < deck.length; i += 1) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "memory-card";
      card.dataset.index = String(i);
      card.setAttribute("aria-label", cardLabel(i));
      card.innerHTML =
        '<span class="memory-card__inner" aria-hidden="true">' +
        '<span class="memory-face memory-face--back">?</span>' +
        '<span class="memory-face memory-face--front">' + deck[i].icon + "</span>" +
        "</span>";
      card.addEventListener("click", () => flip(i));
      boardEl.appendChild(card);
      cards.push(card);
    }
  }

  function updateCard(index) {
    const card = deck[index];
    const el = cards[index];
    if (!card || !el) return;
    el.classList.toggle("is-flipped", card.flipped);
    el.classList.toggle("is-matched", card.matched);
    if (card.matched) {
      el.tabIndex = -1;
      el.setAttribute("aria-disabled", "true");
    } else {
      el.tabIndex = 0;
      el.removeAttribute("aria-disabled");
    }
    el.setAttribute("aria-label", cardLabel(index));
  }

  function flip(index) {
    if (locked || over) return;
    const card = deck[index];
    if (!card || card.matched || card.flipped) return;
    if (!started) {
      started = true;
      startTimer();
    }
    card.flipped = true;
    updateCard(index);
    window.Arcade.sound.tone(520, 0.045, "sine", 0.026, 660);

    if (first === null) {
      first = index;
      announce("已翻开" + card.name + "，再选一张卡片。");
      updateStatus();
      return;
    }

    second = index;
    moves += 1;
    movesEl.textContent = String(moves);
    updateStatus();

    if (deck[first].name === deck[second].name) {
      deck[first].matched = true;
      deck[second].matched = true;
      pairs += 1;
      pairsEl.textContent = pairs + "/" + PAIRS;
      updateCard(first);
      updateCard(second);
      first = null;
      second = null;
      window.Arcade.sound.tone(760, 0.08, "square", 0.035, 980);
      announce("配对成功，已完成 " + pairs + " 对，共 " + PAIRS + " 对。");
      updateStatus();
      if (pairs === PAIRS) win();
      return;
    }

    locked = true;
    announce("两张不同，记住位置，卡片即将翻回。");
    window.setTimeout(() => {
      if (first !== null) {
        deck[first].flipped = false;
        updateCard(first);
      }
      if (second !== null) {
        deck[second].flipped = false;
        updateCard(second);
      }
      first = null;
      second = null;
      locked = false;
      window.Arcade.sound.tone(260, 0.06, "sine", 0.02, 220);
      announce("卡片已翻回，继续寻找相同图案。");
      updateStatus();
    }, 760);
  }

  function win() {
    over = true;
    stopTimer();
    const recordMoves = !bestMoves || moves < bestMoves;
    const recordTime = !bestTime || elapsed < bestTime;
    if (recordMoves) bestMoves = moves;
    if (recordTime) bestTime = elapsed;
    if (recordMoves) window.Arcade.storage.setNumber(MOVES_KEY, bestMoves);
    if (recordTime) window.Arcade.storage.setNumber(TIME_KEY, bestTime);
    updateBest();
    updateStatus();
    overlayKicker.textContent = recordMoves || recordTime ? "新纪录" : "全部配对";
    overlayTitle.textContent = "恭喜完成";
    overlayText.textContent =
      "你用 " + moves + " 步、" + window.Arcade.formatTime(elapsed) + " 配齐全部 " + PAIRS +
      " 对。" + (recordMoves || recordTime ? "刷新了本地最佳成绩。" : "");
    overlay.hidden = false;
    window.Arcade.focusWithoutScroll(overlayAction);
    window.Arcade.sound.tone(660, 0.1, "square", 0.04);
    window.setTimeout(() => window.Arcade.sound.tone(880, 0.16, "square", 0.04), 110);
    announce("全部配对完成，用 " + moves + " 步，用时 " + window.Arcade.formatTime(elapsed) + "。");
  }

  function newGame(focus = false) {
    stopTimer();
    startedAt = 0;
    elapsed = 0;
    timerId = 0;
    first = null;
    second = null;
    locked = false;
    over = false;
    moves = 0;
    pairs = 0;
    started = false;
    movesEl.textContent = "0";
    pairsEl.textContent = "0/" + PAIRS;
    timerEl.textContent = "00:00";
    overlay.hidden = true;
    buildBoard();
    updateBest();
    updateStatus();
    announce("新游戏开始。点击任意卡片，每次翻开两张。");
    if (focus && cards[0]) cards[0].focus();
  }

  restartBtn.addEventListener("click", () => newGame(true));
  overlayAction.addEventListener("click", () => newGame(true));
  window.Arcade.bindSound(soundBtn, soundLabel);

  newGame();

  if (window.Arcade.debug) {
    window.__memoryMatchDebug = {
      snapshot() {
        return {
          moves,
          pairs,
          totalPairs: PAIRS,
          started,
          over,
          elapsed,
          bestMoves,
          bestTime,
          cards: deck.map((card) => ({
            name: card.name,
            icon: card.icon,
            flipped: card.flipped,
            matched: card.matched
          }))
        };
      },
      flip,
      newGame
    };
  }
})();
