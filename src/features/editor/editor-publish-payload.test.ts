import { describe, expect, test } from 'bun:test';
import { buildEditorPublishPayload } from './editor-publish-payload';

describe('editor publish payload', () => {
  test('publishes privately by default', () => {
    expect(buildEditorPublishPayload({
      title: 'A story', body: '<p>Body</p>', tags: [], attachmentIds: [],
      audience: { mode: 'private', beneficiaryIds: [], groupIds: [] },
    })).toEqual({
      title: 'A story', body: '<p>Body</p>', tags: [], status: 'save',
      attachments: undefined, visibility: 'private', beneficiaries: [], groups: [],
    });
  });

  test('publishes to everyone only when explicitly selected', () => {
    expect(buildEditorPublishPayload({
      title: '', body: '<p>Body</p>', tags: ['life'], attachmentIds: ['f1'],
      audience: { mode: 'everyone', beneficiaryIds: ['stale'], groupIds: ['stale'] },
    })).toEqual({
      title: 'Untitled', body: '<p>Body</p>', tags: ['life'], status: 'save',
      attachments: ['f1'], visibility: 'everyone', beneficiaries: [], groups: [],
    });
  });
});
