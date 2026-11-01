import { PS_LESSONS, PS_QUESTIONS, CYBER_QUESTIONS } from './content.js';
export const ACADEMY_KEY='amazing-grace-academy-v1';
export const newAcademy=()=>({version:1,player:'Explorer',correct:[],lessons:[],waves:[],packets:0,deployed:false,highestWave:0,boss:false,cyber:false});
export function normalizeAcademy(raw){
 const state=newAcademy();if(raw?.version!==1)return state;
 if(typeof raw.player==='string'&&raw.player.trim())state.player=raw.player.trim().slice(0,40);
 state.correct=PS_QUESTIONS.filter(q=>Array.isArray(raw.correct)&&raw.correct.includes(q.id)).map(q=>q.id);
 state.lessons=PS_LESSONS.filter(l=>Array.isArray(raw.lessons)&&raw.lessons.includes(l.id)&&l.questions.every((_,i)=>state.correct.includes(l.id+'-'+i))).map(l=>l.id);
 state.waves=Array.from({length:10},(_,i)=>i+1).filter(wave=>Array.isArray(raw.waves)&&raw.waves.includes(wave));
 state.packets=Number.isSafeInteger(raw.packets)&&raw.packets>=0?Math.min(1000000,raw.packets):0;
 state.highestWave=Number.isInteger(raw.highestWave)&&raw.highestWave>=0?Math.min(10,raw.highestWave):0;
 state.deployed=raw.deployed===true;state.boss=raw.boss===true;
 state.cyber=raw.cyber===true&&securityXP(state)>=250;
 return state;
}
export function securityXP(state){return state.correct.length*20+state.lessons.length*50+state.waves.length*25+(state.boss?500:0);}
export function gradeLesson(state,id,answers){
 const lesson=PS_LESSONS.find(l=>l.id===id);
 if(!lesson||!Array.isArray(answers)||answers.length!==lesson.questions.length||Array.from(answers).some((answer,i)=>!Number.isInteger(answer)||answer<0||answer>=lesson.questions[i].options.length))throw Error('Answer every question before checking.');
 const next=normalizeAcademy(state),before=securityXP(next);
 const correct=answers.reduce((total,answer,i)=>{if(answer!==lesson.questions[i].answer)return total;const key=id+'-'+i;if(!next.correct.includes(key))next.correct.push(key);return total+1;},0);
 if(correct===lesson.questions.length&&!next.lessons.includes(id))next.lessons.push(id);
 return {state:normalizeAcademy(next),correct,passed:correct===lesson.questions.length,xp:securityXP(next)-before};
}
export function academyEvent(state,event){
 const next=normalizeAcademy(state);
 if(event.type==='deploy')next.deployed=true;
 else if(event.type==='packet')next.packets=Math.min(1000000,next.packets+1);
 else if(event.type==='reach'&&Number.isInteger(event.wave)&&event.wave>=1&&event.wave<=10)next.highestWave=Math.max(next.highestWave,event.wave);
 else if(event.type==='wave'&&Number.isInteger(event.wave)&&event.wave>=1&&event.wave<=10){if(!next.waves.includes(event.wave))next.waves.push(event.wave);}
 else if(event.type==='boss')next.boss=true;
 else if(event.type==='player'&&typeof event.name==='string')next.player=event.name;
 else throw Error('Unknown academy event.');
 return normalizeAcademy(next);
}
export function finishCyber(state,answers){
 const next=normalizeAcademy(state);
 if(securityXP(next)<250)throw Error('Earn 250 Security XP in PowerShell Defense first.');
 if(!Array.isArray(answers)||answers.length!==CYBER_QUESTIONS.length||CYBER_QUESTIONS.some((q,i)=>answers[i]!==q.answer))throw Error('Review the mission feedback and answer all three questions correctly.');
 next.cyber=true;return next;
}
export function createAcademyStore(storage){
 let memory=newAcademy(),persistent=true;
 function read(){if(persistent)try{const raw=storage.getItem(ACADEMY_KEY);memory=raw?normalizeAcademy(JSON.parse(raw)):newAcademy();}catch{persistent=false;}return normalizeAcademy(memory);}
 function save(state){memory=normalizeAcademy(state);try{storage.setItem(ACADEMY_KEY,JSON.stringify(memory));persistent=true;}catch{persistent=false;}if(typeof window!=='undefined')window.dispatchEvent(new Event('academy-progress'));return normalizeAcademy(memory);}
 return {read,save,get persistent(){return persistent;},event:event=>save(academyEvent(read(),event)),lesson:(id,answers)=>{const outcome=gradeLesson(read(),id,answers);save(outcome.state);return outcome;},cyber:answers=>save(finishCyber(read(),answers))};
}
let storage;try{storage=globalThis.localStorage;}catch{}
export const academy=createAcademyStore(storage);
