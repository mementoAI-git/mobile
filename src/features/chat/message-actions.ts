/** Matches UIKit's UILongPressGestureRecognizer default. */
export const MESSAGE_LONG_PRESS_MS = 500;
export const QUICK_MESSAGE_REACTIONS = ['💛', '👍', '⚡'] as const;

export interface MessageAnchor { x: number; y: number; width: number; height: number }

export function getMessageMenuPosition(anchor: MessageAnchor, viewport: { width: number; height: number }, menuHeight: number) {
  const gutter = 12;
  const width = Math.min(248, viewport.width - gutter * 2);
  const below = anchor.y + anchor.height + 8;
  const preferredTop = below + menuHeight <= viewport.height - gutter ? below : anchor.y - menuHeight - 8;
  return {
    width,
    left: Math.max(gutter, Math.min(anchor.x + anchor.width - width, viewport.width - width - gutter)),
    top: Math.max(gutter, Math.min(preferredTop, viewport.height - menuHeight - gutter)),
  };
}

/** Repeating the selected reaction removes it; choosing another replaces it. */
export function toggleMessageReaction(current: string | undefined, next: string): string | undefined {
  return current === next ? undefined : next;
}

export function getMessageReactionKey(userId: string, messageId: string) {
  return JSON.stringify([userId, messageId]);
}
