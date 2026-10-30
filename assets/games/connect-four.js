// 四子连珠 Connect Four — 原生 JS 实现
(function () {
  'use strict';

  const COLS = 7;
  const ROWS = 6;
  const RED = 1;
  const YELLOW = 2;

  // 状态
  let board = [];
  let currentPlayer = RED;
  let gameOver = false;
  let mode = 'pvp'; // 'pvp' 或 'pvc'
  let stats = { redWins: 0, yellowWins: 0, draws: 0 };

  // DOM
  const boardEl = document.getElementById('board');
  const messageEl = document.getElementById('message');
  const turnEl = document.getElementById('turn');
  const modeEl = document.getElementById('mode');
  const modeSelect = document.getElementById('mode-select');
  const newGameBtn = document.getElementById('new-game');
  const statsWinsEl = document.getElementById('stats-wins');
  const liveEl = document.getElementById('live');

  const PLAYER_NAMES = { [RED]: '红方', [YELLOW]: '黄方' };
  const MODE_NAMES = { pvp: '双人对战', pvc: '人机对战' };

  // 加载统计
  try {
    const raw = localStorage.getItem('connect-four-stats');
    if (raw) stats = JSON.parse(raw);
  } catch (e) {}

  function saveStats() {
    try { localStorage.setItem('connect-four-stats', JSON.stringify(stats)); } catch (e) {}
  }

  function announce(msg) {
    if (liveEl) liveEl.textContent = msg;
  }

  // 初始化棋盘
  function initBoard() {
    board = [];
    for (let c = 0; c < COLS; c++) {
      board.push(new Array(ROWS).fill(0));
    }
  }

  // 渲染棋盘
  function renderBoard() {
    boardEl.innerHTML = '';
    // 列标题（可点击落子）
    for (let c = 0; c < COLS; c++) {
      const colBtn = document.createElement('button');
      colBtn.type = 'button';
      colBtn.className = 'col-btn';
      colBtn.dataset.col = c;
      colBtn.setAttribute('aria-label', '第 ' + (c + 1) + ' 列');
      colBtn.textContent = c + 1;
      colBtn.addEventListener('click', () => drop(c));
      boardEl.appendChild(colBtn);

      for (let r = ROWS - 1; r >= 0; r--) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.col = c;
        cell.dataset.row = r;
        const piece = document.createElement('div');
        piece.className = 'piece';
        cell.appendChild(piece);
        boardEl.appendChild(cell);
      }
    }
    updatePieces();
  }

  function updatePieces() {
    const cells = boardEl.querySelectorAll('.cell');
    cells.forEach(cell => {
      const c = parseInt(cell.dataset.col, 10);
      const r = parseInt(cell.dataset.row, 10);
      const piece = cell.querySelector('.piece');
      piece.className = 'piece';
      if (board[c][r] === RED) piece.classList.add('red');
      else if (board[c][r] === YELLOW) piece.classList.add('yellow');
    });
  }

  // 获取该列最低空行
  function getLowestEmptyRow(c) {
    for (let r = 0; r < ROWS; r++) {
      if (board[c][r] === 0) return r;
    }
    return -1;
  }

  // 落子
  function drop(c) {
    if (gameOver) return;
    const r = getLowestEmptyRow(c);
    if (r === -1) return;

    board[c][r] = currentPlayer;
    updatePieces();

    if (checkWin(c, r)) {
      gameOver = true;
      messageEl.textContent = PLAYER_NAMES[currentPlayer] + ' 获胜！🎉';
      if (currentPlayer === RED) stats.redWins++; else stats.yellowWins++;
      saveStats();
      updateStats();
      announce(PLAYER_NAMES[currentPlayer] + ' 获胜');
      return;
    }

    if (isDraw()) {
      gameOver = true;
      messageEl.textContent = '平局！🤝';
      stats.draws++;
      saveStats();
      updateStats();
      announce('平局');
      return;
    }

    currentPlayer = currentPlayer === RED ? YELLOW : RED;
    turnEl.textContent = PLAYER_NAMES[currentPlayer];
    announce(currentPlayer === RED ? '红方回合' : '黄方回合');

    if (mode === 'pvc' && currentPlayer === YELLOW && !gameOver) {
      setTimeout(aiMove, 400);
    }
  }

  // 平局检测
  function isDraw() {
    for (let c = 0; c < COLS; c++) {
      if (getLowestEmptyRow(c) !== -1) return false;
    }
    return true;
  }

  // 胜负检测
  function checkWin(c, r) {
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];
    for (const [dc, dr] of dirs) {
      let count = 1;
      for (let s = 1; s <= 3; s++) {
        const nc = c + dc * s, nr = r + dr * s;
        if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS && board[nc][nr] === currentPlayer) count++;
        else break;
      }
      for (let s = 1; s <= 3; s++) {
        const nc = c - dc * s, nr = r - dr * s;
        if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS && board[nc][nr] === currentPlayer) count++;
        else break;
      }
      if (count >= 4) return true;
    }
    return false;
  }

  // 简单 AI：优先获胜，其次阻挡对手，否则随机
  function aiMove() {
    if (gameOver) return;
    // 尝试获胜
    for (let c = 0; c < COLS; c++) {
      const r = getLowestEmptyRow(c);
      if (r !== -1) {
        board[c][r] = YELLOW;
        if (checkWin(c, r)) {
          board[c][r] = 0;
          drop(c);
          return;
        }
        board[c][r] = 0;
      }
    }
    // 尝试阻挡红方获胜
    for (let c = 0; c < COLS; c++) {
      const r = getLowestEmptyRow(c);
      if (r !== -1) {
        board[c][r] = RED;
        if (checkWin(c, r)) {
          board[c][r] = 0;
          drop(c);
          return;
        }
        board[c][r] = 0;
      }
    }
    // 随机选择非满列
    const available = [];
    for (let c = 0; c < COLS; c++) {
      if (getLowestEmptyRow(c) !== -1) available.push(c);
    }
    if (available.length > 0) {
      drop(available[Math.floor(Math.random() * available.length)]);
    }
  }

  // 更新统计显示
  function updateStats() {
    statsWinsEl.textContent = stats.redWins + stats.yellowWins + stats.draws;
  }

  // 新局
  function newGame() {
    initBoard();
    currentPlayer = RED;
    gameOver = false;
    messageEl.textContent = '';
    renderBoard();
    turnEl.textContent = PLAYER_NAMES[currentPlayer];
    updateStats();
    announce('新局开始');
  }

  // 模式切换
  modeSelect.addEventListener('change', () => {
    mode = modeSelect.value;
    modeEl.textContent = MODE_NAMES[mode];
    newGame();
  });

  newGameBtn.addEventListener('click', newGame);

  // 初始化
  initBoard();
  modeEl.textContent = MODE_NAMES[mode];
  updateStats();
  renderBoard();
  announce('新局开始');
})();
