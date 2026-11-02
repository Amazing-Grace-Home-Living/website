import { CAMPAIGN_KEY, normalizeProgress, emptyProgress, completeLevel, progressSummary } from './progression.js';
import { LESSONS } from './curriculum.js';
import { SAVE_KEY as MATCH_KEY, validSave } from '../progress.js';
import { RPG_KEY, normalizeAdventure, chapterComplete } from '../matrix-rpg/engine.js';
import { CHAPTERS } from '../matrix-rpg/content.js';
import { SAVE_KEY as DEFENSE_KEY, normalizeDefenseRecord } from '../vim-defense/engine.js';
import { normalizeReview } from '../vim-defense/quiz-bank.js';
import { ACADEMY_KEY, normalizeAcademy } from '../academy/state.js';

export const PASSPORT_FORMAT = 'amazing-grace-learning-passport';
export const MAX_PASSPORT_SIZE = 1024 * 1024;
const MATRIX_KEY = 'graceNexusProgress', STARS_KEY = 'aghl_sevenStarsCompleted';
const BONUS_KEY = 'amazing-grace-signal-bonus-v1';
const EARTH = ['earth-1', 'earth-2', 'earth-3', 'earth-4'];
const EARTH_BADGES = ['First Spark', 'Wisdom Seeker', 'Giant Slayer', 'Earth Guardian'];
const QUESTION_IDS = EARTH.flatMap((id, i) => Array.from({ length: i + 1 }, (_, q) => `${id}:${q}`));
const CHURCHES = ['Ephesus', 'Smyrna', 'Pergamum', 'Thyatira', 'Sardis', 'Philadelphia', 'Laodicea'];
const union = (a = [], b = []) => [...new Set([...a, ...b])];
const numeric = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
const object = value => !!value && typeof value === 'object' && !Array.isArray(value);
function requireVersion(raw, version, label) { if (!object(raw) || raw.version !== version) throw Error(`Unsupported ${label} save format.`); }

function matchRecord(raw) {
  if (!validSave(raw)) throw Error('Invalid Match Maker checkpoint.');
  return { version: 1, level: raw.level, total: raw.total, badges: [...new Set(raw.badges)], score: raw.score, moves: raw.moves, status: raw.status,
    grid: raw.grid.map(row => row.map(g => ({ type: g.type, kind: g.type, special: g.special, createdBy: g.createdBy === 'shape' ? 'shape' : null }))) };
}
function defenseRecord(raw) {
  const record = normalizeDefenseRecord(raw);
  if (!record || (raw.checkpoint != null && !record.checkpoint)) throw Error('Invalid VIM / Bash Defense checkpoint.');
  return record;
}
function matrixRecord(raw) {
  requireVersion(raw, 2, 'Matrix Academy');
  if (!object(raw.player)) throw Error('Invalid Matrix Academy profile.');
  const p = raw.player;
  if (!Number.isInteger(p.currentCampaignLevel) || p.currentCampaignLevel < 0 || p.currentCampaignLevel > 4) throw Error('Invalid Matrix Academy mission.');
  const player = { currentCampaignLevel: p.currentCampaignLevel };
  for (const key of ['xp', 'score', 'gamesPlayed', 'matchesMade', 'quizzesCompleted', 'correctAnswers']) player[key] = numeric(p[key]);
  player.completedMissionIds = EARTH.slice(0, p.currentCampaignLevel);
  player.answeredQuestionIds = QUESTION_IDS.filter(id => Array.isArray(p.answeredQuestionIds) && p.answeredQuestionIds.includes(id));
  player.xp = Math.max(player.xp, [50, 100, 150, 250].slice(0, player.currentCampaignLevel).reduce((n, xp) => n + xp, 0) + player.answeredQuestionIds.length * 25);
  player.badges = EARTH_BADGES.filter(b => Array.isArray(p.badges) && p.badges.includes(b));
  player.certificates = Array.isArray(p.certificates) && p.certificates.includes('Earth Guardian') ? ['Earth Guardian'] : [];
  return { app: 'Grace Nexus LMS', version: 2, player, completedLessonIds: player.completedMissionIds };
}
function campaignRecord(raw) { requireVersion(raw, 1, 'learning campaign'); return normalizeProgress(raw); }
function storyRecord(raw) { requireVersion(raw, 1, 'RPG'); return normalizeAdventure(raw); }
function academyRecord(raw) { requireVersion(raw, 1, 'PowerShell Academy'); return normalizeAcademy(raw); }
function bonusRecord(raw) {
  if (!object(raw) || (raw.version !== undefined && raw.version !== 1)) throw Error('Unsupported Signal Bonus save format.');
  if (!Number.isSafeInteger(raw.credits) || raw.credits < 0 || raw.credits > 5000 || !Array.isArray(raw.awards)) throw Error('Invalid Signal Bonus balance.');
  return { version: 1, credits: raw.credits, awards: [...new Set(raw.awards.filter(id => typeof id === 'string' && id.length <= 100))] };
}
function starsRecord(raw) { if (!Array.isArray(raw)) throw Error('Invalid Seven Stars save.'); return CHURCHES.filter(name => raw.includes(name)); }

