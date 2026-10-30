// 迷宫 Maze — 原生 JS 实现
(function () {
  'use strict';

  // 尺寸配置：单元格数
  const SIZE_CONFIG = {
    small:  { cols: 11, rows: 11, cell: 40 },
    medium: { cols: 15, rows: 15, cell: 32 },
    large:  { cols: 21, rows: 21, cell: 24 },
  };

  // 状态
  let cols = 15, rows = 15, cellSize = 32;
  let grid = [];        // 每个单元格 { walls: {N,S,E,W}, visited }
  let player = { r: 0, c: 0 };
  let goal = { r: 0, c: 0 };
  let size = 'medium';
  let gameOver = false;
  let startTime = 0;
  let timerId = null;
  let elapsed = 0;
  let stats = { small: 0, medium: 0, large: 0 }; // 仅存最佳时间(秒)

  // DOM
  const mazeEl = document.getElementById('maze');
  const messageEl = document.getElementById('message');
  const timerEl = document.getElementById('timer');
  const sizeEl = document.getElementById('size');
  const bestEl = document.getElementById('best-time');
  const sizeSelect = document.getElementById('size-select');
  const newGameBtn = document.getElementById('new-game');
  const liveEl = document.getElementById('live');

  const SIZE_NAMES = { small: '小', medium: '中', large: '大' };

  // 加载统计
  try {
    const raw = localStorage.getItem('maze-stats');
    if (raw) stats = JSON.parse(raw);
  } catch (e) {}

  function saveStats() {
    try { localStorage.setItem('maze-stats', JSON.stringify(stats)); } catch (e) {}
  }

  function announce(msg) {
    if (liveEl) liveEl.textContent = msg;
  }

  // 生成迷宫（递归回溯）
  function generateMaze(c, r) {
    cols = c; rows = r;
    grid = [];
    for (let i = 0; i < rows; i++) {
      grid.push([]);
      for (let j = 0; j < cols; j++) {
        grid[i].push({ walls: { N: true, S: true, E: true, W: true }, visited: false });
      }
    }

    const dirs = [
      { dr: -1, dc: 0, wall: 'N', opp: 'S' },
      { dr: 1, dc: 0, wall: 'S', opp: 'N' },
      { dr: 0, dc: 1, wall: 'E', opp: 'W' },
      { dr: 0, dc: -1, wall: 'W', opp: 'E' },
    ];

    function visit(r, c) {
      grid[r][c].visited = true;
      const shuffled = dirs.slice().sort(() => Math.random() - 0.5);
      for (const d of shuffled) {
        const nr = r + d.dr, nc = c + d.dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !grid[nr][nc].visited) {
          grid[r][c].walls[d.wall] = false;
          grid[nr][nc].walls[d.opp] = false;
          visit(nr, nc);
        }
      }
    }
    visit(0, 0);

    player = { r: 0, c: 0 };
    goal = { r: rows - 1, c: cols - 1 };
    gameOver = false;
  }

  // 设置单元格尺寸
  function applySize(s) {
    size = s;
    const cfg = SIZE_CONFIG[s];
    cols = cfg.cols; rows = cfg.rows; cellSize = cfg.cell;
    sizeEl.textContent = SIZE_NAMES[s];
  }

  // 渲染迷宫
  function renderMaze() {
    mazeEl.innerHTML = '';
    mazeEl.style.display = 'grid';
    mazeEl.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
    mazeEl.style.gap = '0';
    mazeEl.style.background = '#3b82f6';
    mazeEl.style.width = 'fit-content';
    mazeEl.style.margin = '0 auto';
    mazeEl.style.borderRadius = 'var(--radius)';
    mazeEl.style.overflow = 'hidden';

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = grid[r][c];
        const cellEl = document.createElement('div');
        cellEl.className = 'maze-cell';
        cellEl.style.width = cellSize + 'px';
        cellEl.style.height = cellSize + 'px';
        cellEl.style.position = 'relative';
        cellEl.style.background = '#080d18';

        // 边框（墙壁）
        cellEl.style.borderTop = cell.walls.N ? '2px solid #7cff6b' : '2px solid transparent';
        cellEl.style.borderRight = cell.walls.E ? '2px solid #7cff6b' : '2px solid transparent';
        cellEl.style.borderBottom = cell.walls.S ? '2px solid #7cff6b' : '2px solid transparent';
        cellEl.style.borderLeft = cell.walls.W ? '2px solid #7cff6b' : '2px solid transparent';
        cellEl.style.boxSizing = 'border-box';

        // 起点
        if (r === 0 && c === 0) {
          const startMark = document.createElement('div');
          startMark.className = 'maze-mark start';
          startMark.style.position = 'absolute';
          startMark.style.top = '50%';
          startMark.style.left = '50%';
          startMark.style.width = (cellSize * 0.35) + 'px';
          startMark.style.height = (cellSize * 0.35) + 'px';
          startMark.style.background = '#7cff6b';
          startMark.style.borderRadius = '50%';
          startMark.style.transform = 'translate(-50%, -50%)';
          startMark.setAttribute('aria-hidden', 'true');
          cellEl.appendChild(startMark);
        }

        // 终点
        if (r === goal.r && c === goal.c) {
          const goalMark = document.createElement('div');
          goalMark.className = 'maze-mark goal';
          goalMark.style.position = 'absolute';
          goalMark.style.top = '50%';
          goalMark.style.left = '50%';
          goalMark.style.width = (cellSize * 0.45) + 'px';
          goalMark.style.height = (cellSize * 0.45) + 'px';
          goalMark.style.background = '#ff5a7a';
          goalMark.style.borderRadius = '50%';
          goalMark.style.transform = 'translate(-50%, -50%)';
          goalMark.setAttribute('aria-hidden', 'true');
          cellEl.appendChild(goalMark);
        }

        // 玩家
        if (r === player.r && c === player.c && !gameOver) {
          const playerMark = document.createElement('div');
          playerMark.className = 'maze-mark player';
          playerMark.id = 'maze-player';
          playerMark.style.position = 'absolute';
          playerMark.style.top = '50%';
          playerMark.style.left = '50%';
          playerMark.style.width = (cellSize * 0.5) + 'px';
          playerMark.style.height = (cellSize * 0.5) + 'px';
          playerMark.style.background = '#6ee7ff';
          playerMark.style.borderRadius = '50%';
          playerMark.style.transform = 'translate(-50%, -50%)';
          playerMark.style.boxShadow = '0 0 12px rgba(110,231,255,0.8)';
          playerMark.setAttribute('aria-label', '玩家位置');
          cellEl.appendChild(playerMark);
        }

        mazeEl.appendChild(cellEl);
      }
    }
  }

  // 移动玩家
  function move(dr, dc) {
    if (gameOver) return;
    const nr = player.r + dr, nc = player.c + dc;
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) return;

    const wall = dr === -1 ? 'N' : dr === 1 ? 'S' : dc === 1 ? 'E' : 'W';
    if (grid[player.r][player.c].walls[wall]) return;

    player.r = nr; player.c = nc;
    renderMaze();
    announce('移动到 (' + (nr + 1) + ',' + (nc + 1) + ')');

    if (player.r === goal.r && player.c === goal.c) {
      gameOver = true;
      stopTimer();
      const t = Math.floor(elapsed / 1000);
      if (stats[size] === 0 || t < stats[size]) {
        stats[size] = t;
        saveStats();
        updateBest();
        announce('恭喜到达终点，新最佳时间！');
      } else {
        announce('恭喜到达终点！');
      }
      messageEl.textContent = '🎉 到达终点！用时 ' + formatTime(elapsed);
    }
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
    const b = stats[size];
    bestEl.textContent = b ? formatTime(b * 1000) : '-';
  }

  // 新局
  function newGame() {
    gameOver = false;
    stopTimer();
    elapsed = 0;
    timerEl.textContent = '00:00';
    messageEl.textContent = '';
    generateMaze(cols, rows);
    renderMaze();
    updateBest();
    announce('新局开始，迷宫尺寸：' + SIZE_NAMES[size]);
    startTimer();
  }

  // 键盘
  document.addEventListener('keydown', (e) => {
    if (gameOver) return;
    if (e.key === 'ArrowUp') { e.preventDefault(); move(-1, 0); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); move(1, 0); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); move(0, -1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); move(0, 1); }
  });

  // 控件
  sizeSelect.addEventListener('change', () => {
    applySize(sizeSelect.value);
    newGame();
  });
  newGameBtn.addEventListener('click', newGame);

  // 初始化
  applySize(size);
  updateBest();
  newGame();
})();
