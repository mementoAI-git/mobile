export function getSheetBottomPadding(bottomInset: number, minimumSpacing: number) {
  return Math.max(0, bottomInset) + minimumSpacing;
}

export function getSheetTopInset(topInset: number) {
  return Math.max(0, topInset);
}
