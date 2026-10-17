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
