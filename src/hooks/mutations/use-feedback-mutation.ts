import { useMutation } from '@tanstack/react-query';
import { post } from '@/api/mutations';
import endpoint from '@/api/endpoint';

export interface FeedbackPayload {
  type: string;
  message: string;
  email?: string;
  screenshots: string[];
}

export function useFeedbackMutation() {
  return useMutation({
    mutationFn: (payload: FeedbackPayload) =>
      post(endpoint.feedback, {
        type: payload.type,
        message: payload.message,
        email: payload.email,
        screenshots: payload.screenshots,
      }),
  });
}

