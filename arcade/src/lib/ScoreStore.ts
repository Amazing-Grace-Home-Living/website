// ScoreStore – simple persistence using localStorage (fallback to in‑memory if unavailable)

export interface GameStatePersist {
  score: number;
  difficulty: number; // using wave as difficulty level
  achievements: Record<string, boolean>;
}

const STORAGE_KEY = 'arcade_game_state';

export const ScoreStore = {
  load(): GameStatePersist {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw) as GameStatePersist;
      }
    } catch (e) {
      // ignore – e.g., privacy mode
    }
    // defaults
    return { score: 0, difficulty: 1, achievements: {} };
  },
  save(state: GameStatePersist) {
    try {
      const raw = JSON.stringify(state);
      localStorage.setItem(STORAGE_KEY, raw);
    } catch (e) {
      // ignore storage errors
    }
  },
  clear() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
  },
};
