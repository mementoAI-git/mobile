import type { IGroup } from '@/types';

export function normalizeCollection<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (!value || typeof value !== 'object') return [];

  const record = value as Record<string, unknown>;
  if (Array.isArray(record.docs)) return record.docs as T[];
  if (Array.isArray(record.data)) return record.data as T[];
  if (record.data && typeof record.data === 'object') {
    const nested = record.data as Record<string, unknown>;
    if (Array.isArray(nested.docs)) return nested.docs as T[];
  }
  return [];
}

export function getGroupMemberCount(group: IGroup): number {
  return Array.isArray(group.members) ? group.members.length : 0;
}

