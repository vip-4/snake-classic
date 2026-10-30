(() => {
  "use strict";

  const wheel = document.getElementById("roulette-wheel");
  if (!wheel) return;

  const Arcade = window.Arcade;
  const Casino = window.Casino;
  const BANKROLL_KEY = "casino:roulette:bankroll";
  const STATS_KEY = "casino:roulette:stats";
  const MIN_CHIP = 5;
  const WHEEL_ORDER = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
    5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
  ];
  const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  const STEP = 360 / 37;

  const bankrollEl = document.getElementById("roulette-bankroll");
  const betEl = document.getElementById("roulette-bet");
  const spinsEl = document.getElementById("roulette-spins");
  const bestEl = document.getElementById("roulette-best");
  const wheelLabels = document.getElementById("wheel-labels");
  const resultEl = document.getElementById("roulette-result");
  const historyEl = document.getElementById("roulette-history");
  const zeroEl = document.getElementById("roulette-zero");
  const numbersEl = document.getElementById("roulette-numbers");
  const outsideEl = document.getElementById("roulette-outside");
  const chipButtons = Array.from(document.querySelectorAll("[data-chip]"));
  const spinBtn = document.getElementById("spin");
  const undoBtn = document.getElementById("undo-bet");
  const clearBtn = document.getElementById("clear-bets");
  const resetBtn = document.getElementById("reset-bankroll");
  const soundBtn = document.getElementById("sound");
  const soundLabel = document.querySelector("[data-sound-label]");
  const liveEl = document.getElementById("live");

  let bankroll = Math.max(0, Arcade.storage.getNumber(BANKROLL_KEY, Casino.startingChips));
  let stats = Arcade.storage.getJSON(STATS_KEY, { spins: 0, bestWin: 0 });
  if (!stats || typeof stats !== "object") stats = { spins: 0, bestWin: 0 };
  let selectedChip = 10;
  let bets = new Map();
  let betHistory = [];
  let totalBet = 0;
  let spinning = false;
  let rotation = 0;
  let forcedNumber = null;
  let recent = [];

  function save() {
    Arcade.storage.setNumber(BANKROLL_KEY, bankroll);
    Arcade.storage.setJSON(STATS_KEY, stats);
  }

  function announce(text) {
    Arcade.announce(liveEl, text);
  }

  function tone(freq, duration, type, volume, endFreq) {
    if (Arcade.sound) Arcade.sound.tone(freq, duration, type, volume, endFreq);
  }

  function colorOf(number) {
    if (number === 0) return "zero";
    return RED_NUMBERS.has(number) ? "red" : "black";
  }

  function colorLabel(number) {
    const color = colorOf(number);
    if (color === "zero") return "绿色";
    return color === "red" ? "红色" : "黑色";
  }

  function format(number) {
    return Casino.formatChips(number);
  }

  function buildWheel() {
    const stops = [];
    wheelLabels.textContent = "";
    for (let index = 0; index < WHEEL_ORDER.length; index += 1) {
      const number = WHEEL_ORDER[index];
      const color = colorOf(number);
      const fill = color === "zero" ? "#1f7a4d" : color === "red" ? "#a92535" : "#151515";
      const start = index * STEP;
      const end = (index + 1) * STEP;
      stops.push(fill + " " + start.toFixed(3) + "deg " + end.toFixed(3) + "deg");

      const segment = document.createElement("span");
      segment.className = "roulette-seg";
      segment.style.setProperty("--angle", (start + STEP / 2).toFixed(3) + "deg");
      const label = document.createElement("span");
      label.textContent = String(number);
      segment.appendChild(label);
      wheelLabels.appendChild(segment);
    }
    wheel.style.background = "conic-gradient(" + stops.join(", ") + ")";
  }

  function betKeyForNumber(number) {
    return "number:" + number;
  }

  function makeCell(key, label, options = {}) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "roulette-cell";
    if (options.className) button.className += " " + options.className;
    button.dataset.key = key;
    button.dataset.label = label;
    button.textContent = options.text || label;
    if (options.number !== undefined) {
      button.dataset.number = String(options.number);
      button.classList.add("is-" + colorOf(options.number));
    }
    if (options.gridColumn) button.style.gridColumn = options.gridColumn;
    if (options.gridRow) button.style.gridRow = options.gridRow;
    button.addEventListener("click", () => placeBet(key, label));
    return button;
  }

  function buildBoard() {
    zeroEl.textContent = "";
    numbersEl.textContent = "";
    outsideEl.textContent = "";

    const zero = makeCell("number:0", "数字 0", {
      text: "0",
      number: 0,
      className: "is-zero"
    });
    zero.setAttribute("aria-label", "数字 0，绿色，点击下注");
    zeroEl.appendChild(zero);

    for (let number = 1; number <= 36; number += 1) {
      const column = Math.floor((number - 1) / 3) + 1;
      const row = 3 - ((number - 1) % 3);
      const cell = makeCell(betKeyForNumber(number), "数字 " + number, {
        text: String(number),
        number,
        gridColumn: String(column),
        gridRow: String(row)
      });
      cell.setAttribute(
        "aria-label",
        "数字 " + number + "，" + colorLabel(number) + "，点击下注"
      );
      numbersEl.appendChild(cell);
    }

    const outside = [
      ["red", "红色", "红色", "is-red"],
      ["black", "黑色", "黑色", "is-black"],
      ["odd", "奇数", "奇数", ""],
      ["even", "偶数", "偶数", ""],
      ["low", "小 1–18", "小 1–18", "is-dozen"],
      ["high", "大 19–36", "大 19–36", "is-dozen"]
    ];
    for (const [key, label, text, className] of outside) {
      const cell = makeCell(key, label, { text, className });
      cell.setAttribute("aria-label", label + "，点击下注");
      outsideEl.appendChild(cell);
    }

    const dozens = [
      ["dozen:1", "第一打 1–12", "1–12"],
      ["dozen:2", "第二打 13–24", "13–24"],
      ["dozen:3", "第三打 25–36", "25–36"]
    ];
    for (const [key, label, text] of dozens) {
      const cell = makeCell(key, label, { text, className: "is-dozen roulette-cell--wide" });
      cell.setAttribute("aria-label", label + "，点击下注");
      outsideEl.appendChild(cell);
    }

    const columns = [
      ["column:1", "第一列 1, 4, …, 34", "第 1 列"],
      ["column:2", "第二列 2, 5, …, 35", "第 2 列"],
      ["column:3", "第三列 3, 6, …, 36", "第 3 列"]
    ];
    for (const [key, label, text] of columns) {
      const cell = makeCell(key, label, { text, className: "is-column roulette-cell--wide" });
      cell.setAttribute("aria-label", label + "，点击下注");
      outsideEl.appendChild(cell);
    }
  }

  function amountFor(key) {
    const entry = bets.get(key);
    return entry ? entry.amount : 0;
  }

  function updateCells() {
    const cells = document.querySelectorAll(".roulette-cell");
    for (const cell of cells) {
      const key = cell.dataset.key;
      const amount = amountFor(key);
      cell.classList.toggle("has-bet", amount > 0);
      const previous = cell.querySelector(".roulette-cell__bet");
      if (previous) previous.remove();
      if (amount > 0) {
        const badge = document.createElement("span");
        badge.className = "roulette-cell__bet";
        badge.textContent = format(amount);
        cell.appendChild(badge);
        cell.setAttribute("aria-label", cell.dataset.label + "，已下注 " + format(amount));
      } else if (cell.dataset.label) {
        cell.setAttribute("aria-label", cell.dataset.label + "，点击下注");
      }
    }
  }

  function updateHistory() {
    historyEl.textContent = "";
    for (const number of recent) {
      const chip = document.createElement("span");
      chip.className = "is-" + colorOf(number);
      chip.textContent = String(number);
      chip.title = "数字 " + number + "，" + colorLabel(number);
      historyEl.appendChild(chip);
    }
  }

  function updateHud() {
    bankrollEl.textContent = format(bankroll);
    betEl.textContent = format(totalBet);
    spinsEl.textContent = String(stats.spins || 0);
    bestEl.textContent = format(stats.bestWin || 0);
    for (const button of chipButtons) {
      const value = Number(button.dataset.chip);
      button.setAttribute("aria-pressed", String(value === selectedChip));
      button.disabled = spinning || value > bankroll;
    }
    spinBtn.disabled = spinning || totalBet <= 0;
    undoBtn.disabled = spinning || betHistory.length === 0;
    clearBtn.disabled = spinning || totalBet <= 0;
    resetBtn.disabled = spinning;
  }

  function update() {
    updateCells();
    updateHud();
    updateHistory();
  }

  function setResult(html, isWin = null) {
    resultEl.innerHTML = html;
    resultEl.classList.toggle("is-win", isWin === true);
  }

  function placeBet(key, label) {
    if (spinning) return;
    if (bankroll < selectedChip) {
      setResult("虚拟筹码不足。请选择更小的筹码，或点击“重置筹码”。");
      announce("筹码不足。");
      return;
    }
    bankroll -= selectedChip;
    totalBet += selectedChip;
    const previous = bets.get(key);
    if (previous) {
      previous.amount += selectedChip;
    } else {
      bets.set(key, { key, label, amount: selectedChip });
    }
    betHistory.push({ key, amount: selectedChip });
    tone(520, 0.035, "sine", 0.02, 620);
    update();
    setResult(
      "已下注 <strong>" + format(selectedChip) + "</strong> 于 <strong>" + label +
        "</strong>。本局总下注 <strong>" + format(totalBet) + "</strong>。点击“旋转”开奖。"
    );
  }

  function undoBet() {
    if (spinning) return;
    const last = betHistory.pop();
    if (!last) return;
    bankroll += last.amount;
    totalBet -= last.amount;
    const entry = bets.get(last.key);
    if (entry) {
      entry.amount -= last.amount;
      if (entry.amount <= 0) bets.delete(last.key);
    }
    tone(340, 0.05, "sine", 0.02, 300);
    update();
    setResult("已撤销最后一注。本局总下注 <strong>" + format(totalBet) + "</strong>。");
  }

  function clearBets() {
    if (spinning) return;
    bankroll += totalBet;
    totalBet = 0;
    bets.clear();
    betHistory = [];
    tone(360, 0.06, "sine", 0.022, 300);
    update();
    setResult("已清空并退回全部下注。选择筹码后点击桌面下注。");
  }

  function betWins(key, number) {
    if (key.startsWith("number:")) return Number(key.slice(7)) === number;
    if (key === "red") return number !== 0 && RED_NUMBERS.has(number);
    if (key === "black") return number !== 0 && !RED_NUMBERS.has(number);
    if (key === "odd") return number !== 0 && number % 2 === 1;
    if (key === "even") return number !== 0 && number % 2 === 0;
    if (key === "low") return number >= 1 && number <= 18;
    if (key === "high") return number >= 19 && number <= 36;
    if (key.startsWith("dozen:")) {
      const dozen = Number(key.slice(6));
      return number >= (dozen - 1) * 12 + 1 && number <= dozen * 12;
    }
    if (key.startsWith("column:")) {
      const column = Number(key.slice(7));
      return number > 0 && ((number - 1) % 3) + 1 === column;
    }
    return false;
  }

  function payoutFor(key, amount) {
    if (key.startsWith("number:")) return amount * 36;
    if (key.startsWith("dozen:") || key.startsWith("column:")) return amount * 3;
    return amount * 2;
  }

  function spinWheel(number, callback) {
    const index = WHEEL_ORDER.indexOf(number);
    const center = index * STEP + STEP / 2;
    const current = ((rotation % 360) + 360) % 360;
    const target = ((-center - current) % 360 + 360) % 360;
    rotation += 360 * 6 + target;
    const reduce = Arcade.reducedMotion && Arcade.reducedMotion();
    if (reduce) {
      wheel.style.transition = "none";
      wheel.style.transform = "rotate(" + rotation + "deg)";
      window.setTimeout(callback, 40);
      return;
    }
    wheel.style.transform = "rotate(" + rotation + "deg)";
    window.setTimeout(callback, 4350);
  }

  function spin() {
    if (spinning || totalBet <= 0) return;
    spinning = true;
    const chosen =
      forcedNumber !== null && forcedNumber >= 0 && forcedNumber <= 36
        ? forcedNumber
        : WHEEL_ORDER[Casino.randomInt(WHEEL_ORDER.length)];
    forcedNumber = null;
    update();
    setResult("小球旋转中……本局总下注 <strong>" + format(totalBet) + "</strong>。");
    announce("轮盘旋转中。");
    tone(220, 0.25, "sawtooth", 0.02, 440);
    spinWheel(chosen, () => resolve(chosen));
  }

  function resolve(number) {
    let payout = 0;
    const winning = [];
    for (const entry of bets.values()) {
      if (betWins(entry.key, number)) {
        const amount = payoutFor(entry.key, entry.amount);
        payout += amount;
        winning.push(entry.label + " +" + format(amount - entry.amount));
      }
    }
    const net = payout - totalBet;
    bankroll += payout;
    stats.spins = (stats.spins || 0) + 1;
    if (net > 0) stats.bestWin = Math.max(stats.bestWin || 0, net);
    recent.unshift(number);
    recent = recent.slice(0, 10);
    totalBet = 0;
    bets.clear();
    betHistory = [];
    spinning = false;
    save();
    update();

    const sign = net > 0 ? "净赢" : net < 0 ? "净输" : "持平";
    const netText = net === 0 ? "本局持平" : sign + " <strong>" + format(Math.abs(net)) + "</strong> 虚拟筹码";
    let extra = "";
    if (winning.length) {
      extra = " 命中：" + winning.join("、") + "。";
    } else {
      extra = " 本局没有命中的注项。";
    }
    setResult(
      "开出 <strong>" + number + "</strong>（" + colorLabel(number) + "）。" + netText + "。" + extra,
      net > 0
    );
    announce("开出 " + number + "，" + colorLabel(number) + "。" + netText.replace(/<[^>]+>/g, "") + "。");

    if (net > 0) {
      tone(660, 0.09, "square", 0.04);
      window.setTimeout(() => tone(880, 0.16, "square", 0.04), 110);
    } else if (net < 0) {
      tone(250, 0.16, "sawtooth", 0.025, 150);
    } else {
      tone(460, 0.08, "sine", 0.025);
    }

    if (bankroll < MIN_CHIP) {
      setResult(
        "开出 <strong>" + number + "</strong>（" + colorLabel(number) +
          "）。虚拟筹码已不足，点击“重置筹码”继续娱乐。"
      );
    }
    window.Arcade.focusWithoutScroll(spinBtn);
  }

  function resetBankroll() {
    if (spinning) return;
    bankroll = Casino.startingChips;
    totalBet = 0;
    bets.clear();
    betHistory = [];
    recent = [];
    save();
    update();
    setResult("虚拟筹码已重置为 " + format(bankroll) + "。本页不涉及任何真实货币。");
    announce("虚拟筹码已重置。");
    tone(620, 0.08, "sine", 0.03, 820);
    window.Arcade.focusWithoutScroll(spinBtn);
  }

  for (const button of chipButtons) {
    button.addEventListener("click", () => {
      if (spinning) return;
      selectedChip = Number(button.dataset.chip);
      updateHud();
      setResult("已选择 <strong>" + format(selectedChip) + "</strong> 筹码。点击桌面数字或外围区域下注。");
    });
  }

  spinBtn.addEventListener("click", spin);
  undoBtn.addEventListener("click", undoBet);
  clearBtn.addEventListener("click", clearBets);
  resetBtn.addEventListener("click", resetBankroll);
  Arcade.bindSound(soundBtn, soundLabel);

  buildWheel();
  buildBoard();
  update();
  setResult("选择筹码，再点击桌面下注；至少下注一注后点击“旋转”。所有筹码均为虚拟数字。");

  if (Arcade.debug) {
    window.__rouletteDebug = {
      snapshot() {
        return {
          bankroll,
          selectedChip,
          totalBet,
          spinning,
          bets: Array.from(bets.values()).map((entry) => ({ ...entry })),
          stats: { ...stats },
          recent: recent.slice()
        };
      },
      setBankroll(value) {
        bankroll = Math.max(0, Number(value) || 0);
        save();
        update();
      },
      setChip(value) {
        selectedChip = Number(value) || 5;
        updateHud();
      },
      placeBet(key, label) {
        placeBet(key, label || key);
      },
      spin,
      setNextNumber(value) {
        forcedNumber = Number(value);
      },
      clearBets,
      undoBet,
      resetBankroll,
      betWins,
      payoutFor
    };
  }
})();
