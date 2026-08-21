import { describe, expect, test } from 'bun:test';
import { collectSharedAttachments, collectSharedLinks, collectSharedMedia, findFocusedMessageIndex, getAuthoritativeFileIds } from './shared-media';

describe('shared chat media', () => {
  test('collects visual attachments with stable file and source-message identity', () => {
    const pages = [{ messages: [
      { _id: 'message-1', role: 'user', attachments: [
        { _id: 'image-1', url: 'https://cdn/image.jpg', name: 'image.jpg', type: 'image/jpeg' },
        { _id: 'doc-1', url: 'https://cdn/doc.pdf', name: 'doc.pdf', type: 'application/pdf' },
      ] },
      { _id: 'message-2', role: 'user', attatchments: [
        { _id: 'video-1', url: 'https://cdn/video.mp4', name: 'video.mp4', type: 'video/mp4' },
      ] },
    ] }];

    expect(collectSharedMedia(pages)).toEqual([
      expect.objectContaining({ clientId: 'video-1', persistedFileId: 'video-1', sourceMessageId: 'message-2' }),
      expect.objectContaining({ clientId: 'image-1', persistedFileId: 'image-1', sourceMessageId: 'message-1' }),
    ]);
  });

  test('deduplicates paginated overlap and locates a focused message', () => {
    const message = { _id: 'message-1', role: 'user', attachments: [{ _id: 'image-1', url: 'x.jpg', name: 'x.jpg', type: 'image/jpeg' }] };
    expect(collectSharedMedia([{ messages: [message] }, { messages: [message] }])).toHaveLength(1);
    expect(findFocusedMessageIndex([{ _id: 'a' }, { _id: 'message-1' }], 'message-1')).toBe(1);
    expect(findFocusedMessageIndex([{ _id: 'a' }], 'missing')).toBe(-1);
  });

  test('excludes message references removed from the authoritative memory attachment list', () => {
    const pages = [{ messages: [{
      _id: 'message-1',
      attachments: [
        { _id: 'kept', url: 'kept.jpg', name: 'kept.jpg', type: 'image/jpeg' },
        { _id: 'removed', url: 'removed.jpg', name: 'removed.jpg', type: 'image/jpeg' },
      ],
    }] }];
    expect(collectSharedMedia(pages, new Set(['kept'])).map((item) => item.clientId)).toEqual(['kept']);
  });

  test('keeps newest pages ahead of older paginated media', () => {
    const image = (id: string) => ({ _id: id, url: `${id}.jpg`, name: `${id}.jpg`, type: 'image/jpeg' });
    const pages = [
      { messages: [{ _id: 'latest', attachments: [image('latest-file')] }] },
      { messages: [{ _id: 'older', attachments: [image('older-file')] }] },
    ];
    expect(collectSharedMedia(pages).map((item) => item.clientId)).toEqual(['latest-file', 'older-file']);
  });

  test('does not hide message media when the memory attachment list is empty or unusable', () => {
    expect(getAuthoritativeFileIds([])).toBeUndefined();
    expect(getAuthoritativeFileIds([{}])).toBeUndefined();
    expect(getAuthoritativeFileIds(['one', { id: 'two' }, { _id: 'three' }])).toEqual(new Set(['one', 'two', 'three']));
  });

  test('categorizes every attachment type and extracts source-linked URLs', () => {
    const pages = [{ messages: [{
      _id: 'message-1',
      text: 'See https://memento.example/story and https://memento.example/story',
      attachments: [
        { _id: 'image', url: 'image.jpg', name: 'image.jpg', type: 'image/jpeg' },
        { _id: 'audio', url: 'audio.mp3', name: 'audio.mp3', type: 'audio/mpeg' },
        { _id: 'doc', url: 'doc.pdf', name: 'doc.pdf', type: 'application/pdf' },
      ],
    }] }];

    expect(collectSharedAttachments(pages).map((item) => item.category)).toEqual(['file', 'audio', 'image']);
    expect(collectSharedLinks(pages)).toEqual([
      expect.objectContaining({ clientId: 'message-1-link-0', sourceMessageId: 'message-1', url: 'https://memento.example/story' }),
    ]);
  });
});
