// 跑酷 Endless Runner — 原生 JS 实现
(function () {
  'use strict';

  const canvas = document.getElementById('runner-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const GROUND_Y = H - 40;

  // 状态
  let player = { x: 60, y: GROUND_Y - 30, w: 20, h: 30, vy: 0, onGround: true, sliding: false, doubleJump: false, frame: 0 };
  let obstacles = [];
  let coins = [];
  let particles = [];
  let bgLayers = [];
  let distance = 0;
  let coinCount = 0;
  let speed = 5;
  let gameOver = false;
  let paused = false;
  let started = false;
  let animId = null;
  let bestDistance = parseInt(localStorage.getItem('runner-best-dist') || '0', 10);
  let bestCoins = parseInt(localStorage.getItem('runner-best-coins') || '0', 10);
  let obstacleTimer = 0;
  let coinTimer = 0;

  // DOM
  const distanceEl = document.getElementById('distance');
  const coinsEl = document.getElementById('coins');
  const speedEl = document.getElementById('speed');
  const bestEl = document.getElementById('best');
  const liveEl = document.getElementById('live');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayText = document.getElementById('overlay-text');
  const overlayAction = document.getElementById('overlay-action');
  const overlayKicker = document.getElementById('overlay-kicker');

  // 视差背景层
  function initBg() {
    bgLayers = [
      { speed: 0.2, items: [], color: 'rgba(110,231,255,0.05)', size: 60 },
      { speed: 0.5, items: [], color: 'rgba(124,255,107,0.06)', size: 40 },
      { speed: 0.8, items: [], color: 'rgba(179,156,255,0.04)', size: 25 },
    ];
    for (const layer of bgLayers) {
      for (let i = 0; i < 8; i++) {
        layer.items.push({
          x: Math.random() * W * 2,
          y: Math.random() * H * 0.6,
          size: layer.size * (0.5 + Math.random() * 0.5),
        });
      }
    }
  }

  function updateHUD() {
    distanceEl.textContent = Math.floor(distance) + 'm';
    coinsEl.textContent = coinCount;
    speedEl.textContent = speed.toFixed(1);
    bestEl.textContent = bestDistance + 'm';
  }

  function announce(msg) {
    if (liveEl) liveEl.textContent = msg;
  }

  // 生成障碍
  function spawnObstacle() {
    const types = ['low', 'high', 'double'];
    const type = types[Math.floor(Math.random() * (distance > 200 ? 3 : 2))];
    const obs = { x: W + 20, type, passed: false };

    if (type === 'low') {
      obs.w = 15 + Math.random() * 10;
      obs.h = 20 + Math.random() * 15;
      obs.y = GROUND_Y - obs.h;
    } else if (type === 'high') {
      obs.w = 15 + Math.random() * 10;
      obs.h = 40 + Math.random() * 20;
      obs.y = GROUND_Y - obs.h;
      obs.gap = 25; // 滑铲可通过的高度
    } else {
      obs.w = 20;
      obs.h = 15;
      obs.y = GROUND_Y - obs.h;
      obs.second = { x: obs.x, y: obs.y - 50, w: obs.w, h: obs.h };
    }
    obstacles.push(obs);
  }

  // 生成金币
  function spawnCoin() {
    const y = GROUND_Y - 40 - Math.random() * 60;
    coins.push({ x: W + 20, y, r: 6, collected: false });
  }

  // 碰撞检测
  function rectCollision(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function circleRectCollision(cx, cy, r, rx, ry, rw, rh) {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return dx * dx + dy * dy < r * r;
  }

  // 更新
  function update() {
    if (gameOver || paused || !started) return;

    // 速度递增
    speed = 5 + distance / 500;
    speed = Math.min(speed, 15);

    // 更新距离
    distance += speed * 0.1;

    // 玩家物理
    if (!player.onGround) {
      player.vy += 0.8; // 重力
      player.y += player.vy;
      if (player.y >= GROUND_Y - player.h) {
        player.y = GROUND_Y - player.h;
        player.vy = 0;
        player.onGround = true;
        player.doubleJump = false;
      }
    }

    // 滑铲
    if (player.sliding) {
      player.h = 15;
      player.y = GROUND_Y - player.h;
    } else {
      player.h = 30;
      if (player.onGround) player.y = GROUND_Y - player.h;
    }

    // 生成障碍
    obstacleTimer--;
    if (obstacleTimer <= 0) {
      spawnObstacle();
      obstacleTimer = Math.max(60, 120 - distance / 20);
    }

    // 生成金币
    coinTimer--;
    if (coinTimer <= 0) {
      spawnCoin();
      coinTimer = 30 + Math.random() * 40;
    }

    // 更新障碍
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      obs.x -= speed;
      if (obs.second) obs.second.x -= speed;

      // 碰撞检测
      const playerRect = { x: player.x, y: player.y, w: player.w, h: player.h };
      if (rectCollision(playerRect, { x: obs.x, y: obs.y, w: obs.w, h: obs.h })) {
        // 滑铲可通过高障碍
        if (obs.type === 'high' && player.sliding && player.y + player.h <= obs.y + obs.gap) {
          // 通过
        } else {
          gameOver = true;
          if (distance > bestDistance) {
            bestDistance = Math.floor(distance);
            localStorage.setItem('runner-best-dist', bestDistance);
          }
          if (coinCount > bestCoins) {
            bestCoins = coinCount;
            localStorage.setItem('runner-best-coins', bestCoins);
          }
          bestEl.textContent = bestDistance + 'm';
          showGameOver();
          return;
        }
      }
      if (obs.second && rectCollision(playerRect, { x: obs.second.x, y: obs.second.y, w: obs.second.w, h: obs.second.h })) {
        gameOver = true;
        if (distance > bestDistance) {
          bestDistance = Math.floor(distance);
          localStorage.setItem('runner-best-dist', bestDistance);
        }
        bestEl.textContent = bestDistance + 'm';
        showGameOver();
        return;
      }

      // 移除屏幕外障碍
      if (obs.x + obs.w < 0) {
        obstacles.splice(i, 1);
      }
    }

    // 更新金币
    for (let i = coins.length - 1; i >= 0; i--) {
      const coin = coins[i];
      coin.x -= speed;
      const dist = Math.sqrt((player.x + player.w / 2 - coin.x) ** 2 + (player.y + player.h / 2 - coin.y) ** 2);
      if (dist < 20) {
        coinCount++;
        spawnParticles(coin.x, coin.y, '#ffd166', 4);
        coins.splice(i, 1);
        updateHUD();
      } else if (coin.x < -10) {
        coins.splice(i, 1);
      }
    }

    // 更新粒子
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.2;
      p.life -= 0.03;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // 更新背景
    for (const layer of bgLayers) {
      for (const item of layer.items) {
        item.x -= layer.speed * speed * 0.3;
        if (item.x + item.size < 0) {
          item.x = W + Math.random() * 100;
          item.y = Math.random() * H * 0.6;
        }
      }
    }

    player.frame++;
    updateHUD();
  }

  // 绘制
  function draw() {
    ctx.clearRect(0, 0, W, H);

    // 背景渐变
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#0a1628');
    grad.addColorStop(1, '#050a14');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // 视差背景
    for (const layer of bgLayers) {
      ctx.fillStyle = layer.color;
      for (const item of layer.items) {
        ctx.beginPath();
        ctx.arc(item.x, item.y, item.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 地面
    ctx.fillStyle = '#1a2a4a';
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    ctx.fillStyle = '#2a3a5a';
    ctx.fillRect(0, GROUND_Y, W, 2);

    // 地面装饰
    ctx.strokeStyle = 'rgba(148,173,230,0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < W; i += 40) {
      const offset = (distance * 2) % 40;
      ctx.beginPath();
      ctx.moveTo(i - offset, GROUND_Y);
      ctx.lineTo(i - offset + 20, GROUND_Y + 8);
      ctx.stroke();
    }

    // 障碍
    for (const obs of obstacles) {
      ctx.fillStyle = '#ff5a7a';
      if (obs.type === 'low') {
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(obs.x, obs.y, obs.w, 3);
      } else if (obs.type === 'high') {
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(obs.x, obs.y, obs.w, 3);
        // 缺口
        ctx.fillStyle = '#080d18';
        ctx.fillRect(obs.x, obs.y, obs.w, obs.gap);
      } else if (obs.type === 'double') {
        ctx.fillStyle = '#ff5a7a';
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        ctx.fillStyle = '#ffb45e';
        ctx.fillRect(obs.second.x, obs.second.y, obs.second.w, obs.second.h);
      }
    }

    // 金币
    for (const coin of coins) {
      ctx.beginPath();
      ctx.arc(coin.x, coin.y, coin.r, 0, Math.PI * 2);
      ctx.fillStyle = '#ffd166';
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.arc(coin.x - 1, coin.y - 1, coin.r * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // 玩家
    ctx.fillStyle = '#6ee7ff';
    if (player.sliding) {
      ctx.fillRect(player.x, player.y, player.w, player.h);
    } else {
      ctx.fillRect(player.x, player.y, player.w, player.h);
      // 眼睛
      ctx.fillStyle = '#fff';
      ctx.fillRect(player.x + player.w - 6, player.y + 4, 4, 4);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(player.x, player.y, player.w, 3);

    // 粒子
    for (const p of particles) {
      ctx.globalAlpha = p.life;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function showOverlay(kicker, title, text, btnText, action) {
    overlayKicker.textContent = kicker;
    overlayTitle.textContent = title;
    overlayText.textContent = text;
    overlayAction.textContent = btnText;
    overlay.style.display = 'grid';
    overlayAction.onclick = action;
  }

  function hideOverlay() {
    overlay.style.display = 'none';
  }

  function showGameOver() {
    showOverlay('游戏结束', 'Game Over', `距离: ${Math.floor(distance)}m · 金币: ${coinCount}`, '重新开始', startGame);
  }

  // 键盘
  document.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Space' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      if (!started) { started = true; hideOverlay(); return; }
      if (gameOver) { startGame(); return; }
      if (player.onGround) {
        player.vy = -12;
        player.onGround = false;
        player.sliding = false;
      } else if (!player.doubleJump) {
        player.vy = -10;
        player.doubleJump = true;
      }
    }
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      e.preventDefault();
      if (started && !gameOver) {
        player.sliding = true;
      }
    }
    if (e.key === 'p' || e.key === 'P') {
      paused = !paused;
      announce(paused ? '暂停' : '继续');
    }
  });
  document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      player.sliding = false;
    }
  });

  // 触屏
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!started) { started = true; hideOverlay(); return; }
    if (gameOver) { startGame(); return; }
    if (player.onGround) {
      player.vy = -12;
      player.onGround = false;
      player.sliding = false;
    } else if (!player.doubleJump) {
      player.vy = -10;
      player.doubleJump = true;
    }
  }, { passive: false });

  document.querySelectorAll('.runner-touch button').forEach(btn => {
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (btn.dataset.action === 'jump') {
        if (!started) { started = true; hideOverlay(); return; }
        if (gameOver) { startGame(); return; }
        if (player.onGround) {
          player.vy = -12;
          player.onGround = false;
          player.sliding = false;
        } else if (!player.doubleJump) {
          player.vy = -10;
          player.doubleJump = true;
        }
      } else if (btn.dataset.action === 'slide') {
        player.sliding = true;
      }
    });
    btn.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (btn.dataset.action === 'slide') {
        player.sliding = false;
      }
    });
  });

  document.getElementById('pause').addEventListener('click', () => {
    if (gameOver || !started) return;
    paused = !paused;
    document.getElementById('pause').setAttribute('aria-pressed', paused);
    announce(paused ? '暂停' : '继续');
  });

  document.getElementById('restart').addEventListener('click', startGame);

  overlayAction.addEventListener('click', () => {
    if (!started) {
      started = true;
      hideOverlay();
    } else if (gameOver) {
      startGame();
    }
  });

  // 游戏循环
  function gameLoop() {
    if (!gameOver && !paused && started) {
      update();
    }
    draw();
    animId = requestAnimationFrame(gameLoop);
  }

  function startGame() {
    player = { x: 60, y: GROUND_Y - 30, w: 20, h: 30, vy: 0, onGround: true, sliding: false, doubleJump: false, frame: 0 };
    obstacles = [];
    coins = [];
    particles = [];
    distance = 0;
    coinCount = 0;
    speed = 5;
    gameOver = false;
    paused = false;
    started = true;
    obstacleTimer = 60;
    coinTimer = 30;
    initBg();
    updateHUD();
    bestEl.textContent = bestDistance + 'm';
    hideOverlay();
    announce('游戏开始');
    if (animId) cancelAnimationFrame(animId);
    animId = requestAnimationFrame(gameLoop);
  }

  // 初始化
  initBg();
  bestEl.textContent = bestDistance + 'm';
  showOverlay('准备好了吗？', '跑酷', '空格/点击跳跃，二段跳，↓/S 滑铲。收集金币，躲避障碍。', '开始奔跑', () => {
    started = true;
    hideOverlay();
  });
  animId = requestAnimationFrame(gameLoop);
})();
