import { COLORS } from '@/constants/tokens';

export type AutosaveStatus = 'saved' | 'saving' | 'unsaved';

export interface AutosaveBadgeConfig {
  label: string;
  dotColor: string;
  textColor: string;
}

export function getAutosaveStatusBadge(status: AutosaveStatus, colors = COLORS): AutosaveBadgeConfig {
  switch (status) {
    case 'saved':
      return {
        label: 'Saved',
        dotColor: colors.success,
        textColor: colors.textWeak,
      };
    case 'saving':
      return {
        label: 'Saving…',
        dotColor: colors.warning,
        textColor: colors.textWeak,
      };
    case 'unsaved':
    default:
      return {
        label: 'Unsaved',
        dotColor: colors.error,
        textColor: colors.textWeak,
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

export function getDraftButtonDotColor(status: AutosaveStatus, hasContent: boolean, colors = COLORS): string {
  return hasContent ? getAutosaveStatusBadge(status, colors).dotColor : colors.textMuted;
}
