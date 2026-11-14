# Matrix Academy: verified gameplay improvements

The Earth campaign remains at `matrix_of_consciousness_match_3_game.html`.
Its authored lessons and four-mission structure are preserved. The following
changes repair regressions introduced when the earlier standalone match-three
game was expanded into the Academy.

## Correctness and learning flow

- Input locks while cascades resolve and while mission quizzes are open.
- Restart clears pending cascade timers and old quiz callbacks, selected cells,
  decision state, particles, awareness, and integrity.
- Starting and settled boards always offer a legal move. Recovery costs no moves
  or points, and a bounded generator includes a guaranteed-playable fallback.
- Every displayed objective is enforced: points, successful swaps, stars, and
  cascade depth. A score threshold alone no longer completes a mission.
- Quizzes occur at a settled mission checkpoint rather than interrupting cascades.
  Incorrect answers provide feedback and require retry. Mission rewards follow
  the knowledge checkpoint, with one-time question and mission XP.
- Completed campaigns remain completed after reload. The interface links back
  to the arcade instead of replaying the final mission for repeated rewards.
- Existing version-2 local profiles are validated; malformed lists and unknown
  badge content are excluded. Player-provided strings are not inserted as badge HTML.
- Narrative generation is labeled as local preset text rather than a Gemini call.

## Accessibility and rendering

Keyboard play uses Tab, arrows, Enter/Space, and Escape with a single roving tab
stop on the board. Free hints highlight a real legal swap and announce its
coordinates. Keyboard focus returns to the board after a cascade when appropriate.
Instructions collapse on small screens, and browser zoom remains available.

`matrix-academy.css` supplies the critical layout, colors, grid, dialogs, and hidden
states without CDNs. Symbol fallbacks and text console labels work without Lucide.
Existing CDN assets load asynchronously and can enhance the presentation but are
not required to play. Startup does not wait for those downloads, and no font import
blocks the game script. A browser test holds CDN requests pending while using hints.

Selection updates reuse the 49 gem buttons when the board has not changed. Particle
animation schedules frames only while effects exist, respects reduced motion, and
uses cell positions relative to its canvas. Activity logs append entries and retain
at most 100 instead of repeatedly rebuilding an ever-growing HTML string.

## Difficulty check

The old third and fourth missions offered 2,500 points in 16 moves with a 3-combo,
and 4,000 points in 15 moves with a 5-combo. A seeded simulation of 40 random-legal
playthroughs won 4 third missions and no fourth missions.

The revised campaign keeps an easy introduction and a progressively harder finish:

| Mission | Points | Moves | Additional goal | Wins in 100 seeded simulations |
| --- | ---: | ---: | --- | ---: |
| First Light | 500 | 20 | 3 successful swaps | 100 |
| Moon of Wisdom | 1,200 | 18 | 5 star gems | 83 |
| Flame of Courage | 1,800 | 24 | 3-combo | 74 |
| Nexus Gateway | 2,500 | 28 | 4-combo | 56 |

Run `node scripts/simulate-matrix.mjs 100` to reproduce the post-change sample.
The simulation shuffles adjacent swaps and chooses a legal move, resolves actual
matches and gravity, and checks every objective. It is not a student study; classroom
playtesting remains necessary to evaluate enjoyment, reading load, and accessibility.

## Shared learning rewards

First Light plus its quiz records `matrix-academy` (50 shared campaign XP), which
can meet the Nexus practice requirement. Passing Foundations is still required.
Completing all four Earth missions records `matrix-earth` (150 additional shared
XP) and the Earth Academy guardian badge. Both award once. Legacy 20-move session
milestones remain valid; they are not silently reinterpreted as Academy completion.

The Academy passport has its own XP totals: 550 mission XP plus up to 250 one-time
question XP. This is distinct from the 200 shared campaign XP. These are local
practice achievements, not server-verified certification.

## Verification

- `npm run test:learning`: all learning-game logic, including eleven Academy cases.
- `npm run build`: static site output including the Academy fallback stylesheet.
- `node tests/matrix-academy-browser.mjs`: actual browser checks with all external
  HTTPS resources blocked; keyboard play, stable selection nodes, decisions,
  hints, restart during a cascade, mission fixtures finished through real swaps,
  every quiz, wrong-answer retry, reload/no-repeat rewards, saved completion,
  LMS integration, bounded logs, idle effects, and mobile layout.
- `npm run test:learning:browser`: existing campaign integration regression check.

The Academy browser test uses nearly complete board fixtures for mission completion;
the simulation above exercises full move budgets separately. Screenshots are saved
under `artifacts/matrix-academy-desktop.png` and `artifacts/matrix-academy-mobile.png`.
