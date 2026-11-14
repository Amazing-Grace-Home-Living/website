import { campaign } from '../../src/game/learning/campaign-store.js';
// This quiz is an optional milestone, not a substitute for strategy lessons.
window.AmazingGraceBibleCampaign = {
  complete(correct, total) {
    if (total === 10 && Number.isInteger(correct) && correct >= 8 && correct <= total) campaign.complete('bible-quiz');
  },
};
const link = document.createElement('a');
link.href = '/lms/'; link.textContent = 'View your Learn & Play campaign →';
link.style.cssText = 'display:block;margin:1rem;text-align:center;color:#34d399';
document.getElementById('screen-complete').append(link);
