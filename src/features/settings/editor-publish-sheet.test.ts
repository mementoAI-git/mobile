// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const editor = readFileSync('app/editor.tsx', 'utf8');
const storyRichEditor = readFileSync('src/components/ui/StoryRichEditor.tsx', 'utf8');
const publishPrivacySheet = readFileSync('src/components/sheets/PublishPrivacySheet.tsx', 'utf8');

describe('editor publish sheet', () => {
  test('uses a local bottom sheet for the publish flow instead of a full-screen modal', () => {
    expect(editor).toContain('const publishSheetRef = useRef<BottomSheetModal>(null);');
    expect(editor).toContain('publishSheetRef.current?.present()');
    expect(editor).toContain("snapPoints={sheetChrome.snapPoints(['92%'])}");
    expect(editor).toContain('<PublishModalInner');
    expect(editor).not.toContain('function PublishModal(');
  });

  test('presents the publish sheet directly from the Next action after dismissing the editor keyboard', () => {
    expect(editor).toContain('const handleOpenPublishSheet = useCallback(() => {');
    expect(editor).toContain('editorBridge?.blur();');
    expect(editor).toContain('Keyboard.dismiss();');
    expect(editor).toContain('setShowPublish(true);');
    expect(editor).toContain('publishSheetRef.current?.present();');
  });

  test('allows title, meaningful body, or uploaded attachments before continuing', () => {
    expect(editor).toContain("import { hasMeaningfulStoryBodyContent } from '@/features/editor/story-content'");
    expect(editor).toContain('const hasContent = hasMeaningfulStoryBodyContent(v);');
    expect(editor).toContain('const storyCanContinue = Boolean(title.trim()) || storyHasContent || uploadedIds.length > 0;');
    expect(editor).toContain('disabled={!storyCanContinue');
  });

  test('replaces the editor content with publish success while using the sheet for the form', () => {
    expect(editor).toContain('const [publishedUrl, setPublishedUrl] = useState<string | null>(null);');
    expect(editor).toContain('if (publishedUrl) {');
    expect(editor).not.toContain('<Modal visible={!!publishedUrl}');
    expect(editor).toContain('<PublishSuccessView');
    expect(editor).toContain('onPublished={handlePublishCreated}');
  });

  test('dismisses the actual publish sheet when the close path runs', () => {
    expect(editor).toContain('const handleClosePublishSheet = useCallback(() => {');
    expect(editor).toContain('publishSheetRef.current?.dismiss();');
    expect(editor).toContain('onClose={handleClosePublishSheet}');
  });

  test('uses a sheet-aware input for publish tags', () => {
    expect(editor).toContain('BottomSheetTextInput');
    expect(editor).toContain('<BottomSheetTextInput value={tags} onChangeText={setTags}');
  });

  test('uses a nested privacy sheet with beneficiaries, groups, and global visibility modes', () => {
    expect(editor).toContain('const privacySheetRef = useRef<BottomSheetModal>(null);');
    expect(editor).toContain('<PublishPrivacySheet');
    expect(editor).toContain('buildEditorPublishPayload({');
    expect(editor).toContain('setAudience({ mode: nextMode');
    expect(publishPrivacySheet).toContain('useGroups');
    expect(publishPrivacySheet).toContain('Specific people & groups');
    expect(publishPrivacySheet).toContain("setDraftMode('specific')");
    expect(publishPrivacySheet).not.toContain("pointerEvents={isSpecific ? 'auto' : 'none'}");
  });

  test('does not force avoidIosKeyboard during native-to-webview focus handoff', () => {
    expect(storyRichEditor).not.toContain('avoidIosKeyboard: true');
    expect(storyRichEditor).toContain('useEditorBridge({');
  });
});
