// Hangman 猜词 — 原生 JS 实现
(function () {
  'use strict';

  // 词库
  const WORDS = {
    animals: ['TIGER', 'EAGLE', 'WHALE', 'PANDA', 'KOALA', 'ZEBRA', 'CAMEL', 'HORSE', 'SNAKE', 'SHARK', 'DOLPHIN', 'PENGUIN', 'GIRAFFE', 'ELEPHANT', 'KANGAROO', 'CROCODILE', 'BUTTERFLY', 'HUMMINGBIRD'],
    fruits: ['APPLE', 'BANANA', 'ORANGE', 'GRAPE', 'MANGO', 'PEACH', 'CHERRY', 'LEMON', 'MELON', 'BERRY', 'KIWI', 'FIG', 'DATE', 'PEAR', 'LIME', 'COCONUT', 'PINEAPPLE', 'STRAWBERRY', 'BLUEBERRY', 'WATERMELON'],
    countries: ['CHINA', 'JAPAN', 'INDIA', 'FRANCE', 'BRAZIL', 'CANADA', 'MEXICO', 'EGYPT', 'ITALY', 'SPAIN', 'GERMANY', 'RUSSIA', 'KOREA', 'THAILAND', 'VIETNAM', 'AUSTRALIA', 'ARGENTINA', 'ENGLAND', 'PORTUGAL', 'SWEDEN'],
    professions: ['DOCTOR', 'TEACHER', 'ENGINEER', 'LAWYER', 'NURSE', 'PILOT', 'CHEF', 'ARTIST', 'WRITER', 'SCIENTIST', 'FARMER', 'POLICE', 'FIREFIGHTER', 'MECHANIC', 'PLUMBER', 'CARPENTER', 'ELECTRICIAN', 'PHARMACIST', 'DENTIST', 'ARCHITECT'],
    colors: ['RED', 'BLUE', 'GREEN', 'YELLOW', 'PURPLE', 'ORANGE', 'PINK', 'BLACK', 'WHITE', 'GRAY', 'BROWN', 'GOLD', 'SILVER', 'BRONZE', 'CYAN', 'MAGENTA', 'VIOLET', 'INDIGO', 'TURQUOISE', 'MAROON'],
  };

  const CATEGORY_NAMES = { all: '全部', animals: '动物', fruits: '水果', countries: '国家', professions: '职业', colors: '颜色' };

  // 状态
  let word = '';
  let category = 'all';
  let guessed = new Set();
  let wrongGuesses = 0;
  const MAX_WRONG = 6;
  let gameOver = false;
  let streak = 0;
  let stats = { wins: 0, losses: 0, streak: 0, maxStreak: 0 };

  // DOM
  const canvas = document.getElementById('hangman-canvas');
  const ctx = canvas.getContext('2d');
  const wordEl = document.getElementById('hangman-word');
  const remainingEl = document.getElementById('remaining');
  const categoryEl = document.getElementById('category');
  const streakEl = document.getElementById('streak');
  const liveEl = document.getElementById('live');
  const keyboardEl = document.getElementById('hangman-keyboard');
  const categorySelect = document.getElementById('category-select');
  const newGameBtn = document.getElementById('new-game');

  // 加载统计
  try {
    const raw = localStorage.getItem('hangman-stats');
    if (raw) stats = JSON.parse(raw);
  } catch (e) {}

  function saveStats() {
    try { localStorage.setItem('hangman-stats', JSON.stringify(stats)); } catch (e) {}
  }

  function announce(msg) {
    if (liveEl) liveEl.textContent = msg;
  }

  // 选择单词
  function pickWord() {
    let pool = [];
    if (category === 'all') {
      for (const cat of Object.keys(WORDS)) {
        pool = pool.concat(WORDS[cat].map(w => ({ word: w, cat })));
      }
    } else {
      pool = WORDS[category].map(w => ({ word: w, cat: category }));
    }
    const pick = pool[Math.floor(Math.random() * pool.length)];
    word = pick.word;
    categoryEl.textContent = CATEGORY_NAMES[pick.cat];
    return pick;
  }

  // 新游戏
  function newGame() {
    pickWord();
    guessed = new Set();
    wrongGuesses = 0;
    gameOver = false;
    updateWordDisplay();
    updateKeyboard();
    drawHangman();
    remainingEl.textContent = MAX_WRONG;
    announce('新游戏开始');
  }

  // 更新单词显示
  function updateWordDisplay() {
    const display = word.split('').map(letter => guessed.has(letter) ? letter : '_').join(' ');
    wordEl.textContent = display;
    wordEl.setAttribute('aria-label', '单词: ' + display.replace(/ /g, ''));
  }

  // 猜字母
  function guess(letter) {
    if (gameOver) return;
    if (guessed.has(letter)) return;
    guessed.add(letter);

    if (word.includes(letter)) {
      updateWordDisplay();
      // 检查胜利
      if (word.split('').every(l => guessed.has(l))) {
        gameOver = true;
        stats.wins++;
        stats.streak++;
        stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
        saveStats();
        streakEl.textContent = stats.streak;
        announce('恭喜！猜中了！');
        showResult(true);
      }
    } else {
      wrongGuesses++;
      remainingEl.textContent = MAX_WRONG - wrongGuesses;
      drawHangman();
      if (wrongGuesses >= MAX_WRONG) {
        gameOver = true;
        stats.losses++;
        stats.streak = 0;
        saveStats();
        streakEl.textContent = 0;
        announce('游戏结束，答案是 ' + word);
        showResult(false);
      }
    }
    updateKeyboard();
  }

  // 绘制 Hangman
  function drawHangman() {
    const ctx2 = ctx;
    ctx2.clearRect(0, 0, canvas.width, canvas.height);
    ctx2.strokeStyle = '#d5e0f5';
    ctx2.lineWidth = 3;
    ctx2.lineCap = 'round';

    // 绘制支架
    ctx2.beginPath();
    ctx2.moveTo(20, 180);
    ctx2.lineTo(180, 180);
    ctx2.stroke();

    if (wrongGuesses >= 1) {
      // 竖杆
      ctx2.beginPath();
      ctx2.moveTo(60, 180);
      ctx2.lineTo(60, 20);
      ctx2.stroke();
    }
    if (wrongGuesses >= 2) {
      // 横杆
      ctx2.beginPath();
      ctx2.moveTo(60, 20);
      ctx2.lineTo(140, 20);
      ctx2.stroke();
    }
    if (wrongGuesses >= 3) {
      // 绳子
      ctx2.beginPath();
      ctx2.moveTo(140, 20);
      ctx2.lineTo(140, 40);
      ctx2.stroke();
    }
    if (wrongGuesses >= 4) {
      // 头
      ctx2.beginPath();
      ctx2.arc(140, 55, 15, 0, Math.PI * 2);
      ctx2.stroke();
    }
    if (wrongGuesses >= 5) {
      // 身体
      ctx2.beginPath();
      ctx2.moveTo(140, 70);
      ctx2.lineTo(140, 120);
      ctx2.stroke();
      // 手臂
      ctx2.beginPath();
      ctx2.moveTo(140, 85);
      ctx2.lineTo(110, 100);
      ctx2.stroke();
      ctx2.beginPath();
      ctx2.moveTo(140, 85);
      ctx2.lineTo(170, 100);
      ctx2.stroke();
    }
    if (wrongGuesses >= 6) {
      // 腿
      ctx2.beginPath();
      ctx2.moveTo(140, 120);
      ctx2.lineTo(115, 150);
      ctx2.stroke();
      ctx2.beginPath();
      ctx2.moveTo(140, 120);
      ctx2.lineTo(165, 150);
      ctx2.stroke();
    }
  }

  // 显示结果
  function showResult(won) {
    const overlay = document.createElement('div');
    overlay.className = 'hangman-result';
    overlay.innerHTML = `
      <div class="hangman-result-card">
        <h2>${won ? '🎉 恭喜猜中！' : '😢 游戏结束'}</h2>
        <p>单词：<strong>${word}</strong></p>
        <p>分类：${categoryEl.textContent}</p>
        <div class="hangman-stats">
          <div><span>胜场</span><strong>${stats.wins}</strong></div>
          <div><span>败场</span><strong>${stats.losses}</strong></div>
          <div><span>连胜</span><strong>${stats.streak}</strong></div>
          <div><span>最高连胜</span><strong>${stats.maxStreak}</strong></div>
        </div>
        <div class="cta-row">
          <button class="btn btn-primary" id="result-new">新游戏</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('result-new').addEventListener('click', () => {
      overlay.remove();
      newGame();
    });
  }

  // 更新键盘
  function updateKeyboard() {
    keyboardEl.innerHTML = '';
    const rows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
    for (const row of rows) {
      const rowEl = document.createElement('div');
      rowEl.className = 'hangman-keyboard-row';
      for (const letter of row) {
        const btn = document.createElement('button');
        btn.className = 'hangman-key';
        btn.textContent = letter;
        btn.dataset.letter = letter;
        if (guessed.has(letter)) {
          btn.disabled = true;
          if (word.includes(letter)) {
            btn.classList.add('hangman-key--correct');
          } else {
            btn.classList.add('hangman-key--wrong');
          }
        }
        btn.addEventListener('click', () => guess(letter));
        rowEl.appendChild(btn);
      }
      keyboardEl.appendChild(rowEl);
    }
  }

  // 键盘事件
  document.addEventListener('keydown', (e) => {
    if (gameOver) return;
    const key = e.key.toUpperCase();
    if (/^[A-Z]$/.test(key)) {
      e.preventDefault();
      guess(key);
    }
  });

  // 分类选择
  categorySelect.addEventListener('change', () => {
    category = categorySelect.value;
    newGame();
  });

  newGameBtn.addEventListener('click', newGame);

  // 初始化
  streakEl.textContent = stats.streak;
  newGame();
})();
