# Amazing Grace Home Living

The source for **[amazinggracehl.org](https://www.amazinggracehl.org/)**: Tampa Bay room listings, an interactive arcade, Learn & Play lessons, a media library, and community resources. The homepage prioritizes rooms; the arcade and LMS are intentionally separate destinations.

## Quick start

Requires Node.js **22+** and npm.

```bash
npm ci
npm run build
npm run dev             # http://127.0.0.1:4173
```

The build creates `dist/`. It copies only the public site; **do not** expose the separate private Grace Remote companion or local credentials as website routes.

## Quality checks

```bash
npm run check           # ESLint, Node unit tests, static build, TypeScript
npm run audit:links     # Internal links in the source
npx playwright install chromium
npx playwright test     # Homepage + mobile browser checks
npm run test:browser    # Additional website smoke checks (requires local browser)
```

Browser scripts use `CHROME_PATH` or `PLAYWRIGHT_CHANNEL` where supported. Build the site before running the standalone browser test scripts. For more focused coverage, see `npm run test:arcade`, `npm run test:learning`, and the feature READMEs.

## Website map and editing

| Area | Source | Public route |
| --- | --- | --- |
| Home and visual theme | `index.html`, `src/home.css`, `src/brand.css` | `/` |
| Room listings and galleries | `listings/`, `assets/Tampa/`, `assets/Clearwater/` | `/listings/` |
| Games | `arcade/` | `/arcade/` |
| Learning modules | `lms/` | `/lms/` |
| Audio and stories | `audio-library/`, `stories/` | `/audio-library/` |
| Toolbox and articles | `toolbox/`, `src/blog.html` | `/toolbox/`, `/src/blog.html` |

Edit sources rather than generated `dist/`. Property listings are operational content: verify pricing, availability, amenity descriptions, photos and screening links before publishing changes.

## Deployment

**Production: Vercel** project `amazing-grace-home-living`, with `npm run build` and output `dist/`. GitHub Actions verifies pull requests; Vercel is the production deployer.

**Optional:** Cloud Run uses a Node 22 multi-stage `Dockerfile` that serves only `dist/` on `0.0.0.0:$PORT`. Firebase Hosting is a **manual fallback**, not an automatic second production deploy. Google Cloud Developer Connect checks may continue independently of GitHub workflows.

See [deployment and Cloud Run troubleshooting](docs/deployment.md) and [repository instructions](AGENTS.md) for complete setup, known failure modes and deployment verification.

## Security and privacy

- Never commit credentials, host tokens, service-account JSON or live `.env` values. Use host or provider secrets.
- Firebase Storage and Firestore rules are source-controlled, but **editing them here does not deploy them**. Follow the privileged deployment instructions in `docs/deployment.md`.
- `npm start` launches the separate **loopback-only Grace Remote companion**; it is not part of the public site. See [Grace Remote guidance](docs/grace-remote.md) and [mobile local access](MOBILE-ACCESS.md).
- Report vulnerabilities privately following [SECURITY.md](SECURITY.md).

## Contributing

Use a feature branch, run quality checks, review layouts on mobile and desktop, and include screenshots for visible design changes. Keep the website's black, gold and warm-white visual system; maintain clear keyboard navigation, descriptive text and meaningful photo alternatives.
