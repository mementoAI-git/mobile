import {readFileSync} from 'node:fs';
import {describe, expect, test} from 'bun:test';

const acquisitionSurfaces = [
  'app/(auth)/verify-email.tsx',
  'app/(auth)/forgot-password.tsx',
  'app/(auth)/set-password.tsx',
  'app/(auth)/register.tsx',
  'app/(auth)/login.tsx',
  'app/(auth)/oauth-callback.tsx',
  'app/(auth)/two-factor.tsx',
  'app/(onboard)/preferences.tsx',
  'app/(onboard)/nickname.tsx',
  'app/(onboard)/beneficiary.tsx',
  'app/(onboard)/index.tsx',
  'app/accept-invite/[id].tsx',
  'src/components/onboarding/SelectionChip.tsx',
  'src/components/system/AnimatedSplash.tsx',
  'src/components/system/AppErrorBoundary.tsx',
];

describe('auth, onboarding, and system typography', () => {
  test.each(acquisitionSurfaces.map((file) => [file]))('%s uses semantic typography roles', (file) => {
    const source = readFileSync(file, 'utf8');

    expect(source).toContain("@/constants/typography");
    expect(source).toMatch(/TYPE\./);
    expect(source).not.toMatch(/fontWeight\s*:/);
    expect(source).not.toMatch(/text-\[\d+(?:\.\d+)?px\]/);
    expect(source).not.toMatch(/fontSize\s*:\s*\d+(?:\.\d+)?/);
  });
});
