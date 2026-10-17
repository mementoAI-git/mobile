import { describe, expect, test } from 'bun:test';

import { isCurrentScreen, voiceScreenName } from './screen-names';

describe('voiceScreenName', () => {
  test('names the main screens the way the host says them', () => {
    expect(voiceScreenName('/overview')).toBe('Home (Overview)');
    expect(voiceScreenName('/stories')).toBe('Your stories');
    expect(voiceScreenName('/stories/64b000000000000000000001')).toBe('A story');
    expect(voiceScreenName('/chat/new')).toBe('A conversation');
    expect(voiceScreenName('/settings/profile/')).toBe('Profile');
  });

  test('tells the story editor from the quick note editor', () => {
    expect(voiceScreenName('/editor', 'mode=story')).toBe('Story editor');
    expect(voiceScreenName('/editor', 'mode=quick-capture')).toBe('Quick note editor');
  });

  test('falls back to the last path part', () => {
    expect(voiceScreenName('/some-new/screen_name')).toBe('screen name');
  });
});

describe('isCurrentScreen', () => {
  test('matches a destination on the screen already in front', () => {
    expect(isCurrentScreen('/settings/profile', '/settings/profile')).toBe(true);
    expect(isCurrentScreen('/(tabs)/stories/abc', '/stories/abc')).toBe(true);
    expect(isCurrentScreen('/(tabs)/overview', '/overview/')).toBe(true);
  });

  test('does not match another screen', () => {
    expect(isCurrentScreen('/(tabs)/stories/abc', '/stories/xyz')).toBe(false);
    expect(isCurrentScreen('/editor?mode=story', '/stories')).toBe(false);
  });
});
