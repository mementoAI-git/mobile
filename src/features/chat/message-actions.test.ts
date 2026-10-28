import { describe, expect, test } from 'bun:test';
import { getMessageMenuPosition, getMessageReactionKey, MESSAGE_LONG_PRESS_MS, QUICK_MESSAGE_REACTIONS, toggleMessageReaction } from './message-actions';

describe('message actions', () => {
  test('uses the Apple hold duration and requested quick reactions', () => {
    expect(MESSAGE_LONG_PRESS_MS).toBe(500);
    expect(QUICK_MESSAGE_REACTIONS).toEqual(['💛', '👍', '⚡']);
  });

  test('opens below a message when there is room', () => {
    expect(getMessageMenuPosition({ x: 160, y: 100, width: 140, height: 50 }, { width: 320, height: 640 }, 172))
      .toEqual({ left: 52, top: 158, width: 248 });
  });

  test('opens above the final message and stays inside the usable screen', () => {
    const menu = getMessageMenuPosition({ x: 170, y: 510, width: 140, height: 60 }, { width: 320, height: 600 }, 172);
    expect(menu.top).toBe(330);
    expect(menu.left + menu.width).toBeLessThanOrEqual(308);
  });

  test('clamps a tall message and narrow viewport within screen edges', () => {
    const menu = getMessageMenuPosition({ x: 0, y: -50, width: 280, height: 700 }, { width: 240, height: 400 }, 210);
    expect(menu).toEqual({ left: 12, top: 12, width: 216 });
  });

  test('selects, replaces, and removes a reaction, including full-tray emoji', () => {
    expect(toggleMessageReaction(undefined, '💛')).toBe('💛');
    expect(toggleMessageReaction('💛', '⚡')).toBe('⚡');
    expect(toggleMessageReaction('⚡', '⚡')).toBeUndefined();
    expect(toggleMessageReaction('👍', '🦋')).toBe('🦋');
  });

  test('isolates a reaction by account and message without key collisions', () => {
    expect(getMessageReactionKey('a', 'one')).not.toBe(getMessageReactionKey('b', 'one'));
    expect(getMessageReactionKey('a:one', 'two')).not.toBe(getMessageReactionKey('a', 'one:two'));
  });
});
