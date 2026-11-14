import { JOURNEYS, journeyById, CONSCIENCE_STARS } from './content.js';
export const JOURNEY_KEY = 'amazing-grace-journeys-v1';
export const newJourney = () => ({version:1,correct:[],mastered:[]});
export function journeyUnlocked(state,id){const lesson=journeyById(id);return !!lesson&&lesson.requires.every(key=>state.mastered.includes(key));}
export function normalizeJourney(raw){
 const clean=newJourney();if(raw?.version!==1)return clean;
 for(const lesson of JOURNEYS){
  if(!journeyUnlocked(clean,lesson.id))continue;
  lesson.questions.forEach((_,index)=>{const key=lesson.id+':'+index;if(Array.isArray(raw.correct)&&raw.correct.includes(key))clean.correct.push(key);});
  if(Array.isArray(raw.mastered)&&raw.mastered.includes(lesson.id)&&lesson.questions.every((_,i)=>clean.correct.includes(lesson.id+':'+i)))clean.mastered.push(lesson.id);
 }
 return clean;
}
export function journeySummary(raw){const state=normalizeJourney(raw);return {stars:CONSCIENCE_STARS.filter(star=>state.mastered.includes(star.journey)),xp:state.correct.length*10+state.mastered.length*30,correct:state.correct.length,mastered:state.mastered.length,total:JOURNEYS.length,next:JOURNEYS.find(lesson=>journeyUnlocked(state,lesson.id)&&!state.mastered.includes(lesson.id))?.id||null};}
export function gradeJourney(raw,id,answers){
 const lesson=journeyById(id),state=normalizeJourney(raw),before=journeySummary(state).xp;
 if(!lesson||!journeyUnlocked(state,id))throw Error('Complete the earlier journey lesson first.');
 if(!Array.isArray(answers)||answers.length!==lesson.questions.length||Array.from(answers).some((answer,index)=>!Number.isInteger(answer)||answer<0||answer>=lesson.questions[index].options.length))throw Error('Answer every question before submitting.');
 const feedback=lesson.questions.map((question,index)=>({correct:answers[index]===question.answer,explanation:question.explanation}));
 feedback.forEach((result,index)=>{const key=id+':'+index;if(result.correct&&!state.correct.includes(key))state.correct.push(key);});
 const passed=feedback.every(result=>result.correct);
 if(passed&&!state.mastered.includes(id))state.mastered.push(id);
 const next=normalizeJourney(state);
 return {state:next,star:passed&&!normalizeJourney(raw).mastered.includes(id)?CONSCIENCE_STARS.find(star=>star.journey===id):null,passed,correct:feedback.filter(result=>result.correct).length,total:lesson.questions.length,xp:journeySummary(next).xp-before,feedback};
}
export function mergeJourney(a,b){const left=normalizeJourney(a),right=normalizeJourney(b);return normalizeJourney({version:1,correct:[...new Set([...left.correct,...right.correct])],mastered:[...new Set([...left.mastered,...right.mastered])]});}
export function createJourneyStore(storage){
 let memory=newJourney(),persistent=true;
 function read(){if(persistent)try{const raw=storage.getItem(JOURNEY_KEY);memory=raw?normalizeJourney(JSON.parse(raw)):memory;}catch{persistent=false;}return normalizeJourney(memory);}
 function save(state){memory=mergeJourney(read(),state);try{storage.setItem(JOURNEY_KEY,JSON.stringify(memory));persistent=true;}catch{persistent=false;}if(typeof window!=='undefined')window.dispatchEvent(new Event('academy-progress'));return normalizeJourney(memory);}
 return {read,save,get persistent(){return persistent;},quiz(id,answers){const result=gradeJourney(read(),id,answers);save(result.state);return result;}};
}
let storage;try{storage=globalThis.localStorage;}catch{}
export const journal=createJourneyStore(storage);
