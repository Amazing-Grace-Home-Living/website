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


/** Chapter 3 is a noncombat hearing: players distinguish verifiable evidence from speculation. */
export const approaches = {
  Caregiver: {
    listen: ['Sit beside the apprentice and ask whose safety was overlooked', 'The apprentice agrees to testify because someone promises to hear her without interrupting.'],
    support: ['Organize a quiet room where families can give accounts', 'The families speak without an audience, but the public requests a clear summary of what was heard.'],
  },
  Scholar: {
    compare: ['Compare the surviving index with the original minutes', 'The conflicting versions become visible side by side, with uncertainty marked rather than erased.'],
    verify: ['Invite a second reader to check each attribution', 'Independent readers agree about the edit but cannot identify the person who activated it.'],
  },
  Watchman: {
    protect: ['Protect the original ledgers while witnesses are heard', 'The originals stay intact, though access is slower while a neutral clerk supervises.'],
    escort: ['Escort the objectors’ families to the hearing', 'The families arrive safely, and ask why their ancestors’ names were hidden in the first place.'],
  },
  Messenger: {
    relay: ['Carry the apprentice’s words to the council without altering them', 'The council hears the accusation’s real cost in the apprentice’s own words.'],
    translate: ['Present opposing accounts together without taking sides', 'The gathered crowd hears why disagreement is not proof that every account is equally supported.'],
  },
};

export const council = [
  {
    title: 'The sealed access log',
    source: 'The access log records a maintenance account opening the index at midnight. It does not record the operator’s name. A rumor says the Curator was present.',
    question: 'What can the hearing establish from the access log?',
    options: ['The Curator personally deleted the names.', 'An account accessed the index, but the operator is still unknown.', 'The access log proves no edit happened.'],
    answer: 1,
    hint: 'A credential and a person are not the same thing.',
    finding: 'A maintenance account accessed the index. The operator remains unidentified.',
  },
  {
    title: 'Two stories about a missing name',
    source: 'The signed minutes show two councilors objected to the memory edit. A later city pamphlet says everyone agreed. The clerk kept both documents.',
    question: 'Which statement is supported by the primary record?',
    options: ['The council was unanimous.', 'The objection was invented later.', 'At least two councilors objected to the edit.'],
    answer: 2,
    hint: 'Which document actually recorded the votes?',
    finding: 'The original vote contained objections even though the pamphlet hid them.',
  },
  {
    title: 'The apprentice returns',
    source: 'The apprentice confirms the original compass had been sent for repairs. The merchant apologizes, but some neighbors still repeat the accusation.',
    question: 'What repair remains necessary regardless of the first verdict?',
    options: ['Erase the accusation from everyone’s memory.', 'Correct the rumor where it is still circulating.', 'Require the apprentice to prove her innocence again.'],
    answer: 1,
    hint: 'Restoring a record also means addressing people affected by its misuse.',
    finding: 'Clearing the apprentice was not the same as repairing the public rumor.',
  },
  {
    title: 'The Voice of Certainty',
    source: 'A whisper promises: “Name the villain now, and the city will feel safe.” The ledger confirms access, and the minutes confirm objections—but neither names the person behind the order.',
    question: 'How do you answer the Voice without letting another convenient story replace the truth?',
    options: ['Accuse the Curator because a strong answer ends debate.', 'Hide every record until the mystery is solved.', 'Publish verified facts, mark unresolved claims, and continue investigating.'],
    answer: 2,
    hint: 'What can be shared honestly without turning suspicion into proof?',
    finding: 'The Voice of Certainty fades when the hearing refuses to turn suspicion into a verdict.',
  },
];

export const councilDecisions = {
  public: ['Open the verified record now with a space for corrections', 'The city can inspect the evidence immediately. Affected families request careful moderation of the public discussion.'],
  witnessed: ['Release the record alongside testimony from affected families', 'The families have a voice in the release. A public statement takes longer, but it names both the injury and the evidence.'],
  guarded: ['Keep the originals protected while a public summary is reviewed', 'The evidence remains secure and a summary reaches the public. Citizens ask when the original documents can be examined.'],
};

export function chapter(state) {
  if (!state.role) return 0;
  if (state.councilDecision || state.councilStarted) return 3;
  if (state.archiveStarted) return 2;
  return 1;
}

export function consequences(state) {
  if (!state.councilDecision) return [];
  return [
    `Harmony Square: ${verdicts[state.verdict][1]}`,
    `Wisdom Archive: ${archiveDecisions[state.archiveDecision][1]}`,
    `Your calling: ${approaches[state.role][state.approach][1]}`,
    `Council outcome: ${councilDecisions[state.councilDecision][1]}`,
  ];
}

export const initialState = { role: '', clues: [], verdict: '', memory: 0, echo: 0, archiveStarted: false, archiveStep: 0, archiveDecision: '', councilStarted: false, approach: '', councilStep: 0, councilDecision: '' };

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
    case 'enterCouncil':
      return state.archiveDecision && !state.councilStarted
        ? { ...state, councilStarted: true } : state;
    case 'councilApproach':
      return state.councilStarted && !state.approach && Object.hasOwn(approaches[state.role], value)
        ? { ...state, approach: value } : state;
    case 'councilAnswer':
      return state.approach && state.councilStep < council.length && council[state.councilStep].answer === value
        ? { ...state, councilStep: state.councilStep + 1 } : state;
    case 'councilDecision':
      return state.councilStep === council.length && !state.councilDecision && Object.hasOwn(councilDecisions, value)
        ? { ...state, councilDecision: value } : state;
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
  state = advance(state, 'archiveDecision', saved?.archiveDecision);
  if (saved?.councilStarted === true) state = advance(state, 'enterCouncil');
  state = advance(state, 'councilApproach', saved?.approach);
  for (const [index, record] of council.entries()) {
    if (Number.isInteger(saved?.councilStep) && index < saved.councilStep)
      state = advance(state, 'councilAnswer', record.answer);
  }
  return advance(state, 'councilDecision', saved?.councilDecision);
}