export const PASSPORT_RECORDS = [
  { key: CAMPAIGN_KEY, label: 'Learning campaign: lessons, milestones, badges', normalize: campaignRecord },
  { key: RPG_KEY, label: 'Signalkeepers RPG: role, quests, journal choices', normalize: storyRecord },
  { key: MATCH_KEY, label: 'Code Matrix: settled board and level', normalize: matchRecord },
  { key: DEFENSE_KEY, label: 'VIM / Bash Defense: checkpoint, cards, best score', normalize: defenseRecord },
  { key: ACADEMY_KEY, label: 'PowerShell Academy: learning profile and achievements', normalize: academyRecord },
  { key: MATRIX_KEY, label: 'Matrix Academy: Earth mission passport', normalize: matrixRecord },
  { key: BONUS_KEY, label: 'Signal Bonus: earned Matrix Defense credits', normalize: bonusRecord },
  { key: STARS_KEY, label: 'Seven Stars: completed locations', normalize: starsRecord },
];
const registry = new Map(PASSPORT_RECORDS.map(record => [record.key, record]));

export function exportPassport(storage, now = new Date()) {
  const records = {}, warnings = [];
  for (const record of PASSPORT_RECORDS) {
    const raw = storage.getItem(record.key); // A blocked storage read must not masquerade as an empty backup.
    if (raw === null) continue;
    try { records[record.key] = record.normalize(JSON.parse(raw)); }
    catch { warnings.push(`${record.label}: unreadable save omitted.`); }
  }
  return { passport: { format: PASSPORT_FORMAT, version: 1, exportedAt: now.toISOString(), records }, warnings };
}
export function parsePassport(text) {
  if (typeof text !== 'string' || text.length > MAX_PASSPORT_SIZE) throw Error('Choose a JSON passport no larger than 1 MB.');
  let raw;
  try { raw = JSON.parse(text); } catch { throw Error('This file is not valid JSON.'); }
  if (raw?.format !== PASSPORT_FORMAT || raw.version !== 1 || !object(raw.records)) throw Error('Unsupported learning passport format.');
  const records = {}, warnings = []; let ignored = 0;
  for (const [key, value] of Object.entries(raw.records)) {
    const record = registry.get(key);
    if (!record) { ignored++; continue; }
    records[key] = record.normalize(value);
  }
  if (!Object.keys(records).length) throw Error('This passport contains no supported learning records.');
  if (ignored) warnings.push(`${ignored} unrecognized record${ignored === 1 ? ' was' : 's were'} ignored.`);
  return { passport: { format: PASSPORT_FORMAT, version: 1, records }, warnings };
}

function mergeCampaign(a, b) {
  const quizzes = {};
  for (const lesson of LESSONS) {
    const left = a.quizzes[lesson.id], right = b.quizzes[lesson.id];
    if (left || right) quizzes[lesson.id] = { best: Math.max(left?.best || 0, right?.best || 0), attempts: Math.max(left?.attempts || 0, right?.attempts || 0) };
  }
  return normalizeProgress({ version: 1, quizzes, completedLevels: union(a.completedLevels, b.completedLevels),
    sovereignShieldUsed: a.sovereignShieldUsed === true || b.sovereignShieldUsed === true });
}
function mergeStory(a, b) { return normalizeAdventure({ version: 1, role: a.role || b.role, completed: union(a.completed, b.completed), choices: { ...b.choices, ...a.choices } }); }
function mergeMatch(a, b) {
  const rank = s => s.level * 10 + ({ lost: 0, playing: 1, won: 2, complete: 3 })[s.status];
  const chosen = rank(b) > rank(a) ? b : a;
  return matchRecord({ ...chosen, total: Math.max(a.total, b.total), badges: union(a.badges, b.badges) });
}
function mergeDefense(a, b) {
  const review = normalizeReview(a.review);
  for (const [id, incoming] of Object.entries(b.review)) {
    const current = review[id];
    if (!current || incoming.attempts > current.attempts || (incoming.attempts === current.attempts && incoming.correct > current.correct)) review[id] = incoming;
  }
  return defenseRecord({ version: 1, best: Math.max(a.best, b.best), wins: Math.max(a.wins, b.wins),
    checkpoint: a.checkpoint || b.checkpoint, assist: a.assist, review });
}
function mergeAcademy(a, b) {
  return normalizeAcademy({ version: 1, player: a.player !== 'Explorer' ? a.player : b.player, correct: union(a.correct, b.correct),
    lessons: union(a.lessons, b.lessons), waves: union(a.waves, b.waves), packets: Math.max(a.packets, b.packets), highestWave: Math.max(a.highestWave, b.highestWave),
    deployed: a.deployed || b.deployed, boss: a.boss || b.boss, cyber: a.cyber || b.cyber });
}
function mergeMatrix(a, b) {
  const player = { currentCampaignLevel: Math.max(a.player.currentCampaignLevel, b.player.currentCampaignLevel) };
  for (const key of ['xp', 'score', 'gamesPlayed', 'matchesMade', 'quizzesCompleted', 'correctAnswers']) player[key] = Math.max(a.player[key], b.player[key]);
  for (const key of ['badges', 'certificates', 'answeredQuestionIds']) player[key] = union(a.player[key], b.player[key]);
  const earnedMissionXP = [50, 100, 150, 250].slice(0, player.currentCampaignLevel).reduce((n, xp) => n + xp, 0);
  player.xp = Math.max(player.xp, earnedMissionXP + player.answeredQuestionIds.length * 25);
  return matrixRecord({ version: 2, player });
}
function mergeBonus(a, b) { return bonusRecord({ version: 1, credits: Math.max(a.credits, b.credits), awards: union(a.awards, b.awards) }); }
const mergers = new Map([[CAMPAIGN_KEY, mergeCampaign], [RPG_KEY, mergeStory], [MATCH_KEY, mergeMatch], [DEFENSE_KEY, mergeDefense], [ACADEMY_KEY, mergeAcademy], [MATRIX_KEY, mergeMatrix], [BONUS_KEY, mergeBonus], [STARS_KEY, (a, b) => starsRecord(union(a, b))]]);

