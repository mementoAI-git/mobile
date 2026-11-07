export function shouldPopTabToTopOnBlur(routeName: string): boolean {
  return routeName === 'explore' || routeName === 'stories';
}

/** A story opened from another tab may be the only route in its stack. */
export function getTabEntryParams(routeName: string): { screen: 'index' } | undefined {
  return routeName === 'stories' ? { screen: 'index' } : undefined;
}
