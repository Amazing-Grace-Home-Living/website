# Grace Remote — personal mobile Codex companion (v0.3)

A mobile-friendly interface plus a dependency-free Node companion that talks to the official Codex app-server over local stdio. The hosted Site provides guided setup and a sign-in protected AI guide; host tasks run through your personal companion. Download `companion.zip` from its Connection page for live personal use on your own host.

## Implemented

- New Codex threads and text turns in a host-configured repository.
- List and resume matching local threads (first 50), with up to 100 history items displayed.
- Poll host notifications for task status, streamed agent output, terminal output and reported unified diffs.
- One-time command and file-change decisions, with unsupported expanded/network grants refused.
- Follow-up turns after the active turn finishes, and interruption of an active turn known to the companion.
- Loopback-only server, random per-start bearer token, strict Host/Origin checks, no cross-origin API access, fixed workspace and fixed permission defaults.
- Responsive interactive demo with sample sessions, sample approvals and sample diffs. Demo actions never call an agent.

## Important correction about mobile availability

Current official OpenAI documentation already describes Android/iOS mobile control of a paired Mac/Windows desktop (subject to rollout/workspace settings). For the fastest path, first try the built-in feature: desktop ChatGPT → Settings → Connections → Control this Mac or PC → Set up/Add, then scan the QR code with the same account/workspace on your phone. Keep the desktop awake and online. Host Computer Use/browser setup still determines actual access.

This custom app is useful if you want a separate personal interface or tailored workflows. It does not unlock an unavailable feature or bypass workspace, browser, operating-system, repository or deployment permissions.

## Run on your Windows computer

1. Install current Node.js (22+) and Codex using the official installation instructions: https://learn.chatgpt.com/docs/codex/cli . Sign in on that computer and verify `codex --version` and `codex login status` work.
2. Unzip this package into a folder you control.
3. Ensure `codex` is available as a native executable on PATH. Node's `spawn` does not directly execute Windows `.cmd` shims with `shell:false`; if your npm installation supplies only a `.cmd` wrapper, set `$env:CODEX_BIN` to the absolute path of the actual Codex executable, or run the companion in WSL/Linux. Never set `CODEX_BIN` to an untrusted executable.
4. From PowerShell in this folder:

```powershell
node --test tests/*.test.mjs
node bridge.mjs --cwd "C:\Users\YOUR_NAME\Documents\GitHub\YOUR_REPOSITORY"
```

5. Open `http://127.0.0.1:8787` and paste the companion token shown by that terminal. This is a connection token generated for your local bridge; it is not an OpenAI API key. The page retains it only in memory. Do not share the token or terminal screenshot.
6. Keep the companion running. GitHub and deployment tools must be installed and authenticated on this host. For example, `gh auth status` should work before requesting GitHub operations; configure the appropriate Firebase/Vercel tool for your existing project.

Use an already authenticated Codex installation. This companion does not capture ChatGPT passwords, copy browser sessions, or offer a hosted account-login endpoint.

## Android Termux access

The phone is the control surface; the host does the work. Android native execution of Codex is not assumed. Use a configured SSH-accessible computer or Linux server:

```bash
pkg install openssh
ssh -N -L 8787:127.0.0.1:8787 USER@HOST
```

Replace USER@HOST with your real SSH login/host. The host must have an SSH server configured, and the companion must be running there. If your computer is behind a home router, use your existing private VPN/SSH arrangement rather than exposing this bridge port. This project does not provision SSH or VPN access.

Leave that Termux session running, then open **http://127.0.0.1:8787** in your Android browser and paste the token. Android can suspend Termux in the background, interrupting the tunnel; reconnect if needed. For Windows+WSL, ensure SSH forwards to the same environment where the companion listens.

Do not use the hosted HTTPS demo to connect to a private HTTP bridge. The live UI is deliberately served from the companion, under the same localhost origin and through the SSH tunnel. This avoids mixed-content and cross-origin credential sharing.

## Scope and permissions

Each companion instance serves one configured repository. The browser cannot change the workspace, model configuration, sandbox or approval defaults. New/resumed threads request `approvalPolicy: on-request` and `sandbox: workspaceWrite`; managed account/host settings may impose additional limits. This allows some ordinary commands without a new prompt; it is not an approve-every-command guarantee.

Shell prompts can request GitHub pushes, merges or deployments, but the host must have actual credentials, network access and tools. Those are agent-run commands, not separate first-class merge/deploy buttons in this MVP. The UI reports host output; a green completed turn is not proof of a successful deployment.

Browser control requires a separately installed and configured browser automation/MCP tool on the host. This package includes no desktop-control driver and cannot inherit the desktop app's logged-in browser, private chats, plugins or permissions just by authenticating to Codex.

