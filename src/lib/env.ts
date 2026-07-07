const DEV_API_BASE_URL = 'http://localhost:3000';
const DEV_WEB_BASE_URL = 'https://dev.mymemento.io';
const PROD_WEB_BASE_URL = 'https://app.mymemento.io';

function readPublicEnv(key: string, devFallback?: string): string {
  const value = process.env[key];
  if (value && value.trim()) return value.trim();
  if (__DEV__ && devFallback) return devFallback;
  throw new Error(`Missing required environment variable: ${key}`);
}

export const API_BASE_URL = readPublicEnv('EXPO_PUBLIC_API_BASE_URL', DEV_API_BASE_URL);

function webBaseUrlFromApiBaseUrl(apiBaseUrl: string): string {
  try {
    const url = new URL(apiBaseUrl);
    if (url.hostname === 'app.mymemento.io') return PROD_WEB_BASE_URL;
    if (url.hostname === 'dev.mymemento.io') return DEV_WEB_BASE_URL;
  } catch {
    // Fall through to the build-mode default.
  }

  return __DEV__ ? DEV_WEB_BASE_URL : PROD_WEB_BASE_URL;
}

export const WEB_BASE_URL = webBaseUrlFromApiBaseUrl(API_BASE_URL);
export const TERMS_URL = `${WEB_BASE_URL}/terms`;
export const PRIVACY_URL = `${WEB_BASE_URL}/privacy`;

export function publishedPostUrl(memoryId?: string | null): string {
  return memoryId ? `${WEB_BASE_URL}/post/${memoryId}` : `${WEB_BASE_URL}/post`;
}

export const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim() ?? '';

export const SENTRY_TRACES_SAMPLE_RATE = Number(
  process.env.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? (__DEV__ ? '1' : '0.2'),
);
