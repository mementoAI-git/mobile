/**
 * Routes iOS presents as native full-screen modals. They cover the whole
 * window, including the call strip, so the strip must not reserve space or
 * remove the screens' top inset while one is open. Android draws these
 * routes inside the navigator, below the strip, so they keep it.
 */
export const IOS_FULL_SCREEN_MODAL_PATHS: ReadonlySet<string> = new Set([
  '/coming-soon',
  '/share',
  '/editor',
  '/create',
  '/article',
]);

export function shouldShowCallStrip({
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

export function callStripStatus(voice: { isMuted: boolean; isAiSpeaking: boolean }): string {
  if (voice.isMuted) return 'Muted, tap to talk';
  return voice.isAiSpeaking ? 'Memento is speaking' : 'Listening';
}