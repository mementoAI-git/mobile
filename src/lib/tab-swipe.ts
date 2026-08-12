export function resolveTabSwipeTarget(
  currentIndex: number,
  routeCount: number,
  deltaX: number,
): number | null {
  if (!Number.isFinite(currentIndex) || !Number.isFinite(routeCount) || routeCount <= 1) {
    return null;
  }

  if (Math.abs(deltaX) < 80) return null;

  if (deltaX < 0) {
    if (currentIndex >= routeCount - 1) return null;
    return currentIndex + 1;
  }

  if (deltaX > 0) {
    if (currentIndex <= 0) return null;
    return currentIndex - 1;
  }

  return null;
}
