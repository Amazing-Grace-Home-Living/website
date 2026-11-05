import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {sessionLifetime,openSessionStore} from '../session-store.mjs';
import {createBridge} from '../bridge.mjs';
test('session lifetime bounds and default',()=>{assert.equal(sessionLifetime(),7200000);assert.equal(sessionLifetime('30'),2592000000);for(const n of [90,120,365])assert.equal(sessionLifetime(n),n*86400000);for(const d of ['0','366','1.5','no'])assert.throws(()=>sessionLifetime(d));});
test('persisted token survives restart without extending expiry, resets and binds workspace',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'grace-session-'));try{const options={path:join(dir,'session.json'),cwd:resolve('.'),port:8787,ttlMs:sessionLifetime(30),platform:'linux',now:1000};
 const first=await openSessionStore(options),again=await openSessionStore({...options,now:2000});assert.equal(first.token,again.token);assert.equal(first.expiresAt,again.expiresAt);
 await assert.rejects(openSessionStore({...options,now:first.expiresAt}),/expired/);
 await assert.rejects(openSessionStore({...options,cwd:tmpdir()}),/different workspace/);
 const reset=await openSessionStore({...options,reset:true,now:2000});assert.notEqual(reset.token,first.token);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('Windows store routes plaintext through protection and persists only protected envelope',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'grace-protected-'));const memory=new Map();let counter=0;
 const protect=async(value,decode)=>{if(decode)return memory.get(value);const id='protected-'+counter++;memory.set(id,value);return id;};
 try{const options={path:join(dir,'session.json'),cwd:resolve('.'),port:8787,ttlMs:sessionLifetime(30),platform:'win32',protect};const first=await openSessionStore(options);assert.ok(!(await readFile(options.path,'utf8')).includes(first.token));assert.equal((await openSessionStore(options)).token,first.token);}finally{await rm(dir,{recursive:true,force:true});}
});
test('rotation persists before activation; restart uses rotated token; failed save retains old token',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'grace-rotation-'));t.after(()=>rm(dir,{recursive:true,force:true}));const port=18794;const options={path:join(dir,'session.json'),cwd:resolve('.'),port,ttlMs:sessionLifetime(30),platform:'linux'};const saved=await openSessionStore(options);let fail=false;
 const app=await createBridge({cwd:options.cwd,port,token:saved.token,initialTokenExpiresAt:saved.expiresAt,tokenTtlMs:options.ttlMs,onTokenRotate:async next=>{if(fail)throw Error('Disk unavailable');await saved.save(next);}});await new Promise(r=>app.server.listen(port,'127.0.0.1',r));t.after(()=>app.close());
 const call=(token,path,body)=>fetch(`http://127.0.0.1:${port}${path}`,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:'{}'}:{})});
 const next=await (await call(saved.token,'/api/token/rotate',true)).json();assert.equal((await call(saved.token,'/api/integrations')).status,401);assert.equal((await openSessionStore(options)).token,next.token);
 fail=true;assert.equal((await call(next.token,'/api/token/rotate',true)).status,400);assert.equal((await call(next.token,'/api/integrations')).status,200);
});
test('annual saved token survives a long trip and restart without silently renewing',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'grace-annual-'));
 try{
  const issuedAt=Date.UTC(2026,9,29);
  const options={path:join(dir,'session.json'),cwd:resolve('.'),port:8787,ttlMs:sessionLifetime(365),platform:'linux',now:issuedAt};
  const first=await openSessionStore(options);
  const restarted=await openSessionStore({...options,now:issuedAt+sessionLifetime(120),ttlMs:sessionLifetime(90)});
  assert.equal(restarted.token,first.token);assert.equal(restarted.expiresAt,issuedAt+sessionLifetime(365));
  await assert.rejects(openSessionStore({...options,now:first.expiresAt}),/expired/);
  const replacement=await openSessionStore({...options,reset:true,now:issuedAt+1000,ttlMs:sessionLifetime(120)});
  assert.notEqual(replacement.token,first.token);assert.equal(replacement.expiresAt,issuedAt+1000+sessionLifetime(120));
 }finally{await rm(dir,{recursive:true,force:true});}
});
