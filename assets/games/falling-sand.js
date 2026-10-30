// 沙盘模拟 Falling Sand — 原生 JS 实现
(function () {
  'use strict';

  const canvas = document.getElementById('sand-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const COLS = 200;
  const ROWS = 150;
  const CELL = W / COLS;

  // 材质常量
  const EMPTY = 0;
  const SAND = 1;
  const WATER = 2;
  const FIRE = 3;
  const STONE = 4;
  const WOOD = 5;
  const STEAM = 6;
  const SMOKE = 7;
  const ACID = 8;

  const COLORS = {
    [EMPTY]: '#080d18',
    [SAND]: '#e2c08d',
    [WATER]: '#4a9eff',
    [FIRE]: '#ff5a3c',
    [STONE]: '#888888',
    [WOOD]: '#8b5a2b',
    [STEAM]: '#cccccc',
    [SMOKE]: '#666666',
    [ACID]: '#7cff6b',
  };

  // 网格
  let grid = [];
  let updated = [];
  let material = SAND;
  let isDrawing = false;
  let paused = false;
  let particleCount = 0;

  // DOM
  const countEl = document.getElementById('particle-count');
  const materialEl = document.getElementById('current-material');
  const liveEl = document.getElementById('live');
  const clearBtn = document.getElementById('clear');
  const pauseBtn = document.getElementById('pause');

  const MATERIAL_NAMES = { [SAND]: '沙', [WATER]: '水', [FIRE]: '火', [STONE]: '石', [WOOD]: '木', [STEAM]: '汽', [SMOKE]: '烟', [ACID]: '酸' };

  function initGrid() {
    grid = [];
    updated = [];
    for (let r = 0; r < ROWS; r++) {
      grid.push(new Array(COLS).fill(EMPTY));
      updated.push(new Array(COLS).fill(false));
    }
  }

  function countParticles() {
    let count = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] !== EMPTY) count++;
      }
    }
    particleCount = count;
    countEl.textContent = count;
  }

  function announce(msg) {
    if (liveEl) liveEl.textContent = msg;
  }

  // 更新规则
  function updateCell(r, c) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
    if (updated[r][c]) return;

    const mat = grid[r][c];
    if (mat === EMPTY) return;

    updated[r][c] = true;

    switch (mat) {
      case SAND:
        // 沙下落
        if (r + 1 < ROWS && grid[r + 1][c] === EMPTY) {
          grid[r + 1][c] = SAND;
          grid[r][c] = EMPTY;
          updated[r + 1][c] = true;
        } else if (r + 1 < ROWS && (grid[r + 1][c] === WATER || grid[r + 1][c] === ACID)) {
          // 沙沉入水/酸中
          grid[r][c] = grid[r + 1][c];
          grid[r + 1][c] = SAND;
          updated[r + 1][c] = true;
        } else if (r + 1 < ROWS && c - 1 >= 0 && grid[r + 1][c - 1] === EMPTY) {
          grid[r + 1][c - 1] = SAND;
          grid[r][c] = EMPTY;
          updated[r + 1][c - 1] = true;
        } else if (r + 1 < ROWS && c + 1 < COLS && grid[r + 1][c + 1] === EMPTY) {
          grid[r + 1][c + 1] = SAND;
          grid[r][c] = EMPTY;
          updated[r + 1][c + 1] = true;
        }
        break;

      case WATER:
        // 水流动
        if (r + 1 < ROWS && grid[r + 1][c] === EMPTY) {
          grid[r + 1][c] = WATER;
          grid[r][c] = EMPTY;
          updated[r + 1][c] = true;
        } else {
          // 水平流动
          const dir = Math.random() < 0.5 ? -1 : 1;
          const nc = c + dir;
          if (nc >= 0 && nc < COLS && grid[r][nc] === EMPTY) {
            grid[r][nc] = WATER;
            grid[r][c] = EMPTY;
            updated[r][nc] = true;
          } else {
            const nc2 = c - dir;
            if (nc2 >= 0 && nc2 < COLS && grid[r][nc2] === EMPTY) {
              grid[r][nc2] = WATER;
              grid[r][c] = EMPTY;
              updated[r][nc2] = true;
            }
          }
        }
        break;

      case FIRE:
        // 火向上飘，燃烧木头
        if (Math.random() < 0.3) {
          // 产生烟
          if (r - 1 >= 0 && grid[r - 1][c] === EMPTY) {
            grid[r - 1][c] = SMOKE;
            updated[r - 1][c] = true;
          }
        }
        // 燃烧周围木头
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && grid[nr][nc] === WOOD) {
              if (Math.random() < 0.1) {
                grid[nr][nc] = FIRE;
                updated[nr][nc] = true;
              }
            }
            // 遇水熄灭
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && grid[nr][nc] === WATER) {
              if (Math.random() < 0.3) {
                grid[r][c] = STEAM;
                updated[r][c] = true;
                return;
              }
            }
          }
        }
        // 火向上移动
        if (r - 1 >= 0 && grid[r - 1][c] === EMPTY && Math.random() < 0.4) {
          grid[r - 1][c] = FIRE;
          grid[r][c] = EMPTY;
          updated[r - 1][c] = true;
        } else if (Math.random() < 0.1) {
          grid[r][c] = EMPTY; // 火熄灭
        }
        break;

      case STONE:
        // 石不动
        break;

      case WOOD:
        // 木不动（可燃）
        break;

      case STEAM:
        // 蒸汽上升
        if (r - 1 >= 0 && grid[r - 1][c] === EMPTY) {
          grid[r - 1][c] = STEAM;
          grid[r][c] = EMPTY;
          updated[r - 1][c] = true;
        } else {
          // 水平扩散
          const dir = Math.random() < 0.5 ? -1 : 1;
          const nc = c + dir;
          if (nc >= 0 && nc < COLS && grid[r][nc] === EMPTY) {
            grid[r][nc] = STEAM;
            grid[r][c] = EMPTY;
            updated[r][nc] = true;
          }
        }
        // 蒸汽消散
        if (Math.random() < 0.02) grid[r][c] = EMPTY;
        break;

      case SMOKE:
        // 烟上升
        if (r - 1 >= 0 && grid[r - 1][c] === EMPTY) {
          grid[r - 1][c] = SMOKE;
          grid[r][c] = EMPTY;
          updated[r - 1][c] = true;
        } else {
          const dir = Math.random() < 0.5 ? -1 : 1;
          const nc = c + dir;
          if (nc >= 0 && nc < COLS && r - 1 >= 0 && grid[r - 1][nc] === EMPTY) {
            grid[r - 1][nc] = SMOKE;
            grid[r][c] = EMPTY;
            updated[r - 1][nc] = true;
          }
        }
        if (Math.random() < 0.03) grid[r][c] = EMPTY;
        break;

      case ACID:
        // 酸流动并腐蚀
        if (r + 1 < ROWS && grid[r + 1][c] === EMPTY) {
          grid[r + 1][c] = ACID;
          grid[r][c] = EMPTY;
          updated[r + 1][c] = true;
        } else {
          // 腐蚀周围非石/酸材质
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
                if (grid[nr][nc] !== EMPTY && grid[nr][nc] !== STONE && grid[nr][nc] !== ACID && Math.random() < 0.05) {
                  grid[nr][nc] = EMPTY;
                }
              }
            }
          }
          // 水平流动
          const dir = Math.random() < 0.5 ? -1 : 1;
          const nc = c + dir;
          if (nc >= 0 && nc < COLS && grid[r][nc] === EMPTY) {
            grid[r][nc] = ACID;
            grid[r][c] = EMPTY;
            updated[r][nc] = true;
          }
        }
        break;
    }
  }

  // 绘制
  function draw() {
    const imageData = ctx.createImageData(W, H);
    const data = imageData.data;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const mat = grid[r][c];
        const color = COLORS[mat];
        const idx = (r * COLS + c) * 4 * CELL; // approximate, will use fillRect instead
      }
    }
    // 使用 fillRect 绘制
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = COLORS[EMPTY];
    ctx.fillRect(0, 0, W, H);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const mat = grid[r][c];
        if (mat === EMPTY) continue;
        ctx.fillStyle = COLORS[mat];
        ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
      }
    }
  }

  // 更新
  function update() {
    // 重置 updated
    for (let r = 0; r < ROWS; r++) {
      updated[r].fill(false);
    }

    // 从下到上更新
    for (let r = ROWS - 1; r >= 0; r--) {
      // 随机方向
      const leftToRight = Math.random() < 0.5;
      if (leftToRight) {
        for (let c = 0; c < COLS; c++) {
          updateCell(r, c);
        }
      } else {
        for (let c = COLS - 1; c >= 0; c--) {
          updateCell(r, c);
        }
      }
    }
  }

  // 绘制粒子
  function getCellFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const c = Math.floor((e.clientX - rect.left) * scaleX / CELL);
    const r = Math.floor((e.clientY - rect.top) * scaleY / CELL);
    return { r, c };
  }

  function drawBrush(r, c, size) {
    for (let dr = -size; dr <= size; dr++) {
      for (let dc = -size; dc <= size; dc++) {
        if (dr * dr + dc * dc <= size * size) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
            if (material === EMPTY) {
              grid[nr][nc] = EMPTY;
            } else {
              grid[nr][nc] = material;
            }
          }
        }
      }
    }
  }

  // 鼠标事件
  canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    const { r, c } = getCellFromEvent(e);
    drawBrush(r, c, 2);
  });
  canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    const { r, c } = getCellFromEvent(e);
    drawBrush(r, c, 2);
  });
  canvas.addEventListener('mouseup', () => { isDrawing = false; });
  canvas.addEventListener('mouseleave', () => { isDrawing = false; });

  // 触屏
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    isDrawing = true;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const c = Math.floor((touch.clientX - rect.left) * scaleX / CELL);
    const r = Math.floor((touch.clientY - rect.top) * scaleY / CELL);
    drawBrush(r, c, 3);
  }, { passive: false });
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const c = Math.floor((touch.clientX - rect.left) * scaleX / CELL);
    const r = Math.floor((touch.clientY - rect.top) * scaleY / CELL);
    drawBrush(r, c, 3);
  }, { passive: false });
  canvas.addEventListener('touchend', () => { isDrawing = false; });

  // 材质选择
  document.querySelectorAll('[data-material]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-material]').forEach(b => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
      material = parseInt(btn.dataset.material === 'sand' ? SAND :
        btn.dataset.material === 'water' ? WATER :
        btn.dataset.material === 'fire' ? FIRE :
        btn.dataset.material === 'stone' ? STONE :
        btn.dataset.material === 'wood' ? WOOD :
        btn.dataset.material === 'steam' ? STEAM :
        btn.dataset.material === 'smoke' ? SMOKE :
        btn.dataset.material === 'acid' ? ACID : SAND, 10);
      // Use string mapping instead
      const matMap = { sand: SAND, water: WATER, fire: FIRE, stone: STONE, wood: WOOD, steam: STEAM, smoke: SMOKE, acid: ACID };
      material = matMap[btn.dataset.material];
      materialEl.textContent = MATERIAL_NAMES[material];
      announce('选择材质: ' + MATERIAL_NAMES[material]);
    });
  });

  // 清空
  clearBtn.addEventListener('click', () => {
    initGrid();
    announce('已清空');
  });

  // 暂停
  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    pauseBtn.setAttribute('aria-pressed', paused);
    pauseBtn.querySelector('span').textContent = paused ? '继续' : '暂停';
    announce(paused ? '暂停' : '继续');
  });

  // 游戏循环
  function gameLoop() {
    if (!paused) {
      update();
    }
    draw();
    countParticles();
    requestAnimationFrame(gameLoop);
  }

  // 初始化
  initGrid();
  gameLoop();
})();
