import { useAuthStore, useUserStore } from '@/store';
import { useDigitalMindStore } from '@/store/digital-mind.store';
import { configuredDigitalMindName, digitalMindNameHeaders } from './digital-mind-identity';

export function currentDigitalMindName(): string | undefined {
  const account = useUserStore.getState().user ?? useAuthStore.getState().user;
  return configuredDigitalMindName(useDigitalMindStore.getState().profiles[account?._id ?? '']);
}
export function currentDigitalMindHeaders(): Record<string, string> {
  return digitalMindNameHeaders(currentDigitalMindName());
}
