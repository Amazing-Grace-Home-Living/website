# Connected learning review

## User experience requirements

| Requirement | Implementation | Verification |
|---|---|---|
| Debug the current experience | Repair broken dev command, stale hosted assistant/ZIP references, unnecessary Codex startup, Windows-specific session fixtures, and unsafe preview dotfile access | Full Node suite plus preview/console browser checks |
| Improve design and accessibility | Responsive shared lesson reader, visible progress, semantic fields, keyboard controls, retry feedback, local-first learning, explicit connection/lock state | Native extension, 390px browser, blocked storage, keyboard and page-error checks |
| Expand educational stories and content | Six three-paragraph stories, eighteen knowledge checks, reflection alternatives, official references, arcade practice links; preserve existing curricula | Journey content/grade tests and full mastery playthrough |
| Integrate LMS and arcade | Story XP feeds shared profile without duplicating rewards; practice reaches real games; Matrix XP classified correctly; Seven Stars gains a real shared milestone | Profile projection, gameplay event, legacy save, reward and reading checks |
| Integrate sidebar and LMS | Same generated content, reader and grader; account-owned companion sync merges IDs/counters; extension works offline | Actual unpacked Edge extension → authenticated bridge → file → LMS → game → profile → sidebar |
| Apply build-agents skill | Keep the established companion stack; add a bounded read-only learning coach with explicit provider selection and no command or reward tools | Context/secret/bounds unit checks and mock-backed browser reply |

## Evidence baseline

The initial npm test run had 96 passing and 3 failing cases. One file imported a hosted Worker that is absent from this repository. Two tests forced Linux permission semantics on a Windows filesystem. The current implementation uses the actual companion APIs and native-platform protection fixtures; production session protection was not relaxed.

The console also linked to a nonexistent companion ZIP and offered an unavailable hosted AI path. These are replaced by accurate local repository setup and working learning routes. No hosted deployment or new external account key is claimed.

## Architecture

- Public curriculum: src/game/learning/journeys/content.js.
- Shared grading and normalization: journeys/model.js. Six ordered lessons, 10 XP per new correct answer, 30 XP per newly mastered lesson, 360 maximum journey XP. All three answers must be correct in one attempt for mastery.
- Shared reader: journeys/view.js, generated with content/model/CSS into assets/Tools/learning by scripts/sync-learning-assets.mjs. Build regenerates the files; a parity test detects drift.
- Shared XP projection: src/game/academy/profile.js. Journey progress is additive; existing RPG quest/region rewards retain their duplicate-safe rule.
- Host persistence: learning-store.mjs. One per-workspace JSON file under ~/.grace-remote/learning, with atomic, serialized writes. The filename is a hash of the absolute workspace path.
- Learning routes: authenticated /api/learning, /sync, /quiz, /models, and /coach. Unknown learning paths do not start Codex.
- Coach: learning-coach.mjs retrieves only the selected public lesson and IDs-only progress. It does not receive arbitrary files, chats, or an execution tool. Provider calls are explicit; local and cloud backends never silently substitute for each other.

## Sync contract

Sync is explicit and personal, not a cloud account service. It includes a bounded player alias, known completion IDs, and numeric counters; it does not collect free-text reflections. Sidebar progress is local until connected; browser game progress remains on its origin until the user connects the LMS sync control. The host uses one canonical normalized snapshot. Completion IDs and quiz results merge monotonically. Highest packet counters are retained instead of summing repeated imports. Conflicting story choices retain the host’s existing choice. Live boards, game positions, reflection text, and chat transcripts do not sync.

The sidebar accepts only a loopback companion URL and keeps the session token in memory. The LMS detects the companion origin or lets the user choose a loopback URL. A separate static origin must be explicitly named with --learning-origin; it is limited to learning APIs, not host task/approval endpoints. Neither sync nor the coach accepts provider secrets in the progress body. Provider keys still belong in the host credential wizard/vault.

Browser storage failures preserve in-tab learning and show a visible warning. Corrupt or future host progress files are not automatically overwritten. These are local practice achievements, not accredited certification or tamper-resistant grades.

## Serving and compatibility

The companion now serves canonical /lms/, /arcade/, /src/game/ and /matchmaker/ assets. The root remains the companion console; game links to root are adapted to /matchmaker/ on that origin. Only approved public asset types and real paths inside the repository are served. Dotfiles and backend modules are excluded.

The console and new learning pages retain self-hosted script policies. Two audited legacy pages (Matrix Academy and Bible Study) still require their existing inline script model; their game-specific policy permits it, and optional Tailwind/icon CDN scripts are removed from companion responses. Seven Stars is converted to external module code and semantic controls. No permission/approval policy or provider secret boundary is relaxed.

## Commands

Run from the repository folder:

~~~powershell
npm.cmd test
npm.cmd run test:integration
npm.cmd run test:integration:browser
npm.cmd run dev
node bridge.mjs --cwd . --extension-id YOUR_EXTENSION_ID
# Optional separate static preview access to learning APIs only:
node bridge.mjs --cwd . --extension-id YOUR_EXTENSION_ID --learning-origin http://127.0.0.1:4173
~~~

Open /lms/journeys/ on the companion or preview. In the extension, use Learn & Play before or after connecting. To use the coach, select a configured provider/model; the browser test mocks model output and does not make a live billed API request.

## Completion audit

A green unit suite alone does not prove the goal. Completion requires the native extension flow, host persistence/reload, lesson mastery/replay, actual arcade checkpoint, shared profile and sidebar refresh, explicit-origin restrictions, blocked-storage behavior, mobile layout, console connection without Codex, and the existing arcade regression checks. Test artifacts and final command results are the evidence for these gates.
