// 打砖块 — 原生 JS 实现
(function () {
  'use strict';

  const canvas = document.getElementById('breakout-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  // 状态
  let paddle = { x: W / 2 - 40, y: H - 20, w: 80, h: 12, speed: 7 };
  let balls = [{ x: W / 2, y: H - 40, vx: 3, vy: -4, r: 6 }];
  let bricks = [];
  let powerups = [];
  let particles = [];
  let score = 0;
  let lives = 3;
  let level = 1;
  let gameOver = false;
  let paused = false;
  let started = false;
  let animId = null;
  let bestScore = parseInt(localStorage.getItem('breakout-best') || '0', 10);

  // DOM
  const scoreEl = document.getElementById('score');
  const livesEl = document.getElementById('lives');
  const levelEl = document.getElementById('level');
  const bestEl = document.getElementById('best');
  const liveEl = document.getElementById('live');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayText = document.getElementById('overlay-text');
  const overlayAction = document.getElementById('overlay-action');
  const overlayKicker = document.getElementById('overlay-kicker');

  // 颜色
  const BRICK_COLORS = ['#ff5a7a', '#ff7ab8', '#ffb45e', '#ffd166', '#7cff6b', '#6ee7ff', '#b39cff'];

  // 生成砖块
  function generateBricks() {
    bricks = [];
    const rows = Math.min(3 + Math.floor(level / 2), 8);
    const cols = 10;
    const brickW = W / cols - 4;
    const brickH = 18;
    const padding = 4;
    const offsetTop = 40;
    const offsetLeft = 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const color = BRICK_COLORS[r % BRICK_COLORS.length];
        bricks.push({
          x: offsetLeft + c * (brickW + padding),
          y: offsetTop + r * (brickH + padding),
          w: brickW,
          h: brickH,
          color,
          alive: true,
          powerup: Math.random() < 0.15 ? randomPowerup() : null,
        });
      }
    }
  }

  function randomPowerup() {
    const types = ['extend', 'multiball', 'slow', 'life'];
    return types[Math.floor(Math.random() * types.length)];
  }

  // 重置
  function resetBall() {
    balls = [{ x: W / 2, y: H - 40, vx: (Math.random() - 0.5) * 4, vy: -4, r: 6 }];
  }

  function resetPaddle() {
    paddle = { x: W / 2 - 40, y: H - 20, w: 80, h: 12, speed: 7 };
  }

  // 碰撞检测
  function ballBrickCollision(ball, brick) {
    if (!brick.alive) return false;
    const closestX = Math.max(brick.x, Math.min(ball.x, brick.x + brick.w));
    const closestY = Math.max(brick.y, Math.min(ball.y, brick.y + brick.h));
    const dx = ball.x - closestX;
    const dy = ball.y - closestY;
    return dx * dx + dy * dy < ball.r * ball.r;
  }

  function ballPaddleCollision(ball) {
    if (ball.vy > 0 &&
        ball.y + ball.r >= paddle.y &&
        ball.y - ball.r <= paddle.y + paddle.h &&
        ball.x >= paddle.x &&
        ball.x <= paddle.x + paddle.w) {
      // 根据击球位置计算反弹角度
      const hitPos = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
      const angle = hitPos * (Math.PI / 3); // 最大 60 度
      const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      ball.vx = speed * Math.sin(angle);
      ball.vy = -speed * Math.cos(angle);
      // 粒子
      spawnParticles(ball.x, ball.y, '#6ee7ff', 4);
      return true;
    }
    return false;
  }

  // 粒子
  function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4 - 1,
        life: 1,
        color,
        r: Math.random() * 2 + 1,
      });
    }
  }

  // 道具
  function spawnPowerup(x, y, type) {
    powerups.push({ x, y, type, vy: 2, r: 8 });
  }

  function applyPowerup(type) {
    switch (type) {
      case 'extend':
        paddle.w = Math.min(paddle.w + 30, 160);
        setTimeout(() => { paddle.w = Math.max(80, paddle.w - 30); }, 8000);
        announce('挡板加长');
        break;
      case 'multiball':
        const newBalls = balls.map(b => ({ ...b, vx: -b.vx, vy: b.vy }));
        balls = balls.concat(newBalls);
        announce('多球');
        break;
      case 'slow':
        balls.forEach(b => { b.vx *= 0.7; b.vy *= 0.7; });
        setTimeout(() => { balls.forEach(b => { b.vx /= 0.7; b.vy /= 0.7; }); }, 5000);
        announce('减速');
        break;
      case 'life':
        lives++;
        updateHUD();
        announce('额外生命');
        break;
    }
  }

  // 更新
  function update() {
    if (gameOver || paused || !started) return;

    // 移动挡板
    if (keys.left) paddle.x = Math.max(0, paddle.x - paddle.speed);
    if (keys.right) paddle.x = Math.min(W - paddle.w, paddle.x + paddle.speed);

    // 更新小球
    for (let i = balls.length - 1; i >= 0; i--) {
      const ball = balls[i];
      ball.x += ball.vx;
      ball.y += ball.vy;

      // 墙壁碰撞
      if (ball.x - ball.r <= 0 || ball.x + ball.r >= W) {
        ball.vx = -ball.vx;
        ball.x = Math.max(ball.r, Math.min(W - ball.r, ball.x));
      }
      if (ball.y - ball.r <= 0) {
        ball.vy = -ball.vy;
        ball.y = ball.r;
      }

      // 挡板碰撞
      ballPaddleCollision(ball);

      // 砖块碰撞
      for (const brick of bricks) {
        if (brick.alive && ballBrickCollision(ball, brick)) {
          brick.alive = false;
          // 反弹
          const prevX = ball.x - ball.vx;
          const prevY = ball.y - ball.vy;
          const fromLeft = prevX < brick.x;
          const fromRight = prevX > brick.x + brick.w;
          const fromTop = prevY < brick.y;
          const fromBottom = prevY > brick.y + brick.h;
          if (fromLeft || fromRight) ball.vx = -ball.vx;
          if (fromTop || fromBottom) ball.vy = -ball.vy;
          score += 10 * level;
          spawnParticles(ball.x, ball.y, brick.color, 6);
          if (brick.powerup) spawnPowerup(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.powerup);
          updateHUD();
          break;
        }
      }

      // 小球落底
      if (ball.y + ball.r >= H) {
        balls.splice(i, 1);
        if (balls.length === 0) {
          lives--;
          updateHUD();
          if (lives <= 0) {
            gameOver = true;
            if (score > bestScore) {
              bestScore = score;
              localStorage.setItem('breakout-best', bestScore);
              bestEl.textContent = bestScore;
            }
            showGameOver();
          } else {
            resetBall();
            resetPaddle();
            announce(`失去一命，剩余 ${lives} 条`);
          }
        }
      }
    }

    // 更新道具
    for (let i = powerups.length - 1; i >= 0; i--) {
      const pu = powerups[i];
      pu.y += pu.vy;
      // 碰撞挡板
      if (pu.y + pu.r >= paddle.y && pu.y - pu.r <= paddle.y + paddle.h &&
          pu.x >= paddle.x && pu.x <= paddle.x + paddle.w) {
        applyPowerup(pu.type);
        powerups.splice(i, 1);
      } else if (pu.y > H) {
        powerups.splice(i, 1);
      }
    }

    // 更新粒子
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.life -= 0.02;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // 检查通关
    if (bricks.every(b => !b.alive)) {
      level++;
      generateBricks();
      resetBall();
      resetPaddle();
      announce(`第 ${level} 关`);
      updateHUD();
    }
  }

  // 绘制
  function draw() {
    ctx.clearRect(0, 0, W, H);
    // 背景
    ctx.fillStyle = '#080d18';
    ctx.fillRect(0, 0, W, H);

    // 砖块
    for (const brick of bricks) {
      if (!brick.alive) continue;
      ctx.fillStyle = brick.color;
      ctx.fillRect(brick.x, brick.y, brick.w, brick.h);
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(brick.x, brick.y, brick.w, 3);
      if (brick.powerup) {
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(brick.powerup[0].toUpperCase(), brick.x + brick.w / 2, brick.y + brick.h / 2 + 3);
      }
    }

    // 道具
    for (const pu of powerups) {
      ctx.beginPath();
      ctx.arc(pu.x, pu.y, pu.r, 0, Math.PI * 2);
      const colors = { extend: '#7cff6b', multiball: '#6ee7ff', slow: '#b39cff', life: '#ff7ab8' };
      ctx.fillStyle = colors[pu.type] || '#fff';
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(pu.type[0].toUpperCase(), pu.x, pu.y + 3);
    }

    // 挡板
    ctx.fillStyle = '#6ee7ff';
    ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(paddle.x, paddle.y, paddle.w, 3);

    // 小球
    for (const ball of balls) {
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 粒子
    for (const p of particles) {
      ctx.globalAlpha = p.life;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 生命显示
    for (let i = 0; i < lives; i++) {
      ctx.fillStyle = '#ff5a7a';
      ctx.beginPath();
      ctx.arc(12 + i * 16, H - 8, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function updateHUD() {
    scoreEl.textContent = score;
    livesEl.textContent = lives;
    levelEl.textContent = level;
    bestEl.textContent = bestScore;
  }

  function announce(msg) {
    if (liveEl) liveEl.textContent = msg;
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
    showOverlay('游戏结束', 'Game Over', `分数: ${score} · 关卡: ${level}`, '重新开始', startGame);
  }

  // 键盘
  const keys = { left: false, right: false };
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { keys.left = true; e.preventDefault(); }
    if (e.key === 'ArrowRight') { keys.right = true; e.preventDefault(); }
    if (e.key === ' ' || e.key === 'Space') {
      e.preventDefault();
      if (!started) { started = true; hideOverlay(); }
      else if (gameOver) { startGame(); }
      else { paused = !paused; announce(paused ? '暂停' : '继续'); }
    }
    if (e.key === 'p' || e.key === 'P') { paused = !paused; announce(paused ? '暂停' : '继续'); }
  });
  document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft') keys.left = false;
    if (e.key === 'ArrowRight') keys.right = false;
  });

  // 鼠标/触屏移动挡板
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    paddle.x = (e.clientX - rect.left) * scaleX - paddle.w / 2;
    paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));
  });
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    paddle.x = (e.touches[0].clientX - rect.left) * scaleX - paddle.w / 2;
    paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));
  }, { passive: false });

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
    score = 0;
    lives = 3;
    level = 1;
    gameOver = false;
    paused = false;
    started = true;
    particles = [];
    powerups = [];
    resetPaddle();
    resetBall();
    generateBricks();
    updateHUD();
    bestEl.textContent = bestScore;
    hideOverlay();
    announce('游戏开始');
    if (animId) cancelAnimationFrame(animId);
    animId = requestAnimationFrame(gameLoop);
  }

  // 初始化
  generateBricks();
  bestEl.textContent = bestScore;
  showOverlay('准备好了吗？', '打砖块', '移动挡板反弹小球，击碎所有砖块。鼠标、触屏或 ← → 键操作。', '开始游戏', () => {
    started = true;
    hideOverlay();
  });
  animId = requestAnimationFrame(gameLoop);
})();
