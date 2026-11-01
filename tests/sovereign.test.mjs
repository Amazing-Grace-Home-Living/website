import test from 'node:test';
import assert from 'node:assert/strict';
import { applyDamage, beamTargets, buildCost, SOVEREIGN_ROUTES } from '../src/game/tower-defense/sovereign.js';
import { TowerDefenseGame } from '../src/game/tower-defense/tower-defense-engine.js';
import { LESSONS } from '../src/game/learning/curriculum.js';
import { emptyProgress, recordQuiz, completeLevel, levelUnlocked, normalizeProgress, progressSummary } from '../src/game/learning/progression.js';
import { createCampaignStore, campaign } from '../src/game/learning/campaign-store.js';
function unlocked() {
  let s = emptyProgress();
  for (const [lesson, level] of [['foundations','tower-nexus'],['tactics','tower-syndicate'],['adaptation','tower-boss'],['sovereignty','tower-sovereign']]) {
    if (lesson === 'foundations') s = completeLevel(s, 'match-1');
    s = recordQuiz(s, lesson, LESSONS.find(l => l.id === lesson).questions.map(q => q.answer)).state;
    s = completeLevel(s, level);
  }
  return s;
}
function game() {
  const g = Object.create(TowerDefenseGame.prototype);
  Object.assign(g, { stage:'sovereign', status:'ready', wave:1, directive:null, credits:500, health:85, maxHealth:100,
    towers:[], enemies:[], projectiles:[], floatingTexts:[], beams:[], surgeTick:0, surgeTiles:[], freezeTicks:0, spawnedCount:0,
    waveActive:false, enemiesToSpawn:0, spawnTimer:0, autoTimer:null, autoWave:false,
    selectedTowerKey:'pulse', vault:{damage:0, economy:0, integrity:0, points:100},
    setupUI(){}, updateHUD(){}, saveVault(){}, announce(message){this.message=message;} });
  g.configurePaths(); return g;
}
test('Act IV preserves existing completion and follows the completed Act III mission', () => {
  assert.equal(levelUnlocked(emptyProgress(),'tower-sovereign'),false);
  let direct = emptyProgress();
  direct = completeLevel(direct, 'match-1');
  direct = recordQuiz(direct, 'foundations', LESSONS.find(l => l.id === 'foundations').questions.map(q => q.answer)).state;
  direct = completeLevel(direct, 'tower-nexus');
  direct = recordQuiz(direct, 'tactics', LESSONS.find(l => l.id === 'tactics').questions.map(q => q.answer)).state;
  direct = completeLevel(direct, 'tower-syndicate');
  direct = recordQuiz(direct, 'adaptation', LESSONS.find(l => l.id === 'adaptation').questions.map(q => q.answer)).state;
  direct = completeLevel(direct, 'tower-boss');
  assert.equal(levelUnlocked(direct, 'tower-sovereign'), true);
  const state = unlocked();
  assert.deepEqual(normalizeProgress(state),state);
  assert.equal(progressSummary(state).missions,4);
  assert.ok(progressSummary(state).badges.includes('Sovereign conscience'));
  assert.ok(progressSummary(state).badges.includes('Campaign champion'));
  assert.equal(progressSummary(completeLevel(state,'tower-sovereign')).xp,progressSummary(state).xp);
  for (const lesson of LESSONS) {
    campaign.quiz(lesson.id, lesson.questions.map(q => q.answer));
    if (lesson.id === 'foundations') campaign.complete('match-1');
    campaign.complete({ foundations:'tower-nexus', tactics:'tower-syndicate', adaptation:'tower-boss', sovereignty:'tower-sovereign' }[lesson.id]);
  }
});
test('dual routes converge then split; building rejects both paths', () => {
  const g=game(); g.directive='dominion';
  assert.equal(SOVEREIGN_ROUTES.length,2);
  assert.ok(g.paths.every(route=>route.some(p=>p.x===10&&p.y===5)));
  g.placeTower(0,9); assert.equal(g.towers.length,0); assert.equal(g.credits,500);
});
test('directive required, fixed per attempt, with effective costs and range', () => {
  const g=game(); g.placeTower(0,0); assert.equal(g.towers.length,0);
  g.startWave(); assert.equal(g.waveActive,false);
  g.chooseDirective('diplomacy'); assert.equal(g.health,100);
  g.chooseDirective('dominion'); assert.equal(g.directive,'diplomacy');
  assert.equal(buildCost(60,'martyrdom'),69); assert.equal(buildCost(280,'martyrdom'),322);
  const d=game(); d.chooseDirective('dominion'); d.placeTower(0,0); assert.equal(d.towers[0].range,137.5);
  d.startWave(); assert.equal(d.enemiesToSpawn,21);
});
test('siphons drain five per second, shield neighbors, and cause no core damage', () => {
  const g=game(); g.waveActive=true; g.enemiesToSpawn=10;
  const siphon={type:'siphon',hp:100,x:20,y:20,drainTicks:0,pathIdx:0,speed:0};
  g.enemies=[siphon]; for(let i=0;i<60;i++)g.updateSovereign(); assert.equal(g.credits,495);
  const ally={hp:100,x:30,y:20}; applyDamage(ally,20,'Laser',[ally,siphon]); assert.equal(ally.hp,87);
  siphon.pathIdx=g.path.length-1; siphon.slowDuration=0; g.update(); assert.equal(g.health,85);
});
test('Vanguard adapts by hit frequency and prism pierces only its line', () => {
  const boss={type:'vanguard',hp:1000,x:80,y:0};
  applyDamage(boss,100,'Laser',[boss]); applyDamage(boss,100,'Laser',[boss]); assert.equal(boss.hp,860);
  applyDamage(boss,100,'EMP',[boss]); assert.equal(boss.hp,760);
  applyDamage(boss,10,'EMP',[boss]); applyDamage(boss,10,'EMP',[boss]); assert.equal(boss.resistance,'EMP');
  const t={x:0,y:0,range:100}, a={x:30,y:0}, b={x:70,y:5}, c={x:60,y:30};
  assert.deepEqual(beamTargets(t,a,[a,b,c]),[a,b]);
});
test('Aegis protects blackouts, boosts damage once, and prism rewards kills once', () => {
  const g=game(); g.directive='dominion'; g.surgeTick=750; g.surgeTiles=[{col:0,row:0}];
  const tower={col:0,row:0,x:20,y:20,range:100,damage:10,cooldown:0,def:{cooldown:6,effect:'beam'}};
  const enemy={x:60,y:20,hp:100,reward:15,pathIdx:0,speed:0,slowDuration:0};
  g.towers=[tower]; g.enemies=[enemy]; g.update(); assert.equal(enemy.hp,100);
  const aegis={x:20,y:60,range:65,def:{effect:'aura'}}; g.towers.push(aegis,{...aegis}); g.update(); assert.equal(enemy.hp,88.5);
  enemy.hp=1; tower.cooldown=0; const credits=g.credits; g.update(); assert.equal(g.enemies.length,0); assert.equal(g.credits,credits+15); g.collectDefeated(); assert.equal(g.credits,credits+15);
});
test('campaign EMP persists, freezes endpoint breaches, and cannot be reused', () => {
  const values=new Map(), storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
  const a=createCampaignStore(storage); assert.equal(a.useSovereignShield(),true);
  assert.equal(createCampaignStore(storage).useSovereignShield(),false);
  const g=game(); g.directive='martyrdom'; g.health=30;
  const enemy=()=>({type:'drone',hp:100,x:780,y:220,pathIdx:g.path.length-1,speed:1,slowDuration:0});
  g.enemies=[enemy(),enemy()]; g.update(); assert.equal(g.health,25); assert.equal(g.enemies.length,1); assert.equal(g.freezeTicks,360);
  for(let i=0;i<359;i++)g.update(); assert.equal(g.health,25);
  g.update(); assert.equal(g.health,20); assert.equal(g.freezeTicks,0);
  g.enemies=[enemy()]; g.update(); assert.equal(g.freezeTicks,0);
});
test('Wave 12 spawns a single Vanguard and routes alternate', () => {
  const g=game(); g.wave=3; g.enemiesToSpawn=3;
  for(let i=0;i<3;i++){g.spawnEnemy();g.enemiesToSpawn--;}
  assert.equal(g.enemies.filter(e=>e.type==='vanguard').length,1);
  assert.equal(g.enemies[0].route,g.paths[0]); assert.equal(g.enemies[1].route,g.paths[1]);
  assert.equal(g.displayedWave(),12);
});
