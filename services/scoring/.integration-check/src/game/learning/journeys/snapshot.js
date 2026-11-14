import {normalizeNexus} from '../../nexus/model.js';
import { normalizeAcademy } from '../../academy/state.js';
import { normalizeProgress } from '../progression.js';
import { normalizeAdventure } from '../../matrix-rpg/engine.js';
import { normalizeJourney,mergeJourney } from './model.js';
import { buildProfile } from '../../academy/profile.js';
export const SNAPSHOT_KEYS={academy:'amazing-grace-academy-v1',learning:'amazing-grace-learning-v1',adventure:'amazing-grace-matrix-rpg-v1',journeys:'amazing-grace-journeys-v1',nexus:'amazing-grace-sparkfall-v1'};
export function normalizeSnapshot(raw){return {version:1,academy:normalizeAcademy(raw?.academy),learning:normalizeProgress(raw?.learning),adventure:normalizeAdventure(raw?.adventure),journeys:normalizeJourney(raw?.journeys),nexus:normalizeNexus(raw?.nexus)};}
export function mergeSnapshots(a,b){
 const left=normalizeSnapshot(a),right=normalizeSnapshot(b),union=(a,b)=>[...new Set([...a,...b])];
 const academy=normalizeAcademy({...left.academy,player:left.academy.player==='Explorer'?right.academy.player:left.academy.player,correct:union(left.academy.correct,right.academy.correct),lessons:union(left.academy.lessons,right.academy.lessons),waves:union(left.academy.waves,right.academy.waves),packets:Math.max(left.academy.packets,right.academy.packets),highestWave:Math.max(left.academy.highestWave,right.academy.highestWave),deployed:left.academy.deployed||right.academy.deployed,boss:left.academy.boss||right.academy.boss,cyber:left.academy.cyber||right.academy.cyber});
 const quizzes={};for(const id of new Set([...Object.keys(left.learning.quizzes),...Object.keys(right.learning.quizzes)])){const x=left.learning.quizzes[id],y=right.learning.quizzes[id];quizzes[id]={best:Math.max(x?.best||0,y?.best||0),attempts:Math.max(x?.attempts||0,y?.attempts||0)};}
 const learning=normalizeProgress({version:1,completedLevels:union(left.learning.completedLevels,right.learning.completedLevels),quizzes,sovereignShieldUsed:left.learning.sovereignShieldUsed||right.learning.sovereignShieldUsed});
 const adventure=normalizeAdventure({version:1,role:left.adventure.role||right.adventure.role,completed:union(left.adventure.completed,right.adventure.completed),choices:{...right.adventure.choices,...left.adventure.choices}});
 return {version:1,academy,learning,adventure,journeys:mergeJourney(left.journeys,right.journeys),nexus:normalizeNexus({version:1,completed:union(left.nexus.completed,right.nexus.completed)})};
}
export const snapshotProfile=snapshot=>buildProfile(normalizeSnapshot(snapshot));
export function readBrowserSnapshot(storage){const data={};for(const [field,key]of Object.entries(SNAPSHOT_KEYS))try{data[field]=JSON.parse(storage.getItem(key));}catch{}return normalizeSnapshot(data);}
export function applyBrowserSnapshot(storage,remote){
 const merged=mergeSnapshots(readBrowserSnapshot(storage),remote);
 for(const [field,key]of Object.entries(SNAPSHOT_KEYS))storage.setItem(key,JSON.stringify(merged[field]));
 if(typeof window!=='undefined'){window.dispatchEvent(new Event('learning-synced'));window.dispatchEvent(new Event('academy-progress'));}
 return merged;
}
