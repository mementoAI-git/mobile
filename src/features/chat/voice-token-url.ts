import { CALL_ACTIONS_CAPABILITY } from './voice-call-actions';
import { SEARCH_MEMORIES_TOOL } from './voice-tool-relay';
import { SERVER_TOOLS_CAPABILITY } from './voice-server-tools';

/**
 * Capabilities this build handles, sent with every token request. The API's
 * parseVoiceClientCapabilities must accept exactly these names: its test
 * pins the same query string as this module's test.
 */
export const VOICE_CLIENT_CAPABILITIES = [
  SEARCH_MEMORIES_TOOL,
  CALL_ACTIONS_CAPABILITY,
  SERVER_TOOLS_CAPABILITY,
];

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
