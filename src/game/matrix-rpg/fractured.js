import { advance, approaches, archive, archiveDecisions, chapter, clues, consequences, council, councilDecisions, echoes, initialState, restore, roles, verdicts, visions } from './fractured-state.js';

const key = 'matrix-of-conscience.fractured.chapter-one.v1';
const $ = id => document.getElementById(id);
let state = initialState;

function storageUnavailable() {
  $('save-status').textContent = 'Browser storage is unavailable. Progress lasts until you leave or reload this page.';
}

try {
  state = restore(JSON.parse(localStorage.getItem(key)));
} catch {
  storageUnavailable();
}

function choose(label, action, value, retry = '', success = '') {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', () => {
    const next = advance(state, action, value);
    if (next === state) {
      $('quest-feedback').textContent = retry;
      return;
    }
    state = next;
    try {
      localStorage.setItem(key, JSON.stringify(state));
      $('save-status').textContent = 'Progress saves in this browser.';
    } catch {
      storageUnavailable();
    }
    render();
    $('scene-title').focus();
    $('quest-feedback').textContent = success;
  });
  $('scene-actions').append(button);
}

function scene(title, copy) {
  $('scene-title').textContent = title;
  $('scene-copy').textContent = copy;
}

function note(text) {
  const item = document.createElement('li');
  item.textContent = text;
  $('journal').append(item);
}

function chapterProgress() {
  if (!state.role) return 'Select a calling to begin. All four can finish the story.';
  if (state.councilStarted) return `The Council of Unwritten Names · Evidence ${Math.min(state.councilStep, council.length)} of ${council.length}`;
  if (state.archiveStarted) return `Wisdom Archive · Recovered records ${Math.min(state.archiveStep, archive.length)} of ${archive.length}`;
  if (!state.verdict) return `Harmony Square · Witness accounts ${state.clues.length} of ${Object.keys(clues).length}`;
  if (state.memory < visions.length) return `Broken Memory · Fragments ${state.memory} of ${visions.length}`;
  return `Echo of Doubt · Claims ${state.echo} of ${echoes.length}`;
}

function render() {
  $('scene-actions').replaceChildren();
  $('journal').replaceChildren();
  $('calling').textContent = state.role ? `${state.role} · ${roles[state.role]}` : '';
  $('chapter-status').textContent = chapter(state) ? `CHAPTER ${chapter(state)} OF 3` : 'THE FRACTURED MATRIX · A THREE-CHAPTER JOURNEY';
  $('chapter-progress').textContent = chapterProgress();
  if (state.role) note('The Keeper gave you a Conscience Compass and sent you to Harmony Square.');
  for (const id of state.clues) note(clues[id][1]);
  if (state.verdict) note(`You cleared the apprentice. Your decision: ${verdicts[state.verdict][0]}.`);
  if (state.memory === visions.length) note('The Null Architects founded the Matrix. Someone erased their history.');
  if (state.echo === echoes.length) {
    note(`Weeks later in Harmony Square: ${verdicts[state.verdict][1]}`);
    note('Main quest: Find the Five Fractures, learn who erased the past, and restore the Conscience Network.');
    note('Next destination: Wisdom Archive. A new beacon has lit beyond the city.');
    note('Reflection: When has telling the truth helped someone? How could you speak it with care? See Ephesians 4:15.');
  }

  if (state.councilStarted) {
    for (const record of archive.slice(0, state.archiveStep)) note(record.finding);
    note(archiveDecisions[state.archiveDecision][1]);
    if (state.approach) note(`Your ${state.role} approach: ${approaches[state.role][state.approach][1]}`);
    for (const record of council.slice(0, state.councilStep)) note(record.finding);
    if (state.councilDecision) {
      for (const outcome of consequences(state)) note(outcome);
      note('Next mystery: Why did the second beacon signal before the order to forget was issued?');
      note('Reflection: How can you act on reliable evidence without pretending to know more than you do?');
    }
    renderCouncil();
    return;
  }

  if (state.archiveStarted) {
    for (const record of archive.slice(0, state.archiveStep)) note(record.finding);
    if (state.archiveDecision) note(archiveDecisions[state.archiveDecision][1]);
    renderArchive();
    return;
  }

  if (!state.role) {
    for (const [role, description] of Object.entries(roles)) choose(`${role} · ${description}`, 'role', role);
  } else if (state.clues.length < Object.keys(clues).length) {
    scene('Harmony Square', 'A merchant accuses an apprentice of stealing a compass. Neighbors are already taking sides. Gather three accounts before deciding what happened.');
    for (const [id, [label]] of Object.entries(clues)) {
      if (!state.clues.includes(id)) choose(label, 'clue', id, '', clues[id][1]);
    }
  } else if (!state.verdict) {
    scene('Conscience Court', 'The ledger clears the apprentice, although the witnesses remember the day differently. How will you repair the harm caused by the accusation?');
    for (const [id, [label]] of Object.entries(verdicts)) choose(label, 'verdict', id);
  } else if (state.memory < visions.length) {
    scene('The Broken Memory', `A shard of dark glass hangs over the Square. Put its vision in order. Fragment ${state.memory + 1} of ${visions.length}.`);
    for (const index of [2, 0, 1]) {
      if (index >= state.memory) choose(visions[index], 'memory', index, 'Try another fragment. What could have happened next?');
    }
  } else if (state.echo < echoes.length) {
    const [claim, , explanation] = echoes[state.echo];
    scene('The Echo of Doubt', `Sort each claim as truth, half-truth, or falsehood. Check the evidence in your Journal. Claim ${state.echo + 1} of ${echoes.length}: ${claim}`);
    for (const answer of ['Truth', 'Half-truth', 'Falsehood']) {
      choose(answer, 'echo', answer, 'Compare that statement with what the witnesses actually saw and what the ledger records.', explanation);
    }
  } else {
    scene('The Five Fractures', 'The shard steadies, then the sky breaks open. This time everyone sees it. Five beacons ignite beyond the city. Did the Matrix break, or was it designed to fail?');
    choose('Enter Wisdom Archive · Chapter 2', 'enterArchive');
  }
}

