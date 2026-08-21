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
  const activeWidth = Math.min(maxActiveWidth, pillInternalWidth * 0.32);
  const inactiveCount = Math.max(1, visibleTabsCount - 1);
  const interItemGapTotal = Math.max(0, visibleTabsCount - 1) * 4;
  const remainingItemWidth = Math.max(
    0,
    pillInternalWidth - interItemGapTotal - activeWidth,
  );
  const inactiveWidth = Math.min(
    maxInactiveWidth,
    remainingItemWidth / inactiveCount,
  );

  return {
    pillInternalWidth,
    activeWidth,
    inactiveWidth,
    interItemGapTotal,
  };
}
