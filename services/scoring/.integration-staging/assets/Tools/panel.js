import { journal,journeySummary,mergeJourney } from './learning/model.js';
import { mountJourney } from './learning/view.js';
import { PROVIDER_GUIDES } from './provider-guides.js';
const $=selector=>document.querySelector(selector);
let companionOrigin='http://127.0.0.1:8787';
let token='', busy=false, history=[], terminalTimer, codexTask=null, cursor=0, lastActivity=Date.now(), epoch=0, step=0;
$('#extension-id').textContent=chrome.runtime.id;
function status(text){$('#status').textContent=text;}
async function api(path,body){
  if(!token)throw Error('Enter the companion token and connect.');
  const requestEpoch=epoch;
  let response;
  try{response=await fetch(companionOrigin+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'X-Grace-Extension-Id':chrome.runtime.id,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});}
  catch{throw Error('Companion unavailable. Start it on this computer with your extension ID.');}
  if(requestEpoch!==epoch)throw Error('Connection changed. Reconnect before continuing.');
  let data;try{data=await response.json();}catch{throw Error('Connection rejected. Check the companion extension allowlist.');}
  if(requestEpoch!==epoch)throw Error('Connection changed. Reconnect before continuing.');
  if(!response.ok)throw Error(data.error||'Request rejected.');
  return data;
}
function addMessage(label,text){const el=document.createElement('div');el.className='message';el.textContent=label+'\n'+text;$('#messages').append(el);return el;}
function setBusy(value){busy=value;$('#send').disabled=value;$('#provider').disabled=value;$('#model').disabled=value;}
function lock(){
  if(token&&busy&&!codexTask)api('/api/'+$('#provider').value+'/stop',{}).catch(()=>{});
  epoch++;token='';history=[];codexTask=null;cursor=0;setBusy(false);$('#token').value='';$('#messages').textContent='';clearTimeout(terminalTimer);learningProfile=null;renderLearningSummary();status('Locked. Reconnect using your companion token.');
}
function show(name){for(const id of ['setup','chat','learn'])$('#'+id).hidden=id!==name;for(const id of ['setup','chat','learn'])$('#'+id+'-tab').setAttribute('aria-pressed',String(id===name));}
$('#setup-tab').onclick=()=>show('setup');$('#chat-tab').onclick=()=>show('chat');$('#learn-tab').onclick=()=>show('learn');
function renderGuide(){
  const guide=PROVIDER_GUIDES.find(item=>item.id===$('#setup-provider').value);
  step=Math.max(0,Math.min(step,guide.steps.length-1));
  $('#guide-title').textContent=guide.name;$('#guide-progress').textContent='Step '+(step+1)+' of '+guide.steps.length;
  $('#guide-step').textContent=guide.steps[step];$('#guide-note').textContent=guide.note;
  $('#guide-account').href=guide.accountUrl;$('#guide-docs').href=guide.docs;
  $('#guide-command').textContent='node credential-setup.mjs '+guide.id+' --open'+(guide.kind==='local'?' --guide':'')+'\n'+(guide.kind!=='local'?'node bridge.mjs --cwd . --extension-id '+chrome.runtime.id+' --integrations '+guide.id:'node bridge.mjs --cwd . --extension-id '+chrome.runtime.id);
  $('#guide-prev').disabled=step===0;$('#guide-next').disabled=step===guide.steps.length-1;
}
$('#setup-provider').replaceChildren(...PROVIDER_GUIDES.map(guide=>{const option=document.createElement('option');option.value=guide.id;option.textContent=guide.name;return option;}));
$('#setup-provider').onchange=()=>{step=0;renderGuide();};$('#guide-prev').onclick=()=>{step--;renderGuide();};$('#guide-next').onclick=()=>{step++;renderGuide();};renderGuide();
$('#connect').onclick=async()=>{
  let url;try{url=new URL($('#companion-url').value);if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error();}catch{status('Use a loopback companion URL such as http://127.0.0.1:8787.');return;}
  companionOrigin=url.origin;epoch++;token=$('#token').value.trim();history=[];cursor=0;
  document.querySelectorAll('a[href^="http://127.0.0.1:8787/"]').forEach(link=>{link.href=companionOrigin+new URL(link.href).pathname;});
  try{const data=await api('/api/providers');$('#token').value='';status('Companion connected. Provider chat is ready to configure.');
    const configured=data.providers.filter(provider=>provider.configured).map(provider=>provider.name);
    $('#guide-result').textContent='Host configuration: '+(configured.join(', ')||'no API providers unlocked')+'. Refresh models to verify access; configuration alone is not verification.';
    await syncLearning().catch(error=>{$('#learning-status').textContent=error.message;});
  }catch(error){token='';status(error.message);}
};
$('#lock').onclick=lock;
$('#models').onclick=async()=>{
  if(busy)return;
  try{
    if($('#provider').value==='codex'){status('Codex uses the account signed in on your host.');return;}
    const data=await api('/api/'+$('#provider').value+'/models');
    $('#model').replaceChildren(...data.models.map(model=>{const option=document.createElement('option');option.value=option.textContent=model.id;return option;}));
    status(data.models.length?'Model discovery succeeded. Select a chat-capable model.':'No models found. Load a local model or check API model access.');
  }catch(error){status(error.message);}
};
$('#provider').onchange=()=>{if(busy)return;history=[];$('#model').replaceChildren();$('#messages').textContent='';const id=$('#provider').value;if(PROVIDER_GUIDES.some(guide=>guide.id===id)){$('#setup-provider').value=id;step=0;renderGuide();}};
async function pollCodex(reply,taskEpoch){
  if(!codexTask||!token||taskEpoch!==epoch)return;
  try{const data=await api('/api/events?after='+cursor);
    for(const event of data.events){cursor=event.seq;const message=event.message,params=message.params||{};
      if(params.threadId!==codexTask?.threadId)continue;
      if(message.method==='item/agentMessage/delta')reply.textContent+=(params.delta||'');
      if(message.method==='turn/completed'){setBusy(false);codexTask=null;status(params.turn?.error?.message||'Codex turn finished. Review results in the full console.');return;}
    }
    if(data.approvals?.length)status('Codex needs approval. Open Full console to review the exact request.');
    setTimeout(()=>pollCodex(reply,taskEpoch),1000);
  }catch(error){if(taskEpoch===epoch){setBusy(false);codexTask=null;status(error.message);}}
}
$('#chat-form').onsubmit=async event=>{
  event.preventDefault();if(busy)return;const prompt=$('#prompt').value.trim();if(!prompt)return;
  if(/(?:github_pat_|gh[pousr]_|sk-(?:proj-|ant-)?[A-Za-z0-9_-]{16,}|AIza[A-Za-z0-9_-]{25,}|Bearer\s)/i.test(prompt)){status('Do not send credentials in chat. Use Provider setup and the hidden host prompt.');return;}
  const provider=$('#provider').value;if(provider!=='codex'&&!$('#model').value){status('Refresh models and select a model first.');return;}
  const taskEpoch=epoch;setBusy(true);addMessage('YOU',prompt);const reply=addMessage(provider.toUpperCase(),'');$('#prompt').value='';
  try{
    if(provider==='codex'){await api('/api/connect',{});codexTask=await api('/api/task',{text:prompt});pollCodex(reply,taskEpoch);return;}
    const messages=[...history,{role:'user',content:prompt}].slice(-19);
    const response=await api('/api/'+provider+'/chat',{model:$('#model').value,messages});
    if(taskEpoch!==epoch)return;
    reply.textContent=response.text;history=[...messages,{role:'assistant',content:response.text}].slice(-18);
  }catch(error){if(taskEpoch===epoch)reply.textContent=error.message;}
  if(taskEpoch===epoch)setBusy(false);
};
$('#stop-ai').onclick=async()=>{try{if(codexTask)await api('/api/interrupt',codexTask);else if(busy)await api('/api/'+$('#provider').value+'/stop',{});}catch(error){status(error.message);}};

