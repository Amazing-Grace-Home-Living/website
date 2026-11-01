# Matrix of Conscience: The Signalkeepers

A playable, self-contained learning RPG at `/arcade/matrix-of-conscience/`.
This adds a story campaign alongside the Matrix match-three game and the existing
Learn & Play defense missions. No AI API, remote service, or new runtime dependency
is required. The map and decoration use native SVG and CSS.

## What students can play

Choose a Navigator, Archivist, or Mediator identity. Every role has access to the
same challenges and hints; changing role never erases learning checkpoints.
Explore three regions, each with three preparation quests and one guardian.
The guardian opens only after the other quests in its region are completed.

| Region | Activities | Learning focus | Story reward |
| --- | --- | --- | --- |
| Echo Gardens | Recall four symbols, repair number patterns, make a community choice, check an energy budget | Observation, arithmetic, reading, perspectives | Echo Prism |
| Lantern Commons | Plan a keyed route, check a supply ledger, respond to an uncertain claim, evaluate evidence | Spatial planning, budgeting, source reasoning | Wayfinder Lantern |
| Living Archive | Reverse a five-symbol sequence, collect two route keys, choose a governance plan, restore the Core | Flexibility, revision, retrieval, ethical reflection | Conscience Compass |

The encounters are turn based. Correct responses restore guardian signals;
incorrect responses provide explanations and consume fictional resolve. Losing
an encounter resets that encounter, preserving completed quests. Every question
also has a hint. Memory clues stay visible until the student chooses to hide them,
and can be reviewed freely. Route puzzles offer undo and reset without penalty.

The three story decisions have distinct consequences and reflection prompts.
Every alternative earns the same completion XP. The journal and ending retain
the first chosen alternative; replay can explore another outcome without changing
the recorded story. Reflections can be considered privately or discussed with a
class. The app does not request or store free-text personal reflections.

## Rewards and LMS connection

Quest XP totals 410 for the twelve quests. Character level is derived from earned
quest XP, not from speed or number of attempts. Relics are story rewards, not
shortcuts past questions. The skill panel counts completed activity types; it is
not a measurement of intelligence, personality, or clinical ability.

Restored regions award one-time Learn & Play milestones:

- `rpg-garden`: 75 campaign XP; an alternative Nexus practice prerequisite.
- `rpg-commons`: 100 campaign XP; requires the garden milestone.
- `rpg-archive`: 150 campaign XP; requires the Commons milestone and earns the
  Signalkeeper badge.

Nexus still requires the Foundations quiz. RPG quest XP and campaign XP are labeled
separately. Repeating quests or reloading the ending does not award extra XP.
Starting a new RPG resets the adventure only; previously earned campaign
milestones remain earned.

## Architecture and expansion

`src/game/matrix-rpg/content.js` defines the roles, regions, reading, questions,
routes, story alternatives, and reflection prompts. Content currently practices
basic arithmetic and reasoning; adjust reading and difficulty for the intended
students before classroom rollout.

`engine.js` validates activity proofs, prerequisite chains, rewards, and versioned
local saves. `ui.js` owns ephemeral activity state. A checkpoint is saved when a
quest completes; leaving an unfinished activity restarts that activity. This is
stated in the interface. Browser storage failures allow in-tab play with a visible
warning. Unknown quest IDs, impossible completions, and malformed saves are
discarded. Storage events reload the latest map when another tab changes a save.

To add content, define a stable quest ID, chapter, activity type, learning goal,
completion proof, feedback, and story reward. Keep preparation quests before the
guardian in content order. Add any new chapter milestone to the shared learning
catalog in dependency order, and test normalization of old saves. Existing activity
types are `memory`, `questions`, `choice`, `route`, and `guardian`.

Recommended next expansions are multiple question variants, a science investigation
with observations to compare, a vocabulary dialogue quest, and a cooperative
resource-planning mission. Give each a meaningful role in the story rather than
inserting unrelated quizzes between actions. Student playtesting should assess
enjoyment, comprehension, and reading load before increasing the campaign size.

This is a browser-local learning prototype. Account sync, teacher dashboards,
server-verified assessments, multiplayer, and curriculum-specific question packs
are future work. No account or cloud sync is implied by the current saves.

## Verification

- `npm run build`
- `npm run test:rpg` (RPG rules and campaign integration)
- `npm run test:learning` (includes the RPG rules tests)
- `npm run test:rpg:browser` (after the build; installed Edge by default)

The browser test completes all twelve activities through actual UI interactions,
including a missed recall, guardian defeat/retry, route movement, story branches,
replay, checkpoint reload, mobile layout, LMS unlock, isolated RPG reset, blocked
storage, and corrupt-save recovery. Screenshots are saved under `artifacts/`.
