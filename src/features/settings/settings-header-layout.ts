export function getSettingsHeaderLayout() {
  const height = 62;
  const actionSize = 44;

  return {
    height,
    horizontalPadding: 16,
    actionSize,
    iconSize: 22,
    actionTop: (height - actionSize) / 2,
    titleCenterY: height / 2,
  } as const;
}
