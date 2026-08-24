import { queryKeys } from '@/constants/query-keys';

export function filesQueryKey(limit: number) {
  return [...queryKeys.files, { limit }] as const;
}

export function filesRequestUrl(baseUrl: string, limit: number) {
  return `${baseUrl}?${new URLSearchParams({ limit: String(limit) }).toString()}`;
}
