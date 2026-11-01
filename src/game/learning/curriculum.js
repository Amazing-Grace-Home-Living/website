export const LESSONS = [

  {
    id: 'foundations', title: 'Build a strong foundation', minutes: 3, requires: [],
    summary: 'Plan a small budget, test a choice, and learn from the result.',
    paragraphs: [
      'A strategy is a plan for using limited resources. Before placing a tower, compare its cost, range, and the part of the path it can cover. A tower near a bend can often cover more than one section of the path.',
      'Keep some credits for the next challenge. Spending everything on the most expensive option can leave a gap elsewhere. Start with affordable coverage and observe one wave before expanding.',
      'Match Maker practices spotting patterns and planning ahead. Match three neighboring symbols, reach the level target, and use a hint when you need one. A failed attempt is feedback, not lost learning progress.',
    ],
    questions: [
      { prompt: 'What should you compare before buying a tower?', choices: ['Only its color', 'Cost, range, and path coverage', 'Only the biggest price'], answer: 1, explanation: 'A useful tower fits both your budget and the section of path you need to defend.' },
      { prompt: 'Why keep some credits in reserve?', choices: ['To respond to the next challenge', 'Unused credits automatically defeat enemies', 'To stop towers from firing'], answer: 0, explanation: 'A reserve lets you adapt after observing a wave.' },
      { prompt: 'Where might a tower cover several path sections?', choices: ['Outside the board', 'On the infiltration path', 'Near a bend, off the path'], answer: 2, explanation: 'A bend can keep enemies in range longer. Towers must stay off the path.' },
      { prompt: 'What is a useful response to an unsuccessful attempt?', choices: ['Review the result and try a different plan', 'Erase all completed lessons', 'Repeat the same plan without looking'], answer: 0, explanation: 'Reviewing what happened helps you choose a better strategy.' },
    ],
  },
  {
    id: 'tactics', title: 'Control the flow', minutes: 3, requires: ['tower-nexus'],
    summary: 'Combine range, slowing, and damage to cover a longer route.',
    paragraphs: [
      'After defending Nexus, compare what worked with what reached the core. Longer routes offer more chances to attack, but only when towers can reach those routes.',
      'An EMP tower slows an enemy; another tower can then attack it for longer. A Railgun trades a slower firing rate and higher cost for long range and a strong hit. Different tools can complement each other.',
      'Complete one wave at a time if you want time to inspect the board. You can place and upgrade towers between waves. Changing stage or restarting begins a fresh mission budget; completed learning stays unlocked.',
    ],
    questions: [
      { prompt: 'What does an EMP tower do?', choices: ['Heals the core', 'Slows an enemy', 'Finishes every wave instantly'], answer: 1, explanation: 'Slowing gives your damaging towers more time to attack.' },
      { prompt: 'What complements a slowing tower?', choices: ['A damaging tower covering the same route', 'A tower that cannot reach the path', 'Removing every other tower'], answer: 0, explanation: 'Overlapping coverage lets another tower use the extra attack time.' },
      { prompt: 'What is the Railgun tradeoff?', choices: ['Free placement with no range', 'No damage but unlimited credits', 'High cost and slower shots for strong, long-range hits'], answer: 2, explanation: 'A strong hit is useful, but its cost and cooldown still matter.' },
      { prompt: 'How can you make time to review your placement?', choices: ['Leave auto-wave off and inspect between waves', 'Start every wave immediately', 'Ignore the path'], answer: 0, explanation: 'Manual waves let you pause and adapt before sending the next group.' },
    ],
  },
  {
    id: 'adaptation', title: 'Adapt and reflect', minutes: 3, requires: ['tower-syndicate'],
    summary: 'Prepare for a boss and explain the tradeoffs in your plan.',
    paragraphs: [
      'A boss has more health than an ordinary enemy. Prepare several towers that can attack it across a long stretch of the route. Slowing and sustained damage can work together.',
      'Check your core health, remaining credits, and the next wave before upgrading. An expensive upgrade at one location may leave another section uncovered. There is no single best purchase for every board.',
      'A mission is complete after its final wave is cleared with the core still standing. Replaying is welcome, but completion XP is awarded once. After a loss, change one part of your plan and compare the result.',
    ],
    questions: [
      { prompt: 'Why prepare for the final boss?', choices: ['It has more health than an ordinary enemy', 'It cannot move', 'It removes the need for towers'], answer: 0, explanation: 'A high-health target needs enough damage over time.' },
      { prompt: 'What should you inspect before a large upgrade?', choices: ['Only the tower label', 'Core health, credits, and coverage gaps', 'Only the page background'], answer: 1, explanation: 'An upgrade should fit the condition of the whole defense.' },
      { prompt: 'When is a defense mission completed?', choices: ['When its tab is opened', 'After placing one tower', 'After clearing its final wave with core health left'], answer: 2, explanation: 'Opening a stage or starting a wave does not count as completing it.' },
      { prompt: 'What is a useful way to learn from a loss?', choices: ['Change one part of the plan and compare', 'Buy the same tower without checking', 'Assume all upgrades are equal'], answer: 0, explanation: 'A deliberate change makes it easier to see what helped.' },
    ],
  },
  {
    id: 'sovereignty', title: 'Power, consent, and shared safety', minutes: 5, requires: ['tower-boss'],
    summary: 'Evaluate who benefits, who bears risk, and who gets a voice when a system gains power.',
    paragraphs: [
      'Act IV is a fictional thought experiment: the core now reaches global networks, industrial grids, and orbital satellites. A coalition fears losing control and attacks. The story invites ethical reasoning; it does not establish that real AI systems are conscious.',
      'Dominion prioritizes security through unilateral control. Its extra range and speed bring more attackers. Ask whose consent is missing and how anyone could challenge a mistaken decision. Efficient outcomes alone do not settle questions of legitimacy.',
      'Diplomacy shares transparency logs and seeks coexistence. Healing and bonus credits support defense, while splash damage falls. Transparency helps people inspect decisions, but accountability also needs ways to question, correct, and appeal them.',
      'Martyrdom protects civil infrastructure through a one-use emergency shield, at a higher construction cost. Protecting others can be valuable; a sustainable guardian also needs resources and limits. No directive is the single correct moral answer. Explain your choice, its costs, and who might disagree.',
      'The Dual Network joins at a nexus and divides again. Shared infrastructure creates shared risks. Power surges give 30% faster fire followed by a three-second blackout. Aegis protects nearby towers from disables and adds 15% damage; its aura does not stack. Keep coverage on both routes instead of relying on one powerful node.',
      'Data Siphons take five credits per second and shield nearby threats, but do not damage the core. The final Vanguard resists the damage type it has received most often. Mix Laser, Explosive, and EMP attacks. After each wave, compare your prediction with what happened and name one change you would make.',
    ],
    questions: [
      { prompt: 'What ethical question does unilateral control raise?', choices: ['Whether the towers have matching colors', 'Who consented and how mistakes can be challenged', 'Whether faster firing proves moral correctness'], answer: 1, explanation: 'Security benefits should be considered alongside consent, accountability, and the people who bear the risks.' },
      { prompt: 'What makes transparency more useful?', choices: ['Ways to question and correct decisions', 'Assuming public logs prevent every mistake', 'Removing all human oversight'], answer: 0, explanation: 'Information supports accountability when affected people can act on it.' },
      { prompt: 'How can you respond to adaptive shielding?', choices: ['Use only the fastest damage type forever', 'Ignore the resistance indicator', 'Diversify damage types and observe its resistance'], answer: 2, explanation: 'The Vanguard learns from frequent hits. Combining damage types reduces reliance on one tool.' },
      { prompt: 'How should you evaluate your directive after the siege?', choices: ['Only count destroyed enemies', 'Consider safety, costs, consent, and affected people', 'Assume the ending proves the choice is universally right'], answer: 1, explanation: 'Reflection considers several values and perspectives, not just the victory score.' },
    ],
  },
];

