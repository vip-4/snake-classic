// 太空射击 Space Shooter — 原生 JS 实现
(function () {
  'use strict';

  const canvas = document.getElementById('shooter-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  // 状态
  let player = { x: W / 2 - 15, y: H - 60, w: 30, h: 30, speed: 5, lives: 3, invincible: 0 };
  let bullets = [];
  let enemies = [];
  let enemyBullets = [];
  let powerups = [];
  let particles = [];
  let stars = [];
  let score = 0;
  let wave = 1;
  let gameOver = false;
  let paused = false;
  let started = false;
  let animId = null;
  let bestScore = parseInt(localStorage.getItem('shooter-best') || '0', 10);
  let fireRate = 0;
  let fireCooldown = 0;
  let weaponLevel = 1;
  let shield = 0;
  let boss = null;
  let waveTimer = 0;
  let enemySpawnTimer = 0;
  let enemiesInWave = 0;
  let enemiesKilled = 0;

  // DOM
  const scoreEl = document.getElementById('score');
  const livesEl = document.getElementById('lives');
  const waveEl = document.getElementById('wave');
  const bestEl = document.getElementById('best');
  const liveEl = document.getElementById('live');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayText = document.getElementById('overlay-text');
  const overlayAction = document.getElementById('overlay-action');
  const overlayKicker = document.getElementById('overlay-kicker');

  // 初始化星星
  for (let i = 0; i < 80; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      size: Math.random() * 1.5 + 0.5,
      speed: Math.random() * 0.5 + 0.1,
    });
  }

  // 更新 HUD
  function updateHUD() {
    scoreEl.textContent = score;
    livesEl.textContent = lives + (shield > 0 ? ' 🛡' : '');
    waveEl.textContent = wave;
    bestEl.textContent = bestScore;
  }

  function announce(msg) {
    if (liveEl) liveEl.textContent = msg;
  }

  // 生成敌人
  function spawnEnemy() {
    const types = ['basic', 'fast', 'tank', 'shooter'];
    const type = types[Math.floor(Math.random() * (wave < 5 ? 2 : wave < 10 ? 3 : 4))];
    const enemy = {
      x: Math.random() * (W - 40) + 20,
      y: -30,
      w: type === 'tank' ? 36 : 24,
      h: type === 'tank' ? 36 : 24,
      type,
      hp: type === 'tank' ? 3 : type === 'shooter' ? 2 : 1,
      speed: type === 'fast' ? 3 : type === 'tank' ? 0.8 : 1.5,
      color: type === 'basic' ? '#ff5a7a' : type === 'fast' ? '#ffb45e' : type === 'tank' ? '#b39cff' : '#ff7ab8',
      fireTimer: Math.random() * 100 + 50,
      value: type === 'tank' ? 50 : type === 'shooter' ? 30 : type === 'fast' ? 20 : 10,
    };
    enemies.push(enemy);
  }

  // 生成 Boss
  function spawnBoss() {
    boss = {
      x: W / 2 - 40,
      y: -80,
      w: 80,
      h: 60,
      hp: 20 + wave * 5,
      maxHp: 20 + wave * 5,
      speed: 1,
      dir: 1,
      fireTimer: 0,
      phase: 0,
      color: '#ff0040',
    };
    announce('Boss 出现！');
  }

  // 道具
  function spawnPowerup(x, y) {
    const types = ['double', 'triple', 'shield', 'bomb', 'slow'];
    const type = types[Math.floor(Math.random() * types.length)];
    powerups.push({ x, y, type, vy: 2, r: 8, color: type === 'double' ? '#6ee7ff' : type === 'triple' ? '#b39cff' : type === 'shield' ? '#7cff6b' : type === 'bomb' ? '#ff5a7a' : '#ffb45e' });
  }

  function applyPowerup(type) {
    switch (type) {
      case 'double': weaponLevel = Math.max(weaponLevel, 2); setTimeout(() => { if (weaponLevel === 2) weaponLevel = 1; }, 8000); break;
      case 'triple': weaponLevel = 3; setTimeout(() => { if (weaponLevel === 3) weaponLevel = 1; }, 8000); break;
      case 'shield': shield = 3; break;
      case 'bomb': enemies.forEach(e => { spawnParticles(e.x + e.w / 2, e.y + e.h / 2, e.color, 8); score += e.value; }); enemies = []; if (boss) { boss.hp -= 5; spawnParticles(boss.x + boss.w / 2, boss.y + boss.h / 2, boss.color, 12); } break;
      case 'slow': enemies.forEach(e => { e.speed *= 0.5; }); setTimeout(() => { enemies.forEach(e => { e.speed *= 2; }); }, 5000); break;
    }
    announce('获得道具: ' + type);
  }

  // 粒子
  function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        life: 1,
        color,
        r: Math.random() * 2 + 1,
      });
    }
  }

  // 射击
  function fire() {
    if (weaponLevel === 1) {
      bullets.push({ x: player.x + player.w / 2 - 2, y: player.y, vx: 0, vy: -8, w: 4, h: 10, color: '#6ee7ff' });
    } else if (weaponLevel === 2) {
      bullets.push({ x: player.x + 4, y: player.y, vx: -1, vy: -8, w: 4, h: 10, color: '#6ee7ff' });
      bullets.push({ x: player.x + player.w - 8, y: player.y, vx: 1, vy: -8, w: 4, h: 10, color: '#6ee7ff' });
    } else {
      bullets.push({ x: player.x + player.w / 2 - 2, y: player.y, vx: 0, vy: -9, w: 4, h: 10, color: '#b39cff' });
      bullets.push({ x: player.x + 2, y: player.y, vx: -2, vy: -8, w: 4, h: 10, color: '#b39cff' });
      bullets.push({ x: player.x + player.w - 6, y: player.y, vx: 2, vy: -8, w: 4, h: 10, color: '#b39cff' });
    }
  }

  // 碰撞检测
  function rectCollision(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  // 更新
  function update() {
    if (gameOver || paused || !started) return;

    // 移动玩家
    if (keys.left) player.x = Math.max(0, player.x - player.speed);
    if (keys.right) player.x = Math.min(W - player.w, player.x + player.speed);
    if (keys.up) player.y = Math.max(0, player.y - player.speed);
    if (keys.down) player.y = Math.min(H - player.h, player.y + player.speed);

    // 射击
    fireCooldown--;
    if (keys.shoot && fireCooldown <= 0) {
      fire();
      fireCooldown = 12 - weaponLevel * 2;
    }

    // 无敌时间
    if (player.invincible > 0) player.invincible--;

    // 更新子弹
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx;
      b.y += b.vy;
      if (b.y < -10 || b.y > H + 10 || b.x < -10 || b.x > W + 10) {
        bullets.splice(i, 1);
      }
    }

    // 更新敌人子弹
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const b = enemyBullets[i];
      b.x += b.vx;
      b.y += b.vy;
      if (b.y > H + 10 || b.y < -10) {
        enemyBullets.splice(i, 1);
        continue;
      }
      // 碰撞玩家
      if (rectCollision(b, player) && player.invincible <= 0) {
        enemyBullets.splice(i, 1);
        if (shield > 0) {
          shield--;
          spawnParticles(player.x + player.w / 2, player.y + player.h / 2, '#7cff6b', 8);
        } else {
          lives--;
          player.invincible = 60;
          spawnParticles(player.x + player.w / 2, player.y + player.h / 2, '#ff5a7a', 12);
          updateHUD();
          if (lives <= 0) {
            gameOver = true;
            if (score > bestScore) {
              bestScore = score;
              localStorage.setItem('shooter-best', bestScore);
              bestEl.textContent = bestScore;
            }
            showGameOver();
          }
        }
      }
    }

    // 更新敌人
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.y += e.speed;
      e.x += Math.sin(Date.now() / 500 + i) * 0.5;

      // 射击型敌人
      if (e.type === 'shooter') {
        e.fireTimer--;
        if (e.fireTimer <= 0) {
          enemyBullets.push({ x: e.x + e.w / 2 - 2, y: e.y + e.h, vx: 0, vy: 4, w: 4, h: 8, color: '#ff5a7a' });
          e.fireTimer = 60 + Math.random() * 40;
        }
      }

      // 碰撞子弹
      for (let j = bullets.length - 1; j >= 0; j--) {
        if (rectCollision(bullets[j], e)) {
          bullets.splice(j, 1);
          e.hp--;
          spawnParticles(e.x + e.w / 2, e.y + e.h / 2, e.color, 3);
          if (e.hp <= 0) {
            spawnParticles(e.x + e.w / 2, e.y + e.h / 2, e.color, 8);
            score += e.value;
            enemiesKilled++;
            if (Math.random() < 0.15) spawnPowerup(e.x + e.w / 2, e.y + e.h / 2);
            enemies.splice(i, 1);
            updateHUD();
          }
          break;
        }
      }

      // 敌人到达底部
      if (e.y > H) {
        enemies.splice(i, 1);
        lives--;
        updateHUD();
        if (lives <= 0) {
          gameOver = true;
          if (score > bestScore) {
            bestScore = score;
            localStorage.setItem('shooter-best', bestScore);
            bestEl.textContent = bestScore;
          }
          showGameOver();
        }
      }
    }

    // Boss
    if (boss) {
      boss.y = Math.min(boss.y + 1, 60);
      boss.x += boss.dir * boss.speed;
      if (boss.x <= 0 || boss.x + boss.w >= W) boss.dir *= -1;

      boss.fireTimer--;
      if (boss.fireTimer <= 0) {
        // 扇形射击
        for (let i = -2; i <= 2; i++) {
          enemyBullets.push({
            x: boss.x + boss.w / 2 - 2,
            y: boss.y + boss.h,
            vx: i * 1.5,
            vy: 4,
            w: 4,
            h: 8,
            color: '#ff0040',
          });
        }
        boss.fireTimer = 40;
      }

      // 碰撞子弹
      for (let j = bullets.length - 1; j >= 0; j--) {
        if (rectCollision(bullets[j], boss)) {
          bullets.splice(j, 1);
          boss.hp--;
          spawnParticles(boss.x + boss.w / 2, boss.y + boss.h / 2, boss.color, 2);
          if (boss.hp <= 0) {
            spawnParticles(boss.x + boss.w / 2, boss.y + boss.h / 2, boss.color, 20);
            score += 500 + wave * 100;
            boss = null;
            wave++;
            waveTimer = 180;
            enemiesKilled = 0;
            enemiesInWave = 0;
            announce('Boss 击败！进入下一波');
            updateHUD();
          }
        }
      }
    }

    // 生成敌人
    if (!boss) {
      enemySpawnTimer--;
      if (enemySpawnTimer <= 0 && enemiesInWave < 5 + wave * 2) {
        spawnEnemy();
        enemiesInWave++;
        enemySpawnTimer = Math.max(30, 80 - wave * 3);
      }

      // 检查波次完成
      if (enemiesInWave >= 5 + wave * 2 && enemies.length === 0) {
        waveTimer--;
        if (waveTimer <= 0) {
          if (wave % 5 === 0) {
            spawnBoss();
          } else {
            wave++;
            enemiesInWave = 0;
            enemiesKilled = 0;
            waveTimer = 120;
            announce(`第 ${wave} 波`);
            updateHUD();
          }
        }
      }
    }

    // 更新道具
    for (let i = powerups.length - 1; i >= 0; i--) {
      const pu = powerups[i];
      pu.y += pu.vy;
      if (rectCollision(pu, player)) {
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
      p.vy += 0.05;
      p.life -= 0.02;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // 更新星星
    for (const s of stars) {
      s.y += s.speed;
      if (s.y > H) {
        s.y = 0;
        s.x = Math.random() * W;
      }
    }
  }

  // 绘制
  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#050a14';
    ctx.fillRect(0, 0, W, H);

    // 星星
    for (const s of stars) {
      ctx.fillStyle = `rgba(255,255,255,${0.3 + s.size * 0.2})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // 玩家
    if (player.invincible % 6 < 4) {
      ctx.fillStyle = shield > 0 ? '#7cff6b' : '#6ee7ff';
      ctx.beginPath();
      ctx.moveTo(player.x + player.w / 2, player.y);
      ctx.lineTo(player.x, player.y + player.h);
      ctx.lineTo(player.x + player.w, player.y + player.h);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(player.x + player.w / 2 - 2, player.y + player.h * 0.6, 4, 8);
    }

    // 子弹
    for (const b of bullets) {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
    }

    // 敌人子弹
    for (const b of enemyBullets) {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
    }

    // 敌人
    for (const e of enemies) {
      ctx.fillStyle = e.color;
      ctx.fillRect(e.x, e.y, e.w, e.h);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(e.x, e.y, e.w, 3);
      // HP 条
      if (e.hp > 1) {
        ctx.fillStyle = '#ff5a7a';
        ctx.fillRect(e.x, e.y - 4, e.w * (e.hp / (e.type === 'tank' ? 3 : 2)), 2);
      }
    }

    // Boss
    if (boss) {
      ctx.fillStyle = boss.color;
      ctx.fillRect(boss.x, boss.y, boss.w, boss.h);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(boss.x, boss.y, boss.w, 4);
      // HP 条
      ctx.fillStyle = '#333';
      ctx.fillRect(boss.x, boss.y - 8, boss.w, 4);
      ctx.fillStyle = '#ff5a7a';
      ctx.fillRect(boss.x, boss.y - 8, boss.w * (boss.hp / boss.maxHp), 4);
    }

    // 道具
    for (const pu of powerups) {
      ctx.beginPath();
      ctx.arc(pu.x, pu.y, pu.r, 0, Math.PI * 2);
      ctx.fillStyle = pu.color;
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(pu.type[0].toUpperCase(), pu.x, pu.y + 3);
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
      ctx.moveTo(12 + i * 18, H - 12);
      ctx.lineTo(8 + i * 18, H - 4);
      ctx.lineTo(16 + i * 18, H - 4);
      ctx.closePath();
      ctx.fill();
    }
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
    showOverlay('游戏结束', 'Game Over', `分数: ${score} · 波次: ${wave}`, '重新开始', startGame);
  }

  // 键盘
  const keys = { left: false, right: false, up: false, down: false, shoot: false };
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { keys.left = true; e.preventDefault(); }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { keys.right = true; e.preventDefault(); }
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { keys.up = true; e.preventDefault(); }
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { keys.down = true; e.preventDefault(); }
    if (e.key === ' ' || e.key === 'Space') { keys.shoot = true; e.preventDefault(); }
    if (e.key === 'p' || e.key === 'P') { paused = !paused; announce(paused ? '暂停' : '继续'); }
  });
  document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keys.up = false;
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keys.down = false;
    if (e.key === ' ' || e.key === 'Space') keys.shoot = false;
  });

  // 鼠标/触屏移动
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    player.x = (e.clientX - rect.left) * scaleX - player.w / 2;
    player.x = Math.max(0, Math.min(W - player.w, player.x));
  });
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    player.x = (e.touches[0].clientX - rect.left) * scaleX - player.w / 2;
    player.x = Math.max(0, Math.min(W - player.w, player.x));
  }, { passive: false });

  // 触屏按钮
  document.querySelectorAll('.shooter-touch button').forEach(btn => {
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (btn.dataset.action === 'left') keys.left = true;
      if (btn.dataset.action === 'right') keys.right = true;
      if (btn.dataset.action === 'shoot') keys.shoot = true;
    });
    btn.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (btn.dataset.action === 'left') keys.left = false;
      if (btn.dataset.action === 'right') keys.right = false;
      if (btn.dataset.action === 'shoot') keys.shoot = false;
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
    player = { x: W / 2 - 15, y: H - 60, w: 30, h: 30, speed: 5, lives: 3, invincible: 0 };
    bullets = [];
    enemies = [];
    enemyBullets = [];
    powerups = [];
    particles = [];
    score = 0;
    wave = 1;
    gameOver = false;
    paused = false;
    started = true;
    weaponLevel = 1;
    shield = 0;
    boss = null;
    waveTimer = 120;
    enemySpawnTimer = 0;
    enemiesInWave = 0;
    enemiesKilled = 0;
    updateHUD();
    bestEl.textContent = bestScore;
    hideOverlay();
    announce('游戏开始');
    if (animId) cancelAnimationFrame(animId);
    animId = requestAnimationFrame(gameLoop);
  }

  // 初始化
  bestEl.textContent = bestScore;
  showOverlay('准备好了吗？', '太空射击', '← → 移动飞船，空格射击。收集道具，击败 Boss。', '开始游戏', () => {
    started = true;
    hideOverlay();
  });
  animId = requestAnimationFrame(gameLoop);
})();
