// @ts-nocheck
import { describe, expect, test } from 'bun:test';

describe('chat milestone haptics', () => {
  test('does not emit haptics when existing milestone data mounts', async () => {
    const source = await Bun.file(
      new URL('../../components/chat/MilestoneCard.tsx', import.meta.url),
    ).text();

    expect(source).not.toContain('expo-haptics');
    expect(source).not.toContain('notificationAsync');
  });
});
