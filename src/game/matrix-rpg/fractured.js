import { advance, archive, archiveDecisions, clues, echoes, initialState, restore, roles, verdicts, visions } from './fractured-state.js';

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

function render() {
  $('scene-actions').replaceChildren();
  $('journal').replaceChildren();
  $('calling').textContent = state.role ? `${state.role} · ${roles[state.role]}` : '';
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
  }
}

render();
