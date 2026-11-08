import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { COLORS } from '@/constants/tokens';
import { DARK_COLORS, DEEP_SKY_COLORS } from '@/constants/appearance';
import { buildEditorThemeCSS } from './editor-theme';

for (const [name, colors] of Object.entries({ light: COLORS, dark: DARK_COLORS, deepSky: DEEP_SKY_COLORS })) {
  test(`rich story content uses ${name} colors`, () => {
    const css = buildEditorThemeCSS(colors);
    expect(css).toContain(`background: ${colors.background}`);
    expect(css).toContain(`color: ${colors.textBase}`);
    expect(css).toContain(`color: ${colors.textStrong}`);
    expect(css).toContain(`color: ${colors.textMuted}`);
    expect(css).toContain(`caret-color: ${colors.textStrong}`);
    expect(css).toContain(`3px solid ${colors.brand}`);
    if (name !== 'light') expect(css).not.toContain('background: #ffffff');
  });
}

describe('theme changes preserve an open draft', () => {
  test('updates CSS after the WebView is ready without replacing story content', () => {
    const source = readFileSync('src/components/ui/StoryRichEditor.tsx', 'utf8');
    expect(source).toContain('buildEditorThemeCSS(colors, { transparent })');
    expect(source).toContain("injectCSS(themeCSS, 'memento-theme')");
    expect(source).toContain('[isReady, themeCSS]');
    expect(source).not.toContain('background: #ffffff');
  });
  test('native editor and toolbar styles resolve explicit semantic roles', () => {
    for (const file of ['StoryRichEditor', 'EditorActionBar']) {
      const source = readFileSync(`src/components/ui/${file}.tsx`, 'utf8');
      expect(source).toContain('useThemeStyles(createStyles)');
      expect(source).not.toContain('useThemedStyles');
    }
  });
});


describe('publish success screen appearance', () => {
  test('both publishing flows reuse one success screen', () => {
    for (const file of ['app/editor.tsx', 'app/article.tsx']) {
      const source = readFileSync(file, 'utf8');
      expect(source).toContain("import { PublishSuccessView } from '@/components/editor/PublishSuccessView'");
      expect(source).not.toContain('function PublishSuccessView(');
    }
  });
  test('shared screen provides the reference artwork, optical icon sizes and preferred action on the right', () => {
    const source = readFileSync('src/components/editor/PublishSuccessView.tsx', 'utf8');
    expect(source).toContain('<SuccessRays width={width} />');
    expect(source).toContain('dark ? PUBLISH_SUCCESS_ASSETS.glowDark : PUBLISH_SUCCESS_ASSETS.glow');
    expect(source).toContain('TYPE.publishSuccessTitle');
    expect(source).toContain('width: 24, height: 24');
    expect(source).toContain('PUBLISH_SUCCESS_ASSETS[id].replaceAll');
    expect(source).toContain('flex: 0.45');
    expect(source).toContain('flex: 0.55');
    expect(source.indexOf('onPress={onDismiss}')).toBeLessThan(source.indexOf('onPress={onAddAnother}'));
  });
});


for (const [name, colors] of Object.entries({ light: COLORS, dark: DARK_COLORS, deepSky: DEEP_SKY_COLORS })) {
  test(`selected story text has an explicit contrasting pair in ${name}`, () => {
    const css = buildEditorThemeCSS(colors);
    for (const selector of ['::selection', '.highlight-background']) {
      const block = css.slice(css.indexOf(selector), css.indexOf('}', css.indexOf(selector)));
      expect(block).toContain(`background-color: ${colors.activeFill} !important`);
      expect(block).toContain(`color: ${colors.activeText} !important`);
      expect(block).toContain(`-webkit-text-fill-color: ${colors.activeText} !important`);
    }
  });
}
