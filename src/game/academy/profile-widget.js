import { playerProfile } from './profile.js';
export class ArcadeProfile extends HTMLElement {
 connectedCallback(){
  if(!this.shadowRoot)this.attachShadow({mode:'open'});
  this.shadowRoot.innerHTML='<style>:host{display:block;margin:1rem 0;font:15px system-ui;color:#e6efff}section{display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;border:1px solid #304c70;background:#0b1728;padding:1rem;border-radius:14px}p{margin:0;line-height:1.7}small{color:#acbdd2}a{color:#a9d5ff;min-height:44px;display:inline-flex;align-items:center}strong{color:#8ee5c7}</style><section aria-label="Shared arcade profile"><p><strong id="player"></strong><br><small id="stats"></small></p><a href="/arcade/academy/">Profile, badges &amp; Cyber Planet →</a></section>';
  this.refresh=()=>{const profile=playerProfile();this.shadowRoot.getElementById('player').textContent=profile.player+' · '+profile.rank;this.shadowRoot.getElementById('stats').textContent=profile.xp+' shared XP · level '+profile.level+' · '+profile.badges.length+' badges';};
  window.addEventListener('storage',this.refresh);window.addEventListener('academy-progress',this.refresh);this.refresh();
 }
 disconnectedCallback(){window.removeEventListener('storage',this.refresh);window.removeEventListener('academy-progress',this.refresh);}
}
if(!customElements.get('arcade-profile'))customElements.define('arcade-profile',ArcadeProfile);
if(location.pathname === '/arcade/' || location.pathname === '/arcade/index.html') {
 const nav=document.querySelector('header nav');
 if(nav && ![...nav.querySelectorAll('a')].some(a=>a.getAttribute('href')==='/arcade/tools/')) { const link=document.createElement('a'); link.href='/arcade/tools/'; link.textContent='Tools & AI'; nav.append(link); }
 const cards=[...document.querySelectorAll('main .cards article')];
 for(const card of cards){
  const title=card.querySelector('h2')?.textContent?.trim();
  if(title==='Match Maker') card.remove();
  if(title==='Matrix'){
   const heading=card.querySelector('h2'); const description=card.querySelector('p:not(.eyebrow)');
   if(heading) heading.textContent='Matrix of Conscience · Academy';
   if(description) description.textContent='Combined practice: solve Match Maker patterns, complete Academy objectives, and carry the milestone into the Matrix defense campaign.';
  }
 }
}
