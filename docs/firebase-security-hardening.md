# Firebase and GCP security rollout — amazing-grace-hl

This is a deployment checklist, **not confirmation of current production settings**.
Production website hosting is Vercel; Firebase/Cloud Functions may be used independently.
The repository's root `firebase.json` deploys `firestore.rules`; `arcade/firebase.json`
points at a **different** ruleset. Always verify the deployed rules in Firebase Console.

## Immediate checks in the consoles

1. In [Google Cloud API Credentials](https://console.cloud.google.com/apis/credentials?project=amazing-grace-hl), identify the specific Firebase web key flagged in GitHub secret-scanning alert #1. **Do not copy it into tickets, logs, or docs.**
   Firebase browser keys are public identifiers, not privileged server secrets, but must be
   API-restricted. Confirm only required Firebase APIs are allowed, and no unrestricted
   Gemini Developer API / Generative Language API, Maps, or unrelated billable APIs.
   Preserve required APIs for Auth, token refresh, Firestore and any other Firebase
   products actually in use. Do not replace Firebase's allowlist with a guessed four-API
   list; some deployments require additional APIs.
2. Test website HTTP referrer restrictions on a **test key** first. Production candidates
   are `https://amazinggracehl.org/*` and `https://www.amazinggracehl.org/*`.
   Add Firebase hosting origins or specific Vercel preview domains only if they
   actively use this production Firebase project. Avoid broad `*.vercel.app/*` and
   permanent localhost access on the production key.
3. Check usage/quotas in Cloud Monitoring and billing, inspect suspicious Auth activity,
   look at Firestore and Functions logs for unauthenticated calls. A public key in a
   repository alone does not prove misuse. GitHub alert should not be closed **as
   revoked** unless the key was actually revoked; if safe as public Firebase config,
   use the applicable false-positive/public identifier resolution after review.
4. In [Firebase Authentication](https://console.firebase.google.com/project/amazing-grace-hl/authentication),
   review sign-in providers and authorized domains. Keep only sites that perform
   authentication; turn off SMS/phone auth if not used; enable email-enumeration
   protection. Disable open signup **only if the product is invite/admin-only**.
5. Check the **currently deployed** [Firestore Rules](https://console.firebase.google.com/project/amazing-grace-hl/firestore/rules),
   not just this repository. This PR reserves `points`, `credits`, privileges,
   donations and transaction logs for trusted server processes. Admin SDK bypasses
   Firestore rules. Confirm no client flow writes those fields before deploying.
6. Verify whether the `grantPoints`, `spendPoints`, `onDonationCreated` and
   `lemonSqueezyWebhook` functions are actually deployed. If they are deployed,
   restrict or disable unauthenticated endpoints immediately and investigate past
   writes. Restricting the web API key **does not secure custom HTTP functions**.

## Pre-deployment requirements for this security PR

- Provision the Lemon Squeezy **webhook signing secret** using Firebase Secrets Manager:
  `firebase functions:secrets:set LEMON_SQUEEZY_WEBHOOK_SECRET --project amazing-grace-hl`.
  The configured signing secret must match the Lemon Squeezy webhook configuration.
  Never commit it. The webhook code now rejects unsigned/untrusted requests.
- The `grantPoints` endpoint now requires a Firebase ID token with an `admin: true`
  **custom claim** set from a trusted Admin SDK process. Regular users cannot grant
  credits by supplying their own UID. `spendPoints` verifies ownership from the token.
  Check all client paths: unauthenticated calls are intentionally blocked.
- Firestore profile creation/update is restricted to display preferences and text.
  Review and migrate any legitimate client-written fields before deploying. Existing
  document fields managed by a trusted backend are preserved on authorized updates.
- Verify whether the separate `arcade/firestore.rules` file has ever been deployed
  to this project; it has different behavior and must not overwrite the reviewed root
  rules without a coordinated migration.

## Firebase App Check

- Register the deployed web app in Firebase App Check with **reCAPTCHA Enterprise** and
  obtain its **public site key**. The login pages currently use the **Firebase compat
  SDK** (`firebase-*-compat.js`), not modular imports. For this runtime, load
  `firebase-app-check-compat.js` with the matching SDK version, then initialize using
  `firebase.appCheck().activate(new firebase.appCheck.ReCaptchaEnterpriseProvider(SITE_KEY), true)`.
  The modular `import ... from "firebase/app-check"` snippet cannot be pasted directly
  into these classic scripts without a bundler/module migration.
- Register all legitimate hosts. Preview/debug environments require carefully managed
  debug tokens. Never publish a debug token.
- **Monitor valid/invalid/missing token metrics before enforcement.** Only then enforce
  on used products (Firestore, Authentication, Storage, etc.). Enforcing early may block
  real users. App Check is abuse resistance, not a replacement for Authentication or
  authorization and is not absolute protection against hostile scripts.
- Inspect reCAPTCHA Enterprise pricing/quota before enabling high-volume traffic.

## Validation and deployment

1. CI must pass (`npm run check`, browser tests, and Firebase Functions compile).
2. Use the Firestore emulator or Rules Playground to test anonymous reads/writes,
   cross-user access, updates to `points`/`credits`/`accessLevel`/`role`, fake
   donations, and authorized profile edits.
3. Validate signed and unsigned test webhooks, replay behavior, authorized spending,
   and admin-only grants in a staging Firebase project.
4. Deploy reviewed rules **only after** client compatibility is checked:
   `firebase deploy --only firestore:rules --project amazing-grace-hl`.
5. Deploy Firebase Functions separately with correct secrets, permissions, and
   rollback procedures. An ordinary Vercel deployment or GitHub merge does not do this.
6. After deployment, verify live rule versions, test authentication, inspect
   error rates and confirm storage rules and App Check settings are enforced as planned.

References:
- https://firebase.google.com/docs/projects/api-keys
- https://firebase.google.com/docs/firestore/security/rules-fields
- https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider
- https://firebase.google.com/docs/app-check/enable-enforcement
- https://firebase.google.com/docs/functions/config-env
- https://docs.lemonsqueezy.com/help/webhooks/signing-requests
