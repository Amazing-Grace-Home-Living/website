import { academy } from './state.js';
import { playerProfile } from './profile.js';
import { PS_QUESTIONS } from './content.js';
import { awardBonus } from '../learning/bonus-store.js';
export const BOSS_QUESTIONS=['processes-0','services-0','pipeline-0'];
    const TOWER_TYPES = {
      sentinel:{name:'Script Sentinel',cmd:'Script Sentinel',cost:220,range:175,damage:40,cooldown:26,color:'#6ee7b7',effect:'chain',desc:'Boss reward · chain defense (fictional)'},
      ping: {
        name: 'Test-Connection',
        cmd: 'Test-Connection (Ping Turret)',
        cost: 50,
        range: 120,
        damage: 15,
        cooldown: 22,
        color: '#60a5fa',
        icon: 'radio',
        desc: 'Rapid ICMP pulse stream.'
      },
      kill: {
        name: 'Stop-Process',
        cmd: 'Stop-Process (Rail Cannon)',
        cost: 110,
        range: 220,
        damage: 85,
        cooldown: 75,
        color: '#f87171',
        icon: 'slash',
        desc: 'High-caliber termination shot.'
      },
      where: {
        name: 'Where-Object',
        cmd: 'Where-Object (EMP Slow)',
        cost: 80,
        range: 130,
        damage: 6,
        cooldown: 30,
        color: '#38bdf8',
        icon: 'filter',
        effect: 'slow',
        desc: 'Filters speed out of hostiles.'
      },
      pipe: {
        name: 'ForEach-Object',
        cmd: 'ForEach-Object (Multi-Pipe)',
        cost: 140,
        range: 140,
        damage: 24,
        cooldown: 35,
        color: '#fbbf24',
        icon: 'repeat',
        effect: 'splash',
        desc: 'Iterative pipeline blast.'
      },
      regex: {
        name: 'Select-String',
        cmd: 'Select-String (Tesla Lock)',
        cost: 180,
        range: 130,
        damage: 32,
        cooldown: 40,
        color: '#c084fc',
        icon: 'search',
        effect: 'chain',
        desc: 'Regex pattern matcher strike.'
      }
    };

    /* ==========================================
       ENGINE CONFIG & PATHS
       ========================================== */
    const CELL_SIZE = 40;
    const COLS = 20;
    const ROWS = 12;
    const CANVAS_WIDTH = 800;
    const CANVAS_HEIGHT = 480;

    // Tactical circuit pathway
    const WAYPOINTS = [
      {x: 0, y: 2}, {x: 4, y: 2}, {x: 4, y: 8}, {x: 8, y: 8}, {x: 8, y: 3},
      {x: 13, y: 3}, {x: 13, y: 9}, {x: 17, y: 9}, {x: 17, y: 5}, {x: 19, y: 5}
    ];

    function buildPath(waypoints) {
      const full = [];
      for (let i = 0; i < waypoints.length - 1; i++) {
        let cx = waypoints[i].x, cy = waypoints[i].y;
        const nxt = waypoints[i + 1];
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

    export class PowerShellDefenseGame {
      constructor({store=academy,profile=playerProfile,onBoss=()=>{}}={}) {
        this.store=store;this.profile=profile;this.onBoss=onBoss;
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.path = buildPath(WAYPOINTS);

        this.credits = 220 + this.profile().unlocks.startingCredits;
        this.health = 25;
        this.maxHealth = 25;
        this.wave = 1;
        this.xp = 0;

        // Tactical Buff Multipliers from PowerShell Quizzes
        this.dmgBonus = 0;
        this.speedBonus = 0;

        this.selectedTowerKey = 'ping';
        this.towers = [];
        this.enemies = [];
        this.projectiles = [];
        this.floatingTexts = [];

        this.waveActive = false;
        this.enemiesToSpawn = 0;
        this.spawnTimer = 0;
        this.frame = null;

        this.reset();
        this.setupEvents();

      }

      setupUI() {
        const container = document.getElementById('towers-selector');
        container.innerHTML = '';
        for (const [key, t] of Object.entries(TOWER_TYPES)) {
          if(key==='sentinel'&&!this.profile().unlocks.scriptSentinel)continue;
          const btn = document.createElement('button');
          btn.className = `tower-btn p-2 rounded-lg bg-slate-900 border border-slate-700 text-left font-mono-code flex flex-col justify-between ${key === this.selectedTowerKey ? 'selected' : ''}`;
          btn.dataset.key = key;
          btn.type='button';btn.setAttribute('aria-pressed',String(key===this.selectedTowerKey));
          btn.innerHTML = `
            <div class="flex items-center justify-between w-full mb-1">
              <span class="text-xs font-bold text-slate-200 truncate">${t.name}</span>
              <span class="text-[10px] text-amber-400 font-bold">${t.cost} C</span>
            </div>
            <span class="text-[9px] text-slate-400 block">${t.desc}</span>
          `;
          btn.addEventListener('click', () => {
            document.querySelectorAll('.tower-btn').forEach(b => {b.classList.remove('selected');b.setAttribute('aria-pressed','false');});
            btn.classList.add('selected');btn.setAttribute('aria-pressed','true');
            this.selectedTowerKey = key;
            this.log(`Selected command unit: ${t.cmd}`);
          });
          container.appendChild(btn);
        }
      }

      reset(){
        this.towers=[];this.enemies=[];this.projectiles=[];this.floatingTexts=[];
        this.credits=220+this.profile().unlocks.startingCredits;this.health=25;this.maxHealth=25;this.wave=1;
        this.waveActive=false;this.enemiesToSpawn=0;this.spawnTimer=0;this.paused=false;this.status='ready';
        this.dmgBonus=0;this.speedBonus=0;this.bossAnswers=new Set();this.keyboardCell={col:0,row:0};
        this.selectedTowerKey='ping';this.accumulator=0;this.lastTime=null;
        this.setupUI();this.updateHUD();
      }
      setupEvents(){
        document.addEventListener('visibilitychange',()=>this.refreshFrame());
        this.canvas.addEventListener('focus',()=>this.refreshFrame());
        this.canvas.addEventListener('blur',()=>this.refreshFrame());
        this.canvas.addEventListener('pointerdown',event=>{
          if(!event.isPrimary||event.button!==0)return;
          event.preventDefault();this.canvas.focus();
          const box=this.canvas.getBoundingClientRect();
          this.placeTower(Math.floor((event.clientX-box.left)*COLS/box.width),Math.floor((event.clientY-box.top)*ROWS/box.height));
        });
        this.canvas.addEventListener('keydown',event=>{
          const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];
          if(delta){event.preventDefault();this.keyboardCell.col=Math.max(0,Math.min(COLS-1,this.keyboardCell.col+delta[0]));this.keyboardCell.row=Math.max(0,Math.min(ROWS-1,this.keyboardCell.row+delta[1]));this.log('Placement cursor: column '+(this.keyboardCell.col+1)+', row '+(this.keyboardCell.row+1));this.refreshFrame();}
          else if(event.key==='Enter'||event.key===' '){event.preventDefault();this.placeTower(this.keyboardCell.col,this.keyboardCell.row);}
        });
        document.getElementById('btn-start-wave').addEventListener('click',()=>this.startWave());
      }
      applyLesson(outcome){
        if(outcome.xp<=0)return;
        this.credits+=60;this.dmgBonus=Math.min(.6,this.dmgBonus+.05);this.speedBonus=Math.min(.3,this.speedBonus+.05);
        this.log('New learning progress: +60 credits, +5% damage and fire-rate bonus. Replays award no duplicate reward.');this.updateHUD();
      }
      answerBoss(id,answer){
        const boss=this.enemies.find(enemy=>enemy.boss&&enemy.shielded),question=PS_QUESTIONS.find(q=>q.id===id);
        if(!boss||!question||!BOSS_QUESTIONS.includes(id)||answer!==question.answer)return false;
        this.bossAnswers.add(id);
        if(this.bossAnswers.size>=3){boss.shielded=false;this.log('Rogue Script AI shield dropped. Turrets can now damage it.');}
        this.updateHUD();return true;
      }
      damageEnemy(enemy,damage){if(!enemy.shielded&&enemy.hp>0)enemy.hp-=damage;}
      collectDefeated(){
        let changed=false;
        for(let i=this.enemies.length-1;i>=0;i--){const enemy=this.enemies[i];if(enemy.hp>0||enemy.shielded)continue;
          this.credits+=enemy.reward;this.store.event({type:'packet'});
          if(enemy.boss){const before=this.store.read().boss;this.store.event({type:'boss'});this.setupUI();this.log(before?'Boss defeated again. No duplicate XP.':'Rogue Script AI defeated: +500 Security XP, Security Architect badge, Script Sentinel unlocked.');}
          this.enemies.splice(i,1);changed=true;
        }
        if(changed)this.updateHUD();
      }

      placeTower(col, row) {
        if(this.status!=='ready'||this.paused||!Number.isInteger(col)||!Number.isInteger(row)||col<0||col>=COLS||row<0||row>=ROWS)return;

        // Path collision check
        if (this.path.some(p => p.x === col && p.y === row)) {
          this.addFloatingText('Cannot bind to pathway!', col * CELL_SIZE + 20, row * CELL_SIZE, '#f87171');
          return;
        }

        // Upgrade existing tower
        const existing = this.towers.find(t => t.col === col && t.row === row);
        if (existing) {
          const upgradeCost = Math.floor(existing.def.cost * 0.8 * existing.level);
          if (this.credits >= upgradeCost) {
            this.credits -= upgradeCost;
            existing.level++;
            existing.damage = Math.floor(existing.damage * 1.4);
            existing.range += 14;
            this.addFloatingText(`Upgrade: L${existing.level} ✦`, existing.x, existing.y - 10, '#3b82f6');
            this.log(`Upgraded ${existing.def.name} to Level ${existing.level} (-${upgradeCost} C)`);
            this.updateHUD();
          } else {
            this.addFloatingText(`Need ${upgradeCost} Credits`, existing.x, existing.y - 10, '#facc15');
          }
          return;
        }

        const def = TOWER_TYPES[this.selectedTowerKey];
        if(!def||(this.selectedTowerKey==='sentinel'&&!this.profile().unlocks.scriptSentinel))return;
        if (this.credits < def.cost) {
          this.addFloatingText(`Need ${def.cost} Credits`, col * CELL_SIZE + 20, row * CELL_SIZE, '#facc15');
          return;
        }

        this.credits -= def.cost;
        const finalDamage = def.damage;
        this.towers.push({
          col, row,
          x: col * CELL_SIZE + CELL_SIZE / 2,
          y: row * CELL_SIZE + CELL_SIZE / 2,
          def,
          damage: finalDamage,
          range: def.range,
          cooldown: 0,
          level: 1,
          angle: 0
        });

        this.store.event({type:'deploy'});
        this.addFloatingText(`+${def.name}`, col * CELL_SIZE + 20, row * CELL_SIZE, def.color);
        this.log(`Deployed [${def.name}] at col ${col}, row ${row} (-${def.cost} C)`);
        this.updateHUD();
      }

      startWave() {
        if(this.waveActive||this.paused||this.status!=='ready')return;
        this.store.event({type:'reach',wave:this.wave});
        this.waveActive = true;
        this.enemiesToSpawn = 7 + Math.floor(this.wave * 2.5);
        this.spawnTimer = 0;
        this.log(`[WAVE ${this.wave}] Hostile payload injection started (${this.enemiesToSpawn} packets).`);
        document.getElementById('terminal-status').innerText = `PS C:\\Host\\Defense> Invoke-Command -Wave ${this.wave}`;
        this.updateHUD();
      }

      spawnEnemy() {
        let hp = 35 + Math.pow(this.wave, 1.4) * 9;
        let speed = 1.1 + Math.min(this.wave * 0.04, 1.1);
        let color = '#ef4444';
        let type = 'Malware Packet';
        let reward = 16;

        if (this.wave % 5 === 0 && this.enemiesToSpawn === 1) {
          type = this.wave===5?'Rogue Script AI':'Ransomware Titan';
          hp *= 6.5;
          speed *= 0.65;
          color = '#ec4899';
          reward = 130;
        } else if (this.wave > 2 && Math.random() < 0.28) {
          type = 'Trojan Swarm';
          hp *= 0.5;
          speed *= 1.85;
          color = '#facc15';
          reward = 20;
        } else if (this.wave > 3 && Math.random() < 0.3) {
          type = 'Rootkit Armored';
          hp *= 2.2;
          speed *= 0.85;
          color = '#38bdf8';
          reward = 32;
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
          boss:this.wave===5&&this.enemiesToSpawn===1,
          shielded:this.wave===5&&this.enemiesToSpawn===1,
          slowDuration: 0
        });
        this.updateHUD();
      }

      update() {
        if(this.paused||this.status!=='ready')return;
        if (this.waveActive && this.enemiesToSpawn > 0) {
          this.spawnTimer++;
          if (this.spawnTimer >= Math.max(14, 45 - this.wave)) {
            this.spawnEnemy();
            this.enemiesToSpawn--;
            if(this.enemies.at(-1)?.boss){this.onBoss();return;}
            this.spawnTimer = 0;
          }
        } else if (this.waveActive && this.enemiesToSpawn === 0 && this.enemies.length === 0) {
          this.waveActive = false;
          const waveReward = 45 + (this.wave * 12);
          const xpGained = this.store.read().waves.includes(this.wave)?0:25;
          this.credits += waveReward;
          this.store.event({type:'wave',wave:this.wave});

          this.log(`✓ [WAVE ${this.wave} DEFENDED] Reward: +${waveReward} Credits, +${xpGained} XP!`);
          this.addFloatingText(`WAVE ${this.wave} PURGED! +${waveReward} C`, CANVAS_WIDTH / 2, 70, '#3b82f6');
          if(this.wave===10){this.status='won';awardBonus('powershell-defense',175);this.log('Academy defense complete: all ten waves cleared. Signal bonus +175 credits earned for the next Matrix mission.');this.updateHUD();return;}
          this.wave++;
          this.updateHUD();
        }

        // Enemy movement
        for (let i = this.enemies.length - 1; i >= 0; i--) {
          const e = this.enemies[i];
          const curSpeed = e.slowDuration > 0 ? e.speed * 0.5 : e.speed;
          if (e.slowDuration > 0) e.slowDuration--;

          const target = this.path[e.pathIdx + 1];
          if (!target) {
            const breachDamage=e.boss?25:1;
            this.health-=breachDamage;
            this.enemies.splice(i, 1);
            this.addFloatingText(`-${breachDamage} Host Health!`, CANVAS_WIDTH - 80, CANVAS_HEIGHT - 30, '#ef4444');
            this.log(`[BREACH] Host packet penetrated core firewall! (-${breachDamage} HP)`);
            this.updateHUD();
            if (this.health <= 0) {
              this.health=0;this.status='lost';this.waveActive=false;this.enemiesToSpawn=0;
              this.log('Host lost. Learning progress is safe. Reset defense to try another plan.');this.updateHUD();return;
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

        // Towers targeting
        for (const t of this.towers) {
          if (t.cooldown > 0) t.cooldown--;

          let target = null;
          let closest = Infinity;
          for (const e of this.enemies) {
            const d = Math.hypot(e.x - t.x, e.y - t.y);
            if (d <= t.range && d < closest) {
              closest = d;
              target = e;
            }
          }

          if (target) {
            t.angle = Math.atan2(target.y - t.y, target.x - t.x);
            if (t.cooldown <= 0) {
              const adjustedCooldown = Math.max(5, Math.floor(t.def.cooldown * (1 - this.speedBonus)));
              t.cooldown = adjustedCooldown;
              this.projectiles.push({
                x: t.x, y: t.y,
                target,
                speed: 10,
                damage: Math.floor(t.damage*(1+this.dmgBonus)),
                color: t.def.color,
                effect: t.def.effect
              });
            }
          }
        }

        // Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
          const p = this.projectiles[i];
          const dx = p.target.x - p.x;
          const dy = p.target.y - p.y;
          const dist = Math.hypot(dx, dy);

          if (dist <= p.speed || !this.enemies.includes(p.target)) {
            if (this.enemies.includes(p.target)) {
              this.damageEnemy(p.target,p.damage);
              if (p.effect === 'slow') p.target.slowDuration = 65;

              if (p.effect === 'splash') {
                for (const o of this.enemies) {
                  if (o !== p.target && Math.hypot(o.x - p.x, o.y - p.y) < 70) {
                    this.damageEnemy(o,Math.floor(p.damage * 0.5));
                  }
                }
              }

              if(p.effect==='chain')this.enemies.filter(other=>other!==p.target&&Math.hypot(other.x-p.target.x,other.y-p.target.y)<100).slice(0,2).forEach(other=>this.damageEnemy(other,Math.floor(p.damage*.5)));
              this.collectDefeated();
            }
            this.projectiles.splice(i, 1);
          } else {
            p.x += (dx / dist) * p.speed;
            p.y += (dy / dist) * p.speed;
          }
        }

      }

      advanceTexts() {
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
          const ft = this.floatingTexts[i];
          ft.y -= 0.6;
          ft.life -= 0.02;
          if (ft.life <= 0) this.floatingTexts.splice(i, 1);
        }


      }

      render() {
        this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Grid lines
        this.ctx.strokeStyle = 'rgba(59, 130, 246, 0.06)';
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

        // Pathway
        this.ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        for (const p of this.path) {
          this.ctx.fillRect(p.x * CELL_SIZE + 2, p.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        }

        // Core Endpoint (Host Server)
        const end = this.path[this.path.length - 1];
        this.ctx.fillStyle = '#3b82f6';
        this.ctx.shadowColor = '#3b82f6';
        this.ctx.shadowBlur = 18;
        this.ctx.fillRect(end.x * CELL_SIZE + 4, end.y * CELL_SIZE + 4, CELL_SIZE - 8, CELL_SIZE - 8);
        this.ctx.shadowBlur = 0;

        // Towers
        for (const t of this.towers) {
          this.ctx.fillStyle = '#0f172a';
          this.ctx.fillRect(t.col * CELL_SIZE + 4, t.row * CELL_SIZE + 4, CELL_SIZE - 8, CELL_SIZE - 8);

          this.ctx.save();
          this.ctx.translate(t.x, t.y);
          this.ctx.rotate(t.angle);
          this.ctx.fillStyle = t.def.color;
          this.ctx.shadowColor = t.def.color;
          this.ctx.shadowBlur = 10;
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
            this.ctx.fillStyle = '#60a5fa';
            this.ctx.font = 'bold 10px monospace';
            this.ctx.fillText(`L${t.level}`, t.col * CELL_SIZE + 4, t.row * CELL_SIZE + 14);
          }
        }

        if(document.activeElement===this.canvas){this.ctx.strokeStyle='#fbbf24';this.ctx.lineWidth=2;this.ctx.strokeRect(this.keyboardCell.col*40+2,this.keyboardCell.row*40+2,36,36);}
        // Enemies
        for (const e of this.enemies) {
          this.ctx.fillStyle = e.color;
          this.ctx.shadowColor = e.color;
          this.ctx.shadowBlur = e.type.includes('Titan') ? 22 : 8;
          this.ctx.beginPath();
          const r = e.type.includes('Titan') ? 16 : 8;
          this.ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.shadowBlur = 0;

          if(e.shielded){this.ctx.strokeStyle='#60a5fa';this.ctx.lineWidth=3;this.ctx.beginPath();this.ctx.arc(e.x,e.y,23,0,Math.PI*2);this.ctx.stroke();this.ctx.fillStyle='#fff';this.ctx.font='12px monospace';this.ctx.fillText('SHIELDED',e.x-27,e.y-30);}
          // Health bar
          const pct = Math.max(0, e.hp / e.maxHp);
          this.ctx.fillStyle = '#ef4444';
          this.ctx.fillRect(e.x - 12, e.y - 14, 24, 3);
          this.ctx.fillStyle = '#22c55e';
          this.ctx.fillRect(e.x - 12, e.y - 14, 24 * pct, 3);
        }

        // Projectiles
        for (const p of this.projectiles) {
          this.ctx.fillStyle = p.color;
          this.ctx.beginPath();
          this.ctx.arc(p.x, p.y, p.effect === 'splash' ? 4 : 2.5, 0, Math.PI * 2);
          this.ctx.fill();
        }

        // Floating texts
        for (const ft of this.floatingTexts) {
          this.ctx.globalAlpha = Math.max(0, ft.life);
          this.ctx.fillStyle = ft.color;
          this.ctx.font = 'bold 12px monospace';
          this.ctx.fillText(ft.text, ft.x - 15, ft.y);
        }
        this.ctx.globalAlpha = 1.0;
      }

      needsFrame(){return !document.hidden&&!this.paused&&((this.status==='ready'&&this.waveActive)||this.floatingTexts.length>0);}

      refreshFrame(){
        // Engine-only consumers can drive update() without a browser scheduler.
        if(this.frame===undefined)return;
        this.render();
        if(!this.needsFrame()){
          if(this.frame!==null)cancelAnimationFrame(this.frame);
          this.frame=null;this.lastTime=null;this.accumulator=0;
        }else if(this.frame===null){this.frame=requestAnimationFrame(time=>this.loop(time));}
      }

      loop(timestamp){
        this.frame=null;
        if(!this.needsFrame()){this.lastTime=null;this.accumulator=0;return;}
        if(this.lastTime===null){this.lastTime=timestamp;this.accumulator=0;}
        this.accumulator+=Math.min(100,timestamp-this.lastTime);this.lastTime=timestamp;
        while(this.accumulator>=1000/60){
          if(this.waveActive&&this.status==='ready')this.update();
          if(this.paused)break;
          this.advanceTexts();this.accumulator-=1000/60;
        }
        this.refreshFrame();
      }

      addFloatingText(text, x, y, color = '#60a5fa') {
        this.floatingTexts.push({ text, x, y, color, life: 1.0 });
        this.refreshFrame();
      }

      log(message){const stream=document.getElementById('terminal-log'),line=document.createElement('p');line.textContent=message;stream.append(line);while(stream.children.length>60)stream.firstElementChild.remove();stream.scrollTop=stream.scrollHeight;}

      updateHUD() {
        document.getElementById('hostile-tracker').textContent=`HOSTILES: ${this.enemies.length} ACTIVE`;
        document.getElementById('btn-start-wave').disabled=this.status!=='ready'||this.waveActive||this.paused;
        document.getElementById('terminal-status').textContent=this.status==='won'?'DEFENSE COMPLETE':this.status==='lost'?'HOST LOST · RESTART TO RETRY':this.paused?'PAUSED · HOST SAFE':this.enemies.some(e=>e.shielded)?'SECURITY BREACH · BOSS SHIELDED':this.waveActive?'DEFENDING HOST':'READY · PLACE TURRETS, THEN START';
        const pauseButton=document.getElementById('btn-pause');if(pauseButton)pauseButton.disabled=this.status!=='ready';
        document.getElementById('hud-credits').innerText = `${this.credits} C`;
        document.getElementById('hud-health').innerText = `${this.health} HP`;
        document.getElementById('hud-wave').innerText = this.wave;
        document.getElementById('hud-xp').innerText = `${this.profile().xp} XP`;
        document.getElementById('buff-damage').innerText = `+${Math.round(this.dmgBonus * 100)}% DMG`;
        document.getElementById('buff-speed').innerText = `+${Math.round(this.speedBonus * 100)}% SPEED`;
        this.refreshFrame();
      }
    }
