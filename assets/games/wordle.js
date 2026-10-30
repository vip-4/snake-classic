// Wordle 涓枃鐚滆瘝 鈥?鍘熺敓 JS 瀹炵幇
(function () {
  'use strict';

  const WORD_LENGTH = 5;
  const MAX_GUESSES = 6;

  // 甯哥敤浜斿瓧姣嶄腑鏂囪瘝姹囷紙鎷奸煶/鑻辨枃鍗曡瘝锛屼究浜庤緭鍏ワ級
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

  // 姣忔棩鍗曡瘝锛氬熀浜庢棩鏈熺殑纭畾鎬ч€夋嫨
  function getDailyWord() {
    const now = new Date();
    const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
    const idx = seed % WORD_LIST.length;
    return WORD_LIST[idx].toUpperCase();
  }

  // 闅忔満鍗曡瘝
  function getRandomWord() {
    return WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)].toUpperCase();
  }

  // 鐘舵€?  let targetWord = '';
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

  // 鍒濆鍖栫綉鏍?  function initGrid() {
    gridEl.innerHTML = '';
    for (let r = 0; r < MAX_GUESSES; r++) {
      const row = document.createElement('div');
      row.className = 'wordle-row';
      row.setAttribute('role', 'row');
      for (let c = 0; c < WORD_LENGTH; c++) {
        const cell = document.createElement('div');
        cell.className = 'wordle-cell';
        cell.setAttribute('role', 'gridcell');
        cell.setAttribute('aria-label', `绗?${r + 1} 琛岀 ${c + 1} 鍒梎);
        row.appendChild(cell);
      }
      gridEl.appendChild(row);
    }
  }

  // 鍒濆鍖栭敭鐩?  const KEYBOARD_ROWS = [
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
          btn.textContent = '鍥炶溅';
          btn.classList.add('wordle-key--wide');
        } else if (key === 'Backspace') {
          btn.textContent = '鈱?;
          btn.classList.add('wordle-key--wide');
        } else {
          btn.textContent = key;
        }
        btn.dataset.key = key;
        btn.setAttribute('aria-label', key === 'Enter' ? '鎻愪氦' : key === 'Backspace' ? '鍒犻櫎' : key);
        btn.addEventListener('click', () => handleKey(key));
        rowEl.appendChild(btn);
      }
      keyboardEl.appendChild(rowEl);
    }
  }

  // 澶勭悊鎸夐敭
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

  // 鏇存柊缃戞牸鏄剧ず
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

  // 鎻愪氦鐚滄祴
  function submitGuess() {
    if (currentGuess.length !== WORD_LENGTH) {
      shakeRow(guesses.length);
      announce('璇疯緭鍏?5 涓瓧姣?);
      return;
    }
    if (!WORD_LIST.includes(currentGuess.toLowerCase())) {
      shakeRow(guesses.length);
      announce('涓嶆槸鏈夋晥鍗曡瘝');
      return;
    }

    const result = evaluateGuess(currentGuess, targetWord);
    guesses.push({ word: currentGuess, result });

    // 鏇存柊缃戞牸棰滆壊
    const rowIndex = guesses.length - 1;
    const row = gridEl.children[rowIndex];
    for (let c = 0; c < WORD_LENGTH; c++) {
      const cell = row.children[c];
      cell.classList.add('wordle-cell--' + result[c]);
    }

    // 鏇存柊閿洏棰滆壊
    updateKeyboardColors(currentGuess, result);

    // 妫€鏌ヨ儨鍒?澶辫触
    if (currentGuess === targetWord) {
      gameOver = true;
      stats.games++;
      stats.wins++;
      stats.streak++;
      stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
      stats.guessDistribution[guesses.length - 1]++;
      saveStats();
      updateStats();
      announce('鎭枩锛佺寽涓簡锛?);
      setTimeout(() => {
        showResult(true);
      }, 500);
    } else if (guesses.length >= MAX_GUESSES) {
      gameOver = true;
      stats.games++;
      stats.streak = 0;
      saveStats();
      updateStats();
      announce('娓告垙缁撴潫锛岀瓟妗堟槸 ' + targetWord);
      setTimeout(() => {
        showResult(false);
      }, 500);
    } else {
      currentGuess = '';
      announce(`绗?${guesses.length} 娆＄寽娴媊);
    }
  }

  // 璇勪及鐚滄祴
  function evaluateGuess(guess, target) {
    const result = new Array(WORD_LENGTH).fill('absent');
    const targetChars = target.split('');
    const guessChars = guess.split('');

    // 绗竴杞細鏍囪 correct
    for (let i = 0; i < WORD_LENGTH; i++) {
      if (guessChars[i] === targetChars[i]) {
        result[i] = 'correct';
        targetChars[i] = null; // consumed
      }
    }

    // 绗簩杞細鏍囪 present
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

  // 鏇存柊閿洏棰滆壊
  function updateKeyboardColors(guess, result) {
    const keys = keyboardEl.querySelectorAll('.wordle-key');
    for (let i = 0; i < WORD_LENGTH; i++) {
      const letter = guess[i];
      const color = result[i];
      for (const key of keys) {
        if (key.dataset.key === letter) {
          // 浼樺厛绾э細correct > present > absent
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

  // 鎶栧姩琛?  function shakeRow(rowIndex) {
    const row = gridEl.children[rowIndex];
    if (!row) return;
    row.classList.add('wordle-row--shake');
    setTimeout(() => row.classList.remove('wordle-row--shake'), 600);
  }

  // 鏄剧ず缁撴灉
  function showResult(won) {
    const overlay = document.createElement('div');
    overlay.className = 'wordle-result';
    overlay.innerHTML = `
      <div class="wordle-result-card">
        <h2>${won ? '馃帀 鎭枩鐚滀腑锛? : '馃槩 娓告垙缁撴潫'}</h2>
        <p>绛旀锛?strong>${targetWord}</strong></p>
        <p>鐚滄祴娆℃暟锛?{guesses.length}/6</p>
        <div class="wordle-stats">
          <div><span>鎬诲眬鏁?/span><strong>${stats.games}</strong></div>
          <div><span>鑳滅巼</span><strong>${stats.games ? Math.round(stats.wins / stats.games * 100) : 0}%</strong></div>
          <div><span>杩炶儨</span><strong>${stats.streak}</strong></div>
          <div><span>鏈€楂樿繛鑳?/span><strong>${stats.maxStreak}</strong></div>
        </div>
        <div class="wordle-dist">
          ${stats.guessDistribution.map((n, i) => `<div><span>${i + 1}</span><div class="wordle-dist-bar" style="width:${Math.max(4, n / Math.max(1, Math.max(...stats.guessDistribution)) * 100)}%"></div><span>${n}</span></div>`).join('')}
        </div>
        <div class="cta-row">
          <button class="btn btn-primary" id="result-new">鏂版父鎴?/button>
          <button class="btn btn-ghost" id="result-share">鍒嗕韩鎴愮哗</button>
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

  // 鍒嗕韩鎴愮哗
  function shareResult(won) {
    const emoji = guesses.map(g => g.result.map(r => {
      if (r === 'correct') return '馃煩';
      if (r === 'present') return '馃煥';
      return '猬?;
    }).join('')).join('\n');
    const text = `Wordle ${won ? guesses.length : 'X'}/6\n\n${emoji}\n\nhttps://vip-4.github.io/snake-classic/games/wordle/`;
    if (navigator.share) {
      navigator.share({ title: 'Wordle 鎴愮哗', text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => {
        announce('鎴愮哗宸插鍒跺埌鍓创鏉?);
      }).catch(() => {});
    }
  }

  // 鏂版父鎴?  function newGame() {
    targetWord = getRandomWord();
    currentGuess = '';
    guesses = [];
    gameOver = false;
    initGrid();
    initKeyboard();
    updateStats();
    announce('鏂版父鎴忓紑濮?);
  }

  // 姣忔棩娓告垙
  function dailyGame() {
    targetWord = getDailyWord();
    currentGuess = '';
    guesses = [];
    gameOver = false;
    initGrid();
    initKeyboard();
    updateStats();
    announce('姣忔棩鎸戞垬寮€濮?);
  }

  // 缁熻
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

  // 鍏憡
  function announce(msg) {
    if (liveEl) {
      liveEl.textContent = msg;
    }
  }

  // 閿洏浜嬩欢
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

  // 鎸夐挳浜嬩欢
  document.getElementById('new-game').addEventListener('click', newGame);
  document.getElementById('share').addEventListener('click', () => {
    if (guesses.length > 0) shareResult(gameOver && currentGuess === targetWord);
  });

  // 鍒濆鍖?  initGrid();
  initKeyboard();
  dailyGame();
})();
