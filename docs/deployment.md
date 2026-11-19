# Deployment and troubleshooting

## Production: Vercel
- Repository: `Amazing-Grace-Home-Living/website`
- Production branch: `main`. Use the repository root as the Vercel project root.
- Build: `npm ci && npm run build`; publish `dist/` using `vercel.json`.
- Domains: `amazinggracehl.org` and `www.amazinggracehl.org`.
- GitHub Actions checks the source. Vercel handles the production deployment; CI is **not** a Cloud Run deployment.
- Check a deployment by visiting `/`, `/listings/`, `/arcade/`, and `/lms/` and testing the mobile menu.

## Optional Cloud Run
The repository had a Dockerfile that used Node 20, installed production-only dependencies (while the site build needs development tools), and started `bridge.mjs`—a private, loopback-only companion. This is unsuitable for a public Cloud Run website.

The revised Dockerfile builds the **static site** using Node 22 and serves only `dist/`. The container listens on `0.0.0.0:$PORT` and exposes `/healthz`. It has no credentials and no access to the local companion.

To verify a Docker deployment:
1. Inspect the Cloud Build log for image/build errors, then Cloud Run revision logs for startup errors.
2. Confirm the build uses this repository's latest Dockerfile, port 8080 and a working container startup probe.
3. Verify `/healthz` and `/` return HTTP 200.
4. If the two Google Cloud Developer Connect checks are unnecessary, disable their Cloud Build/Cloud Run repository triggers **in Google Cloud**, not by deleting GitHub Actions workflows. Those external checks cannot be disabled by this repository alone.

The two failing checks referenced in the audit are `cloudrun-agent-us-south1-...` and `cloudrun-nicholai-northamerica-northeast2-...`. The current GitHub check output includes the precise buildpack failures: the `cloudrun-agent` trigger has application path `agent` and the `cloudrun-nicholai` trigger has application path `iagg`, but neither folder is present in this repo. Both fail with `invalid app path` at Buildpack Step 0, before Dockerfile build/deployment. Fix the source directory in the Google Cloud Build trigger settings (root for this static website), point the agent to its actual separate repository, or disable the obsolete triggers if Vercel is the only required host. Repository commits alone cannot change these external trigger configurations. See [issue #10](https://github.com/Amazing-Grace-Home-Living/website/issues/10).

For a retained website trigger, select the Developer Connect link for `Amazing-Grace-Home-Living/website`, match branch `^main$`, and select the root `cloudbuild.yaml`. It builds the root `Dockerfile` with `.` as its context. Set `_DEPLOY_REGION` and `_SERVICE_NAME` to the approved existing Cloud Run region and service, and verify that the regional `cloud-run-source-deploy` Artifact Registry repository and trigger service account are configured to push the image and deploy the revision. Verify the deployed revision and its `/healthz` and `/` responses before updating issue #10.

## Optional AWS portfolio preview

An independent S3 + CloudFront static preview can be provisioned without modifying the Vercel production deployment. It is opt-in, manual, private-origin, and uses GitHub OIDC rather than stored AWS keys. AWS charges may apply. See [AWS preview setup](aws-deployment.md) and `infrastructure/aws-static-preview.yml`.

## Optional Firebase Hosting
The `Firebase Hosting (manual fallback)` workflow runs only when manually dispatched and when the repository secret `Service_Account_JSON` is present. It deploys Hosting only. Do not put the service-account JSON in source control.

**Security rules:** The source `storage.rules` previously allowed anyone to read and write every path. The restricted rules must be deployed separately and reviewed against existing clients:
```bash
firebase deploy --only storage,firestore:rules --project amazing-grace-hl
```
This is a privileged operation. Until it is run, changing the repository files alone does **not** secure the live Firebase bucket. Migrating any legacy Firebase Storage paths may be necessary.

## Local commands
```bash
npm ci
npm run check
npm run audit:links
npm run build
npm run preview
# Optional: npm run test:browser or npx playwright test
```

Do not serve the `bridge.mjs` local companion on a public interface.

## Repository hygiene
Old `.vs/` editor indexes, Firebase Hosting cache, a bundled `bfg.jar` and the dangling `arcade/website` gitlink were removed from the current tree. A proposed `.gitmodules` entry pointed the `arcade/website` submodule back to this **same repository**, which would create a recursive/self-referential dependency. Do not re-add that entry. If a genuinely separate subproject is needed later, use its real independent repository URL.

Large audio assets remain untouched; confirm redistribution rights and evaluate deduplication/LFS separately before any history rewrite.
