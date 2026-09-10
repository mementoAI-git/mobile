export function getSettingsHeaderLayout() {
  const height = 88;
  const actionSize = 44;

  return {
    height,
    horizontalPadding: 24,
    actionSize,
    iconSize: 23,
    actionTop: (height - actionSize) / 2,
    titleCenterY: height / 2,
  } as const;
}
