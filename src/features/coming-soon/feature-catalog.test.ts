// @ts-nocheck
import { describe, expect, test } from 'bun:test';

describe('coming soon feature catalog', () => {
  test('gives narration an intentional preview and a safe generic fallback', async () => {
    let catalog: typeof import('./feature-catalog') | undefined;
    try {
      catalog = await import('./feature-catalog');
    } catch {
      // Expected on the first red run.
    }
    expect(catalog?.resolveComingSoonFeature).toBeFunction();

    expect(catalog!.resolveComingSoonFeature('narration')).toMatchObject({
      key: 'narration',
      title: 'Listen to your memories',
    });
    expect(catalog!.resolveComingSoonFeature('not-a-real-feature')).toMatchObject({
      key: 'generic',
      title: 'Something thoughtful is on the way',
    });
  });
});
