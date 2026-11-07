import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
const editor = readFileSync('app/editor.tsx', 'utf8');
const privacy = readFileSync('src/components/sheets/PublishPrivacySheet.tsx', 'utf8');
describe('story publishing controls', () => {
  test('labels drafts and moves the live status dot into that button without a count', () => {
    expect(editor).toContain('>Drafts</Text>');
    expect(editor).not.toContain('draftCount');
    expect(editor).toContain('getDraftButtonDotColor(savedStatus,');
  });
  test('makes tags explicitly optional', () => {
    expect(editor).toContain('Tags (optional)');
    expect(editor).toContain('Relevant tags will be added in the background');
  });
  test('opens the audience sheet at its full snap point with a scrollable body', () => {
    expect(privacy).toContain('enableDynamicSizing={false}');
    expect(privacy).toContain("snapPoints={['92%']}");
    expect(privacy).toContain('style={{ flex: 1 }}');
  });
  test('leaves room around selection checks and gives each selected card a tinted border', () => {
    expect(privacy).toContain('paddingTop: 8, paddingBottom: 24');
    expect(privacy).toContain("draftMode === 'private' ? `${COLORS.error}40`");
    expect(privacy).toContain("draftMode === 'all' ? `${COLORS.info}40`");
    expect(privacy).toContain("maxWidth: '80%'");
  });
});


test('draft rows keep images and copy in native layout instead of the button text wrapper', () => {
  const drafts = readFileSync('src/components/sheets/DraftsSheet.tsx', 'utf8');
  const row = drafts.slice(drafts.indexOf('const DraftRow ='));
  expect(row).toMatch(/<Button variant="ghost" iconOnly onPress=\{handleLoad\}/);
  expect(row).toContain('flexShrink: 0');
  expect(row).toContain('gap: 12');
});

test('audience search uses the shared focus-aware input with bottom-sheet keyboard handling', () => {
  expect(privacy).toContain('InputComponent={BottomSheetTextInput}');
  expect(privacy).toContain('accessibilityLabel="Search user or group"');
  expect(privacy).toContain('variant="rounded"');
});
