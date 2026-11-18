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

test('the chat add button uses the iOS system menu and photo picker', () => {
  const input = readFileSync('src/components/chat/ChatInput.tsx', 'utf8');
  expect(input).toContain('HAS_NATIVE_MEDIA_MENU ? (');
  expect(input.match(/onGallery=\{handlePickFromLibrary\}/g)?.length).toBe(2);
  expect(input).toContain('ImagePicker.launchImageLibraryAsync({');
  expect(input).toContain('allowsMultipleSelection: true');
  // The in-app gallery sheet only renders where there is no system menu.
  expect(input).toContain('{!HAS_NATIVE_MEDIA_MENU && (');
});
