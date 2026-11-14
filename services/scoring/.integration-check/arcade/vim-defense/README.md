# VIM Defense / Bash Academy

Play at `/arcade/vim-defense/`. The game is an arena shooter with five finite waves,
not a shell or editor emulator. It complements the separate PowerShell Defense
tower-defense game; its files and hub entry are preserved.

## Controls

| Input | Action |
| --- | --- |
| `h` / left arrow | Move left; face left |
| `j` / down arrow | Move down; face down |
| `k` / up arrow | Move up; face up |
| `l` / right arrow | Move right; face right |
| Hold Space | Fire the primary weapon along the last movement direction |
| `d` | Deploy one auto-targeting drone |
| `i` / Enter | Start/select/resume; activate a focused briefing button |
| Mouse move, then hold left button | Aim and fire an independent second stream |
| Escape | Pause/resume while the arena is focused |

Tab or click into the arena to use game keys. In the briefing, `h/k` select the
previous enabled button and `j/l` select the next; arrow keys work too. `i` and
Enter activate the selected control. These bindings do not replace normal typing
or browser navigation elsewhere on the page. Touch controls support simultaneous
movement and firing. Touching the arena aims and fires the second stream.

The game pauses when the browser loses focus, the document becomes hidden, or
focus moves from the game to outside navigation. Held input is cleared on blur,
pause, wave transitions, pointer cancellation, and restart to avoid stuck movement
or firing. Physics use fixed simulation steps; diagonal movement is normalized.

## Modes and educational rewards

The default **Bash Defense** mode offers two questions between each pair of waves.
The **VIM Defense** mode skips the quizzes and offers the same five-wave combat.

Eight authored Bash questions cover `pwd`, `cd ..`, variable assignment, quoting,
pipelines, `read`, exit status, and `&&`. They are original practice questions
based on standard Bash behavior described in the
[GNU Bash Reference Manual](https://www.gnu.org/software/bash/manual/bash.html).
The examples are text only: nothing is executed, no terminal is embedded, and no
credentials or API calls are needed.

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
- `ui.js`: input, rendering, local persistence, menus, and LMS integration.
- `defense.css`: responsive layout and touch controls.

LocalStorage key: `amazing-grace-vim-defense-v1`. Checkpoints save before starting
a wave and after each quiz action. Reloading restores the checkpoint, not an exact
live combat frame. Retry restores the pre-wave budget and health. Starting a new
run replaces the checkpoint while keeping best scores and campaign completion.
Active combat entities and held controls are never restored. Malformed saves are
ignored. If storage is blocked, the game continues in the current tab with a clear
warning. No account sync or server-verified scoring is implied.

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
