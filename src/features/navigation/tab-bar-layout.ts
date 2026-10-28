interface TabBarWidthInput {
  screenWidth: number;
  visibleTabsCount: number;
  maxActiveWidth: number;
  maxInactiveWidth: number;
}

export function getTabBarItemWidths({
  screenWidth,
  visibleTabsCount,
  maxActiveWidth,
  maxInactiveWidth,
}: TabBarWidthInput) {
  const pillInternalWidth = Math.max(0, screenWidth - 120);
  const interItemGapTotal = Math.max(0, visibleTabsCount - 1) * 4;
  const itemWidth = Math.min(
    maxActiveWidth,
    maxInactiveWidth,
    Math.max(0, pillInternalWidth - interItemGapTotal) / Math.max(1, visibleTabsCount),
  );
  const activeWidth = itemWidth;
  const inactiveWidth = itemWidth;

  return {
    pillInternalWidth,
    activeWidth,
    inactiveWidth,
    interItemGapTotal,
  };
}
