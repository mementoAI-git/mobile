import { describe, expect, test } from 'bun:test';
import { getSettingsHeaderLayout } from './settings-header-layout';

describe('settings subpage header layout', () => {
  test('centers a 44-point back target in the compact Settings header', () => {
    expect(getSettingsHeaderLayout()).toEqual({
      height: 62,
      horizontalPadding: 16,
      actionSize: 44,
      iconSize: 22,
      actionTop: 9,
      titleCenterY: 31,
    });
  });
});