for(const event of ['pointerdown','keydown'])addEventListener(event,()=>lastActivity=Date.now());
setInterval(()=>{if(token&&Date.now()-lastActivity>600000)lock();},15000);addEventListener('pagehide',lock);

let learningProfile=null;
function renderLearningSummary(){const summary=journeySummary(journal.read());$('#learning-summary').textContent=summary.mastered+'/'+summary.total+' lessons mastered · '+summary.xp+' journey XP'+(learningProfile?' · '+learningProfile.xp+' shared XP on companion':' · local progress');}
async function syncLearning(){const data=await api('/api/learning/sync',{progress:{version:1,journeys:journal.read()}});journal.save(mergeJourney(journal.read(),data.snapshot.journeys));learningProfile=data.profile;renderLearningSummary();learningView.refresh();$('#learning-status').textContent='Host progress merged. Open the full LMS and connect its sync control to merge arcade progress.';return data;}
const learningView=mountJourney($('#learning-root'),{
 read:()=>journal.read(),
 async submit(lesson,answers){if(!token){const result=journal.quiz(lesson,answers);renderLearningSummary();return result;}const data=await api('/api/learning/quiz',{lesson,answers});journal.save(mergeJourney(journal.read(),data.snapshot.journeys));learningProfile=data.profile;renderLearningSummary();return data.result;},
 practice:path=>{const target=companionOrigin+(path==='/'?'/matchmaker/':path);window.open(target,'_blank','noopener,noreferrer');$('#learning-status').textContent='Practice opened in the companion. Use its sync control to carry gameplay milestones back to the sidebar.';},
 coach:(lesson,question)=>{if($('#provider').value==='codex')throw Error('For the read-only learning coach, choose a chat provider and model in AI chat. Codex host tasks are a separate flow.');return api('/api/learning/coach',{lesson,question,provider:$('#provider').value,model:$('#model').value});},
 onChange:()=>renderLearningSummary()
});
$('#learning-sync').onclick=()=>syncLearning().catch(error=>{$('#learning-status').textContent=error.message;});
renderLearningSummary();show('learn');
