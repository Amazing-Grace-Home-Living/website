import {test} from 'node:test';
import http from 'node:http';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {resolve} from 'node:path';
import {createBridge,checkToken,validateText,validateDecision,CodexConnection} from '../bridge.mjs';
const cwd=resolve('.');
test('constant-time token comparison rejects missing/wrong credentials',()=>{assert.equal(checkToken('Bearer abc','abc'),true);assert.equal(checkToken('Bearer xyz','abc'),false);assert.equal(checkToken(null,'abc'),false);});
test('instructions enforce bounds',()=>{assert.equal(validateText('  review repo  '),'review repo');assert.throws(()=>validateText(''));assert.throws(()=>validateText('a'.repeat(12001)));});
test('approval decisions reject unsupported escalation',()=>{assert.deepEqual(validateDecision({method:'item/commandExecution/requestApproval',params:{}},true),{decision:'accept'});assert.throws(()=>validateDecision({method:'item/permissions/requestApproval'},true));assert.deepEqual(validateDecision({method:'item/permissions/requestApproval'},false),{permissions:{},scope:'turn'});assert.throws(()=>validateDecision({method:'item/commandExecution/requestApproval',params:{networkApprovalContext:{host:'x'}}},true));assert.throws(()=>validateDecision({method:'item/tool/requestUserInput'},true));});
test('app-server initialization, streaming, approval and shutdown over JSONL',async()=>{const sent=[];const child=new EventEmitter();child.stdin=new PassThrough();child.stdout=new PassThrough();child.stderr=new PassThrough();child.kill=()=>{};child.stdin.on('data',data=>{for(const line of data.toString().trim().split('\n')){const request=JSON.parse(line);sent.push(request);if(request.id!==undefined)queueMicrotask(()=>child.stdout.write(JSON.stringify({id:request.id,result:{}})+'\n'));}});const c=new CodexConnection({cwd,spawnProcess:()=>child});await c.start();assert.equal(sent[0].method,'initialize');assert.equal(sent[1].method,'initialized');c.receive({method:'item/agentMessage/delta',params:{threadId:'t',delta:'hello'}});c.receive({method:'item/commandExecution/requestApproval',id:99,params:{threadId:'t'}});assert.equal(c.requests.size,1);c.receive({method:'serverRequest/resolved',params:{requestId:99}});assert.equal(c.requests.size,0);c.receive({method:'item/reasoning/textDelta',params:{delta:'private'}});assert.equal(c.events.length,3);c.close();});
test('HTTP bridge enforces auth, origins and workspace; only sends fixed safe thread options',async t=>{
 const calls=[];const fake={closed:false,events:[],requests:new Map(),activeTurns:new Map(),start:async()=>{},close(){},rpc:async(method,params)=>{calls.push({method,params});if(method==='account/read')return {account:{}};if(method==='thread/list')return {data:[{id:'yes',cwd},{id:'no',cwd:'/another-workspace'}]};if(method==='thread/start')return {thread:{id:'new'}};if(method==='turn/start')return {turn:{id:'turn'}};if(method==='thread/read')return {thread:{id:params.threadId,cwd:'/another-workspace'}};return {};}};
 // Known high loopback port; failures are actionable rather than silently public binding.
 const port=18787;const app=await createBridge({cwd,port,token:'test-secret',connectionFactory:()=>fake});await new Promise(r=>app.server.listen(port,'127.0.0.1',r));t.after(()=>app.close());const base=`http://127.0.0.1:${port}`;
 assert.equal((await fetch(base+'/api/threads')).status,401);
 assert.equal((await fetch(base+'/api/threads',{headers:{Authorization:'Bearer test-secret',Origin:'https://evil.example'}})).status,403);
 const invalidHost=await new Promise((resolve,reject)=>{http.get(base,{headers:{Host:'evil.example'}},response=>{response.resume();resolve(response.statusCode);}).on('error',reject);});assert.equal(invalidHost,403);
 const headers={Authorization:'Bearer test-secret','Content-Type':'application/json'};
 const connected=await fetch(base+'/api/connect',{method:'POST',headers,body:'{}'});assert.equal(connected.status,200);
 const list=await (await fetch(base+'/api/threads',{headers})).json();assert.equal(list.threads.length,1);
 const created=await fetch(base+'/api/task',{method:'POST',headers,body:JSON.stringify({text:'Review code',cwd:'/override',approvalPolicy:'never'})});assert.equal(created.status,200);
 const options=calls.find(c=>c.method==='thread/start').params;assert.equal(options.cwd,cwd);assert.equal(options.approvalPolicy,'on-request');assert.equal(options.sandbox,'workspaceWrite');
 const outside=await fetch(base+'/api/resume',{method:'POST',headers,body:JSON.stringify({threadId:'outside'})});assert.equal(outside.status,400);assert.match((await outside.json()).error,/different workspace/);
 const staticFile=await fetch(base);assert.equal(staticFile.status,200);assert.match(await staticFile.text(),/Grace Remote/);
});
