# Send Feedback Settings Design

## Goal

Replace the Settings feedback sheet entry with a dedicated screen matching the supplied reference and preserving the existing backend and upload behavior.

## Flow

- Settings → Send Feedback navigates to `/settings/feedback`.
- Feedback type uses the shared Select/SelectSheet.
- Comment is required.
- Users may pick multiple screenshots after the existing permission-recovery flow.
- Each attachment shows thumbnail, filename, upload progress, removal, and retry after failure.
- Submission sends `type`, trimmed `message`, signed-in email, and successfully uploaded file IDs to `/feedback`.
- Submit is disabled during uploads, after upload failures, or when the comment is empty.
- Success shows a toast and safely returns to Settings.

## Architecture

Move feedback POST behavior into `src/hooks/mutations/use-feedback-mutation.ts`. Keep screen-local draft and upload presentation state in the route, using the existing `useFileUpload`, shared Select, TextInput, Button, Toast, and permission helpers.

## Testing

Add source-contract tests for navigation, shared components, multi-image selection, upload progress/retry/removal, and endpoint submission. Run focused and full verification.

