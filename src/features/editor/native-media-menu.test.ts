import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

test('the story editor add button uses the iOS system menu', () => {
  const ios = readFileSync('src/components/ui/NativeMediaMenu.ios.tsx', 'utf8');
  const bar = readFileSync('src/components/ui/EditorActionBar.tsx', 'utf8');
  expect(ios).toContain("from '@expo/ui/swift-ui'");
  expect(ios).toContain('<Menu');
  for (const label of ['"Gallery"', '"Camera"', '"Files"', "'Audio'"]) expect(ios).toContain(label);
  expect(bar).toContain('<NativeMediaMenu');
  // The tile popup only shows where there is no system menu.
  expect(bar).toContain('visible={uploadOpen && !HAS_NATIVE_MEDIA_MENU}');
});
