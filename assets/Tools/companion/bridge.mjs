import http from 'node:http';
import {complete} from './bridge/providers.mjs';
import {createCline} from './bridge/cline.mjs';
import {loadHostedSecrets} from './bridge/secret-manager.mjs';
import {createTerminal} from './terminal.mjs';
import {createLMStudio} from './lmstudio.mjs';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {readFile,stat} from 'node:fs/promises';
import {resolve,dirname,basename,extname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import os from 'node:os';
import {sessionLifetime,openSessionStore} from './session-store.mjs';
import {assistantTurn} from './assistant.mjs';
import {catalog,enabledEnvironment,entryMetadata,hiddenPrompt} from './vault.mjs';
const ROOT=dirname(fileURLToPath(import.meta.url));
export function checkToken(received,expected){const a=Buffer.from(received||''),b=Buffer.from(`Bearer ${expected}`);return a.length===b.length&&timingSafeEqual(a,b);}
export function validateText(text){if(typeof text!=='string'||!text.trim()||text.length>12000)throw Error('Instruction must contain 1–12000 characters.');return text.trim();}
export function validateDecision(request,accept){
 if(typeof accept!=='boolean')throw Error('A decision is required.');
 if(request.method==='item/permissions/requestApproval'){if(accept)throw Error('Expanded permission grants are not supported by this companion.');return {permissions:{},scope:'turn'};}
 if(!['item/commandExecution/requestApproval','item/fileChange/requestApproval'].includes(request.method))throw Error('This request needs a richer client. Use the official Codex client.');
 if(accept&&request.params?.networkApprovalContext)throw Error('Managed network approvals are not supported by this companion.');
 if(accept&&request.params?.availableDecisions&&!request.params.availableDecisions.includes('accept'))throw Error('The host does not offer one-time approval for this request.');
 return {decision:accept?'accept':'decline'};
}
export class CodexConnection {
 constructor({cwd,command='codex',spawnProcess=spawn,integrationEnv={}}){this.integrationEnv=integrationEnv;this.cwd=cwd;this.command=command;this.spawnProcess=spawnProcess;this.pending=new Map();this.requests=new Map();this.events=[];this.seq=0;this.next=1;this.closed=false;this.activeTurns=new Map();}
 send(value){if(!this.child||this.closed)throw Error('Codex app-server is not running. Reconnect.');this.child.stdin.write(JSON.stringify(value)+'\n');}
 rpc(method,params={}){const id=this.next++;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(Error(`${method} timed out. Check the host before retrying.`));},45000);this.pending.set(id,{resolve,reject,timer});try{this.send({id,method,params});}catch(e){clearTimeout(timer);this.pending.delete(id);reject(e);}});}
 receive(message){
  if(message.id!==undefined&&!message.method){const p=this.pending.get(message.id);if(p){clearTimeout(p.timer);this.pending.delete(message.id);message.error?p.reject(Error(message.error.message||'Codex rejected the request.')):p.resolve(message.result);}return;}
  if(message.id!==undefined&&message.method)this.requests.set(message.id,message);
  if(message.method==='serverRequest/resolved')this.requests.delete(message.params?.requestId);
  if(message.method==='turn/started')this.activeTurns.set(message.params.threadId,message.params.turn.id);
  if(message.method==='turn/completed'){this.activeTurns.delete(message.params.threadId);for(const [id,r]of this.requests){if(r.params?.threadId===message.params.threadId)this.requests.delete(id);}}
  // Do not expose internal reasoning blocks to this client.
  if(message.method?.startsWith('item/reasoning/'))return;
  if(message.params?.item?.type==='reasoning')return;
  this.events.push({seq:++this.seq,message});if(this.events.length>2000)this.events.shift();
 }
 async start(){
  this.child=this.spawnProcess(this.command,['app-server'],{cwd:this.cwd,stdio:['pipe','pipe','pipe'],shell:false,env:{...process.env,...this.integrationEnv}});
  this.child.on('error',e=>this.fail(Error(`Could not launch Codex (${e.code||e.message}). Install Codex and sign in on this host.`)));
  this.child.on('exit',()=>this.fail(Error('Codex process stopped. Restart the companion.')));
  this.child.stderr.on('data',()=>{}); // Avoid exposing unfiltered diagnostics or credentials.
  const lines=createInterface({input:this.child.stdout});lines.on('line',line=>{try{this.receive(JSON.parse(line));}catch{/* Non-protocol output is ignored. */}});
  await this.rpc('initialize',{clientInfo:{name:'grace_remote_personal',title:'Grace Remote Personal Companion',version:'0.1.0'}});
  this.send({method:'initialized',params:{}});return this;
 }
 fail(error){this.closed=true;for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(error);}this.pending.clear();this.requests.clear();}
 close(){this.fail(Error('Companion stopped.'));this.child?.kill();}
}
export async function createBridge({cwd,port=8787,token=randomBytes(32).toString('base64url'),connectionFactory=options=>new CodexConnection(options),command=process.env.CODEX_BIN||'codex',integrationEnv={},integrationMetadata=null,tokenTtlMs=2*60*60*1000,initialTokenExpiresAt,onTokenRotate,lmStudio=createLMStudio(),lmSecret=process.env.LM_STUDIO_API_TOKEN,ollama=createLMStudio({base:process.env.OLLAMA_URL||'http://127.0.0.1:11434/v1',token:'',label:'Ollama'}),terminalEnabled=false,clineEnabled=false,clineBin,clineFactory=createCline,extensionIds=[],terminalFactory=createTerminal,profileFetch=fetch}={}){
 cwd=resolve(cwd||process.cwd());if(!(await stat(cwd)).isDirectory())throw Error('Workspace must be a directory.');
 const terminal=terminalFactory({cwd,enabled:terminalEnabled});
 const cline=clineFactory({cwd,enabled:clineEnabled,executable:clineBin});
 const allowedExtensions=new Set(extensionIds.filter(id=>/^[a-p]{32}$/.test(id)));
 let tokenExpiresAt=initialTokenExpiresAt??Date.now()+tokenTtlMs;
 let rotating=false;
 const providerList=await catalog();
 const inventory=integrationMetadata||entryMetadata({},providerList,{...process.env,...integrationEnv});
 const secretValues=providerList.map(item=>integrationEnv[item.env]||process.env[item.env]).concat(lmSecret).filter(value=>typeof value==='string'&&value.length>=8);
 const redact=text=>secretValues.reduce((safe,secret)=>safe.split(secret).join('[REDACTED]'),text);
 let connection=null,connecting=null;const subscribed=new Set();const assistantThreads=new Set();
 async function connected(){if(connection&&!connection.closed)return connection;if(!connecting)connecting=(async()=>{const candidate=connectionFactory({cwd,command,integrationEnv});await candidate.start();connection=candidate;subscribed.clear();assistantThreads.clear();return candidate;})().finally(()=>connecting=null);return connecting;}
 async function sameWorkspace(c,id){if(typeof id!=='string'||id.length>200)throw Error('Invalid thread ID.');const data=await c.rpc('thread/read',{threadId:id});if(resolve(data.thread.cwd||'')!==cwd)throw Error('That thread belongs to a different workspace.');return data;}
 async function resume(c,id){const previous=await sameWorkspace(c,id);if(!subscribed.has(id)){await c.rpc('thread/resume',{threadId:id,excludeTurns:true,cwd,approvalPolicy:'on-request',sandbox:'workspaceWrite'});subscribed.add(id);}return previous;}
 const server=http.createServer(async(req,res)=>{
  const host=req.headers.host||'';
  // Restrict Host even for static assets to prevent DNS rebinding.
  if(![`127.0.0.1:${port}`,`localhost:${port}`].includes(host)){res.writeHead(403);res.end('Invalid host.');return;}
  const origin=`http://${host}`;
  const extensionId=req.headers['x-grace-extension-id'];
  const extensionOrigin=req.headers.origin?.startsWith('chrome-extension://')?req.headers.origin.slice(19):null;
  if((extensionId&&!allowedExtensions.has(extensionId))||(extensionOrigin&&!allowedExtensions.has(extensionOrigin))){res.writeHead(403);res.end('Extension not enabled on this host.');return;}
  const trustedExtension=extensionOrigin&&allowedExtensions.has(extensionOrigin);
  if(trustedExtension){res.setHeader('Access-Control-Allow-Origin',req.headers.origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type, X-Grace-Extension-Id');res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');}
  if(req.method==='OPTIONS'&&trustedExtension){res.writeHead(204);res.end();return;}
  if(req.headers.origin&&req.headers.origin!==origin&&!trustedExtension){res.writeHead(403);res.end('Origin not allowed.');return;}
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cross-Origin-Opener-Policy','same-origin');
  res.setHeader('Content-Security-Policy',"default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  let path;try{path=new URL(req.url,origin).pathname;}catch{res.writeHead(400);res.end();return;}
  function json(data,status=200){res.writeHead(status,{'Content-Type':'application/json'});res.end(redact(JSON.stringify(data)));}
  if(path.startsWith('/api/')){
   if(Date.now()>=tokenExpiresAt||!checkToken(req.headers.authorization,token)){json({error:'Invalid companion token.'},401);return;}
   if(!['GET','POST'].includes(req.method)){json({error:'Method not allowed.'},405);return;}
   try{
    let body={};if(req.method==='POST'){if(!req.headers['content-type']?.startsWith('application/json')){json({error:'JSON required.'},415);return;}let bytes=0;const chunks=[];for await(const part of req){bytes+=part.length;if(bytes>65536){json({error:'Request too large.'},413);return;}chunks.push(part);}body=JSON.parse(Buffer.concat(chunks).toString()||'{}');}
    if(req.method==='GET'&&path==='/api/profile/health'){
     json({status:'ready',configured:{openai:!!(integrationEnv.OPENAI_API_KEY||process.env.OPENAI_API_KEY),gemini:!!(integrationEnv.GEMINI_API_KEY||process.env.GEMINI_API_KEY),deepseek:!!(integrationEnv.DEEPSEEK_API_KEY||process.env.DEEPSEEK_API_KEY)}});return;
    }
    if(req.method==='POST'&&path==='/api/profile/chat'){
     json(await complete({...body,browserAgent:false},{fetchImpl:profileFetch,env:{...process.env,...integrationEnv}}));return;
    }
    if(req.method==='POST'&&path==='/api/profile/browser-step'){
     json(await complete({...body,browserAgent:true},{fetchImpl:profileFetch,env:{...process.env,...integrationEnv}}));return;
    }
    if(req.method==='GET'&&path==='/api/profile/cline'){json(cline.status());return;}
    if(req.method==='POST'&&path==='/api/profile/cline/run'){json(cline.run(body));return;}
    if(req.method==='POST'&&path==='/api/profile/cline/stop'){json(cline.stop());return;}
    if(req.method==='GET'&&path==='/api/terminal'){json(terminal.status());return;}
    if(req.method==='POST'&&path==='/api/terminal/run'){json(terminal.run(body.command));return;}
    if(req.method==='POST'&&path==='/api/terminal/stop'){json(terminal.stop());return;}
    if(req.method==='GET'&&path==='/api/integrations'){json({integrations:inventory,tokenExpiresAt,vaultEnabled:!!integrationMetadata});return;}
    if(req.method==='POST'&&path==='/api/token/rotate'){if(rotating){json({error:'Token rotation already in progress.'},409);return;}rotating=true;try{const next={token:randomBytes(32).toString('base64url'),expiresAt:Date.now()+tokenTtlMs};if(onTokenRotate)await onTokenRotate(next);token=next.token;tokenExpiresAt=next.expiresAt;json({token,tokenExpiresAt});}finally{rotating=false;}return;}
    if(req.method==='GET'&&path==='/api/ollama/models'){json(await ollama.models());return;}
    if(req.method==='POST'&&path==='/api/ollama/chat'){json(await ollama.chat(body));return;}
    if(req.method==='POST'&&path==='/api/ollama/stop'){json(ollama.stop());return;}
    if(req.method==='GET'&&path==='/api/lmstudio/models'){json(await lmStudio.models());return;}
    if(req.method==='POST'&&path==='/api/lmstudio/chat'){json(await lmStudio.chat(body));return;}
    if(req.method==='POST'&&path==='/api/lmstudio/stop'){json(lmStudio.stop());return;}
    const c=await connected();
    if(req.method==='POST'&&path==='/api/connect'){const a=await c.rpc('account/read',{refreshToken:false});json({host:os.hostname(),project:basename(cwd),cwd,account:!!a.account,tokenExpiresAt});return;}
    if(req.method==='POST'&&path==='/api/assistant'){const result=await assistantTurn(c,{text:body.text,threadId:body.threadId,cwd,project:basename(cwd),metadata:inventory,ownedThreads:assistantThreads});subscribed.add(result.threadId);json(result);return;}
    if(req.method==='GET'&&path==='/api/threads'){const result=await c.rpc('thread/list',{limit:50,cwd});json({threads:(result.data||[]).filter(t=>t.cwd&&resolve(t.cwd)===cwd)});return;}
    if(req.method==='GET'&&path==='/api/events'){const after=Number(new URL(req.url,origin).searchParams.get('after')||0);json({events:c.events.filter(e=>e.seq>after),approvals:[...c.requests.values()],reset:!!(after&&c.events[0]?.seq>after+1)});return;}
    if(req.method==='POST'&&path==='/api/task'){
     const text=validateText(body.text);const data=await c.rpc('thread/start',{cwd,approvalPolicy:'on-request',sandbox:'workspaceWrite'});const id=data.thread.id;subscribed.add(id);
     const turn=await c.rpc('turn/start',{threadId:id,input:[{type:'text',text}]});json({threadId:id,turnId:turn.turn.id,project:basename(cwd)});return;
    }
    if(req.method==='POST'&&path==='/api/resume'){
     const data=await resume(c,body.threadId);let items=[];
     // Use paginated items rather than assuming thread/read includes legacy turns.
     try{const page=await c.rpc('thread/items/list',{threadId:body.threadId,limit:100,sortDirection:'asc'});items=page.data||page.items||[];}catch{/* Some installed Codex versions do not expose paginated history. */}
     if(!items.length)items=(data.thread.turns||[]).flatMap(t=>t.items||[]);
     const output=items.filter(i=>['agentMessage','commandExecution','userMessage'].includes(i.type)).map(i=>i.type==='agentMessage'?i.text:i.type==='commandExecution'?`$ ${i.command}\n${i.aggregatedOutput||''}`:(i.content||[]).filter(x=>x.type==='text').map(x=>x.text).join('\n')).join('\n\n');
     const diff=items.filter(i=>i.type==='fileChange').flatMap(i=>(i.changes||[]).map(ch=>ch.diff||'')).join('\n');
     json({thread:data.thread,output,diff,turnId:c.activeTurns.get(body.threadId)||null});return;
    }
    if(req.method==='POST'&&path==='/api/followup'){const text=validateText(body.text);await resume(c,body.threadId);if(c.activeTurns.has(body.threadId)){json({error:'A turn is active. Wait for completion or interrupt it before sending a follow-up.'},409);return;}const result=await c.rpc('turn/start',{threadId:body.threadId,input:[{type:'text',text}]});json({turnId:result.turn.id});return;}
    if(req.method==='POST'&&path==='/api/interrupt'){await sameWorkspace(c,body.threadId);if(c.activeTurns.get(body.threadId)!==body.turnId){json({error:'That turn is no longer active.'},409);return;}await c.rpc('turn/interrupt',{threadId:body.threadId,turnId:body.turnId});json({ok:true});return;}
    if(req.method==='POST'&&path==='/api/approval'){const request=c.requests.get(body.id);if(!request){json({error:'Approval expired or already answered.'},409);return;}if(!subscribed.has(request.params?.threadId)){json({error:'Request is not in an attached workspace session.'},403);return;}const result=validateDecision(request,body.accept);c.send({id:request.id,result});c.requests.delete(request.id);json({ok:true});return;}
    json({error:'Unknown endpoint.'},404);
   }catch(e){json({error:e.message},400);}return;
  }
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
  if(['/companion.zip','/sidebar-extension.zip'].includes(path)){res.writeHead(302,{Location:'https://nicholai.online/nexus'});res.end();return;}
  if(['/toolbox','/toolbox/'].includes(path)){res.writeHead(302,{Location:'/'});res.end();return;}
  const files={'/':'index.html','/index.html':'index.html','/style.css':'style.css','/app.js':'app.js','/nexus-infinity.jpg':'nexus-mark.svg'};
  const filename=files[path];if(!filename){res.writeHead(404);res.end('Not found');return;}
  try{const bytes=await readFile(resolve(ROOT,'public',filename));const type={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'}[extname(filename)];res.writeHead(200,{'Content-Type':type});res.end(req.method==='HEAD'?undefined:bytes);}catch{res.writeHead(404);res.end('Not found');}
 });
 server.requestTimeout=200000;server.headersTimeout=15000;
 return {server,get token(){return token;},get tokenExpiresAt(){return tokenExpiresAt;},cwd,close:()=>{cline.close();terminal.close();ollama.stop();lmStudio.stop();connection?.close();server.close();}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const arg=(name,fallback)=>{const index=process.argv.indexOf(name);return index<0?fallback:process.argv[index+1];};
 const port=Number(arg('--port','8787'));if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Choose a port from 1024 to 65535.');
 const cwd=resolve(arg('--cwd',process.cwd()));
 const tokenTtlMs=sessionLifetime(arg('--session-days',undefined));
 const remember=process.argv.includes('--remember-token');
 const reset=process.argv.includes('--reset-token');
 if(reset&&!remember)throw Error('--reset-token requires --remember-token.');
 if(!(await stat(cwd)).isDirectory())throw Error('Workspace must be a directory.');
 const saved=remember?await openSessionStore({cwd,port,ttlMs:tokenTtlMs,reset}):null;
 const selected=arg('--integrations','').split(',').filter(Boolean);
 let integrationEnv={},integrationMetadata=null;
 if(selected.length){let passphrase=await hiddenPrompt('Unlock host vault (hidden): ');const unlocked=await enabledEnvironment(selected,passphrase);passphrase='';integrationEnv=unlocked.env;integrationMetadata=unlocked.metadata;}
 const secretMappings=arg('--secret-manager','').split(',').filter(Boolean);
 if(secretMappings.length){
  const hosted=await loadHostedSecrets({project:arg('--secret-manager-project',undefined),mappings:secretMappings,existingEnv:{...process.env,...integrationEnv}});
  integrationEnv={...integrationEnv,...hosted};
  if(integrationMetadata)integrationMetadata=integrationMetadata.map(item=>({...item,configured:!!(integrationEnv[item.env]||process.env[item.env])}));
 }
 let lmToken=process.env.LM_STUDIO_API_TOKEN;
 if(process.argv.includes('--lmstudio-token'))lmToken=await hiddenPrompt('LM Studio API token (hidden): ');
 const lmStudio=createLMStudio({token:lmToken});
 const extensionIds=arg('--extension-id','').split(',').filter(Boolean);
 if(extensionIds.some(id=>!(/^[a-p]{32}$/.test(id))))throw Error('Extension ID must be the 32-letter ID shown on your browser extensions page.');
 const app=await createBridge({cwd,port,terminalEnabled:process.argv.includes('--terminal'),clineEnabled:process.argv.includes('--enable-cline'),clineBin:arg('--cline-bin',undefined),extensionIds,lmStudio,lmSecret:lmToken,integrationEnv,integrationMetadata,tokenTtlMs,...(saved?{token:saved.token,initialTokenExpiresAt:saved.expiresAt,onTokenRotate:saved.save}:{})});
 app.server.on('error',e=>{console.error(`Companion could not listen: ${e.code||e.message}`);app.close();process.exitCode=1;});
 app.server.listen(port,'127.0.0.1',()=>{console.log(`Nexus Toolbox personal companion\nWorkspace: ${app.cwd}\nOpen: http://127.0.0.1:${port}\nCompanion token (paste only into your local UI): ${app.token}\nKeep this terminal running. Credentials and execution stay on this host. Connection token expires: ${new Date(app.tokenExpiresAt).toLocaleString()}.\n${remember?'Token survives restarts under this OS account. Save it in your password manager. Use --reset-token to revoke it after stopping this process.':'Token is temporary and changes after restart. Use --session-days 90, 120 or 365 with --remember-token for travel.'}`);});
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{app.close();process.exit();});
}
