import { WIDTH, HEIGHT, WAVES, MOVE_KEYS } from './content.js';
import { DefenseInput } from './input.js';
import { DefenseGame, SAVE_KEY, restoreCheckpoint, emptyDefenseRecord, normalizeDefenseRecord } from './engine.js';
import { QUESTION_POOLS, TOPICS, recordReview } from './quiz-bank.js';
import { campaign } from '../learning/campaign-store.js';
import { awardBonus } from '../learning/bonus-store.js';
const $ = id => document.getElementById(id);
const el = (tag, text = '', className = '') => { const n = document.createElement(tag); n.textContent = text; n.className = className; return n; };
function button(text, action, className = '') { const b = el('button', text, className); b.type = 'button'; b.onclick = action; return b; }
const normalizeKey = key => key.length === 1 ? key.toLowerCase() : key;

export class DefenseApp {
  constructor() {
    this.canvas = $('arena'); this.ctx = this.canvas.getContext('2d');
    this.record = emptyDefenseRecord(); this.persistent = true;
    try {
      this.storage = window.localStorage;
      const raw = JSON.parse(this.storage.getItem(SAVE_KEY) || 'null');
      this.record = normalizeDefenseRecord(raw) || emptyDefenseRecord();
    } catch { this.persistent = false; }
    this.lastCheckpoint = this.record.checkpoint;
    this.game = restoreCheckpoint(this.lastCheckpoint) || new DefenseGame('bash', Math.random, { review: this.record.review });
    this.game.assist = this.record.assist;
    $('game-mode').value = this.game.mode;
    $('study-filter').append(...TOPICS.map((topic, i) => { const option = el('option', topic); option.value = i; return option; }));
    this.lastPhase = null; this.lastTime = performance.now(); this.accumulator = 0; this.hudClock = 0; this.frameId = null;
    this.input = new DefenseInput();
    this.bind(); this.renderStudyCards(); this.sync(true);
  }
  write() {
    if (this.externalSaveChanged) return;
    try { this.storage.setItem(SAVE_KEY, JSON.stringify(this.record)); this.persistent = true; }
    catch { this.persistent = false; }
  }
  saveCheckpoint() {
    const checkpoint = this.game.checkpoint();
    if (checkpoint) { this.lastCheckpoint = checkpoint; this.record.checkpoint = checkpoint; }
    this.record.best = Math.max(this.record.best, this.game.score); this.write();
  }
  start() { if (this.externalSaveChanged) return; this.saveCheckpoint(); if (this.game.startWave()) { this.sync(true); this.canvas.focus(); } }
  continueWave() { if (this.game.nextWave()) this.start(); }
  togglePause() {
    if (this.externalSaveChanged) return;
    if (this.game.phase === 'running') this.game.pause(); else if (this.game.phase === 'paused') this.game.resume();
    this.sync(true); this.canvas.focus();
  }
  retry() {
    const game = restoreCheckpoint(this.lastCheckpoint);
    if (!game || game.phase !== 'ready') return;
    this.game = game; this.game.assist = this.record.assist; this.start();
  }
  reset(mode = this.game.mode) {
    if (this.externalSaveChanged) return;
    this.clearInputs(); this.game = new DefenseGame(mode, Math.random, { review: this.record.review, assist: this.record.assist }); this.lastPhase = null;
    this.saveCheckpoint(); this.sync(true); this.canvas.focus();
  }
  select() {
    if (this.externalSaveChanged) { window.location.reload(); return; }
    const phase = this.game.phase;
    if (phase === 'ready') this.start();
    else if (phase === 'paused') this.togglePause();
    else if (phase === 'lost') this.retry();
    else if (phase === 'intermission') this.continueWave();
    else if (phase === 'quiz') $('briefing-content').querySelector('button:not(:disabled)')?.focus();
    else if (phase === 'won') $('new-run').focus();
  }
  toggleAssist() {
    if (this.externalSaveChanged) return;
    this.game.assist = !this.game.assist; this.game.assistedTarget = null;
    this.record.assist = this.game.assist;
    this.game.message = this.game.assist ? 'Target assist on. Hold Space to fire your primary weapon and an aimed support stream; mouse fire takes priority.' : 'Target assist off. Space follows your facing; mouse or touch controls the second stream.';
    if (this.game.checkpoint()) this.saveCheckpoint(); else this.write();
    this.sync(); this.canvas.focus();
  }
  renderStudyCards() {
    const filter = $('study-filter').value;
    const all = QUESTION_POOLS.flat(), review = this.record.review;
    const seen = Object.keys(review).length, missed = Object.values(review).filter(r => !r.lastCorrect).length;
    $('study-progress').textContent = `${seen} / ${all.length} cards encountered · ${missed} need review. These are your local practice responses, not a proficiency grade.`;
    const questions = all.filter(q => filter === 'missed' ? review[q.id]?.lastCorrect === false : filter === 'unseen' ? !review[q.id] : filter === 'all' || QUESTION_POOLS[Number(filter)]?.includes(q));
    $('study-cards').replaceChildren(...questions.map(q => {
      const card = el('details', '', 'study-card'); card.dataset.question = q.id;
      card.append(el('summary', q.prompt), el('p', `Answer: ${q.options[q.answer]}`), el('p', q.explanation));
      const result = review[q.id];
      card.append(el('p', result ? `${result.correct} correct first responses / ${result.attempts} encounters · Latest: ${result.lastCorrect ? 'correct' : 'needs review'}` : 'Not encountered in a briefing yet.', 'small'));
      return card;
    }));
    if (!questions.length) $('study-cards').append(el('p', 'No cards match this filter.'));
  }
  invalidate() {
    if (this.frameId === null && !document.hidden) this.frameId = requestAnimationFrame(t => this.frame(t));
  }
  bind() {
    const root = $('defense-game');
    const legacyTouch = root.querySelector('.touch-controls');
    const touchBar = document.createElement('div');
    touchBar.id = 'touch-bar'; touchBar.className = 'touch-bar'; touchBar.setAttribute('aria-label', 'Slide controls');
    touchBar.innerHTML = '<button data-action="left" type="button"><kbd>H</kbd><span>LEFT</span></button><button data-action="fire" type="button" class="fire-button"><kbd>SPACE</kbd><span>FIRE</span></button><button data-action="right" type="button"><kbd>L</kbd><span>RIGHT</span></button><button data-action="drone" type="button"><kbd>B</kbd><span>DRONE</span></button>';
    legacyTouch?.classList.add('legacy-touch-controls');
    legacyTouch?.querySelector('.fire-button')?.classList.remove('fire-button');
    legacyTouch?.insertAdjacentElement('afterend', touchBar);
    legacyTouch?.remove();
    this.clearInputs = () => {
      this.input.clear(); this.game.releaseInputs();
      touchBar.querySelectorAll('.active').forEach(button => button.classList.remove('active'));
    };
    this.rebuildInputs = () => {
      const state = this.input.rebuild();
      for (const key of [...this.game.keys]) if (!state.keys.has(key)) this.game.setKey(key, false);
      for (const key of state.keys) if (!this.game.keys.has(key)) this.game.setKey(key, true);
      this.game.mouseFiring = this.game.phase === 'running' && state.mouseFiring;
      const actions = new Set([...this.input.activePointers.values()].map(p => p.action));
      touchBar.querySelectorAll('[data-action]').forEach(button => button.classList.toggle('active', actions.has(button.dataset.action)));
    };
    const updateTouchAction = event => {
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest?.('[data-action]');
      const action = target && touchBar.contains(target) ? target.dataset.action : null;
      if (this.input.update(event.pointerId, event.clientX, event.clientY, action)) { this.game.deploy(); this.sync(); }
      this.rebuildInputs();
    };
    const clearTouchPointer = event => { this.input.remove(event.pointerId); this.rebuildInputs(); };
    touchBar.addEventListener('pointerdown', event => { if ((event.pointerType !== 'touch' && event.button !== 0) || this.game.phase !== 'running') return; event.preventDefault(); this.canvas.focus(); touchBar.setPointerCapture(event.pointerId); updateTouchAction(event); });
    touchBar.addEventListener('pointermove', event => { if (this.input.activePointers.has(event.pointerId)) { event.preventDefault(); updateTouchAction(event); } });
    touchBar.addEventListener('pointerup', clearTouchPointer); touchBar.addEventListener('pointercancel', clearTouchPointer); touchBar.addEventListener('lostpointercapture', clearTouchPointer);
    root.addEventListener('keydown', event => {
      const key = normalizeKey(event.key), target = event.target;
      if (target.matches('input,select,textarea') || target.isContentEditable || event.ctrlKey || event.metaKey || event.altKey) return;
      if (key === 'i' && target.closest('button')) { event.preventDefault(); if (!event.repeat) target.closest('button').click(); return; }
      if (target === this.canvas) {
        if ((key in MOVE_KEYS && key !== 'k') || key === ' ') { event.preventDefault(); if (this.game.phase === 'running' && !event.repeat) this.input.keyboard.add(key); this.rebuildInputs(); }
        else if (['b', 'k', 'd'].includes(key)) { event.preventDefault(); if (!event.repeat) { this.game.deploy(); this.sync(); } }
        else if (key === 'a') { event.preventDefault(); if (!event.repeat) this.toggleAssist(); }
        else if (key === 'Escape') { event.preventDefault(); if (!event.repeat) this.togglePause(); }
        else if (key === 'i' || key === 'Enter') { event.preventDefault(); if (!event.repeat) this.select(); }
        return;
      }
      if (target.closest('#briefing') && key in MOVE_KEYS) {
        event.preventDefault();
        const buttons = [...$('briefing-content').querySelectorAll('button:not(:disabled)')];
        const index = buttons.indexOf(document.activeElement), backwards = ['h', 'k', 'ArrowLeft', 'ArrowUp'].includes(key);
        if (buttons.length) buttons[(index + (backwards ? -1 : 1) + buttons.length) % buttons.length].focus();
      } else if (target === $('briefing-title') && (key === 'i' || key === 'Enter')) { event.preventDefault(); this.select(); }
    });
    window.addEventListener('keyup', event => { this.input.keyboard.delete(normalizeKey(event.key)); this.rebuildInputs(); });
    this.canvas.addEventListener('blur', () => this.clearInputs());
    root.addEventListener('focusout', event => {
      if (event.relatedTarget && !root.contains(event.relatedTarget)) { this.game.pause(); this.sync(); }
    });
    const unfocus = () => { this.game.pause(); this.clearInputs(); this.sync(); };
    window.addEventListener('blur', unfocus);
    window.addEventListener('storage', event => {
      if (event.key !== SAVE_KEY && event.key !== null) return;
      this.externalSaveChanged = true; this.game.pause(); this.clearInputs();
      this.game.message = 'Saved progress changed in another tab. This run is paused. Reload before continuing so the restored save is not overwritten.';
      this.sync(true);
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) unfocus(); else this.sync(true); });
    const aim = event => {
      const rect = this.canvas.getBoundingClientRect();
      this.game.aim = { x: (event.clientX - rect.left) * WIDTH / rect.width, y: (event.clientY - rect.top) * HEIGHT / rect.height };
      this.invalidate();
    };
    const updateMouse = event => {
      // Chorded mouse presses/releases are pointermove events, not pointerdown/up.
      this.input.update(event.pointerId, event.clientX, event.clientY, event.buttons & 1 ? 'aim' : null);
      if (event.button === 2 && (event.buttons & 2)) { this.game.deploy(); this.sync(); }
      this.rebuildInputs();
    };
    this.canvas.addEventListener('pointermove', event => {
      aim(event);
      if (event.pointerType === 'mouse' && this.input.activePointers.has(event.pointerId)) updateMouse(event);
    });
    this.canvas.addEventListener('contextmenu', event => event.preventDefault());
    this.canvas.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'touch' && ![0, 2].includes(event.button)) return; event.preventDefault(); this.canvas.focus(); aim(event);
      if (this.game.phase !== 'running') return;
      if (event.pointerType === 'mouse') updateMouse(event);
      else { this.input.update(event.pointerId, event.clientX, event.clientY, 'aim'); this.rebuildInputs(); }
      this.canvas.setPointerCapture(event.pointerId);
    });
    const releaseAim = event => { clearTouchPointer(event); if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId); };
    this.canvas.addEventListener('pointerup', releaseAim); this.canvas.addEventListener('pointercancel', releaseAim);
    this.canvas.addEventListener('lostpointercapture', clearTouchPointer);
    $('start-wave').onclick = () => this.start(); $('pause').onclick = () => this.togglePause();
    $('deploy').onclick = () => { this.game.deploy(); this.sync(); this.canvas.focus(); };
    $('retry').onclick = () => this.retry();
    $('reload-progress').onclick = () => window.location.reload();
    $('target-assist').onclick = () => this.toggleAssist();
    $('study-filter').onchange = () => this.renderStudyCards();
    $('study-deck').addEventListener('toggle', () => {
      if ($('study-deck').open) { this.game.pause(); this.clearInputs(); this.sync(true); this.renderStudyCards(); }
    });
    $('new-run').onclick = () => {
      if ((this.game.phase === 'running' || this.game.phase === 'paused' || this.game.wave > 1) && !window.confirm('Start a new run and replace the current wave checkpoint? Best scores and completed campaign milestones stay earned.')) return;
      this.reset();
    };
    $('game-mode').onchange = event => this.reset(event.target.value);
  }
  sync(force = false) {
    const g = this.game, changed = this.lastPhase !== g.phase;
    if (changed && this.lastPhase !== null && !this.externalSaveChanged) {
      this.record.best = Math.max(this.record.best, g.score);
      if (g.phase === 'won') {
        this.record.wins++; this.record.checkpoint = null; this.lastCheckpoint = null;
        campaign.complete('vim-defense'); awardBonus('vim-defense', 125); this.write();
      } else if (['quiz', 'intermission', 'ready'].includes(g.phase)) this.saveCheckpoint();
      else if (g.phase === 'lost') this.write();
    }
    if (changed && g.phase !== 'running') this.clearInputs();
    this.lastPhase = g.phase;
    if (changed && g.phase === 'running') { this.lastTime = performance.now(); this.accumulator = 0; }
    const values = { wave: `${g.wave} / ${WAVES.length}`, core: g.core, hull: g.player.hp, stock: `${g.stock} · ${g.drones.length} active`, score: `${g.score} / ${Math.max(g.score, this.record.best)}` };
    for (const [id, value] of Object.entries(values)) if ($(id).textContent !== String(value)) $(id).textContent = value;
    if ($('game-status').textContent !== g.message) $('game-status').textContent = g.message;
    $('start-wave').hidden = g.phase !== 'ready'; $('pause').hidden = !['running', 'paused'].includes(g.phase);
    $('pause').textContent = g.phase === 'paused' ? 'Resume · i / Enter' : 'Pause · Esc';
    $('deploy').disabled = g.phase !== 'running' || g.stock < 1 || g.drones.length >= 3;
    $('retry').hidden = g.phase !== 'lost' || !this.lastCheckpoint;
    $('game-mode').disabled = g.phase !== 'ready' || g.wave !== 1;
    $('target-assist').setAttribute('aria-pressed', String(g.assist));
    $('target-assist').textContent = `Target assist: ${g.assist ? 'on' : 'off'} · a`;
    $('reload-progress').hidden = !this.externalSaveChanged;
    for (const id of ['start-wave', 'pause', 'deploy', 'retry', 'new-run', 'target-assist']) if (this.externalSaveChanged) $(id).disabled = true;
    if (this.externalSaveChanged) $('game-mode').disabled = true;
    $('save-status').textContent = this.persistent && campaign.persistent ? '✓ Wave checkpoints and best scores save in this browser. Completion XP is awarded once.' : 'Saving unavailable. You can play in this tab, but reloading or leaving may lose checkpoints or campaign rewards.';
    if (force || changed) this.renderBriefing();
    if (this.externalSaveChanged) {
      $('briefing-content').querySelectorAll('button').forEach(button => { button.disabled = true; });
      $('save-status').textContent = 'This tab is read-only until reloaded because saved progress changed elsewhere.';
    }
    if (changed && ['quiz', 'lost', 'won'].includes(g.phase)) { $('briefing-title').tabIndex = -1; $('briefing-title').focus(); }
    this.invalidate();
  }
  renderBriefing() {
    const g = this.game, area = $('briefing-content'); area.replaceChildren();
    $('briefing-title').textContent = g.phase === 'quiz' ? `Bash bonus ${g.quizIndex + 1} / 2` : g.phase === 'won' ? 'Core secured.' : g.phase === 'lost' ? 'A new plan, a new try.' : `Wave ${g.wave}: ${WAVES[g.wave - 1].name}`;
    if (g.phase === 'quiz') {
      const q = g.currentQuestion(), result = g.quizResults[g.quizIndex];
      area.append(el('p', q.note), el('h3', q.prompt));
      const answers = el('div', '', 'quiz-answers');
      q.options.forEach((text, answer) => {
        const b = button(text, () => {
          if (!g.quizResults[g.quizIndex]) {
            const response = g.answerQuiz(answer); if (response) this.record.review = recordReview(this.record.review, q.id, response.correct);
          }
          this.saveCheckpoint(); this.sync(true); this.renderStudyCards(); $('quiz-next')?.focus();
        });
        b.dataset.answer = answer; b.disabled = !!result;
        if (result && answer === q.answer) b.classList.add('correct'); else if (result && answer === result.answer) b.classList.add('incorrect');
        answers.append(b);
      }); area.append(answers);
      if (result) {
        const feedback = el('p', `${result.correct ? result.bonus ? 'Correct · +1 drone charge.' : 'Correct · reserves already full.' : 'Review this one · no bonus charge.'} ${q.explanation}`, 'quiz-feedback'); feedback.setAttribute('role', 'status'); area.append(feedback);
        const next = button(g.quizIndex === 0 ? 'Next question →' : 'Finish briefing →', () => { g.nextQuestion(); this.saveCheckpoint(); this.sync(true); $('briefing-title').tabIndex = -1; $('briefing-title').focus(); }, 'primary'); next.id = 'quiz-next'; area.append(next);
      }
      const skip = button('Skip remaining quiz · start next wave', () => this.continueWave()); skip.id = 'skip-quiz'; area.append(skip);
    } else if (g.phase === 'intermission') {
      area.append(el('p', 'Refit adds one standard drone charge, up to 15 core and 20 hull. Any Bash bonus charges you earned are already in reserve.'), button(`Start wave ${g.wave + 1} →`, () => this.continueWave(), 'primary'));
    } else if (g.phase === 'won') {
      area.append(el('p', `All five waves cleared. Final score: ${g.score}. Best: ${this.record.best}.`), el('p', 'Your learning campaign milestone is earned once. Replay in either mode to practice or improve your score.'));
      const a = el('a', 'View Learn & Play →'); a.href = '/lms/'; area.append(a);
    } else if (g.phase === 'lost') {
      area.append(el('p', 'The wave checkpoint lets you try a different flight path, aim, or drone timing. Earlier quiz bonuses remain recorded, so reloading cannot award them twice.'));
    } else if (g.phase === 'paused') {
      area.append(el('p', 'Take your time. No enemies or shots advance while paused.'), button('Resume defense →', () => this.togglePause(), 'primary'));
    } else {
      area.append(el('p', 'Red hostiles move toward the central core. Fly around it and clear the wave before the core or your hull reaches zero.'), el('p', 'Space fires in your last movement direction. Mouse aim controls an independent stream. Press a for optional keyboard target assist: hold Space to aim the support stream at a threat while retaining your primary direction.'), el('p', g.mode === 'bash' ? 'Each run selects eight questions from 24 cards. Missed and unseen cards are prioritized on future runs. Correct first responses earn bonus drones; standard charges arrive even if you skip.' : 'Arcade mode skips Bash questions and still grants a standard drone charge at every refit.'));
    }
  }
  frame(timestamp) {
    this.frameId = null;
    if (document.hidden) { this.accumulator = 0; this.lastTime = timestamp; return; }
    if (this.game.phase !== 'running') { this.accumulator = 0; this.draw(); return; }
    this.rebuildInputs();
    this.accumulator += Math.min(100, timestamp - this.lastTime); this.lastTime = timestamp;
    while (this.accumulator >= 1000 / 60) { this.game.tick(1 / 60); this.accumulator -= 1000 / 60; }
    this.hudClock += 1;
    if (this.lastPhase !== this.game.phase || this.hudClock >= 6) { this.sync(); this.hudClock = 0; }
    this.draw(); if (this.game.phase === 'running') this.invalidate();
  }
  draw() {
    const c = this.ctx, g = this.game;
    if (!c) return;
    c.clearRect(0, 0, WIDTH, HEIGHT); c.fillStyle = '#06131c'; c.fillRect(0, 0, WIDTH, HEIGHT);
    c.strokeStyle = '#17303a'; c.lineWidth = 1;
    for (let x = 0; x <= WIDTH; x += 40) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, HEIGHT); c.stroke(); }
    for (let y = 0; y <= HEIGHT; y += 40) { c.beginPath(); c.moveTo(0, y); c.lineTo(WIDTH, y); c.stroke(); }
    c.strokeStyle = '#5f9b83'; c.setLineDash([4, 9]); c.beginPath(); c.arc(WIDTH / 2, HEIGHT / 2, 60, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
    c.fillStyle = '#a5ebc2'; c.beginPath(); c.moveTo(400, 217); c.lineTo(423, 240); c.lineTo(400, 263); c.lineTo(377, 240); c.closePath(); c.fill();
    c.fillStyle = '#081d20'; c.font = 'bold 16px monospace'; c.textAlign = 'center'; c.fillText('$_', 400, 246);
    for (const e of g.enemies) {
      c.fillStyle = e.boss ? '#ecbc71' : '#ef8297'; c.beginPath(); c.arc(e.x, e.y, e.radius, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#28434a'; c.fillRect(e.x - e.radius, e.y - e.radius - 8, e.radius * 2, 3);
      c.fillStyle = '#ffdb9a'; c.fillRect(e.x - e.radius, e.y - e.radius - 8, e.radius * 2 * e.hp / e.maxHp, 3);
      if (e.boss) { c.fillStyle = '#10212b'; c.font = 'bold 12px monospace'; c.fillText('ROOT', e.x, e.y + 4); }
    }
    for (const s of g.shots) { c.fillStyle = s.source === 'primary' ? '#f8df9d' : s.source === 'mouse' ? '#9fd9ff' : s.source === 'assist' ? '#a5ebc2' : '#bba3ee'; c.beginPath(); c.arc(s.x, s.y, 3, 0, Math.PI * 2); c.fill(); }
    for (const d of g.drones) { c.fillStyle = '#c4abff'; c.beginPath(); c.arc(g.player.x + Math.cos(d.angle) * 30, g.player.y + Math.sin(d.angle) * 30, 6, 0, Math.PI * 2); c.fill(); }
    for (const e of g.effects) { c.strokeStyle = `rgba(255,210,140,${Math.max(0, e.ttl / 0.35)})`; c.beginPath(); c.arc(e.x, e.y, 10 + (0.35 - e.ttl) * 45, 0, Math.PI * 2); c.stroke(); }
    c.save(); c.translate(g.player.x, g.player.y); c.rotate(Math.atan2(g.facing.y, g.facing.x));
    c.fillStyle = '#a5ebc2'; c.beginPath(); c.moveTo(18, 0); c.lineTo(-11, -10); c.lineTo(-6, 0); c.lineTo(-11, 10); c.closePath(); c.fill(); c.restore();
    const aim = g.assistedTarget || g.aim;
    c.strokeStyle = g.assistedTarget ? '#a5ebc2' : '#9fd9ff'; c.beginPath(); c.arc(aim.x, aim.y, 8, 0, Math.PI * 2); c.moveTo(aim.x - 13, aim.y); c.lineTo(aim.x + 13, aim.y); c.moveTo(aim.x, aim.y - 13); c.lineTo(aim.x, aim.y + 13); c.stroke();
    c.font = '12px monospace'; c.textAlign = 'left'; c.fillStyle = '#a3bec4'; c.fillText(`WAVE ${g.wave} / ${WAVES.length}   HOSTILES ${g.enemies.length + g.remaining}   DRONES ${g.drones.length}/3`, 18, 25);
    if (g.phase !== 'running') {
      c.fillStyle = '#06131cc9'; c.fillRect(0, 0, WIDTH, HEIGHT); c.textAlign = 'center'; c.fillStyle = '#a5ebc2'; c.font = 'bold 30px monospace';
      c.fillText(g.phase === 'ready' ? 'HOME ROW READY' : g.phase === 'quiz' ? 'BASH BONUS BREAK' : g.phase === 'won' ? 'CORE SECURED' : g.phase === 'lost' ? 'TRY A NEW FLIGHT PATH' : g.phase === 'paused' ? 'PAUSED' : 'WAVE SECURED', WIDTH / 2, HEIGHT / 2 - 10);
      c.font = '16px monospace'; c.fillStyle = '#d1dcd0'; c.fillText(g.phase === 'quiz' ? 'Quiz controls are in the briefing panel' : 'i / Enter to select · H/L + arrows to move', WIDTH / 2, HEIGHT / 2 + 25);
    }
  }
}
export const app = new DefenseApp();
