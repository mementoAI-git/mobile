import type { IDailyPromptCapture, IDashboardPromptSlot } from '@/types';

export interface ReflectionShuffleUsage {
  used: number;
  remaining: number;
  limit?: number;
  resets_at: string;
  allowed?: boolean;
}

export const reflectionShuffleKey = ['reflection-shuffle'] as const;

export function rotateReflections<T>(rows: T[], used: number): T[] {
  const offset = Number.isSafeInteger(used) && used > 0 ? used : 0;
  return rows.map((_, index) => rows[(index + offset) % rows.length]);
}

export function canShuffleReflections(count: number, usage: ReflectionShuffleUsage | null | undefined, pending: boolean): boolean {
  return count >= 2 && !!usage && usage.remaining > 0 && !pending;
}

export function reflectionCapture(row: IDashboardPromptSlot): IDailyPromptCapture | null {
  if (row.answered) return null;
  if (row.slot_kind === 'ai') {
    return { pinned_text: row.ai_prompt_text, prompt_type: 'ai-generated', reflection_day_key: row.reflection_day_key };
  }
  if (!row.prompt._id) return null;
  return { pinned_text: row.prompt.title, prompt_type: 'static', prompt_id: row.prompt._id, reflection_day_key: row.reflection_day_key };
}
