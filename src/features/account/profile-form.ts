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
  bio: string;
}

export interface ProfileUpdatePayload {
  nickname?: string;
  first_name?: string;
  last_name?: string;
  dob?: string;
  phone_number?: string;
  country?: string;
  location?: string;
  context?: any;
  bg_music?: string | null;
  chat_voice?: string | null;
  chat_voice_provider?: 'gemini' | 'elevenlabs' | null;
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
    bio: profile?.context?.self_description ?? '',
  };
}

export function toProfileUpdatePayload(
  values: ProfileFormValues,
  currentContext?: any,
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
    context: {
      ...(currentContext && typeof currentContext === 'object' ? currentContext : {}),
      self_description: (values.bio ?? '').trim(),
    },
  };
}

export function resolveFileUrl(uriOrName?: string | null): string | null {
  if (!uriOrName || typeof uriOrName !== 'string') return null;
  const trimmed = uriOrName.trim();
  if (!trimmed) return null;

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('file://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  const { API_BASE_URL } = require('@/lib/env');
  return `${API_BASE_URL}/files/${encodeURIComponent(trimmed)}`;
}

export function getProfileAvatarUrl(profile?: Partial<IUser> | null): string | null {
  if (!profile) return null;
  return resolveFileUrl(profile.picture_url || profile.picture);
}

