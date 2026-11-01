import { CAMPAIGN_KEY, emptyProgress, normalizeProgress, recordQuiz, completeLevel } from './progression.js';
import { loadGame } from '../progress.js';

export function createCampaignStore(storage) {
  let memory = emptyProgress();
  let persistent = true;
  function read() {
    if (!persistent) return normalizeProgress(memory);
    try {
      const saved = storage.getItem(CAMPAIGN_KEY);
      memory = saved ? normalizeProgress(JSON.parse(saved)) : emptyProgress();
    } catch { persistent = false; }
    return normalizeProgress(memory);
  }
  function write(state) {
    memory = normalizeProgress(state);
    try { storage.setItem(CAMPAIGN_KEY, JSON.stringify(memory)); persistent = true; }
    catch { persistent = false; }
    return memory;
  }
  return {
    read, get persistent() { return persistent; },
    quiz(id, answers) { const outcome = recordQuiz(read(), id, answers); write(outcome.state); return outcome.result; },
    complete(id) { return write(completeLevel(read(), id)); },
    useSovereignShield() {
      const state = read();
      if (state.sovereignShieldUsed) return false;
      write({ ...state, sovereignShieldUsed: true });
      return true;
    },
    restoreLegacyMatch() {
      const match = loadGame(storage);
      if (!match) return;
      const last = match.status === 'complete' || match.status === 'won' ? match.level : match.level - 1;
      let state = read();
      for (let level = 1; level <= last; level++) state = completeLevel(state, `match-${level}`);
      write(state);
    },
  };
}
let storage;
try { storage = globalThis.localStorage; } catch {}
export const campaign = createCampaignStore(storage);
