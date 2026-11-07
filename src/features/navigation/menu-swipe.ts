const BASE_MENU_PAGES = new Set([
  '/overview', '/chat', '/stories', '/explore', '/capsule', '/account', '/settings',
]);

export const MENU_SWIPE_EDGE_WIDTH = 24;

export function canSwipeOpenMenu(pathname: string, menuOpen: boolean, activeSheet: string | null) {
  return BASE_MENU_PAGES.has(pathname) && !menuOpen && activeSheet === null;
}

export function shouldOpenMenuFromSwipe(translationX: number, translationY: number, velocityX: number) {
  'worklet';
  if (translationX < 20 || Math.abs(translationY) >= translationX || velocityX < -300) return false;
  return translationX >= 60 || velocityX >= 500;
}
