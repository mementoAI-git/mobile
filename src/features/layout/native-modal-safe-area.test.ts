// @ts-nocheck
import { describe, expect, test } from 'bun:test';

const ROUTE_FILES = {
  'coming-soon': '../../../app/coming-soon.tsx',
  share: '../../../app/share.tsx',
  editor: '../../../app/editor.tsx',
  create: '../../../app/create.tsx',
  article: '../../../app/article.tsx',
  'voice-call': '../../../app/voice-call.tsx',
} as const;

describe('native full-screen modal safe-area ownership', () => {
  test('every registered full-screen modal establishes a local safe-area provider', async () => {
    const layout = await Bun.file(new URL('../../../app/_layout.tsx', import.meta.url)).text();
    const registeredRoutes = [...layout.matchAll(
      /<Stack\.Screen\s*name="([^"]+)"\s*options=\{\{\s*presentation:\s*'fullScreenModal'/g,
    )].map((match) => match[1]);

    expect(registeredRoutes).toEqual(['coming-soon', 'voice-call', 'share', 'editor', 'create', 'article']);

    for (const route of registeredRoutes) {
      const source = await Bun.file(new URL(ROUTE_FILES[route], import.meta.url)).text();
      expect(source).toMatch(/<(?:SafeAreaProvider|NativeModalSafeAreaBoundary)(?:\s|>)/);
    }
  });
});
