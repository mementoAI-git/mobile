export function getBillingLayout(viewportWidth: number) {
  const horizontalPadding = 16;
  return {
    horizontalPadding,
    contentWidth: Math.max(0, viewportWidth - horizontalPadding * 2),
    freeBannerHeight: 96,
    paidBannerHeight: 142,
    storageHeight: 85,
    tabHeight: 32,
  } as const;
}