function renderArchive() {
  if (state.archiveStep < archive.length) {
    const record = archive[state.archiveStep];
    scene(record.title, state.archiveStep === 0
      ? 'The books are still on their shelves. People are forgetting the ideas inside them. Start with the oldest surviving record.'
      : 'Compare the surviving sources before restoring this entry.');
    for (const text of [record.source, record.question]) {
      const paragraph = document.createElement('p');
      paragraph.textContent = text;
      $('scene-actions').append(paragraph);
    }
    record.options.forEach((option, index) => choose(option, 'archiveAnswer', index, 'Read the surviving source again and check what it directly supports.'));
  } else if (!state.archiveDecision) {
    scene('Restore the Archive', 'The Curator can no longer erase the evidence. How will you return it to the city?');
    for (const [id, [label]] of Object.entries(archiveDecisions)) choose(label, 'archiveDecision', id);
  } else {
    scene('The Order to Forget', 'The repaired index points to a second beacon. In the margin, an unsigned note reads: “If they remember the objections, they will ask who signed the order.”');
    note('Reflection: What do you owe others when the truth is hard to hear?');
    choose('Continue to Chapter 3 · The Council of Unwritten Names', 'enterCouncil');
  }
}

function passage(text) {
  const p = document.createElement('p');
  p.textContent = text;
  $('scene-actions').append(p);
}

function renderCouncil() {
  if (!state.approach) {
    scene('Chapter 3 · The Council of Unwritten Names',
      'The original votes are restored, but the people behind the vanished names cannot speak for themselves. The apprentice and the councilors’ descendants have asked for a hearing. The Voice of Certainty wants someone blamed before the evidence is read.');
    passage(`Your first decision still matters: ${verdicts[state.verdict][1]}`);
    passage(`The Archive decision also follows you: ${archiveDecisions[state.archiveDecision][1]}`);
    passage(`Choose how your ${state.role} calling will help. Either approach can complete the hearing.`);
    for (const [id, [label]] of Object.entries(approaches[state.role])) choose(label, 'councilApproach', id);
    return;
  }
  if (state.councilStep < council.length) {
    const record = council[state.councilStep];
    scene(record.title, `Evidence hearing · Record ${state.councilStep + 1} of ${council.length}. Read the source before deciding what it establishes.`);
    passage(record.source);
    passage(record.question);
    const hint = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = 'Need a clue? Review the evidence';
    hint.append(summary);
    const hintText = document.createElement('p');
    hintText.textContent = record.hint;
    hint.append(hintText);
    $('scene-actions').append(hint);
    record.options.forEach((option, index) => choose(option, 'councilAnswer', index,
      'The source does not support that conclusion. Check the clue or review the record.', record.finding));
  } else if (!state.councilDecision) {
    scene('The Second Beacon', 'The testimony is complete. You know the edits happened, but not who ordered them. The crowd expects a simple villain; the witnesses ask for accuracy and care. Choose how to release the record.');
    for (const [id, [label]] of Object.entries(councilDecisions)) choose(label, 'councilDecision', id);
  } else {
    scene('The Memory That Refused to Disappear',
      'The hearing ends without inventing a culprit. The second beacon flashes twice. An unsigned transmission answers: “The ones who objected built a door the Council forgot.” The search for the remaining Fractures continues.');
    for (const text of consequences(state)) passage(text);
    passage('Chapter 3 complete · Your decisions and their consequences remain in the Quest Journal on this device.');
    passage('Next mystery: Discover the hidden door and learn why the second beacon answered the Archive.');
    const link = document.createElement('a');
    link.href = '/arcade/matrix-of-conscience/';
    link.textContent = 'Return to the Signalkeepers campaign →';
    link.className = 'button';
    $('scene-actions').append(link);
  }
}

$('restart-story').addEventListener('click', () => {
  if (!confirm('Restart only The Fractured Matrix story? Your other Matrix of Conscience campaign progress will stay saved.')) return;
  state = initialState;
  try {
    localStorage.removeItem(key);
    $('save-status').textContent = 'Story restarted. Progress will save in this browser.';
  } catch {
    storageUnavailable();
  }
  $('quest-feedback').textContent = '';
  render();
  $('scene-title').focus();
});

render();
