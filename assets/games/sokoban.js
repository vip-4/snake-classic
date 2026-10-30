// 推箱子 Sokoban — 原生 JS 实现
(function () {
  'use strict';

  // 关卡数据: #墙, $箱子, .目标, @玩家, *箱子在目标, +玩家在目标, 空格地板
  const LEVELS = [
    "    ####\n    #  #\n    # $ #\n  ###  ##\n  #  $  #\n### # ## #  ######\n#   # ## ####  ..#\n# $  $          .#\n##### ### #@##  ..#\n    #     #########\n    #######",
    "############\n#          #\n# #######  #\n# #     #  #\n# # $ $ #  #\n# #  $  #  #\n# ### ###  #\n#     @    #\n#  ....... #\n############",
    "  ####\n  #  #\n  # $##\n  # $ #\n### $ #\n#  .  #\n# #.###\n#  .  #\n#  ### #\n#     @#\n#######",
    "########\n#      #\n#  ##  #\n# $  $ #\n#  ##  #\n# .  . #\n# .@ . #\n#  ##  #\n#      #\n########",
    "  #####\n###   ##\n#  $   #\n#  $ $ #\n#  #   #\n## # # ##\n # . . .#\n # .@.  #\n ########",
  ];

  // 简化：使用生成的关卡
  const SIMPLE_LEVELS = [
    // Level 1
    [
      "########",
      "#      #",
      "#  $   #",
      "#  .   #",
      "#  @   #",
      "########",
    ],
    // Level 2
    [
      "########",
      "#      #",
      "#  $ $ #",
      "#  . . #",
      "#  @   #",
      "########",
    ],
    // Level 3
    [
      "#########",
      "#       #",
      "#  $ $  #",
      "#  . .  #",
      "#   @   #",
      "#########",
    ],
    // Level 4
    [
      "##########",
      "#        #",
      "#  $  $  #",
      "#  .  .  #",
      "#    @   #",
      "##########",
    ],
    // Level 5
    [
      "##########",
      "#        #",
      "#  $ $ $ #",
      "#  . . . #",
      "#    @   #",
      "##########",
    ],
  ];

  // 生成更多关卡（递增难度）
  function generateLevels() {
    const levels = [];
    for (let i = 0; i < 50; i++) {
      const size = 6 + Math.floor(i / 5);
      const boxCount = 1 + Math.floor(i / 8);
      const level = generateLevel(size, boxCount, i);
      levels.push(level);
    }
    return levels;
  }

  function generateLevel(size, boxCount, seed) {
    // 简单关卡生成：边界 + 随机箱子和目标
    const grid = [];
    for (let r = 0; r < size; r++) {
      const row = [];
      for (let c = 0; c < size; c++) {
        if (r === 0 || r === size - 1 || c === 0 || c === size - 1) {
          row.push('#');
        } else {
          row.push(' ');
        }
      }
      grid.push(row);
    }

    // 放置目标点
    const targets = [];
    let placed = 0;
    const rng = (s) => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    let s = seed + 1;
    while (placed < boxCount) {
      const r = 1 + Math.floor(rng(s++) * (size - 2));
      const c = 1 + Math.floor(rng(s++) * (size - 2));
      if (grid[r][c] === ' ') {
        grid[r][c] = '.';
        targets.push([r, c]);
        placed++;
      }
    }

    // 放置箱子（不在目标上）
    placed = 0;
    while (placed < boxCount) {
      const r = 1 + Math.floor(rng(s++) * (size - 2));
      const c = 1 + Math.floor(rng(s++) * (size - 2));
      if (grid[r][c] === ' ') {
        grid[r][c] = '$';
        placed++;
      }
    }

    // 放置玩家
    let playerPlaced = false;
    while (!playerPlaced) {
      const r = 1 + Math.floor(rng(s++) * (size - 2));
      const c = 1 + Math.floor(rng(s++) * (size - 2));
      if (grid[r][c] === ' ' || grid[r][c] === '.') {
        if (grid[r][c] === '.') grid[r][c] = '+';
        else grid[r][c] = '@';
        playerPlaced = true;
      }
    }

    return grid.map(row => row.join(''));
  }

  const ALL_LEVELS = generateLevels();

  // 状态
  let currentLevel = 0;
  let grid = [];
  let playerPos = { r: 0, c: 0 };
  let moves = 0;
  let history = [];
  let gameOver = false;

  // DOM
  const canvas = document.getElementById('sokoban-canvas');
  const ctx = canvas.getContext('2d');
  const levelEl = document.getElementById('level');
  const movesEl = document.getElementById('moves');
  const bestEl = document.getElementById('best');
  const liveEl = document.getElementById('live');

  const CELL = 32;
  const COLORS = {
    wall: '#2a3a5a',
    floor: '#0b1220',
    target: '#ff7ab8',
    box: '#ffb45e',
    boxOnTarget: '#7cff6b',
    player: '#6ee7ff',
  };

  function loadLevel(idx) {
    currentLevel = idx;
    const levelData = ALL_LEVELS[idx];
    grid = levelData.map(row => row.split(''));
    // 找玩家位置
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (grid[r][c] === '@' || grid[r][c] === '+') {
          playerPos = { r, c };
        }
      }
    }
    moves = 0;
    history = [];
    gameOver = false;
    updateHUD();
    announce(`第 ${idx + 1} 关`);
  }

  function move(dr, dc) {
    if (gameOver) return;
    const nr = playerPos.r + dr;
    const nc = playerPos.c + dc;
    if (nr < 0 || nr >= grid.length || nc < 0 || nc >= grid[nr].length) return;
    const cell = grid[nr][nc];

    if (cell === '#' ) return; // 墙

    if (cell === '$' || cell === '*') {
      // 推箱子
      const br = nr + dr;
      const bc = nc + dc;
      if (br < 0 || br >= grid.length || bc < 0 || bc >= grid[br].length) return;
      const bcell = grid[br][bc];
      if (bcell === '#' || bcell === '$' || bcell === '*') return; // 不能推

      // 保存历史
      history.push({ grid: grid.map(row => row.slice()), player: { ...playerPos }, moves });

      // 移动箱子
      grid[br][bc] = (bcell === '.' || bcell === '+') ? '*' : '$';
      grid[nr][nc] = (cell === '*') ? '.' : ' ';
      // 移动玩家
      const oldCell = grid[playerPos.r][playerPos.c];
      grid[playerPos.r][playerPos.c] = (oldCell === '+' || oldCell === '@') ? (oldCell === '+' ? '.' : ' ') : oldCell;
      // Actually, let me handle this more carefully
    }

    // 保存历史（如果不是推箱子的情况，上面已经保存了；这里处理普通移动）
    if (!(cell === '$' || cell === '*')) {
      history.push({ grid: grid.map(row => row.slice()), player: { ...playerPos }, moves });
    }

    // 移动玩家
    const oldPlayerCell = grid[playerPos.r][playerPos.c];
    if (oldPlayerCell === '@') grid[playerPos.r][playerPos.c] = ' ';
    else if (oldPlayerCell === '+') grid[playerPos.r][playerPos.c] = '.';

    playerPos = { r: nr, c: nc };
    const newCell = grid[nr][nc];
    if (newCell === '.') grid[nr][nc] = '+';
    else if (newCell === ' ') grid[nr][nc] = '@';
    else if (newCell === '$') grid[nr][nc] = '@'; // shouldn't happen
    else if (newCell === '*') grid[nr][nc] = '+'; // shouldn't happen

    moves++;
    updateHUD();
    checkWin();
  }

  function undo() {
    if (history.length === 0) return;
    const state = history.pop();
    grid = state.grid.map(row => row.slice());
    playerPos = { ...state.player };
    moves = state.moves;
    gameOver = false;
    updateHUD();
    announce('已撤销');
  }

  function checkWin() {
    // 检查所有目标点上是否有箱子
    let win = true;
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (grid[r][c] === '.' || grid[r][c] === '+') {
          win = false;
          break;
        }
      }
      if (!win) break;
    }
    if (win && !gameOver) {
      gameOver = true;
      // 保存最少步数
      const key = `sokoban-best-${currentLevel}`;
      const prev = parseInt(localStorage.getItem(key) || '9999', 10);
      if (moves < prev) {
        localStorage.setItem(key, moves);
        bestEl.textContent = moves;
        announce(`新纪录！${moves} 步`);
      } else {
        bestEl.textContent = prev === 9999 ? '-' : prev;
        announce(`通关！${moves} 步`);
      }
    }
  }

  function updateHUD() {
    levelEl.textContent = currentLevel + 1;
    movesEl.textContent = moves;
    const key = `sokoban-best-${currentLevel}`;
    const prev = parseInt(localStorage.getItem(key) || '9999', 10);
    bestEl.textContent = prev === 9999 ? '-' : prev;
  }

  function announce(msg) {
    if (liveEl) liveEl.textContent = msg;
  }

  // 绘制
  function draw() {
    const rows = grid.length;
    const cols = grid[0].length;
    canvas.width = cols * CELL;
    canvas.height = rows * CELL;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = grid[r][c];
        const x = c * CELL;
        const y = r * CELL;

        // 地板
        ctx.fillStyle = COLORS.floor;
        ctx.fillRect(x, y, CELL, CELL);

        if (cell === '#') {
          ctx.fillStyle = COLORS.wall;
          ctx.fillRect(x + 2, y + 2, CELL - 4, CELL - 4);
          ctx.fillStyle = 'rgba(255,255,255,0.05)';
          ctx.fillRect(x + 2, y + 2, CELL - 4, 4);
        } else if (cell === '.' || cell === '+') {
          // 目标点
          ctx.beginPath();
          ctx.arc(x + CELL / 2, y + CELL / 2, CELL / 6, 0, Math.PI * 2);
          ctx.fillStyle = COLORS.target;
          ctx.fill();
        }

        if (cell === '$' || cell === '*') {
          // 箱子
          ctx.fillStyle = (cell === '*') ? COLORS.boxOnTarget : COLORS.box;
          ctx.fillRect(x + 4, y + 4, CELL - 8, CELL - 8);
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          ctx.fillRect(x + 4, y + 4, CELL - 8, 4);
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fillRect(x + 4, y + CELL - 8, CELL - 8, 4);
        }

        if (cell === '@' || cell === '+') {
          // 玩家
          ctx.beginPath();
          ctx.arc(x + CELL / 2, y + CELL / 2, CELL / 3, 0, Math.PI * 2);
          ctx.fillStyle = COLORS.player;
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          ctx.beginPath();
          ctx.arc(x + CELL / 2 - 2, y + CELL / 2 - 2, CELL / 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  // 键盘
  document.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowUp': case 'w': case 'W': e.preventDefault(); move(-1, 0); break;
      case 'ArrowDown': case 's': case 'S': e.preventDefault(); move(1, 0); break;
      case 'ArrowLeft': case 'a': case 'A': e.preventDefault(); move(0, -1); break;
      case 'ArrowRight': case 'd': case 'D': e.preventDefault(); move(0, 1); break;
      case 'z': case 'Z': e.preventDefault(); undo(); break;
      case 'r': case 'R': e.preventDefault(); loadLevel(currentLevel); break;
      case 'q': case 'Q': e.preventDefault(); if (currentLevel > 0) loadLevel(currentLevel - 1); break;
      case 'e': case 'E': e.preventDefault(); if (currentLevel < ALL_LEVELS.length - 1) loadLevel(currentLevel + 1); break;
    }
  });

  // 触屏按钮
  document.querySelectorAll('.sokoban-touch button').forEach(btn => {
    btn.addEventListener('click', () => {
      switch (btn.dataset.dir) {
        case 'up': move(-1, 0); break;
        case 'down': move(1, 0); break;
        case 'left': move(0, -1); break;
        case 'right': move(0, 1); break;
      }
    });
  });

  // 按钮
  document.getElementById('undo').addEventListener('click', undo);
  document.getElementById('reset').addEventListener('click', () => loadLevel(currentLevel));
  document.getElementById('prev').addEventListener('click', () => { if (currentLevel > 0) loadLevel(currentLevel - 1); });
  document.getElementById('next').addEventListener('click', () => { if (currentLevel < ALL_LEVELS.length - 1) loadLevel(currentLevel + 1); });

  // 画布点击
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const c = Math.floor((e.clientX - rect.left) * scaleX / CELL);
    const r = Math.floor((e.clientY - rect.top) * scaleY / CELL);
    // 点击相邻格子移动
    const dr = r - playerPos.r;
    const dc = c - playerPos.c;
    if (Math.abs(dr) + Math.abs(dc) === 1) {
      move(dr, dc);
    }
  });

  // 初始化
  loadLevel(0);

  // 游戏循环（仅绘制）
  function gameLoop() {
    draw();
    requestAnimationFrame(gameLoop);
  }
  gameLoop();
})();
