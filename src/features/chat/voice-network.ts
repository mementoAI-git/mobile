export type NetworkSnapshot = {
  type: string;
  isConnected: boolean | null;
};

/**
 * Reconnect the live session when connectivity comes back or the transport
 * changes (for example Wi-Fi to cellular). The old WebSocket usually dies
 * silently on such a switch, and waiting for TCP to notice takes seconds.
 */
export function shouldReconnectOnNetworkChange(
  previous: NetworkSnapshot | undefined,
  next: NetworkSnapshot,
): boolean {
  if (!previous) return false;
  if (next.isConnected !== true) return false;
  if (previous.isConnected !== true) return true;
  return previous.type !== next.type;
}
