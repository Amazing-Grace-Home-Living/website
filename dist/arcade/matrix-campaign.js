import { campaign } from '../src/game/learning/campaign-store.js';
import { awardBonus } from '../src/game/learning/bonus-store.js';
window.AmazingGraceCampaign = {
  recordAcademyMission(id) {
    if (!['earth-1', 'earth-4'].includes(id)) return;
    campaign.complete('matrix-academy');
    if (id === 'earth-4') campaign.complete('matrix-earth');
    return campaign.persistent;
  },
  recordMatrixSession(score, movesLeft) {
    if (movesLeft !== 0 || !Number.isFinite(score) || score < 600) return;
    campaign.complete('matrix-session');
    awardBonus('matrix-session', 75);
    return campaign.persistent;
  },
};
// Carry a completed legacy Academy checkpoint into the shared learning campaign.
try {
  const saved = JSON.parse(localStorage.getItem('graceNexusProgress') || 'null');
  const index = saved?.player?.currentCampaignLevel;
  if (saved?.version === 2 && Number.isInteger(index) && index >= 1 && index <= 4) window.AmazingGraceCampaign.recordAcademyMission(index === 4 ? 'earth-4' : 'earth-1');
} catch { /* Storage can be unavailable; the game also keeps in-tab progress. */ }
