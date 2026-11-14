import '../academy/profile-widget.js';
import { journal,journeySummary } from '../learning/journeys/model.js';
import { CONSCIENCE_STARS } from '../learning/journeys/content.js';
import { BOOT_SEQUENCE,TIMELINE } from './content.js';
const $=id=>document.getElementById(id);
function render(){const summary=journeySummary(journal.read());$('conscience-stars').replaceChildren(...CONSCIENCE_STARS.map(star=>{const item=document.createElement('span');item.className='frequency'+(summary.stars.some(earned=>earned.journey===star.journey)?' earned':'');item.textContent=(summary.stars.some(earned=>earned.journey===star.journey)?'★ ':'☆ ')+star.frequency+' · '+star.character;return item;}));$('unlock-status').textContent=summary.stars.length+'/7 conscience frequencies restored · '+(summary.stars.length===7?'Audio Vault and Sparkfall Uprising unlocked.':'Complete the seven learning journeys to unlock both.');for(const id of ['sparkfall-link','audio-link'])$(id).setAttribute('aria-disabled',String(summary.stars.length!==7));}
$('boot').onclick=()=>{$('boot-log').hidden=false;$('boot-log').textContent=BOOT_SEQUENCE.join('\n');};$('canon-timeline').replaceChildren(...TIMELINE.map(title=>{const item=document.createElement('li');item.textContent=title;return item;}));window.addEventListener('storage',render);window.addEventListener('learning-synced',render);render();
