/**
 * Bottom sheet presentation, matching web's phone sheets
 * (Web/memento-web/src/index.css, `@media (max-width: 639.98px)`):
 *
 * - Top corners: `--radius-sheet` 20px.
 * - Height: at most 92% of the screen (`max-height: 92dvh`), leaving an 8% gap
 *   at the top; at least `min(524px, 92dvh)` (Publish post sets the size of
 *   every sheet). Short confirmations (web alert dialogs) stay compact.
 * - Grabber: 36×4, fully rounded, stroke-neutral-strong at 35%.
 * - Backdrop: light `rgba(94,94,94,0.5)`; dark and Deep Sky a lighter grey
 *   `rgba(64,66,76,0.55)`, so the dark sheet stands out from the dimmed page.
 * - Fill: `--bg-raised` (white) on light, `--bg-sheet` on dark and Deep Sky
 *   (`COLORS.sheet`).
 */

export const SHEET_RADIUS = 20;
export const SHEET_MAX_HEIGHT_RATIO = 0.92;
export const SHEET_MIN_HEIGHT = 524;

export const SHEET_GRABBER = { width: 36, height: 4, borderRadius: 2, opacity: 0.35 } as const;

export const SHEET_BACKDROP = {
  light: { color: 'rgb(94,94,94)', opacity: 0.5 },
  // Lighter than the dark sheet (#12131a), so the sheet stands out against the dimmed page.
  dark: { color: 'rgb(64,66,76)', opacity: 0.55 },
} as const;

/** Space kept above a fully open sheet: web's 8% gap, never under the status bar. */
export function sheetTopInset(windowHeight: number, safeTop: number) {
  return Math.max(safeTop, Math.round(windowHeight * (1 - SHEET_MAX_HEIGHT_RATIO)));
}

/** Tallest a sheet may be. */
export function sheetMaxHeight(windowHeight: number) {
  return Math.round(windowHeight * SHEET_MAX_HEIGHT_RATIO);
}

/** Shortest a regular sheet may be: `min(524px, 92dvh)`. */
export function sheetMinHeight(windowHeight: number) {
  return Math.min(SHEET_MIN_HEIGHT, sheetMaxHeight(windowHeight));
}

/**
 * Snap points with none below the minimum sheet height. Percentages are of
 * the space under the top inset, as @gorhom/bottom-sheet measures them.
 */
export function clampSheetSnapPoints(
  points: readonly (string | number)[],
  windowHeight: number,
  topInset: number,
): (string | number)[] {
  const container = windowHeight - topInset;
  const min = Math.min(sheetMinHeight(windowHeight), container);
  const clamped: (string | number)[] = [];
  let previous = -1;
  for (const point of points) {
    const px = typeof point === 'number' ? point : (parseFloat(point) / 100) * container;
    const value = px >= min ? point : min;
    const valuePx = Math.max(px, min);
    // Snap points must rise; two that clamp to the minimum become one.
    if (valuePx <= previous) continue;
    clamped.push(value);
    previous = valuePx;
  }
  return clamped;
}
