// 康威生命游戏 — 原生 JS 实现
(function () {
  'use strict';

  const canvas = document.getElementById('gol-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  let cellSize = 12;
  let cols = Math.floor(W / cellSize);
  let rows = Math.floor(H / cellSize);
  let grid = [];
  let running = false;
  let generation = 0;
  let population = 0;
  let speed = 10;
  let tool = 'draw'; // 'draw' or 'erase'
  let isDrawing = false;
  let animId = null;
  let lastTime = 0;

  // DOM
  const genEl = document.getElementById('generation');
  const popEl = document.getElementById('population');
  const speedEl = document.getElementById('speed');
  const liveEl = document.getElementById('live');
  const playBtn = document.getElementById('play-btn');
  const stepBtn = document.getElementById('step');
  const clearBtn = document.getElementById('clear');
  const randomBtn = document.getElementById('random');
  const speedSlider = document.getElementById('speed-slider');
  const zoomSlider = document.getElementById('zoom-slider');

  // 预设图案
  const PRESETS = {
    glider: [
      [0, 1, 0],
      [0, 0, 1],
      [1, 1, 1],
    ],
    lwss: [
      [0, 1, 1, 1, 1],
      [1, 0, 0, 0, 1],
      [0, 0, 0, 0, 1],
      [1, 0, 0, 1, 0],
    ],
    pulsar: [
      [0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1],
      [0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0],
      [1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1],
      [0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
    gosper: [
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0],
      [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
  };

  // 初始化网格
  function initGrid() {
    grid = [];
    for (let r = 0; r < rows; r++) {
      grid.push(new Array(cols).fill(0));
    }
    generation = 0;
    population = 0;
    updateHUD();
  }

  function resizeGrid() {
    cols = Math.floor(W / cellSize);
    rows = Math.floor(H / cellSize);
    // 保留现有数据（如果可能）
    const newGrid = [];
    for (let r = 0; r < rows; r++) {
      newGrid.push(new Array(cols).fill(0));
      if (grid[r]) {
        for (let c = 0; c < Math.min(cols, grid[r].length); c++) {
          newGrid[r][c] = grid[r][c];
        }
      }
    }
    grid = newGrid;
  }

  // 绘制
  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#080d18';
    ctx.fillRect(0, 0, W, H);

    // 网格线
    ctx.strokeStyle = 'rgba(148,173,230,0.08)';
    ctx.lineWidth = 0.5;
    for (let c = 0; c <= cols; c++) {
      ctx.beginPath();
      ctx.moveTo(c * cellSize, 0);
      ctx.lineTo(c * cellSize, rows * cellSize);
      ctx.stroke();
    }
    for (let r = 0; r <= rows; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * cellSize);
      ctx.lineTo(cols * cellSize, r * cellSize);
      ctx.stroke();
    }

    // 细胞
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c]) {
          ctx.fillStyle = '#7cff6b';
          ctx.fillRect(c * cellSize + 1, r * cellSize + 1, cellSize - 2, cellSize - 2);
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fillRect(c * cellSize + 1, r * cellSize + 1, cellSize - 2, 2);
        }
      }
    }
  }

  // 计算下一代
  function step() {
    const newGrid = [];
    let newPop = 0;
    for (let r = 0; r < rows; r++) {
      newGrid.push(new Array(cols).fill(0));
      for (let c = 0; c < cols; c++) {
        let neighbors = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc]) {
              neighbors++;
            }
          }
        }
        if (grid[r][c]) {
          newGrid[r][c] = (neighbors === 2 || neighbors === 3) ? 1 : 0;
        } else {
          newGrid[r][c] = (neighbors === 3) ? 1 : 0;
        }
        if (newGrid[r][c]) newPop++;
      }
    }
    grid = newGrid;
    generation++;
    population = newPop;
    updateHUD();
  }

  function updateHUD() {
    genEl.textContent = generation;
    popEl.textContent = population;
    speedEl.textContent = speed;
  }

  function announce(msg) {
    if (liveEl) liveEl.textContent = msg;
  }

  // 画笔
  function setCell(r, c, value) {
    if (r >= 0 && r < rows && c >= 0 && c < cols) {
      grid[r][c] = value;
    }
  }

  function getCellFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const c = Math.floor((e.clientX - rect.left) * scaleX / cellSize);
    const r = Math.floor((e.clientY - rect.top) * scaleY / cellSize);
    return { r, c };
  }

  // 鼠标/触屏绘制
  canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    const { r, c } = getCellFromEvent(e);
    setCell(r, c, tool === 'draw' ? 1 : 0);
    draw();
  });
  canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    const { r, c } = getCellFromEvent(e);
    setCell(r, c, tool === 'draw' ? 1 : 0);
    draw();
  });
  canvas.addEventListener('mouseup', () => { isDrawing = false; });
  canvas.addEventListener('mouseleave', () => { isDrawing = false; });

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    isDrawing = true;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const c = Math.floor((touch.clientX - rect.left) * scaleX / cellSize);
    const r = Math.floor((touch.clientY - rect.top) * scaleY / cellSize);
    setCell(r, c, tool === 'draw' ? 1 : 0);
    draw();
  }, { passive: false });
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const c = Math.floor((touch.clientX - rect.left) * scaleX / cellSize);
    const r = Math.floor((touch.clientY - rect.top) * scaleY / cellSize);
    setCell(r, c, tool === 'draw' ? 1 : 0);
    draw();
  }, { passive: false });
  canvas.addEventListener('touchend', () => { isDrawing = false; });

  // 工具切换
  document.querySelectorAll('[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-tool]').forEach(b => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
      tool = btn.dataset.tool;
    });
  });

  // 预设图案
  document.querySelectorAll('[data-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = PRESETS[btn.dataset.preset];
      if (!preset) return;
      clear();
      const startR = Math.floor((rows - preset.length) / 2);
      const startC = Math.floor((cols - preset[0].length) / 2);
      for (let r = 0; r < preset.length; r++) {
        for (let c = 0; c < preset[r].length; c++) {
          if (preset[r][c]) {
            setCell(startR + r, startC + c, 1);
          }
        }
      }
      draw();
      announce(`已加载 ${btn.textContent} 图案`);
    });
  });

  // 播放/暂停
  playBtn.addEventListener('click', () => {
    running = !running;
    playBtn.setAttribute('aria-pressed', running);
    playBtn.querySelector('span').textContent = running ? '暂停' : '播放';
    playBtn.firstChild.textContent = running ? '⏸ ' : '▶ ';
    if (running) {
      lastTime = performance.now();
      gameLoop();
    }
  });

  // 单步
  stepBtn.addEventListener('click', () => {
    if (!running) {
      step();
      draw();
    }
  });

  // 清空
  clearBtn.addEventListener('click', () => {
    running = false;
    playBtn.setAttribute('aria-pressed', 'false');
    playBtn.querySelector('span').textContent = '播放';
    playBtn.firstChild.textContent = '▶ ';
    initGrid();
    draw();
    announce('已清空');
  });

  // 随机
  randomBtn.addEventListener('click', () => {
    running = false;
    playBtn.setAttribute('aria-pressed', 'false');
    playBtn.querySelector('span').textContent = '播放';
    playBtn.firstChild.textContent = '▶ ';
    initGrid();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() < 0.2) grid[r][c] = 1;
      }
    }
    countPopulation();
    draw();
    announce('已随机生成');
  });

  // 速度
  speedSlider.addEventListener('input', () => {
    speed = parseInt(speedSlider.value, 10);
    speedEl.textContent = speed;
  });

  // 缩放
  zoomSlider.addEventListener('input', () => {
    cellSize = parseInt(zoomSlider.value, 10);
    resizeGrid();
    draw();
  });

  function countPopulation() {
    population = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c]) population++;
      }
    }
    popEl.textContent = population;
  }

  // 游戏循环
  function gameLoop(time) {
    if (!running) return;
    const elapsed = time - lastTime;
    const interval = 1000 / speed;
    if (elapsed > interval) {
      step();
      countPopulation();
      draw();
      lastTime = time - (elapsed % interval);
    }
    animId = requestAnimationFrame(gameLoop);
  }

  // 初始化
  initGrid();
  draw();
})();
