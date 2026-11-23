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

export const initialState = { role: '', clues: [], verdict: '', memory: 0, echo: 0 };

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
  return state;
}
