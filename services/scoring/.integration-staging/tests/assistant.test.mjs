import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateAssistantMessage,assistantTurn} from '../assistant.mjs';
import {coachRequest} from '../learning-coach.mjs';
import {newJourney} from '../src/game/learning/journeys/model.js';
test('assistant and learning coach reject credential-like input',()=>{
 for(const text of ['my token is ghp_'+'a'.repeat(30),'Bearer '+'a'.repeat(40),'sk-proj-'+'a'.repeat(30)]){
  assert.throws(()=>validateAssistantMessage(text));assert.throws(()=>coachRequest({lesson:'signal-watch',provider:'ollama',model:'local',question:text},newJourney()));
 }
});
test('local assistant keeps host policy and only reuses owned sessions',async()=>{
 const calls=[],ownedThreads=new Set(),connection={activeTurns:new Map(),rpc:async(method,params)=>{calls.push({method,params});return method==='thread/start'?{thread:{id:'owned'}}:{turn:{id:'turn'}};}};
 const args={text:'Help connect GitHub',cwd:'/repo',project:'repo',metadata:[{id:'github',configured:true}],ownedThreads};
 const result=await assistantTurn(connection,args);assert.equal(result.threadId,'owned');assert.equal(calls[0].params.approvalPolicy,'on-request');assert.equal(calls[0].params.sandbox,'workspaceWrite');await assert.rejects(assistantTurn(connection,{...args,threadId:'unowned'}));
 connection.activeTurns.set('owned','active');await assert.rejects(assistantTurn(connection,{...args,threadId:'owned'}),/still working/);
});
test('learning coach uses public lesson context and a bounded question, with no execution or quiz-award tools',()=>{
 const request=coachRequest({lesson:'signal-watch',provider:'ollama',model:'local',question:'How can I distinguish evidence from a guess?'},newJourney());
 assert.equal(request.messages.length,1);assert.match(request.messages[0].content,/no execution tools/);assert.match(request.messages[0].content,/Signal Watch/);assert.ok(!request.messages[0].content.includes('"answer":'));assert.equal(request.tools,undefined);
 for(const change of [{lesson:'unknown'},{provider:'codex'},{apiKey:'not-accepted'},{question:'a'.repeat(3001)}])assert.throws(()=>coachRequest({lesson:'signal-watch',provider:'ollama',model:'local',question:'Explain evidence',...change},newJourney()));
});
