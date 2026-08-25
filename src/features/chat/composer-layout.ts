interface TextHeightInput {
  measuredHeight: number;
  minHeight: number;
  maxHeight: number;
  verticalPadding: number;
  buffer: number;
}

interface ScrollInput {
  measuredHeight: number;
  renderedHeight: number;
  verticalPadding: number;
  buffer: number;
  maxHeight: number;
}

interface ExpandedMaxHeightInput {
  composerMaxHeight: number;
  assetStripHeight: number;
  actionRowHeight: number;
  composerChromeHeight: number;
  minHeight: number;
}

interface OverlayMaxHeightInput {
  visibleHeight: number;
  headerHeight: number;
  minHeight: number;
}

interface OverlayBottomPaddingInput {
  collapsedComposerHeight: number;
  replyQuoteHeight: number;
  gap: number;
}

interface ChatComposerBottomPaddingInput {
  keyboardVisible: boolean;
  bottomInset: number;
  parentOwnsBottomSafeArea: boolean;
  keyboardGap: number;
}

interface ChatComposerControlsInput {
  anyUploading: boolean;
  disabled: boolean;
  hasContent: boolean;
  isRecording: boolean;
  loading: boolean;
  isFocused?: boolean;
}

interface ExpandedTextComposerInput {
  hasAttachments: boolean;
  hasText: boolean;
  isFocused?: boolean;
  textHeight: number;
  collapsedActionSize: number;
  expansionBuffer: number;
  isExpanded?: boolean;
}

export function getComposerTextHeight({
  measuredHeight,
  minHeight,
  maxHeight,
  verticalPadding,
  buffer,
}: TextHeightInput) {
  const neededHeight = measuredHeight + verticalPadding + buffer;
  return Math.min(maxHeight, Math.max(minHeight, neededHeight));
}

export function getComposerTextScrollEnabled({
  measuredHeight,
  renderedHeight,
  verticalPadding,
  buffer,
  maxHeight,
}: ScrollInput) {
  const neededHeight = measuredHeight + verticalPadding + buffer;
  return renderedHeight >= maxHeight - 1 && neededHeight > maxHeight;
}

export function getExpandedComposerTextMaxHeight({
  composerMaxHeight,
  assetStripHeight,
  actionRowHeight,
  composerChromeHeight,
  minHeight,
}: ExpandedMaxHeightInput) {
  return Math.max(minHeight, composerMaxHeight - assetStripHeight - actionRowHeight - composerChromeHeight);
}

export function getComposerOverlayMaxHeight({
  visibleHeight,
  headerHeight,
  minHeight,
}: OverlayMaxHeightInput) {
  return Math.max(minHeight, visibleHeight - headerHeight);
}

export function getComposerOverlayBottomPadding({
  collapsedComposerHeight,
  replyQuoteHeight,
  gap,
}: OverlayBottomPaddingInput) {
  return collapsedComposerHeight + replyQuoteHeight + gap;
}

export function getChatComposerBottomPadding({
  keyboardVisible,
  bottomInset,
  parentOwnsBottomSafeArea,
  keyboardGap,
}: ChatComposerBottomPaddingInput) {
  if (keyboardVisible) return keyboardGap;
  return parentOwnsBottomSafeArea ? 0 : bottomInset;
}

export function getChatComposerControls({
  anyUploading,
  disabled,
  hasContent,
  isRecording,
  loading,
  isFocused = false,
}: ChatComposerControlsInput) {
  const showSend = !loading && hasContent;
  return {
    showStop: loading,
    showMic: !loading,
    showEmoji: !loading,
    showSend,
    sendDisabled: disabled || !hasContent || anyUploading || isRecording,
  };
}

export function getFloatingDockSafeAreaOverlap({
  dockHeight,
  anchorOffset,
}: {
  dockHeight: number;
  anchorOffset: number;
}) {
  return Math.max(0, dockHeight / 2 - anchorOffset);
}

interface ExpandedTextComposerInput {
  hasAttachments: boolean;
  hasText: boolean;
  isFocused?: boolean;
  textHeight: number;
  collapsedActionSize: number;
  expansionBuffer?: number;
  isExpanded?: boolean;
  multiline?: boolean;
  text?: string;
}

export function shouldUseExpandedTextComposer({
  hasAttachments,
  hasText,
  textHeight,
  collapsedActionSize,
  expansionBuffer = 0,
  isExpanded = false,
  multiline = false,
  text,
}: ExpandedTextComposerInput) {
  if (hasAttachments) return true;
  if (!hasText) return false;
  if (isExpanded) return true;
  if (multiline) return true;
  if (text && text.includes('\n')) return true;

  return textHeight > collapsedActionSize + expansionBuffer;
}
