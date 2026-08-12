// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const input = readFileSync('src/components/chat/ChatInput.tsx', 'utf8');

describe('chat input layout safeguards', () => {
  test('does not derive composer ceiling directly from keyboard height', () => {
    expect(input).not.toContain('windowHeight - (keyboardVisible ? keyboardHeight : 0)');
    expect(input).not.toContain('keyboardAwareComposerMaxHeight');
    expect(input).toContain('const composerMaxHeight = maxComposerHeight ?? fallbackComposerMaxHeight;');
  });

  test('ignores content-size feedback when the composer is empty', () => {
    expect(input).toContain('if (!hasText && !hasAttachments) {');
    expect(input).toContain('setCompactTextHeight(COMPACT_TEXT_MIN_HEIGHT);');
    expect(input).toContain('setExpandedTextHeight(EXPANDED_TEXT_MIN_HEIGHT);');
    expect(input).toContain('if (isTextComposerExpanded) setIsTextComposerExpanded(false);');
  });

  test('ignores repeated content-size updates once the target height has already been applied', () => {
    expect(input).toContain('if (useExpandedComposer) {');
    expect(input).toContain('if (Math.abs(expandedTextHeight - nextHeight) <= 1) {');
    expect(input).toContain('if (Math.abs(compactTextHeight - nextHeight) <= 1) {');
  });
});