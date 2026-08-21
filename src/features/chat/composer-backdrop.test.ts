// @ts-nocheck
import { describe, expect, test } from 'bun:test';

describe('chat composer backdrop', () => {
  test('layers a blur target behind a non-interactive composer backdrop', async () => {
    const source = await Bun.file(new URL('../../screens/ChatScreen.tsx', import.meta.url)).text();

    expect(source).toContain("from 'expo-blur'");
    expect(source).toContain('<BlurTargetView');
    expect(source).toContain('style={styles.messageList}');
    expect(source).toContain('<BlurView');
    expect(source).toContain('pointerEvents="none"');
  });
});
