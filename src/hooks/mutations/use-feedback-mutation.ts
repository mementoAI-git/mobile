import { useMutation } from '@tanstack/react-query';
import { post } from '@/api/mutations';
import endpoint from '@/api/endpoint';

export type FeedbackType = 'Bug' | 'Feature Request' | 'UI/UX Issue' | 'General Feedback' | 'Other';

export interface FeedbackPayload {
  type: FeedbackType;
  message: string;
  email: string;
  screenshots: string[];
}

export function useFeedbackMutation() {
  return useMutation({
    mutationFn: (payload: FeedbackPayload) =>
      post(endpoint.feedback, {
        type: payload.type,
        message: payload.message,
        email: payload.email,
        screenshot: payload.screenshots?.[0] || undefined,
        screenshots: payload.screenshots,
      }),
  });
}

