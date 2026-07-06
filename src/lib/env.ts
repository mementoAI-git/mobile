const DEV_API_BASE_URL = 'http://localhost:3000';

function readPublicEnv(key: string, devFallback?: string): string {
  const value = process.env[key];
  if (value && value.trim()) return value.trim();
  if (__DEV__ && devFallback) return devFallback;
  throw new Error(`Missing required environment variable: ${key}`);
}

export const API_BASE_URL = readPublicEnv('EXPO_PUBLIC_API_BASE_URL', DEV_API_BASE_URL);

export const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim() ?? '';

export const SENTRY_TRACES_SAMPLE_RATE = Number(
  process.env.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? (__DEV__ ? '1' : '0.2'),
);

