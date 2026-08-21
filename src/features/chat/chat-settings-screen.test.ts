// @ts-nocheck
import { describe, expect, test } from 'bun:test';

describe('chat settings reference geometry', () => {
  test('maps the 393-point reference into responsive card widths', async () => {
    let layoutModule: typeof import('./chat-settings-layout') | undefined;

    try {
      layoutModule = await import('./chat-settings-layout');
    } catch {
      // The first TDD run intentionally reaches this branch until the
      // reference layout contract is implemented.
    }

    expect(layoutModule?.getChatSettingsLayout).toBeFunction();

    const layout = layoutModule!.getChatSettingsLayout(393);
    expect(layout.contentWidth).toBe(361);
    expect(layout.mediaTileWidth).toBe(69);
    expect(layout.selectionCardWidth).toBe(174.5);
    expect(layout.insightCardWidth).toBe(172);

    const narrowLayout = layoutModule!.getChatSettingsLayout(320);
    expect(narrowLayout.contentWidth).toBe(288);
    expect(narrowLayout.mediaTileWidth).toBeCloseTo(54.4);
    expect(narrowLayout.selectionCardWidth).toBe(138);
  });
});
