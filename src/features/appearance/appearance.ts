export type AppearancePreference = 'system' | 'light' | 'dark' | 'deep-sky' | 'light-sky';
export type ResolvedAppearance = 'light' | 'dark';
export type SkyAppearance = 'deep-sky' | 'light-sky';

/** Mobile opens in Dark until the person picks another appearance. */
export const DEFAULT_APPEARANCE: AppearancePreference = 'dark';

export function parseAppearance(value: string | null): AppearancePreference {
  return value === 'system' || value === 'light' || value === 'dark' || value === 'deep-sky' || value === 'light-sky'
    ? value
    : DEFAULT_APPEARANCE;
}

/** Deep Sky renders dark controls and Light Sky light ones, matching web resolveTheme. */
export function resolveAppearance(preference: AppearancePreference, system: string | null | undefined): ResolvedAppearance {
  if (preference === 'system') return system === 'dark' ? 'dark' : 'light';
  if (preference === 'deep-sky') return 'dark';
  if (preference === 'light-sky') return 'light';
  return preference;
}

/** The sky backdrop to draw behind the app, if any. */
export function skyAppearance(preference: AppearancePreference): SkyAppearance | null {
  return preference === 'deep-sky' || preference === 'light-sky' ? preference : null;
}

export function appearanceLabel(preference: AppearancePreference): string {
  if (preference === 'deep-sky') return 'Deep Sky';
  if (preference === 'light-sky') return 'Light Sky';
  return preference[0].toUpperCase() + preference.slice(1);
}
