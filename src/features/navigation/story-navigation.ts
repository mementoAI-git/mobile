import type { ImperativeRouter } from 'expo-router';

/** Pop to the destination when present; replace a directly opened detail otherwise. */
export function returnFromStory(
  router: Pick<ImperativeRouter, 'dismissTo'>,
  returnToOverview: boolean,
): void {
  router.dismissTo(returnToOverview ? '/(tabs)/overview' : '/(tabs)/stories');
}
