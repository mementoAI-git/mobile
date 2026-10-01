/**
 * Routes iOS presents as native full-screen modals. They cover the whole
 * window, including the call indicator, so it is not drawn under them.
 * Android draws these routes inside the navigator, so they keep it.
 */
export const IOS_FULL_SCREEN_MODAL_PATHS: ReadonlySet<string> = new Set([
  '/coming-soon',
  '/share',
  '/editor',
  '/create',
  '/article',
]);

export function shouldShowCallIndicator({
  isConnected,
  pathname,
  platform,
  callPath,
}: {
  isConnected: boolean;
  pathname: string;
  platform: string;
  callPath: string;
}): boolean {
  if (!isConnected || pathname === callPath) return false;
  return !(platform === 'ios' && IOS_FULL_SCREEN_MODAL_PATHS.has(pathname));
}

/** Live means connected and not hanging up. Call surfaces show only then. */
export function isCallLive(voice: { isConnected: boolean; isEnding: boolean }): boolean {
  return voice.isConnected && !voice.isEnding;
}

export type CallIndicatorVariant = 'island' | 'statusBar';

/** iPhones with a Dynamic Island have a top safe-area inset of 59pt or more. */
export const ISLAND_MIN_TOP_INSET = 54;

export function callIndicatorVariant(platform: string, topInset: number): CallIndicatorVariant {
  return platform === 'ios' && topInset >= ISLAND_MIN_TOP_INSET ? 'island' : 'statusBar';
}

/**
 * Frame of the black capsule drawn around the Dynamic Island, so the island
 * looks like it grew to show the call. On every island iPhone the island's
 * bottom edge sits about 10pt above the top safe-area inset. The capsule
 * starts a few points above the island and is much wider than it, so the
 * island stays hidden inside on every model. The call row sits below it.
 */
export function islandCapsuleFrame(topInset: number) {
  return {
    top: Math.max(0, topInset - 52),
    width: 168,
    height: 66,
    radius: 24,
    rowHeight: 22,
  };
}

export function callIndicatorStatus(voice: { isMuted: boolean; isAiSpeaking: boolean }): string {
  if (voice.isMuted) return 'Muted';
  return voice.isAiSpeaking ? 'Memento is speaking' : 'Listening';
}