function reconcile(records, storage) {
  const get = key => records[key] || (() => {
    try { const raw = storage.getItem(key); return raw ? registry.get(key).normalize(JSON.parse(raw)) : null; } catch { return null; }
  })();
  let state = get(CAMPAIGN_KEY) || emptyProgress();
  const story = get(RPG_KEY);
  if (story) for (const chapter of CHAPTERS) if (chapterComplete(story, chapter.id)) state = completeLevel(state, chapter.milestone);
  const match = get(MATCH_KEY);
  if (match) for (let level = 1; level <= (['won', 'complete'].includes(match.status) ? match.level : match.level - 1); level++) state = completeLevel(state, `match-${level}`);
  const matrix = get(MATRIX_KEY);
  if (matrix?.player.currentCampaignLevel >= 1) state = completeLevel(state, 'matrix-academy');
  if (matrix?.player.currentCampaignLevel === 4) state = completeLevel(state, 'matrix-earth');
  if (get(DEFENSE_KEY)?.wins > 0) state = completeLevel(state, 'vim-defense');
  if (get(STARS_KEY)?.length === CHURCHES.length) state = completeLevel(state, 'seven-stars');
  if (records[CAMPAIGN_KEY] || JSON.stringify(state) !== JSON.stringify(get(CAMPAIGN_KEY) || emptyProgress())) records[CAMPAIGN_KEY] = normalizeProgress(state);
}

export function planRestore(storage, parsed) {
  // Revalidate caller data and merge with the latest persisted records, not a stale preview.
  const { passport, warnings } = parsePassport(JSON.stringify(parsed));
  const records = {}, replacedInvalid = [];
  for (const [key, incoming] of Object.entries(passport.records)) {
    const raw = storage.getItem(key);
    let current = null;
    if (raw !== null) try { current = registry.get(key).normalize(JSON.parse(raw)); } catch { replacedInvalid.push(registry.get(key).label); }
    records[key] = current ? mergers.get(key)(current, incoming) : incoming;
  }
  reconcile(records, storage);
  const changes = Object.entries(records).map(([key, value]) => ({ key, label: registry.get(key).label, value: JSON.stringify(value), before: storage.getItem(key) }))
    .filter(change => change.value !== change.before);
  const summary = progressSummary(records[CAMPAIGN_KEY] || (() => { try { return JSON.parse(storage.getItem(CAMPAIGN_KEY)); } catch { return emptyProgress(); } })());
  return { changes, summary, records, warnings: [...warnings, ...replacedInvalid.map(label => `${label}: invalid local save will be replaced.`)] };
}
export function restorePassport(storage, parsed) {
  const plan = planRestore(storage, parsed), written = [];
  try {
    for (const change of plan.changes) { storage.setItem(change.key, change.value); written.push(change); }
  } catch {
    const rollbackErrors = [];
    for (const change of written.reverse()) try { if (change.before === null) storage.removeItem(change.key); else storage.setItem(change.key, change.before); } catch { rollbackErrors.push(change.key); }
    const error = Error(rollbackErrors.length ? 'Restore failed and rollback was incomplete. Some saves may have changed; retain your backup and reload the games before continuing.' : 'Restore failed. Previous save values were restored. Browser storage may be full or blocked.');
    error.partial = rollbackErrors.length > 0; throw error;
  }
  return plan;
}
