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
});
