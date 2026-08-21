// @ts-nocheck
import { describe, expect, test } from 'bun:test';

describe('modal safe-area spacing', () => {
  test('uses the native bottom inset without dropping the designed minimum spacing', async () => {
    let layout: typeof import('./modal-safe-area') | undefined;
    try {
      layout = await import('./modal-safe-area');
    } catch {
      // Expected on the first red run.
    }

    expect(layout?.getModalBottomPadding).toBeFunction();
    expect(layout!.getModalBottomPadding(34, 16)).toBe(50);
    expect(layout!.getModalBottomPadding(0, 32)).toBe(32);
  });

  test('constrains modal scroll content between fixed header and footer siblings', async () => {
    const layout = await import('./modal-safe-area');

    expect(layout.getBoundedModalScrollStyle()).toEqual({
      flex: 1,
      minHeight: 0,
    });
  });
});
