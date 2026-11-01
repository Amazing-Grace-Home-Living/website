import { campaign } from '../../src/game/learning/campaign-store.js';
const locations = ['Ephesus', 'Smyrna', 'Pergamum', 'Thyatira', 'Sardis', 'Philadelphia', 'Laodicea'];
window.AmazingGraceStars = {
  recordCompleted(completed) {
    if (Array.isArray(completed) && locations.every(name => completed.includes(name))) {
      campaign.complete('seven-stars'); return campaign.persistent;
    }
  },
};
try { window.AmazingGraceStars.recordCompleted(JSON.parse(localStorage.getItem('aghl_sevenStarsCompleted') || '[]')); } catch {}
