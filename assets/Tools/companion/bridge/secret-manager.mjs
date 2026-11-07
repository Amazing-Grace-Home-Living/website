const HOSTED_KEYS = {
  openai: 'OPENAI_API_KEY',
  gemini: 'GEMINI_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY'
};

export async function loadHostedSecrets({ project, mappings, existingEnv = {}, auth, fetchImpl = fetch }) {
  if (typeof project !== 'string' || !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(project)) {
    throw new Error('Provide a valid Google Cloud project ID with --secret-manager-project.');
  }
  if (!Array.isArray(mappings) || !mappings.length) throw new Error('Choose at least one Secret Manager credential mapping.');
  const parsed = mappings.map(mapping => {
    const parts = mapping.split('=');
    if (parts.length !== 2 || !Object.hasOwn(HOSTED_KEYS, parts[0]) || !/^[A-Za-z0-9_-]{1,255}$/.test(parts[1])) {
      throw new Error('Secret mappings must use openai=NAME, gemini=NAME, or deepseek=NAME.');
    }
    return { provider: parts[0], secret: parts[1], env: HOSTED_KEYS[parts[0]] };
  });
  if (new Set(parsed.map(item => item.provider)).size !== parsed.length) throw new Error('A provider can have only one Secret Manager mapping.');
  for (const item of parsed) {
    if (existingEnv[item.env]) throw new Error(`${item.env} is already configured by another source. Choose one credential source.`);
  }

  if (!auth) {
    const { GoogleAuth } = await import('google-auth-library');
    auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  }
  let token;
  try {
    token = await auth.getAccessToken();
  } catch (error) {
    throw new Error('Google Application Default Credentials are unavailable. Configure local ADC and Secret Manager access.', { cause: error });
  }
  if (!token) throw new Error('Google Application Default Credentials returned no access token.');
  const env = {};
  for (const item of parsed) {
    const url = `https://secretmanager.googleapis.com/v1/projects/${project}/secrets/${item.secret}/versions/latest:access`;
    const response = await fetchImpl(url, {
      headers: { Authorization: `Bearer ${token}` },
      redirect: 'error',
      signal: AbortSignal.timeout(30000)
    });
    if (!response.ok) throw new Error(`Secret Manager returned HTTP ${response.status} for ${item.provider}. Check IAM, API access, and secret name.`);
    let responseBody;
    try { responseBody = await response.json(); }
    catch (error) { throw new Error(`Secret Manager returned an invalid response for ${item.provider}.`, { cause: error }); }
    const data = responseBody?.payload?.data;
    if (typeof data !== 'string' || data.length > 11000 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data)) {
      throw new Error(`Secret Manager returned invalid secret data for ${item.provider}.`);
    }
    let value;
    try { value = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.from(data, 'base64')); }
    catch (error) { throw new Error(`Secret Manager returned invalid UTF-8 for ${item.provider}.`, { cause: error }); }
    if (value.length < 8 || value.length > 8192 || /[\r\n\0]/.test(value)) {
      throw new Error(`Secret Manager returned an invalid credential for ${item.provider}.`);
    }
    env[item.env] = value;
  }
  return env;
}
