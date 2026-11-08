import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

describe('explore polish', () => {
  test('the explore page has no intro line above the reflections', () => {
    expect(read('app/(tabs)/explore/index.tsx')).not.toContain('Discover prompts that help you explore');
  });

  test('the active topic tab is the strong neutral pill, not brand orange', () => {
    const tabs = read('src/components/ui/Tabs.tsx');
    expect(tabs).toContain("isActive ? 'bg-active-fill' : 'bg-transparent'");
    expect(tabs).toContain('COLORS.activeText');
    expect(tabs).not.toContain("isActive ? 'bg-brand'");
  });

  test('the topic count dot uses the web info blue', () => {
    const screen = read('app/(tabs)/explore/[id].tsx');
    expect(screen).toContain('backgroundColor: COLORS.info');
    expect(screen).not.toContain('size-2 rounded-full bg-brand');
  });

  test('DiceBear art is requested as PNG everywhere', () => {
    for (const file of [
      'src/features/explore/question-presentation.ts',
      'src/features/account/avatar-source.ts',
    ]) {
      expect(read(file)).not.toContain('/svg?');
    }
  });

  test('chat story links fall back to DiceBear art like web', () => {
    const card = read('src/components/chat/ChatStoryCard.tsx');
    expect(card).toContain('getQuestionIdenticonUrl(source.id)');
    expect(card).toContain('onError={() => setPictureFailed(true)}');
  });
});
