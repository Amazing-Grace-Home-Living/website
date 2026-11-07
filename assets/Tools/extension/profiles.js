export const PROVIDERS = {
  lmstudio: { label: 'LM Studio · local', baseURL: 'http://127.0.0.1:1234/v1', model: '', credential: 'Local server' },
  openai: { label: 'OpenAI · cloud', baseURL: 'https://api.openai.com/v1', model: '', credential: 'OPENAI_API_KEY on bridge' },
  deepseek: { label: 'DeepSeek · cloud', baseURL: 'https://api.deepseek.com/v1', model: 'deepseek-chat', credential: 'DEEPSEEK_API_KEY on bridge' },
  gemini: { label: 'Gemini · cloud', baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai', model: '', credential: 'GEMINI_API_KEY on bridge' },
  ollama: { label: 'Ollama · local or cloud model', baseURL: 'http://127.0.0.1:11434/v1', model: '', credential: 'Ollama host authentication' }
};

const PROJECT_TYPES = new Set(['personal', 'ministry', 'rental', 'nexus-lms']);
const INVALID_BRANCH_CHARACTER = /[\x00-\x20~^:?*\\[\]]/;
const DOMAIN_PATTERN = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/i;
const REPOSITORY_PATTERN = /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/;

function normalizedText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function newProfile(provider = 'lmstudio') {
  return {
    id: crypto.randomUUID(), name: 'New profile', provider,
    baseURL: PROVIDERS[provider].baseURL, model: PROVIDERS[provider].model,
    reasoning: 'low', contextLimit: 272000, maxOutputTokens: 2048,
    type: 'nexus-lms', repository: '', branch: 'main',
    domain: '', registrar: 'DreamHost', dns: 'DreamHost', hosting: '', customRegistrar: '', customDns: ''
  };
}

export function validateProfile(profile) {
  if (!profile || typeof profile !== 'object') throw new Error('Profile data is invalid.');
  const normalized = {
    ...profile,
    name: normalizedText(profile.name), model: normalizedText(profile.model), baseURL: normalizedText(profile.baseURL),
    repository: normalizedText(profile.repository), branch: normalizedText(profile.branch), domain: normalizedText(profile.domain),
    hosting: normalizedText(profile.hosting), customRegistrar: normalizedText(profile.customRegistrar), customDns: normalizedText(profile.customDns)
  };
  if (!normalized.id || typeof normalized.id !== 'string') throw new Error('Profile ID is invalid.');
  if (!normalized.name || normalized.name.length > 80) throw new Error('Give this profile a name of up to 80 characters.');
  if (!PROVIDERS[normalized.provider]) throw new Error('Select a supported provider.');
  if (!normalized.model || normalized.model.length > 160) throw new Error('Enter an available model ID of up to 160 characters.');
  if (!PROJECT_TYPES.has(normalized.type)) throw new Error('Select a supported project type.');
  if (!['default', 'low', 'medium', 'high'].includes(normalized.reasoning)) throw new Error('Select a supported reasoning level.');
  if (!['DreamHost', 'Custom'].includes(normalized.registrar) || !['DreamHost', 'Custom'].includes(normalized.dns)) throw new Error('Select DreamHost or Custom for registrar and DNS.');
  if (normalized.repository && !REPOSITORY_PATTERN.test(normalized.repository)) {
    throw new Error('Use a GitHub repository URL without a token, query or fragment.');
  }
  if (normalized.branch && (normalized.branch.length > 160 || /^[./-]/.test(normalized.branch)
      || /[./-]$/.test(normalized.branch) || /\.\.|\/\/|@\{/.test(normalized.branch)
      || INVALID_BRANCH_CHARACTER.test(normalized.branch))) throw new Error('Enter a valid Git branch name of up to 160 characters.');
  if (normalized.domain && !DOMAIN_PATTERN.test(normalized.domain)) {
    throw new Error('Enter a domain such as example.com, without https:// or a path.');
  }
  if (normalized.hosting.length > 100 || normalized.customRegistrar.length > 100 || normalized.customDns.length > 100) throw new Error('Hosting and custom provider names must be at most 100 characters.');
  if (normalized.registrar === 'Custom' && !normalized.customRegistrar) throw new Error('Enter the custom registrar name.');
  if (normalized.dns === 'Custom' && !normalized.customDns) throw new Error('Enter the custom DNS provider name.');
  if (normalized.registrar !== 'Custom') normalized.customRegistrar = '';
  if (normalized.dns !== 'Custom') normalized.customDns = '';
  if (!Number.isInteger(normalized.contextLimit) || normalized.contextLimit < 4096 || normalized.contextLimit > 1050000) {
    throw new Error('Context capacity must be between 4,096 and 1,050,000 tokens.');
  }
  if (!Number.isInteger(normalized.maxOutputTokens) || normalized.maxOutputTokens < 256 || normalized.maxOutputTokens > 8192) {
    throw new Error('Output limit must be between 256 and 8,192 tokens.');
  }
  return normalized;
}
