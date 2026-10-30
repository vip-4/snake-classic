// 五子棋 Gomoku — 原生 JS 实现
(function () {
  'use strict';

  const SIZE = 15;
  const CELL = 30;
  const BOARD = 450;

  // 状态
  let board = [];
  let currentPlayer = 1; // 1=黑, 2=白
  let gameOver = false;
  let mode = 'ai'; // 'ai' or 'pvp'
  let difficulty = 'normal'; // 'easy', 'normal', 'hard'
  let history = [];
  let moveCount = 0;
  let winner = 0;

  // DOM
  const canvas = document.getElementById('gomoku-canvas');
  const ctx = canvas.getContext('2d');
  const modeEl = document.getElementById('mode');
  const difficultyEl = document.getElementById('difficulty');
  const moveCountEl = document.getElementById('move-count');
  const liveEl = document.getElementById('live');

  // 初始化棋盘
  function initBoard() {
    board = [];
    for (let r = 0; r < SIZE; r++) {
      board.push(new Array(SIZE).fill(0));
    }
    currentPlayer = 1;
    gameOver = false;
    history = [];
    moveCount = 0;
    winner = 0;
    updateHUD();
  }

  // 落子
  function placeStone(r, c) {
    if (gameOver) return false;
    if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return false;
    if (board[r][c] !== 0) return false;

    // 禁手检查（仅黑棋）
    if (currentPlayer === 1 && isForbidden(r, c)) {
      announce('禁手！不能下此位置');
      return false;
    }

    board[r][c] = currentPlayer;
    history.push({ r, c, player: currentPlayer });
    moveCount++;

    // 检查胜利
    if (checkWin(r, c, currentPlayer)) {
      gameOver = true;
      winner = currentPlayer;
      announce(currentPlayer === 1 ? '黑棋获胜！' : '白棋获胜！');
      updateHUD();
      return true;
    }

    // 切换玩家
    currentPlayer = currentPlayer === 1 ? 2 : 1;
    updateHUD();

    // AI 回应
    if (mode === 'ai' && currentPlayer === 2 && !gameOver) {
      setTimeout(aiMove, 300);
    }

    return true;
  }

  // 禁手检查
  function isForbidden(r, c) {
    // 临时落子
    board[r][c] = 1;
    const forbidden = checkForbidden(r, c);
    board[r][c] = 0;
    return forbidden;
  }

  function checkForbidden(r, c) {
    // 三三禁手
    if (countPattern(r, c, 1, 0, 1) + countPattern(r, c, -1, 0, 1) >= 2) return true; // 横向
    if (countPattern(r, c, 0, 1, 1) + countPattern(r, c, 0, -1, 1) >= 2) return true; // 纵向
    if (countPattern(r, c, 1, 1, 1) + countPattern(r, c, -1, -1, 1) >= 2) return true; // 斜向
    if (countPattern(r, c, 1, -1, 1) + countPattern(r, c, -1, 1, 1) >= 2) return true; // 反斜向

    // 四四禁手
    if (countPattern(r, c, 1, 0, 2) + countPattern(r, c, -1, 0, 2) >= 2) return true;
    if (countPattern(r, c, 0, 1, 2) + countPattern(r, c, 0, -1, 2) >= 2) return true;
    if (countPattern(r, c, 1, 1, 2) + countPattern(r, c, -1, -1, 2) >= 2) return true;
    if (countPattern(r, c, 1, -1, 2) + countPattern(r, c, -1, 1, 2) >= 2) return true;

    // 长连禁手（6 子以上）
    if (countPattern(r, c, 1, 0, 1) + countPattern(r, c, -1, 0, 1) + 1 >= 6) return true;
    if (countPattern(r, c, 0, 1, 1) + countPattern(r, c, 0, -1, 1) + 1 >= 6) return true;
    if (countPattern(r, c, 1, 1, 1) + countPattern(r, c, -1, -1, 1) + 1 >= 6) return true;
    if (countPattern(r, c, 1, -1, 1) + countPattern(r, c, -1, 1, 1) + 1 >= 6) return true;

    return false;
  }

  function countPattern(r, c, dr, dc, type) {
    // type 1: 连续相同颜色 (用于三三)
    // type 2: 连续相同颜色 + 空位 (用于四四)
    let count = 0;
    let nr = r + dr;
    let nc = c + dc;
    const color = board[r][c];
    while (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
      if (board[nr][nc] === color) {
        count++;
        nr += dr;
        nc += dc;
      } else if (type === 2 && board[nr][nc] === 0) {
        // 空位，可以延伸
        count++;
        break;
      } else {
        break;
      }
    }
    return count;
  }

  // 检查胜利
  function checkWin(r, c, player) {
    const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
    for (const [dr, dc] of dirs) {
      let count = 1;
      // 正方向
      for (let i = 1; i < 5; i++) {
        const nr = r + dr * i;
        const nc = c + dc * i;
        if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE || board[nr][nc] !== player) break;
        count++;
      }
      // 反方向
      for (let i = 1; i < 5; i++) {
        const nr = r - dr * i;
        const nc = c - dc * i;
        if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE || board[nr][nc] !== player) break;
        count++;
      }
      if (count >= 5) return true;
    }
    return false;
  }

  // AI 移动
  function aiMove() {
    if (gameOver) return;
    const move = getBestMove();
    if (move) {
      placeStone(move.r, move.c);
    }
  }

  function getBestMove() {
    const empty = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (board[r][c] === 0) empty.push({ r, c });
      }
    }
    if (empty.length === 0) return null;

    // 简单 AI：随机 + 基础评估
    if (difficulty === 'easy') {
      return empty[Math.floor(Math.random() * empty.length)];
    }

    // 评估函数
    let bestScore = -Infinity;
    let bestMoves = [];

    for (const { r, c } of empty) {
      // 跳过远离已有棋子的位置
      if (!hasNeighbor(r, c, 2)) continue;

      const score = evaluateMove(r, c, 2) + evaluateMove(r, c, 1) * 0.8;
      if (score > bestScore) {
        bestScore = score;
        bestMoves = [{ r, c }];
      } else if (score === bestScore) {
        bestMoves.push({ r, c });
      }
    }

    if (bestMoves.length === 0) {
      // 如果没有好位置，选中心附近
      const center = Math.floor(SIZE / 2);
      let bestDist = Infinity;
      for (const { r, c } of empty) {
        const dist = Math.abs(r - center) + Math.abs(c - center);
        if (dist < bestDist) {
          bestDist = dist;
          bestMoves = [{ r, c }];
        } else if (dist === bestDist) {
          bestMoves.push({ r, c });
        }
      }
    }

    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
  }

  function hasNeighbor(r, c, dist) {
    for (let dr = -dist; dr <= dist; dr++) {
      for (let dc = -dist; dc <= dist; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board[nr][nc] !== 0) {
          return true;
        }
      }
    }
    return false;
  }

  function evaluateMove(r, c, player) {
    // 临时落子
    board[r][c] = player;
    let score = 0;
    const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];

    for (const [dr, dc] of dirs) {
      let count = 1;
      // 正方向
      for (let i = 1; i < 5; i++) {
        const nr = r + dr * i;
        const nc = c + dc * i;
        if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE || board[nr][nc] !== player) break;
        count++;
      }
      // 反方向
      for (let i = 1; i < 5; i++) {
        const nr = r - dr * i;
        const nc = c - dc * i;
        if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE || board[nr][nc] !== player) break;
        count++;
      }

      // 评分
      if (count >= 5) score += 100000;
      else if (count === 4) score += 10000;
      else if (count === 3) score += 1000;
      else if (count === 2) score += 100;
      else score += 10;
    }

    board[r][c] = 0;
    return score;
  }

  // 悔棋
  function undo() {
    if (history.length === 0) return;
    // 双人模式撤销一步，人机模式撤销两步（玩家+AI）
    const steps = mode === 'ai' ? 2 : 1;
    for (let i = 0; i < steps && history.length > 0; i++) {
      const last = history.pop();
      board[last.r][last.c] = 0;
      moveCount--;
    }
    currentPlayer = history.length % 2 === 0 ? 1 : 2;
    gameOver = false;
    winner = 0;
    updateHUD();
    announce('已悔棋');
  }

  function updateHUD() {
    modeEl.textContent = mode === 'ai' ? '人机' : '双人';
    difficultyEl.textContent = difficulty === 'easy' ? '轻松' : difficulty === 'hard' ? '挑战' : '标准';
    moveCountEl.textContent = moveCount;
  }

  function announce(msg) {
    if (liveEl) liveEl.textContent = msg;
  }

  // 绘制
  function draw() {
    ctx.clearRect(0, 0, BOARD, BOARD);

    // 棋盘背景
    ctx.fillStyle = '#deb887';
    ctx.fillRect(0, 0, BOARD, BOARD);

    // 网格
    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 1;
    for (let i = 0; i < SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(CELL / 2, CELL / 2 + i * CELL);
      ctx.lineTo(BOARD - CELL / 2, CELL / 2 + i * CELL);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(CELL / 2 + i * CELL, CELL / 2);
      ctx.lineTo(CELL / 2 + i * CELL, BOARD - CELL / 2);
      ctx.stroke();
    }

    // 星位
    const stars = [[3, 3], [3, 11], [7, 7], [11, 3], [11, 11]];
    for (const [r, c] of stars) {
      ctx.beginPath();
      ctx.arc(CELL / 2 + c * CELL, CELL / 2 + r * CELL, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#8b6914';
      ctx.fill();
    }

    // 棋子
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (board[r][c] === 0) continue;
        const x = CELL / 2 + c * CELL;
        const y = CELL / 2 + r * CELL;
        ctx.beginPath();
        ctx.arc(x, y, CELL / 2 - 3, 0, Math.PI * 2);
        if (board[r][c] === 1) {
          // 黑棋
          const grad = ctx.createRadialGradient(x - 3, y - 3, 2, x, y, CELL / 2 - 3);
          grad.addColorStop(0, '#555');
          grad.addColorStop(1, '#000');
          ctx.fillStyle = grad;
        } else {
          // 白棋
          const grad = ctx.createRadialGradient(x - 3, y - 3, 2, x, y, CELL / 2 - 3);
          grad.addColorStop(0, '#fff');
          grad.addColorStop(1, '#ccc');
          ctx.fillStyle = grad;
        }
        ctx.fill();
        ctx.strokeStyle = board[r][c] === 1 ? '#333' : '#999';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // 最后落子标记
    if (history.length > 0) {
      const last = history[history.length - 1];
      const x = CELL / 2 + last.c * CELL;
      const y = CELL / 2 + last.r * CELL;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = last.player === 1 ? '#fff' : '#000';
      ctx.fill();
    }

    // 胜利高亮
    if (gameOver && winner) {
      // 找出五连
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          if (board[r][c] === winner) {
            const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
            for (const [dr, dc] of dirs) {
              let count = 1;
              const cells = [[r, c]];
              for (let i = 1; i < 5; i++) {
                const nr = r + dr * i;
                const nc = c + dc * i;
                if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE || board[nr][nc] !== winner) break;
                count++;
                cells.push([nr, nc]);
              }
              if (count >= 5) {
                for (const [cr, cc] of cells) {
                  const x = CELL / 2 + cc * CELL;
                  const y = CELL / 2 + cr * CELL;
                  ctx.beginPath();
                  ctx.arc(x, y, CELL / 2 - 3, 0, Math.PI * 2);
                  ctx.strokeStyle = '#ff5a7a';
                  ctx.lineWidth = 3;
                  ctx.stroke();
                }
              }
            }
          }
        }
      }
    }
  }

  // 点击落子
  canvas.addEventListener('click', (e) => {
    if (gameOver) return;
    if (mode === 'ai' && currentPlayer === 2) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = BOARD / rect.width;
    const scaleY = BOARD / rect.height;
    const c = Math.round((e.clientX - rect.left) * scaleX / CELL - 0.5);
    const r = Math.round((e.clientY - rect.top) * scaleY / CELL - 0.5);
    if (r >= 0 && r < SIZE && c >= 0 && c < SIZE) {
      placeStone(r, c);
    }
  });

  // 触屏
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameOver) return;
    if (mode === 'ai' && currentPlayer === 2) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = BOARD / rect.width;
    const scaleY = BOARD / rect.height;
    const touch = e.touches[0];
    const c = Math.round((touch.clientX - rect.left) * scaleX / CELL - 0.5);
    const r = Math.round((touch.clientY - rect.top) * scaleY / CELL - 0.5);
    if (r >= 0 && r < SIZE && c >= 0 && c < SIZE) {
      placeStone(r, c);
    }
  }, { passive: false });

  // 键盘
  document.addEventListener('keydown', (e) => {
    if (e.key === 'z' || e.key === 'Z') { e.preventDefault(); undo(); }
    if (e.key === 'r' || e.key === 'R') { e.preventDefault(); initBoard(); }
  });

  // 模式切换
  document.querySelectorAll('[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
      mode = btn.dataset.mode;
      initBoard();
    });
  });

  // 难度切换
  document.querySelectorAll('[data-diff]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-diff]').forEach(b => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
      difficulty = btn.dataset.diff;
      difficultyEl.textContent = difficulty === 'easy' ? '轻松' : difficulty === 'hard' ? '挑战' : '标准';
    });
  });

  document.getElementById('undo').addEventListener('click', undo);
  document.getElementById('restart').addEventListener('click', initBoard);

  // 初始化
  initBoard();

  // 游戏循环
  function gameLoop() {
    draw();
    requestAnimationFrame(gameLoop);
  }
  gameLoop();
})();
