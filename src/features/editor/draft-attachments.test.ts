import { expect, test } from 'bun:test';
import { toStoryDraftAttachments } from './draft-attachments';
test('keeps pending media as well as completed upload references', () => {
  const result = toStoryDraftAttachments([
    { clientId: 'pending', fileId: null, uri: 'file://photo.jpg', name: 'Photo', mimeType: 'image/jpeg', isUploading: true },
    { clientId: 'done', fileId: 'server-id', uri: 'file://old.jpg', name: 'Uploaded', mimeType: 'image/jpeg', isUploading: false, file: { _id: 'server-id', url: 'https://example.com/photo.jpg' } },
  ]);
  expect(result.map(file => [file.fileId, file.uri])).toEqual([['', 'file://photo.jpg'], ['server-id', 'https://example.com/photo.jpg']]);
});
