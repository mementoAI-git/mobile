import { useMutation, useQueryClient } from '@tanstack/react-query';
import { post } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { invalidateMemoryQueries } from '@/features/memories/cache';

export interface QuickCapturePayload {
  /** Plain text body — AI enriches title/tags server-side */
  body: string;
  /** Array of uploaded file _id strings */
  attachments?: string[];
  /** Beneficiary _id strings for sharing (empty = public) */
  beneficiaries?: string[];
  /** From a daily prompt: 'static' | 'ai-generated' */
  prompt_type?: 'static' | 'ai-generated';
  /** prompt_id when prompt_type === 'static' */
  prompt_id?: string;
  /** pinned_text when prompt_type === 'ai-generated' */
  prompt_text?: string;
  /** YYYY-MM-DD reflection day */
  reflection_day_key?: string;
}

/**
 * useQuickCapture — calls the dedicated /memories/quick-capture endpoint.
 *
 * Unlike useCreateMemory (which requires a title), quick capture sends
 * raw body text and lets the server AI-generate title, tags, and enrichment.
 * The resulting memory will have capture_source: "quick" and
 * enrichment_status: "pending" until the background job completes.
 */
export function useQuickCapture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: QuickCapturePayload) =>
      post(endpoint.memoriesQuickCapture, payload),
    onSuccess: (_res, variables) => {
      // Invalidate stories + stats so the processing badge appears
      invalidateMemoryQueries(queryClient, {
        includeUserStats: true,
        promptId: variables.prompt_id,
        promptText: variables.prompt_text,
        reflectionDayKey: variables.reflection_day_key,
      });
    },
  });
}
