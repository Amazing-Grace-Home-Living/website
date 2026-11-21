# Firebase Rules security regression tests

The Firebase project has deployed Firestore and Cloud Storage rules. Do not assume that changing a checked-in `*.rules` file updates live permissions.

These **21 mock-user tests** cover profile ownership, administrative fields, forged donations/points, private uploads, anonymous access, cross-user access, and denied legacy Storage paths.

## Run without touching production

Prerequisites: Node 24, Java 21, Firebase CLI 15.36.0.

```bash
npm ci --prefix tests/firebase-rules --ignore-scripts --no-fund
firebase emulators:exec --only firestore,storage --project demo-amazing-grace-audit --config firebase.json "node tests/firebase-rules/verify.mjs"
```

The `demo-` prefix is intentional: Firebase treats this as a demo project and rejects access to non-emulated production resources. The test suite uses `@firebase/rules-unit-testing`, seeds only emulator documents, and cleans up after itself. It does not fetch credentials, production records, or real payment data.

**Important:** A passing emulator test proves rule behavior only for the covered cases. It is not evidence that the proposed rules are deployed to production. Confirm clients' write paths and authorized domains before production updates. A manual deployment or rollback must preserve the exact live rulesets and remain restricted to the expected Firebase project.
