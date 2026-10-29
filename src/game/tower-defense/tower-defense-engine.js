/**
 * Unified Matrix Tower Defense Engine
 * Integrates Stage 1 (Nexus), Stage 2 (Syndicate Siege), and Stage 3 (Boss Emergence)
 * Features continuous wave placement, infinite wave loop, and cross-arcade points sync.
 */

const CELL_SIZE = 40;
const COLS = 20;
const ROWS = 12;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 480;

// Path definitions for each stage
const STAGE_PATHS = {
  nexus: [
    {x:0, y:2}, {x:4, y:2}, {x:4, y:6}, {x:8, y:6}, {x:8, y:3},
    {x:13, y:3}, {x:13, y:8}, {x:17, y:8}, {x:17, y:5}, {x:19, y:5}
  ],
  syndicate: [
    {x:0, y:1}, {x:2, y:1}, {x:2, y:9}, {x:7, y:9}, {x:7, y:2},
    {x:12, y:2}, {x:12, y:8}, {x:16, y:8}, {x:16, y:4}, {x:19, y:4}
  ],
  boss: [
    {x:0, y:5}, {x:5, y:5}, {x:5, y:2}, {x:10, y:2}, {x:10, y:9},
    {x:15, y:9}, {x:15, y:5}, {x:19, y:5}
  ]
};

// Interpolate grid waypoint paths into smooth step arrays
function buildPath(waypoints) {
  const full = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const cur = waypoints[i];
    const nxt = waypoints[i + 1];
    let cx = cur.x, cy = cur.y;
    while (cx !== nxt.x || cy !== nxt.y) {
      full.push({ x: cx, y: cy });
      if (cx < nxt.x) cx++;
      else if (cx > nxt.x) cx--;
      else if (cy < nxt.y) cy++;
      else if (cy > nxt.y) cy--;
    }
  }
  full.push(waypoints[waypoints.length - 1]);
  return full;
}

// Tower configurations
const TOWER_TYPES = {
  pulse: { name: 'Pulse Turret', label: 'P', cost: 60, range: 110, damage: 18, cooldown: 28, color: '#00f2ff', desc: 'Standard reliable fire' },
  rapid: { name: 'Rapid Ion', label: 'R', cost: 100, range: 90, damage: 7, cooldown: 7, color: '#facc15', desc: 'High fire rate' },
  sniper: { name: 'Railgun', label: 'S', cost: 160, range: 240, damage: 95, cooldown: 85, color: '#bc13fe', desc: 'Extreme range & damage' },
  emp: { name: 'EMP Dampener', label: 'E', cost: 140, range: 120, damage: 5, cooldown: 35, color: '#38bdf8', effect: 'slow', desc: 'Slows down hostiles' },
  plasma: { name: 'Plasma Launcher', label: 'M', cost: 220, range: 140, damage: 28, cooldown: 55, color: '#fb923c', effect: 'splash', desc: 'Area splash damage' },
  tesla: { name: 'Tesla Coil', label: 'T', cost: 260, range: 115, damage: 32, cooldown: 40, color: '#e879f9', effect: 'chain', desc: 'Chain lightning attacks' }
};

class TowerDefenseGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.stage = 'nexus';
    this.path = buildPath(STAGE_PATHS.nexus);

    // Progression state
    this.credits = 160;
    this.health = 25;
    this.maxHealth = 25;
    this.wave = 1;
    this.score = 0;
    this.autoWave = false;

    // Entities
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.floatingTexts = [];

    // Wave spawning state
    this.waveActive = false;
    this.enemiesToSpawn = 0;
    this.spawnTimer = 0;
    this.selectedTowerKey = 'pulse';

    // Permanent upgrades from vault
    this.vault = {
      economy: 0,
      integrity: 0,
      damage: 0,
      points: Number(localStorage.getItem('amazing_grace_points') || 100)
    };

    this.loadVault();
    this.setupUI();
    this.setupEvents();
    this.applyVaultBonuses();

    // Start loop
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  loadVault() {
    try {
      const saved = localStorage.getItem('aghl_td_vault');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.vault = { ...this.vault, ...parsed };
      }
    } catch (e) {}
  }

  saveVault() {
    try {
      localStorage.setItem('aghl_td_vault', JSON.stringify(this.vault));
      localStorage.setItem('amazing_grace_points', String(this.vault.points));
    } catch (e) {}
    this.updateHUD();
  }

  applyVaultBonuses() {
    this.credits = 160 + (this.vault.economy * 50);
    this.maxHealth = 25 + (this.vault.integrity * 10);
    this.health = this.maxHealth;
    this.updateHUD();
  }

  setupUI() {
    const sel = document.getElementById('tower-selector');
    sel.innerHTML = '';
    for (const [key, t] of Object.entries(TOWER_TYPES)) {
      const card = document.createElement('div');
      card.className = `tower-card ${key === this.selectedTowerKey ? 'selected' : ''}`;
      card.dataset.tower = key;
      card.innerHTML = `
        <div class="icon" style="background:${t.color}">${t.label}</div>
        <div class="name">${t.name}</div>
        <div class="cost">${t.cost} C</div>
      `;
      card.addEventListener('click', () => {
        document.querySelectorAll('.tower-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedTowerKey = key;
      });
      sel.appendChild(card);
    }
  }

  setupEvents() {
    // Canvas placement
    const handlePointer = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;
      this.placeTower(Math.floor(x / CELL_SIZE), Math.floor(y / CELL_SIZE));
    };

    this.canvas.addEventListener('click', handlePointer);
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      handlePointer(e);
    }, { passive: false });

    // Buttons
    document.getElementById('btn-wave').addEventListener('click', () => this.startWave());
    document.getElementById('btn-auto-wave').addEventListener('click', (e) => {
      this.autoWave = !this.autoWave;
      e.target.textContent = `Auto-Wave: ${this.autoWave ? 'ON' : 'OFF'}`;
      if (this.autoWave && !this.waveActive) this.startWave();
    });

    document.getElementById('btn-restart').addEventListener('click', () => {
      this.towers = [];
      this.enemies = [];
      this.projectiles = [];
      this.wave = 1;
      this.waveActive = false;
      this.applyVaultBonuses();
    });

    // Stage Tabs
    document.getElementById('tab-nexus').addEventListener('click', () => this.switchStage('nexus'));
    document.getElementById('tab-syndicate').addEventListener('click', () => this.switchStage('syndicate'));
    document.getElementById('tab-boss').addEventListener('click', () => this.switchStage('boss'));

    // Shop modal
    const shop = document.getElementById('modal-shop');
    document.getElementById('btn-shop').addEventListener('click', () => {
      this.updateVaultModal();
      shop.classList.add('open');
    });
    document.getElementById('btn-close-shop').addEventListener('click', () => shop.classList.remove('open'));

    document.getElementById('buy-economy').addEventListener('click', () => this.buyUpgrade('economy', 100));
    document.getElementById('buy-integrity').addEventListener('click', () => this.buyUpgrade('integrity', 120));
    document.getElementById('buy-damage').addEventListener('click', () => this.buyUpgrade('damage', 150));
  }

  switchStage(stageKey) {
    this.stage = stageKey;
    this.path = buildPath(STAGE_PATHS[stageKey]);
    document.querySelectorAll('.stage-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab-${stageKey}`).classList.add('active');

    const titleEl = document.getElementById('stage-title');
    const descEl = document.getElementById('stage-desc');
    if (stageKey === 'nexus') {
      titleEl.textContent = 'Nexus Defense (Stage 1)';
      descEl.textContent = 'Standard grid defense. Establish core turrets to hold off the rogue breach.';
    } else if (stageKey === 'syndicate') {
      titleEl.textContent = 'Syndicate Siege (Stage 2)';
      descEl.textContent = 'Heavy armor hostiles with shield mechanics. Railguns and EMPs recommended!';
    } else {
      titleEl.textContent = 'Boss Emergence (Stage 3)';
      descEl.textContent = 'High-density titan combat with cosmic aura attacks. Focus fire!';
    }

    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.waveActive = false;
    this.updateHUD();
  }

  placeTower(col, row) {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;

    // Check if on path
    const isOnPath = this.path.some(p => p.x === col && p.y === row);
    if (isOnPath) {
      this.addFloatingText('Cannot place on infiltration path!', col * CELL_SIZE + 20, row * CELL_SIZE, '#ef4444');
      return;
    }

    // Check if existing tower
    const existing = this.towers.find(t => t.col === col && t.row === row);
    if (existing) {
      const upgradeCost = Math.floor(existing.def.cost * 0.8 * existing.level);
      if (this.credits >= upgradeCost) {
        this.credits -= upgradeCost;
        existing.level++;
        existing.damage = Math.floor(existing.damage * 1.35);
        existing.range += 12;
        this.addFloatingText(`Level ${existing.level} ✦`, existing.x, existing.y - 10, '#7effd8');
        this.updateHUD();
      } else {
        this.addFloatingText(`Need ${upgradeCost} C to upgrade`, existing.x, existing.y - 10, '#facc15');
      }
      return;
    }

    const def = TOWER_TYPES[this.selectedTowerKey];
    if (this.credits < def.cost) {
      this.addFloatingText(`Need ${def.cost} Credits`, col * CELL_SIZE + 20, row * CELL_SIZE, '#facc15');
      return;
    }

    this.credits -= def.cost;
    const dmgMultiplier = 1 + (this.vault.damage * 0.15);
    this.towers.push({
      col, row,
      x: col * CELL_SIZE + CELL_SIZE / 2,
      y: row * CELL_SIZE + CELL_SIZE / 2,
      def,
      damage: Math.floor(def.damage * dmgMultiplier),
      range: def.range,
      cooldown: 0,
      level: 1,
      angle: 0
    });

    this.addFloatingText(`+${def.name}`, col * CELL_SIZE + 20, row * CELL_SIZE, def.color);
    this.updateHUD();
  }

  startWave() {
    if (this.waveActive) return;
    this.waveActive = true;
    this.enemiesToSpawn = 6 + Math.floor(this.wave * 2.2);
    this.spawnTimer = 0;
    this.updateHUD();
  }

  spawnEnemy() {
    let hp = 30 + Math.pow(this.wave, 1.45) * 8;
    let speed = 1.1 + Math.min(this.wave * 0.04, 1.2);
    let color = '#ff0040';
    let type = 'drone';
    let reward = 15;

    // Special boss every 5 waves
    if (this.wave % 5 === 0 && this.enemiesToSpawn === 1) {
      type = 'titan_boss';
      hp *= 7;
      speed *= 0.6;
      color = '#e11d48';
      reward = 120;
    } else if (this.wave > 3 && Math.random() < 0.25) {
      type = 'speedster';
      hp *= 0.55;
      speed *= 1.8;
      color = '#facc15';
      reward = 20;
    } else if (this.wave > 4 && Math.random() < 0.3) {
      type = 'shielded';
      hp *= 1.8;
      speed *= 0.85;
      color = '#38bdf8';
      reward = 30;
    }

    this.enemies.push({
      pathIdx: 0,
      x: this.path[0].x * CELL_SIZE + CELL_SIZE / 2,
      y: this.path[0].y * CELL_SIZE + CELL_SIZE / 2,
      hp, maxHp: hp,
      speed,
      color,
      type,
      reward,
      slowDuration: 0
    });
  }

  update(dt) {
    // Spawning
    if (this.waveActive && this.enemiesToSpawn > 0) {
      this.spawnTimer++;
      if (this.spawnTimer >= Math.max(14, 45 - this.wave)) {
        this.spawnEnemy();
        this.enemiesToSpawn--;
        this.spawnTimer = 0;
      }
    } else if (this.waveActive && this.enemiesToSpawn === 0 && this.enemies.length === 0) {
      // Wave Cleared! Continuous flow - never locks placement
      this.waveActive = false;
      const waveReward = 40 + (this.wave * 10);
      const pointsReward = 15 + (this.wave * 5);
      this.credits += waveReward;
      this.score += pointsReward;
      this.vault.points += pointsReward;
      this.saveVault();

      this.addFloatingText(`WAVE ${this.wave} SECURED! +${waveReward} C`, CANVAS_WIDTH / 2, 80, '#7effd8');
      this.wave++;
      this.updateHUD();

      if (this.autoWave) {
        setTimeout(() => {
          if (!this.waveActive && this.autoWave) this.startWave();
        }, 1500);
      }
    }

    // Move enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const curSpeed = e.slowDuration > 0 ? e.speed * 0.5 : e.speed;
      if (e.slowDuration > 0) e.slowDuration--;

      const target = this.path[e.pathIdx + 1];
      if (!target) {
        // Reached Core
        this.health--;
        this.enemies.splice(i, 1);
        this.addFloatingText('-1 Core', CANVAS_WIDTH - 60, CANVAS_HEIGHT - 30, '#ef4444');
        this.updateHUD();
        if (this.health <= 0) {
          alert('Core breach detected! Rebuilding defenses...');
          this.applyVaultBonuses();
          this.towers = [];
          this.enemies = [];
          this.wave = 1;
          this.waveActive = false;
        }
        continue;
      }

      const tx = target.x * CELL_SIZE + CELL_SIZE / 2;
      const ty = target.y * CELL_SIZE + CELL_SIZE / 2;
      const dx = tx - e.x;
      const dy = ty - e.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= curSpeed) {
        e.x = tx;
        e.y = ty;
        e.pathIdx++;
      } else {
        e.x += (dx / dist) * curSpeed;
        e.y += (dy / dist) * curSpeed;
      }
    }

    // Tower targeting & shooting
    for (const t of this.towers) {
      if (t.cooldown > 0) t.cooldown--;

      // Find closest enemy in range
      let target = null;
      let closestDist = Infinity;
      for (const e of this.enemies) {
        const d = Math.hypot(e.x - t.x, e.y - t.y);
        if (d <= t.range && d < closestDist) {
          closestDist = d;
          target = e;
        }
      }

      if (target) {
        t.angle = Math.atan2(target.y - t.y, target.x - t.x);
        if (t.cooldown <= 0) {
          t.cooldown = t.def.cooldown;
          this.projectiles.push({
            x: t.x, y: t.y,
            target,
            speed: 9,
            damage: t.damage,
            color: t.def.color,
            effect: t.def.effect
          });
        }
      }
    }

    // Move projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      const dx = p.target.x - p.x;
      const dy = p.target.y - p.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= p.speed || !this.enemies.includes(p.target)) {
        if (this.enemies.includes(p.target)) {
          p.target.hp -= p.damage;
          if (p.effect === 'slow') p.target.slowDuration = 60;

          // Splash
          if (p.effect === 'splash') {
            for (const other of this.enemies) {
              if (other !== p.target && Math.hypot(other.x - p.x, other.y - p.y) < 65) {
                other.hp -= Math.floor(p.damage * 0.5);
              }
            }
          }

          if (p.target.hp <= 0) {
            const idx = this.enemies.indexOf(p.target);
            if (idx !== -1) {
              this.credits += p.target.reward;
              this.enemies.splice(idx, 1);
              this.updateHUD();
            }
          }
        }
        this.projectiles.splice(i, 1);
      } else {
        p.x += (dx / dist) * p.speed;
        p.y += (dy / dist) * p.speed;
      }
    }

    // Floating text decay
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 0.6;
      ft.life -= 0.02;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }
  }

  render() {
    this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw grid lines
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    this.ctx.lineWidth = 1;
    for (let c = 0; c <= COLS; c++) {
      this.ctx.beginPath();
      this.ctx.moveTo(c * CELL_SIZE, 0);
      this.ctx.lineTo(c * CELL_SIZE, CANVAS_HEIGHT);
      this.ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, r * CELL_SIZE);
      this.ctx.lineTo(CANVAS_WIDTH, r * CELL_SIZE);
      this.ctx.stroke();
    }

    // Draw Infiltration Path
    this.ctx.fillStyle = 'rgba(26, 32, 53, 0.7)';
    for (const p of this.path) {
      this.ctx.fillRect(p.x * CELL_SIZE + 2, p.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
    }

    // Draw Core Base
    const end = this.path[this.path.length - 1];
    this.ctx.fillStyle = '#00f2ff';
    this.ctx.shadowColor = '#00f2ff';
    this.ctx.shadowBlur = 15;
    this.ctx.fillRect(end.x * CELL_SIZE + 4, end.y * CELL_SIZE + 4, CELL_SIZE - 8, CELL_SIZE - 8);
    this.ctx.shadowBlur = 0;

    // Draw Towers
    for (const t of this.towers) {
      this.ctx.fillStyle = '#1e293b';
      this.ctx.fillRect(t.col * CELL_SIZE + 4, t.row * CELL_SIZE + 4, CELL_SIZE - 8, CELL_SIZE - 8);

      // Gun turret barrel
      this.ctx.save();
      this.ctx.translate(t.x, t.y);
      this.ctx.rotate(t.angle);
      this.ctx.fillStyle = t.def.color;
      this.ctx.shadowColor = t.def.color;
      this.ctx.shadowBlur = 8;
      this.ctx.beginPath();
      this.ctx.moveTo(12, 0);
      this.ctx.lineTo(-8, 7);
      this.ctx.lineTo(-4, 0);
      this.ctx.lineTo(-8, -7);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
      this.ctx.restore();

      if (t.level > 1) {
        this.ctx.fillStyle = '#7effd8';
        this.ctx.font = 'bold 10px monospace';
        this.ctx.fillText(`★${t.level}`, t.col * CELL_SIZE + 5, t.row * CELL_SIZE + 14);
      }
    }

    // Draw Enemies
    for (const e of this.enemies) {
      this.ctx.fillStyle = e.color;
      this.ctx.shadowColor = e.color;
      this.ctx.shadowBlur = e.type === 'titan_boss' ? 20 : 8;
      this.ctx.beginPath();
      const radius = e.type === 'titan_boss' ? 16 : (e.type === 'shielded' ? 10 : 8);
      this.ctx.arc(e.x, e.y, radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.shadowBlur = 0;

      // Health bar
      const pct = Math.max(0, e.hp / e.maxHp);
      this.ctx.fillStyle = '#ef4444';
      this.ctx.fillRect(e.x - 12, e.y - 14, 24, 3);
      this.ctx.fillStyle = '#22c55e';
      this.ctx.fillRect(e.x - 12, e.y - 14, 24 * pct, 3);
    }

    // Draw Projectiles
    for (const p of this.projectiles) {
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.effect === 'splash' ? 4 : 2.5, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Floating text
    for (const ft of this.floatingTexts) {
      this.ctx.globalAlpha = Math.max(0, ft.life);
      this.ctx.fillStyle = ft.color;
      this.ctx.font = 'bold 12px system-ui';
      this.ctx.fillText(ft.text, ft.x - 15, ft.y);
    }
    this.ctx.globalAlpha = 1.0;
  }

  loop(timestamp) {
    this.update();
    this.render();
    requestAnimationFrame((t) => this.loop(t));
  }

  addFloatingText(text, x, y, color = '#7effd8') {
    this.floatingTexts.push({ text, x, y, color, life: 1.0 });
  }

  updateHUD() {
    document.getElementById('credits').textContent = String(this.credits);
    document.getElementById('health').textContent = String(this.health);
    document.getElementById('wave').textContent = String(this.wave);
    document.getElementById('arcade-points').textContent = String(this.vault.points);
  }

  updateVaultModal() {
    document.getElementById('lvl-economy').textContent = String(this.vault.economy);
    document.getElementById('lvl-integrity').textContent = String(this.vault.integrity);
    document.getElementById('lvl-damage').textContent = String(this.vault.damage);
  }

  buyUpgrade(type, cost) {
    if (this.vault.points >= cost) {
      this.vault.points -= cost;
      this.vault[type]++;
      this.saveVault();
      this.updateVaultModal();
      this.applyVaultBonuses();
    } else {
      alert(`Need ${cost} arcade points! Play Star Matrix or win waves to earn more.`);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new TowerDefenseGame();
});
