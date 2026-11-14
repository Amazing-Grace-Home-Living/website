import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JOURNEYS} from '../src/game/learning/journeys/content.js';
import {newJourney,normalizeJourney,gradeJourney,journeySummary,mergeJourney,createJourneyStore} from '../src/game/learning/journeys/model.js';
import {newAcademy} from '../src/game/academy/state.js';
import {emptyProgress,completeLevel} from '../src/game/learning/progression.js';
import {newAdventure} from '../src/game/matrix-rpg/engine.js';
import {buildProfile} from '../src/game/academy/profile.js';
import {mergeSnapshots,normalizeSnapshot,readBrowserSnapshot,applyBrowserSnapshot} from '../src/game/learning/journeys/snapshot.js';
const correct=lesson=>lesson.questions.map(q=>q.answer);
const through=(count=JOURNEYS.length)=>JOURNEYS.slice(0,count).reduce((state,lesson)=>gradeJourney(state,lesson.id,correct(lesson)).state,newJourney());
test('seven stories, twenty-one checks, sources and real practice paths form a finite ordered journey',()=>{
 assert.equal(JOURNEYS.length,7);assert.equal(JOURNEYS.flatMap(lesson=>lesson.questions).length,21);
 assert.throws(()=>gradeJourney(newJourney(),JOURNEYS[1].id,correct(JOURNEYS[1])),/earlier/);
 for(const lesson of JOURNEYS){assert.equal(lesson.story.length,3);assert.ok(lesson.sources.length);assert.ok(lesson.practice.startsWith('/'));assert.equal(lesson.responses.length,2);}
 const state=through();assert.equal(journeySummary(state).mastered,7);assert.equal(journeySummary(state).xp,420);assert.equal(journeySummary(state).next,null);
});
test('wrong answers, partial progress, malformed submissions and replays cannot farm XP',()=>{
 const lesson=JOURNEYS[0],wrong=lesson.questions.map(q=>(q.answer+1)%q.options.length);
 assert.equal(gradeJourney(newJourney(),lesson.id,wrong).xp,0);
 for(const answers of [[],Array(3),[99,0,0],['0',0,0]])assert.throws(()=>gradeJourney(newJourney(),lesson.id,answers));
 const partial=correct(lesson);partial[0]=wrong[0];const first=gradeJourney(newJourney(),lesson.id,partial);assert.equal(first.xp,20);assert.equal(first.passed,false);
 const pass=gradeJourney(first.state,lesson.id,correct(lesson));assert.equal(pass.xp,40);assert.equal(gradeJourney(pass.state,lesson.id,correct(lesson)).xp,0);
});
test('normalization removes unknown IDs, duplicate credit, future versions and invalid mastery chains',()=>{
 const bad={version:1,correct:['unknown','signal-watch:0','signal-watch:0','object-courier:0'],mastered:['signal-watch','object-courier']};
 assert.deepEqual(normalizeJourney(bad),{version:1,correct:['signal-watch:0'],mastered:[]});assert.deepEqual(normalizeJourney({version:999}),newJourney());
 assert.deepEqual(mergeJourney(through(2),through(1)),through(2));assert.deepEqual(mergeJourney(through(1),through(2)),through(2));
});
test('journey XP and badge feed the shared arcade profile without changing legacy source progress',()=>{
 const profile=buildProfile({academy:newAcademy(),learning:emptyProgress(),adventure:newAdventure(),journeys:through()});assert.equal(profile.games.learningJourneys.xp,420);assert.equal(profile.xp,420);assert.ok(profile.badges.includes('Thoughtful Automator'));
 const learning=completeLevel(completeLevel(emptyProgress(),'matrix-academy'),'matrix-earth');const combined=buildProfile({academy:newAcademy(),learning,adventure:newAdventure()});assert.equal(combined.games.classicMatrix.xp,200);assert.equal(combined.unlocks.startingCredits,200);
});
test('snapshot merge preserves milestones, highest counters, story choices and unique XP across devices',()=>{
 const left=normalizeSnapshot({academy:{...newAcademy(),packets:10,player:'Explorer'},journeys:through(1)}),right=normalizeSnapshot({academy:{...newAcademy(),packets:14,deployed:true,player:'Ada'},journeys:through(2),learning:completeLevel(emptyProgress(),'match-1')});
 const merged=mergeSnapshots(left,right);assert.equal(merged.academy.packets,14);assert.equal(merged.academy.deployed,true);assert.equal(merged.academy.player,'Ada');assert.equal(merged.journeys.mastered.length,2);assert.ok(merged.learning.completedLevels.includes('match-1'));assert.deepEqual(mergeSnapshots(merged,right),merged);
 const values=new Map(),storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};applyBrowserSnapshot(storage,merged);assert.deepEqual(readBrowserSnapshot(storage),merged);
});
test('blocked and full browser storage preserve in-tab learning and report unavailable persistence',()=>{
 const store=createJourneyStore({getItem(){throw Error('blocked');},setItem(){throw Error('quota');}});store.quiz(JOURNEYS[0].id,correct(JOURNEYS[0]));assert.equal(store.read().mastered.length,1);assert.equal(store.persistent,false);
 const quota=createJourneyStore({getItem:()=>JSON.stringify(newJourney()),setItem(){throw Error('quota');}});quota.quiz(JOURNEYS[0].id,correct(JOURNEYS[0]));assert.equal(quota.read().mastered.length,1);
});
test('extension reader, content and grader are exact public-source copies',async()=>{
 for(const file of ['content.js','model.js','view.js','journeys.css'])assert.equal(await readFile(new URL('../assets/Tools/learning/'+file,import.meta.url),'utf8'),await readFile(new URL('../src/game/learning/journeys/'+file,import.meta.url),'utf8'));
});
