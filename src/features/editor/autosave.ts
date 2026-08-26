import { COLORS } from '@/constants/tokens';

export type AutosaveStatus = 'saved' | 'saving' | 'unsaved';

export interface AutosaveBadgeConfig {
  label: string;
  dotColor: string;
  textColor: string;
}

export function getAutosaveStatusBadge(status: AutosaveStatus): AutosaveBadgeConfig {
  switch (status) {
    case 'saved':
      return {
        label: 'Saved',
        dotColor: COLORS.success,
        textColor: COLORS.textWeak,
      };
    case 'saving':
      return {
        label: 'Saving…',
        dotColor: COLORS.warning,
        textColor: COLORS.textWeak,
      };
    case 'unsaved':
    default:
      return {
        label: 'Unsaved',
        dotColor: COLORS.error,
        textColor: COLORS.textWeak,
      };
  }
}

export function getStoryDraftStorageKey(userId?: string | null): string {
  const safeId = userId?.trim() || 'anonymous';
  return `@memento_story_draft_${safeId}`;
}

export function isMeaningfulDraftContent(title: string, body: string): boolean {
  const cleanTitle = (title || '').trim();
  const cleanBody = (body || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  return cleanTitle.length > 0 || cleanBody.length > 0;
}
