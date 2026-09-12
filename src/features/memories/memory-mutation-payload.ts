import type { IDailyPromptCapture } from '@/types';
import type { MemoryVisibility } from './memory-audience';

export interface MemoryMutationPayload {
  title: string;
  body: string;
  tags?: string[];
  status?: 'draft' | 'save' | string;
  level?: number;
  attachments?: string[];
  groups?: string[];
  beneficiaries?: string[];
  visibility?: MemoryVisibility;
  daily_prompt?: IDailyPromptCapture;
}

export function serializeMemoryMutationPayload<
  T extends Partial<MemoryMutationPayload>,
>(payload: T): T {
  return {
    ...payload,
    ...(payload.beneficiaries
      ? { beneficiaries: [...payload.beneficiaries] }
      : {}),
    ...(payload.groups ? { groups: [...payload.groups] } : {}),
    ...(payload.attachments ? { attachments: [...payload.attachments] } : {}),
    ...(payload.tags ? { tags: [...payload.tags] } : {}),
  };
}