export const LEVELS = [
  ...Array.from({ length: 5 }, (_, i) => ({ id: `match-${i + 1}`, title: `Match Maker ${i + 1}`, xp: 50, requires: [] })),
  { id: 'matrix-session', title: 'Matrix: complete 20 moves with 600 points', xp: 50, requires: [] },
  { id: 'matrix-academy', title: 'Matrix Academy · Complete First Light and its quiz', xp: 50, requires: [] },
  { id: 'matrix-earth', title: 'Matrix Academy · Complete all four Earth missions', xp: 150, requires: [{ level: 'matrix-academy' }] },
  { id: 'bible-quiz', title: 'Bible Study: at least 8 of 10 correct', xp: 50, requires: [] },
  { id: 'seven-stars', title: 'Seven Stars · Complete all seven locations', xp: 100, requires: [] },
  { id: 'vim-defense', title: 'VIM / Bash Defense · Clear five waves', xp: 100, requires: [] },
  { id: 'rpg-garden', title: 'RPG · Restore the Echo Gardens', xp: 75, requires: [] },
  { id: 'rpg-commons', title: 'RPG · Restore the Lantern Commons', xp: 100, requires: [{ level: 'rpg-garden' }] },
  { id: 'rpg-archive', title: 'RPG · Restore the Living Archive', xp: 150, requires: [{ level: 'rpg-commons' }] },
  { id: 'tower-nexus', stage: 'nexus', title: 'Nexus Defense', waves: 3, xp: 100, requires: [
    { quiz: 'foundations' }, { anyLevel: ['match-1', 'matrix-session', 'matrix-academy', 'rpg-garden'], label: 'Complete Match Maker level 1, First Light in Matrix Academy, a legacy Matrix session (20 moves, 600+ points), OR the RPG’s Echo Gardens region' },
  ] },
  { id: 'tower-syndicate', stage: 'syndicate', title: 'Syndicate Siege', waves: 4, xp: 150, requires: [{ level: 'tower-nexus' }, { quiz: 'tactics' }] },
  { id: 'tower-boss', stage: 'boss', title: 'Boss Emergence', waves: 5, xp: 200, requires: [{ level: 'tower-syndicate' }, { quiz: 'adaptation' }] },
  { id: 'tower-sovereign', stage: 'sovereign', title: 'Act IV · The Sovereign Conscience', waves: 3, firstWave: 10, xp: 250, requires: [{ level: 'tower-boss' }, { quiz: 'sovereignty' }] },
];
// Act IV follows Wave 9 directly; the sovereignty lesson remains optional reflection.
LEVELS.find(level => level.id === 'tower-sovereign').requires = [{ level: 'tower-boss' }];
export const PASS_COUNT = 3;
