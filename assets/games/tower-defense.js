// 塔防 Tower Defense — 原生 JS 实现
(function () {
  'use strict';

  const canvas = document.getElementById('td-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  // 路径点
  const PATH = [
    { x: 0, y: 60 }, { x: 120, y: 60 }, { x: 120, y: 180 },
    { x: 300, y: 180 }, { x: 300, y: 100 }, { x: 420, y: 100 },
    { x: 420, y: 280 }, { x: 200, y: 280 }, { x: 200, y: 340 },
    { x: 480, y: 340 },
  ];

  // 塔类型
  const TOWER_TYPES = {
    basic: { name: '基础', cost: 50, range: 80, damage: 10, fireRate: 30, color: '#6ee7ff', upgradeCost: [75, 125], damageMult: [1.5, 2.5], rangeMult: [1.2, 1.5] },
    sniper: { name: '狙击', cost: 100, range: 150, damage: 40, fireRate: 90, color: '#b39cff', upgradeCost: [150, 250], damageMult: [1.8, 3], rangeMult: [1.1, 1.3] },
    frost: { name: '冰霜', cost: 75, range: 70, damage: 5, fireRate: 20, color: '#5eead4', upgradeCost: [100, 175], damageMult: [1.5, 2], rangeMult: [1.2, 1.4], slow: 0.5 },
    bomb: { name: '炸弹', cost: 125, range: 60, damage: 25, fireRate: 60, color: '#ff5a7a', upgradeCost: [175, 300], damageMult: [1.5, 2.5], rangeMult: [1.2, 1.4], aoe: 40 },
  };

  // 状态
  let towers = [];
  let enemies = [];
  let bullets = [];
  let particles = [];
  let gold = 200;
  let lives = 20;
  let wave = 0;
  let gameOver = false;
  let paused = false;
  let started = false;
  let animId = null;
  let selectedTower = 'basic';
  let waveInProgress = false;
  let waveTimer = 0;
  let enemiesToSpawn = 0;
  let enemiesSpawned = 0;
  let bestWave = parseInt(localStorage.getItem('td-best') || '0', 10);
  let placingTower = null;

  // DOM
  const goldEl = document.getElementById('gold');
  const livesEl = document.getElementById('lives');
  const waveEl = document.getElementById('wave');
  const bestEl = document.getElementById('best');
  const liveEl = document.getElementById('live');
  const startWaveBtn = document.getElementById('start-wave');
  const restartBtn = document.getElementById('restart');

  function updateHUD() {
    goldEl.textContent = gold;
    livesEl.textContent = lives;
    waveEl.textContent = wave;
    bestEl.textContent = bestWave;
  }

  function announce(msg) {
    if (liveEl) liveEl.textContent = msg;
  }

  // 生成敌人
  function spawnEnemy() {
    const types = wave < 3 ? ['basic'] : wave < 6 ? ['basic', 'fast'] : wave < 10 ? ['basic', 'fast', 'tank'] : ['basic', 'fast', 'tank', 'boss'];
    const type = types[Math.floor(Math.random() * types.length)];
    const hp = type === 'boss' ? 200 + wave * 20 : type === 'tank' ? 30 + wave * 5 : type === 'fast' ? 8 + wave : 15 + wave * 2;
    const speed = type === 'fast' ? 2.5 : type === 'tank' ? 0.6 : type === 'boss' ? 0.8 : 1.2;
    const reward = type === 'boss' ? 50 : type === 'tank' ? 15 : type === 'fast' ? 8 : 10;
    const color = type === 'basic' ? '#ff5a7a' : type === 'fast' ? '#ffb45e' : type === 'tank' ? '#b39cff' : '#ff0040';
    const size = type === 'boss' ? 24 : type === 'tank' ? 16 : 10;
    enemies.push({
      pathIndex: 0,
      progress: 0,
      hp,
      maxHp: hp,
      speed,
      reward,
      color,
      size,
      type,
      slowTimer: 0,
    });
  }

  // 开始波次
  function startWave() {
    if (waveInProgress || gameOver) return;
    wave++;
    waveInProgress = true;
    enemiesToSpawn = 5 + wave * 2;
    enemiesSpawned = 0;
    waveTimer = 0;
    announce(`第 ${wave} 波开始`);
    updateHUD();
  }

  // 放置塔
  function placeTower(x, y) {
    const type = TOWER_TYPES[selectedTower];
    if (gold < type.cost) {
      announce('金币不足');
      return false;
    }
    // 检查是否在路径上
    if (isOnPath(x, y)) {
      announce('不能放在路径上');
      return false;
    }
    // 检查是否太近
    for (const t of towers) {
      const dist = Math.sqrt((t.x - x) ** 2 + (t.y - y) ** 2);
      if (dist < 40) {
        announce('太靠近其他塔');
        return false;
      }
    }
    gold -= type.cost;
    towers.push({
      x, y,
      type: selectedTower,
      level: 0,
      cooldown: 0,
      target: null,
    });
    updateHUD();
    announce(`放置 ${type.name} 塔`);
    return true;
  }

  function isOnPath(x, y) {
    for (let i = 0; i < PATH.length - 1; i++) {
      const a = PATH[i];
      const b = PATH[i + 1];
      // 点到线段距离
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const lenSq = dx * dx + dy * dy;
      let t = ((x - a.x) * dx + (y - a.y) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const projX = a.x + t * dx;
      const projY = a.y + t * dy;
      const dist = Math.sqrt((x - projX) ** 2 + (y - projY) ** 2);
      if (dist < 20) return true;
    }
    return false;
  }

  // 升级塔
  function upgradeTower(tower) {
    const type = TOWER_TYPES[tower.type];
    if (tower.level >= 2) {
      announce('已满级');
      return false;
    }
    const cost = type.upgradeCost[tower.level];
    if (gold < cost) {
      announce('金币不足');
      return false;
    }
    gold -= cost;
    tower.level++;
    updateHUD();
    announce(`${type.name} 塔升级到 ${tower.level + 1} 级`);
    return true;
  }

  // 粒子
  function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 1,
        color,
        r: Math.random() * 2 + 1,
      });
    }
  }

  // 更新
  function update() {
    if (gameOver || paused || !started) return;

    // 生成敌人
    if (waveInProgress) {
      waveTimer--;
      if (waveTimer <= 0 && enemiesSpawned < enemiesToSpawn) {
        spawnEnemy();
        enemiesSpawned++;
        waveTimer = Math.max(20, 60 - wave * 2);
      }
      if (enemiesSpawned >= enemiesToSpawn && enemies.length === 0) {
        waveInProgress = false;
        gold += 50 + wave * 10;
        announce(`第 ${wave} 波完成！获得 ${50 + wave * 10} 金币`);
        updateHUD();
      }
    }

    // 更新敌人
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (e.slowTimer > 0) e.slowTimer--;
      const speed = e.slowTimer > 0 ? e.speed * 0.5 : e.speed;

      // 沿路径移动
      if (e.pathIndex < PATH.length - 1) {
        const a = PATH[e.pathIndex];
        const b = PATH[e.pathIndex + 1];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        e.progress += speed / len;
        if (e.progress >= 1) {
          e.progress = 0;
          e.pathIndex++;
        }
        const t = e.progress;
        e.x = a.x + t * (b.x - a.x);
        e.y = a.y + t * (b.y - a.y);
      } else {
        // 到达终点
        lives--;
        enemies.splice(i, 1);
        updateHUD();
        if (lives <= 0) {
          gameOver = true;
          if (wave > bestWave) {
            bestWave = wave;
            localStorage.setItem('td-best', bestWave);
            bestEl.textContent = bestWave;
          }
          showGameOver();
        }
      }
    }

    // 塔攻击
    for (const tower of towers) {
      const type = TOWER_TYPES[tower.type];
      const range = type.range * (tower.level > 0 ? type.rangeMult[tower.level - 1] : 1);
      const damage = type.damage * (tower.level > 0 ? type.damageMult[tower.level - 1] : 1);

      tower.cooldown--;
      if (tower.cooldown <= 0) {
        // 找最近的敌人
        let closest = null;
        let closestDist = range;
        for (const e of enemies) {
          const dist = Math.sqrt((e.x - tower.x) ** 2 + (e.y - tower.y) ** 2);
          if (dist < closestDist) {
            closestDist = dist;
            closest = e;
          }
        }
        if (closest) {
          tower.target = closest;
          tower.cooldown = type.fireRate;
          // 创建子弹
          if (type.aoe) {
            // 炸弹：范围伤害
            bullets.push({
              x: tower.x,
              y: tower.y,
              target: closest,
              speed: 6,
              damage,
              color: type.color,
              aoe: type.aoe,
              type: 'bomb',
            });
          } else {
            bullets.push({
              x: tower.x,
              y: tower.y,
              target: closest,
              speed: 8,
              damage,
              color: type.color,
              slow: type.slow || 0,
              type: 'normal',
            });
          }
        }
      }
    }

    // 更新子弹
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      if (b.target && enemies.includes(b.target)) {
        const dx = b.target.x - b.x;
        const dy = b.target.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < b.speed) {
          // 命中
          if (b.aoe) {
            // 范围伤害
            for (const e of enemies) {
              const d = Math.sqrt((e.x - b.target.x) ** 2 + (e.y - b.target.y) ** 2);
              if (d < b.aoe) {
                e.hp -= b.damage;
                spawnParticles(e.x, e.y, '#ff5a7a', 4);
              }
            }
          } else {
            b.target.hp -= b.damage;
            if (b.slow) b.target.slowTimer = 60;
            spawnParticles(b.target.x, b.target.y, b.color, 2);
          }
          bullets.splice(i, 1);

          // 检查死亡
          for (let j = enemies.length - 1; j >= 0; j--) {
            if (enemies[j].hp <= 0) {
              gold += enemies[j].reward;
              spawnParticles(enemies[j].x, enemies[j].y, enemies[j].color, 6);
              enemies.splice(j, 1);
              updateHUD();
            }
          }
        } else {
          b.x += (dx / dist) * b.speed;
          b.y += (dy / dist) * b.speed;
        }
      } else {
        bullets.splice(i, 1);
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
  }

  // 绘制
  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#080d18';
    ctx.fillRect(0, 0, W, H);

    // 路径
    ctx.strokeStyle = 'rgba(255, 180, 94, 0.15)';
    ctx.lineWidth = 24;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(PATH[0].x, PATH[0].y);
    for (let i = 1; i < PATH.length; i++) {
      ctx.lineTo(PATH[i].x, PATH[i].y);
    }
    ctx.stroke();

    // 路径中心线
    ctx.strokeStyle = 'rgba(255, 180, 94, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PATH[0].x, PATH[0].y);
    for (let i = 1; i < PATH.length; i++) {
      ctx.lineTo(PATH[i].x, PATH[i].y);
    }
    ctx.stroke();

    // 塔
    for (const tower of towers) {
      const type = TOWER_TYPES[tower.type];
      ctx.fillStyle = type.color;
      ctx.beginPath();
      ctx.arc(tower.x, tower.y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.arc(tower.x - 2, tower.y - 2, 4, 0, Math.PI * 2);
      ctx.fill();
      // 等级
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(tower.level + 1, tower.x, tower.y + 3);
      // 范围（选中时）
      if (tower === selectedTowerObj) {
        const range = type.range * (tower.level > 0 ? type.rangeMult[tower.level - 1] : 1);
        ctx.strokeStyle = type.color + '40';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(tower.x, tower.y, range, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // 敌人
    for (const e of enemies) {
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size / 2, 0, Math.PI * 2);
      ctx.fill();
      // HP 条
      ctx.fillStyle = '#333';
      ctx.fillRect(e.x - e.size / 2, e.y - e.size / 2 - 4, e.size, 3);
      ctx.fillStyle = '#7cff6b';
      ctx.fillRect(e.x - e.size / 2, e.y - e.size / 2 - 4, e.size * (e.hp / e.maxHp), 3);
    }

    // 子弹
    for (const b of bullets) {
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
      ctx.fill();
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
  }

  let selectedTowerObj = null;

  // 点击
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // 检查是否点击了塔
    for (const tower of towers) {
      const dist = Math.sqrt((tower.x - x) ** 2 + (tower.y - y) ** 2);
      if (dist < 15) {
        selectedTowerObj = tower;
        announce(`选中 ${TOWER_TYPES[tower.type].name} 塔 (Lv${tower.level + 1})`);
        return;
      }
    }

    // 双击升级
    if (selectedTowerObj) {
      const dist = Math.sqrt((selectedTowerObj.x - x) ** 2 + (selectedTowerObj.y - y) ** 2);
      if (dist < 15) {
        upgradeTower(selectedTowerObj);
        return;
      }
    }

    selectedTowerObj = null;

    // 放置新塔
    if (!gameOver && started) {
      placeTower(x, y);
    }
  });

  // 触屏
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const touch = e.touches[0];
    const x = (touch.clientX - rect.left) * scaleX;
    const y = (touch.clientY - rect.top) * scaleY;

    for (const tower of towers) {
      const dist = Math.sqrt((tower.x - x) ** 2 + (tower.y - y) ** 2);
      if (dist < 20) {
        selectedTowerObj = tower;
        return;
      }
    }

    selectedTowerObj = null;
    if (!gameOver && started) {
      placeTower(x, y);
    }
  }, { passive: false });

  // 塔类型选择
  document.querySelectorAll('[data-tower]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-tower]').forEach(b => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
      selectedTower = btn.dataset.tower;
    });
  });

  function showOverlay(kicker, title, text, btnText, action) {
    const overlay = document.createElement('div');
    overlay.className = 'td-result';
    overlay.innerHTML = `
      <div class="td-result-card">
        <p class="overlay-kicker">${kicker}</p>
        <h2>${title}</h2>
        <p>${text}</p>
        <div class="cta-row"><button class="btn btn-primary" id="td-action">${btnText}</button></div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('td-action').addEventListener('click', () => {
      overlay.remove();
      action();
    });
  }

  function showGameOver() {
    showOverlay('游戏结束', 'Game Over', `波次: ${wave} · 金币: ${gold}`, '重新开始', startGame);
  }

  startWaveBtn.addEventListener('click', startWave);
  restartBtn.addEventListener('click', startGame);

  // 游戏循环
  function gameLoop() {
    if (!gameOver && !paused && started) {
      update();
    }
    draw();
    animId = requestAnimationFrame(gameLoop);
  }

  function startGame() {
    towers = [];
    enemies = [];
    bullets = [];
    particles = [];
    gold = 200;
    lives = 20;
    wave = 0;
    gameOver = false;
    paused = false;
    started = true;
    waveInProgress = false;
    enemiesToSpawn = 0;
    enemiesSpawned = 0;
    selectedTowerObj = null;
    updateHUD();
    bestEl.textContent = bestWave;
    announce('游戏开始，点击开始波次');
    if (animId) cancelAnimationFrame(animId);
    animId = requestAnimationFrame(gameLoop);
  }

  // 初始化
  bestEl.textContent = bestWave;
  updateHUD();
  animId = requestAnimationFrame(gameLoop);
})();
