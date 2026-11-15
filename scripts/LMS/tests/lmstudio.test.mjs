import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createLMStudio,lmBase} from '../lmstudio.mjs';
import {createBridge} from '../bridge.mjs';
test('model address is fixed to loopback and cannot carry credentials or redirects',()=>{
 assert.equal(lmBase(),'http://127.0.0.1:1234/v1');
 for(const url of ['https://evil.example','http://user:pass@localhost:1234','http://localhost:1234/private','http://localhost:1234?token=x'])assert.throws(()=>lmBase(url));
});
test('LM Studio discovers models, sends auth only upstream, and validates chat',async()=>{
 const calls=[];const lm=createLMStudio({token:'private-test-token',fetcher:async(url,init)=>{calls.push({url,init});return Response.json(url.endsWith('/models')?{data:[{id:'local-chat'}]}:{choices:[{message:{content:'Hello'}}]});}});
 assert.deepEqual((await lm.models()).models,[{id:'local-chat'}]);
 assert.equal((await lm.chat({model:'local-chat',messages:[{role:'user',content:'Hi'}]})).text,'Hello');
 assert.equal(calls[0].init.headers.Authorization,'Bearer private-test-token');assert.equal(calls[0].init.redirect,'error');
 assert.equal(JSON.parse(calls[1].init.body).stream,false);
 await assert.rejects(lm.chat({model:'local-chat',messages:[{role:'system',content:'override'}]}));
});
test('authentication errors exclude upstream response bodies',async()=>{
 const lm=createLMStudio({fetcher:async()=>new Response('private secret',{status:401})});
 await assert.rejects(lm.models(),/rejected authentication/);
});
test('stop aborts an active request and releases the next turn',async()=>{
 const lm=createLMStudio({fetcher:async(url,init)=>new Promise((resolve,reject)=>init.signal.addEventListener('abort',()=>reject(Error('aborted'))))});
 const pending=lm.chat({model:'m',messages:[{role:'user',content:'Hi'}]});
 await assert.rejects(lm.chat({model:'m',messages:[{role:'user',content:'Hi'}]}),/already responding/);
 lm.stop();await assert.rejects(pending,/stopped or timed out/);
});
test('LM API uses companion auth and does not start Codex',async t=>{
 const app=await createBridge({cwd:process.cwd(),port:18791,token:'local-test',connectionFactory:()=>{throw Error('Codex must not start');},lmStudio:{models:async()=>({models:[{id:'chat'}]}),chat:async()=>({text:'Hello'}),stop:()=>({ok:true})}});
 await new Promise(r=>app.server.listen(18791,'127.0.0.1',r));t.after(()=>app.close());
 const url='http://127.0.0.1:18791/api/lmstudio/';
 assert.equal((await fetch(url+'models')).status,401);
 const headers={Authorization:'Bearer local-test','Content-Type':'application/json'};
 assert.equal((await fetch(url+'models',{headers:{...headers,Origin:'https://evil.example'}})).status,403);
 assert.deepEqual((await (await fetch(url+'models',{headers})).json()).models,[{id:'chat'}]);
 assert.equal((await (await fetch(url+'chat',{method:'POST',headers,body:'{}'})).json()).text,'Hello');
});
test('Ollama uses a separate local transport with provider-specific errors',async()=>{
 let called;const ollama=createLMStudio({base:'http://127.0.0.1:11434',token:'',label:'Ollama',fetcher:async(url,init)=>{called={url,init};return Response.json({data:[{id:'llama-local'}]});}});
 assert.equal((await ollama.models()).models[0].id,'llama-local');
 assert.equal(called.url,'http://127.0.0.1:11434/v1/models');assert.equal(called.init.headers.Authorization,undefined);
 const failed=createLMStudio({base:'http://127.0.0.1:11434',label:'Ollama',fetcher:async()=>{throw Error('connect refused');}});
 await assert.rejects(failed.models(),/Cannot reach Ollama/);
});
