export function getModalBottomPadding(bottomInset: number, minimumSpacing: number) {
  return Math.max(0, bottomInset) + minimumSpacing;
}

export function getBoundedModalScrollStyle() {
  return {
    flex: 1,
    minHeight: 0,
  } as const;
}
