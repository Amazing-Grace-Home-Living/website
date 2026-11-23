export const roles = {
  Caregiver: 'Service and community',
  Scholar: 'Evidence and lore',
  Watchman: 'Protection and strategy',
  Messenger: 'Diplomacy and relationships',
};

export const clues = {
  merchant: ['Interview the merchant', 'The merchant saw the apprentice leave just before the compass vanished. He never saw anyone take it.'],
  apprentice: ['Interview the apprentice', 'The apprentice says the merchant asked her to lock the shop as she left.'],
  ledger: ['Inspect the delivery ledger', 'The signed delivery ledger records that the merchant sent the compass for repairs before the apprentice arrived.'],
};

export const visions = [
  'Long ago, a hidden figure stood before the Conscience Network.',
  'The figure warned, “When truth becomes optional, reality follows.”',
  'The vision ended, leaving the mark of the Null Architects in the Journal.',
];

export const echoes = [
  ['“The compass was sent out for repairs.”', 'Truth', 'The signed ledger directly supports this.'],
  ['“The apprentice left before the loss was noticed, so she must have stolen it.”', 'Half-truth', 'The departure is real. The conclusion has no evidence.'],
  ['“The merchant saw the apprentice steal the compass.”', 'Falsehood', 'The merchant said he never saw anyone take it.'],
];

export const verdicts = {
  justice: ['Clear her name publicly', 'The Square corrects the record, but the merchant avoids the apprentice. She asks you to help reopen that conversation.'],
  mercy: ['Speak privately with the merchant', 'The merchant apologizes in private. The apprentice asks you to help address the rumors still circulating in the Square.'],
  restoration: ['Invite both to a mediated meeting', 'The apprentice and merchant agree to correct the record together. The apprentice asks you to stand beside her when they speak.'],
};

export const archive = [
  {
    title: 'Rebuild the founding record',
    source: 'Construction log: The beacons went dark at dusk. The founding council ordered the first memory edit the following morning.',
    question: 'Which sequence belongs in the restored record?',
    options: ['The council ordered the edit before the blackout.', 'The blackout came before the order to edit memories.', 'Both events happened at the same time.'],
    answer: 1,
    finding: 'The blackout preceded the first documented edit.',
  },
  {
    title: 'Trace the claim to its source',
    source: 'A city poster calls the edit “unanimous.” The signed council minutes record three votes in favor and two objections.',
    question: 'Which source directly records how the council voted?',
    options: ['The city poster', 'The signed council minutes', 'The Curator’s recollection'],
    answer: 1,
    finding: 'The council was divided about editing memories.',
  },
  {
    title: 'Spot the altered memory',
    source: 'The keeper’s notebook says the missing names belonged to the people who objected. A later index describes them as blank spaces left by an apprentice.',
    question: 'What does the later index erase from the story?',
    options: ['The names of the people who objected', 'The location of the council chamber', 'The date of the blackout'],
    answer: 0,
    finding: 'The index erased the identity of the people who objected.',
  },
  {
    title: 'The Curator of Convenience',
    source: 'The Curator offers to keep only the popular account. A recovered specification describes a routine that removes disputed records after a vote.',
    question: 'What can the Archive responsibly conclude?',
    options: ['The routine proves who ordered every deletion.', 'The routine is irrelevant because the popular account is reassuring.', 'The system could have been designed to forget, but the record leaves who used it open.'],
    answer: 2,
    finding: 'Forgetting may be a designed feature of the Matrix. Who activated it remains unresolved.',
  },
];

export const archiveDecisions = {
  publish: ['Publish the sources and disagreements together', 'Researchers can inspect the original evidence. The council’s descendants ask for time to respond.'],
  review: ['Invite affected families to review the sources before publication', 'Families agree to annotate the record. The public release takes longer.'],
};

export const initialState = { role: '', clues: [], verdict: '', memory: 0, echo: 0, archiveStarted: false, archiveStep: 0, archiveDecision: '' };

export function advance(state, action, value) {
  switch (action) {
    case 'role':
      return !state.role && Object.hasOwn(roles, value) ? { ...state, role: value } : state;
    case 'clue':
      return state.role && !state.verdict && Object.hasOwn(clues, value) && !state.clues.includes(value)
        ? { ...state, clues: [...state.clues, value] } : state;
    case 'verdict':
      return state.clues.length === Object.keys(clues).length && !state.verdict && Object.hasOwn(verdicts, value)
        ? { ...state, verdict: value } : state;
    case 'memory':
      return state.verdict && state.memory < visions.length && value === state.memory
        ? { ...state, memory: state.memory + 1 } : state;
    case 'echo':
      return state.memory === visions.length && state.echo < echoes.length && echoes[state.echo][1] === value
        ? { ...state, echo: state.echo + 1 } : state;
    case 'enterArchive':
      return state.echo === echoes.length && !state.archiveStarted ? { ...state, archiveStarted: true } : state;
    case 'archiveAnswer':
      return state.archiveStarted && state.archiveStep < archive.length && archive[state.archiveStep].answer === value
        ? { ...state, archiveStep: state.archiveStep + 1 } : state;
    case 'archiveDecision':
      return state.archiveStep === archive.length && !state.archiveDecision && Object.hasOwn(archiveDecisions, value)
        ? { ...state, archiveDecision: value } : state;
    default:
      return state;
  }
}

export function restore(saved) {
  let state = advance(initialState, 'role', saved?.role);
  for (const id of Array.isArray(saved?.clues) ? saved.clues : []) state = advance(state, 'clue', id);
  state = advance(state, 'verdict', saved?.verdict);
  for (const index of visions.keys()) {
    if (index < saved?.memory && Number.isInteger(saved.memory)) state = advance(state, 'memory', index);
  }
  for (const [index, [, answer]] of echoes.entries()) {
    if (index < saved?.echo && Number.isInteger(saved.echo)) state = advance(state, 'echo', answer);
  }
  if (saved?.archiveStarted === true) state = advance(state, 'enterArchive');
  for (const [index, record] of archive.entries()) {
    if (Number.isInteger(saved?.archiveStep) && index < saved.archiveStep) state = advance(state, 'archiveAnswer', record.answer);
  }
  return advance(state, 'archiveDecision', saved?.archiveDecision);
}
