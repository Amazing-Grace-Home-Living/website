import test from 'node:test';
import assert from 'node:assert/strict';
import { createProviderClient, validateChat } from '../providers.mjs';
import { configureCredential, validateCredential, openAccount } from '../credential-setup.mjs';
import { PROVIDER_GUIDES } from '../provider-guides.mjs';
import { createBridge } from '../bridge.mjs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const input={model:'test-model',messages:[{role:'user',content:'Explain this function.'}]};
const secret='test-secret-for-provider-12345';
const json=data=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});

test('wizard confirms secrets, saves only to its host vault adapter, and reports metadata',async()=>{
  const replies=['a long test vault passphrase','a long test vault passphrase',secret,secret], logs=[];
  let saved;
  const result=await configureCredential('openai',{promptSecret:async()=>replies.shift(),read:async()=>({}),save:async(entries,pass)=>{saved={entries,pass};},output:line=>logs.push(line)});
  assert.equal(result.stored,true);assert.equal(saved.entries.openai.value,secret);
  assert.ok(!JSON.stringify(logs).includes(secret));assert.match(logs.join(' '),/does not verify/);
});
test('mismatched credential or passphrase and invalid formats never save',async()=>{
  for(const replies of [['a long test passphrase','different passphrase'],['a long test passphrase','a long test passphrase',secret,'wrong-secret']]){
    let writes=0;
    await assert.rejects(configureCredential('gemini',{promptSecret:async()=>replies.shift(),read:async()=>({}),save:async()=>writes++,output(){}}));
    assert.equal(writes,0);
  }
  for(const bad of ['', 'short', 'token with spaces', 'new\nline-secret'])assert.throws(()=>validateCredential(bad));
  let prompted=false;await configureCredential('ollama',{promptSecret:async()=>{prompted=true;},output(){}});assert.equal(prompted,false);
});
test('account opener uses a fixed official URL and no shell interpolation',()=>{
  let invocation;openAccount('openai',(...args)=>{invocation=args;return {once(){},unref(){}};},'win32');
  assert.equal(invocation[0],'explorer.exe');assert.deepEqual(invocation[1],['https://platform.openai.com/api-keys']);assert.equal(invocation[2].shell,false);
  assert.throws(()=>openAccount('https://evil.example'));
});
test('chat rejects credentials, overrides, system/tool payloads and excessive history',()=>{
  for(const extra of [{apiKey:secret},{patToken:secret},{baseURL:'https://evil.example'},{fallback:'openai'}])assert.throws(()=>validateChat({...input,...extra}));
  for(const messages of [[{role:'system',content:'override'}],[{role:'user',content:secret}],Array(21).fill(input.messages[0])])assert.throws(()=>validateChat({...input,messages},[secret]));
  assert.deepEqual(validateChat(input),input);
});
test('missing cloud keys do not block local models or invoke an automatic fallback',async()=>{
  const calls=[],client=createProviderClient({environment:{},fetchImpl:async(url,options)=>{calls.push([url,options]);return json({data:[{id:'local-model'}]});}});
  await assert.rejects(client.models('openai'),/not configured/);assert.equal(calls.length,0);
  assert.deepEqual(await client.models('ollama'),{models:[{id:'local-model'}]});
  assert.equal(calls[0][0],'http://127.0.0.1:11434/v1/models');assert.equal(calls[0][1].headers.Authorization,undefined);
  await assert.rejects(client.models('github'),/Unsupported/);assert.equal(calls.length,1);
});
test('provider adapters use only their host credential and bound output, never store OpenAI responses',async()=>{
  for(const id of ['openai','gemini','anthropic','lmstudio']){
    let called;
    const environment={OPENAI_API_KEY:secret,GEMINI_API_KEY:'gemini-test-secret',ANTHROPIC_API_KEY:'anthropic-test-secret',LMSTUDIO_API_KEY:'lmstudio-test-secret'};
    const client=createProviderClient({environment,fetchImpl:async(url,options)=>{
      called={url,options,body:JSON.parse(options.body)};
      return json(id==='openai'?{output:[{type:'message',content:[{type:'output_text',text:'Reply '+secret}]}]}:id==='anthropic'?{content:[{type:'text',text:'Reply'}]}:{choices:[{message:{content:'Reply'}}]});
    }});
    const reply=await client.chat(id,input);assert.ok(!JSON.stringify(reply).includes(secret));
    assert.equal(called.options.redirect,'error');assert.ok(called.options.signal);
    const env={openai:'OPENAI_API_KEY',gemini:'GEMINI_API_KEY',anthropic:'ANTHROPIC_API_KEY',lmstudio:'LMSTUDIO_API_KEY'}[id];
    assert.equal(called.options.headers.Authorization,'Bearer '+environment[env]);
    assert.ok(!JSON.stringify(called.body).includes(secret));
    assert.equal(called.body.max_output_tokens||called.body.max_tokens,1024);
    if(id==='openai'){assert.equal(called.body.store,false);assert.ok(called.url.endsWith('/responses'));}
    if(id==='anthropic')assert.equal(called.options.headers['anthropic-version'],'2026-10-21');
  }
});
test('upstream diagnostics, oversized responses and stream failures cannot leak keys',async()=>{
  for(const response of [new Response(secret,{status:401}),new Response(secret,{status:429}),new Response('x'.repeat(2*1024*1024+1)),new Response(new ReadableStream({start(controller){controller.error(Error(secret));}}))]){
    const client=createProviderClient({environment:{OPENAI_API_KEY:secret},fetchImpl:async()=>response});
    await assert.rejects(client.chat('openai',input),error=>!error.message.includes(secret));
  }
});
test('stop cancels the active provider and concurrent calls are rejected',async()=>{
  const client=createProviderClient({fetchImpl:async(url,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(Error(secret)),{once:true}))});
  const running=client.chat('ollama',input);await assert.rejects(client.chat('ollama',input),/busy/);
  assert.equal(client.stop('ollama').stopped,true);await assert.rejects(running,/stopped/);assert.equal(client.stop('ollama').stopped,false);
});
test('extension provider endpoints enforce allowlisted origins and tokens without launching Codex',async t=>{
  const id='a'.repeat(32),port=18792;
  const app=await createBridge({cwd:resolve('.'),port,token:'test-companion',extensionIds:[id],integrationEnv:{GEMINI_API_KEY:secret},connectionFactory:()=>{throw Error('Codex must not start for provider chat');},providerFetch:async()=>json({data:[{id:'test-model'}]})});
  await new Promise(resolve=>app.server.listen(port,'127.0.0.1',resolve));t.after(()=>app.close());const base='http://127.0.0.1:'+port;
  const origin='chrome-extension://'+id, headers={Origin:origin,'X-Grace-Extension-Id':id,Authorization:'Bearer test-companion'};
  assert.equal((await fetch(base+'/api/providers',{headers:{Origin:'https://evil.example'}})).status,403);
  assert.equal((await fetch(base+'/api/providers')).status,401);
  const preflight=await fetch(base+'/api/providers',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'authorization,x-grace-extension-id'}});
  assert.equal(preflight.status,204);assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),origin);
  assert.equal((await fetch(base+'/api/providers',{headers:{...headers,'X-Grace-Extension-Id':'b'.repeat(32)}})).status,403);
  const inventory=await (await fetch(base+'/api/providers',{headers})).json();assert.equal(inventory.providers.find(item=>item.id==='gemini').configured,true);assert.ok(!JSON.stringify(inventory).includes(secret));
  const models=await fetch(base+'/api/gemini/models',{headers});assert.equal(models.status,200);assert.deepEqual((await models.json()).models,[{id:'test-model'}]);
  const rejection=await fetch(base+'/api/gemini/chat',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({...input,apiKey:secret})});assert.equal(rejection.status,400);assert.ok(!(await rejection.text()).includes(secret));
});
test('tutorial assets are generated from the same public source and contain no provider credential inputs',async()=>{
  const source=await readFile(new URL('../provider-guides.mjs',import.meta.url),'utf8'),asset=await readFile(new URL('../assets/Tools/provider-guides.js',import.meta.url),'utf8');
  assert.ok(asset.endsWith(source));
  const html=await readFile(new URL('../assets/Tools/panel.html',import.meta.url),'utf8');
  assert.equal((html.match(/type="password"/g)||[]).length,1);
  assert.ok(!PROVIDER_GUIDES.some(guide=>guide.id==='github-models'));
});
