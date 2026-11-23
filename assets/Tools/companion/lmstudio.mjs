import {validateAssistantMessage} from './assistant.mjs';
export function lmBase(value='http://127.0.0.1:1234/v1') {
 const u=new URL(value);
 if(u.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(u.hostname)||u.username||u.password||u.search||u.hash)throw Error('LM Studio must use an HTTP loopback URL on this host.');
 if(!['/','/v1','/v1/'].includes(u.pathname))throw Error('Use the LM Studio server URL, optionally ending in /v1.');
 return u.origin+'/v1';
}
export function createLMStudio({base=process.env.LM_STUDIO_URL,token=process.env.LM_STUDIO_API_TOKEN,fetcher=fetch,label="LM Studio"}={}){
 base=lmBase(base);let active=null;
 async function request(path,body,signal){
  const res=await fetcher(base+path,{method:body?'POST':'GET',headers:{...(token?{Authorization:`Bearer ${token}`} :{}),...(body?{'Content-Type':'application/json'}:{})},redirect:'error',signal:signal??AbortSignal.timeout(15000),...(body?{body:JSON.stringify(body)}:{})});
  if(!res.ok)throw Error(res.status===401||res.status===403?`${label} rejected authentication. Check its host credential configuration.`:`${label} returned HTTP ${res.status}. Check its server and model.`);
  return res.json();
 }
 return {
  async models(){try{const data=await request('/models');return {models:(data.data||[]).filter(m=>typeof m.id==='string').map(m=>({id:m.id})),base};}catch(e){if(e.message.startsWith(label))throw e;throw Error(`Cannot reach ${label}. Start its local server on this computer and check the host URL configuration.`);}},
  async chat({messages,model}){
   if(active)throw Error(`${label} is already responding. Wait or press Stop.`);
   if(typeof model!=='string'||!model.trim()||model.length>300)throw Error('Select a model first.');
   if(!Array.isArray(messages)||!messages.length||messages.length>20)throw Error('Send 1–20 messages.');
   let total=0;messages=messages.map(m=>{if(!['user','assistant'].includes(m.role))throw Error('Invalid message role.');const content=validateAssistantMessage(m.content);total+=content.length;return {role:m.role,content};});
   if(total>24000)throw Error('Conversation too long. Clear the conversation to continue.');
   const controller=new AbortController();active=controller;const timeout=setTimeout(()=>controller.abort(),180000);
   try{const data=await request('/chat/completions',{model,messages:[{role:'system',content:'You are Grace, a helpful local assistant. You have no tools, terminal, file or account access. Explain instructions accurately; never claim you executed commands or connected services. Never request passwords or tokens in chat.'},...messages],stream:false,max_tokens:2048},controller.signal);const text=data.choices?.[0]?.message?.content;if(typeof text!=='string'||!text.trim())throw Error(`${label} returned no text. Check the selected model.`);return {text,model};}
   catch(e){if(controller.signal.aborted)throw Error('Response stopped or timed out. You can send another message.');if(e.message.startsWith(label))throw e;throw Error(`${label} request failed. Check the server and model, then retry.`);}
   finally{clearTimeout(timeout);active=null;}
  },stop(){active?.abort();return {ok:true};}
 };
}
