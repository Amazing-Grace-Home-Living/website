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
