export function getSheetBottomPadding(bottomInset: number, minimumSpacing: number) {
  return Math.max(0, bottomInset) + minimumSpacing;
}

export function getSheetTopInset(topInset: number) {
  return Math.max(0, topInset);
}

// Measure the header gap from the bottom of the visible 4px drag indicator.
export const SHEET_HEADER_GAP = 8;
export const SHEET_HEADER_HANDLE_STYLE = {
  height: 8 + 4 + SHEET_HEADER_GAP,
  paddingTop: 8,
  paddingBottom: SHEET_HEADER_GAP,
} as const;

export const SHEET_CLOSE_BUTTON_STYLE = {
  width: 44,
  height: 44,
  minHeight: 44,
  borderRadius: 22,
  paddingHorizontal: 0,
  paddingVertical: 0,
  flexShrink: 0,
} as const;

// Sheet structure: header, body and actions are 32px apart; sections inside the body 24px.
export const SHEET_GROUP_GAP = 32;
export const SHEET_SECTION_GAP = 24;
