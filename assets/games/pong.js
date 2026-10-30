// Pong 乒乓球 — 原生 JS 实现
(function () {
  'use strict';

  const canvas = document.getElementById('pong-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  // 状态
  let ball = { x: W / 2, y: H / 2, vx: 0, vy: 0, r: 6 };
  let leftPaddle = { x: 10, y: H / 2 - 40, w: 10, h: 80, score: 0, dy: 0 };
  let rightPaddle = { x: W - 20, y: H / 2 - 40, w: 10, h: 80, score: 0, dy: 0 };
  let gameOver = false;
  let winner = null;
  let speed = 'medium';
  let leftUp = false, leftDown = false, rightUp = false, rightDown = false;
  let animId = null;

  const SPEEDS = { slow: 4, medium: 6, fast: 9 };
  const WIN_SCORE = 11;

  // DOM
  const scoreLeftEl = document.getElementById('score-left');
  const scoreRightEl = document.getElementById('score-right');
  const speedEl = document.getElementById('speed');
  const messageEl = document.getElementById('message');
  const speedSelect = document.getElementById('speed-select');
  const newGameBtn = document.getElementById('new-game');
  const liveEl = document.getElementById('live');

  function announce(msg) {
    if (liveEl) liveEl.textContent = msg;
  }

  function resetBall(direction) {
    ball.x = W / 2;
    ball.y = H / 2;
    const s = SPEEDS[speed];
    const angle = (Math.random() * 0.8 - 0.4); // -0.4~0.4
    ball.vx = direction * s * Math.cos(angle);
    ball.vy = s * Math.sin(angle) * 1.5;
  }

  function newGame() {
    ball = { x: W / 2, y: H / 2, vx: 0, vy: 0, r: 6 };
    leftPaddle = { x: 10, y: H / 2 - 40, w: 10, h: 80, score: 0, dy: 0 };
    rightPaddle = { x: W - 20, y: H / 2 - 40, w: 10, h: 80, score: 0, dy: 0 };
    gameOver = false;
    winner = null;
    messageEl.textContent = '';
    scoreLeftEl.textContent = '0';
    scoreRightEl.textContent = '0';
    speedEl.textContent = speedSelect.value;
    resetBall(Math.random() < 0.5 ? 1 : -1);
    announce('新局开始');
    if (animId) cancelAnimationFrame(animId);
    animId = requestAnimationFrame(loop);
  }

  function update() {
    if (gameOver) return;

    // 移动左挡板
    if (leftUp) leftPaddle.y -= 6;
    if (leftDown) leftPaddle.y += 6;
    if (leftPaddle.y < 0) leftPaddle.y = 0;
    if (leftPaddle.y + leftPaddle.h > H) leftPaddle.y = H - leftPaddle.h;

    // 移动右挡板
    if (rightUp) rightPaddle.y -= 6;
    if (rightDown) rightPaddle.y += 6;
    if (rightPaddle.y < 0) rightPaddle.y = 0;
    if (rightPaddle.y + rightPaddle.h > H) rightPaddle.y = H - rightPaddle.h;

    // 移动球
    ball.x += ball.vx;
    ball.y += ball.vy;

    // 上下墙壁反弹
    if (ball.y - ball.r < 0) {
      ball.y = ball.r;
      ball.vy = -ball.vy;
    } else if (ball.y + ball.r > H) {
      ball.y = H - ball.r;
      ball.vy = -ball.vy;
    }

    // 挡板碰撞
    const hitLeft = ball.x - ball.r <= leftPaddle.x + leftPaddle.w &&
      ball.x + ball.r >= leftPaddle.x &&
      ball.y + ball.r >= leftPaddle.y &&
      ball.y - ball.r <= leftPaddle.y + leftPaddle.h;
    if (hitLeft && ball.vx < 0) {
      ball.x = leftPaddle.x + leftPaddle.w + ball.r;
      ball.vx = -ball.vx * 1.05;
      // 击球位置影响反弹角度
      const rel = (ball.y - (leftPaddle.y + leftPaddle.h / 2)) / (leftPaddle.h / 2);
      ball.vy = rel * Math.abs(ball.vx) * 0.8;
      announce('左侧击球');
    }

    const hitRight = ball.x + ball.r >= rightPaddle.x &&
      ball.x - ball.r <= rightPaddle.x + rightPaddle.w &&
      ball.y + ball.r >= rightPaddle.y &&
      ball.y - ball.r <= rightPaddle.y + rightPaddle.h;
    if (hitRight && ball.vx > 0) {
      ball.x = rightPaddle.x - ball.r;
      ball.vx = -ball.vx * 1.05;
      const rel = (ball.y - (rightPaddle.y + rightPaddle.h / 2)) / (rightPaddle.h / 2);
      ball.vy = rel * Math.abs(ball.vx) * 0.8;
      announce('右侧击球');
    }

    // 得分判定
    if (ball.x < 0) {
      rightPaddle.score++;
      scoreRightEl.textContent = rightPaddle.score;
      announce('右方得分');
      if (rightPaddle.score >= WIN_SCORE) {
        gameOver = true;
        winner = 'right';
        messageEl.textContent = '🏆 右方获胜！';
        announce('右方获胜');
        return;
      }
      resetBall(1);
    } else if (ball.x > W) {
      leftPaddle.score++;
      scoreLeftEl.textContent = leftPaddle.score;
      announce('左方得分');
      if (leftPaddle.score >= WIN_SCORE) {
        gameOver = true;
        winner = 'left';
        messageEl.textContent = '🏆 左方获胜！';
        announce('左方获胜');
        return;
      }
      resetBall(-1);
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // 中线
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 12]);
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);

    // 挡板
    ctx.fillStyle = '#7cff6b';
    ctx.fillRect(leftPaddle.x, leftPaddle.y, leftPaddle.w, leftPaddle.h);
    ctx.fillStyle = '#ff5a7a';
    ctx.fillRect(rightPaddle.x, rightPaddle.y, rightPaddle.w, rightPaddle.h);

    // 球
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();

    // 得分
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(leftPaddle.score, W / 2 - 80, 60);
    ctx.fillText(rightPaddle.score, W / 2 + 80, 60);
  }

  function loop() {
    update();
    draw();
    animId = requestAnimationFrame(loop);
  }

  // 键盘
  document.addEventListener('keydown', (e) => {
    if (e.key === 'w' || e.key === 'W') { leftUp = true; }
    if (e.key === 's' || e.key === 'S') { leftDown = true; }
    if (e.key === 'ArrowUp') { rightUp = true; }
    if (e.key === 'ArrowDown') { rightDown = true; }
  });
  document.addEventListener('keyup', (e) => {
    if (e.key === 'w' || e.key === 'W') { leftUp = false; }
    if (e.key === 's' || e.key === 'S') { leftDown = false; }
    if (e.key === 'ArrowUp') { rightUp = false; }
    if (e.key === 'ArrowDown') { rightDown = false; }
  });

  // 触屏（左右两侧分别控制对应挡板，简化为上下拖动最近挡板）
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const half = W / 2;
    if (touch.clientX < half) {
      leftPaddle.y = touch.clientY - leftPaddle.h / 2;
      if (leftPaddle.y < 0) leftPaddle.y = 0;
      if (leftPaddle.y + leftPaddle.h > H) leftPaddle.y = H - leftPaddle.h;
    } else {
      rightPaddle.y = touch.clientY - rightPaddle.h / 2;
      if (rightPaddle.y < 0) rightPaddle.y = 0;
      if (rightPaddle.y + rightPaddle.h > H) rightPaddle.y = H - rightPaddle.h;
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const half = W / 2;
    if (touch.clientX < half) {
      leftPaddle.y = touch.clientY - leftPaddle.h / 2;
      if (leftPaddle.y < 0) leftPaddle.y = 0;
      if (leftPaddle.y + leftPaddle.h > H) leftPaddle.y = H - leftPaddle.h;
    } else {
      rightPaddle.y = touch.clientY - rightPaddle.h / 2;
      if (rightPaddle.y < 0) rightPaddle.y = 0;
      if (rightPaddle.y + rightPaddle.h > H) rightPaddle.y = H - rightPaddle.h;
    }
  }, { passive: false });

  // 控件
  speedSelect.addEventListener('change', () => {
    speed = speedSelect.value;
    speedEl.textContent = speed;
  });
  newGameBtn.addEventListener('click', newGame);

  // 初始化
  speedEl.textContent = speedSelect.value;
  newGame();
})();
