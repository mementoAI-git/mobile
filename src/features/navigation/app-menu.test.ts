import { afterEach, describe, expect, test } from 'bun:test';
import { useUiStore } from '../../store/ui.store';

afterEach(() => {
  useUiStore.getState().closeMenu();
  useUiStore.getState().closeSheet();
  useUiStore.getState().setAppReady(false);
});

describe('app menu', () => {
  test('home opens the menu and dismissal closes it', () => {
    useUiStore.getState().openMenu();
    expect(useUiStore.getState().menuOpen).toBe(true);
    useUiStore.getState().closeMenu();
    expect(useUiStore.getState().menuOpen).toBe(false);
  });

  test('opening search dismisses the menu so overlays do not compete', () => {
    useUiStore.getState().setAppReady(true);
    useUiStore.getState().openMenu();
    useUiStore.getState().openSheet('search-memory');
    expect(useUiStore.getState().menuOpen).toBe(false);
    expect(useUiStore.getState().activeSheet).toBe('search-memory');
  });
});
