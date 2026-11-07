export function shuffleAvatarOrder<T>(pool: T[]): T[] {
  const order = [...pool];
  for (let index = order.length - 1; index > 0; index--) {
    const next = Math.floor(Math.random() * (index + 1));
    [order[index], order[next]] = [order[next], order[index]];
  }
  return order;
}

/** Match web: every three-face stack receives three different portraits. */
export function refreshAvatarOrder<T>(previous: T[]): T[] {
  if (previous.length < 6) return shuffleAvatarOrder(previous);
  const offset = 3 + Math.floor(Math.random() * (previous.length - 5));
  return [...previous.slice(offset), ...previous.slice(0, offset)];
}

export function avatarsForCard<T>(order: T[], index: number): T[] {
  if (!order.length) return [];
  return Array.from({ length: Math.min(3, order.length) }, (_, position) => order[(index * 3 + position) % order.length]);
}
