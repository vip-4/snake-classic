// Wordle 中文猜词 — 原生 JS 实现
(function () {
  'use strict';

  const WORD_LENGTH = 5;
  const MAX_GUESSES = 6;

  // 常用五字母中文词汇（拼音/英文单词，便于输入）
  const WORD_LIST = [
    'apple', 'grape', 'lemon', 'mango', 'peach', 'berry', 'melon', 'olive',
    'cherry', 'plum', 'kiwi', 'fig', 'date', 'pear', 'lime', 'coconut',
    'bread', 'toast', 'cream', 'sugar', 'honey', 'spice', 'herb', 'salt',
    'pepper', 'garlic', 'onion', 'ginger', 'basil', 'thyme', 'mint', 'sage',
    'cloud', 'storm', 'rain', 'snow', 'wind', 'frost', 'ice', 'hail',
    'sun', 'moon', 'star', 'sky', 'space', 'earth', 'mars', 'venus',
    'river', 'lake', 'ocean', 'sea', 'wave', 'tide', 'beach', 'shore',
    'mountain', 'hill', 'valley', 'plain', 'desert', 'forest', 'jungle', 'woods',
    'tiger', 'lion', 'bear', 'wolf', 'fox', 'deer', 'rabbit', 'mouse',
    'eagle', 'hawk', 'owl', 'dove', 'swan', 'duck', 'goose', 'crow',
    'fish', 'whale', 'shark', 'dolphin', 'seal', 'crab', 'shrimp', 'squid',
    'snake', 'lizard', 'frog', 'toad', 'turtle', 'gecko', 'iguana',
    'flower', 'rose', 'lily', 'tulip', 'daisy', 'orchid', 'violet', 'iris',
    'tree', 'oak', 'pine', 'maple', 'birch', 'cedar', 'willow', 'elm',
    'book', 'page', 'pen', 'pencil', 'paper', 'ink', 'stamp', 'letter',
    'music', 'song', 'note', 'chord', 'tune', 'melody', 'rhythm', 'beat',
    'dance', 'jump', 'run', 'walk', 'fly', 'swim', 'climb', 'crawl',
    'happy', 'sad', 'angry', 'calm', 'brave', 'kind', 'smart', 'funny',
    'red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'black',
    'white', 'gray', 'brown', 'gold', 'silver', 'bronze', 'copper',
    'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
    'nine', 'ten', 'eleven', 'twelve', 'thirteen',
    'cat', 'dog', 'bird', 'fish', 'horse', 'cow', 'pig', 'sheep',
    'goat', 'chicken', 'duck', 'goose', 'turkey', 'rabbit', 'hamster',
    'house', 'home', 'room', 'door', 'window', 'wall', 'floor', 'roof',
    'table', 'chair', 'bed', 'sofa', 'desk', 'shelf', 'cabinet', 'drawer',
    'car', 'bus', 'train', 'plane', 'ship', 'boat', 'bike', 'truck',
    'road', 'street', 'path', 'bridge', 'tunnel', 'highway', 'avenue',
    'city', 'town', 'village', 'country', 'state', 'province', 'region',
    'school', 'class', 'teacher', 'student', 'lesson', 'homework', 'exam',
    'work', 'job', 'office', 'boss', 'staff', 'team', 'project', 'task',
    'time', 'day', 'week', 'month', 'year', 'hour', 'minute', 'second',
    'morning', 'noon', 'afternoon', 'evening', 'night', 'midnight',
    'spring', 'summer', 'autumn', 'winter', 'season', 'weather', 'climate',
    'food', 'meal', 'breakfast', 'lunch', 'dinner', 'snack', 'dessert',
    'rice', 'noodle', 'pasta', 'bread', 'cake', 'pie', 'soup', 'salad',
    'meat', 'beef', 'pork', 'chicken', 'fish', 'egg', 'cheese', 'milk',
    'fruit', 'apple', 'banana', 'orange', 'grape', 'strawberry', 'blueberry',
    'vegetable', 'carrot', 'potato', 'tomato', 'onion', 'garlic', 'pepper',
    'drink', 'water', 'tea', 'coffee', 'juice', 'milk', 'soda', 'wine',
    'health', 'doctor', 'nurse', 'hospital', 'medicine', 'pill', 'vitamin',
    'sport', 'game', 'play', 'win', 'lose', 'score', 'team', 'player',
    'soccer', 'basketball', 'tennis', 'golf', 'swimming', 'running', 'cycling',
    'art', 'paint', 'draw', 'sketch', 'color', 'canvas', 'brush', 'palette',
    'movie', 'film', 'actor', 'director', 'scene', 'script', 'camera', 'stage',
    'photo', 'picture', 'image', 'photo', 'camera', 'lens', 'flash', 'zoom',
    'phone', 'mobile', 'tablet', 'laptop', 'computer', 'screen', 'keyboard',
    'internet', 'web', 'site', 'page', 'link', 'click', 'scroll', 'type',
    'email', 'mail', 'message', 'chat', 'call', 'video', 'audio', 'voice',
    'social', 'friend', 'family', 'parent', 'child', 'brother', 'sister',
    'love', 'like', 'hate', 'feel', 'think', 'know', 'learn', 'teach',
    'read', 'write', 'speak', 'listen', 'watch', 'look', 'see', 'hear',
    'buy', 'sell', 'pay', 'cost', 'price', 'money', 'cash', 'card',
    'shop', 'store', 'market', 'mall', 'buy', 'sell', 'trade', 'deal',
    'travel', 'trip', 'tour', 'visit', 'journey', 'flight', 'hotel', 'ticket',
    'nature', 'plant', 'animal', 'bird', 'insect', 'bug', 'bee', 'ant',
    'science', 'math', 'physics', 'chemistry', 'biology', 'history', 'geography',
    'number', 'letter', 'word', 'sentence', 'paragraph', 'chapter', 'book',
    'color', 'shape', 'size', 'weight', 'height', 'width', 'length', 'depth',
    'fast', 'slow', 'big', 'small', 'tall', 'short', 'long', 'wide',
    'hot', 'cold', 'warm', 'cool', 'wet', 'dry', 'clean', 'dirty',
    'new', 'old', 'young', 'fresh', 'modern', 'ancient', 'recent', 'latest',
    'good', 'bad', 'best', 'worst', 'better', 'worse', 'great', 'terrible',
    'first', 'last', 'next', 'previous', 'early', 'late', 'soon', 'now',
    'here', 'there', 'where', 'when', 'why', 'how', 'what', 'who',
    'yes', 'no', 'maybe', 'sure', 'okay', 'fine', 'great', 'nice',
    'please', 'thanks', 'sorry', 'excuse', 'welcome', 'hello', 'goodbye',
    'name', 'age', 'gender', 'address', 'phone', 'email', 'password', 'user',
    'account', 'profile', 'settings', 'privacy', 'security', 'login', 'logout',
    'search', 'find', 'filter', 'sort', 'group', 'list', 'grid', 'table',
    'image', 'photo', 'video', 'audio', 'text', 'file', 'folder', 'document',
    'save', 'load', 'open', 'close', 'edit', 'delete', 'create', 'update',
    'start', 'stop', 'pause', 'resume', 'reset', 'restart', 'quit', 'exit',
    'help', 'info', 'about', 'contact', 'support', 'feedback', 'report', 'bug',
    'share', 'copy', 'paste', 'cut', 'undo', 'redo', 'select', 'deselect',
    'zoom', 'pan', 'rotate', 'flip', 'crop', 'resize', 'move', 'drag',
    'click', 'tap', 'swipe', 'pinch', 'scroll', 'hover', 'focus', 'blur',
    'keyboard', 'mouse', 'touch', 'screen', 'display', 'monitor', 'cursor',
    'button', 'link', 'menu', 'nav', 'tab', 'panel', 'dialog', 'modal',
    'header', 'footer', 'sidebar', 'main', 'content', 'section', 'article',
    'title', 'heading', 'paragraph', 'text', 'label', 'caption', 'tooltip',
    'color', 'font', 'size', 'weight', 'style', 'theme', 'dark', 'light',
    'border', 'shadow', 'radius', 'padding', 'margin', 'gap', 'space',
    'flex', 'grid', 'block', 'inline', 'hidden', 'visible', 'show', 'hide',
    'animation', 'transition', 'transform', 'opacity', 'scale', 'rotate',
    'top', 'bottom', 'left', 'right', 'center', 'middle', 'start', 'end',
    'auto', 'none', 'all', 'some', 'any', 'every', 'each', 'both',
    'true', 'false', 'null', 'undefined', 'void', 'empty', 'full', 'half',
    'first', 'last', 'next', 'prev', 'current', 'active', 'inactive', 'disabled',
    'loading', 'loaded', 'error', 'success', 'warning', 'info', 'debug', 'trace',
    'online', 'offline', 'connected', 'disconnected', 'syncing', 'synced',
    'public', 'private', 'protected', 'static', 'dynamic', 'async', 'sync',
    'get', 'set', 'add', 'remove', 'update', 'delete', 'create', 'read',
    'open', 'close', 'lock', 'unlock', 'enable', 'disable', 'show', 'hide',
    'start', 'stop', 'play', 'pause', 'resume', 'reset', 'restart', 'quit',
    'win', 'lose', 'draw', 'tie', 'score', 'point', 'level', 'stage',
    'life', 'health', 'energy', 'mana', 'stamina', 'power', 'force', 'speed',
    'attack', 'defense', 'shield', 'weapon', 'armor', 'helmet', 'sword', 'bow',
    'magic', 'spell', 'potion', 'elixir', 'scroll', 'rune', 'gem', 'crystal',
    'gold', 'silver', 'coin', 'token', 'chip', 'cash', 'money', 'wealth',
    'quest', 'mission', 'task', 'goal', 'objective', 'target', 'reward', 'prize',
    'enemy', 'monster', 'boss', 'creature', 'beast', 'dragon', 'goblin', 'orc',
    'hero', 'player', 'character', 'avatar', 'knight', 'wizard', 'archer', 'rogue',
    'map', 'world', 'level', 'stage', 'zone', 'area', 'region', 'territory',
    'dungeon', 'castle', 'tower', 'fortress', 'cave', 'mine', 'ruin', 'temple',
    'forest', 'desert', 'ocean', 'mountain', 'valley', 'plain', 'swamp', 'tundra',
    'fire', 'water', 'earth', 'air', 'light', 'dark', 'ice', 'thunder',
    'sword', 'shield', 'bow', 'arrow', 'staff', 'wand', 'axe', 'hammer',
    'potion', 'scroll', 'ring', 'amulet', 'necklace', 'bracelet', 'crown', 'cape',
    'key', 'lock', 'door', 'chest', 'box', 'crate', 'barrel', 'bag',
    'food', 'drink', 'bread', 'meat', 'fruit', 'vegetable', 'herb', 'spice',
    'wood', 'stone', 'metal', 'iron', 'steel', 'gold', 'silver', 'bronze',
    'cloth', 'leather', 'silk', 'wool', 'cotton', 'linen', 'fur', 'hide',
  ];

  // 每日单词：基于日期的确定性选择
  function getDailyWord() {
    const now = new Date();
    const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
    const idx = seed % WORD_LIST.length;
    return WORD_LIST[idx].toUpperCase();
  }

  // 随机单词
  function getRandomWord() {
    return WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)].toUpperCase();
  }

  // 状态
  let targetWord = '';
  let currentGuess = '';
  let guesses = [];
  let gameOver = false;
  let stats = loadStats();

  // DOM
  const gridEl = document.getElementById('wordle-grid');
  const keyboardEl = document.getElementById('wordle-keyboard');
  const guessCountEl = document.getElementById('guess-count');
  const streakEl = document.getElementById('streak');
  const winRateEl = document.getElementById('win-rate');
  const liveEl = document.getElementById('live');

  // 初始化网格
  function initGrid() {
    gridEl.innerHTML = '';
    for (let r = 0; r < MAX_GUESSES; r++) {
      const row = document.createElement('div');
      row.className = 'wordle-row';
      row.setAttribute('role', 'row');
      for (let c = 0; c < WORD_LENGTH; c++) {
        const cell = document.createElement('div');
        cell.className = 'wordle-cell';
        cell.setAttribute('role', 'gridcell');
        cell.setAttribute('aria-label', `第 ${r + 1} 行第 ${c + 1} 列`);
        row.appendChild(cell);
      }
      gridEl.appendChild(row);
    }
  }

  // 初始化键盘
  const KEYBOARD_ROWS = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Enter', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Backspace'],
  ];

  function initKeyboard() {
    keyboardEl.innerHTML = '';
    for (const row of KEYBOARD_ROWS) {
      const rowEl = document.createElement('div');
      rowEl.className = 'wordle-keyboard-row';
      for (const key of row) {
        const btn = document.createElement('button');
        btn.className = 'wordle-key';
        if (key === 'Enter') {
          btn.textContent = '回车';
          btn.classList.add('wordle-key--wide');
        } else if (key === 'Backspace') {
          btn.textContent = '⌫';
          btn.classList.add('wordle-key--wide');
        } else {
          btn.textContent = key;
        }
        btn.dataset.key = key;
        btn.setAttribute('aria-label', key === 'Enter' ? '提交' : key === 'Backspace' ? '删除' : key);
        btn.addEventListener('click', () => handleKey(key));
        rowEl.appendChild(btn);
      }
      keyboardEl.appendChild(rowEl);
    }
  }

  // 处理按键
  function handleKey(key) {
    if (gameOver) return;
    if (key === 'Enter') {
      submitGuess();
    } else if (key === 'Backspace') {
      currentGuess = currentGuess.slice(0, -1);
      updateGrid();
    } else if (/^[A-Z]$/.test(key) && currentGuess.length < WORD_LENGTH) {
      currentGuess += key;
      updateGrid();
    }
  }

  // 更新网格显示
  function updateGrid() {
    const rowIndex = guesses.length;
    const row = gridEl.children[rowIndex];
    if (!row) return;
    for (let c = 0; c < WORD_LENGTH; c++) {
      const cell = row.children[c];
      const letter = currentGuess[c] || '';
      cell.textContent = letter;
      cell.classList.toggle('wordle-cell--filled', !!letter);
    }
  }

  // 提交猜测
  function submitGuess() {
    if (currentGuess.length !== WORD_LENGTH) {
      shakeRow(guesses.length);
      announce('请输入 5 个字母');
      return;
    }
    if (!WORD_LIST.includes(currentGuess.toLowerCase())) {
      shakeRow(guesses.length);
      announce('不是有效单词');
      return;
    }

    const result = evaluateGuess(currentGuess, targetWord);
    guesses.push({ word: currentGuess, result });

    // 更新网格颜色
    const rowIndex = guesses.length - 1;
    const row = gridEl.children[rowIndex];
    for (let c = 0; c < WORD_LENGTH; c++) {
      const cell = row.children[c];
      cell.classList.add('wordle-cell--' + result[c]);
    }

    // 更新键盘颜色
    updateKeyboardColors(currentGuess, result);

    // 检查胜利/失败
    if (currentGuess === targetWord) {
      gameOver = true;
      stats.games++;
      stats.wins++;
      stats.streak++;
      stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
      stats.guessDistribution[guesses.length - 1]++;
      saveStats();
      updateStats();
      announce('恭喜！猜中了！');
      setTimeout(() => {
        showResult(true);
      }, 500);
    } else if (guesses.length >= MAX_GUESSES) {
      gameOver = true;
      stats.games++;
      stats.streak = 0;
      saveStats();
      updateStats();
      announce('游戏结束，答案是 ' + targetWord);
      setTimeout(() => {
        showResult(false);
      }, 500);
    } else {
      currentGuess = '';
      announce(`第 ${guesses.length} 次猜测`);
    }
  }

  // 评估猜测
  function evaluateGuess(guess, target) {
    const result = new Array(WORD_LENGTH).fill('absent');
    const targetChars = target.split('');
    const guessChars = guess.split('');

    // 第一轮：标记 correct
    for (let i = 0; i < WORD_LENGTH; i++) {
      if (guessChars[i] === targetChars[i]) {
        result[i] = 'correct';
        targetChars[i] = null; // consumed
      }
    }

    // 第二轮：标记 present
    for (let i = 0; i < WORD_LENGTH; i++) {
      if (result[i] === 'correct') continue;
      const idx = targetChars.indexOf(guessChars[i]);
      if (idx !== -1) {
        result[i] = 'present';
        targetChars[idx] = null; // consumed
      }
    }

    return result;
  }

  // 更新键盘颜色
  function updateKeyboardColors(guess, result) {
    const keys = keyboardEl.querySelectorAll('.wordle-key');
    for (let i = 0; i < WORD_LENGTH; i++) {
      const letter = guess[i];
      const color = result[i];
      for (const key of keys) {
        if (key.dataset.key === letter) {
          // 优先级：correct > present > absent
          const current = key.dataset.color || '';
          if (current === 'correct') continue;
          if (color === 'correct' || (color === 'present' && current !== 'correct')) {
            key.dataset.color = color;
            key.classList.remove('wordle-key--correct', 'wordle-key--present', 'wordle-key--absent');
            key.classList.add('wordle-key--' + color);
          } else if (color === 'absent' && !current) {
            key.dataset.color = 'absent';
            key.classList.add('wordle-key--absent');
          }
        }
      }
    }
  }

  // 抖动行
  function shakeRow(rowIndex) {
    const row = gridEl.children[rowIndex];
    if (!row) return;
    row.classList.add('wordle-row--shake');
    setTimeout(() => row.classList.remove('wordle-row--shake'), 600);
  }

  // 显示结果
  function showResult(won) {
    const overlay = document.createElement('div');
    overlay.className = 'wordle-result';
    overlay.innerHTML = `
      <div class="wordle-result-card">
        <h2>${won ? '🎉 恭喜猜中！' : '😢 游戏结束'}</h2>
        <p>答案：<strong>${targetWord}</strong></p>
        <p>猜测次数：${guesses.length}/6</p>
        <div class="wordle-stats">
          <div><span>总局数</span><strong>${stats.games}</strong></div>
          <div><span>胜率</span><strong>${stats.games ? Math.round(stats.wins / stats.games * 100) : 0}%</strong></div>
          <div><span>连胜</span><strong>${stats.streak}</strong></div>
          <div><span>最高连胜</span><strong>${stats.maxStreak}</strong></div>
        </div>
        <div class="wordle-dist">
          ${stats.guessDistribution.map((n, i) => `<div><span>${i + 1}</span><div class="wordle-dist-bar" style="width:${Math.max(4, n / Math.max(1, Math.max(...stats.guessDistribution)) * 100)}%"></div><span>${n}</span></div>`).join('')}
        </div>
        <div class="cta-row">
          <button class="btn btn-primary" id="result-new">新游戏</button>
          <button class="btn btn-ghost" id="result-share">分享成绩</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('result-new').addEventListener('click', () => {
      overlay.remove();
      newGame();
    });
    document.getElementById('result-share').addEventListener('click', () => {
      shareResult(won);
    });
  }

  // 分享成绩
  function shareResult(won) {
    const emoji = guesses.map(g => g.result.map(r => {
      if (r === 'correct') return '🟩';
      if (r === 'present') return '🟨';
      return '⬛';
    }).join('')).join('\n');
    const text = `Wordle ${won ? guesses.length : 'X'}/6\n\n${emoji}\n\nhttps://snake-classic-casino.netlify.app/games/wordle/`;
    if (navigator.share) {
      navigator.share({ title: 'Wordle 成绩', text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => {
        announce('成绩已复制到剪贴板');
      }).catch(() => {});
    }
  }

  // 新游戏
  function newGame() {
    targetWord = getRandomWord();
    currentGuess = '';
    guesses = [];
    gameOver = false;
    initGrid();
    initKeyboard();
    updateStats();
    announce('新游戏开始');
  }

  // 每日游戏
  function dailyGame() {
    targetWord = getDailyWord();
    currentGuess = '';
    guesses = [];
    gameOver = false;
    initGrid();
    initKeyboard();
    updateStats();
    announce('每日挑战开始');
  }

  // 统计
  function loadStats() {
    try {
      const raw = localStorage.getItem('wordle-stats');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { games: 0, wins: 0, streak: 0, maxStreak: 0, guessDistribution: [0, 0, 0, 0, 0, 0] };
  }

  function saveStats() {
    try {
      localStorage.setItem('wordle-stats', JSON.stringify(stats));
    } catch (e) {}
  }

  function updateStats() {
    guessCountEl.textContent = `${guesses.length}/${MAX_GUESSES}`;
    streakEl.textContent = stats.streak;
    winRateEl.textContent = stats.games ? Math.round(stats.wins / stats.games * 100) + '%' : '0%';
  }

  // 公告
  function announce(msg) {
    if (liveEl) {
      liveEl.textContent = msg;
    }
  }

  // 键盘事件
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const key = e.key;
    if (key === 'Enter') {
      e.preventDefault();
      handleKey('Enter');
    } else if (key === 'Backspace') {
      e.preventDefault();
      handleKey('Backspace');
    } else if (/^[a-zA-Z]$/.test(key)) {
      e.preventDefault();
      handleKey(key.toUpperCase());
    }
  });

  // 按钮事件
  document.getElementById('new-game').addEventListener('click', newGame);
  document.getElementById('share').addEventListener('click', () => {
    if (guesses.length > 0) shareResult(gameOver && currentGuess === targetWord);
  });

  // 初始化
  initGrid();
  initKeyboard();
  dailyGame();
})();
