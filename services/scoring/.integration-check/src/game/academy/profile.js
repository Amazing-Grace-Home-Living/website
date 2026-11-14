import { nexus,normalizeNexus,nexusSummary } from '../nexus/model.js';
import { journal, normalizeJourney, journeySummary } from '../learning/journeys/model.js';
import { academy, normalizeAcademy, securityXP } from './state.js';
import { RANKS } from './content.js';
import { campaign, createCampaignStore } from '../learning/campaign-store.js';
import { progressSummary, normalizeProgress } from '../learning/progression.js';
import { LEVELS } from '../learning/curriculum.js';
import { createAdventureStore, newAdventure, normalizeAdventure, adventureSummary, chapterComplete } from '../matrix-rpg/engine.js';
export function buildProfile({academy:raw,learning,adventure,journeys,nexus:nexusRaw}){
 const state=normalizeAcademy(raw),campaignState=normalizeProgress(learning),story=normalizeAdventure(adventure),summary=progressSummary(campaignState);
 const earned=LEVELS.filter(level=>campaignState.completedLevels.includes(level.id));
 const sum=predicate=>earned.filter(predicate).reduce((total,level)=>total+level.xp,0);
 const matchXP=sum(level=>level.id.startsWith('match-')),matrixXP=sum(level=>level.id.startsWith('matrix-')),rpgMilestones=sum(level=>level.id.startsWith('rpg-')),vimXP=sum(level=>level.id==='vim-defense'),starsXP=sum(level=>level.id==='seven-stars');
 const rpgXP=Math.max(rpgMilestones,adventureSummary(story).xp);
 const journeyStats=journeySummary(journeys),journeysXP=journeyStats.xp,storyStats=nexusSummary(journeyStats.stars.length===7?nexusRaw:undefined);
 const games={sparkfall:{xp:storyStats.xp},learningJourneys:{xp:journeysXP},graceNexus:{xp:summary.xp-matchXP-matrixXP-rpgMilestones-vimXP-starsXP+rpgXP},powershellDefense:{xp:securityXP(state)+(state.cyber?100:0),securityXP:securityXP(state),lessons:state.lessons.length,correct:state.correct.length,highestWave:state.highestWave,packets:state.packets},classicMatrix:{xp:matrixXP},match3Academy:{xp:matchXP},vimDefense:{xp:vimXP},sevenStars:{xp:starsXP}};
 const xp=Object.values(games).reduce((total,game)=>total+game.xp,0);
 const earth=chapterComplete(story,'garden')||campaignState.completedLevels.includes('rpg-garden')||campaignState.completedLevels.includes('matrix-earth');
 const badges=[...summary.badges,...(storyStats.sparkfallFinished?['Sparkfall Guardian']:[]),...(storyStats.finished?['Nexus Guardian']:[]),...(starsXP?['Seven Messages Reader']:[]),...(xp?['First Spark']:[]),...(summary.passed?['Wisdom Seeker']:[]),...(earth?['Earth Guardian']:[]),...(state.deployed?['Script Defender']:[]),...(state.correct.length>=10?['Pipeline Master']:[]),...(state.highestWave>=10?['Terminal Operator']:[]),...(state.packets>=1000?['Malware Exterminator']:[]),...(state.lessons.length===4?['Nexus Security Architect']:[]),...(state.boss?['Security Architect']:[]),...(state.cyber?['Cyber Guardian']:[]),...(journeySummary(journeys).mastered===7?['Thoughtful Automator']:[])];
 const stars=journeySummary(journeys).stars;
 return {version:1,stars,player:state.player,games,badges:[...new Set(badges)],xp,level:1+Math.floor(xp/150),rank:[...RANKS].reverse().find(rank=>xp>=rank.xp).name,certifications:[...(earth?['Earth Guardian']:[]),...(state.lessons.length===4?['PowerShell Novice']:[])],unlocks:{audioLibrary:stars.length===7,matrixII:stars.length===7,cyberPlanet:securityXP(state)>=250,startingCredits:earth?200:0,scriptSentinel:state.boss}};
}
let storage;try{storage=globalThis.localStorage;}catch{}
const adventureStore=createAdventureStore(storage);
export const playerProfile=()=>buildProfile({academy:academy.read(),learning:campaign.read(),adventure:adventureStore.read(),journeys:journal.read(),nexus:nexus.read()});
export function loadProfile(storage){return buildProfile({academy:createAcademyValue(storage),learning:createCampaignStore(storage).read(),adventure:createAdventureStore(storage).read(),journeys:readJourneyValue(storage),nexus:readNexusValue(storage)});}
function createAcademyValue(storage){try{return JSON.parse(storage.getItem('amazing-grace-academy-v1'))||{};}catch{return {};}}

function readJourneyValue(storage){try{return normalizeJourney(JSON.parse(storage.getItem('amazing-grace-journeys-v1')));}catch{return normalizeJourney();}}

function readNexusValue(storage){try{return normalizeNexus(JSON.parse(storage.getItem('amazing-grace-sparkfall-v1')));}catch{return normalizeNexus();}}
