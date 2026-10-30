(() => {
  "use strict";

  const table = document.getElementById("bj-table");
  if (!table) return;

  const Arcade = window.Arcade;
  const Casino = window.Casino;
  const BANKROLL_KEY = "casino:blackjack:bankroll";
  const STATS_KEY = "casino:blackjack:stats";
  const MIN_BET = 10;
  const MAX_HANDS = 4;
  const DECKS = 6;
  const RESHUFFLE_AT = 78;

  const bankrollEl = document.getElementById("bankroll");
  const betEl = document.getElementById("current-bet");
  const recordEl = document.getElementById("record");
  const blackjackEl = document.getElementById("blackjack-count");
  const dealerCardsEl = document.getElementById("dealer-cards");
  const dealerScoreEl = document.getElementById("dealer-score");
  const handsEl = document.getElementById("player-hands");
  const messageEl = document.getElementById("bj-message");
  const liveEl = document.getElementById("live");
  const chipButtons = Array.from(document.querySelectorAll("[data-bet]"));
  const dealBtn = document.getElementById("deal");
  const hitBtn = document.getElementById("hit");
  const standBtn = document.getElementById("stand");
  const doubleBtn = document.getElementById("double");
  const splitBtn = document.getElementById("split");
  const resetBtn = document.getElementById("reset-bankroll");
  const soundBtn = document.getElementById("sound");
  const soundLabel = document.querySelector("[data-sound-label]");

  let bankroll = Math.max(0, Arcade.storage.getNumber(BANKROLL_KEY, Casino.startingChips));
  let stats = Arcade.storage.getJSON(STATS_KEY, {
    wins: 0,
    losses: 0,
    pushes: 0,
    blackjacks: 0,
    rounds: 0
  });
  if (!stats || typeof stats !== "object") {
    stats = { wins: 0, losses: 0, pushes: 0, blackjacks: 0, rounds: 0 };
  }
  let bet = 25;
  let shoe = [];
  let dealer = [];
  let hands = [];
  let active = 0;
  let phase = "betting";
  let dealerHoleHidden = false;
  let dealerDelay = 520;
  let dealerTimer = 0;
  let forcedShoe = false;

  function save() {
    Arcade.storage.setNumber(BANKROLL_KEY, bankroll);
    Arcade.storage.setJSON(STATS_KEY, stats);
  }

  function announce(text) {
    Arcade.announce(liveEl, text);
  }

  function setMessage(text) {
    messageEl.textContent = text;
  }

  function tone(freq, duration, type, volume, endFreq) {
    if (Arcade.sound) Arcade.sound.tone(freq, duration, type, volume, endFreq);
  }

  function buildShoe() {
    const cards = [];
    for (let i = 0; i < DECKS; i += 1) {
      cards.push(...Casino.makeDeck());
    }
    shoe = Casino.shuffle(cards);
  }

  function draw() {
    if (shoe.length === 0) buildShoe();
    return shoe.pop();
  }

  function handTotal(cards) {
    return Casino.handValue(cards).total;
  }

  function isBust(hand) {
    return handTotal(hand.cards) > 21;
  }

  function isNatural(hand) {
    return hand.cards.length === 2 && !hand.split && handTotal(hand.cards) === 21;
  }

  function activeHand() {
    return hands[active] || null;
  }

  function canDouble() {
    const hand = activeHand();
    return (
      phase === "player" &&
      hand &&
      !hand.done &&
      hand.cards.length === 2 &&
      bankroll >= hand.bet
    );
  }

  function canSplit() {
    const hand = activeHand();
    return (
      phase === "player" &&
      hand &&
      !hand.done &&
      hand.cards.length === 2 &&
      hands.length < MAX_HANDS &&
      hand.cards[0].rank === hand.cards[1].rank &&
      bankroll >= hand.bet
    );
  }

  function updateHud() {
    bankrollEl.textContent = Casino.formatChips(bankroll);
    betEl.textContent = Casino.formatChips(bet);
    recordEl.textContent = stats.wins + " / " + stats.losses;
    blackjackEl.textContent = String(stats.blackjacks);
    for (const button of chipButtons) {
      const value = Number(button.dataset.bet);
      button.setAttribute("aria-pressed", String(value === bet));
      button.disabled = phase === "player" || phase === "dealer" || value > bankroll;
    }
  }

  function cardMarkup(cards, hiddenIndex = -1) {
    return cards
      .map((card, index) => Casino.cardHTML(card, { hidden: index === hiddenIndex }))
      .join("");
  }

  function handsMarkup() {
    if (!hands.length) {
      return '<p class="bj-hint">选择筹码后点击“发牌”。庄家在 17 点停牌，黑杰克按 3:2 支付。</p>';
    }
    return hands
      .map((hand, index) => {
        const total = handTotal(hand.cards);
        const classes = ["bj-hand"];
        if (index === active && phase === "player") classes.push("is-active");
        if (hand.done) classes.push("is-done");
        const resultClass = hand.result
          ? hand.result.kind === "win"
            ? " is-win"
            : hand.result.kind === "loss"
              ? " is-loss"
              : ""
          : "";
        const result = hand.result
          ? '<p class="bj-hand__result' + resultClass + '">' + hand.result.text + "</p>"
          : "";
        return (
          '<div class="' + classes.join(" ") + '">' +
          '<div class="bj-hand__head"><span>手牌 ' + (index + 1) + "</span>" +
          '<span class="bj-score">' + (isBust(hand) ? "爆牌 " : "") + total + " 点 · 注 " +
          Casino.formatChips(hand.bet) + "</span></div>" +
          '<div class="bj-cards">' + cardMarkup(hand.cards) + "</div>" +
          result +
          "</div>"
        );
      })
      .join("");
  }

  function render() {
    updateHud();
    if (dealer.length) {
      dealerCardsEl.innerHTML = cardMarkup(dealer, dealerHoleHidden ? 1 : -1);
      if (dealerHoleHidden) {
        dealerScoreEl.textContent = handTotal([dealer[0]]) + " + ?";
      } else {
        dealerScoreEl.textContent = handTotal(dealer) + " 点";
      }
    } else {
      dealerCardsEl.innerHTML = '<span class="bj-hint">等待发牌</span>';
      dealerScoreEl.textContent = "--";
    }
    handsEl.innerHTML = handsMarkup();

    const hand = activeHand();
    const playerTurn = phase === "player" && hand && !hand.done;
    hitBtn.disabled = !playerTurn;
    standBtn.disabled = !playerTurn;
    doubleBtn.disabled = !canDouble();
    splitBtn.disabled = !canSplit();
    dealBtn.disabled = (phase === "player" || phase === "dealer") || bankroll < bet;
    dealBtn.textContent = phase === "settled" ? "再来一局" : "发牌";
    resetBtn.disabled = false;

    table.setAttribute(
      "aria-label",
      "21 点牌桌。余额 " + Casino.formatChips(bankroll) + " 虚拟筹码，当前下注 " +
        Casino.formatChips(bet) + "，庄家 " +
        (dealer.length ? (dealerHoleHidden ? "明牌 " + handTotal([dealer[0]]) + " 点" : handTotal(dealer) + " 点") : "未发牌") +
        "。"
    );
  }

  function startRound() {
    if (phase === "player" || phase === "dealer") return;
    if (bankroll < bet) {
      setMessage("虚拟筹码不足。请选择更小的注额，或点击“重置筹码”。");
      announce("筹码不足，无法发牌。");
      return;
    }
    if (!forcedShoe && shoe.length < RESHUFFLE_AT) buildShoe();
    forcedShoe = false;

    dealer = [];
    hands = [];
    active = 0;
    phase = "player";
    dealerHoleHidden = true;
    bankroll -= bet;
    hands = [
      {
        cards: [],
        bet,
        done: false,
        doubled: false,
        split: false,
        result: null
      }
    ];

    hands[0].cards.push(draw());
    dealer.push(draw());
    hands[0].cards.push(draw());
    dealer.push(draw());

    save();
    render();
    tone(460, 0.05, "sine", 0.025, 620);
    setMessage("你的手牌 " + handTotal(hands[0].cards) + " 点，庄家明牌 " + handTotal([dealer[0]]) + " 点。");
    announce("发牌完成。你的手牌 " + handTotal(hands[0].cards) + " 点。");

    const playerNatural = isNatural(hands[0]);
    const dealerNatural = Casino.isNaturalBlackjack(dealer);
    if (playerNatural || dealerNatural) {
      settle();
      return;
    }
    if (handTotal(hands[0].cards) === 21) {
      hands[0].done = true;
      dealerTurn();
      return;
    }
    window.Arcade.focusWithoutScroll(hitBtn);
  }

  function hit() {
    if (phase !== "player") return;
    const hand = activeHand();
    if (!hand || hand.done) return;
    hand.cards.push(draw());
    tone(520, 0.04, "sine", 0.022, 640);
    const total = handTotal(hand.cards);
    if (total > 21) {
      hand.done = true;
      hand.result = { kind: "loss", text: "爆牌，损失 " + Casino.formatChips(hand.bet) + " 筹码" };
      setMessage("手牌 " + total + " 点，爆牌。");
      announce("爆牌，手牌 " + total + " 点。");
      tone(240, 0.16, "sawtooth", 0.035, 120);
      render();
      window.setTimeout(nextHandOrDealer, 420);
      return;
    }
    if (total === 21) {
      hand.done = true;
      setMessage("21 点，自动停牌。");
      announce("21 点，自动停牌。");
      render();
      window.setTimeout(nextHandOrDealer, 300);
      return;
    }
    render();
    setMessage("你的手牌 " + total + " 点。可以继续要牌、停牌、加倍或分牌。");
    announce("你的手牌 " + total + " 点。");
  }

  function stand() {
    if (phase !== "player") return;
    const hand = activeHand();
    if (!hand || hand.done) return;
    hand.done = true;
    tone(360, 0.06, "sine", 0.022, 300);
    render();
    nextHandOrDealer();
  }

  function doubleDown() {
    if (!canDouble()) return;
    const hand = activeHand();
    bankroll -= hand.bet;
    hand.bet *= 2;
    hand.doubled = true;
    hand.cards.push(draw());
    hand.done = true;
    tone(580, 0.07, "square", 0.028, 760);
    const total = handTotal(hand.cards);
    if (total > 21) {
      hand.result = { kind: "loss", text: "加倍后爆牌，损失 " + Casino.formatChips(hand.bet) + " 筹码" };
      setMessage("加倍后手牌 " + total + " 点，爆牌。");
      announce("加倍后爆牌。");
    } else {
      setMessage("加倍完成，手牌 " + total + " 点。");
      announce("加倍完成，手牌 " + total + " 点。");
    }
    save();
    render();
    window.setTimeout(nextHandOrDealer, 420);
  }

  function split() {
    if (!canSplit()) return;
    const hand = activeHand();
    bankroll -= hand.bet;
    const first = hand.cards[0];
    const second = hand.cards[1];
    const left = {
      cards: [first, draw()],
      bet: hand.bet,
      done: false,
      doubled: false,
      split: true,
      result: null
    };
    const right = {
      cards: [second, draw()],
      bet: hand.bet,
      done: false,
      doubled: false,
      split: true,
      result: null
    };
    if (first.rank === "A") {
      left.done = true;
      right.done = true;
    }
    hands.splice(active, 1, left, right);
    tone(700, 0.07, "square", 0.03, 900);
    save();
    render();
    if (first.rank === "A") {
      setMessage("分牌后每手各发一张，A 分牌自动停牌。");
      announce("A 分牌自动停牌。");
      dealerTurn();
      return;
    }
    setMessage("已分牌。先玩手牌 " + (active + 1) + "。");
    announce("已分牌，先玩第一手。");
  }

  function nextHandOrDealer() {
    for (let i = active + 1; i < hands.length; i += 1) {
      if (!hands[i].done) {
        active = i;
        render();
        setMessage("轮到第 " + (i + 1) + " 手，当前 " + handTotal(hands[i].cards) + " 点。");
        announce("轮到第 " + (i + 1) + " 手。");
        return;
      }
    }
    dealerTurn();
  }

  function dealerTurn() {
    if (phase !== "player") return;
    phase = "dealer";
    dealerHoleHidden = false;
    render();
    setMessage("庄家翻开暗牌，正在补牌……");
    announce("庄家回合。");
    tone(420, 0.05, "sine", 0.02, 380);
    dealerTimer = window.setTimeout(dealerStep, dealerDelay);
  }

  function dealerStep() {
    const total = handTotal(dealer);
    if (total < 17) {
      dealer.push(draw());
      tone(400, 0.04, "sine", 0.02, 500);
      render();
      dealerTimer = window.setTimeout(dealerStep, dealerDelay);
      return;
    }
    settle();
  }

  function settle() {
    window.clearTimeout(dealerTimer);
    dealerTimer = 0;
    phase = "settled";
    dealerHoleHidden = false;

    const dealerTotal = handTotal(dealer);
    const dealerNatural = Casino.isNaturalBlackjack(dealer);
    let payout = 0;
    let wins = 0;
    let losses = 0;
    let pushes = 0;
    let naturals = 0;

    for (const hand of hands) {
      const total = handTotal(hand.cards);
      const natural = isNatural(hand);
      if (total > 21) {
        hand.result = { kind: "loss", text: "爆牌，损失 " + Casino.formatChips(hand.bet) + " 筹码" };
        losses += 1;
      } else if (natural && !dealerNatural) {
        const amount = Math.floor(hand.bet * 2.5);
        payout += amount;
        hand.result = { kind: "win", text: "黑杰克 3:2，赢得 " + Casino.formatChips(amount - hand.bet) + " 筹码" };
        wins += 1;
        naturals += 1;
      } else if (dealerNatural && !natural) {
        hand.result = { kind: "loss", text: "庄家黑杰克，损失 " + Casino.formatChips(hand.bet) + " 筹码" };
        losses += 1;
      } else if (dealerNatural && natural) {
        payout += hand.bet;
        hand.result = { kind: "push", text: "双方黑杰克，退回 " + Casino.formatChips(hand.bet) + " 筹码" };
        pushes += 1;
      } else if (dealerTotal > 21) {
        payout += hand.bet * 2;
        hand.result = { kind: "win", text: "庄家爆牌，赢得 " + Casino.formatChips(hand.bet) + " 筹码" };
        wins += 1;
      } else if (total > dealerTotal) {
        payout += hand.bet * 2;
        hand.result = { kind: "win", text: "点数更大，赢得 " + Casino.formatChips(hand.bet) + " 筹码" };
        wins += 1;
      } else if (total === dealerTotal) {
        payout += hand.bet;
        hand.result = { kind: "push", text: "平局，退回 " + Casino.formatChips(hand.bet) + " 筹码" };
        pushes += 1;
      } else {
        hand.result = { kind: "loss", text: "点数较小，损失 " + Casino.formatChips(hand.bet) + " 筹码" };
        losses += 1;
      }
    }

    bankroll += payout;
    stats.wins += wins;
    stats.losses += losses;
    stats.pushes += pushes;
    stats.blackjacks += naturals;
    stats.rounds += 1;
    save();
    render();

    const totalStake = hands.reduce((sum, hand) => sum + hand.bet, 0);
    const net = payout - totalStake;
    let summary = "本局结束。庄家 " + dealerTotal + " 点，你 " +
      hands.map((hand) => handTotal(hand.cards)).join(" / ") + " 点。";
    if (net > 0) summary += "净赢 " + Casino.formatChips(net) + " 虚拟筹码。";
    else if (net < 0) summary += "净输 " + Casino.formatChips(-net) + " 虚拟筹码。";
    else summary += "本局打平。";
    setMessage(summary);
    announce(summary);

    if (net > 0) {
      tone(660, 0.1, "square", 0.04);
      window.setTimeout(() => tone(880, 0.16, "square", 0.04), 110);
    } else if (net < 0) {
      tone(260, 0.18, "sawtooth", 0.032, 150);
    } else {
      tone(480, 0.08, "sine", 0.025);
    }

    if (bankroll < MIN_BET) {
      setMessage(summary + " 虚拟筹码已不足，点击“重置筹码”继续娱乐。");
    }
    window.Arcade.focusWithoutScroll(dealBtn);
  }

  function resetBankroll() {
    window.clearTimeout(dealerTimer);
    bankroll = Casino.startingChips;
    dealer = [];
    hands = [];
    active = 0;
    phase = "betting";
    dealerHoleHidden = false;
    save();
    render();
    setMessage("虚拟筹码已重置为 " + Casino.formatChips(bankroll) + "。本页不涉及任何真实货币。");
    announce("虚拟筹码已重置。");
    tone(620, 0.08, "sine", 0.03, 820);
    window.Arcade.focusWithoutScroll(dealBtn);
  }

  function chooseBet(value) {
    if (phase === "player" || phase === "dealer") return;
    const next = Number(value);
    if (!Number.isFinite(next) || next <= 0) return;
    bet = next;
    if (phase === "settled") {
      dealer = [];
      hands = [];
      active = 0;
      phase = "betting";
      dealerHoleHidden = false;
    }
    if (bankroll < bet) {
      setMessage("当前余额不足以下注 " + Casino.formatChips(bet) + "，请选择更小的注额。");
    } else {
      setMessage("已选择 " + Casino.formatChips(bet) + " 虚拟筹码，点击“发牌”开始。");
    }
    render();
  }

  for (const button of chipButtons) {
    button.addEventListener("click", () => chooseBet(button.dataset.bet));
  }

  dealBtn.addEventListener("click", startRound);
  hitBtn.addEventListener("click", hit);
  standBtn.addEventListener("click", stand);
  doubleBtn.addEventListener("click", doubleDown);
  splitBtn.addEventListener("click", split);
  resetBtn.addEventListener("click", resetBankroll);
  Arcade.bindSound(soundBtn, soundLabel);

  document.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const key = event.key.toLowerCase();
    if (key === "h") hit();
    else if (key === "s") stand();
    else if (key === "d") doubleDown();
    else if (key === "p") split();
  });

  render();
  setMessage("选择筹码并点击“发牌”。所有筹码均为虚拟数字，不能兑换现金或实物。");

  if (Arcade.debug) {
    window.__blackjackDebug = {
      snapshot() {
        return {
          phase,
          bankroll,
          bet,
          dealer: dealer.slice(),
          dealerTotal: dealer.length ? handTotal(dealer) : null,
          dealerHoleHidden,
          active,
          hands: hands.map((hand) => ({
            cards: hand.cards.slice(),
            total: handTotal(hand.cards),
            bet: hand.bet,
            done: hand.done,
            split: hand.split,
            doubled: hand.doubled,
            result: hand.result
          })),
          stats: { ...stats },
          shoeCount: shoe.length
        };
      },
      setBankroll(value) {
        bankroll = Math.max(0, Number(value) || 0);
        save();
        render();
      },
      setBet: chooseBet,
      startRound,
      hit,
      stand,
      double: doubleDown,
      split,
      settle,
      setShoe(cards) {
        shoe = Array.isArray(cards) ? cards.slice().reverse() : [];
        forcedShoe = true;
      },
      setDealerDelay(ms) {
        dealerDelay = Math.max(0, Number(ms) || 0);
      },
      resetBankroll
    };
  }
})();
