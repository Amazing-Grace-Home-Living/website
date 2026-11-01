# VIM Defense / Bash Academy

Play at `/arcade/vim-defense/`. The game is an arena shooter with five finite waves,
not a shell or editor emulator. It complements the separate PowerShell Defense
tower-defense game; its files and hub entry are preserved.

## Controls

| Input | Action |
| --- | --- |
| `h` / left arrow | Move left; face left |
| `j` / down arrow | Move down; face down |
| Up arrow | Move up; face up |
| `l` / right arrow | Move right; face right |
| Hold Space | Fire the primary weapon along the last movement direction |
| `b` / `k` / `d` or right-click | Deploy one auto-targeting drone |
| `a` | Toggle keyboard target assist for the support stream |
| `i` / Enter | Start/select/resume; activate a focused briefing button |
| Mouse move, then hold left button | Aim and fire an independent second stream |
| Escape | Pause/resume while the arena is focused |

Tab or click into the arena to use game keys. In the briefing, `h/k` select the
previous enabled button and `j/l` select the next; arrow keys work too. `i` and
Enter activate the selected control. These bindings do not replace normal typing
or browser navigation elsewhere on the page. Touch controls support simultaneous
movement and firing. Touching the arena aims and fires the second stream.

Target assist is optional and off by default. While enabled, holding Space fires
the directional primary weapon plus a support stream aimed at the hostile nearest
the core. Mouse/touch firing takes priority over assisted aiming. The target is
marked by a green crosshair. The preference persists across runs, retries, and
reloads; enabling it does not reduce completion rewards.

The game pauses when the browser loses focus, the document becomes hidden, or
focus moves from the game to outside navigation. Held input is cleared on blur,
pause, wave transitions, pointer cancellation, and restart to avoid stuck movement
or firing. Physics use fixed simulation steps; diagonal movement is normalized.

## Modes and educational rewards

The default **Bash Defense** mode offers two questions between each pair of waves.
The **VIM Defense** mode skips the quizzes and offers the same five-wave combat.

Twenty-four authored Bash cards cover paths, `pwd`, `cd ..`, variable assignment,
quoting, pipelines, `read`, exit status, `&&`, and `||`. Each run selects eight cards:
two from each of four topic pools. Missed cards take priority, followed by cards
not encountered yet; ties are shuffled. They are original practice questions
based on standard Bash behavior described in the
[GNU Bash Reference Manual](https://www.gnu.org/software/bash/manual/bash.html).
The examples are text only: nothing is executed, no terminal is embedded, and no
credentials or API calls are needed.

The Bash field-notes deck can be filtered by topic, unseen cards, or latest misses.
Opening it pauses combat. Each card reveals its answer and explanation. Viewing
notes is free and does not award drones or XP. Encounter counts and latest responses
are saved locally to support review; they are practice history, not a proficiency
grade. A repeated click or briefing reload does not add another recorded encounter.

A correct first response awards one bonus drone charge, up to eight in reserve.
The answer and awarded bonus are stored in the wave checkpoint. Re-answering or
reloading a briefing cannot award the same bonus twice. Incorrect responses show
an explanation and the correct option; students may continue or skip. Every next
wave still grants one standard charge, up to 15 core restoration, and up to 20
hull restoration. Quizzes are a bonus, not a prerequisite for continuing.

Up to three deployed drones can orbit the player and shoot automatically for 14
seconds each. Deployed drones expire at wave end; unused reserve charges carry
forward. The fifth wave includes a large hostile. Breaches reduce core or hull;
shooting hostiles earns score. A breached hostile never awards kill points.

Clearing all five waves in either mode records the `vim-defense` Learn & Play
milestone, worth 100 campaign XP and the Home row defender badge. It awards once.
It does not replace the Foundations quiz or certify Bash proficiency.

## Checkpoints and implementation

Code lives in `src/game/vim-defense/`:

- `content.js`: waves, keyboard aliases, authored quiz prompts and explanations.
- `engine.js`: DOM-independent combat, quiz rewards, and checkpoint validation.
- `quiz-bank.js`: question pools, saved-plan validation, review prioritization, and
  sanitized local response history.
- `ui.js`: input, rendering, local persistence, menus, and LMS integration.
- `defense.css`: responsive layout and touch controls.

LocalStorage key: `amazing-grace-vim-defense-v1`. Checkpoints save before starting
a wave and after each quiz action. Reloading restores the checkpoint, not an exact
live combat frame. Retry restores the pre-wave budget and health. Starting a new
run replaces the checkpoint while keeping best scores and campaign completion.
Active combat entities and held controls are never restored. Malformed saves are
ignored. If storage is blocked, the game continues in the current tab with a clear
warning. No account sync or server-verified scoring is implied.

The record key remains compatible with existing installs. Version-1 checkpoints
migrate to the original eight-card plan, preserving already-issued rewards. New
version-2 checkpoints include the exact selected card IDs and result-to-card
associations; reloads never reshuffle a live run. Keep existing card IDs and option
meanings stable when expanding content.

Canvas animation runs continuously only during active combat. Pausing, reading a
briefing, or sitting at a menu stops the recurring animation loop; state and pointer
changes can request a single redraw. Resuming resets the simulation clock so idle
time is not replayed as a burst of combat updates.

## Verify and preview

```text
npm run test:vim-defense
npm run build
npm run test:vim-defense:browser
node scripts/serve.mjs dist
```

Browser tests use installed Edge by default; `PLAYWRIGHT_CHANNEL` can select another
installed Chromium channel. They exercise real keyboard and mouse controls,
simultaneous firing streams, selection keys, quiz navigation, reload/bonus safety,
wrong-answer feedback, all five combat waves, the LMS milestone, VIM-only mode,
mobile layouts, real two-finger touch controls, and blocked storage. Screenshots
are written to `artifacts/vim-defense-desktop.png` and `artifacts/vim-defense-mobile.png`.
The expanded check also verifies stable question plans, review filters, persisted
target assist, and zero idle redraws after the pause overlay settles. Field-note
review on mobile is captured in `artifacts/vim-defense-review-mobile.png`.

## Verification of the expanded flow

Story: a student enters from the arcade, plays with keyboard or pointer controls,
answers a varied Bash briefing, reloads its saved checkpoint, reviews missed cards,
finishes the run, and sees the one-time learning reward.

| Boundary | Evidence |
| --- | --- |
| Static server → UI | Browser reached the arcade, game route, JS modules, and stylesheet without local HTTP errors |
| Controls → combat | Actual h/arrows, Space and mouse crossfire, d, a, i/Enter, Escape, and two-finger touch checks passed |
| Quiz → saved data | The exact plan and bonus charge survived reload; response counts did not repeat |
| Saved data → review | Needs-review filter displayed the missed card and its explanation without a reward |
| Combat → LMS | Five waves completed and the shared milestone/badge appeared with 100 XP |
| Paused UI → rendering | Draw-call counter remained at zero after the pause overlay settled |
| Legacy data → new schema | Logic test migrated a version-1 checkpoint to its original questions without another bonus |

This feature has no server API, environment-variable dependency, or external model
service. Combat, question selection, and local saves run in the browser; the server
serves static files. New code does not execute Bash examples.