The bridge starts a separate app-server and resumes stored local threads in the configured workspace. It does not attach to arbitrary active ChatGPT desktop/mobile chats or take over turns running in another process. Existing threads outside the app-server's local history will not appear. Host thread visibility depends on Codex's account/storage/configuration.

Unsupported approval types (structured input, MCP elicitation, expanded permissions, managed network grants) require a richer client. The UI shows the raw request and disables unsupported approval acceptance. Interrupt the active task and use the official client if necessary. No broad permission bypass is implemented.

## Authentication and productization

This v0.2 is a **personal self-hosted companion**. Official app-server docs distinguish local/open-source personal authentication from commercial or hosted services. Do not collect customers' personal Codex tokens or assume their ChatGPT subscriptions can be used through your public backend.

For a public multi-user product, evaluate OpenAI's supported **Sign in with ChatGPT** integration and its availability/partner requirements, or an appropriately billed API-backed implementation. Add real per-user authentication, isolated execution environments, scoped GitHub App installation permissions, durable job/event storage and narrowly scoped deployment credentials. This is future work, not present in this MVP.

## Hosting at amazinggracehl.org

The frontend can be previewed as static files, but a normal static host cannot execute Codex or shell commands. Do not deploy `bridge.mjs` as a public endpoint. Production multi-user hosting requires a separately designed secured backend and execution hosts. Do not replace your existing website with this prototype.

The private Site preview is separate from amazinggracehl.org. No DNS, GitHub repositories, pull requests or production deployments in your accounts have been changed by this package.

## Tests and verification limits

Run `node --test tests/*.test.mjs`. Tests use a fake app-server and cover authentication, origin/host validation, workspace boundaries, approval rules and basic JSONL protocol handling. A local HTTP smoke test exercises the companion endpoints without invoking OpenAI.

Real sign-in, real Codex execution, browser control, GitHub merges and hosting deployment have not been validated with your credentials. Install and test with a disposable repository before using an important project. APIs vary by installed Codex version; use `codex app-server generate-json-schema` for that installation's exact protocol. Large histories are bounded, polling events are buffered in memory, tasks do not become durable jobs through this bridge, and reconnecting does not reconstruct every prior live delta. Codex's own persisted thread history remains on the host.

## Official references

- https://learn.chatgpt.com/docs/remote-connections
- https://learn.chatgpt.com/docs/mobile
- https://learn.chatgpt.com/docs/app-server
- https://learn.chatgpt.com/docs/codex/cli


## v0.2 — Matrix theme, integration vault and learning area

The interface uses a dark Matrix-inspired background, light text and green terminal accents. Integrations and Learn tabs are available on desktop and mobile.

### Host vault

```bash
node vault.mjs set github
node vault.mjs set vercel --expires 2027-01-01
node vault.mjs list
node bridge.mjs --cwd /path/to/repo --integrations github,vercel
```

The `set` command asks for the passphrase and provider token in hidden interactive terminal prompts. Do not enter tokens as command arguments, in task prompts, or in the hosted demo. The optional vault lives at `~/.grace-remote/vault.json`, outside the repository. It uses AES-256-GCM with a random 12-byte nonce, authenticated format marker and a scrypt-derived key (N=32768, r=8, p=1, random 16-byte salt). Each write uses a temporary file and atomic rename. POSIX file/directory modes are 0600/0700; Windows users must keep their profile directory protected with Windows account/NTFS permissions. There is no recovery if you lose the passphrase. This is not an audited enterprise secret manager.

Vault values are decrypted in host memory at startup and injected only into the Codex child environment for the IDs selected by `--integrations`. Existing environment variables and native tool credential stores on the host are still inherited by Codex as before; the vault is not OS isolation. Only readiness metadata goes to `/api/integrations`. Known registered token values are redacted from serialized bridge API responses, but this is not a complete data-loss-prevention guarantee: transformed secrets, external tools, host process access and provider logs remain outside this protection. A trusted coding agent with execution permission can access its enabled credentials. Prefer scoped, short-lived provider tokens and appropriate host policy.

Rotate an integration token by running `node vault.mjs set PROVIDER` again. Remove the encrypted local copy with `node vault.mjs remove PROVIDER`, revoke it at the provider too, and restart the companion so an old in-memory token is no longer used. Expiration blocks loading expired entries at startup; providers remain responsible for enforcing live token expiry and revocation. There is no automatic OAuth refresh/rotation in this release.

Add optional custom adapters to `integrations.json`, for example:

