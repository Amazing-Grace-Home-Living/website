# Learn & Play campaign

Open `/arcade/` for the game catalog and `/lms/` for lessons and unlocks. Run
`node scripts/build.mjs` to include both routes in the static site, then
`node scripts/serve.mjs dist` for a local preview. These commands do not deploy.

## Progression

1. Pass Foundations with at least 3 of 4 correct, and complete Code Matrix
   level 1 or restore the RPG’s Echo Gardens region at
   `/arcade/matrix-of-conscience/`. Previously earned Matrix Academy and legacy
   Matrix session milestones remain valid.
2. Clear the three-wave Nexus mission to open Tactics.
3. Pass Tactics to open the four-wave Syndicate mission.
4. Clear Syndicate to open Adaptation, then pass its quiz to open the five-wave
   Boss mission. Its final wave includes a high-health boss.

All quizzes have untimed reading, feedback, unlimited retries, and a retained best
score. Completed levels and quizzes award completion XP only once. Replay does not
remove earned milestones. Bible Study at 8/10 is an optional 50-XP milestone and
does not replace a strategy prerequisite. Tower vault points are separate from
learning XP; purchases cannot unlock quizzes or stages.

## Design review and expansion

Code Matrix is the single optional matching puzzle. Its five levels award 50
one-time Signal Bonus credits each for Matrix Defense towers and drones. The older
Matrix Academy match-three route now hands off to Code Matrix; existing validated
Matrix Academy and standalone session milestones remain valid. Legacy Matrix
passport data remains exportable for progress continuity.

VIM / Bash Defense at `/arcade/vim-defense/` adds an optional five-wave arena
challenge with Vim-style movement, independent keyboard/mouse weapons, and drones.
Bash mode offers two questions between waves for one-time bonus drone charges;
arcade mode skips the quizzes. Clearing either mode awards the `vim-defense`
milestone (100 campaign XP) and Home row defender badge once. The game never
executes shell commands. See `arcade/vim-defense/README.md` for controls,
checkpoint behavior, source references, and verification commands.

The Matrix of Conscience RPG now adds three regions and twelve quests covering
recall, route planning, arithmetic, evidence, and story choices. Its 75/100/150-XP
region milestones share this campaign’s storage and award once. Quest XP inside
the RPG is separate. See `arcade/matrix-of-conscience/README.md` for content design,
checkpoint behavior, expansion guidance, and browser verification.

The previous defense engine offered unrestricted stage switching and infinite
waves, with no completion contract shared with quizzes. The campaign now uses a
single prerequisite catalog and finite, replayable missions. The same rules drive
the LMS cards and the actual defense start and placement handlers, including direct
visits to locked URLs. Resets clear pending spawns, auto-wave timers, projectiles,
health, and the mission budget. Fixed simulation steps avoid refresh-rate-dependent
enemy movement. Splash and chain kills correctly remove defeated enemies.

Keep new content in `src/game/learning/curriculum.js`. Add a lesson ID, reading,
questions and explanations; add a level ID, XP, and prerequisite records. Quiz
and level IDs must be stable. Add new mission completion hooks only at the actual
win condition. Extend the progression normalizer's curriculum ordering if adding
a new dependency pattern; include tests for impossible chains and migration.

Recommended next level types are a route-planning puzzle after a planning quiz,
a resource-allocation challenge after a budgeting lesson, and a retrieval-practice
boss review. Give each an explicit learning goal, observable completion condition,
retry path, and prerequisite explanation. Avoid making spending, speed, or repeated
grinding a substitute for understanding. Keep an ungated practice route available.

Progress is versioned and stored under `amazing-grace-learning-v1` in localStorage.
Existing validated Match Maker saves are migrated into milestones. The old
`arcade/grace-nexus-progress.json` is not loaded automatically: a downloaded file is
not evidence of the new quiz results. Unknown or impossible progress is discarded.
Storage failures keep in-tab progress and show a warning that cross-page unlocks
cannot persist. Different origins and browsers have separate progress.

This is a personal learning prototype, not server-verified assessment. Add learner
accounts, server-side attempt validation, and instructor reporting before using it
for certification or shared leaderboards. No API service or AI credentials are
needed for this campaign.

## Verification

The LMS offers a Learning Passport download and previewed merge restore at
`/lms/#progress-tools`. Files contain only allowlisted records: the learning
campaign, Matrix RPG, Code Matrix board, VIM Defense checkpoint and review history,
PowerShell Academy, legacy Matrix Academy passport, Signal Bonus rewards, and Seven
Stars. A chosen Academy player name may be included. Unrelated browser
storage, credentials, active combat frames, tower loadouts, and currencies are
excluded. Files stay in the browser; there is no upload endpoint.

Selecting a file only previews its changes. Applying re-reads current progress,
unions completed activities, keeps higher counters and scores rather than adding
them, and preserves local choices and active VIM checkpoints. Re-importing the
same file awards no additional XP. Invalid known records reject the file. Failed
writes roll back prior values where browser storage permits; an incomplete rollback
is reported explicitly. Close or reload other game tabs after restoring. VIM pauses
and prevents stale writes, while Match Maker cancels outstanding cascades when
another tab replaces its saved board. Restore reloads the LMS to refresh caches.

Next-step guidance recommends unlocked lessons and missions from saved progress.
Seven Stars now records a shared milestone after all seven locations are completed.
These records remain editable local learning aids, not verified certification.

`npm run test:progress` checks validation, merge rules, rollback, idempotence,
storage deletion, and guidance. After building, `npm run test:progress:browser`
checks download, preview/cancel/apply, fresh-progress merging, cross-tab protection,
mobile layout, and the absence of uploads.

`node --test tests/learning.test.mjs tests/tower-defense.test.mjs tests/match3.test.mjs tests/progress.test.mjs tests/matchmaker.test.mjs`

After a build, `node tests/learning-browser.mjs` exercises quiz retries, a real
puzzle win from a nearly completed fixture, the entire defense campaign using
actual combat simulation, replay XP, deep-link locks, mobile layout, and blocked
storage. It uses installed Edge by default; set `PLAYWRIGHT_CHANNEL` to another
installed Chromium browser channel if needed. Screenshots go to `artifacts/`.
