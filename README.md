# Nexus OS

Static website for amazinggracehl.org: arcade games, Learn & Play, shared local progress, stories, music, and Tampa room listings.

## Develop and verify

- `npm ci` installs the test tools.
- `npm run build` generates `dist/`, including property galleries and public provider guides.
- `npm run dev` or `npm run preview` serves that build at http://127.0.0.1:4173.
- `npm test` runs game logic and local-companion tests.
- `npm run test:browser` checks the website, puzzles, media and listings.
- `npm run test:vim-defense:browser` checks keyboard, mouse, multi-touch and the complete defense campaign.
- `node tests/release-browser.mjs` checks local-AI reset behavior and mobile navigation.
- `npm run audit:links` checks local HTML links.

Browser tests require installed Chrome or Edge. Individual test scripts support `CHROME_PATH` or `PLAYWRIGHT_CHANNEL`. Build before running browser tests.

## Publish

The connected Vercel project is `amazing-grace-home-living`. It builds this repository with `npm run build` and serves only `dist/`. Production domains include https://amazinggracehl.org and https://www.amazinggracehl.org. Keep local credentials, host applications, temporary review copies and test screenshots outside the static output.

## Optional local companion

The separate Grace Remote companion is launched with `npm start` or `node bridge.mjs --cwd PATH`. It listens on loopback and requires its connection token. It is not a public backend for the website and is not included in the static output.

[Companion setup notes](docs/grace-remote.md) describe that separate application; references there to a hosted Site or companion downloads are not features deployed by this website build. [Mobile host access](MOBILE-ACCESS.md) covers the optional Windows launcher.

[Defense controls and checkpoints](arcade/vim-defense/README.md) document Vim/Bash Defense. Site progress stays in the browser unless the user explicitly exports and restores a learning passport.
\n<!-- ESLint v9 upgrade recorded for first release -->
