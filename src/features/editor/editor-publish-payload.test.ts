import { describe, expect, test } from 'bun:test';
import { buildEditorPublishPayload } from './editor-publish-payload';

describe('editor publish payload', () => {
  test('publishes privately by default', () => {
    expect(buildEditorPublishPayload({
      title: 'A story', body: '<p>Body</p>', tags: [], attachmentIds: [],
      audience: { mode: 'private', beneficiaryIds: [], groupIds: [] },
    })).toEqual({
      title: 'A story', body: '<p>Body</p>', tags: [], status: 'save', capture_source: 'standard',
      attachments: undefined, visibility: 'private', beneficiaries: [], groups: [],
    });
  });

  test('publishes to everyone only when explicitly selected', () => {
    expect(buildEditorPublishPayload({
      title: '', body: '<p>Body</p>', tags: ['life'], attachmentIds: ['f1'],
      audience: { mode: 'everyone', beneficiaryIds: ['stale'], groupIds: ['stale'] },
    })).toEqual({
      title: 'Quick note', body: '<p>Body</p>', tags: ['life'], status: 'save', capture_source: 'quick',
      attachments: ['f1'], visibility: 'everyone', beneficiaries: [], groups: [],
    });
  });
});

test('allows saving a story without tags so background enrichment can supply them', () => {
  const payload = buildEditorPublishPayload({ title: 'A day at home', body: '<p>Family dinner</p>', attachmentIds: [], audience: { mode: 'private', beneficiaryIds: [], groupIds: [] } });
  expect(payload.tags).toEqual([]);
  expect(payload.status).toBe('save');
});

test.each([
  {title: 'An idea', body: '<p><br></p>', savedBody: '<p>An idea</p>'},
  {title: '', body: '<p>An idea</p>', savedBody: '<p>An idea</p>'},
])('saves a one-field entry as Quick note without losing its words', ({title, body, savedBody}) => {
  const payload = buildEditorPublishPayload({title, body, attachmentIds: [], audience: {mode: 'private', beneficiaryIds: [], groupIds: []}});
  expect(payload.title).toBe('Quick note');
  expect(payload.body).toBe(savedBody);
  expect(payload.capture_source).toBe('quick');
});

test('an intentionally titled body remains a regular story', () => {
  const payload = buildEditorPublishPayload({title: 'My day', body: '<p>We went walking.</p>', attachmentIds: [], audience: {mode: 'private', beneficiaryIds: [], groupIds: []}});
  expect(payload.title).toBe('My day');
  expect(payload.capture_source).toBe('standard');
});


test('keeps title-only words safe when moving them into the note body', () => {
  const payload = buildEditorPublishPayload({title: 'Me & <friends>', body: '', attachmentIds: [], audience: {mode: 'private', beneficiaryIds: [], groupIds: []}});
  expect(payload.body).toBe('<p>Me &amp; &lt;friends&gt;</p>');
});

test('saves an attachment-only story without a title so the server can name it', () => {
  const payload = buildEditorPublishPayload({title: '', body: '', attachmentIds: ['voice1'], audience: {mode: 'private', beneficiaryIds: [], groupIds: []}});
  expect(payload).toMatchObject({title: 'Quick note', body: '<p></p>', capture_source: 'quick', attachments: ['voice1']});
});
