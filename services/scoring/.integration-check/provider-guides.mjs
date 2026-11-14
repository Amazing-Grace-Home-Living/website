// Public setup instructions only. Never add credentials to this module.
export const PROVIDER_GUIDES = [
  { id:'ollama', name:'Ollama', kind:'local', env:null, accountUrl:'https://ollama.com/download', docs:'https://docs.ollama.com/api/openai-compatibility', steps:[
    'Install Ollama on the companion computer, then download a model that fits its memory.',
    'Run ollama serve if the service is not already running. Keep it on 127.0.0.1:11434.',
    'Select Ollama in the sidebar, refresh models, and choose a downloaded model. No cloud API key is needed for local models.'
  ], note:'Local model inference has no provider token bill; hardware, electricity, downloads, and any cloud models still have costs.' },
  { id:'lmstudio', name:'LM Studio', kind:'local', env:'LMSTUDIO_API_KEY', accountUrl:'https://lmstudio.ai/download', docs:'https://lmstudio.ai/docs/developer/core/server', steps:[
    'Install LM Studio on the companion computer and download/load a chat model.',
    'In Developer, start the local server on 127.0.0.1:1234, or run lms server start. Keep network sharing off.',
    'If server authentication is enabled, create a local API token in LM Studio and run node credential-setup.mjs lmstudio --open to store it. Otherwise no key is required.',
    'Select LM Studio in the sidebar and refresh models.'
  ], note:'A local server is not verified until model discovery or a chat request succeeds.' },
  { id:'openai', name:'OpenAI API', kind:'api', env:'OPENAI_API_KEY', accountUrl:'https://platform.openai.com/api-keys', docs:'https://developers.openai.com/api/reference/overview', steps:[
    'Open the official API key page and sign in to your own OpenAI account. Select the intended organization and project.',
    'Create a project API key with only the permissions you need. Review billing, project budgets, alerts, and expiration options.',
    'Copy the newly displayed key. Return to the HOST TERMINAL and paste only into the hidden credential prompt.',
    'Unlock it when starting the companion with --integrations openai. Select OpenAI API in the sidebar and refresh models.'
  ], note:'API billing is separate from ChatGPT/Copilot subscriptions. Budget alerts are not a guaranteed hard spending cap.' },
  { id:'gemini', name:'Gemini API', kind:'api', env:'GEMINI_API_KEY', accountUrl:'https://aistudio.google.com/api-keys', docs:'https://ai.google.dev/gemini-api/docs/api-key', steps:[
    'Sign in to Google AI Studio with your own Google account and choose the intended Cloud project.',
    'Create an API key. Restrict it to the Gemini API where available, and check project quota, data-use terms, and billing.',
    'Copy it into the HOST TERMINAL hidden credential prompt, not the sidebar or chat.',
    'Start the companion with --integrations gemini, select Gemini API, and refresh models.'
  ], note:'Free-tier eligibility and quotas vary. Gemini CLI Google sign-in is a separate host workflow; it does not automatically authorize Gemini API calls.' },
  { id:'anthropic', name:'Anthropic API', kind:'api', env:'ANTHROPIC_API_KEY', accountUrl:'https://platform.claude.com/settings/keys', docs:'https://platform.claude.com/docs/en/get-api-key', steps:[
    'Sign in to your own Claude Console account and select your workspace.',
    'Create a personal API key scoped to that workspace. Choose an expiration and review billing and usage limits.',
    'Copy it once into the HOST TERMINAL hidden credential prompt.',
    'Start with --integrations anthropic, select Anthropic API, and refresh models.'
  ], note:'Claude subscriptions and API usage are separate. Use a workspace-scoped key for this companion.' },
  { id:'github', name:'GitHub repository tools', kind:'tool', env:'GH_TOKEN', accountUrl:'https://github.com/settings/personal-access-tokens', docs:'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens', steps:[
    'Prefer gh auth login on the host for browser authentication. The GitHub CLI manages that login; do not extract its token.',
    'If automation needs a PAT, create a fine-grained token in your own account, select only required repositories and permissions, and set an expiration.',
    'Store a PAT only through the hidden terminal prompt, then use --integrations github for host repository tools.'
  ], note:'GitHub Models retired July 30, 2026. A GitHub PAT does not grant OpenAI/Codex API access. Repository access is separate from model inference.' },
  { id:'vercel', name:'Vercel deployment tools', kind:'tool', env:'VERCEL_TOKEN', accountUrl:'https://vercel.com/account/settings/tokens', docs:'https://vercel.com/docs/cli', steps:[
    'Prefer vercel login on the host for your own account; do not copy login credentials into the sidebar.',
    'For a token-based host workflow, create a scoped token with an expiration in your own Vercel account.',
    'Store it in the hidden terminal prompt and start with --integrations vercel only when deployment tooling needs it.'
  ], note:'Hosting quotas and inference bills are separate. This wizard does not publish or change cloud permissions.' }
];
export function guideFor(id) {
  const guide = PROVIDER_GUIDES.find(item => item.id === id);
  if (!guide) throw Error('Unknown provider. Run node credential-setup.mjs --list.');
  return guide;
}
