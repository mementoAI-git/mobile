import type { Href } from 'expo-router';

type OAuthProvider = 'google' | 'apple';
export const AUTH_SESSION_RETURN_URL = 'memento://';

const TRUSTED_APP_LINK_HOSTS = new Set(['app.mymemento.io', 'dev.mymemento.io']);

const INTERNAL_ROUTE_PREFIXES = [
  '/(tabs)',
  '/chat/',
  '/accept-invite/',
  '/settings',
  '/share',
];

function isAllowedInternalPath(path: string) {
  return INTERNAL_ROUTE_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix));
}

function pathFromUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  if (value.startsWith('/') && !value.startsWith('//')) {
    return value;
  }

  try {
    const url = new URL(value);

    if (url.protocol === 'memento:') {
      const hostPath = url.hostname ? `/${url.hostname}` : '';
      return `${hostPath}${url.pathname}${url.search}`;
    }

    if (url.protocol === 'https:' && TRUSTED_APP_LINK_HOSTS.has(url.hostname)) {
      return `${url.pathname}${url.search}`;
    }
  } catch {
    return null;
  }

  return null;
}

export function normalizeAppHref(value: unknown): Href | null {
  if (typeof value !== 'string') return null;

  const path = pathFromUrl(value);
  if (!path || !isAllowedInternalPath(path)) return null;

  return path as Href;
}

export function getPostAuthHref(onboardingStatus: unknown): Href {
  return onboardingStatus === 'never' ? '/(onboard)' : '/(tabs)/overview';
}

export function oauthCallbackUrl(provider: OAuthProvider): string {
  return `${AUTH_SESSION_RETURN_URL}oauth-callback?provider=${provider}`;
}
