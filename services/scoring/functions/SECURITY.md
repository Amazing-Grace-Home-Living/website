# Scoring Functions: deployment security review required

The source under `services/scoring/functions/` is a prototype and **must not
be deployed to a public Firebase project** until its callable operations have
server-owned authorization, validation and pricing rules.

## Known blockers

- `getProfile`, `recordGameResult`, and `purchaseItem` accept
  `request.data.userId` as an alternative to `request.auth.uid`. A caller can
  impersonate another player unless these methods exclusively use verified
  Firebase Authentication identities.
- `recordGameResult` trusts `request.data.pointsEarned` from the browser;
  rate limits and input ranges do not prove a score was earned.
- `purchaseItem` trusts `request.data.cost` and `itemType`. Price, ownership,
  product eligibility and inventory must be verified against a server-owned
  catalog inside the Firestore transaction.
- Client-provided game IDs, wave counts and identities require consistent
  validation; direct public writes to `players` must be denied by deployed
  Firestore rules.

The separate `functions/src/index.ts` also contains a legacy
`lemonSqueezyWebhook` endpoint that stores payment payloads without verifying
an HMAC signature or an idempotent event ID. Do **not** deploy that handler
until signed raw-body verification and replay protection are implemented.

## Scope of the dependency security update

The package updates and TypeScript compatibility corrections in this change
make the projects build and remove known vulnerable dependency versions. The
GitHub workflow installs, builds, and audits; **it does not deploy Firebase**.
A passing build or dependency audit does not make the callable APIs secure.

Before any live Firebase deployment, add explicit authentication and server
ownership checks, signed webhook verification, relevant abuse/transaction
tests, deploy-time secret handling, and a manual approval gate. Do not expose
production keys, payment records or tenant exports in pull requests.
