import {completeNexus} from './src/game/nexus/model.js';
import { readFile,writeFile,mkdir,rename,lstat,rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { resolve,join,dirname } from 'node:path';
import { createHash,randomBytes } from 'node:crypto';
import { normalizeSnapshot,mergeSnapshots,snapshotProfile } from './src/game/learning/journeys/snapshot.js';
import { gradeJourney } from './src/game/learning/journeys/model.js';
export function learningFile(cwd){return join(homedir(),'.grace-remote','learning',createHash('sha256').update(resolve(cwd)).digest('hex').slice(0,24)+'.json');}
export function createLearningStore({file=learningFile(process.cwd())}={}){
 let queue=Promise.resolve();
 async function load(){
  try{const info=await lstat(file);if(info.isSymbolicLink()||!info.isFile()||info.size>262144)throw Error('Invalid learning progress file.');const parsed=JSON.parse(await readFile(file,'utf8'));if(parsed?.version!==1)throw Error('Unsupported learning progress version.');return normalizeSnapshot(parsed);}
  catch(error){if(error.code==='ENOENT')return normalizeSnapshot();throw Error('Learning progress could not be read. Check the host file and permissions; no saved progress was replaced.');}
 }
 async function save(snapshot){
  await mkdir(dirname(file),{recursive:true,mode:0o700});if((await lstat(dirname(file))).isSymbolicLink())throw Error('Learning directory cannot be a symlink.');
  const temporary=file+'.'+randomBytes(8).toString('hex')+'.tmp';
  try{await writeFile(temporary,JSON.stringify(snapshot),{flag:'wx',mode:0o600});await rename(temporary,file);}finally{await rm(temporary,{force:true});}
 }
 function transact(action){const operation=queue.catch(()=>{}).then(async()=>{const snapshot=await load(),result=action(snapshot);await save(result.snapshot);return result;});queue=operation;return operation;}
 return {
  async read(){await queue.catch(()=>{});return load();},
  async sync(incoming){const result=await transact(current=>({snapshot:mergeSnapshots(current,incoming)}));return {...result,profile:snapshotProfile(result.snapshot)};},
  async mission(id,answers){return transact(current=>{const result=completeNexus(current.nexus,id,answers,current.journeys),snapshot={...current,nexus:result.state};return {snapshot,result:{xp:result.xp,mission:result.mission},profile:snapshotProfile(snapshot)};});},
  async quiz(id,answers){return transact(current=>{const result=gradeJourney(current.journeys,id,answers),snapshot={...current,journeys:result.state};return {snapshot,result:{passed:result.passed,correct:result.correct,total:result.total,xp:result.xp,feedback:result.feedback,star:result.star},profile:snapshotProfile(snapshot)};});}
 };
}
