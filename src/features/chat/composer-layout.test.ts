// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import {
  getComposerTextHeight,
  getComposerTextScrollEnabled,
  getComposerOverlayBottomPadding,
  getComposerOverlayMaxHeight,
  getExpandedComposerTextMaxHeight,
  shouldUseExpandedTextComposer,
} from './composer-layout';

describe('chat composer layout', () => {
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
});
