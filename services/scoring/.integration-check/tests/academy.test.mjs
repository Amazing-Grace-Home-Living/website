import { LESSONS as CAMPAIGN_LESSONS, LEVELS } from '../src/game/learning/curriculum.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { PS_LESSONS,PS_QUESTIONS,CYBER_QUESTIONS } from '../src/game/academy/content.js';
import { newAcademy,normalizeAcademy,gradeLesson,academyEvent,securityXP,finishCyber,createAcademyStore,ACADEMY_KEY } from '../src/game/academy/state.js';
import { buildProfile,loadProfile } from '../src/game/academy/profile.js';
import { PowerShellDefenseGame,BOSS_QUESTIONS } from '../src/game/academy/defense.js';
import { emptyProgress,completeLevel } from '../src/game/learning/progression.js';
import { newAdventure,finishQuest,adventureSummary } from '../src/game/matrix-rpg/engine.js';
import { QUESTS } from '../src/game/matrix-rpg/content.js';
const memory=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};};
const answers=lesson=>lesson.questions.map(q=>q.answer);
function mastered(){return PS_LESSONS.reduce((state,lesson)=>gradeLesson(state,lesson.id,answers(lesson)).state,newAcademy());}
function game(){const store=createAcademyStore(memory()),g=Object.create(PowerShellDefenseGame.prototype);Object.assign(g,{store,profile:()=>buildProfile({academy:store.read(),learning:emptyProgress(),adventure:newAdventure()}),path:[{x:0,y:0},{x:1,y:0}],onBoss(){this.paused=true;},setupUI(){},updateHUD(){},log(){}});g.reset();return g;}

