import { COLORS } from '@/constants/tokens';
import type { CreateBeneficiaryBody, CreateGroupBody } from '@/types';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const GROUP_COLOR_PALETTE = [
  { id: 0, color: COLORS.beneficiaryGroupGreen },
  { id: 1, color: COLORS.beneficiaryGroupBlue },
  { id: 2, color: COLORS.beneficiaryGroupPurple },
  { id: 3, color: COLORS.beneficiaryGroupPink },
  { id: 4, color: COLORS.beneficiaryGroupYellow },
  { id: 5, color: COLORS.beneficiaryGroupMagenta },
] as const;

export interface BeneficiaryInviteFormValues {
  email: string;
  name: string;
  relationship: string;
  about: string;
  avatarFileId?: string;
  groupIds: string[];
  accessScope?: string;
}

export function buildBeneficiaryInvitePayload(
  values: BeneficiaryInviteFormValues,
): CreateBeneficiaryBody | null {
  const email = values.email.trim().toLowerCase();
  const name = values.name.trim();
  const relationship = values.relationship.trim();
  if (!name || !relationship || !EMAIL_PATTERN.test(email)) return null;

  const about = values.about.trim();
  const avatarFileId = values.avatarFileId?.trim();
  const groupIds = [...new Set(values.groupIds.map((id) => id.trim()).filter(Boolean))];

  return {
    email,
    name,
    relationship,
    ...(about ? { about } : {}),
    ...(avatarFileId ? { avatar_file_id: avatarFileId } : {}),
    ...(groupIds.length ? { group_ids: groupIds } : {}),
    ...(values.accessScope ? { access_scope: values.accessScope } : {}),
  };
}

export interface GroupFormValues {
  name: string;
  description: string;
  color: number;
}

export function buildGroupPayload(values: GroupFormValues): CreateGroupBody | null {
  const name = values.name.trim();
  if (!name || !Number.isInteger(values.color) || values.color < 0 || values.color >= GROUP_COLOR_PALETTE.length) {
    return null;
  }

  const description = values.description.trim();
  return {
    name,
    ...(description ? { description } : {}),
    color: values.color,
  };
}
