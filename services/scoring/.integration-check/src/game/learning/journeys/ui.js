import '../../academy/profile-widget.js';
import { journal } from './model.js';
import { mountJourney } from './view.js';
import { createLearningClient,mountLearningSync } from './sync.js';
const $=id=>document.getElementById(id),client=createLearningClient();
const view=mountJourney($('journey-root'),{read:()=>journal.read(),submit:(id,answers)=>client.quiz(id,answers),selected:new URLSearchParams(location.search).get('lesson')||undefined,practice:path=>location.assign(path),coach:(lesson,question)=>client.coach(lesson,question,$('coach-provider').value,$('coach-model').value),onChange:id=>{const url=new URL(location.href);url.searchParams.set('lesson',id);history.replaceState(null,'',url);saveNote();}});
function saveNote(){$('journey-save').textContent=journal.persistent?'Journey progress saves in this browser. Host sync is optional.':'Browser saving is unavailable. This tab can keep learning; connect the companion to retain progress on your host.';}
mountLearningSync($('learning-sync'),client,()=>{view.refresh();saveNote();});window.addEventListener('storage',()=>{view.refresh();saveNote();});window.addEventListener('learning-synced',()=>view.refresh());saveNote();

$('coach-refresh').onclick=async()=>{try{const result=await client.models($('coach-provider').value);$('coach-models').replaceChildren(...result.models.map(model=>{const option=document.createElement('option');option.value=model.id;return option;}));$('coach-model').value=result.models[0]?.id||'';$('coach-status').textContent=result.models.length+' models found. Choose a chat-capable model.';}catch(error){$('coach-status').textContent=error.message;}};