```json
[
  {
    "id": "learning-platform",
    "name": "Learning Platform",
    "env": "LEARNING_PLATFORM_API_KEY",
    "description": "Credentials for a separately configured LMS tool on the host."
  }
]
```

This catalog contains metadata only. Custom adapters must use token/key/secret environment-variable names. Adding a catalog entry does not implement the provider's API, grant permission, install a tool, or connect an external LMS. The host administrator must configure those separately.

### Companion token lifecycle (v0.4)

Default mode remains a per-start 2-hour token. For travel, run:

```powershell
node .\bridge.mjs --cwd 'C:\Users\Nick\OneDrive\Documents\GitHub\amazing-grace-consolidated' --session-days 30 --remember-token
```

Choose 1–90 whole days. The saved token retains its original expiration across restarts; restarting does not renew it. On Windows the token is protected by DPAPI CurrentUser and saved under `%LOCALAPPDATA%\GraceRemoteCredentials\session-8787.json`, outside the repository and OneDrive. The same Windows account must run the companion after restart. On Linux it is stored in a private 0700 directory with a 0600 file. Do not copy this file to another user or commit it.

Save the displayed token in your password manager before travel. A locked/refreshed browser asks for the same unexpired token; it does not require visiting the computer. Browser inactivity locking remains 10 minutes. Rotation from Integrations invalidates the old token and saves the replacement when persistence is enabled; copy the replacement into your password manager. To revoke a lost or exposed token, stop the running companion, then restart with `--remember-token --reset-token --session-days 30`. Remove `--reset-token` on subsequent launches. Expired saved tokens require an explicit reset.

`Start-GraceRemote.ps1` is an optional launcher that locates an installed native Codex executable. `Register-GraceRemoteTask.ps1` optionally registers an at-startup task under the same Windows account, at limited run level. Run it elevated only to register the task; it prompts locally for the Windows account password (not PIN), which Windows Task Scheduler stores. It never writes a password into the package. It does not start or replace a running instance. Before registration, review/unblock the scripts locally if Windows marks them as downloaded, and ensure organizational execution policy permits them; the package does not bypass policy. The task restarts on failure, has no execution time limit, and runs without an interactive login. Codex must already be authenticated for that same account. Vault integrations requiring interactive passphrase entry are not supported by this unattended launcher.

A startup task is not a remote connection. Configure/test SSH or your private VPN separately, disable sleep while plugged in, and test from phone cellular data after reboot. Keep ports 8787 and model servers off the public internet. Download needed OneDrive repository files fully with “Always keep on this device”: online-only files may not be available to a task before sign-in. Provider login expiry, updates, power/network failures and disk issues can still interrupt service. Windows DPAPI and Task Scheduler are supplied but cannot be exercised on this Linux build host.

## v0.2.1 — mobile usability and performance

- Viewport-fit and safe-area padding for notches, home indicators and fixed bottom navigation.
- At least 44px controls; input/textarea text is 16px to avoid common iOS focus zoom.
- Host connection status remains visible at mobile widths.
- Mobile dialogs use 100dvh, scrollable content and sticky reachable close controls. Native dialog keeps Escape/focus behavior; background scrolling is locked while open.
- Blur removed; mobile scanline overlay, hover transforms and glow shadows disabled.
- Font preconnects only. No credential-bearing connections are preconnected.
- Task submission errors appear inside the dialog.

The current console has no iframe, so it never eagerly embeds another remote console. If an external website wraps Grace Remote in a modal/iframe, that separate wrapper must implement its own click-to-load behavior; it is not included in this repository.


## Toolbox page

The new `/toolbox/` page links to the console, integration setup, learning modules and companion download. No iframe or remote console is loaded in the background. Direct links use view hashes such as `/#learn`. This page is published on the Grace Remote Site; no custom-domain DNS or amazinggracehl.org deployment has been changed.


## v0.3 — setup assistant and real AI guidance

Sample tasks, fake approvals and sample diffs have been removed. The Assistant tab provides guided setup without a host, hosted OpenAI responses after ChatGPT sign-in, or AI through the user's connected personal Codex companion. Guided responses are explicitly labeled as a setup guide, not AI.

The hosted API uses Responses API, `gpt-6-luna`, text-only inputs, no tools, `store:false`, bounded history and an output-token cap. It cannot actually log in, modify accounts or perform setup actions; it offers instructions. Real host execution uses Codex's own permissions and approval flow. The optional host assistant endpoint preserves those controls. Credential-like patterns are rejected from setup chat; this is a best-effort guard, not a guarantee that arbitrary secrets will be detected.

