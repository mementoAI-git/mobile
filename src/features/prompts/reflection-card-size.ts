/** Web mobile overview reflection cards: `w-[min(78vw,320px)]`, `gap-4` between cards. */
export const REFLECTION_CARD_MAX_WIDTH = 320;
export const REFLECTION_CARD_GAP = 16;

export function reflectionCardWidth(windowWidth: number) {
  return Math.min(REFLECTION_CARD_MAX_WIDTH, Math.round(windowWidth * 0.78));
}
