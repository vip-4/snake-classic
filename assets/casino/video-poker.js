(() => {
  "use strict";

  const cardsEl = document.getElementById("poker-cards");
  if (!cardsEl) return;

  const Arcade = window.Arcade;
  const Casino = window.Casino;
  const BANKROLL_KEY = "casino:video-poker:bankroll";
  const STATS_KEY = "casino:video-poker:stats";
  const MAX_BET = 5;

  const bankrollEl = document.getElementById("poker-bankroll");
  const betEl = document.getElementById("poker-current-bet");
  const handsEl = document.getElementById("poker-hands");
  const bestEl = document.getElementById("poker-best");
  const resultEl = document.getElementById("poker-result");
  const paytableRows = Array.from(document.querySelectorAll("[data-hand]"));
  const creditButtons = Array.from(document.querySelectorAll("[data-credit]"));
  const dealBtn = document.getElementById("deal-draw");
  const resetBtn = document.getElementById("reset-bankroll");
  const soundBtn = document.getElementById("sound");
  const soundLabel = document.querySelector("[data-sound-label]");
  const liveEl = document.getElementById("live");

  let bankroll = Math.max(0, Arcade.storage.getNumber(BANKROLL_KEY, Casino.startingChips));
  let stats = Arcade.storage.getJSON(STATS_KEY, { hands: 0, bestWin: 0 });
  if (!stats || typeof stats !== "object") stats = { hands: 0, bestWin: 0 };
  let bet = 1;
  let deck = [];
  let cards = [];
  let held = [false, false, false, false, false];
  let phase = "betting";
  let lastResult = null;
  let forcedDeck = null;

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

  function format(value) {
    return Casino.formatChips(value);
  }

  function setResult(html, isWin = null) {
    resultEl.innerHTML = html;
    resultEl.classList.toggle("is-win", isWin === true);
  }

  function drawCard() {
    if (!deck.length) deck = Casino.shuffle(Casino.makeDeck());
    return deck.pop();
  }

  function cardSlotMarkup(index) {
    const card = cards[index];
    const isHeld = held[index];
    const label = card
      ? "第 " + (index + 1) + " 张，" + Casino.cardLabel(card) + "，" + (isHeld ? "已保留" : "未保留")
      : "第 " + (index + 1) + " 张，未发牌";
    const disabled = phase !== "draw" || !card;
    return (
      '<button class="poker-slot" type="button" data-index="' + index + '"' +
      ' aria-pressed="' + String(isHeld) + '" aria-label="' + label + '"' +
      (disabled ? " disabled" : "") + ">" +
      (card ? Casino.cardHTML(card) : Casino.cardHTML(null, { hidden: true })) +
      '<span class="poker-slot__hold">' + (isHeld ? "保留中" : "保留") + "</span>" +
      "</button>"
    );
  }

  function renderCards() {
    cardsEl.innerHTML = cards.length
      ? cards.map((_card, index) => cardSlotMarkup(index)).join("")
      : [0, 1, 2, 3, 4].map((index) => cardSlotMarkup(index)).join("");
  }

  function renderPaytable() {
    for (const row of paytableRows) {
      row.classList.toggle("is-win", Boolean(lastResult && lastResult.key === row.dataset.hand));
    }
  }

  function updateHud() {
    bankrollEl.textContent = format(bankroll);
    betEl.textContent = bet + " 注";
    handsEl.textContent = String(stats.hands || 0);
    bestEl.textContent = format(stats.bestWin || 0);
    for (const button of creditButtons) {
      const value = Number(button.dataset.credit);
      button.setAttribute("aria-pressed", String(value === bet));
      button.disabled = phase === "draw" || value > bankroll;
    }
    dealBtn.disabled = phase === "draw" ? false : bankroll < bet;
    dealBtn.textContent = phase === "settled" ? "下一局" : phase === "draw" ? "抽牌" : "发牌";
    resetBtn.disabled = false;
  }

  function render() {
    updateHud();
    renderCards();
    renderPaytable();
  }

  function startHand() {
    if (phase === "draw") return;
    if (bankroll < bet) {
      setResult("虚拟筹码不足。请选择更小的注额，或点击“重置筹码”。");
      announce("筹码不足，无法发牌。");
      return;
    }
    bankroll -= bet;
    deck = forcedDeck ? forcedDeck.slice().reverse() : Casino.shuffle(Casino.makeDeck());
    forcedDeck = null;
    const drawn = [];
    for (let i = 0; i < 5; i += 1) drawn.push(drawCard());
    cards = drawn;
    held = [false, false, false, false, false];
    phase = "draw";
    lastResult = null;
    save();
    render();
    setResult("已发 5 张牌。点击要保留的牌（1–5 也可），然后点击“抽牌”。未保留的牌会被替换。");
    announce("发牌完成。选择要保留的牌，然后抽牌。");
    tone(480, 0.05, "sine", 0.025, 620);
    const firstSlot = cardsEl.querySelector(".poker-slot:not(:disabled)");
    if (firstSlot) window.Arcade.focusWithoutScroll(firstSlot);
  }

  function toggleHold(index) {
    if (phase !== "draw" || !cards[index]) return;
    held[index] = !held[index];
    tone(held[index] ? 640 : 360, 0.04, "sine", 0.02, held[index] ? 760 : 300);
    render();
    const count = held.filter(Boolean).length;
    setResult(
      "已保留 <strong>" + count + "</strong> 张牌。再点一次取消保留；点击“抽牌”替换其余 " +
        (5 - count) + " 张。"
    );
    announce("已保留 " + count + " 张牌。");
  }

  function payFor(result) {
    const perCredit = result.key === "royal" && bet === MAX_BET ? 800 : result.payout;
    return perCredit * bet;
  }

  function draw() {
    if (phase !== "draw") return;
    for (let i = 0; i < 5; i += 1) {
      if (!held[i]) cards[i] = drawCard();
    }
    phase = "settled";
    lastResult = Casino.evaluatePokerHand(cards);
    const winnings = payFor(lastResult);
    bankroll += winnings;
    stats.hands = (stats.hands || 0) + 1;
    if (winnings > (stats.bestWin || 0)) stats.bestWin = winnings;
    save();
    render();

    const heldCount = held.filter(Boolean).length;
    if (winnings > 0) {
      setResult(
        "<strong>" + lastResult.name + "</strong>（" + lastResult.en + "），保留 " + heldCount +
          " 张，赢得 <strong>" + format(winnings) + "</strong> 虚拟筹码。点击“下一局”继续。",
        true
      );
      announce("获得 " + lastResult.name + "，赢得 " + format(winnings) + " 虚拟筹码。");
      tone(660, 0.1, "square", 0.04);
      window.setTimeout(() => tone(880, 0.16, "square", 0.04), 110);
    } else {
      setResult(
        "<strong>" + lastResult.name + "</strong>。" + lastResult.en +
          "，本局没有赔付。点击“下一局”继续。"
      );
      announce("没有组成有效牌型。");
      tone(250, 0.16, "sawtooth", 0.026, 150);
    }
    if (bankroll < bet) {
      setResult(
        "本局结束。虚拟筹码已不足以下注 " + bet + " 注，点击“重置筹码”继续娱乐。"
      );
    }
    window.Arcade.focusWithoutScroll(dealBtn);
  }

  function chooseBet(value) {
    if (phase === "draw") return;
    const next = Number(value);
    if (!Number.isFinite(next) || next < 1 || next > MAX_BET) return;
    bet = next;
    if (phase === "settled") {
      cards = [];
      held = [false, false, false, false, false];
      lastResult = null;
      phase = "betting";
      setResult("已选择 " + bet + " 注。点击“发牌”开始新的一局。");
    } else {
      setResult("已选择 " + bet + " 注。每注为 1 个虚拟筹码，最多 5 注。");
    }
    render();
  }

  function resetBankroll() {
    if (phase === "draw") return;
    bankroll = Casino.startingChips;
    cards = [];
    held = [false, false, false, false, false];
    lastResult = null;
    phase = "betting";
    save();
    render();
    setResult("虚拟筹码已重置为 " + format(bankroll) + "。本页不涉及任何真实货币。");
    announce("虚拟筹码已重置。");
    tone(620, 0.08, "sine", 0.03, 820);
    window.Arcade.focusWithoutScroll(dealBtn);
  }

  for (const button of creditButtons) {
    button.addEventListener("click", () => chooseBet(button.dataset.credit));
  }

  cardsEl.addEventListener("click", (event) => {
    const slot = event.target.closest(".poker-slot");
    if (!slot || slot.disabled) return;
    toggleHold(Number(slot.dataset.index));
  });

  dealBtn.addEventListener("click", () => {
    if (phase === "draw") draw();
    else startHand();
  });
  resetBtn.addEventListener("click", resetBankroll);
  Arcade.bindSound(soundBtn, soundLabel);

  document.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (phase !== "draw") return;
    if (/^[1-5]$/.test(event.key)) {
      event.preventDefault();
      toggleHold(Number(event.key) - 1);
    }
  });

  render();
  setResult("选择 1–5 注后点击“发牌”。Jacks or Better 9/6 赔付表；所有筹码均为虚拟数字，不能兑换现金或实物。");

  if (Arcade.debug) {
    window.__videoPokerDebug = {
      snapshot() {
        return {
          phase,
          bankroll,
          bet,
          cards: cards.slice(),
          held: held.slice(),
          lastResult,
          stats: { ...stats },
          deckCount: deck.length
        };
      },
      setBankroll(value) {
        bankroll = Math.max(0, Number(value) || 0);
        save();
        render();
      },
      setBet: chooseBet,
      setDeck(cardsInDrawOrder) {
        forcedDeck = Array.isArray(cardsInDrawOrder) ? cardsInDrawOrder.slice() : null;
      },
      startHand,
      toggleHold,
      draw,
      evaluate: Casino.evaluatePokerHand,
      resetBankroll
    };
  }
})();
