/** Live means connected and not hanging up. Call surfaces show only then. */
export function isCallLive(voice: { isConnected: boolean; isEnding: boolean }): boolean {
  return voice.isConnected && !voice.isEnding;
}

/** iPhones with a Dynamic Island have a top safe-area inset of 59pt or more. */
export const ISLAND_MIN_TOP_INSET = 54;

export function hasDynamicIsland(platform: string, topInset: number): boolean {
  return platform === 'ios' && topInset >= ISLAND_MIN_TOP_INSET;
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
