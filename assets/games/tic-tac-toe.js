// 井字棋 Tic Tac Toe — 原生 JS 实现
(function () {
  'use strict';

  const N = 3;
  const X = 'X';
  const O = 'O';

  // 状态
  let board = [];       // 长度9，'' 空，'X'/'O' 已占
  let current = X;      // 当前玩家
  let gameOver = false;
  let stats = { x: 0, o: 0, draw: 0 };

  // DOM
  const boardEl = document.getElementById('board');
  const messageEl = document.getElementById('message');
  const scoreXEl = document.getElementById('score-x');
  const scoreOEl = document.getElementById('score-o');
  const scoreDrawEl = document.getElementById('score-draw');
  const turnEl = document.getElementById('turn');
  const newGameBtn = document.getElementById('new-game');
  const liveEl = document.getElementById('live');

  // 加载统计
  try {
    const raw = localStorage.getItem('tic-tac-toe-stats');
    if (raw) stats = JSON.parse(raw);
  } catch (e) {}

  function saveStats() {
    try { localStorage.setItem('tic-tac-toe-stats', JSON.stringify(stats)); } catch (e) {}
  }

  function announce(msg) {
    if (liveEl) liveEl.textContent = msg;
  }

  // 获胜线
  const WIN_LINES = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];

  function newGame() {
    board = new Array(N * N).fill('');
    current = X;
    gameOver = false;
    messageEl.textContent = '';
    turnEl.textContent = 'X 方回合';
    renderBoard();
    updateStats();
    announce('新局开始，X 方先手');
  }

  function renderBoard() {
    boardEl.innerHTML = '';
    boardEl.style.display = 'grid';
    boardEl.style.gridTemplateColumns = `repeat(${N}, 1fr)`;
    boardEl.style.gap = '4px';

    for (let i = 0; i < N * N; i++) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cell';
      cell.dataset.idx = i;
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-label', '第 ' + (Math.floor(i / N) + 1) + ' 行，第 ' + (i % N + 1) + ' 列');

      if (board[i] !== '') {
        cell.textContent = board[i];
        cell.disabled = true;
        cell.classList.add(board[i] === X ? 'cell-x' : 'cell-o');
      } else {
        cell.textContent = '';
        cell.tabIndex = 0;
        cell.addEventListener('click', () => makeMove(i));
      }

      boardEl.appendChild(cell);
    }
  }

  function makeMove(i) {
    if (gameOver || board[i] !== '') return;

    board[i] = current;
    renderBoard();

    const winner = checkWinner();
    if (winner) {
      gameOver = true;
      if (winner === 'draw') {
        stats.draw++;
        messageEl.textContent = '平局！🤝';
        announce('平局');
      } else {
        stats[winner === X ? 'x' : 'o']++;
        messageEl.textContent = winner + ' 方获胜！🎉';
        announce(winner + ' 方获胜');
      }
      saveStats();
      updateStats();
      return;
    }

    current = current === X ? O : X;
    turnEl.textContent = current + ' 方回合';
    announce(current + ' 方回合');
  }

  function checkWinner() {
    for (const line of WIN_LINES) {
      const [a, b, c] = line;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    if (!board.includes('')) return 'draw';
    return null;
  }

  function updateStats() {
    scoreXEl.textContent = stats.x;
    scoreOEl.textContent = stats.o;
    scoreDrawEl.textContent = stats.draw;
  }

  // 键盘导航：方向键移动，空格/Enter 落子
  let focusIdx = -1;
  document.addEventListener('keydown', (e) => {
    if (gameOver) return;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      if (focusIdx === -1) focusIdx = 0;
      let r = Math.floor(focusIdx / N), c = focusIdx % N;
      if (e.key === 'ArrowUp') r = (r - 1 + N) % N;
      else if (e.key === 'ArrowDown') r = (r + 1) % N;
      else if (e.key === 'ArrowLeft') c = (c - 1 + N) % N;
      else if (e.key === 'ArrowRight') c = (c + 1) % N;
      focusIdx = r * N + c;
      const cell = boardEl.querySelector('[data-idx="' + focusIdx + '"]');
      if (cell) cell.focus();
    } else if ((e.key === ' ' || e.key === 'Enter') && focusIdx !== -1) {
      e.preventDefault();
      makeMove(focusIdx);
    }
  });

  newGameBtn.addEventListener('click', newGame);

  // 初始化
  updateStats();
  newGame();
})();
