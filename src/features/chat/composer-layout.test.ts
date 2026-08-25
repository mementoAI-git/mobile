// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import {
  getComposerTextHeight,
  getComposerTextScrollEnabled,
  getComposerOverlayBottomPadding,
  getComposerOverlayMaxHeight,
  getChatComposerBottomPadding,
  getFloatingDockSafeAreaOverlap,
  getExpandedComposerTextMaxHeight,
  shouldUseExpandedTextComposer,
} from './composer-layout';

describe('chat composer layout', () => {
  test('keeps mic and emoji visible in idle state, morphing send when active', async () => {
    const composer = await import('./composer-layout');
    expect(composer.getChatComposerControls).toBeFunction();

    // Idle state: unfocused, empty -> send button hidden, emoji visible
    expect(composer.getChatComposerControls({
      anyUploading: false,
      disabled: false,
      hasContent: false,
      isRecording: false,
      loading: false,
      isFocused: false,
    })).toEqual({
      sendDisabled: true,
      showMic: true,
      showEmoji: true,
      showSend: false,
      showStop: false,
    });

    // Active state: focused or has content -> send button visible
    expect(composer.getChatComposerControls({
      anyUploading: false,
      disabled: false,
      hasContent: true,
      isRecording: false,
      loading: false,
      isFocused: false,
    })).toEqual({
      sendDisabled: false,
      showMic: true,
      showEmoji: true,
      showSend: true,
      showStop: false,
    });

    expect(composer.getChatComposerControls({
      anyUploading: false,
      disabled: false,
      hasContent: false,
      isRecording: false,
      loading: false,
      isFocused: true,
    })).toEqual({
      sendDisabled: true,
      showMic: true,
      showEmoji: true,
      showSend: true,
      showStop: false,
    });
  });

  test('expands text height to include padding before enabling scrolling', () => {
    expect(getComposerTextHeight({
      measuredHeight: 72,
      minHeight: 34,
      maxHeight: 180,
      verticalPadding: 12,
      buffer: 6,
    })).toBe(90);

    expect(getComposerTextScrollEnabled({
      measuredHeight: 72,
      renderedHeight: 90,
      verticalPadding: 12,
      buffer: 6,
      maxHeight: 180,
    })).toBe(false);
  });

  test('only enables scrolling after the full visible height has been used', () => {
    expect(getComposerTextHeight({
      measuredHeight: 220,
      minHeight: 34,
      maxHeight: 180,
      verticalPadding: 12,
      buffer: 6,
    })).toBe(180);

    expect(getComposerTextScrollEnabled({
      measuredHeight: 220,
      renderedHeight: 180,
      verticalPadding: 12,
      buffer: 6,
      maxHeight: 180,
    })).toBe(true);
  });

  test('reserves space for assets and controls when attachments exist', () => {
    expect(getExpandedComposerTextMaxHeight({
      composerMaxHeight: 420,
      assetStripHeight: 74,
      actionRowHeight: 52,
      composerChromeHeight: 30,
      minHeight: 34,
    })).toBe(264);
  });

  test('lets overlay composer grow over content while preserving collapsed list padding', () => {
    expect(getComposerOverlayMaxHeight({
      visibleHeight: 720,
      headerHeight: 72,
      minHeight: 180,
    })).toBe(648);

    expect(getComposerOverlayBottomPadding({
      collapsedComposerHeight: 86,
      replyQuoteHeight: 0,
      gap: 10,
    })).toBe(96);
  });

  test('keeps the composer flush with a bottom safe area owned by its screen', () => {
    expect(getChatComposerBottomPadding({
      keyboardVisible: false,
      bottomInset: 34,
      parentOwnsBottomSafeArea: true,
      keyboardGap: 8,
    })).toBe(0);

    expect(getChatComposerBottomPadding({
      keyboardVisible: false,
      bottomInset: 34,
      parentOwnsBottomSafeArea: false,
      keyboardGap: 8,
    })).toBe(34);
  });

  test('matches the tab dock overlap into the bottom safe area', () => {
    expect(getFloatingDockSafeAreaOverlap({ dockHeight: 58, anchorOffset: 24 })).toBe(5);
    expect(getFloatingDockSafeAreaOverlap({ dockHeight: 60, anchorOffset: 24 })).toBe(6);
  });

  test('keeps one-line text compact until the text needs expanded composer space', () => {
    expect(shouldUseExpandedTextComposer({
      hasAttachments: false,
      hasText: true,
      textHeight: 34,
      collapsedActionSize: 40,
      expansionBuffer: 8,
    })).toBe(false);

    expect(shouldUseExpandedTextComposer({
      hasAttachments: false,
      hasText: true,
      textHeight: 54,
      collapsedActionSize: 40,
      expansionBuffer: 8,
    })).toBe(true);

    expect(shouldUseExpandedTextComposer({
      hasAttachments: true,
      hasText: false,
      textHeight: 24,
      collapsedActionSize: 40,
      expansionBuffer: 8,
    })).toBe(true);
  });

  test('keeps expanded text composer stable after line-wrap expansion', () => {
    expect(shouldUseExpandedTextComposer({
      hasAttachments: false,
      hasText: true,
      textHeight: 34,
      collapsedActionSize: 40,
      expansionBuffer: 8,
      isExpanded: true,
    })).toBe(true);
  });
});
