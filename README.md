# Amazing Grace Home Living — Match Maker

A standalone, responsive match-three arcade game migrated from the original Amazing Grace engine.

## Run locally

Requires Node.js 20 or newer.

```sh
npm ci
npm test
npm run dev
```

Open http://127.0.0.1:4173. Tap neighboring tiles, swipe, or use arrow keys to focus and Enter/Space to select. Match 3+, reach each target within the move limit, and complete five levels. Hints are free; invalid swaps cost no moves. Dead boards automatically regenerate without spending a move. Four-gem lines, five-gem lines, and T/L matches create specials, which activate when matched and chain through other specials.

Progress and badges save locally after settled turns. Restart resets only the current level. Corrupt or incompatible saves start a fresh game; unavailable storage allows play without persistence. Saves are device/browser specific. No account, backend, or cloud leaderboard is required.

## Build and deploy

```sh
npm run build
npm run preview
```

The build produces a static site in `dist/`. For Vercel, import this repository, select Other as the framework, set the build command to `npm run build`, and output directory to `dist`. No environment variables are needed. The app uses root-relative asset URLs and expects hosting at the domain root. No production deployment is created by these commands.

## Verification

`npm test` covers engine behavior, special chains, playable boards, and save validation. `npm run test:browser` starts its own local server and checks the rendered game in desktop Chrome and a mobile viewport. Browser checks require Google Chrome installed locally, or `CHROME_PATH` set to a Chromium executable.

The older UI was rewritten around the exported engine to avoid missing imports and incompatible match formats. Two consolidated stories are available in `stories/`. The music section at `audio-library/` preserves six MP3s with playback/downloads and fourteen MIDI downloads. The rental, gallery, contact, and remaining website sections have not been migrated. Daily challenges and cloud leaderboards are not included in this arcade release.

## Professional profile

`/nicholai/` presents Nicholai Maro Madias's platform engineering and IAM experience, skills, education, and contact links. `/profile` redirects to this page on Vercel; `/profile/` also includes a static redirect fallback. The homepage navigation links to the profile. Content and styles live in `nicholai/`, alongside the corrected Word resume offered for download. Update the page and downloadable resume together when experience changes.

## Rental listings

`/listings/` includes 118 S San Remo Ave in Clearwater ($900/month) and 926 E Poinsettia Ave in Tampa ($850/month), their SmartScreen application links, and separate photo galleries. Listing text is maintained in `listings/index.html`; gallery files are in `assets/Tampa/` and `assets/Clearwater/`. Each gallery is synchronized from its own folder on every build. The static preview uses port 4173 by default; browser checks use 4174 to avoid interrupting an existing preview.
