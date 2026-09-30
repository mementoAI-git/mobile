export type EphemeralTokenParams = {
  memoryId?: string | null;
  resumeHandle?: string | null;
  deviceModel?: string | null;
  capabilities?: string[];
};

export function buildEphemeralTokenUrl(base: string, params: EphemeralTokenParams): string {
  const search = new URLSearchParams();
  if (params.memoryId) search.set('memory_id', params.memoryId);
  if (params.resumeHandle) search.set('resume_handle', params.resumeHandle);
  if (params.deviceModel) search.set('device_model', params.deviceModel);
  if (params.capabilities?.length) search.set('capabilities', params.capabilities.join(','));
  const query = search.toString();
  return query ? `${base}?${query}` : base;
}
