const REFERENCE_COUNTRY_CODES: Record<string, string> = {
  nigeria: 'NG',
  'united states': 'US',
  'united kingdom': 'GB',
  canada: 'CA',
  ghana: 'GH',
  kenya: 'KE',
  'south africa': 'ZA',
};

export function toBillingCountryCode(value: string): string {
  const normalized = value.trim();
  if (/^[a-z]{2}$/i.test(normalized)) return normalized.toUpperCase();
  return REFERENCE_COUNTRY_CODES[normalized.toLowerCase()] ?? normalized.toUpperCase();
}