test('four lessons teach twelve distinct questions; incorrect answers and replays never farm XP',()=>{
 let state=newAcademy();for(const lesson of PS_LESSONS){assert.equal(lesson.questions.length,3);const wrong=lesson.questions.map(q=>(q.answer+1)%q.options.length);const failed=gradeLesson(state,lesson.id,wrong);assert.equal(failed.xp,0);assert.equal(failed.passed,false);assert.throws(()=>gradeLesson(state,lesson.id,Array(3)));const result=gradeLesson(state,lesson.id,answers(lesson));assert.equal(result.xp,110);state=result.state;assert.equal(gradeLesson(state,lesson.id,answers(lesson)).xp,0);}
 assert.equal(state.correct.length,12);assert.equal(state.lessons.length,4);assert.equal(securityXP(state),440);
});
test('new correct answers award XP once across retries, while mastery requires a full correct attempt',()=>{
 const lesson=PS_LESSONS[0],partial=answers(lesson);partial[0]=(partial[0]+1)%4;
 const first=gradeLesson(newAcademy(),lesson.id,partial);assert.equal(first.xp,40);assert.equal(first.passed,false);
 const second=gradeLesson(first.state,lesson.id,answers(lesson));assert.equal(second.xp,70);assert.equal(second.state.lessons.length,1);
});
test('badges and rank derive from actual milestones; names and profile JSON are bounded data',()=>{
 let state=mastered();state=academyEvent(state,{type:'deploy'});state=academyEvent(state,{type:'reach',wave:10});state.packets=1000;state=academyEvent(state,{type:'boss'});
 const profile=buildProfile({academy:state,learning:emptyProgress(),adventure:newAdventure()});
 for(const badge of ['Script Defender','Pipeline Master','Terminal Operator','Malware Exterminator','Nexus Security Architect','Security Architect'])assert.ok(profile.badges.includes(badge));
 assert.ok(profile.certifications.includes('PowerShell Novice'));assert.equal(profile.xp,940);assert.equal(profile.rank,'Architect');assert.equal(profile.level,7);assert.equal(profile.unlocks.scriptSentinel,true);
 assert.equal(normalizeAcademy({version:1,player:'x'.repeat(100)}).player.length,40);
});
test('normalization rejects malformed counters, unknown IDs, impossible mastery and premature Cyber completion',()=>{
 const state=normalizeAcademy({version:1,correct:['unknown','processes-0','processes-0'],lessons:['processes'],waves:[1,1,99],packets:-5,highestWave:Infinity,cyber:true});
 assert.deepEqual(state.correct,['processes-0']);assert.deepEqual(state.lessons,[]);assert.deepEqual(state.waves,[1]);assert.equal(state.packets,0);assert.equal(state.highestWave,0);assert.equal(state.cyber,false);
 assert.deepEqual(normalizeAcademy({version:999}),newAcademy());
});
test('shared profile reads legacy saves without rewriting or double-counting RPG region milestones',()=>{
 let story=newAdventure('navigator');for(const quest of QUESTS.slice(0,4)){const proof=quest.type==='memory'?{sequence:quest.sequence}:quest.type==='choice'?{choice:quest.choices[0].id}:{answers:quest.questions.map(q=>q.answer)};story=finishQuest(story,quest.id,proof);}
 const learning=completeLevel(completeLevel(emptyProgress(),'match-1'),'rpg-garden');
 const profile=buildProfile({academy:newAcademy(),learning,adventure:story});assert.equal(profile.xp,50+adventureSummary(story).xp);assert.ok(profile.certifications.includes('Earth Guardian'));assert.equal(profile.unlocks.startingCredits,200);
 const storage=memory();storage.setItem('amazing-grace-learning-v1',JSON.stringify(learning));storage.setItem('amazing-grace-matrix-rpg-v1',JSON.stringify(story));const before=storage.getItem('amazing-grace-learning-v1');assert.equal(loadProfile(storage).xp,profile.xp);assert.equal(storage.getItem('amazing-grace-learning-v1'),before);
});
test('Cyber Planet is gated by Security XP and rewards its transfer mission exactly once',()=>{
 assert.throws(()=>finishCyber(newAcademy(),CYBER_QUESTIONS.map(q=>q.answer)),/250/);
 const state=mastered();assert.throws(()=>finishCyber(state,[99,99,99]),/Review/);
 const complete=finishCyber(state,CYBER_QUESTIONS.map(q=>q.answer)),profile=raw=>buildProfile({academy:raw,learning:emptyProgress(),adventure:newAdventure()});
 assert.equal(profile(complete).xp,540);assert.equal(profile(finishCyber(complete,CYBER_QUESTIONS.map(q=>q.answer))).xp,540);assert.ok(profile(complete).badges.includes('Cyber Guardian'));
});
test('storage roundtrips, merges fresh milestone reads, and preserves memory on quota failure',()=>{
 const storage=memory(),a=createAcademyStore(storage),b=createAcademyStore(storage);a.event({type:'deploy'});b.lesson(PS_LESSONS[0].id,answers(PS_LESSONS[0]));assert.equal(a.read().deployed,true);assert.equal(a.read().lessons.length,1);
 storage.setItem(ACADEMY_KEY,'{bad');assert.deepEqual(createAcademyStore(storage).read(),newAcademy());
 const blocked=createAcademyStore({getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}});blocked.event({type:'deploy'});assert.equal(blocked.read().deployed,true);assert.equal(blocked.persistent,false);
 const quota=createAcademyStore({getItem:()=>JSON.stringify(newAcademy()),setItem(){throw Error('quota');}});quota.event({type:'deploy'});assert.equal(quota.read().deployed,true);
});
test('boss ignores direct, splash and chain damage until three distinct correct answers drop its shield',()=>{
 const g=game();g.wave=5;g.enemiesToSpawn=1;g.spawnEnemy();const boss=g.enemies[0];assert.equal(boss.boss,true);assert.equal(boss.shielded,true);
 g.damageEnemy(boss,9999);assert.equal(boss.hp,boss.maxHp);
 assert.equal(g.answerBoss(BOSS_QUESTIONS[0],99),false);
 const correct=id=>PS_QUESTIONS.find(q=>q.id===id).answer;
 g.answerBoss(BOSS_QUESTIONS[0],correct(BOSS_QUESTIONS[0]));g.answerBoss(BOSS_QUESTIONS[0],correct(BOSS_QUESTIONS[0]));assert.equal(g.bossAnswers.size,1);assert.equal(boss.shielded,true);
 for(const id of BOSS_QUESTIONS.slice(1))g.answerBoss(id,correct(id));assert.equal(boss.shielded,false);
 g.damageEnemy(boss,9999);g.collectDefeated();assert.equal(g.store.read().boss,true);assert.equal(g.profile().xp,500);assert.equal(g.store.read().packets,1);
 g.collectDefeated();assert.equal(g.store.read().packets,1);
 const replay={...boss,hp:1,shielded:false};g.enemies=[replay];g.damageEnemy(replay,99);g.collectDefeated();assert.equal(g.profile().xp,500);
});
test('splash and chain use the same shield check and count all actual kills',()=>{
 for(const effect of ['splash','chain']){const g=game(),enemy=(hp,x)=>({hp,maxHp:hp,x,y:20,pathIdx:0,speed:0,reward:16,slowDuration:0});const target=enemy(1,20),ally=enemy(1,25),boss={...enemy(100,30),boss:true,shielded:true};g.enemies=[target,ally,boss];g.projectiles=[{x:20,y:20,target,speed:10,damage:50,effect}];g.update();assert.equal(g.enemies.length,1);assert.equal(boss.hp,100);assert.equal(g.store.read().packets,2);}
});
test('restart clears all attempt state without clearing learning; Earth Guardian bonus applies once per attempt',()=>{
 const g=game();g.store.lesson('processes',answers(PS_LESSONS[0]));g.profile=()=>({...buildProfile({academy:g.store.read(),learning:emptyProgress(),adventure:newAdventure()}),unlocks:{startingCredits:200,scriptSentinel:false}});
 g.enemiesToSpawn=20;g.spawnTimer=30;g.projectiles=[{}];g.dmgBonus=.6;g.speedBonus=.3;g.bossAnswers.add(BOSS_QUESTIONS[0]);g.status='lost';g.reset();assert.equal(g.credits,420);assert.equal(g.enemiesToSpawn,0);assert.equal(g.projectiles.length,0);assert.equal(g.dmgBonus,0);assert.equal(g.bossAnswers.size,0);assert.equal(g.store.read().lessons.length,1);g.reset();assert.equal(g.credits,420);
});
test('waves and final completion award once; loss cannot clear a pending spawn or award XP',()=>{
 const g=game();g.wave=10;g.waveActive=true;g.update();assert.equal(g.status,'won');assert.equal(g.store.read().waves.includes(10),true);const xp=g.profile().xp;g.update();assert.equal(g.profile().xp,xp);
 g.reset();g.health=1;g.waveActive=true;g.enemiesToSpawn=5;g.enemies=[{hp:100,pathIdx:1,x:60,y:20,speed:1,slowDuration:0}];g.update();assert.equal(g.status,'lost');assert.equal(g.enemiesToSpawn,0);assert.equal(g.profile().xp,xp);
});

test('top shared rank is reachable from the current finite content without XP farming',()=>{
 const academy={...mastered(),waves:Array.from({length:10},(_,i)=>i+1),boss:true,cyber:true};
 const learning={version:1,quizzes:Object.fromEntries(CAMPAIGN_LESSONS.map(lesson=>[lesson.id,{best:4,attempts:1}])),completedLevels:LEVELS.map(level=>level.id)};
 const story={version:1,role:'navigator',completed:QUESTS.map(q=>q.id),choices:Object.fromEntries(QUESTS.filter(q=>q.type==='choice').map(q=>[q.id,q.choices[0].id]))};
 const profile=buildProfile({academy,learning,adventure:story});assert.ok(profile.xp>=3000);assert.equal(profile.rank,'Seven-Star Champion');
});
