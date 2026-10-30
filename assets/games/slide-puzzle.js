// 滑动拼图 Slide Puzzle — 原生 JS 实现
(function () {
  'use strict';

  const N = 4;
  const TOTAL = N * N; // 16
  const DIFFICULTY_SHUFFLE = { easy: 40, medium: 80, hard: 150 };

  // 状态
  let tiles = [];        // 长度 16，0 表示空位
  let emptyIdx = TOTAL - 1;
  let difficulty = 'medium';
  let moves = 0;
  let gameOver = false;
  let solved = false;
  let startTime = 0;
  let timerId = null;
  let elapsed = 0;
  let stats = { easy: { bestMoves: 0, bestTime: 0, completed: 0 }, medium: { bestMoves: 0, bestTime: 0, completed: 0 }, hard: { bestMoves: 0, bestTime: 0, completed: 0 } };

  // DOM
  const gridEl = document.getElementById('grid');
  const messageEl = document.getElementById('message');
  const movesEl = document.getElementById('moves');
  const timerEl = document.getElementById('timer');
  const bestMovesEl = document.getElementById('best-moves');
  const diffSelect = document.getElementById('difficulty-select');
  const newGameBtn = document.getElementById('new-game');
  const liveEl = document.getElementById('live');

  const DIFF_NAMES = { easy: '简单', medium: '中等', hard: '困难' };

  // 加载统计
  try {
    const raw = localStorage.getItem('slide-puzzle-stats');
    if (raw) stats = JSON.parse(raw);
  } catch (e) {}

  function saveStats() {
    try { localStorage.setItem('slide-puzzle-stats', JSON.stringify(stats)); } catch (e) {}
  }

  function announce(msg) {
    if (liveEl) liveEl.textContent = msg;
  }

  // 检查谜题是否可解（逆序数奇偶性）
  function isSolvable(arr) {
    let inv = 0;
    for (let i = 0; i < TOTAL; i++) {
      if (arr[i] === 0) continue;
      for (let j = i + 1; j < TOTAL; j++) {
        if (arr[j] === 0) continue;
        if (arr[i] > arr[j]) inv++;
      }
    }
    // 4x4：空位在奇数行（从底数，1-indexed）时逆序数应为奇数；偶数行时应为偶数
    const emptyRowFromBottom = N - Math.floor(emptyIdx / N);
    if (N % 2 === 0) {
      return (emptyRowFromBottom % 2 === 1) ? (inv % 2 === 1) : (inv % 2 === 0);
    }
    return inv % 2 === 0;
  }

  function shuffleTiles(times) {
    tiles = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0];
    emptyIdx = TOTAL - 1;
    let last = -1;
    const dirs = [-1, 1, -N, N];
    for (let s = 0; s < times; s++) {
      const candidates = [];
      const r = Math.floor(emptyIdx / N), c = emptyIdx % N;
      const moves4 = [
        { d: -1, ok: c > 0 },
        { d: 1, ok: c < N - 1 },
        { d: -N, ok: r > 0 },
        { d: N, ok: r < N - 1 },
      ];
      for (const m of moves4) {
        if (m.ok && m.d !== -last) candidates.push(m.d);
      }
      const d = candidates[Math.floor(Math.random() * candidates.length)];
      const target = emptyIdx + d;
      tiles[emptyIdx] = tiles[target];
      tiles[target] = 0;
      emptyIdx = target;
      last = d;
    }
    // 确保可解且非已解状态
    if (!isSolvable(tiles)) {
      // 交换两个非空位使其可解
      for (let i = 0; i < TOTAL; i++) {
        if (tiles[i] !== 0) {
          for (let j = i + 1; j < TOTAL; j++) {
            if (tiles[j] !== 0) {
              [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
              break;
            }
          }
          break;
        }
      }
    }
    if (isSolved()) {
      // 再多打乱一次
      return shuffleTiles(Math.max(10, times / 2));
    }
    return tiles;
  }

  function isSolved() {
    for (let i = 0; i < TOTAL - 1; i++) {
      if (tiles[i] !== i + 1) return false;
    }
    return tiles[TOTAL - 1] === 0;
  }

  function newGame() {
    gameOver = false;
    solved = false;
    stopTimer();
    elapsed = 0;
    moves = 0;
    timerEl.textContent = '00:00';
    movesEl.textContent = '0';
    messageEl.textContent = '';
    tiles = shuffleTiles(DIFFICULTY_SHUFFLE[difficulty]);
    renderGrid();
    updateBest();
    announce('新局开始，难度：' + DIFF_NAMES[difficulty]);
    startTimer();
  }

  function renderGrid() {
    gridEl.innerHTML = '';
    for (let i = 0; i < TOTAL; i++) {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'tile';
      tile.dataset.idx = i;
      tile.setAttribute('role', 'gridcell');
      tile.setAttribute('aria-label', '方块 ' + (tiles[i] === 0 ? '空位' : tiles[i]));

      if (tiles[i] === 0) {
        tile.classList.add('empty');
        tile.textContent = '';
        tile.tabIndex = -1;
      } else {
        tile.textContent = tiles[i];
        tile.tabIndex = 0;
        if (tiles[i] === i + 1) tile.classList.add('correct');
        tile.addEventListener('click', () => tryMove(i));
      }

      // 网格边框
      const r = Math.floor(i / N), c = i % N;
      if (c === 0) tile.style.borderLeft = '3px solid var(--line-strong)';
      if (r === 0) tile.style.borderTop = '3px solid var(--line-strong)';
      if (c === N - 1) tile.style.borderRight = '3px solid var(--line-strong)';
      if (r === N - 1) tile.style.borderBottom = '3px solid var(--line-strong)';

      gridEl.appendChild(tile);
    }

    if (isSolved() && !solved) {
      solved = true;
      gameOver = true;
      stopTimer();
      stats[difficulty].completed++;
      const t = elapsed;
      let improved = false;
      if (stats[difficulty].bestMoves === 0 || moves < stats[difficulty].bestMoves) {
        stats[difficulty].bestMoves = moves;
        improved = true;
      }
      if (stats[difficulty].bestTime === 0 || t < stats[difficulty].bestTime) {
        stats[difficulty].bestTime = t;
        improved = true;
      }
      saveStats();
      updateBest();
      messageEl.textContent = '🎉 完成！步数 ' + moves + '，用时 ' + formatTime(t);
      announce(improved ? '恭喜完成，刷新最佳成绩！' : '恭喜完成滑动拼图！');
    }
  }

  function tryMove(idx) {
    if (gameOver) return;
    const r = Math.floor(idx / N), c = idx % N;
    const er = Math.floor(emptyIdx / N), ec = emptyIdx % N;
    const adjacent = (Math.abs(r - er) === 1 && c === ec) || (Math.abs(c - ec) === 1 && r === er);
    if (!adjacent) return;

    // 滑动
    tiles[emptyIdx] = tiles[idx];
    tiles[idx] = 0;
    emptyIdx = idx;
    moves++;
    movesEl.textContent = String(moves);
    renderGrid();
    announce('步数：' + moves);
  }

  function updateBest() {
    const bm = stats[difficulty].bestMoves;
    bestMovesEl.textContent = bm ? String(bm) : '-';
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

  // 键盘：方向键移动空位（即将空位相邻的方块移入空位）
  document.addEventListener('keydown', (e) => {
    if (gameOver) return;
    let target = -1;
    const er = Math.floor(emptyIdx / N), ec = emptyIdx % N;
    if (e.key === 'ArrowUp' && er < N - 1) { e.preventDefault(); target = emptyIdx + N; }
    else if (e.key === 'ArrowDown' && er > 0) { e.preventDefault(); target = emptyIdx - N; }
    else if (e.key === 'ArrowLeft' && ec < N - 1) { e.preventDefault(); target = emptyIdx + 1; }
    else if (e.key === 'ArrowRight' && ec > 0) { e.preventDefault(); target = emptyIdx - 1; }
    if (target !== -1) tryMove(target);
  });

  // 控件
  diffSelect.addEventListener('change', () => {
    difficulty = diffSelect.value;
    newGame();
  });
  newGameBtn.addEventListener('click', newGame);

  // 初始化
  difficulty = diffSelect.value;
  updateBest();
  newGame();
})();
