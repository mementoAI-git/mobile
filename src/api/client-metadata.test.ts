import { expect, test } from 'bun:test';
import { createMementoClientHeaders } from './client-metadata';

test('builds bounded mobile client identity headers', () => {
  expect(
    createMementoClientHeaders({ platform: 'ios', version: '2.4.0', build: '312' }),
  ).toEqual({
    'X-Memento-Client': 'ios',
    'X-Memento-Version': '2.4.0',
    'X-Memento-Build': '312',
  });
  expect(
    createMementoClientHeaders({
      platform: 'windows' as never,
      version: 'x'.repeat(100),
      build: 'build\ninvalid',
    }),
  ).toEqual({
    'X-Memento-Client': 'unknown',
    'X-Memento-Version': 'unknown',
    'X-Memento-Build': 'unknown',
  });
});
