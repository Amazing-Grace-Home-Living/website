const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const local=['127.0.0.1','localhost'].includes(location.hostname);
let live=false,token='',filter='all',current=null,diffMode=false,cursor=0,polling=false;
let tasks=[],approvals=[],activeTurns={};
function toast(text){$('#toast').textContent=text;$('#toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').style.display='none',5000);}
function view(name){for(const el of document.querySelectorAll('.view'))el.hidden=el.id!==`view-${name}`;document.querySelectorAll('.nav').forEach(el=>el.classList.toggle('active',el.dataset.view===name));$('#crumb').textContent=({tasks:'Sessions',approvals:'Approvals',changes:'Changes',setup:'Connection',integrations:'Integrations',learn:'Learn',assistant:'Setup assistant'})[name];if(location.hash!==`#${name}`)history.replaceState(null,'',`#${name}`);window.scrollTo({top:0,behavior:'instant'});const heading=$(`#view-${name} h2`);if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>view(b.dataset.view)));
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('selected',x===b));render();}));
const labels={active:'In progress',review:'Needs you',done:'Completed',idle:'Ready',error:'Needs attention'};
function render(){
 $('#session-count').textContent=tasks.length;$('#approval-count').textContent=approvals.length;$('#stat-sessions').textContent=tasks.length;$('#stat-approvals').textContent=approvals.length;$('#list-count').textContent=String(tasks.length).padStart(2,'0');
 const list=tasks.filter(t=>filter==='all'||t.status===filter);
 $('#empty').hidden=!!list.length;
 $('#sessions').innerHTML=list.map(t=>`<button class="session-card" data-task="${esc(t.id)}"><div class="card-top"><span class="project-name"><span class="project-icon">⑂</span>${esc(t.project)}</span><span class="badge ${esc(t.status)}">${t.status==='active'?'◉':t.status==='review'?'◇':'✓'} ${esc(labels[t.status]||t.status)}</span></div><h3 class="session-title">${esc(t.title)}</h3><p class="session-summary">${esc(t.summary)}</p><div class="card-bottom"><span class="branch">⑂ ${esc(t.branch||'Host workspace')}</span><span class="right">${esc(t.age||'Host session')}</span><span class="arrow">↗</span></div></button>`).join('');
 document.querySelectorAll('[data-task]').forEach(b=>b.addEventListener('click',()=>openTask(b.dataset.task)));
 $('#approvals').innerHTML=approvals.length?approvals.map(a=>`<article class="approval-card"><span class="badge review">${live?'Host request':'Pending host request'}</span><h3>${esc(a.params.networkApprovalContext ? 'Network access request' : a.method==='item/fileChange/requestApproval' ? 'File change request' : 'Command request')}</h3><p>${esc(a.params.reason||'Review the requested action before continuing.')}</p><pre>${esc(a.params.command||JSON.stringify(a.params,null,2))}</pre><small class="hint">Workspace: ${esc(a.params.cwd||'Configured host workspace')}</small><div class="approval-actions"><button class="primary" data-approve="${esc(a.id)}" ${!canApprove(a)?'disabled':''}>${live?'Approve once':'Approve once'}</button><button class="secondary" data-deny="${esc(a.id)}">Decline</button></div></article>`).join(''):'<div class="empty">All clear. No requests are waiting for you.</div>';
 document.querySelectorAll('[data-approve]').forEach(b=>b.onclick=()=>decide(b.dataset.approve,true));document.querySelectorAll('[data-deny]').forEach(b=>b.onclick=()=>decide(b.dataset.deny,false));
 $('#changes').innerHTML=tasks.length?tasks.map(t=>`<article class="change-card"><span class="project-name">${esc(t.project)}</span><h3>${esc(t.title)}</h3><pre>${esc(t.diff||'No code diff reported for this session.')}</pre></article>`).join(''):'<div class="empty">Diffs will appear when a host reports code changes.</div>';
 const next=approvals[0];$('#next-command').textContent=next?.params.command||(next?'Review host request':'No pending requests');$('#next-title').textContent=next?'One decision. Keep things moving.':'Room to keep building.';
 $('.decision-card small').textContent=live?'Host policies and permissions still apply':'Connect your host to receive real requests';
 updateDetail();
}
function canApprove(a){return ['item/commandExecution/requestApproval','item/fileChange/requestApproval'].includes(a.method)&&!a.params.networkApprovalContext;}
async function decide(id,accept){
 const a=approvals.find(x=>String(x.id)===id);if(!a)return;
 if(live){try{await api('/api/approval',{id:a.id,accept});}catch(e){toast(e.message);return;}}
 approvals=approvals.filter(x=>x!==a);const t=tasks.find(x=>x.id===a.params.threadId);if(t)t.status=live?'active':'done';render();toast(live?(accept?'Approval sent to host':'Request declined'):'No host request was executed.');
}
async function api(path,body){const response=await fetch(path,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await response.json();if(!response.ok)throw new Error(data.error||`Request failed (${response.status})`);return data;}
$('#hosted-connect').hidden=local;$('#local-connect').hidden=!local;
$('#connect').onclick=async()=>{
 token=$('#bridge-token').value.trim();if(!token){toast('Paste the companion token first.');return;}
 $('#connect').disabled=true;$('#connection-status').textContent='Connecting to your local companion…';
 try{const data=await api('/api/connect',{});live=true;tasks=[];approvals=[];cursor=0;$('#bridge-token').value='';$('#mode').textContent='CODEX CONNECTED';$('#demo-note').hidden=true;$('#stat-host').textContent=data.host;$('#stat-host-sub').textContent=data.cwd;$('#side-host').textContent=data.host;$('#side-host-sub').textContent='Local companion connected';$('#connection-status').textContent=`Connected to ${data.host}. ${data.account ? 'Codex account detected.' : 'Sign in to Codex on the host before starting a task.'}`;const history=await api('/api/threads');tasks=history.threads.map(t=>({id:t.id,title:t.name||t.preview||'Host session',project:data.project,status:'idle',summary:'Stored Codex session in the configured workspace. Open it to resume.',output:'',diff:'',branch:'Host workspace'}));render();poll();await loadIntegrations();view('assistant');chooseProvider('codex');toast('Connected to your host. AI setup assistance is available.');}catch(e){token='';$('#connection-status').textContent=e.message;}finally{$('#connect').disabled=false;}
};
$('#new-task').onclick=()=>{if(!live){view('assistant');toast('Connect your host before starting a Codex task.');return;}$('#task-error').hidden=true;$('#task-error').textContent='';$('#task-context').textContent=live?'Runs in your configured host workspace with its Codex permissions.':'Demo mode: creates a sample session without running commands.';$('#task-dialog').showModal();};
$('#close-dialog').onclick=$('#cancel-dialog').onclick=()=>$('#task-dialog').close();
$('#task-form').onsubmit=async e=>{e.preventDefault();const text=$('#task-prompt').value.trim();if(!text)return;$('#send-task').disabled=true;try{if(live){const data=await api('/api/task',{text});tasks.unshift({id:data.threadId,title:text.slice(0,90),project:data.project,status:'active',summary:'Task started on your connected host.',output:'',diff:''});activeTurns[data.threadId]=data.turnId;}else{throw new Error('Connect your host before starting a task.');}$('#task-prompt').value='';$('#task-dialog').close();view('tasks');render();}catch(e){$('#task-error').textContent=e.message;$('#task-error').hidden=false;}finally{$('#send-task').disabled=false;}};
async function openTask(id){current=id;diffMode=false;if(live){try{const data=await api('/api/resume',{threadId:id});const t=tasks.find(x=>x.id===id);t.output=data.output||t.output;t.diff=data.diff||t.diff;if(data.turnId)activeTurns[id]=data.turnId;}catch(e){toast(e.message);return;}}updateDetail();$('#detail-dialog').showModal();}
function updateDetail(){const t=tasks.find(t=>t.id===current);if(!t)return;$('#detail-title').textContent=t.title;$('#detail-sub').textContent=`${t.project} · ${live?'Connected host':'Host not connected'}`;$('#detail-content').textContent=(diffMode?t.diff:t.output)||(diffMode?'No code diff reported.':'Waiting for host activity…');$('#show-output').classList.toggle('selected',!diffMode);$('#show-diff').classList.toggle('selected',diffMode);$('#stop-turn').disabled=!live||!activeTurns[current];}
$('#close-detail').onclick=()=>$('#detail-dialog').close();$('#show-output').onclick=()=>{diffMode=false;updateDetail();};$('#show-diff').onclick=()=>{diffMode=true;updateDetail();};
$('#followup-form').onsubmit=async e=>{e.preventDefault();const text=$('#followup').value.trim();if(!text)return;if(!live){toast('Connect your host to send a follow-up.');return;}try{if(live){const data=await api('/api/followup',{threadId:current,text});activeTurns[current]=data.turnId;}const t=tasks.find(x=>x.id===current);t.output+=`\n\nYou: ${text}`;t.status=live?'active':'idle';$('#followup').value='';render();}catch(e){toast(e.message);}};
$('#stop-turn').onclick=async()=>{try{await api('/api/interrupt',{threadId:current,turnId:activeTurns[current]});toast('Interrupt requested.');}catch(e){toast(e.message);}};
function event(message){const p=message.params||{};if(message.id!==undefined&&message.method){if(!approvals.some(x=>x.id===message.id))approvals.push(message);const t=tasks.find(t=>t.id===p.threadId);if(t)t.status='review';return;}if(message.method==='serverRequest/resolved'){approvals=approvals.filter(a=>a.id!==p.requestId);return;}const t=tasks.find(t=>t.id===p.threadId);if(!t)return;
 if(message.method==='item/agentMessage/delta'&&p.threadId===assistantThread){const last=assistantHistory.at(-1);if(last?.role==='ai'){last.text+=(p.delta||'');renderAssistant();}}
 if(message.method==='turn/completed'&&p.threadId===assistantThread){assistantBusy=false;const last=assistantHistory.at(-1);if(last?.role==='ai'&&!last.text)last.text=p.turn.error?.message||'Turn finished without a text reply. Review Activity and Approvals for details.';renderAssistant();}
 if(message.method==='turn/started'){activeTurns[t.id]=p.turn.id;t.status='active';}
 if(message.method==='item/agentMessage/delta')t.output+=(p.delta||'');
 if(message.method==='item/commandExecution/outputDelta')t.output+=(p.delta||'');
 if(message.method==='item/started'&&p.item?.type==='commandExecution')t.output+=`\n\n$ ${p.item.command}\n`;
 if(message.method==='turn/diff/updated')t.diff=p.diff;
 if(message.method==='turn/completed'){t.status=p.turn.status==='completed'?'done':p.turn.status==='interrupted'?'idle':'error';delete activeTurns[t.id];t.summary=`Host turn ${p.turn.status}. Open to review its result.`;if(p.turn.error)t.output+=`\n${p.turn.error.message}`;}
 if(message.method==='error'){t.status='error';t.output+=`\nError: ${p.error?.message||'Host error'}`;}
}
async function poll(){if(polling)return;polling=true;while(live){try{const data=await api(`/api/events?after=${cursor}`);if(!live)break;if(data.reset){toast('Host event history was truncated. Resume a session to reload its saved output.');}for(const entry of data.events){event(entry.message);cursor=Math.max(cursor,entry.seq);}const changed=data.events.length>0||JSON.stringify(approvals)!==JSON.stringify(data.approvals);approvals=data.approvals;if(changed)render();await new Promise(r=>setTimeout(r,1000));}catch(e){lockBrowser('Connection ended or token expired. Reconnect with the current host token.');}}polling=false;}
render();

// v0.2: metadata-only integration catalog and interactive learning.
const demoIntegrations=[
 {id:'github',name:'GitHub',env:'GH_TOKEN',description:'Repository work and pull requests using host tools.'},
 {id:'vercel',name:'Vercel',env:'VERCEL_TOKEN',description:'Deployment tools authenticated on your host.'},
 {id:'openai',name:'OpenAI API',env:'OPENAI_API_KEY',description:'Optional API access, separate from personal sign-in.'}
];
let integrations=demoIntegrations,lastInteraction=Date.now();
function renderIntegrations(){
 $('#integration-list').innerHTML=integrations.map(item=>`<article class="integration-card"><span class="matrix-label">${esc(item.id.toUpperCase())} / HOST ADAPTER</span><h3>${esc(item.name)}</h3><p>${esc(item.description)}</p><span class="badge ${item.expired?'error':item.configured?'active':'idle'}">${!live?'Not checked':item.expired?'Stored token expired':item.configured?'Configured on host':'Not enabled'}</span><p><code>${esc(item.env)}</code></p><p class="hint">${item.stored?'Encrypted vault entry present. ':''}${item.expiresAt?'Expires: '+esc(new Date(item.expiresAt).toLocaleString()):'Provider access has not been tested.'}</p><button class="secondary" data-integration="${esc(item.id)}">Host setup instructions ↗</button></article>`).join('');
 document.querySelectorAll('[data-integration]').forEach(button=>button.onclick=()=>$('#vault-dialog').showModal());
 $('#rotate-token').disabled=!live;$('#refresh-integrations').disabled=!live;
}
async function loadIntegrations(){if(!live){renderIntegrations();return;}const result=await api('/api/integrations');integrations=result.integrations;$('#integration-note').textContent=`Live host metadata. Vault ${result.vaultEnabled?'unlocked for selected integrations':'not enabled; host environment inspected'}. Configuration is not a provider permission check.`;$('#security-status').textContent=`Companion token expires ${new Date(result.tokenExpiresAt).toLocaleString()}. Browser locks after 10 minutes without interaction.`;renderIntegrations();}
$('#refresh-integrations').onclick=()=>loadIntegrations().catch(e=>toast(e.message));
$('#vault-guide').onclick=()=>$('#vault-dialog').showModal();$('#close-vault').onclick=()=>$('#vault-dialog').close();
$('#rotate-token').onclick=async()=>{if(!live)return;try{const result=await api('/api/token/rotate',{});token=result.token;lastInteraction=Date.now();$('#security-status').textContent=`Token rotated; expires ${new Date(result.tokenExpiresAt).toLocaleString()}. The previous token is invalid. Save the replacement from the dialog to your password manager before locking this page.`;window.prompt('Save the replacement companion token to your password manager. The previous token is now invalid. Never paste it into chat.',token);toast('Companion token rotated. Previous token is invalid.');}catch(e){toast(e.message);}};
function lockBrowser(reason='Browser locked. Reconnect using your saved, unexpired companion token.'){
 live=false;token='';tasks=[];approvals=[];activeTurns={};current=null;integrations=demoIntegrations;
 for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();
 $('#task-error').textContent='';$('#task-error').hidden=true;$('#detail-content').textContent='';$('#detail-title').textContent='';$('#detail-sub').textContent='';$('#task-prompt').value='';$('#followup').value='';$('#bridge-token').value='';
 $('#mode').textContent='LOCKED';$('#side-host').textContent='Browser locked';$('#side-host-sub').textContent='Credentials cleared from this page';$('#stat-host').textContent='Disconnected';$('#stat-host-sub').textContent='Reconnect to resume';$('#connection-status').textContent=reason;$('#integration-note').textContent='Connect your host to inspect configuration metadata.';lmReady=false;assistantThread=null;assistantHistory=[];view('assistant');render();renderIntegrations();renderAssistant();toast(reason);
}
$('#lock-session').onclick=$('#setup-lock').onclick=()=>lockBrowser();
for(const event of ['pointerdown','keydown','touchstart'])window.addEventListener(event,()=>{lastInteraction=Date.now();},{passive:true});
setInterval(()=>{if((live||token)&&Date.now()-lastInteraction>10*60*1000)lockBrowser('Locked after 10 minutes without interaction. Reconnect to your host.');},15000);
window.addEventListener('pagehide',()=>{live=false;token='';});
const lessons=[
 {id:'host',title:'Connect your execution host',text:'The phone sends instructions. A Windows computer or Linux server runs Codex with its own tools and permissions.',question:'Where should the companion listen?',options:['On loopback, reached through an SSH tunnel','On a public port with no authentication'],correct:0,success:'Correct. Keep the bridge on loopback and use the authenticated tunnel.'},
 {id:'tokens',title:'Keep credentials on the host',text:'Store integration tokens in the encrypted optional vault outside your repository. The web app receives readiness metadata only.',question:'Where should a GitHub token be entered?',options:['In a chat message or task prompt','In the host vault’s hidden terminal prompt'],correct:1,success:'Correct. Never paste provider tokens into task instructions or browser storage.'},
 {id:'approvals',title:'Understand permission boundaries',text:'The companion presents supported command/file requests. Host policy, repository permissions and provider scopes still apply.',question:'Can a mobile approval bypass a denied host policy?',options:['No. The host remains authoritative','Yes. The companion overrides policy'],correct:0,success:'Correct. An approval is a request within the host’s permissions, not a bypass.'},
 {id:'expand',title:'Add an integration responsibly',text:'Add non-secret adapter metadata to integrations.json, store its token on the host, then explicitly enable it at startup. Provider tools still need configuration.',question:'What belongs in integrations.json?',options:['The provider token and refresh secret','A provider ID, display name and environment variable name'],correct:1,success:'Correct. Metadata belongs in the catalog; credentials belong in the encrypted host vault.'}
];
let completed=[];try{const saved=JSON.parse(localStorage.getItem('grace-remote-lessons-v1')||'[]');if(Array.isArray(saved))completed=saved.filter(id=>lessons.some(l=>l.id===id));}catch{}
function renderLessons(){
 $('#lesson-progress').textContent=`${completed.length} / ${lessons.length} COMPLETE`;$('#lesson-bar').style.width=`${completed.length/lessons.length*100}%`;
 $('#lessons').innerHTML=lessons.map((lesson,index)=>`<article class="lesson"><span class="matrix-label">MODULE 0${index+1} / ${completed.includes(lesson.id)?'COMPLETE ✓':'READY'}</span><h3>${esc(lesson.title)}</h3><p>${esc(lesson.text)}</p><p><strong>${esc(lesson.question)}</strong></p><div class="lesson-options">${lesson.options.map((label,i)=>`<button data-lesson="${lesson.id}" data-answer="${i}">${esc(label)}</button>`).join('')}</div><div class="answer" id="answer-${lesson.id}" role="status">${completed.includes(lesson.id)?esc(lesson.success):''}</div></article>`).join('');
 document.querySelectorAll('[data-lesson]').forEach(button=>button.onclick=()=>{const lesson=lessons.find(l=>l.id===button.dataset.lesson);if(Number(button.dataset.answer)!==lesson.correct){$(`#answer-${lesson.id}`).textContent='Try again. Review the guidance above.';return;}if(!completed.includes(lesson.id))completed.push(lesson.id);try{localStorage.setItem('grace-remote-lessons-v1',JSON.stringify(completed));}catch{}renderLessons();});
}
renderIntegrations();renderLessons();

const allowedViews=['tasks','approvals','changes','setup','integrations','learn','assistant'];
const initialView=location.hash.slice(1);if(allowedViews.includes(initialView))view(initialView);else view('assistant');
window.addEventListener('hashchange',()=>{const name=location.hash.slice(1);if(allowedViews.includes(name))view(name);});

let lmReady=false;
const provider=()=>$('#assistant-provider').value;
const useLM=()=>['lmstudio','ollama'].includes(provider());
const localName=()=>provider()==='ollama'?'Ollama':'LM Studio';
const localAPI=()=>'/api/'+(provider()==='ollama'?'ollama':'lmstudio');
const externalProviders={gemini:{name:'Gemini',url:'https://gemini.google.com/'},copilot:{name:'Microsoft Copilot',url:'https://copilot.microsoft.com/'},meta:{name:'Meta AI',url:'https://www.meta.ai/'}};
let assistantThread=null,assistantBusy=false,assistantHistory=[],hostedAI={ready:false,signedIn:false};
const guideSteps={
 ios:{text:'Termux is for Android. On iPhone, use ChatGPT’s supported Remote connection to a paired desktop, or an SSH app that supports local port forwarding to your own configured host. The companion itself runs on Windows or Linux, not in your iPhone browser.',command:null,next:'Do you have a Windows computer or Linux server available as the host?'},
 android:{text:'Use your Android phone as the control surface. Run the companion on your Windows computer or Linux server first. In Termux, install the SSH client, then forward the host’s loopback port. Replace USER@HOST with your configured SSH login. Keep Termux open and visit http://127.0.0.1:8787 in your phone browser. Enter only the companion connection token there; never a provider API key.',command:'pkg install openssh\nssh -N -L 8787:127.0.0.1:8787 USER@HOST',next:'On your computer, is Codex installed and signed in?'},
 windows:{text:'On your Windows host, verify that Node.js and Codex are installed and that Codex is signed in. Download and extract the companion package. From its folder, start the bridge against your real repository. Keep the terminal open. If Codex is only an npm .cmd shim, follow the README’s CODEX_BIN instructions or use WSL.',command:'node --version\ncodex --version\ncodex login status\nnode bridge.mjs --cwd "C:/Users/YOUR_NAME/Documents/GitHub/YOUR_REPOSITORY"',next:'If a command fails, share the error with passwords and tokens removed.'},
 github:{text:'On the host, use GitHub CLI’s browser sign-in flow and verify the repository’s permissions. This website cannot grant repository access. Never paste a GitHub token into this chat. The encrypted host vault is an optional alternative for scoped tokens.',command:'gh auth login\ngh auth status\ngh repo view OWNER/REPOSITORY',next:'Once signed in, connect the companion and check Integrations. A configured token is not proof of write access.'},
 vercel:{text:'Authenticate Vercel CLI on the computer where the repository lives. Link the existing project using its real team and project. Inspect it before requesting deployment. A successful login alone does not confirm production deployment permission.',command:'vercel login\nvercel link\nvercel project inspect YOUR_PROJECT_NAME',next:'Which project and team are you trying to connect? Share names only, never token values.'},
 vault:{text:'Provider credentials belong in the host’s hidden terminal prompts. Use a strong unique vault passphrase. Explicitly enable only the integrations your task needs. Restart the companion after rotating or removing a vault entry; revoke removed tokens with the provider too.',command:'node vault.mjs set github\nnode vault.mjs list\nnode bridge.mjs --cwd /path/to/repo --integrations github',next:'The browser shows readiness metadata only. Open Integrations for vault instructions.'},
 ai:{text:'For AI through your own Codex account, first connect the companion from its local URL. This public page does not have hosted AI credentials configured. A hosted assistant needs a securely provisioned server-side AI credential and visitor authentication before activation; do not paste an API key here.',command:null,next:'Choose Windows setup or Android / Termux to begin connecting your host.'}
};
function renderAssistant(){
 const chosen=provider(),external=externalProviders[chosen];
 $('#assistant-state').textContent=useLM()?(lmReady?localName()+' · connected':localName()+' · setup required'):external?'External app':chosen==='codex'?(live?'Codex · connected':'Codex · host required'):chosen==='hosted'?(hostedAI.signedIn?'OpenAI · website session':'OpenAI · site sign-in required'):'Setup guide · no login';
 $('#assistant-description').textContent=useLM()?'Chat with a model served by your computer. No OpenAI login needed. This chat cannot execute commands or access files.':external?'Open this provider in its own app and sign in there. Messages are not sent from this console to that provider.':chosen==='codex'?'Codex uses the account signed in on your own computer. It provides host tasks and approvals through the local companion.':chosen==='hosted'?'Hosted guidance uses the site owner’s API configuration. ChatGPT sign-in identifies the visitor; it does not select a personal API account or other AI provider.':'Choose a provider, or use the setup topics below without signing in.';
 $('#provider-details').textContent=chosen==='hosted'?'To use a different ChatGPT account, open ChatGPT separately and use its account controls, then return to this site. You may also open this site in a separate browser profile. This page cannot force an account chooser or change your ChatGPT session.':chosen==='codex'?'To switch a stored Codex login, stop this companion first. Run codex logout, then codex login on the host and complete the browser flow using your intended account. This also affects the CLI/IDE shared login. Restart the companion afterward.':chosen==='ollama'?'Start Ollama locally (default port 11434) and install a chat model. Llama is a model family, not an account login; choose an installed compatible model below.':chosen==='lmstudio'?'Load a chat model and start LM Studio’s Developer server (default port 1234). On the hosted site, download/run the companion and open its local console first.':'';
 $('#provider-actions').innerHTML=external?`<a class="primary toolbox-link" href="${external.url}" target="_blank" rel="noopener noreferrer">Open ${external.name} / sign in ↗</a>`:chosen==='hosted'?'<a class="secondary toolbox-link" href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">Open ChatGPT / manage account ↗</a>':'';
 $('#assistant-messages').innerHTML=assistantHistory.map(m=>`<article class="chat-message ${m.role==='user'?'from-user':'from-assistant'}"><span class="matrix-label">${m.role==='user'?'YOU':m.role==='ai'?(m.provider||'AI').toUpperCase():'SETUP GUIDE / NOT AI'}</span><p>${esc(m.text||'Waiting for reply…')}</p>${m.command?`<pre>${esc(m.command)}</pre>`:''}</article>`).join('');
 $('#assistant-form').hidden=!!external;
 $('#assistant-send').disabled=assistantBusy;$('#assistant-send').textContent=assistantBusy?'Working…':useLM()?'Ask local model ↗':chosen==='codex'?'Ask Codex ↗':chosen==='hosted'?'Ask hosted OpenAI ↗':'Get setup steps ↗';
 $('#lm-stop').hidden=!(assistantBusy&&useLM());$('#assistant-provider').disabled=assistantBusy;$('#lm-model').disabled=assistantBusy;
 $('#assistant-connect').hidden=live;
 const signIn=$('#assistant-signin');signIn.hidden=local||chosen!=='hosted'||hostedAI.signedIn;
 if(hostedAI.signInUrl){signIn.href=hostedAI.signInUrl;signIn.target='_top';}
}

function sensitive(text){return /(?:sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{15,}|github_pat_[A-Za-z0-9_]{16,}|Bearer\s+[A-Za-z0-9_.-]{20,})/i.test(text);}
async function sendAssistant(text){
 text=text.trim();if(!text||assistantBusy)return;
 if(sensitive(text)){toast('This looks like a credential. Do not send it. Use a hidden host vault prompt.');return;}
 if(provider()==='codex'&&!live){view('setup');toast('Start the companion and connect Codex on your local host console first.');return;}
 if(provider()==='hosted'&&(!hostedAI.ready||!hostedAI.signedIn)){toast(hostedAI.ready?'Use the hosted guide sign-in link first.':'Hosted OpenAI is unavailable. Choose a local model or setup guide.');return;}
 if(useLM()){
  if(!lmReady){toast('Connect your local model server and select a model first.');return;}
  assistantHistory.push({role:'user',text});
  const messages=assistantHistory.filter(m=>m.role==='user'||m.role==='ai'&&m.text).slice(-20).map(m=>({role:m.role==='ai'?'assistant':'user',content:m.text}));
  assistantBusy=true;const reply={role:'ai',text:'',provider:localName()};assistantHistory.push(reply);renderAssistant();
  try{const data=await api(localAPI()+'/chat',{model:$('#lm-model').value,messages});reply.text=data.text;}catch(e){reply.text=e.message;}finally{assistantBusy=false;renderAssistant();}return;
 }
 assistantHistory.push({role:'user',text});
 if(provider()==='hosted'&&hostedAI.ready&&hostedAI.signedIn){assistantBusy=true;assistantHistory.push({role:'ai',text:''});renderAssistant();try{const response=await fetch(new URL('assistant/chat',document.baseURI).pathname,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:assistantHistory.filter(m=>m.role==='user'||m.role==='ai'&&m.text).slice(-10).map(m=>({role:m.role==='ai'?'assistant':'user',content:m.text}))})});const data=await response.json();if(!response.ok)throw Error(data.error||'AI request failed.');assistantHistory.at(-1).text=data.text;}catch(e){assistantHistory.at(-1).text=e.message;}finally{assistantBusy=false;renderAssistant();}return;}
 if(provider()==='default'){const key=/iphone|ios/i.test(text)?'ios':/android|termux|phone/i.test(text)?'android':/windows|powershell|computer|host|node|codex/i.test(text)?'windows':/github|repository|pull request/i.test(text)?'github':/vercel|deploy/i.test(text)?'vercel':/vault|token|secret|credential/i.test(text)?'vault':'ai';const step=guideSteps[key];assistantHistory.push({role:'guide',text:step.text+'\n\n'+step.next,command:step.command});renderAssistant();return;}
 assistantBusy=true;assistantHistory.push({role:'ai',text:''});renderAssistant();
 try{const data=await api('/api/assistant',{text,threadId:assistantThread});assistantThread=data.threadId;if(!tasks.some(t=>t.id===data.threadId))tasks.unshift({id:data.threadId,title:'Connection setup assistant',project:data.project,status:'active',summary:'AI guidance from your connected host.',output:'',diff:''});activeTurns[data.threadId]=data.turnId;render();}
 catch(e){assistantHistory.at(-1).text=e.message;assistantBusy=false;renderAssistant();}
}
$('#assistant-form').onsubmit=event=>{event.preventDefault();const input=$('#assistant-input');const text=input.value;input.value='';sendAssistant(text);};
document.querySelectorAll('[data-assistant-prompt]').forEach(button=>button.onclick=()=>sendAssistant(button.dataset.assistantPrompt));
$('#assistant-connect').onclick=()=>{view('setup');$('#connection-status').textContent=local?'Enter the companion token printed in your host terminal.':'Setup opened. Start the companion on your computer, establish your SSH tunnel, then open the local console below.';};
$('#assistant-clear').onclick=()=>{if(assistantBusy){toast('Wait for the active reply or interrupt it from Sessions.');return;}assistantHistory=[];assistantThread=null;renderAssistant();};
function chooseProvider(value){
 if(assistantBusy){toast('Wait for the current reply or stop it first.');return;}
 $('#assistant-provider').value=value;assistantHistory=[];assistantThread=null;lmReady=false;$('#lm-model').innerHTML='<option value="">Test connection to load models</option>';$('#lm-status').textContent='Not tested';$('#lm-controls').hidden=!useLM();renderAssistant();
}
$('#assistant-provider').onchange=()=>chooseProvider(provider());
document.querySelectorAll('[data-provider]').forEach(button=>button.onclick=()=>{chooseProvider(button.dataset.provider);view('assistant');});
$('#lm-open').hidden=local;$('#lm-token-wrap').hidden=!local;
$('#lm-test').onclick=async()=>{
 if(!local){$('#lm-status').textContent='Open the local console after starting the companion. This hosted page cannot reach your computer.';return;}
 if(!token)token=$('#lm-companion-token').value.trim()||$('#bridge-token').value.trim();
 if(!token){$('#lm-status').textContent='Paste the companion token from your running host terminal above. Codex sign-in is not required.';return;}
 $('#lm-test').disabled=true;
 try{const data=await api(localAPI()+'/models');$('#lm-model').innerHTML=data.models.map(m=>`<option value="${esc(m.id)}">${esc(m.id)}</option>`).join('');lmReady=data.models.length>0;$('#bridge-token').value='';$('#lm-companion-token').value='';lastInteraction=Date.now();$('#lm-status').textContent=lmReady?`Connected · ${data.models.length} models available`:'Server reached, but no models are available. Download/load a chat model in LM Studio, then refresh.';}catch(e){lmReady=false;$('#lm-status').textContent=e.message;}finally{$('#lm-test').disabled=false;renderAssistant();}
};
$('#lm-stop').onclick=async()=>{try{await api(localAPI()+'/stop',{});}catch(e){toast(e.message);}};
renderAssistant();

if(!local)fetch(new URL('assistant/status',document.baseURI).pathname).then(r=>r.ok?r.json():{}).then(data=>{hostedAI=data;renderAssistant();}).catch(()=>{});

// A download must leave the setup page available, even in browsers that preview ZIP links.
document.querySelectorAll('a[download]').forEach(link=>{link.download='grace-remote-companion.zip';link.addEventListener('click',()=>{const message='Downloading the host package (.zip). Check your browser Downloads. Extract it on your Windows or Linux host; then follow Connection setup.';toast(message);const status=$('#download-status');if(status)status.textContent=message;});});