Hosted AI requires signed-in Site identity and an allowed request origin. From the Vercel-hosted custom domain, the AI sign-in link opens the authenticated Site at top level; the setup question is not embedded in its URL. Guided steps remain available before sign-in. Chat messages are kept only in page memory, with no conversation database added. The provider still processes requests under its own data handling policies.

The OpenAI key is held in a protected Site runtime secret. `.env.local` is ignored and never bundled into source, public assets or companion downloads. No Firebase/SQL plaintext credential storage is used.

The hosted handler has a best-effort per-user, per-Worker-instance hourly throttle, plus bounded request/input/output sizes. It does not provide a durable global spending cap; OpenAI project limits and billing must be managed by the owner. Exhausted credits/quota are shown distinctly from temporary rate limiting. A verified API test during setup returned `credit_balance_exhausted`; hosted replies need API credits added before they can complete.

The Site now runs a dependency-free Worker that serves embedded versions of the authored `public/` assets. Build with `node scripts/bundle-worker.mjs`, `bash scripts/build.sh`, then `node scripts/validate-artifact.mjs`. Preserve `public/` as the authored assets; `dist/` is generated Worker output. The bridge serves the same public assets locally. Unit tests use mock API responses; actual model output was not validated because the API project had exhausted credits.


## Grace Nexus LMS — first learning release

`public/lms/` is the authored mobile-first hub served at `/lms/`. It adds six short lessons with knowledge checks and local IDs-only progress, provider setup guides, a three-chapter Matrix of Conscience story, an allowlisted learning-rules interpreter with preview, and explicit JSON exports. It does not execute Python/shell code, start a virtual environment, claim real consciousness metrics, or simulate successful model connections. Terminal echoes and external text are rendered as text, not HTML.

There is no cloud credential-entry form, private transcript database, payment collection, or automatic provider routing in this release. The Connections and Mission areas accurately identify those as pending. The existing Grace Remote console remains the real host connection path. Local lesson state is not an authenticated cross-device account or official certificate.

The first branding check found existing uses of AI Nexus, AI LMS, Nexus LMS and LM Agent. Grace Nexus LMS is the selected ministry-branded working name; a web search is not trademark clearance.


## Account-owned sidebar providers

The sidebar supports Ollama, LM Studio, OpenAI API, Gemini API, and Anthropic API through your loopback companion. Each user supplies their own provider account. Git contains only the setup scripts, tutorials, and adapter code. Provider credentials never belong in browser extension code/storage, chat, command arguments, or published assets.

From the repository folder, run the account wizard in an interactive host terminal:

~~~powershell
node credential-setup.mjs --list
node credential-setup.mjs openai --open
node credential-setup.mjs gemini --open
node credential-setup.mjs anthropic --open
~~~

The wizard shows official account instructions and opens the provider page. You sign in and create a scoped key in your own account; the script cannot mint a key without provider authorization. Paste it only into the hidden terminal prompts. The script confirms the passphrase/token and writes the existing AES-256-GCM encrypted vault at ~/.grace-remote/vault.json, outside this repository. No plaintext key file or frontend environment variable is generated. Configuration does not verify provider access. Set expiration at the provider, review quota/billing, and revoke or rotate in its dashboard. To replace a credential, rerun the wizard; to remove it locally, run node vault.mjs remove PROVIDER, then revoke it at the provider and restart the companion.

Load assets/Tools as an unpacked Chrome/Edge extension. Copy its extension ID from the sidebar, then run:

~~~powershell
node bridge.mjs --cwd . --extension-id YOUR_EXTENSION_ID --integrations openai,gemini,anthropic
~~~

Name only integrations you have stored and want unlocked. The host asks for the vault passphrase and supplies credentials only to provider requests. Without --integrations, the adapters can use existing host environment credentials. The companion token shown at launch is a separate session credential: enter that in the sidebar, choose Provider setup for the interactive tutorial, then choose AI chat → provider → Refresh models. Only configured extension IDs are allowed; browser origins and bearer tokens are checked. Direct provider chat works without starting Codex. Codex host tasks remain a separate option using the account already signed in on the host. This bridge build does not enable the sidebar's remote PowerShell terminal; use a real host terminal for setup.

For keyless local inference:

~~~powershell
node credential-setup.mjs ollama --guide
node credential-setup.mjs lmstudio --guide
node bridge.mjs --cwd . --extension-id YOUR_EXTENSION_ID
~~~

Ollama uses 127.0.0.1:11434; LM Studio uses 127.0.0.1:1234. Keep these servers private. If LM Studio authentication is enabled, store its token with the wizard and add --integrations lmstudio. Download/load a local chat model, then refresh models in the sidebar. Local inference has no provider per-token bill, but hardware, electricity, downloads, and cloud models may cost money. Cloud chat uses the explicitly selected provider; there is no automatic fallback or cross-provider history transfer. Requests have bounded history, response size, timeout, and output tokens. Upstream authentication/quota errors are sanitized. Stop cancels the active inference request.

