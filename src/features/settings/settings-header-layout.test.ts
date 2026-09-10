import { describe, expect, test } from 'bun:test';
import { getSettingsHeaderLayout } from './settings-header-layout';

describe('settings subpage header layout', () => {
  test('centers a 44-point back target in the standard 88-point header', () => {
    expect(getSettingsHeaderLayout()).toEqual({
      height: 88,
      horizontalPadding: 24,
      actionSize: 44,
      iconSize: 23,
      actionTop: 22,
      titleCenterY: 44,
    });
  });
});
