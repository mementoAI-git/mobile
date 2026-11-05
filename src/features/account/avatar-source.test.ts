import {describe, expect, it} from 'bun:test';
import {defaultAvatarUrl} from './avatar-source';

describe('defaultAvatarUrl', () => {
  it('uses Critters with the same normalized seed as web', () => {
    expect(defaultAvatarUrl(' SAM@example.com ', 'Sam Smith')).toBe('https://api.dicebear.com/10.x/critters/png?seed=sam%40example.com');
  });
  it('uses a name when no explicit seed exists', () => {
    expect(defaultAvatarUrl(null, ' Sam Smith ')).toBe('https://api.dicebear.com/10.x/critters/png?seed=sam%20smith');
  });
  it('returns no image when no user identity exists', () => {
    expect(defaultAvatarUrl(null, undefined)).toBeNull();
  });
});

it('uses the same account ID as web across name and email changes', () => {
  const url = defaultAvatarUrl('old@example.com', 'Sam', ' User-123 ');
  expect(url).toBe('https://api.dicebear.com/10.x/critters/png?seed=user-123');
  expect(defaultAvatarUrl('new@example.com', 'Samuel', 'user-123')).toBe(url);
  expect(defaultAvatarUrl(null, undefined, 'user-123')).toBe(url);
});

it('ignores blank ID and email before falling back to a legacy name', () => {
  expect(defaultAvatarUrl(' ', ' Sam Smith ', ' ')).toBe('https://api.dicebear.com/10.x/critters/png?seed=sam%20smith');
});
