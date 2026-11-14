# Nexus Assistant

## Install

1. Extract this ZIP into a folder you control. Node.js 22.9+ and Chrome are
   required.
2. Open `chrome://extensions`, enable Developer mode, select **Load unpacked**,
   and choose the extracted `extension` folder. Copy its extension ID. A ZIP
   cannot be installed by clicking it; Chrome Web Store distribution is not
   included.
3. Open a terminal in the extracted `companion` folder and run `npm ci`.
   Start the companion with your own extension ID and workspace:

   ```powershell
   npm start -- --extension-id bdeieglbihjihnnmgbbiifbnpcobefmh --cwd 'C:\path\to\your\workspace'
   ```

4. Open the extension and enter the temporary companion token shown in the
   terminal. The token grants access to your local workspace; keep it private.
   The companion binds to loopback and should not be exposed publicly.

The PDF tool works without the companion. Choose a PDF, draw or type a
signature, choose its page and placement, and download a copy. PDF contents,
signature and output remain on your device. Check the resulting file; rotated
or cropped pages are not supported. An existing digital signature may be
invalidated.

## Models and coding tasks

Choose and confirm the provider for each chat. LM Studio and Ollama require a
running local server and a model ID; OpenAI, Gemini and DeepSeek require your
own API keys. For example, to put your own key in the local encrypted vault:

```powershell
node vault.mjs set openai
npm start -- --extension-id YOUR_EXTENSION_ID --cwd 'C:\path\to\your\workspace' --integrations openai
```

Use `gemini` or `deepseek` for those providers. Do not paste credentials into
chat, the browser page, or a repository. The companion forwards prompts and
explicitly attached page text to the provider you select. Provider data
retention policies apply.

The host controls use your own installed and authenticated Codex. PowerShell
is disabled unless you start the companion with `--terminal`. Cline support is
disabled by default; enable it with `--enable-cline --cline-bin
C:\absolute\path\to\cline.exe`, and configure a provider and model in Cline
separately. Cline runs with auto-approval and can change files and run commands
using your account's permissions. Stopping it may not stop its child processes.
Its history and your local agent's own data-retention policies are separate
from this extension.

The experimental browser agent can click and type in the active tab after you
start a task and explicitly select its provider. It sends page headings and
control labels to that provider and performs up to eight actions without
further confirmation. It stops on cross-origin navigation and blocks common
password, payment, and secret fields, but these checks are not complete. Page
content can mislead a model into unintended actions, including form submissions.
Do not use it with accounts, pages, or data where a mistake would be harmful.
Stop cannot undo actions already performed.

Public sign-in, cloud sync, signing-request links, identity verification and
hosted account management are not implemented.
Do not treat this experimental build as a substitute for a reviewed production
signing or automation service.

The package license is included in `LICENSE`. The companion includes
BSD-3-Clause-licensed source; see `companion/LICENSE`. The PDF library's license
is included in `extension/vendor`.
