import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const editor = readFileSync('app/editor.tsx', 'utf8');
test('success replaces the composer in the existing route instead of stacking another native modal', () => {
  expect(editor).toContain('if (publishedUrl) {');
  const success = editor.slice(editor.indexOf('if (publishedUrl) {'), editor.indexOf('if (publishedUrl) {') + 750);
  expect(success).toContain('<PublishSuccessView');
  expect(success).toContain('onDismiss={handleDismissPublishedSuccess}');
  expect(editor).not.toContain('<Modal visible={!!publishedUrl}');
  expect(editor).not.toContain('lastPublishedUrlRef');
});
