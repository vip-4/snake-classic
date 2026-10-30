// 俄罗斯方块 — 原生 JS 实现
(function () {
  'use strict';

  const COLS = 10;
  const ROWS = 20;
  const BLOCK = 20; // px per cell

  // 7 种方块 (SRS 旋转系统)
  const PIECES = {
    I: { shape: [[1,1,1,1]], color: '#00f0f0' },
    O: { shape: [[1,1],[1,1]], color: '#f0f000' },
    T: { shape: [[0,1,0],[1,1,1]], color: '#a000f0' },
    S: { shape: [[0,1,1],[1,1,0]], color: '#00f000' },
    Z: { shape: [[1,1,0],[0,1,1]], color: '#f00000' },
    J: { shape: [[1,0,0],[1,1,1]], color: '#0000f0' },
    L: { shape: [[0,0,1],[1,1,1]], color: '#f0a000' },
  };

  const PIECE_NAMES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

  // 7-bag 随机
  let bag = [];
  function refillBag() {
    bag = PIECE_NAMES.slice().sort(() => Math.random() - 0.5);
  }
  function nextPieceName() {
    if (bag.length === 0) refillBag();
    return bag.pop();
  }

  // 旋转 (顺时针)
  function rotate(shape) {
    const rows = shape.length;
    const cols = shape[0].length;
    const result = [];
    for (let c = 0; c < cols; c++) {
      const row = [];
      for (let r = rows - 1; r >= 0; r--) {
        row.push(shape[r][c]);
      }
      result.push(row);
    }
    return result;
  }

  // 状态
  let board = [];
  let current = null;
  let holdPiece = null;
  let canHold = true;
  let nextQueue = [];
  let score = 0;
  let level = 1;
  let lines = 0;
  let gameOver = false;
  let paused = false;
  let dropInterval = 1000;
  let lastDrop = 0;
  let animId = null;

  // DOM
  const canvas = document.getElementById('tetris-canvas');
  const ctx = canvas.getContext('2d');
  const nextCanvas = document.getElementById('next-canvas');
  const nextCtx = nextCanvas.getContext('2d');
  const holdCanvas = document.getElementById('hold-canvas');
  const holdCtx = holdCanvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const levelEl = document.getElementById('level');
  const linesEl = document.getElementById('lines');
  const bestEl = document.getElementById('best');
  const liveEl = document.getElementById('live');

  let bestScore = parseInt(localStorage.getItem('tetris-best') || '0', 10);

  // 初始化棋盘
  function initBoard() {
    board = [];
    for (let r = 0; r < ROWS; r++) {
      board.push(new Array(COLS).fill(0));
    }
  }

  // 创建方块
  function createPiece(name) {
    const p = PIECES[name];
    return {
      name,
      shape: p.shape.map(row => row.slice()),
      color: p.color,
      x: Math.floor((COLS - p.shape[0].length) / 2),
      y: 0,
    };
  }

  // 碰撞检测
  function collides(piece, dx, dy, shape) {
    const s = shape || piece.shape;
    for (let r = 0; r < s.length; r++) {
      for (let c = 0; c < s[r].length; c++) {
        if (!s[r][c]) continue;
        const nx = piece.x + c + dx;
        const ny = piece.y + r + dy;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && board[ny][nx]) return true;
      }
    }
    return false;
  }

  // 锁定方块
  function lockPiece() {
    const p = current;
    for (let r = 0; r < p.shape.length; r++) {
      for (let c = 0; c < p.shape[r].length; c++) {
        if (!p.shape[r][c]) continue;
        const y = p.y + r;
        const x = p.x + c;
        if (y >= 0) board[y][x] = p.color;
      }
    }
    clearLines();
    spawnNext();
    canHold = true;
  }

  // 消行
  function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every(cell => cell !== 0)) {
        board.splice(r, 1);
        board.unshift(new Array(COLS).fill(0));
        cleared++;
        r++; // recheck same row
      }
    }
    if (cleared > 0) {
      lines += cleared;
      const points = [0, 100, 300, 500, 800][cleared] || 0;
      score += points * level;
      level = Math.floor(lines / 10) + 1;
      dropInterval = Math.max(100, 1000 - (level - 1) * 80);
      updateHUD();
      announce(`消除 ${cleared} 行`);
    }
  }

  // 生成下一个方块
  function spawnNext() {
    if (nextQueue.length < 3) {
      for (let i = nextQueue.length; i < 3; i++) {
        nextQueue.push(nextPieceName());
      }
    }
    const name = nextQueue.shift();
    current = createPiece(name);
    if (collides(current, 0, 0)) {
      gameOver = true;
      if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('tetris-best', bestScore);
        bestEl.textContent = bestScore;
      }
      announce('游戏结束');
      showGameOver();
    }
  }

  // 幽灵方块位置
  function getGhostY() {
    let gy = current.y;
    while (!collides(current, 0, gy - current.y + 1)) {
      gy++;
    }
    return gy;
  }

  // 绘制
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // 网格
    ctx.strokeStyle = 'rgba(148,173,230,0.06)';
    ctx.lineWidth = 0.5;
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * BLOCK, 0);
      ctx.lineTo(c * BLOCK, ROWS * BLOCK);
      ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * BLOCK);
      ctx.lineTo(COLS * BLOCK, r * BLOCK);
      ctx.stroke();
    }
    // 已锁定方块
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c]) {
          drawCell(ctx, c, r, board[r][c]);
        }
      }
    }
    if (!gameOver && current) {
      // 幽灵方块
      const ghostY = getGhostY();
      for (let r = 0; r < current.shape.length; r++) {
        for (let c = 0; c < current.shape[r].length; c++) {
          if (current.shape[r][c]) {
            ctx.globalAlpha = 0.25;
            drawCell(ctx, current.x + c, ghostY + r, current.color);
            ctx.globalAlpha = 1;
          }
        }
      }
      // 当前方块
      for (let r = 0; r < current.shape.length; r++) {
        for (let c = 0; c < current.shape[r].length; c++) {
          if (current.shape[r][c]) {
            drawCell(ctx, current.x + c, current.y + r, current.color);
          }
        }
      }
    }
  }

  function drawCell(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * BLOCK + 1, y * BLOCK + 1, BLOCK - 2, BLOCK - 2);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x * BLOCK + 1, y * BLOCK + 1, BLOCK - 2, 3);
  }

  function drawPreview(ctx, canvas, pieceName) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!pieceName) return;
    const p = PIECES[pieceName];
    const shape = p.shape;
    const cellSize = 16;
    const offsetX = (canvas.width - shape[0].length * cellSize) / 2;
    const offsetY = (canvas.height - shape.length * cellSize) / 2;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          ctx.fillStyle = p.color;
          ctx.fillRect(offsetX + c * cellSize + 1, offsetY + r * cellSize + 1, cellSize - 2, cellSize - 2);
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fillRect(offsetX + c * cellSize + 1, offsetY + r * cellSize + 1, cellSize - 2, 2);
        }
      }
    }
  }

  function updateHUD() {
    scoreEl.textContent = score;
    levelEl.textContent = level;
    linesEl.textContent = lines;
    bestEl.textContent = bestScore;
  }

  function announce(msg) {
    if (liveEl) liveEl.textContent = msg;
  }

  // 游戏循环
  function gameLoop(time) {
    if (gameOver || paused) {
      animId = requestAnimationFrame(gameLoop);
      return;
    }
    if (time - lastDrop > dropInterval) {
      if (!collides(current, 0, 1)) {
        current.y++;
      } else {
        lockPiece();
      }
      lastDrop = time;
    }
    draw();
    drawPreview(nextCtx, nextCanvas, nextQueue[0]);
    drawPreview(holdCtx, holdCanvas, holdPiece);
    animId = requestAnimationFrame(gameLoop);
  }

  // 操作
  function moveLeft() {
    if (!collides(current, -1, 0)) current.x--;
  }
  function moveRight() {
    if (!collides(current, 1, 0)) current.x++;
  }
  function rotatePiece() {
    const rotated = rotate(current.shape);
    if (!collides(current, 0, 0, rotated)) {
      current.shape = rotated;
    } else if (!collides(current, -1, 0, rotated)) {
      current.x--;
      current.shape = rotated;
    } else if (!collides(current, 1, 0, rotated)) {
      current.x++;
      current.shape = rotated;
    }
  }
  function softDrop() {
    if (!collides(current, 0, 1)) {
      current.y++;
      score += 1;
    } else {
      lockPiece();
    }
  }
  function hardDrop() {
    const gy = getGhostY();
    score += (gy - current.y) * 2;
    current.y = gy;
    lockPiece();
  }
  function hold() {
    if (!canHold) return;
    canHold = false;
    const name = current.name;
    if (holdPiece) {
      const temp = holdPiece;
      holdPiece = name;
      current = createPiece(temp);
      current.x = Math.floor((COLS - current.shape[0].length) / 2);
      current.y = 0;
    } else {
      holdPiece = name;
      spawnNext();
    }
  }

  function showGameOver() {
    const overlay = document.createElement('div');
    overlay.className = 'tetris-result';
    overlay.innerHTML = `
      <div class="tetris-result-card">
        <h2>游戏结束</h2>
        <p>分数：<strong>${score}</strong></p>
        <p>等级：${level} · 消行：${lines}</p>
        <p>最高分：${bestScore}</p>
        <div class="cta-row">
          <button class="btn btn-primary" id="tetris-restart">重新开始</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('tetris-restart').addEventListener('click', () => {
      overlay.remove();
      startGame();
    });
  }

  function startGame() {
    initBoard();
    score = 0;
    level = 1;
    lines = 0;
    gameOver = false;
    paused = false;
    holdPiece = null;
    canHold = true;
    nextQueue = [];
    refillBag();
    dropInterval = 1000;
    lastDrop = 0;
    spawnNext();
    updateHUD();
    bestEl.textContent = bestScore;
    announce('游戏开始');
    if (animId) cancelAnimationFrame(animId);
    animId = requestAnimationFrame(gameLoop);
  }

  // 键盘
  document.addEventListener('keydown', (e) => {
    if (gameOver || paused) {
      if (e.key === 'p' || e.key === 'P') {
        paused = !paused;
        announce(paused ? '暂停' : '继续');
      }
      return;
    }
    switch (e.key) {
      case 'ArrowLeft': e.preventDefault(); moveLeft(); break;
      case 'ArrowRight': e.preventDefault(); moveRight(); break;
      case 'ArrowUp': e.preventDefault(); rotatePiece(); break;
      case 'ArrowDown': e.preventDefault(); softDrop(); break;
      case ' ': e.preventDefault(); hardDrop(); break;
      case 'c': case 'C': e.preventDefault(); hold(); break;
      case 'p': case 'P': e.preventDefault(); paused = !paused; announce(paused ? '暂停' : '继续'); break;
    }
  });

  // 触屏按钮
  document.querySelectorAll('.tetris-touch button').forEach(btn => {
    btn.addEventListener('click', () => {
      if (gameOver || paused) return;
      switch (btn.dataset.action) {
        case 'left': moveLeft(); break;
        case 'right': moveRight(); break;
        case 'rotate': rotatePiece(); break;
        case 'down': softDrop(); break;
        case 'drop': hardDrop(); break;
        case 'hold': hold(); break;
      }
    });
  });

  document.getElementById('pause').addEventListener('click', () => {
    if (gameOver) return;
    paused = !paused;
    document.getElementById('pause').setAttribute('aria-pressed', paused);
    announce(paused ? '暂停' : '继续');
  });

  document.getElementById('restart').addEventListener('click', startGame);

  // 初始化
  startGame();
})();
