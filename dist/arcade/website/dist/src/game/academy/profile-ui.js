import { academy } from './state.js';
import { playerProfile } from './profile.js';
import { RANKS,CYBER_QUESTIONS } from './content.js';
const $=id=>document.getElementById(id),node=(tag,text)=>{const el=document.createElement(tag);el.textContent=text;return el;};

function render(){const profile=playerProfile(),saved=academy.read();$('profile-title').textContent=profile.player;$('player-name').value=profile.player;$('profile-summary').textContent=profile.rank+' · Level '+profile.level+' · '+profile.xp+' shared XP';$('rank-list').replaceChildren(...RANKS.map(rank=>{const el=node('span',rank.name+' · '+rank.xp+' XP');el.className='rank'+(rank.name===profile.rank?' active':'');return el;}));const modes=profile.games;
 const campaignCard=node('article','');campaignCard.className='card campaign-profile-card';
 campaignCard.append(node('h3','Matrix of Conscience'),node('p',profile.xp+' campaign XP'));
 const breakdown=node('small','Defense, lessons & story: '+modes.graceNexus.xp+' XP · Code Matrix: '+(modes.classicMatrix.xp+modes.match3Academy.xp)+' XP · VIM/Bash: '+modes.vimDefense.xp+' XP · PowerShell: '+modes.powershellDefense.xp+' XP');
 campaignCard.append(breakdown);
 const campaignLink=node('a','Continue campaign →');campaignLink.href='/lms/';campaignCard.append(campaignLink);
 $('game-progress').replaceChildren(campaignCard);for(const [id,items]of [['profile-badges',profile.badges],['profile-certs',profile.certifications]])$(id).replaceChildren(...(items.length?items:['Complete learning milestones to earn your first achievement.']).map(text=>{const el=node('span',text);el.className='badge';return el;}));$('profile-storage-note').textContent=academy.persistent?'Academy progress saves in this browser. Matrix mission modes save their own checkpoints.':'Academy saving unavailable. This tab can continue, but progress may be lost on reload.';
 $('cyber-lock').textContent=profile.unlocks.cyberPlanet?(saved.cyber?'✓ Mission restored · 100 shared XP already earned.':'Unlocked · answer all three questions to earn 100 shared XP.'):'Locked · earn 250 Security XP in PowerShell Defense. Current: '+profile.games.powershellDefense.securityXP;
 $('cyber-form').hidden=!profile.unlocks.cyberPlanet;$('cyber-submit').disabled=saved.cyber;
 $('cyber-questions').replaceChildren(...CYBER_QUESTIONS.map((q,index)=>{const field=node('fieldset','');field.append(node('legend',q.prompt));q.options.forEach((text,value)=>{const label=node('label',''),input=document.createElement('input');input.type='radio';input.name='q'+index;input.value=value;input.required=true;input.disabled=saved.cyber;label.append(input,document.createTextNode(text));field.append(label);});return field;}));
}
$('player-form').onsubmit=event=>{event.preventDefault();academy.event({type:'player',name:$('player-name').value});$('profile-save').textContent=academy.persistent?'Player name saved locally.':'Name updated in this tab only; storage is unavailable.';render();};
$('cyber-form').onsubmit=event=>{event.preventDefault();const data=new FormData(event.currentTarget),answers=CYBER_QUESTIONS.map((_,index)=>data.has('q'+index)?Number(data.get('q'+index)):-1);try{const before=academy.read().cyber;academy.cyber(answers);render();$('cyber-feedback').textContent=before?'Mission already complete. No duplicate XP.':'Relay plan restored · +100 shared XP · Cyber Guardian badge.';}catch(error){$('cyber-feedback').textContent=error.message+'\n'+CYBER_QUESTIONS.map(q=>q.explanation).join('\n');}};
$('export-profile').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(playerProfile(),null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='arcade-profile.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
window.addEventListener('storage',render);render();
