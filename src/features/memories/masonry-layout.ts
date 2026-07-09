export type MasonryLayoutEntry<TItem> = {
  item: TItem;
  index: number;
  columnIndex: number;
  top: number;
  height: number;
  bottom: number;
};

type BuildMasonryColumnLayoutOptions<TItem extends { _id: string }> = {
  items: TItem[];
  measuredHeights: Record<string, number>;
  estimateHeight: (item: TItem, index: number) => number;
  columnCount: number;
  gap: number;
};

type VisibleMasonryColumnLayoutOptions<TItem> = {
  columns: MasonryLayoutEntry<TItem>[][];
  windowTop: number;
  windowBottom: number;
  overscan: number;
};

export function buildMasonryColumnLayout<TItem extends { _id: string }>({
  items,
  measuredHeights,
  estimateHeight,
  columnCount,
  gap,
}: BuildMasonryColumnLayoutOptions<TItem>) {
  const columns: MasonryLayoutEntry<TItem>[][] = Array.from({ length: columnCount }, () => []);
  const columnHeights = Array.from({ length: columnCount }, () => 0);

  items.forEach((item, index) => {
    const measuredHeight = measuredHeights[item._id];
    const hasMeasuredHeight = typeof measuredHeight === 'number';
    const height = hasMeasuredHeight ? measuredHeight : estimateHeight(item, index);
    const columnIndex = hasMeasuredHeight
      ? columnHeights.indexOf(Math.min(...columnHeights))
      : index % columnCount;
    const top = columnHeights[columnIndex];
    const bottom = top + height;

    columns[columnIndex].push({
      item,
      index,
      columnIndex,
      top,
      height,
      bottom,
    });

    columnHeights[columnIndex] = bottom + gap;
  });

  return {
    columns,
    columnHeights: columnHeights.map((height, columnIndex) => (
      columns[columnIndex].length > 0 ? Math.max(0, height - gap) : 0
    )),
    containerHeight: Math.max(
      0,
      ...columnHeights.map((height, columnIndex) => (
        columns[columnIndex].length > 0 ? Math.max(0, height - gap) : 0
      )),
    ),
  };
}

export function getVisibleMasonryColumnLayout<TItem>({
  columns,
  windowTop,
  windowBottom,
  overscan,
}: VisibleMasonryColumnLayoutOptions<TItem>) {
  const visibleTop = windowTop - overscan;
  const visibleBottom = windowBottom + overscan;

  return columns.map((column) => (
    column.filter((entry) => entry.bottom >= visibleTop && entry.top <= visibleBottom)
  ));
}
