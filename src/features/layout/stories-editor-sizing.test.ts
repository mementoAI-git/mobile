import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { minTouchTarget, screenGutter, contentMaxWidth, responsiveSpace } from '@/constants/responsive';

describe('stories and editor responsive sizing', () => {
  const storyDetailSource = readFileSync(
    resolve(process.cwd(), 'app/(tabs)/stories/[id].tsx'),
    'utf-8',
  );
  const editorActionBarSource = readFileSync(
    resolve(process.cwd(), 'src/components/ui/EditorActionBar.tsx'),
    'utf-8',
  );
  const storyRichEditorSource = readFileSync(
    resolve(process.cwd(), 'src/components/ui/StoryRichEditor.tsx'),
    'utf-8',
  );
  const storiesIndexSource = readFileSync(
    resolve(process.cwd(), 'app/(tabs)/stories/index.tsx'),
    'utf-8',
  );

  test('eliminates module-level Dimensions.get from story detail', () => {
    // Assert no module-level Dimensions.get('window') snapshot exists
    const lines = storyDetailSource.split('\n');
    const moduleLevelDimensions = lines.filter((line) =>
      line.includes("Dimensions.get('window')") || line.includes('Dimensions.get("window")'),
    );
    expect(moduleLevelDimensions.length).toBe(0);
    expect(storyDetailSource).toContain('useWindowDimensions');
  });

  test('editor formatting buttons maintain minimum 44dp hit targets', () => {
    expect(minTouchTarget(36)).toBeGreaterThanOrEqual(44);
    expect(editorActionBarSource).toContain('minTouchTarget');
    expect(storyRichEditorSource).toContain('minTouchTarget');
  });

  test('stories FAB maintains 44dp floor', () => {
    expect(storiesIndexSource).toContain('minTouchTarget(44)');
  });
});
