export function resolveChatConversationId(
  routeConversationId?: string,
  primaryConversationId?: string | null,
): string | null {
  if (routeConversationId === 'new') return null;
  return routeConversationId || primaryConversationId || null;
}
