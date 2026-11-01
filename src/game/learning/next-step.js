import { LESSONS, LEVELS, PASS_COUNT } from './curriculum.js';
import { normalizeProgress, lessonUnlocked, levelUnlocked } from './progression.js';

export function nextLearningStep(raw) {
  const state = normalizeProgress(raw);
  const lesson = LESSONS.find(item => lessonUnlocked(state, item.id) && !(state.quizzes[item.id]?.best >= PASS_COUNT));
  if (lesson) return { kind: 'lesson', id: lesson.id, title: lesson.title, reason: 'Read the lesson and pass at least 3 of its 4 questions. Hints and retries are welcome.', action: 'Continue learning →' };
  const mission = LEVELS.find(item => item.stage && !state.completedLevels.includes(item.id) && levelUnlocked(state, item.id));
  if (mission) return { kind: 'mission', id: mission.id, title: mission.title, reason: `Your prerequisites are complete. Defend the core through ${mission.waves} waves.`, action: 'Begin mission →', href: `/src/game/tower-defense/index.html?stage=${mission.stage}` };
  if (!state.completedLevels.includes('tower-nexus')) return { kind: 'practice', title: 'Complete a practice milestone', reason: 'Choose Match Maker, Matrix Academy, or the Echo Gardens RPG region. Your passed lesson stays earned.', action: 'Choose your practice →', href: '#practice' };
  const optional = [
    ['rpg-archive', 'Explore the Signalkeepers RPG', 'Practice recall, planning, arithmetic, and reflection across three regions.', '/arcade/matrix-of-conscience/'],
    ['vim-defense', 'Try VIM / Bash Defense', 'Practice home-row controls and review Bash questions between waves.', '/arcade/vim-defense/'],
    ['matrix-earth', 'Restore the Earth campaign', 'Complete four Matrix Academy missions and their knowledge checkpoints.', '/arcade/matrix_of_consciousness_match_3_game.html'],
    ['seven-stars', 'Explore Seven Stars', 'Read, reflect, and collect the seven location milestones.', '/arcade/seven-stars/'],
  ].find(([id]) => !state.completedLevels.includes(id));
  if (optional) return { kind: 'optional', id: optional[0], title: optional[1], reason: optional[2], href: optional[3], action: 'Explore another challenge →' };
  return { kind: 'replay', title: 'Revisit a favorite challenge', reason: 'Your completed milestones stay earned. Replay for practice or explore other arcade games.', action: 'Open the arcade →', href: '/arcade/' };
}
