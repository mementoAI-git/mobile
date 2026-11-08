import {describe, expect, it} from 'bun:test';
import {avatarSourceUrl, defaultAvatarUrl} from './avatar-source';

describe('defaultAvatarUrl', () => {
  it('uses Loops with the same normalized seed as web', () => {
    expect(defaultAvatarUrl(' SAM@example.com ', 'Sam Smith')).toBe('https://api.dicebear.com/10.x/loops/png?seed=sam%40example.com');
  });
  it('uses a name when no explicit seed exists', () => {
    expect(defaultAvatarUrl(null, ' Sam Smith ')).toBe('https://api.dicebear.com/10.x/loops/png?seed=sam%20smith');
  });
  it('returns no image when no user identity exists', () => {
    expect(defaultAvatarUrl(null, undefined)).toBeNull();
  });
});

it('uses the same account ID as web across name and email changes', () => {
  const url = defaultAvatarUrl('old@example.com', 'Sam', ' User-123 ');
  expect(url).toBe('https://api.dicebear.com/10.x/loops/png?seed=user-123');
  expect(defaultAvatarUrl('new@example.com', 'Samuel', 'user-123')).toBe(url);
  expect(defaultAvatarUrl(null, undefined, 'user-123')).toBe(url);
});

it('ignores blank ID and email before falling back to a legacy name', () => {
  expect(defaultAvatarUrl(' ', ' Sam Smith ', ' ')).toBe('https://api.dicebear.com/10.x/loops/png?seed=sam%20smith');
});

describe('avatarSourceUrl', () => {
  it('replaces stored DiceBear placeholders with the current Loops avatar', () => {
    expect(avatarSourceUrl('https://api.dicebear.com/10.x/critters/png?seed=old', 'sam@example.com', 'Sam', 'user-123'))
      .toBe('https://api.dicebear.com/10.x/loops/png?seed=user-123');
  });
  it('falls back to the stored seed when no identity is known', () => {
    expect(avatarSourceUrl('https://api.dicebear.com/9.x/initials/svg?seed=Sam%20Smith'))
      .toBe('https://api.dicebear.com/10.x/loops/png?seed=sam%20smith');
  });
  it('keeps genuine photos', () => {
    expect(avatarSourceUrl(' https://cdn.example.com/me.jpg ', 'sam@example.com')).toBe('https://cdn.example.com/me.jpg');
    expect(avatarSourceUrl('  ')).toBeNull();
  });
});
