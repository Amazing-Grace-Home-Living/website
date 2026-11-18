# Repository instructions for contributors and coding agents

## Product and ownership
- This repository publishes the **Amazing Grace Home Living** static website (rooms, arcade, LMS, library and community resources). Keep the rental experience primary on the homepage.
- The production deployment is **Vercel**, building `dist/` with `npm run build`. Cloud Run is an optional static-only target; Firebase Hosting is a manual fallback.
- The `bridge.mjs` Grace Remote companion, host credentials and local vault are **not public backend features**. Never expose, package into `dist/` or serve them from Cloud Run.

## Workflow
1. Read `README.md`, `docs/deployment.md`, and the relevant feature README before editing.
2. Work from a topic branch; avoid force-pushing to `main` or rewriting history.
3. After changes run `npm ci`, `npm run check`, and `npm run audit:links`; run `npx playwright test` for layout/navigation changes when Chromium is available.
4. Review accessibility (keyboard navigation, mobile menu, descriptive link text, contrasts and image alt text).
5. Do not invent rental availability, prices, amenities, reviews, or third-party integrations; confirm source data before changing property claims.
6. Keep secrets in provider-managed secret stores. Never commit tokens, keys, service-account JSON, account data or host credentials.
7. Storage and Firestore rules must be least-privilege. Security-rule changes require separate Firebase rule deployment; GitHub Hosting Actions do not deploy them.
8. Do not confuse `public/` (input assets) with `dist/` (generated output). Edit source files, never generated output directly.
9. Do not add automatic deployments to extra providers without a documented need and isolated credentials.

## Review priorities
- Security and privacy regressions
- Broken routes, missing assets, build failures
- Accessibility and mobile layout
- Game functionality and persisted progress
- Deployment correctness and clear documentation

## Arcade and downloadable tools
- VIM Defense's shipped entrypoint is `arcade/vim-defense/index.html`; its canonical logic lives in `src/game/vim-defense/engine.js` and `ui.js`. Do not recreate a separate React/Next.js Vim Defender—the static build does not use Next.js.
- Run `npm run test:vim-defense` after changes to scoring, quiz rewards, checkpoints, controls, or drones. For browser interactions use `npm run test:vim-defense:browser` after building.
- Game launch cards live at `arcade/index.html`. Point each card to an existing playable route, not a placeholder or a preview.
- The Chrome extension source is `chrome-extension/NexusToolboxExtension/`; `scripts/package-extension.mjs` generates `dist/downloads/NexusToolboxExtension.zip`. Never commit a stale binary ZIP. Keep the manifest at the archive root, use a module service worker, and never store provider tokens in browser storage.
- `npm run check` verifies the generated site's critical internal routes and published extension artifact. Keep this check when changing asset copy rules or site navigation.
