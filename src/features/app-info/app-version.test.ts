import { describe, expect, test } from 'bun:test';
import { appVersionDetails, appVersionLabel } from './app-version';

const BUILD_48 = { version: '1.0.0', build: '48', channel: 'production' };

describe('appVersionLabel', () => {
  test('shows the version and build of the code that came with the install', () => {
    expect(appVersionLabel({ ...BUILD_48, updateId: null, isEmbeddedLaunch: true })).toBe(
      'Version 1.0.0 (48)',
    );
  });

  // Tells a tester which over-the-air update is running.
  test('adds the first 8 characters of a downloaded update', () => {
    expect(
      appVersionLabel({
        ...BUILD_48,
        updateId: '0562f81f-c327-41a8-92e5-5516dfb3a5c2',
        isEmbeddedLaunch: false,
      }),
    ).toBe('Version 1.0.0 (48) · Update 0562f81f');
  });

  test('leaves out what the device could not report', () => {
    expect(
      appVersionLabel({ version: null, build: null, channel: null, updateId: null, isEmbeddedLaunch: true }),
    ).toBe('Version unknown');
    expect(
      appVersionLabel({ version: '1.0.0', build: null, channel: null, updateId: null, isEmbeddedLaunch: true }),
    ).toBe('Version 1.0.0');
  });
});

describe('appVersionDetails', () => {
  test('gives support everything needed to identify the running code', () => {
    expect(
      appVersionDetails({
        ...BUILD_48,
        updateId: '0562f81f-c327-41a8-92e5-5516dfb3a5c2',
        isEmbeddedLaunch: false,
      }),
    ).toBe(
      'Memento 1.0.0 (48)\nUpdate: 0562f81f-c327-41a8-92e5-5516dfb3a5c2\nChannel: production',
    );
  });

  test('says when the built-in code is running', () => {
    expect(appVersionDetails({ ...BUILD_48, updateId: null, isEmbeddedLaunch: true })).toBe(
      'Memento 1.0.0 (48)\nUpdate: built-in\nChannel: production',
    );
  });
});
