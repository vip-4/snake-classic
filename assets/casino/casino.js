/* Casino demo shared helpers: cards, chips, region-aware responsible-play
   notices and a Jacks or Better hand evaluator. No real-money mechanics. */
(() => {
  "use strict";

  const Casino = (window.Casino = window.Casino || {});
  Casino.startingChips = 1000;

  const SUITS = [
    { symbol: "♠", name: "黑桃", red: false },
    { symbol: "♥", name: "红桃", red: true },
    { symbol: "♦", name: "方块", red: true },
    { symbol: "♣", name: "梅花", red: false }
  ];
  const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const RANK_VALUE = {
    A: 14,
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
    "9": 9,
    "10": 10,
    J: 11,
    Q: 12,
    K: 13
  };

  Casino.suits = SUITS;
  Casino.ranks = RANKS;

  Casino.formatChips = function formatChips(value) {
    const number = Math.round(Number(value) || 0);
    return new Intl.NumberFormat("zh-CN").format(number);
  };

  Casino.randomInt = function randomInt(max) {
    const limit = Math.floor(Number(max));
    if (!Number.isFinite(limit) || limit <= 0) return 0;
    if (window.crypto && typeof window.crypto.getRandomValues === "function") {
      const buffer = new Uint32Array(1);
      const ceiling = Math.floor(0xffffffff / limit) * limit;
      do {
        window.crypto.getRandomValues(buffer);
      } while (buffer[0] >= ceiling);
      return buffer[0] % limit;
    }
    return Math.floor(Math.random() * limit);
  };

  Casino.shuffle = function shuffle(items) {
    const list = items.slice();
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Casino.randomInt(i + 1);
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  };

  Casino.makeDeck = function makeDeck() {
    const deck = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ rank, suit: suit.symbol, suitName: suit.name, red: suit.red });
      }
    }
    return deck;
  };

  Casino.rankValue = function rankValue(rank) {
    return RANK_VALUE[rank] || 0;
  };

  Casino.cardText = function cardText(card) {
    return card.rank + card.suit;
  };

  Casino.cardLabel = function cardLabel(card) {
    return card.suitName + card.rank;
  };

  Casino.cardHTML = function cardHTML(card, options = {}) {
    if (!card || options.hidden) {
      return '<span class="playing-card is-back" aria-hidden="true"><span class="playing-card__back-mark">?</span></span>';
    }
    const red = card.red ? " is-red" : "";
    return (
      '<span class="playing-card' + red + '">' +
      '<span class="playing-card__corner">' +
      '<span class="playing-card__rank">' + card.rank + "</span>" +
      '<span class="playing-card__suit">' + card.suit + "</span>" +
      "</span>" +
      '<span class="playing-card__pip" aria-hidden="true">' + card.suit + "</span>" +
      '<span class="playing-card__corner playing-card__corner--bottom" aria-hidden="true">' +
      '<span class="playing-card__rank">' + card.rank + "</span>" +
      '<span class="playing-card__suit">' + card.suit + "</span>" +
      "</span>" +
      "</span>"
    );
  };

  /* Blackjack scoring: aces count as 11 until that would bust the hand. */
  Casino.handValue = function handValue(cards) {
    let total = 0;
    let aces = 0;
    for (const card of cards) {
      if (card.rank === "A") {
        aces += 1;
        total += 11;
      } else {
        total += Math.min(10, Casino.rankValue(card.rank));
      }
    }
    let softAces = aces;
    while (total > 21 && softAces > 0) {
      total -= 10;
      softAces -= 1;
    }
    return { total, soft: softAces > 0, aces: softAces };
  };

  Casino.isNaturalBlackjack = function isNaturalBlackjack(cards) {
    return cards.length === 2 && Casino.handValue(cards).total === 21;
  };

  /* Jacks or Better, 9/6 paytable. Payouts are per credit; the video-poker
     game applies the 800-credit royal bonus at the five-credit max bet. */
  const PAYTABLE = {
    royal: { name: "皇家同花顺", en: "Royal Flush", payout: 250 },
    straightFlush: { name: "同花顺", en: "Straight Flush", payout: 50 },
    four: { name: "四条", en: "Four of a Kind", payout: 25 },
    fullHouse: { name: "葫芦", en: "Full House", payout: 9 },
    flush: { name: "同花", en: "Flush", payout: 6 },
    straight: { name: "顺子", en: "Straight", payout: 4 },
    three: { name: "三条", en: "Three of a Kind", payout: 3 },
    twoPair: { name: "两对", en: "Two Pair", payout: 2 },
    jacks: { name: "J 或更好", en: "Jacks or Better", payout: 1 },
    none: { name: "无对子", en: "No Win", payout: 0 }
  };

  Casino.paytable = PAYTABLE;

  Casino.evaluatePokerHand = function evaluatePokerHand(cards) {
    if (!Array.isArray(cards) || cards.length !== 5) {
      return { key: "none", name: PAYTABLE.none.name, en: PAYTABLE.none.en, payout: 0, detail: "" };
    }

    const values = cards.map((card) => Casino.rankValue(card.rank)).sort((a, b) => a - b);
    const suits = cards.map((card) => card.suit);
    const flush = suits.every((suit) => suit === suits[0]);
    const unique = Array.from(new Set(values)).sort((a, b) => a - b);
    let straight = false;
    let straightHigh = 0;
    if (unique.length === 5) {
      if (unique[4] - unique[0] === 4) {
        straight = true;
        straightHigh = unique[4];
      } else if (unique.join(",") === "2,3,4,5,14") {
        straight = true;
        straightHigh = 5;
      }
    }

    const counts = new Map();
    for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
    const groups = Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || b.value - a.value);

    let key = "none";
    if (flush && straight && straightHigh === 14) key = "royal";
    else if (flush && straight) key = "straightFlush";
    else if (groups[0].count === 4) key = "four";
    else if (groups[0].count === 3 && groups[1] && groups[1].count === 2) key = "fullHouse";
    else if (flush) key = "flush";
    else if (straight) key = "straight";
    else if (groups[0].count === 3) key = "three";
    else if (groups[0].count === 2 && groups[1] && groups[1].count === 2) key = "twoPair";
    else if (groups[0].count === 2 && groups[0].value >= 11) key = "jacks";

    const entry = PAYTABLE[key];
    return {
      key,
      name: entry.name,
      en: entry.en,
      payout: entry.payout,
      detail: key === "none" ? "" : (key === "jacks" ? "一对 J / Q / K / A" : entry.en)
    };
  };

  /* Region-aware responsible-play text. It is deliberately generic and is not
     legal advice; the browser locale is only used to choose a helpful notice. */
  const REGIONS = {
    CN: {
      label: "中国大陆",
      text: "本页只提供虚拟筹码的娱乐演示，不涉及真实货币、充值、提现或奖品兑换。赌博在中国大陆属于违法行为，请勿参与任何形式的赌博。"
    },
    HK: {
      label: "中国香港",
      text: "本页只提供虚拟筹码的娱乐演示，不涉及真实货币。如受赌博困扰，可致电平和基金辅导服务 1834 633，或向当地社会福利机构求助。"
    },
    TW: {
      label: "中国台湾",
      text: "本页只提供虚拟筹码的娱乐演示，不涉及真实货币。如受赌博困扰，可拨打卫福部安心专线 1925，或联系当地心理卫生服务。"
    },
    SG: {
      label: "新加坡",
      text: "本页只提供虚拟筹码的娱乐演示，不涉及真实货币。如受赌博困扰，可致电全国预防嗜赌理事会 1800-6-668-668。"
    },
    MY: {
      label: "马来西亚",
      text: "本页只提供虚拟筹码的娱乐演示，不涉及真实货币。如受赌博困扰，可联系 Befrienders KL：03-7627 2929。"
    },
    US: {
      label: "美国",
      text: "本页只提供虚拟筹码的娱乐演示，不涉及真实货币。如受赌博困扰，可致电 1-800-GAMBLER（1-800-426-2537）。"
    },
    CA: {
      label: "加拿大",
      text: "本页只提供虚拟筹码的娱乐演示，不涉及真实货币。如受赌博困扰，请联系所在省份的问题赌博援助热线或家庭医生。"
    },
    GB: {
      label: "英国",
      text: "本页只提供虚拟筹码的娱乐演示，不涉及真实货币。如受赌博困扰，可致电 GamCare 0808 8020 133。"
    },
    AU: {
      label: "澳大利亚",
      text: "本页只提供虚拟筹码的娱乐演示，不涉及真实货币。如受赌博困扰，可致电 Gambling Help Online 1800 858 858。"
    },
    NZ: {
      label: "新西兰",
      text: "本页只提供虚拟筹码的娱乐演示，不涉及真实货币。如受赌博困扰，可致电 Gambling Helpline 0800 654 655。"
    },
    DEFAULT: {
      label: "全球",
      text: "本页只提供虚拟筹码的娱乐演示，不涉及真实货币、充值、提现或奖品兑换。各地法律不同，请遵守所在地法律与年龄限制；如受赌博困扰，请联系当地心理援助或戒赌支持服务。"
    }
  };

  function detectRegion() {
    const timeZone = (() => {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      } catch {
        return "";
      }
    })();
    const zoneMap = {
      "Asia/Shanghai": "CN",
      "Asia/Chongqing": "CN",
      "Asia/Harbin": "CN",
      "Asia/Urumqi": "CN",
      "Asia/Hong_Kong": "HK",
      "Asia/Macau": "HK",
      "Asia/Taipei": "TW",
      "Asia/Singapore": "SG",
      "Asia/Kuala_Lumpur": "MY",
      "Europe/London": "GB",
      "Australia/Sydney": "AU",
      "Australia/Melbourne": "AU",
      "Australia/Brisbane": "AU",
      "Australia/Perth": "AU",
      "Pacific/Auckland": "NZ"
    };
    if (zoneMap[timeZone]) return zoneMap[timeZone];
    if (timeZone.startsWith("America/")) {
      const language = (navigator.language || "").toLowerCase();
      return language.includes("ca") ? "CA" : "US";
    }
    const language = (navigator.language || "").toLowerCase();
    if (language.includes("-cn") || language === "zh") return "CN";
    if (language.includes("-hk") || language.includes("-mo")) return "HK";
    if (language.includes("-tw")) return "TW";
    if (language.includes("-sg")) return "SG";
    if (language.includes("-my")) return "MY";
    if (language.includes("-gb") || language === "en-gb") return "GB";
    if (language.includes("-au")) return "AU";
    if (language.includes("-nz")) return "NZ";
    if (language.includes("-ca")) return "CA";
    if (language.includes("-us")) return "US";
    return "DEFAULT";
  }

  Casino.detectRegion = detectRegion;
  Casino.regionNotes = REGIONS;

  Casino.bindRegionNote = function bindRegionNote() {
    const boxes = document.querySelectorAll("[data-region-note]");
    if (!boxes.length) return;
    const key = detectRegion();
    const region = REGIONS[key] || REGIONS.DEFAULT;
    for (const box of boxes) {
      box.dataset.region = key;
      const label = box.querySelector("[data-region-label]");
      const message = box.querySelector("[data-region-message]");
      if (label) label.textContent = region.label;
      if (message) message.textContent = region.text;
    }
  };

  function init() {
    Casino.bindRegionNote();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
