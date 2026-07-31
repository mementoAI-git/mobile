export function filesQueryKey(limit: number) {
  return ['files', { limit }] as const;
}

export function filesRequestUrl(baseUrl: string, limit: number) {
  return `${baseUrl}?${new URLSearchParams({ limit: String(limit) }).toString()}`;
}
