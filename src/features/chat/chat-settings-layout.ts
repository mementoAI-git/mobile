const REFERENCE_MAX_WIDTH = 520;
// Matches the screen's 20px side padding, so two cards fit on a row.
const CONTENT_INSET = 20;
const MEDIA_GAP = 4;
const SELECTION_GAP = 12;

export function getChatSettingsLayout(screenWidth: number) {
  const pageWidth = Math.min(screenWidth, REFERENCE_MAX_WIDTH);
  const contentWidth = pageWidth - CONTENT_INSET * 2;

  return {
    pageWidth,
    contentWidth,
    mediaTileWidth: (contentWidth - MEDIA_GAP * 4) / 5,
    selectionCardWidth: (contentWidth - SELECTION_GAP) / 2,
    insightCardWidth: Math.min(172, contentWidth - 24),
  };
}
