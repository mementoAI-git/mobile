import { describe, expect, mock, test } from 'bun:test';

import { analytics, createUserSync, screenNameFromSegments } from './analytics';

function fakeClient() {
  return { identify: mock(() => {}), reset: mock(() => {}) };
}

describe('analytics', () => {
  test('stays off in automated tests', () => {
    expect(analytics).toBeNull();
  });

  test('identifies the signed-in account by its ID, once', () => {
    const client = fakeClient();
    const sync = createUserSync(client as never);
    const user = { _id: 'u1', email: 'a@example.test', nickname: 'Ada' };

    sync(user, true);
    sync({ ...user }, true);

    expect(client.identify).toHaveBeenCalledTimes(1);
    expect(client.identify).toHaveBeenCalledWith('u1', { email: 'a@example.test', name: 'Ada' });
    expect(client.reset).not.toHaveBeenCalled();
  });

  test('resets on sign-out and between different accounts', () => {
    const client = fakeClient();
    const sync = createUserSync(client as never);

    sync({ _id: 'u1' }, true);
    sync({ _id: 'u2', first_name: 'Grace', last_name: 'Hopper' }, true);
    expect(client.reset).toHaveBeenCalledTimes(1);
    expect(client.identify).toHaveBeenLastCalledWith('u2', { name: 'Grace Hopper' });

    sync(null, false);
    expect(client.reset).toHaveBeenCalledTimes(2);
  });

  test('does not reset an anonymous visitor who never signed in', () => {
    const client = fakeClient();
    createUserSync(client as never)(null, false);
    expect(client.reset).not.toHaveBeenCalled();
  });

  test('waits for the account ID before identifying', () => {
    const client = fakeClient();
    createUserSync(client as never)({ email: 'a@example.test' }, true);
    expect(client.identify).not.toHaveBeenCalled();
  });

  test('names screens by route pattern so IDs never leave the app', () => {
    expect(screenNameFromSegments(['(tabs)', 'chat', '[id]'])).toBe('(tabs)/chat/[id]');
    expect(screenNameFromSegments([])).toBe('index');
  });
});
