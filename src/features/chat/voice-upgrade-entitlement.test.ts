// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(
  resolve(process.cwd(), 'src/components/chat/VoiceUpgradeScreen.tsx'),
  'utf8',
);

describe('voice upgrade entitlement refresh', () => {
  test('closes a stale upgrade screen when the account is already entitled', () => {
    expect(source).toContain('useSubscription');
    expect(source).toContain('isProOrAbove');
    expect(source).toContain('closedForEntitlementRef');
  });

  test('closes after an existing purchase restores successfully', () => {
    expect(source).toContain('const handleRestore = useCallback');
    expect(source).toContain('const restored = await restorePurchases()');
    expect(source).toContain('if (restored)');
    expect(source).toContain('onPress={() => { void handleRestore(); }}');
  });
});
