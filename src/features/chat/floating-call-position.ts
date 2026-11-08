/**
 * Where the floating voice call rests and when it tucks away. Web keeps the
 * card 8px inside the window (use-floating-voice-position.ts); mobile adds
 * pushing it past the left or right edge to tuck it behind a small tab.
 */

export type FloatingCallSide = 'left' | 'right';
/** Where a tucked call waits: an edge tab, or the Dynamic Island. */
export type FloatingCallTuck = FloatingCallSide | 'island';

/** Web: 8px from every window edge. */
export const FLOATING_CALL_EDGE = 8;
/** Web: `w-[min(375px,calc(100vw-2rem))]`, `right-4`. */
export const FLOATING_CALL_MAX_WIDTH = 375;
export const FLOATING_CALL_GUTTER = 16;
/** The tab left at the edge while the call is tucked away. */
export const FLOATING_CALL_NUDGE_WIDTH = 28;
export const FLOATING_CALL_NUDGE_HEIGHT = 72;
/** Tucks once this share of the card is past an edge on release. */
export const FLOATING_CALL_TUCK_OVERFLOW = 0.3;
/** Or on a sideways fling at least this fast (points per ms). */
export const FLOATING_CALL_TUCK_VELOCITY = 1.2;

export function floatingCallWidth(screenWidth: number) {
  return Math.min(FLOATING_CALL_MAX_WIDTH, screenWidth - FLOATING_CALL_GUTTER * 2);
}

/** Back on screen against this side, at web's 16px gutter. */
export function floatingCallRestX(side: FloatingCallSide, screenWidth: number, width: number) {
  return side === 'right' ? screenWidth - width - FLOATING_CALL_GUTTER : FLOATING_CALL_GUTTER;
}

/** Fully off screen past this side. */
export function floatingCallTuckX(side: FloatingCallSide, screenWidth: number, width: number) {
  return side === 'right' ? screenWidth + FLOATING_CALL_EDGE : -width - FLOATING_CALL_EDGE;
}

export function resolveFloatingCallRelease({ x, y, vx, vy = 0, island = false, screenWidth, width, minY, maxY }: {
  x: number;
  y: number;
  vx: number;
  /** Upward fling speed; only used with `island`. */
  vy?: number;
  /** Island iPhones tuck into the Dynamic Island, also on an upward fling. */
  island?: boolean;
  screenWidth: number;
  width: number;
  minY: number;
  maxY: number;
}): { tuck: FloatingCallTuck | null; x: number; y: number } {
  const clampedY = Math.min(Math.max(y, minY), maxY);
  const pastRight = x + width - screenWidth;
  const pastLeft = -x;
  if (island) {
    const pushedAway =
      pastRight > width * FLOATING_CALL_TUCK_OVERFLOW ||
      pastLeft > width * FLOATING_CALL_TUCK_OVERFLOW ||
      Math.abs(vx) >= FLOATING_CALL_TUCK_VELOCITY ||
      vy <= -FLOATING_CALL_TUCK_VELOCITY;
    if (pushedAway) return { tuck: 'island', x: floatingCallRestX('right', screenWidth, width), y: clampedY };
  }
  if (pastRight > width * FLOATING_CALL_TUCK_OVERFLOW || vx >= FLOATING_CALL_TUCK_VELOCITY) {
    return { tuck: 'right', x: floatingCallTuckX('right', screenWidth, width), y: clampedY };
  }
  if (pastLeft > width * FLOATING_CALL_TUCK_OVERFLOW || vx <= -FLOATING_CALL_TUCK_VELOCITY) {
    return { tuck: 'left', x: floatingCallTuckX('left', screenWidth, width), y: clampedY };
  }
  const maxX = screenWidth - width - FLOATING_CALL_EDGE;
  return { tuck: null, x: Math.min(Math.max(x, FLOATING_CALL_EDGE), maxX), y: clampedY };
}
