// 数独 Sudoku — 原生 JS 实现
(function () {
  'use strict';

  const N = 9;
  const DIFFICULTY_REMOVED = { easy: 30, medium: 45, hard: 55 };

  // 状态
  let solution = [];      // 完整解答
  let puzzle = [];        // 当前谜题（0 = 空）
  let user = [];          // 用户填写（0 = 空）
  let notes = [];         // 笔记：数组的数组 Set
  let fixed = [];         // 预填不可改
  let difficulty = 'medium';
  let noteMode = false;
  let gameOver = false;
  let startTime = 0;
  let timerId = null;
  let elapsed = 0;
  let selected = -1;      // 选中格索引 0-80
  let stats = { easy: { best: 0, completed: 0 }, medium: { best: 0, completed: 0 }, hard: { best: 0, completed: 0 } };

  // DOM
  const gridEl = document.getElementById('grid');
  const messageEl = document.getElementById('message');
  const timerEl = document.getElementById('timer');
  const diffEl = document.getElementById('difficulty');
  const bestEl = document.getElementById('best-time');
  const diffSelect = document.getElementById('difficulty-select');
  const newGameBtn = document.getElementById('new-game');
  const noteBtn = document.getElementById('note-toggle');
  const liveEl = document.getElementById('live');

  const DIFF_NAMES = { easy: '简单', medium: '中等', hard: '困难' };

  // 加载统计
  try {
    const raw = localStorage.getItem('sudoku-stats');
    if (raw) stats = JSON.parse(raw);
  } catch (e) {}

  function saveStats() {
    try { localStorage.setItem('sudoku-stats', JSON.stringify(stats)); } catch (e) {}
  }

  function announce(msg) {
    if (liveEl) liveEl.textContent = msg;
  }

  // 数独求解器（回溯）
  function solve(grid) {
    for (let i = 0; i < 81; i++) {
      if (grid[i] === 0) {
        for (let n = 1; n <= 9; n++) {
          if (isValid(grid, i, n)) {
            grid[i] = n;
            if (solve(grid)) return true;
            grid[i] = 0;
          }
        }
        return false;
      }
    }
    return true;
  }

  function isValid(grid, idx, n) {
    const r = Math.floor(idx / N), c = idx % N;
    for (let i = 0; i < N; i++) {
      if (grid[r * N + i] === n) return false;
      if (grid[i * N + c] === n) return false;
    }
    const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (grid[(br + i) * N + (bc + j)] === n) return false;
      }
    }
    return true;
  }

  // 生成完整解答
  function generateSolution() {
    const g = new Array(81).fill(0);
    // 先填几个随机数字作为种子
    const seedCount = Math.floor(Math.random() * 3) + 3;
    for (let s = 0; s < seedCount; s++) {
      const idx = Math.floor(Math.random() * 81);
      const n = Math.floor(Math.random() * 9) + 1;
      if (isValid(g, idx, n)) g[idx] = n;
    }
    solve(g);
    return g;
  }

  // 生成谜题：去除数字，确保唯一解（简易：多次求解计数）
  function generatePuzzle(sol, removedCount) {
    const p = sol.slice();
    let positions = [];
    for (let i = 0; i < 81; i++) positions.push(i);
    positions = shuffle(positions);

    let removed = 0;
    for (const idx of positions) {
      if (removed >= removedCount) break;
      const backup = p[idx];
      p[idx] = 0;
      // 检查唯一解
      const copy = p.slice();
      let count = 0;
      countSolutions(copy, 0, 2);
      if (count === 1) {
        removed++;
      } else {
        p[idx] = backup;
      }
    }
    return p;
  }

  function countSolutions(g, start, limit) {
    for (let i = start; i < 81; i++) {
      if (g[i] === 0) {
        for (let n = 1; n <= 9; n++) {
          if (isValid(g, i, n)) {
            g[i] = n;
            if (countSolutions(g, i + 1, limit) >= limit) return limit;
            g[i] = 0;
          }
        }
        return 0;
      }
    }
    return 1;
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // 初始化新局
  function newGame() {
    gameOver = false;
    stopTimer();
    elapsed = 0;
    timerEl.textContent = '00:00';
    solution = generateSolution();
    puzzle = generatePuzzle(solution, DIFFICULTY_REMOVED[difficulty]);
    user = puzzle.slice();
    notes = new Array(81).fill(null).map(() => new Set());
    fixed = puzzle.map(v => v !== 0);
    selected = -1;
    messageEl.textContent = '';
    renderGrid();
    diffEl.textContent = DIFF_NAMES[difficulty];
    updateBest();
    announce('新局开始，难度：' + DIFF_NAMES[difficulty]);
    startTimer();
  }

  // 渲染网格
  function renderGrid() {
    gridEl.innerHTML = '';
    for (let i = 0; i < 81; i++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.idx = i;
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-label', '第 ' + (Math.floor(i / 9) + 1) + ' 行，第 ' + (i % 9 + 1) + ' 列');

      // 3x3 宫边框
      const r = Math.floor(i / 9), c = i % 9;
      if (c % 3 === 0) cell.style.borderLeft = '2px solid var(--line-strong)';
      if (r % 3 === 0) cell.style.borderTop = '2px solid var(--line-strong)';
      if (c === 8) cell.style.borderRight = '2px solid var(--line-strong)';
      if (r === 8) cell.style.borderBottom = '2px solid var(--line-strong)';

      const valDisplay = document.createElement('div');
      valDisplay.className = 'cell-value';
      cell.appendChild(valDisplay);

      const notesDisplay = document.createElement('div');
      notesDisplay.className = 'cell-notes';
      cell.appendChild(notesDisplay);

      cell.addEventListener('click', () => selectCell(i));
      gridEl.appendChild(cell);
    }
    updateCells();
  }

  function updateCells() {
    const cells = gridEl.querySelectorAll('.cell');
    cells.forEach(cell => {
      const i = parseInt(cell.dataset.idx, 10);
      const valDisplay = cell.querySelector('.cell-value');
      const notesDisplay = cell.querySelector('.cell-notes');

      // 重置类
      cell.className = 'cell';
      if (fixed[i]) cell.classList.add('fixed');
      if (selected === i) cell.classList.add('selected');

      // 3x3 边框
      const r = Math.floor(i / 9), c = i % 9;
      if (c % 3 === 0) cell.style.borderLeft = '2px solid var(--line-strong)';
      if (r % 3 === 0) cell.style.borderTop = '2px solid var(--line-strong)';
      if (c === 8) cell.style.borderRight = '2px solid var(--line-strong)';
      if (r === 8) cell.style.borderBottom = '2px solid var(--line-strong)';

      const val = user[i];
      if (val !== 0) {
        valDisplay.textContent = val;
        valDisplay.className = 'cell-value';
        if (fixed[i]) {
          // 固定
        } else if (val === solution[i]) {
          valDisplay.classList.add('correct');
        } else {
          valDisplay.classList.add('wrong');
        }
        notesDisplay.textContent = '';
      } else {
        valDisplay.textContent = '';
        if (noteMode && notes[i].size > 0) {
          notesDisplay.textContent = Array.from(notes[i]).sort((a, b) => a - b).join(' ');
        } else {
          notesDisplay.textContent = '';
        }
      }

      // 高亮同数字
      if (selected !== -1 && !fixed[selected] && user[selected] !== 0 && user[i] === user[selected] && !fixed[i]) {
        cell.classList.add('same-num');
      }
    });

    // 胜负判断
    if (!gameOver && isComplete()) {
      gameOver = true;
      stopTimer();
      const t = elapsed;
      stats[difficulty].completed++;
      if (stats[difficulty].best === 0 || t < stats[difficulty].best) {
        stats[difficulty].best = t;
        saveStats();
        updateBest();
        announce('恭喜完成！新最佳时间！');
      } else {
        saveStats();
        announce('恭喜完成数独！');
      }
      messageEl.textContent = '🎉 完成！用时 ' + formatTime(t);
    }
  }

  function isComplete() {
    for (let i = 0; i < 81; i++) {
      if (user[i] === 0 || user[i] !== solution[i]) return false;
    }
    return true;
  }

  function selectCell(i) {
    if (gameOver) return;
    selected = i;
    renderGrid();
    announce('选中第 ' + (Math.floor(i / 9) + 1) + ' 行，第 ' + (i % 9 + 1) + ' 列');
  }

  function setNumber(n) {
    if (gameOver || selected === -1) return;
    if (fixed[selected]) return;
    if (noteMode) {
      if (notes[selected].has(n)) notes[selected].delete(n);
      else notes[selected].add(n);
      user[selected] = 0;
    } else {
      notes[selected].clear();
      user[selected] = n;
    }
    updateCells();
  }

  function eraseCell() {
    if (gameOver || selected === -1 || fixed[selected]) return;
    notes[selected].clear();
    user[selected] = 0;
    updateCells();
  }

  // 计时器
  function startTimer() {
    startTime = Date.now() - elapsed;
    timerId = setInterval(() => {
      elapsed = Date.now() - startTime;
      timerEl.textContent = formatTime(elapsed);
    }, 1000);
  }

  function stopTimer() {
    if (timerId) clearInterval(timerId);
    timerId = null;
  }

  function formatTime(ms) {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    return m + ':' + s;
  }

  function updateBest() {
    const b = stats[difficulty].best;
    bestEl.textContent = b ? formatTime(b) : '-';
  }

  // 键盘
  document.addEventListener('keydown', (e) => {
    if (gameOver || selected === -1) return;
    if (e.key >= '1' && e.key <= '9') {
      e.preventDefault();
      setNumber(parseInt(e.key, 10));
    } else if (e.key === '0' || e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      eraseCell();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      moveSelection(e.key);
    }
  });

  function moveSelection(key) {
    if (selected === -1) selected = 0;
    let r = Math.floor(selected / 9), c = selected % 9;
    if (key === 'ArrowUp') r = (r - 1 + 9) % 9;
    else if (key === 'ArrowDown') r = (r + 1) % 9;
    else if (key === 'ArrowLeft') c = (c - 1 + 9) % 9;
    else if (key === 'ArrowRight') c = (c + 1) % 9;
    selectCell(r * 9 + c);
  }

  // 数字键盘
  document.querySelectorAll('.sudoku-keypad button').forEach(btn => {
    btn.addEventListener('click', () => {
      const n = parseInt(btn.dataset.num, 10);
      if (n === 0) eraseCell(); else setNumber(n);
    });
  });

  // 难度切换
  diffSelect.addEventListener('change', () => {
    difficulty = diffSelect.value;
    newGame();
  });

  // 新局
  newGameBtn.addEventListener('click', newGame);

  // 笔记模式
  noteBtn.addEventListener('click', () => {
    noteMode = !noteMode;
    noteBtn.setAttribute('aria-pressed', noteMode);
    noteBtn.querySelector('span').textContent = noteMode ? '数字' : '笔记';
    announce(noteMode ? '笔记模式开启' : '笔记模式关闭');
    updateCells();
  });

  // 初始化
  difficulty = diffSelect.value;
  updateBest();
  newGame();
})();