The PowerShell compatibility entry point scripts/sync_secrets.ps1 now delegates to the same hidden-input wizard. It replaces the previous placeholder credential-manager/export implementation; it no longer copies secrets into .env files, cloud platforms, or command strings. Example: ./scripts/sync_secrets.ps1 -Provider gemini -OpenProvider.

Provider guidance is maintained in provider-guides.mjs and generated into the extension by node scripts/sync-provider-guides.mjs (also run during build). Run npm.cmd run test:providers for the mock-backed integration tests. No personal key is needed to implement or run these tests.

Official account and API documentation:

- [OpenAI API authentication](https://developers.openai.com/api/reference/overview) and [key creation](https://platform.openai.com/api-keys). API billing is separate from ChatGPT subscriptions.
- [Gemini keys](https://ai.google.dev/gemini-api/docs/api-key) and [API compatibility](https://ai.google.dev/gemini-api/docs/openai). Free quotas and eligibility vary. [Gemini CLI Google login](https://geminicli.com/docs/get-started/authentication/) is a separate host workflow, not an API key for this adapter.
- [Anthropic key creation](https://platform.claude.com/docs/en/get-api-key). Use a key scoped to the intended workspace.
- [Ollama compatibility](https://docs.ollama.com/api/openai-compatibility) and [LM Studio server setup](https://lmstudio.ai/docs/developer/core/server).
- [GitHub Models retirement](https://docs.github.com/en/github-models): the service, including inference, retired July 30, 2026. A GitHub PAT remains useful for repository tooling; it does not grant OpenAI or Codex API access.

No Antigravity credential-manager command, free hosting entitlement, OAuth inference access, or cloud deployment is assumed by this implementation. Account login and API access are distinct.


## PowerShell Defense Academy and shared arcade profile

Open /arcade/powershell-defense/ for four three-question lessons, a ten-wave defense, and the Wave 5 Rogue Script AI. Its shield ignores direct, splash, and chain damage until three different boss questions are correct. Lessons and boss dialogs pause the simulation; closing them resumes combat but does not drop the shield. Defeating the boss awards 500 Security XP once, Security Architect, and the Script Sentinel turret. A breached boss ends the attempt. Reset clears spawns, projectiles, buffs and boss answers while retaining earned learning.

The shared profile at /arcade/academy/ reads existing learning and RPG saves without rewriting them. It projects Grace Nexus, Classic Matrix, Match Maker and VIM milestones into the same XP pool as PowerShell Defense. RPG quest XP and region milestone XP use the greater total, avoiding duplicate credit for the same region. Level is 1 + floor(shared XP / 150); rank thresholds are 0, 250, 750, 1250, 2000, and 3000 XP. Local profile state uses amazing-grace-academy-v1. No accounts, cloud sync, or transcript collection are added.

New correct lesson questions award 20 Security XP each; mastering all three answers in one lesson attempt awards 50 more once. Each cleared wave awards 25 once. Replayed lessons and wave milestones do not farm XP. First-time lesson progress also grants 60 session credits and 5% damage/fire-rate bonuses; reset removes those session buffs. Packet counts accumulate from actual defeated enemies, including splash/chain kills. Ten distinct correct questions earn Pipeline Master. Start Wave 10 for Terminal Operator; destroy 1000 packets for Malware Exterminator. Four mastered lessons earn Nexus Security Architect and the local PowerShell Novice completion achievement.

Restore the Echo Gardens (existing RPG milestone) to earn Earth Guardian and +200 starting credits in each new PowerShell attempt. Earn 250 Security XP to unlock the Grace Nexus Cyber Planet transfer mission in the profile hub; answering all three applied questions correctly awards 100 shared XP and Cyber Guardian once. JSON profile export includes only local gameplay progress. These certifications are arcade achievements, not accredited credentials.

All PowerShell examples are inert text. Turret names are fictional metaphors and no host commands run. Lesson references link to Microsoft Learn for Get-Process, Get-Service (Windows-specific), Test-Connection (ICMP by default), and Where-Object. The game is dependency-free and does not require Tailwind, icon CDNs, or online fonts. Use the arrow-key placement cursor or pointer controls. Browser storage failures show a visible warning and preserve in-tab play where possible.

Verification: npm.cmd run test:academy and npm.cmd run test:academy:browser. The browser check exercises real combat simulation and normal lesson/boss inputs with an isolated local profile; it does not execute PowerShell.
