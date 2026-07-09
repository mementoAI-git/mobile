// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import {
  createUploadingAttachment,
  getUploadedAttachments,
  getUploadedAttachmentIds,
  hasUploadingAttachments,
  insertUploadingAttachment,
  markAttachmentUploaded,
  removeAttachmentByClientId,
} from './attachment-upload-state';

describe('attachment upload state', () => {
  const upload = {
    uri: 'file:///cache/photo.jpg',
    mimeType: 'image/jpeg',
    name: 'photo.jpg',
    isVoice: false,
    duration: undefined,
  };

  test('creates an optimistic uploading attachment', () => {
    expect(createUploadingAttachment(upload, 'client-1')).toEqual({
      clientId: 'client-1',
      fileId: null,
      uri: 'file:///cache/photo.jpg',
      name: 'photo.jpg',
      mimeType: 'image/jpeg',
      isVoice: false,
      duration: undefined,
      isUploading: true,
    });
  });

  test('inserts optimistic attachments in append or prepend order', () => {
    const existing = [createUploadingAttachment(upload, 'existing')];
    const next = createUploadingAttachment({ ...upload, name: 'new.jpg' }, 'new');

    expect(insertUploadingAttachment(existing, next, 'append').map(a => a.clientId)).toEqual(['existing', 'new']);
    expect(insertUploadingAttachment(existing, next, 'prepend').map(a => a.clientId)).toEqual(['new', 'existing']);
  });

  test('marks an optimistic attachment as uploaded', () => {
    const existing = [createUploadingAttachment(upload, 'client-1')];
    const file = { _id: 'file-1', url: 'https://cdn.mymemento.io/photo.jpg' };

    expect(markAttachmentUploaded(existing, 'client-1', file)).toEqual([
      {
        clientId: 'client-1',
        fileId: 'file-1',
        uri: 'file:///cache/photo.jpg',
        name: 'photo.jpg',
        mimeType: 'image/jpeg',
        isVoice: false,
        duration: undefined,
        isUploading: false,
        file,
      },
    ]);
  });

  test('removes failed optimistic attachments by client id', () => {
    const first = createUploadingAttachment(upload, 'client-1');
    const second = createUploadingAttachment({ ...upload, name: 'second.jpg' }, 'client-2');

    expect(removeAttachmentByClientId([first, second], 'client-1')).toEqual([second]);
  });

  test('tracks upload readiness from a single source of truth', () => {
    const uploading = createUploadingAttachment(upload, 'uploading');
    const uploaded = markAttachmentUploaded(
      [createUploadingAttachment({ ...upload, name: 'uploaded.jpg' }, 'uploaded')],
      'uploaded',
      { _id: 'file-1' },
    )[0];
    const inconsistent = {
      ...createUploadingAttachment({ ...upload, name: 'race.jpg' }, 'race'),
      fileId: 'file-race',
    };

    expect(hasUploadingAttachments([uploading, uploaded, inconsistent])).toBe(true);
    expect(getUploadedAttachmentIds([uploading, uploaded, inconsistent])).toEqual(['file-1']);
    expect(getUploadedAttachments([uploading, uploaded, inconsistent]).map(a => a.clientId)).toEqual(['uploaded']);
  });
});
