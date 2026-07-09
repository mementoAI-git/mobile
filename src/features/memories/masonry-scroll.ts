type NativeScrollEventLike = {
  nativeEvent?: {
    layoutMeasurement?: { height?: number };
    contentOffset?: { y?: number };
    contentSize?: { height?: number };
  };
};

type MasonryScrollHandlers<TEvent extends NativeScrollEventLike> = {
  onScroll?: (event: TEvent) => void;
  onEndReached?: () => void;
  threshold?: number;
  canTriggerEndReached?: boolean;
};

const DEFAULT_END_REACHED_THRESHOLD = 200;

export function isMasonryScrollNearEnd(
  event: NativeScrollEventLike,
  threshold = DEFAULT_END_REACHED_THRESHOLD,
) {
  const nativeEvent = event.nativeEvent;
  if (!nativeEvent) return false;

  const layoutHeight = nativeEvent.layoutMeasurement?.height;
  const offsetY = nativeEvent.contentOffset?.y;
  const contentHeight = nativeEvent.contentSize?.height;

  if (
    typeof layoutHeight !== 'number' ||
    typeof offsetY !== 'number' ||
    typeof contentHeight !== 'number'
  ) {
    return false;
  }

  return layoutHeight + offsetY >= contentHeight - threshold;
}

export function handleMasonryScroll<TEvent extends NativeScrollEventLike>(
  event: TEvent,
  {
    onScroll,
    onEndReached,
    threshold = DEFAULT_END_REACHED_THRESHOLD,
    canTriggerEndReached = true,
  }: MasonryScrollHandlers<TEvent>,
) {
  onScroll?.(event);

  if (canTriggerEndReached && isMasonryScrollNearEnd(event, threshold)) {
    onEndReached?.();
    return true;
  }

  return false;
}
