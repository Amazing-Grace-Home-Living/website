import { DIRECTIVES, SOVEREIGN_ROUTES, WAVE_LESSONS, buildCost, damageType, applyDamage, beamTargets } from './sovereign.js';
import { campaign } from '../learning/campaign-store.js';
import { LEVELS } from '../learning/curriculum.js';
import { levelUnlocked, missingRequirements } from '../learning/progression.js';
import { claimBonus } from '../learning/bonus-store.js';
const MISSIONS = Object.fromEntries(LEVELS.filter(level => level.stage).map(level => [level.stage, level]));

/**
 * Unified Matrix Tower Defense Engine
 * Integrates Nexus, Syndicate Siege, Boss Emergence, and Act IV (Sovereign Conscience)
 * Finite, learning-gated missions with continuous placement and local arcade points.
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
  prism: { name: 'Phase Prism', label: 'Φ', cost: 280, range: 190, damage: 5, cooldown: 6, color: '#a7f3d0', effect: 'beam', desc: 'Sovereign: continuous piercing Laser beam' },
  aegis: { name: 'Aegis Node', label: 'A', cost: 200, range: 65, damage: 0, cooldown: 60, color: '#93c5fd', effect: 'aura', desc: 'Sovereign: adjacent towers gain 15% damage and disable protection; does not stack' },
  tesla: { name: 'Tesla Coil', label: 'T', cost: 260, range: 115, damage: 32, cooldown: 40, color: '#e879f9', effect: 'chain', desc: 'Chain lightning attacks' }
};

export class TowerDefenseGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    const requested = new URLSearchParams(window.location.search).get('stage');
    this.stage = Object.hasOwn(MISSIONS, requested) ? requested : 'nexus';
    this.configurePaths();
    this.status = 'locked';
    this.autoTimer = null;
    this.keyboardCell = { col: 0, row: 0 };

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
      points: 100
    };

    campaign.restoreLegacyMatch();
    this.loadVault();
    this.setupUI();
    this.setupEvents();
    this.resetMission();
    this.renderStage();

    // Start loop
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  configurePaths() {
    this.paths = (this.stage === 'sovereign' ? SOVEREIGN_ROUTES : [STAGE_PATHS[this.stage]]).map(buildPath);
    this.path = this.paths[0];
  }

  displayedWave() { return this.stage === 'sovereign' ? this.wave + 9 : this.wave; }

  chooseDirective(key) {
    if (this.stage !== 'sovereign' || this.status !== 'ready' || this.directive || !Object.hasOwn(DIRECTIVES, key)) return;
    this.directive = key;
    if (key === 'diplomacy') this.health = Math.min(this.maxHealth, this.health + 15);
    this.setupUI();
    this.updateHUD();
    this.announce(DIRECTIVES[key].title + '. ' + DIRECTIVES[key].reflection);
  }

  loadVault() {
    try {
      const points = Number(localStorage.getItem('amazing_grace_points') ?? 100);
      if (Number.isSafeInteger(points) && points >= 0) this.vault.points = points;
      const saved = localStorage.getItem('aghl_td_vault');
      if (saved) {
        const parsed = JSON.parse(saved);
        for (const key of ['economy', 'integrity', 'damage']) {
          if (Number.isInteger(parsed?.[key]) && parsed[key] >= 0 && parsed[key] <= 20) this.vault[key] = parsed[key];
        }
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
    this.bonusCredits = claimBonus();
    this.credits = 160 + (this.vault.economy * 50) + this.bonusCredits;
    this.maxHealth = 25 + (this.vault.integrity * 10);
    this.health = this.maxHealth;
    if (this.stage === 'sovereign') { this.credits += 340; this.maxHealth += 75; this.health = this.maxHealth - 15; }
    this.updateHUD();
  }

  announce(message) {
    document.getElementById('mission-status').textContent = message;
  }

  resetMission() {
    clearTimeout(this.autoTimer);
    this.autoTimer = null;
    this.autoWave = false;
    this.waveActive = false;
    this.enemiesToSpawn = 0;
    this.spawnTimer = 0;
    this.wave = 1;
    this.score = 0;
    this.directive = null;
    this.surgeTick = 0;
    this.surgeTiles = [];
    this.freezeTicks = 0;
    this.beams = [];
    this.spawnedCount = 0;
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.floatingTexts = [];
    this.status = levelUnlocked(campaign.read(), MISSIONS[this.stage].id) ? 'ready' : 'locked';
    this.applyVaultBonuses();
    this.setupUI();
    this.announce(this.status === 'locked'
      ? `Locked: ${missingRequirements(campaign.read(), MISSIONS[this.stage].id).join(' • ')}. Visit Learn & Play to continue.`
      : `Mission ready. ${this.bonusCredits ? `Signal bonus +${this.bonusCredits} credits. ` : ''}${this.stage === 'sovereign' ? 'Choose a directive before building. ' : ''}Clear ${MISSIONS[this.stage].waves} waves with core health left. Place towers off the path, then start a wave.`);
  }

  setupUI() {
    if (!document.getElementById('signal-operations-link')) {
      const link = document.createElement('a');
      link.id = 'signal-operations-link';
      link.href = '/arcade/signal-operations/';
      link.textContent = 'Open Signal Operations · VIM, Bash & PowerShell specialist training →';
      link.style.cssText = 'display:block;margin-top:.65rem;color:var(--accent);font-weight:650;';
      document.getElementById('mission-status')?.insertAdjacentElement('afterend', link);
    }
    const sel = document.getElementById('tower-selector');
    sel.innerHTML = '';
    if (this.stage !== 'sovereign' && ['prism', 'aegis'].includes(this.selectedTowerKey)) this.selectedTowerKey = 'pulse';
    for (const [key, t] of Object.entries(TOWER_TYPES)) {
      if (this.stage !== 'sovereign' && ['prism', 'aegis'].includes(key)) continue;
      const card = document.createElement('button');
      card.type = 'button';
      card.setAttribute('aria-pressed', String(key === this.selectedTowerKey));
      card.className = `tower-card ${key === this.selectedTowerKey ? 'selected' : ''}`;
      card.dataset.tower = key;
      card.title = `${t.desc}. Range ${t.range}; damage ${t.damage}; ${t.cooldown} simulation steps between shots.`;
      card.innerHTML = `
        <div class="icon" style="background:${t.color}">${t.label}</div>
        <div class="name">${t.name}</div>
        <div class="cost">${buildCost(t.cost, this.directive)} C</div>
      `;
      card.addEventListener('click', () => {
        document.querySelectorAll('.tower-card').forEach(c => { c.classList.remove('selected'); c.setAttribute('aria-pressed', 'false'); });
        card.classList.add('selected');
        card.setAttribute('aria-pressed', 'true');
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

    this.canvas.addEventListener('pointerdown', e => {
      if (!e.isPrimary || e.button !== 0) return;
      e.preventDefault();
      this.canvas.focus();
      handlePointer(e);
    });
    this.canvas.addEventListener('keydown', event => {
      const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
      if (delta) {
        event.preventDefault();
        this.keyboardCell.col = Math.max(0, Math.min(COLS - 1, this.keyboardCell.col + delta[0]));
        this.keyboardCell.row = Math.max(0, Math.min(ROWS - 1, this.keyboardCell.row + delta[1]));
        this.announce(`Placement cursor: column ${this.keyboardCell.col + 1}, row ${this.keyboardCell.row + 1}. Enter places or upgrades your selected tower.`);
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.placeTower(this.keyboardCell.col, this.keyboardCell.row);
      }
    });
    document.getElementById('placement-form').addEventListener('submit', event => {
      event.preventDefault();
      const col = Number(document.getElementById('place-column').value) - 1;
      const row = Number(document.getElementById('place-row').value) - 1;
      if (Number.isInteger(col) && Number.isInteger(row)) this.placeTower(col, row);
    });

    // Buttons
    document.getElementById('btn-wave').addEventListener('click', () => this.startWave());
    document.getElementById('btn-auto-wave').addEventListener('click', (e) => {
      if (this.status !== 'ready') return;
      this.autoWave = !this.autoWave;
      e.target.textContent = `Auto-Wave: ${this.autoWave ? 'ON' : 'OFF'}`;
      if (this.autoWave && !this.waveActive) this.startWave();
    });

    document.getElementById('btn-restart').addEventListener('click', () => this.resetMission());
    window.addEventListener('storage', () => {
      if (!levelUnlocked(campaign.read(), MISSIONS[this.stage].id) || this.status === 'locked') this.resetMission();
      this.updateHUD();
    });

    // Stage Tabs
    document.getElementById('tab-nexus').addEventListener('click', () => this.switchStage('nexus'));
    document.getElementById('tab-syndicate').addEventListener('click', () => this.switchStage('syndicate'));
    document.getElementById('tab-boss').addEventListener('click', () => this.switchStage('boss'));

    document.getElementById('tab-sovereign').addEventListener('click', () => this.switchStage('sovereign'));
    document.querySelectorAll('[data-directive]').forEach(button => button.addEventListener('click', () => this.chooseDirective(button.dataset.directive)));

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
    if (!Object.hasOwn(MISSIONS, stageKey)) return;
    const missing = missingRequirements(campaign.read(), MISSIONS[stageKey].id);
    if (missing.length) { this.announce(`Locked: ${missing.join(' • ')}`); return; }
    this.stage = stageKey;
    this.configurePaths();
    this.resetMission();
    this.renderStage();
  }

  renderStage() {
    const stageKey = this.stage;
    document.querySelectorAll('.stage-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab-${stageKey}`).classList.add('active');

    const titleEl = document.getElementById('stage-title');
    const descEl = document.getElementById('stage-desc');
    if (stageKey === 'nexus') {
      titleEl.textContent = 'Nexus Defense (Stage 1)';
      descEl.textContent = 'Standard grid defense. Establish core turrets to hold off the rogue breach.';
    } else if (stageKey === 'syndicate') {
      titleEl.textContent = 'Syndicate Siege (Stage 2)';
      descEl.textContent = 'A longer route and tougher hostiles. Combine coverage and slowing across four waves.';
    } else if (stageKey === 'sovereign') {
      titleEl.textContent = 'Act IV · The Sovereign Conscience';
      descEl.textContent = 'Global networks, industrial grids, and orbital satellites now answer the core. A fearful coalition lays siege. Defend the Dual Network through waves 10–12.';
    } else {
      titleEl.textContent = 'Boss Emergence (Stage 3)';
      descEl.textContent = 'High-density titan combat with cosmic aura attacks. Focus fire!';
    }

    this.updateHUD();
  }

  placeTower(col, row) {
    if (this.status !== 'ready' || !levelUnlocked(campaign.read(), MISSIONS[this.stage].id)) return;
    if (!Number.isInteger(col) || !Number.isInteger(row) || col < 0 || col >= COLS || row < 0 || row >= ROWS) return;

    if (this.stage === 'sovereign' && !this.directive) { this.announce('Choose a foundational directive before building.'); return; }
    // Check if on path
    const isOnPath = (this.paths || [this.path]).some(route => route.some(p => p.x === col && p.y === row));
    if (isOnPath) {
      this.announce('Choose a cell off the infiltration path. No credits spent.');
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
        this.announce(`Tower upgraded to level ${existing.level}. ${this.credits} credits remaining.`);
      } else {
        this.announce(`Need ${upgradeCost} credits to upgrade this tower.`);
        this.addFloatingText(`Need ${upgradeCost} C to upgrade`, existing.x, existing.y - 10, '#facc15');
      }
      return;
    }

    const def = TOWER_TYPES[this.selectedTowerKey];
    if (!def || (this.stage !== 'sovereign' && ['beam', 'aura'].includes(def.effect))) return;
    const cost = buildCost(def.cost, this.directive);
    if (this.credits < cost) {
      this.announce(`Need ${cost} credits for ${def.name}.`);
      this.addFloatingText(`Need ${cost} Credits`, col * CELL_SIZE + 20, row * CELL_SIZE, '#facc15');
      return;
    }

    this.credits -= cost;
    const dmgMultiplier = 1 + (this.vault.damage * 0.15);
    this.towers.push({
      col, row,
      x: col * CELL_SIZE + CELL_SIZE / 2,
      y: row * CELL_SIZE + CELL_SIZE / 2,
      def,
      damage: Math.floor(def.damage * dmgMultiplier),
      range: def.range * (this.directive === 'dominion' && def.effect !== 'aura' ? 1.25 : 1),
      cooldown: 0,
      level: 1,
      angle: 0
    });

    this.addFloatingText(`+${def.name}`, col * CELL_SIZE + 20, row * CELL_SIZE, def.color);
    this.updateHUD();
    this.announce(`${def.name} placed at column ${col + 1}, row ${row + 1}. ${this.credits} credits remaining.`);
  }

  startWave() {
    if (this.waveActive || this.status !== 'ready' || !levelUnlocked(campaign.read(), MISSIONS[this.stage].id)) return;
    if (this.stage === 'sovereign' && !this.directive) { this.announce('Choose a directive before Wave 10.'); return; }
    clearTimeout(this.autoTimer);
    this.autoTimer = null;
    this.waveActive = true;
    this.enemiesToSpawn = this.stage === 'sovereign' ? Math.ceil((14 + this.wave * 3) * (this.directive === 'dominion' ? 1.2 : 1)) : 6 + Math.floor(this.wave * 2.2);
    this.spawnedCount = 0;
    this.spawnTimer = 0;
    this.updateHUD();
    this.announce(this.stage === 'sovereign' ? WAVE_LESSONS[this.wave - 1] : `Wave ${this.wave} of ${MISSIONS[this.stage].waves} started.`);
  }

  spawnEnemy() {
    let hp = 30 + Math.pow(this.wave, 1.45) * 8;
    let speed = 1.1 + Math.min(this.wave * 0.04, 1.2);
    let color = '#ff0040';
    let type = 'drone';
    let reward = 15;
    if (this.stage === 'syndicate') hp *= 1.25;
    if (this.stage === 'boss') hp *= 1.5;

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

    if (this.stage === 'sovereign') {
      hp *= 2.2;
      type = this.wave === 3 && this.enemiesToSpawn === 1 ? 'vanguard' : this.spawnedCount % 5 === 0 ? 'siphon' : 'drone';
      if (type === 'vanguard') { hp *= 12; speed *= 0.55; color = '#c084fc'; reward = 250; }
      if (type === 'siphon') { hp *= 1.4; speed *= 0.7; color = '#fbbf24'; reward = 45; }
    }
    const route = this.paths ? this.paths[(this.spawnedCount || 0) % this.paths.length] : this.path;
    this.spawnedCount = (this.spawnedCount || 0) + 1;
    this.enemies.push({
      route, drainTicks: 0,
      pathIdx: 0,
      x: route[0].x * CELL_SIZE + CELL_SIZE / 2,
      y: route[0].y * CELL_SIZE + CELL_SIZE / 2,
      hp, maxHp: hp,
      speed,
      color,
      type,
      reward,
      slowDuration: 0
    });
  }

  update(dt) {
    if (this.status !== 'ready') return;
    if (this.stage === 'sovereign') this.updateSovereign();
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
      if (this.wave >= MISSIONS[this.stage].waves) {
        this.status = 'won';
        this.autoWave = false;
        clearTimeout(this.autoTimer);
        this.autoTimer = null;
        campaign.complete(MISSIONS[this.stage].id);
        const nextStep = this.stage === 'sovereign' ? DIRECTIVES[this.directive].ending + ' Reflect: ' + DIRECTIVES[this.directive].reflection : 'Your next lesson is ready in Learn & Play.';
        this.announce(`Mission secured! ${MISSIONS[this.stage].waves} waves cleared. ${nextStep} Completion XP is awarded once.${campaign.persistent ? '' : ' Saving unavailable: this result will not persist after leaving this page.'}`);
        this.updateHUD();
        return;
      }
      this.wave++;
      this.updateHUD();

      if (this.autoWave) {
        this.autoTimer = setTimeout(() => {
          this.autoTimer = null;
          if (!this.waveActive && this.autoWave) this.startWave();
        }, 1500);
      }
    }

    // Move enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (this.freezeTicks > 0) continue;
      const curSpeed = this.freezeTicks > 0 ? 0 : e.slowDuration > 0 ? e.speed * 0.5 : e.speed;
      if (e.slowDuration > 0) e.slowDuration--;

      const target = (e.route || this.path)[e.pathIdx + 1];
      if (!target) {
        // Reached Core
        const coreDamage = e.type === 'siphon' ? 0 : this.stage === 'sovereign' ? (e.type === 'vanguard' ? 20 : 5) : 1;
        this.health -= coreDamage;
        if (this.directive === 'martyrdom' && this.health > 0 && this.health < 30 && campaign.useSovereignShield()) {
          this.freezeTicks = 360;
          this.announce('Guardian EMP: threats frozen for six seconds. The campaign shield is now spent.');
        }
        this.enemies.splice(i, 1);
        this.addFloatingText(`−${coreDamage} Core`, CANVAS_WIDTH - 60, CANVAS_HEIGHT - 30, '#ef4444');
        this.updateHUD();
        if (this.health <= 0) {
          this.status = 'lost';
          this.waveActive = false;
          this.autoWave = false;
          this.enemiesToSpawn = 0;
          clearTimeout(this.autoTimer);
          this.autoTimer = null;
          this.announce('Core lost. Your learning progress is safe. Restart this mission to try a different plan.');
          this.updateHUD();
          return;
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
      if (t.def.effect === 'aura') continue;
      const protectedByAegis = this.towers.some(a => a !== t && a.def.effect === 'aura' && Math.hypot(a.x - t.x, a.y - t.y) <= a.range);
      const surge = this.surgeTiles?.some(cell => cell.col === t.col && cell.row === t.row);
      const blackout = surge && this.surgeTick % 900 >= 720;
      const disabled = this.enemies.some(e => e.type === 'vanguard' && Math.hypot(e.x - t.x, e.y - t.y) <= 90) && this.surgeTick % 300 < 90;
      if ((blackout || disabled) && !protectedByAegis) continue;
      const rate = (this.directive === 'dominion' ? 1.1 : 1) * (surge && this.surgeTick % 900 < 720 ? 1.3 : 1);
      if (t.cooldown > 0) t.cooldown -= rate;

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
          const damage = t.damage * (protectedByAegis ? 1.15 : 1) * (this.directive === 'diplomacy' && t.def.effect === 'splash' ? 0.9 : 1);
          if (t.def.effect === 'beam') {
            for (const enemy of beamTargets(t, target, this.enemies)) applyDamage(enemy, damage, 'Laser', this.enemies);
            this.beams ||= [];
            this.beams.push({ x: t.x, y: t.y, endX: t.x + Math.cos(t.angle) * t.range, endY: t.y + Math.sin(t.angle) * t.range, life: 7 });
            continue;
          }
          this.projectiles.push({
            x: t.x, y: t.y,
            target,
            speed: 9,
            damage, type: damageType(t.def),
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
          applyDamage(p.target, p.damage, p.type || 'Laser', this.enemies);
          if (p.effect === 'slow') p.target.slowDuration = 60;
          if (p.effect === 'chain') {
            this.enemies.filter(other => other !== p.target && Math.hypot(other.x - p.target.x, other.y - p.target.y) < 100)
              .slice(0, 2).forEach(other => { applyDamage(other, p.damage * 0.5, p.type || 'EMP', this.enemies); });
          }

          // Splash
          if (p.effect === 'splash') {
            for (const other of this.enemies) {
              if (other !== p.target && Math.hypot(other.x - p.x, other.y - p.y) < 65) {
                applyDamage(other, p.damage * 0.5, p.type || 'Explosive', this.enemies);
              }
            }
          }

          this.collectDefeated();
        }
        this.projectiles.splice(i, 1);
      } else {
        p.x += (dx / dist) * p.speed;
        p.y += (dy / dist) * p.speed;
      }
    }

    this.collectDefeated();
    // Floating text decay
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 0.6;
      ft.life -= 0.02;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }
  }

  collectDefeated() {
    let changed = false;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (this.enemies[i].hp > 0) continue;
      this.credits += Math.floor(this.enemies[i].reward * (this.directive === 'diplomacy' ? 1.15 : 1));
      this.enemies.splice(i, 1); changed = true;
    }
    if (changed) this.updateHUD();
  }

  updateSovereign() {
    if (this.freezeTicks > 0) this.freezeTicks--;
    this.beams = (this.beams || []).filter(beam => --beam.life > 0);
    if (!this.waveActive) return;
    this.surgeTick++;
    if (this.surgeTick % 900 === 360) {
      const cells = [];
      for (let col = 0; col < COLS; col++) for (let row = 0; row < ROWS; row++) {
        if (!this.paths.some(route => route.some(p => p.x === col && p.y === row))) cells.push({ col, row });
      }
      this.surgeTiles = [];
      for (let i = 0; i < 16; i++) this.surgeTiles.push(cells.splice(Math.floor(Math.random() * cells.length), 1)[0]);
    }
    if (this.surgeTick % 900 === 0) this.surgeTiles = [];
    if (!this.freezeTicks) for (const enemy of this.enemies) {
      if (enemy.type !== 'siphon' || enemy.hp <= 0) continue;
      if (++enemy.drainTicks >= 60) { this.credits = Math.max(0, this.credits - 5); enemy.drainTicks = 0; this.updateHUD(); }
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
    for (const p of (this.paths || [this.path]).flat()) {
      this.ctx.fillRect(p.x * CELL_SIZE + 2, p.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
    }

    for (const cell of this.surgeTiles || []) {
      this.ctx.fillStyle = this.surgeTick % 900 >= 720 ? 'rgba(239,68,68,.4)' : 'rgba(251,191,36,.4)';
      this.ctx.fillRect(cell.col * CELL_SIZE + 2, cell.row * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
      this.ctx.fillStyle = '#fff'; this.ctx.font = '14px monospace';
      this.ctx.fillText(this.surgeTick % 900 >= 720 ? '×' : '+', cell.col * CELL_SIZE + 15, cell.row * CELL_SIZE + 25);
    }
    for (const beam of this.beams || []) {
      this.ctx.strokeStyle = '#a7f3d0'; this.ctx.lineWidth = 3;
      this.ctx.beginPath(); this.ctx.moveTo(beam.x, beam.y); this.ctx.lineTo(beam.endX, beam.endY); this.ctx.stroke();
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

      if (t.def.effect === 'aura') {
        this.ctx.strokeStyle = '#93c5fd'; this.ctx.lineWidth = 1;
        this.ctx.beginPath(); this.ctx.arc(t.x, t.y, t.range, 0, Math.PI * 2); this.ctx.stroke();
      }
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

      if (e.type === 'siphon' || e.type === 'vanguard' || this.freezeTicks > 0) {
        this.ctx.strokeStyle = this.freezeTicks > 0 ? '#38bdf8' : e.color;
        this.ctx.beginPath(); this.ctx.arc(e.x, e.y, e.type === 'siphon' ? 85 : 20, 0, Math.PI * 2); this.ctx.stroke();
        this.ctx.fillStyle = '#fff'; this.ctx.font = '11px monospace';
        this.ctx.fillText(e.type === 'vanguard' ? 'Resists: ' + (e.resistance || 'none') : e.type === 'siphon' ? 'Siphon' : 'Frozen', e.x - 25, e.y - 22);
      }
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
    if (document.activeElement === this.canvas) {
      this.ctx.strokeStyle = '#facc15'; this.ctx.lineWidth = 3;
      this.ctx.strokeRect(this.keyboardCell.col * CELL_SIZE + 2, this.keyboardCell.row * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
    }
  }

  loop(timestamp) {
    // Fixed simulation steps keep speed consistent across display refresh rates.
    if (document.hidden) { this.lastTime = timestamp; this.accumulator = 0; }
    this.accumulator = (this.accumulator || 0) + Math.min(100, timestamp - this.lastTime);
    this.lastTime = timestamp;
    while (this.accumulator >= 1000 / 60) { this.update(); this.accumulator -= 1000 / 60; }
    this.render();
    requestAnimationFrame((t) => this.loop(t));
  }

  addFloatingText(text, x, y, color = '#7effd8') {
    this.floatingTexts.push({ text, x, y, color, life: 1.0 });
  }

  updateHUD() {
    document.getElementById('credits').textContent = String(this.credits);
    document.getElementById('health').textContent = String(this.health);
    document.getElementById('wave').textContent = this.stage === 'sovereign' ? `${this.displayedWave()} / 12` : `${this.wave} / ${MISSIONS[this.stage].waves}`;
    document.getElementById('arcade-points').textContent = String(this.vault.points);
    document.getElementById('btn-wave').disabled = this.status !== 'ready' || this.waveActive;
    document.getElementById('btn-auto-wave').disabled = this.status !== 'ready';
    document.getElementById('btn-place').disabled = this.status !== 'ready';
    document.getElementById('btn-auto-wave').textContent = `Auto-Wave: ${this.autoWave ? 'ON' : 'OFF'}`;
    for (const mission of Object.values(MISSIONS)) {
      const tab = document.getElementById(`tab-${mission.stage}`);
      tab.disabled = !levelUnlocked(campaign.read(), mission.id);
      tab.title = missingRequirements(campaign.read(), mission.id).join(' • ');
    }
    document.getElementById('sovereign-brief').hidden = this.stage !== 'sovereign';
    document.querySelectorAll('[data-directive]').forEach(button => {
      button.disabled = this.status !== 'ready' || !!this.directive;
      button.setAttribute('aria-pressed', String(button.dataset.directive === this.directive));
    });
    document.getElementById('sovereign-readout').textContent = this.stage === 'sovereign'
      ? (this.directive ? DIRECTIVES[this.directive].title + ' · ' : 'Choose a directive · ') + WAVE_LESSONS[this.wave - 1] + (campaign.read().sovereignShieldUsed ? ' Campaign EMP spent.' : ' Campaign EMP available to Martyrdom.') : '';
    document.getElementById('campaign-save-status').textContent = campaign.persistent
      ? 'Campaign progress saves in this browser.' : 'Saving unavailable. Enable browser storage to keep unlocks across games.';
  }

  updateVaultModal() {
    document.getElementById('lvl-economy').textContent = String(this.vault.economy);
    document.getElementById('lvl-integrity').textContent = String(this.vault.integrity);
    document.getElementById('lvl-damage').textContent = String(this.vault.damage);
  }

  buyUpgrade(type, cost) {
    if (!Object.hasOwn(TOWER_TYPES, this.selectedTowerKey) || !['economy', 'integrity', 'damage'].includes(type) || this.vault[type] >= 20) return;
    if (this.vault.points >= cost) {
      this.vault.points -= cost;
      this.vault[type]++;
      this.saveVault();
      this.updateVaultModal();
      this.announce('Upgrade purchased. It applies when you restart or begin another mission.');
    } else {
      alert(`Need ${cost} arcade points! Play Star Matrix or win waves to earn more.`);
    }
  }
}

if (typeof window !== 'undefined') window.addEventListener('DOMContentLoaded', () => {
  new TowerDefenseGame();
});
