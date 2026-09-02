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
    expect(editor).toContain('snapPoints={[\'92%\']}');
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

  test('requires meaningful story body content before enabling the Next action', () => {
    expect(editor).toContain('function hasMeaningfulStoryBodyContent');
    expect(editor).toContain('const storyHasContent = hasMeaningfulStoryBodyContent(storyBody);');
    expect(editor).toContain('if (!storyHasContent) return;');
  });

  test('keeps publish success as a full-screen modal while using the sheet only for the form', () => {
    expect(editor).toContain('const [publishedUrl, setPublishedUrl] = useState<string | null>(null);');
    expect(editor).toContain('<Modal visible={!!publishedUrl} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent');
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
    expect(editor).toContain("privacyMode === 'private' ? { beneficiaries: [], groups: [] }");
    expect(editor).toContain("privacyMode === 'specific'");
    expect(publishPrivacySheet).toContain('useGroups');
    expect(publishPrivacySheet).toContain('Specific people & groups');
    expect(publishPrivacySheet).toContain("pointerEvents={isSpecific ? 'auto' : 'none'}");
  });

  test('does not force avoidIosKeyboard during native-to-webview focus handoff', () => {
    expect(storyRichEditor).not.toContain('avoidIosKeyboard: true');
    expect(storyRichEditor).toContain('useEditorBridge({');
  });
});