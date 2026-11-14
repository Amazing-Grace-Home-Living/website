import {nexus} from '../../nexus/model.js';
import { journal,mergeJourney } from './model.js';
import { readBrowserSnapshot,applyBrowserSnapshot } from './snapshot.js';
export function createLearningClient(){
 let token='',epoch=0,remoteProfile=null;
 let origin=['127.0.0.1','localhost'].includes(location.hostname)&&!!document.querySelector('meta[name=grace-companion]')?location.origin:'http://127.0.0.1:8787';
 async function request(path,body){
  if(!token)throw Error('Connect the companion with its session token to use host sync or the AI coach.');
  const sent=epoch;let response;
  try{response=await fetch(origin+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},signal:AbortSignal.timeout(65000),...(body?{body:JSON.stringify(body)}:{})});}catch{throw Error('Companion unreachable or origin not allowed. Open its learning hub, or launch it with --learning-origin '+location.origin+'.');}
  if(sent!==epoch)throw Error('Connection locked or changed. Reconnect before continuing.');
  let data;try{data=await response.json();}catch{throw Error('Learning API unavailable. Start the updated companion on port 8787.');}
  if(sent!==epoch)throw Error('Connection locked or changed.');if(!response.ok)throw Error(data.error||'Learning request rejected.');return data;
 }
 function apply(data){
  journal.save(mergeJourney(journal.read(),data.snapshot.journeys));remoteProfile=data.profile;
  let saved=true;try{applyBrowserSnapshot(localStorage,data.snapshot);}catch{saved=false;}
  return {...data,browserSaved:saved};
 }
 return {
  get connected(){return !!token;},get profile(){return remoteProfile;},get origin(){return origin;},
  setOrigin(value){let url;try{url=new URL(value);if(url.protocol!=='http:'||!['127.0.0.1','localhost'].includes(url.hostname)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error();}catch{throw Error('Use a loopback companion URL, without a path, login, query, or fragment.');}if(origin!==url.origin){epoch++;token='';remoteProfile=null;origin=url.origin;}},
  async connect(value){epoch++;token=value.trim();if(!token)throw Error('Enter the companion session token.');try{return await this.sync();}catch(error){token='';remoteProfile=null;throw error;}},
  lock(){epoch++;token='';remoteProfile=null;},
  async sync(){let progress;try{progress=readBrowserSnapshot(localStorage);}catch{progress={version:1,journeys:journal.read()};}progress.journeys=mergeJourney(progress.journeys,journal.read());return apply(await request('/api/learning/sync',{progress}));},
  async quiz(id,answers){if(!token)return journal.quiz(id,answers);const data=apply(await request('/api/learning/quiz',{lesson:id,answers}));return data.result;},
  async mission(id,answers){const data=apply(await request('/api/learning/nexus',{mission:id,answers}));return data.result;},
  async audio(){return request('/api/learning/audio');},
  async track(id){if(!token)throw Error('Connect the companion first.');if(!/^[a-z-]+$/.test(id))throw Error('Invalid track ID.');const sent=epoch,response=await fetch(origin+'/api/learning/audio/'+id,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(65000)});if(sent!==epoch)throw Error('Connection changed.');if(!response.ok)throw Error('Audio is locked or unavailable. Earn seven stars and sync first.');const blob=await response.blob();if(sent!==epoch)throw Error('Connection locked or changed.');return blob;},
  async models(provider){return request('/api/learning/models?provider='+encodeURIComponent(provider));},
  async coach(lesson,question,provider,model){return request('/api/learning/coach',{lesson,question,provider,model});}
 };
}
export function mountLearningSync(root,client,onSync=()=>{}){
 root.classList.add('sync-controls');
 root.innerHTML='<h2>Continue between the sidebar and arcade</h2><p>Optional host sync merges lesson IDs and gameplay milestones through your own companion. Provider keys and chat transcripts are never included.</p><form><label>Companion URL (loopback)<input type="url" data-origin autocomplete="off" required></label><label>Companion session token<input type="password" autocomplete="off" aria-label="Companion session token"></label><button type="submit">Connect & merge progress</button><button type="button" data-sync>Sync now</button><button type="button" data-lock>Lock</button></form><p role="status" aria-live="polite"></p><small>Session token stays in this page’s memory. The host stores a per-workspace progress file outside Git. Packet counters use their highest value when merging; simultaneous play is not added twice. Conflicting story choices keep the host’s existing choice. Separate origins stay separate until you explicitly connect and sync.</small>';
 const form=root.querySelector('form'),input=root.querySelector('input[type=password]'),originInput=root.querySelector('[data-origin]'),status=root.querySelector('[role=status]');
 originInput.value=client.origin;
 async function run(action){const buttons=[...form.querySelectorAll('button')];buttons.forEach(button=>button.disabled=true);try{const result=await action();input.value='';status.textContent='Host progress merged · '+result.profile.xp+' shared XP.'+(result.browserSaved?' Saved in this browser.':' Browser saving is unavailable; lesson progress remains in this tab and on the host.');onSync(result);}catch(error){input.value='';status.textContent=error.message;}finally{buttons.forEach(button=>button.disabled=false);}}
 form.onsubmit=event=>{event.preventDefault();run(()=>{client.setOrigin(originInput.value);return client.connect(input.value);});};root.querySelector('[data-sync]').onclick=()=>run(()=>client.sync());root.querySelector('[data-lock]').onclick=()=>{client.lock();input.value='';status.textContent='Locked. Local learning stays available; host sync is disconnected.';};
 const lock=()=>{client.lock();input.value='';};window.addEventListener('pagehide',lock);
}
