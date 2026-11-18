import { describe, expect, test } from 'bun:test';

const read = (path: string) => Bun.file(new URL(`../../../${path}`, import.meta.url)).text();

// AppearanceProvider sets the status bar for the active theme. A layout that
// forces style="dark" draws a dark clock on the dark sign-in screen.
describe('status bar style', () => {
  test('sign-in and onboarding layouts leave it to the theme', async () => {
    for (const layout of ['app/(auth)/_layout.tsx', 'app/(onboard)/_layout.tsx']) {
      expect(await read(layout)).not.toContain('<StatusBar');
    }
  });

  test('follows the resolved theme', async () => {
    const provider = await read('src/components/system/AppearanceProvider.tsx');
    expect(provider).toContain("<StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />");
  });

  // The beneficiary step always sits on the light cream page.
  test('stays dark on the always-light beneficiary step', async () => {
    expect(await read('app/(onboard)/beneficiary.tsx')).toContain('<StatusBar style="dark" />');
  });
});
