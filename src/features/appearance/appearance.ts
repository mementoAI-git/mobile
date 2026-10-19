export type AppearancePreference = 'system' | 'light' | 'dark' | 'deep-sky';
export type ResolvedAppearance = 'light' | 'dark';

export function parseAppearance(value: string | null): AppearancePreference {
  return value === 'light' || value === 'dark' || value === 'deep-sky' ? value : 'system';
}

export function resolveAppearance(preference: AppearancePreference, system: string | null | undefined): ResolvedAppearance {
  return preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference === 'deep-sky' ? 'dark' : preference;
}

export function appearanceLabel(preference: AppearancePreference): string {
  return preference === 'deep-sky' ? 'Deep Sky' : preference[0].toUpperCase() + preference.slice(1);
}
