import { PROVIDER_GUIDES } from './provider-guides.mjs';
const BACKENDS = {
  ollama: { base:'http://127.0.0.1:11434/v1', env:null },
  lmstudio: { base:'http://127.0.0.1:1234/v1', env:'LMSTUDIO_API_KEY', optional:true },
  openai: { base:'https://api.openai.com/v1', env:'OPENAI_API_KEY', responses:true },
  gemini: { base:'https://generativelanguage.googleapis.com/v1beta/openai', env:'GEMINI_API_KEY' },
  anthropic: { base:'https://api.anthropic.com/v1', env:'ANTHROPIC_API_KEY', anthropic:true },
};
const credentialPattern = /(?:sk-(?:proj-|svcacct-|ant-)?[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{15,}|github_pat_[A-Za-z0-9_]{16,}|AIza[A-Za-z0-9_-]{25,}|Bearer\s+[A-Za-z0-9_.-]{20,})/i;
export function validateChat(body, secrets=[]) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !['model','messages'].includes(key))) throw Error('Send only model and messages. Credentials belong in the host vault.');
  if (typeof body.model !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.:/@-]{0,199}$/.test(body.model)) throw Error('Select a valid model from this provider.');
  if (!Array.isArray(body.messages) || !body.messages.length || body.messages.length > 20) throw Error('Send 1–20 messages.');
  let total=0;
  for (const message of body.messages) {
    if (!message || Object.keys(message).some(key=>!['role','content'].includes(key)) || !['user','assistant'].includes(message.role) || typeof message.content !== 'string' || !message.content.trim() || message.content.length>12000) throw Error('Use text-only user and assistant messages, up to 12000 characters each.');
    total += message.content.length;
    if (credentialPattern.test(message.content) || secrets.some(secret=>secret.length>=8 && message.content.includes(secret))) throw Error('Possible credential detected. Use the host setup wizard instead of chat.');
  }
  if (total > 24000 || credentialPattern.test(body.model) || secrets.some(secret=>secret.length>=8 && body.model.includes(secret))) throw Error('Input exceeds limits or includes a possible credential.');
  return {model:body.model,messages:body.messages.map(({role,content})=>({role,content}))};
}
export function createProviderClient({ environment={}, fetchImpl=fetch, timeoutMs=60000 }={}) {
  const active=new Map();
  const secrets=Object.entries(environment).filter(([key,value])=>/(?:_TOKEN|_KEY|_SECRET)$/.test(key) && typeof value==='string' && value.length>=8).map(([,value])=>value);
  const redact=text=>secrets.reduce((safe,secret)=>safe.split(secret).join('[REDACTED]'),text);
  function backend(id) {
    if (!Object.hasOwn(BACKENDS,id)) throw Error('Unsupported inference provider.');
    const backend=BACKENDS[id];
    if (backend.env && !backend.optional && !environment[backend.env]) throw Error('Provider not configured. Run node credential-setup.mjs ' + id + ' on the host, then restart with --integrations ' + id + '.');
    return backend;
  }
  async function request(id,endpoint,body,signal) {
    const b=backend(id), headers={'Content-Type':'application/json'};
    if(b.env && environment[b.env]) headers.Authorization='Bearer '+environment[b.env];
    if(b.anthropic) headers['anthropic-version']='2026-10-21';
    let response;
    try {
      response=await fetchImpl(b.base+endpoint,{method:body?'POST':'GET',headers,redirect:'error',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(timeoutMs)]):AbortSignal.timeout(timeoutMs),...(body?{body:JSON.stringify(body)}:{})});
    } catch { throw Error('Provider unreachable, stopped, or timed out. Check the host connection.'); }
    if (!response.ok) {
      await response.body?.cancel().catch(()=>{});
      if ([401,403].includes(response.status)) throw Error('Provider rejected authentication or model access. Check your account permissions and credential.');
      if(response.status===429) throw Error('Provider quota, rate, or billing limit reached. Check your account dashboard.');
      throw Error('Provider request failed (HTTP '+response.status+'). Check model availability and host configuration.');
    }
    // Bound streaming reads before JSON parsing; never relay raw upstream errors or headers.
    const reader=response.body.getReader(); const chunks=[]; let bytes=0;
    try { while(true) {const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>2*1024*1024){await reader.cancel();throw Error('Provider response too large.');}chunks.push(value);} }
    catch { throw Error('Provider response interrupted or exceeded the size limit.'); }
    finally { reader.releaseLock(); }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw Error('Provider returned an invalid response.'); }
  }
  return {
    inventory() {return PROVIDER_GUIDES.filter(guide=>Object.hasOwn(BACKENDS,guide.id)).map(guide=>({id:guide.id,name:guide.name,local:guide.kind==='local',configured:!BACKENDS[guide.id].env || !!BACKENDS[guide.id].optional || !!environment[BACKENDS[guide.id].env],credentialPresent:!!environment[BACKENDS[guide.id].env]}));},
    async models(id) {
      const data=await request(id,'/models');
      if(!Array.isArray(data.data)) throw Error('Provider returned an invalid model list.');
      return {models:data.data.filter(model=>typeof model.id==='string' && /^[A-Za-z0-9][A-Za-z0-9_.:/@-]{0,199}$/.test(model.id)).slice(0,100).map(model=>({id:redact(model.id)}))};
    },
    async chat(id,body) {
      const b=backend(id), input=validateChat(body,secrets);
      if(active.has(id)) throw Error('This provider is busy. Wait or stop its current request.');
      const controller=new AbortController();active.set(id,controller);
      try {
        const payload=b.responses?{model:input.model,input:input.messages,max_output_tokens:1024,store:false}:b.anthropic?{...input,max_tokens:1024}:{...input,stream:false,max_tokens:1024};
        const data=await request(id,b.responses?'/responses':b.anthropic?'/messages':'/chat/completions',payload,controller.signal);
        const text=b.responses?(data.output||[]).filter(item=>item.type==='message').flatMap(item=>item.content||[]).filter(item=>item.type==='output_text').map(item=>item.text).join('\n'):b.anthropic?(data.content||[]).filter(item=>item.type==='text').map(item=>item.text).join('\n'):data.choices?.[0]?.message?.content;
        if(typeof text!=='string'||!text.trim()) throw Error('Provider returned no text. Choose a chat-capable model.');
        return {text:redact(text),provider:id,model:input.model};
      } finally {active.delete(id);}
    },
    stop(id) {backend(id);const controller=active.get(id);controller?.abort();return {stopped:!!controller};},
    close() {for(const controller of active.values())controller.abort();active.clear();},
  };
}
