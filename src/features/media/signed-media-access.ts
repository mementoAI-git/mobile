import type { ApiResponse } from '@/api/interface';

export interface SignedMediaAccessMetadata {
  expires_at: string;
  refresh_endpoint: string;
}

export interface SignedMediaAttachment {
  _id: string;
  url: string;
  access?: SignedMediaAccessMetadata;
  thumbnail?: string | null;
}

export interface SignedMediaContext {
  memory_id?: string;
  capsule_id?: string;
}

const REFRESH_LEAD_MS = 30_000;
const SAFE_REFRESH_ENDPOINT = /^\/files\/[^/?#]+\/access$/;

export function shouldRefreshSignedMedia(
  attachment: SignedMediaAttachment,
  now = Date.now(),
) {
  if (!attachment.access?.expires_at || !attachment.access.refresh_endpoint) {
    return false;
  }
  const expiresAt = Date.parse(attachment.access.expires_at);
  return Number.isFinite(expiresAt) && expiresAt - now <= REFRESH_LEAD_MS;
}

type RefreshRequest = (
  endpoint: string,
  body: SignedMediaContext,
) => Promise<ApiResponse<SignedMediaAttachment>>;

export async function refreshSignedMediaAccess<T extends SignedMediaAttachment>(
  attachment: T,
  context: SignedMediaContext,
  request: RefreshRequest,
): Promise<T> {
  const refreshEndpoint = attachment.access?.refresh_endpoint;
  if (!refreshEndpoint || !SAFE_REFRESH_ENDPOINT.test(refreshEndpoint)) {
    return attachment;
  }
  const response = await request(refreshEndpoint, context);
  if (!response.data?.url) throw new Error('File access refresh returned no URL');
  return { ...attachment, ...response.data } as T;
}

export function createSignedMediaRefreshGate<T>(refresh: () => Promise<T>) {
  let errorRetried = false;
  let inFlight: Promise<T> | null = null;

  const run = () => {
    if (inFlight) return inFlight;
    inFlight = refresh().finally(() => {
      inFlight = null;
    });
    return inFlight;
  };

  return {
    refresh: run,
    afterLoadError(): Promise<T | null> {
      if (inFlight) return inFlight;
      if (errorRetried) return Promise.resolve(null);
      errorRetried = true;
      return run();
    },
  };
}
