// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const settings = readFileSync('app/settings/index.tsx', 'utf8');
const screen = readFileSync('app/settings/feedback.tsx', 'utf8');
const mutation = readFileSync('src/hooks/mutations/use-feedback-mutation.ts', 'utf8');

describe('Send Feedback settings flow', () => {
  test('navigates from Settings to a dedicated route', () => {
    expect(settings).toContain("push('/settings/feedback')");
    expect(settings).not.toContain("openSheet('feedback')");
  });

  test('reuses shared controls and supports multiple screenshot uploads', () => {
    expect(screen).toContain('<Select');
    expect(screen).toContain('<TextInput');
    expect(screen).toContain('<Button');
    expect(screen).toContain('allowsMultipleSelection: true');
    expect(screen).toContain('onProgress');
  });

  test('shows remove and retry paths and gates submission on upload state', () => {
    expect(screen).toContain('retryUpload');
    expect(screen).toContain('removeAttachment');
    expect(screen).toContain("status === 'failed'");
    expect(screen).toContain("status === 'uploading'");
  });

  test('submits through the feedback endpoint mutation', () => {
    expect(screen).toContain('useFeedbackMutation');
    expect(mutation).toContain('endpoint.feedback');
    expect(mutation).toContain('screenshots');
  });
});

