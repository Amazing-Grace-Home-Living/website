import { playerProfile } from './profile.js';
export class ArcadeProfile extends HTMLElement {
 connectedCallback(){
  if(!this.shadowRoot)this.attachShadow({mode:'open'});
  this.shadowRoot.innerHTML='<style>:host{display:block;margin:1rem 0;font:15px system-ui;color:#65ff98}section{display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;border:1px solid #304c70;background:#000;padding:1rem;border-radius:14px}p{margin:0;line-height:1.7}small{color:#acbdd2}a{color:#a9d5ff;min-height:44px;display:inline-flex;align-items:center}strong{color:#8ee5c7}</style><section aria-label="Shared arcade profile"><p><strong id="player"></strong><br><small id="stats"></small></p><a href="/arcade/nexus/">Star Matrix Hub &amp; Seven-Star unlocks →</a><a href="/arcade/academy/">Shared profile →</a></section>';
  this.refresh=()=>{const profile=playerProfile();this.shadowRoot.getElementById('player').textContent=profile.player+' · '+profile.rank;this.shadowRoot.getElementById('stats').textContent=profile.xp+' shared XP · level '+profile.level+' · '+profile.badges.length+' badges · '+profile.stars.length+'/7 stars';};
  window.addEventListener('storage',this.refresh);window.addEventListener('academy-progress',this.refresh);window.addEventListener('learning-synced',this.refresh);this.refresh();
 }
 disconnectedCallback(){window.removeEventListener('storage',this.refresh);window.removeEventListener('academy-progress',this.refresh);window.removeEventListener('learning-synced',this.refresh);}
}
if(!customElements.get('arcade-profile'))customElements.define('arcade-profile',ArcadeProfile);
