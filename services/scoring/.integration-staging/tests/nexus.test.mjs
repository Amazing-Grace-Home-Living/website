import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';
import {JOURNEYS,CONSCIENCE_STARS} from '../src/game/learning/journeys/content.js';
import {newJourney,gradeJourney,journeySummary} from '../src/game/learning/journeys/model.js';
import {MISSIONS,BOOT_SEQUENCE,TIMELINE,ENDING} from '../src/game/nexus/content.js';
import {newNexus,completeNexus,nexusSummary} from '../src/game/nexus/model.js';
import {buildProfile} from '../src/game/academy/profile.js';import {createBridge} from '../bridge.mjs';import {createLearningStore} from '../learning-store.mjs';
const journeys=count=>JOURNEYS.slice(0,count).reduce((state,lesson)=>gradeJourney(state,lesson.id,lesson.questions.map(q=>q.answer)).state,newJourney());
const proof=mission=>mission.type==='memory'?mission.sequence:mission.questions.map(q=>q.answer);
test('each mastered journey grants one unique conscience star; six do not unlock seven-star rewards',()=>{
 assert.equal(CONSCIENCE_STARS.length,7);assert.equal(new Set(CONSCIENCE_STARS.map(star=>star.frequency)).size,7);
 const six=buildProfile({journeys:journeys(6)}),seven=buildProfile({journeys:journeys(7)});assert.equal(six.stars.length,6);assert.equal(six.unlocks.audioLibrary,false);assert.equal(six.unlocks.matrixII,false);assert.equal(seven.stars.length,7);assert.equal(seven.unlocks.audioLibrary,true);assert.equal(seven.unlocks.matrixII,true);
 const replay=gradeJourney(journeys(7),JOURNEYS[0].id,JOURNEYS[0].questions.map(q=>q.answer));assert.equal(replay.star,null);assert.equal(journeySummary(replay.state).stars.length,7);
});
test('Nexus canon preserves boot, timeline, Ella, HUD and all Overseer attacks',()=>{
 assert.ok(BOOT_SEQUENCE.includes('WARNING: FREE WILL ENABLED'));assert.deepEqual(TIMELINE,['Seven-Star Origins','Star Matrix Awakening','Matrix of Conscience','Sparkfall Uprising','Children of the Shadow','Conscience Weaver Era']);
 for(const attack of ['Emotional Suppression','Memory Removal','Free Will Lock'])assert.ok(JSON.stringify(MISSIONS).toUpperCase().includes(attack.toUpperCase()));assert.match(JSON.stringify(MISSIONS),/humanity forgetting how to listen/);assert.match(JSON.stringify(ENDING),/We stop being a system/);
 for(const mission of MISSIONS){assert.ok(mission.scene);assert.ok(mission.hud.length);assert.ok(mission.flags.length);assert.ok(mission.objectives.length);}
});
test('Sparkfall and Book III checkpoints gate order and proof, reward once, and end in Nexus Guardian',()=>{
 assert.throws(()=>completeNexus(newNexus(),MISSIONS[0].id,proof(MISSIONS[0]),journeys(6)),/seven/);assert.throws(()=>completeNexus(newNexus(),MISSIONS[2].id,proof(MISSIONS[2]),journeys(7)),/earlier/);
 let state=newNexus();for(const mission of MISSIONS){assert.throws(()=>completeNexus(state,mission.id,[],journeys(7)));const result=completeNexus(state,mission.id,proof(mission),journeys(7));assert.equal(result.xp,50);state=result.state;assert.equal(completeNexus(state,mission.id,proof(mission),journeys(7)).xp,0);}
 const summary=nexusSummary(state);assert.equal(summary.completed,9);assert.equal(summary.finished,true);assert.equal(summary.sparkfallFinished,true);assert.equal(summary.xp,450);assert.ok(summary.flags.includes('CONSCIENCE_WEAVER'));assert.ok(summary.flags.includes('NEXUS_GUARDIAN'));const profile=buildProfile({journeys:journeys(7),nexus:state});assert.ok(profile.badges.includes('Nexus Guardian'));assert.equal(profile.games.sparkfall.xp,450);
});
test('protected audio and story APIs deny six stars and allow seven only after authenticated sync',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'nexus-vault-'));t.after(()=>rm(dir,{recursive:true,force:true}));const store=createLearningStore({file:join(dir,'progress.json')}),port=18827,app=await createBridge({cwd:resolve('.'),port,token:'vault-fixture-session',learningStore:store});await new Promise(resolve=>app.server.listen(port,'127.0.0.1',resolve));t.after(()=>app.close());const base='http://127.0.0.1:'+port,headers={Authorization:'Bearer vault-fixture-session','Content-Type':'application/json'};
 await store.sync({version:1,journeys:journeys(6)});assert.equal((await fetch(base+'/api/learning/audio',{headers})).status,403);assert.equal((await fetch(base+'/api/learning/audio/badge',{headers})).status,403);assert.equal((await fetch(base+'/api/learning/nexus',{method:'POST',headers,body:JSON.stringify({mission:MISSIONS[0].id,answers:proof(MISSIONS[0])})})).status,403);
 await store.sync({version:1,journeys:journeys(7)});assert.equal((await fetch(base+'/api/learning/audio')).status,401);const catalog=await (await fetch(base+'/api/learning/audio',{headers})).json();assert.equal(catalog.tracks.length,6);const audio=await fetch(base+'/api/learning/audio/badge',{headers});assert.equal(audio.status,200);assert.match(audio.headers.get('content-type'),/audio/);assert.ok((await audio.arrayBuffer()).byteLength>0);assert.equal((await fetch(base+'/api/learning/audio/unknown',{headers})).status,404);
 const mission=await (await fetch(base+'/api/learning/nexus',{method:'POST',headers,body:JSON.stringify({mission:MISSIONS[0].id,answers:proof(MISSIONS[0])})})).json();assert.equal(mission.result.xp,50);assert.equal((await store.read()).nexus.completed.length,1);
});
