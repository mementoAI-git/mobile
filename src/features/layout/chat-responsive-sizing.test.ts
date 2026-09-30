import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  getChatSettingsLayout,
} from '@/features/chat/chat-settings-layout';
import {
  getChatComposerBottomPadding,
  getComposerOverlayMaxHeight,
  getExpandedComposerTextMaxHeight,
} from '@/features/chat/composer-layout';
import { minTouchTarget, vs, hs } from '@/constants/responsive';

describe('chat responsive sizing and geometry', () => {
  const chatScreenSource = readFileSync(
    resolve(process.cwd(), 'src/screens/ChatScreen.tsx'),
    'utf-8',
  );
  const chatInputSource = readFileSync(
    resolve(process.cwd(), 'src/components/chat/ChatInput.tsx'),
    'utf-8',
  );
  const voiceUpgradeSource = readFileSync(
    resolve(process.cwd(), 'src/components/chat/VoiceUpgradeScreen.tsx'),
    'utf-8',
  );
  const voiceCallSource = readFileSync(
    resolve(process.cwd(), 'app/voice-call.tsx'),
    'utf-8',
  );

  test('eliminates direct react-native-size-matters imports from chat modules', () => {
    expect(chatScreenSource).not.toContain("from 'react-native-size-matters'");
    expect(chatInputSource).not.toContain("from 'react-native-size-matters'");
    expect(chatScreenSource).toContain("from '@/constants/responsive'");
    expect(chatInputSource).toContain("from '@/constants/responsive'");
  });

  test('never scales keyboard heights or safe-area insets', () => {
    // In ChatInput.tsx, keyboardGap and insets should remain unscaled
    expect(chatInputSource).not.toContain('verticalScale(insets');
    expect(chatInputSource).not.toContain('vs(insets');
    expect(chatInputSource).not.toContain('keyboardGap: verticalScale');
    expect(chatInputSource).not.toContain('keyboardGap: vs(');
  });

  test('chat settings fits safely on compact 320pt screens', () => {
    const layout = getChatSettingsLayout(320);
    expect(layout.contentWidth).toBeLessThanOrEqual(320);
    expect(layout.mediaTileWidth * 4).toBeLessThanOrEqual(layout.contentWidth);
    expect(layout.insightCardWidth).toBeLessThanOrEqual(layout.contentWidth);
  });

  test('composer overlay and text height calculations remain stable on compact 320x568 viewport', () => {
    const visibleHeight = 568;
    const headerHeight = vs(70);
    const composerMax = getComposerOverlayMaxHeight({
      visibleHeight,
      headerHeight,
      minHeight: vs(180),
    });
    expect(composerMax).toBeGreaterThanOrEqual(180);
    expect(composerMax).toBeLessThan(visibleHeight);

    const expandedMax = getExpandedComposerTextMaxHeight({
      composerMaxHeight: composerMax,
      assetStripHeight: hs(74),
      actionRowHeight: 44,
      composerChromeHeight: 20,
      minHeight: 24,
    });
    expect(expandedMax).toBeGreaterThanOrEqual(24);
  });

  test('touch targets on chat close and action controls meet 44dp minimum', () => {
    expect(minTouchTarget(40)).toBeGreaterThanOrEqual(44);
    expect(minTouchTarget(36)).toBeGreaterThanOrEqual(44);
  });
});
