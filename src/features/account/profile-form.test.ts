// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import {
  normalizeProfileForm,
  toProfileUpdatePayload,
} from './profile-form';

describe('edit profile form', () => {
  test('normalizes profile values and dates for display', () => {
    expect(normalizeProfileForm({
      email: 'wisdom@example.com',
      nickname: 'Groot',
      first_name: 'Wisdom',
      last_name: 'Augustine',
      dob: '1954-10-28T00:00:00.000Z',
      phone_number: '+234 894 284 0001',
      country: 'Nigeria',
      location: 'Lagos',
    })).toEqual({
      email: 'wisdom@example.com',
      nickname: 'Groot',
      firstName: 'Wisdom',
      lastName: 'Augustine',
      birthday: '28/10/1954',
      phone: '+234 894 284 0001',
      country: 'Nigeria',
      location: 'Lagos',
      bio: '',
    });
  });

  test('trims editable fields and converts birthday for the API', () => {
    expect(toProfileUpdatePayload({
      email: 'wisdom@example.com',
      nickname: ' Groot ',
      firstName: ' Wisdom ',
      lastName: ' Augustine ',
      birthday: '28/10/1954',
      phone: ' +234 894 284 0001 ',
      country: ' Nigeria ',
      location: ' Lagos ',
      bio: ' A lifelong learner ',
    })).toEqual({
      nickname: 'Groot',
      first_name: 'Wisdom',
      last_name: 'Augustine',
      dob: '1954-10-28',
      phone_number: '+234 894 284 0001',
      country: 'Nigeria',
      location: 'Lagos',
      context: {
        self_description: 'A lifelong learner',
      },
    });
  });

  test('registers edit profile in the shared sheet manager', async () => {
    const manager = await Bun.file(
      new URL('../../components/sheets/SheetManager.tsx', import.meta.url),
    ).text();
    const store = await Bun.file(
      new URL('../../store/ui.store.ts', import.meta.url),
    ).text();

    expect(store).toContain("'edit-profile'");
    expect(manager).toContain("import { EditProfileSheet }");
    expect(manager).toContain("'edit-profile':");
  });

  test('supports avatar picking and upload in the edit profile sheet', async () => {
    const editSheet = await Bun.file(
      new URL('../../components/sheets/EditProfileSheet.tsx', import.meta.url),
    ).text();
    const mutation = await Bun.file(
      new URL('../../hooks/mutations/use-profile-mutation.ts', import.meta.url),
    ).text();

    expect(editSheet).toContain('useUploadProfilePicture');
    expect(editSheet).toContain('ImagePicker.launchImageLibraryAsync');
    expect(mutation).toContain('export function useUploadProfilePicture');
    expect(mutation).toContain('endpoint.uploadPicture');
  });

  test('resolves relative picture keys to full backend file URLs', async () => {
    const { resolveFileUrl, getProfileAvatarUrl } = await import('./profile-form');

    expect(resolveFileUrl(null)).toBeNull();
    expect(resolveFileUrl(undefined)).toBeNull();
    expect(resolveFileUrl('https://example.com/avatar.jpg')).toBe('https://example.com/avatar.jpg');
    expect(resolveFileUrl('file:///var/tmp/avatar.jpg')).toBe('file:///var/tmp/avatar.jpg');
    expect(resolveFileUrl('avatar_123.jpg')).toContain('/files/avatar_123.jpg');

    expect(getProfileAvatarUrl({ picture: 'profile_pic.jpg' })).toContain('/files/profile_pic.jpg');
    expect(getProfileAvatarUrl({ picture_url: 'https://cdn.example.com/p.jpg' })).toBe('https://cdn.example.com/p.jpg');
  });
});
