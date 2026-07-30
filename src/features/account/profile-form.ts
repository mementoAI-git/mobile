import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import type { IUser } from '@/types';

dayjs.extend(customParseFormat);

export interface ProfileFormValues {
  email: string;
  nickname: string;
  firstName: string;
  lastName: string;
  birthday: string;
  phone: string;
  country: string;
  location: string;
}

export interface ProfileUpdatePayload {
  nickname: string;
  first_name: string;
  last_name: string;
  dob: string;
  phone_number: string;
  country: string;
  location: string;
}

export function formatProfileBirthday(value: unknown): string {
  if (!value) return '';
  const parsed = dayjs(String(value));
  return parsed.isValid() ? parsed.format('DD/MM/YYYY') : String(value);
}

export function normalizeProfileForm(
  profile: Partial<IUser> | null | undefined,
): ProfileFormValues {
  return {
    email: profile?.email ?? '',
    nickname: profile?.nickname ?? '',
    firstName: profile?.first_name ?? '',
    lastName: profile?.last_name ?? '',
    birthday: formatProfileBirthday(profile?.dob),
    phone: profile?.phone_number ?? '',
    country: profile?.country ?? '',
    location: profile?.location ?? '',
  };
}

export function toProfileUpdatePayload(
  values: ProfileFormValues,
): ProfileUpdatePayload {
  const birthday = dayjs(values.birthday.trim(), 'DD/MM/YYYY', true);

  return {
    nickname: values.nickname.trim(),
    first_name: values.firstName.trim(),
    last_name: values.lastName.trim(),
    dob: birthday.isValid() ? birthday.format('YYYY-MM-DD') : values.birthday.trim(),
    phone_number: values.phone.trim(),
    country: values.country.trim(),
    location: values.location.trim(),
  };
}
