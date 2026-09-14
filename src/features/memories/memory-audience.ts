export type MemoryVisibility = 'private' | 'everyone';
export type MemoryAudienceMode = 'private' | 'everyone' | 'specific';

export interface MemoryAudienceSelection {
  mode: MemoryAudienceMode;
  beneficiaryIds: string[];
  groupIds: string[];
}

export interface MemoryAudiencePayload {
  visibility: MemoryVisibility;
  beneficiaries: string[];
  groups: string[];
}

type RecipientLike =
  | string
  | { _id?: unknown; id?: unknown }
  | null
  | undefined;

type MemoryAudienceSource = {
  visibility?: unknown;
  beneficiaries?: RecipientLike[] | null;
  groups?: RecipientLike[] | null;
};

function recipientId(value: RecipientLike): string | null {
  const candidate =
    typeof value === 'string'
      ? value
      : value && typeof value === 'object'
        ? value._id ?? value.id
        : null;

  return typeof candidate === 'string' && candidate.trim()
    ? candidate.trim()
    : null;
}

export function normalizeAudienceIds(
  values?: RecipientLike[] | null
): string[] {
  return [
    ...new Set(
      (values ?? [])
        .map(recipientId)
        .filter((id): id is string => Boolean(id))
    ),
  ];
}

export function deriveMemoryAudience(
  source: MemoryAudienceSource
): MemoryAudienceSelection {
  if (source.visibility === 'everyone') {
    return { mode: 'everyone', beneficiaryIds: [], groupIds: [] };
  }

  const beneficiaryIds = normalizeAudienceIds(source.beneficiaries);
  const groupIds = normalizeAudienceIds(source.groups);

  return {
    mode: beneficiaryIds.length || groupIds.length ? 'specific' : 'private',
    beneficiaryIds,
    groupIds,
  };
}

export function canApplyMemoryAudience(
  selection: MemoryAudienceSelection
): boolean {
  return (
    selection.mode !== 'specific' ||
    selection.beneficiaryIds.length + selection.groupIds.length > 0
  );
}

export function buildMemoryAudiencePayload(
  selection: MemoryAudienceSelection
): MemoryAudiencePayload {
  if (selection.mode === 'everyone') {
    return { visibility: 'everyone', beneficiaries: [], groups: [] };
  }
  if (selection.mode === 'private') {
    return { visibility: 'private', beneficiaries: [], groups: [] };
  }
  return {
    visibility: 'private',
    beneficiaries: normalizeAudienceIds(selection.beneficiaryIds),
    groups: normalizeAudienceIds(selection.groupIds),
  };
}

export function buildStoryEditorSeed(memory: {
  title?: string;
  body?: string;
  tags?: string[];
  visibility?: unknown;
  beneficiaries?: RecipientLike[] | null;
  groups?: RecipientLike[] | null;
  attachments?: Array<{ _id?: string; url?: string; type?: string; name?: string }>;
}) {
  const audience = deriveMemoryAudience(memory);
  return {
    title: memory.title ?? '',
    body: memory.body ?? '',
    tags: memory.tags ?? [],
    visibility: audience.mode === 'everyone' ? 'everyone' as const : 'private' as const,
    beneficiaries: audience.beneficiaryIds,
    groups: audience.groupIds,
    attachments: (memory.attachments ?? []).map((attachment) => ({
      id: attachment._id ?? '',
      url: attachment.url ?? '',
      type: attachment.type ?? 'image/jpeg',
      name: attachment.name ?? '',
    })),
  };
}

export function formatMemoryAudienceLabel(
  selection: MemoryAudienceSelection
): string {
  if (selection.mode === 'private') return 'Private · Only me';
  if (selection.mode === 'everyone') return 'Everyone';

  const people = selection.beneficiaryIds.length;
  const groups = selection.groupIds.length;
  const parts = [
    people ? `${people} ${people === 1 ? 'person' : 'people'}` : '',
    groups ? `${groups} ${groups === 1 ? 'group' : 'groups'}` : '',
  ].filter(Boolean);

  return parts.join(', ') || 'Choose people or groups';
}
