// @ts-nocheck
import { describe, expect, test } from 'bun:test';

describe('chat media gallery contract', () => {
  test('keeps gallery chrome opt-in and leaves standard preview callers unchanged', async () => {
    const preview = await Bun.file(new URL('../../components/ui/MediaPreviewModal.tsx', import.meta.url)).text();
    const chat = await Bun.file(new URL('../../screens/ChatScreen.tsx', import.meta.url)).text();
    expect(preview).toContain("presentation?: 'standard' | 'gallery'");
    expect(preview).toContain('onViewMessage?:');
    expect(preview).toContain('onDeletePersisted?:');
    expect(preview).toContain('GalleryFilmstrip');
    expect(preview).toContain('isGallery ? SCREEN_W : CARD_W');
    expect(chat).not.toContain('presentation="gallery"');
  });

  test('opens shared media from chat settings and supports focused-message navigation', async () => {
    const settings = await Bun.file(new URL('../../../app/chat/settings.tsx', import.meta.url)).text();
    const gallery = await Bun.file(new URL('../../../app/chat/media.tsx', import.meta.url)).text();
    expect(settings).toContain("pathname: '/chat/media'");
    expect(settings).toContain("openAssetCollection('media', 'image')");
    expect(settings).toContain("openAssetCollection('media', 'video')");
    expect(settings).toContain("openAssetCollection('media', 'audio')");
    expect(gallery).toContain('presentation="gallery"');
    expect(settings).not.toContain('(154)');
    expect(gallery).not.toContain('available here soon');
    expect(gallery).toContain('useConversationAttachments');
  });

  test('loads older pages before scrolling and highlights the source message', async () => {
    const chat = await Bun.file(new URL('../../screens/ChatScreen.tsx', import.meta.url)).text();
    const bubble = await Bun.file(new URL('../../components/chat/MessageBubble.tsx', import.meta.url)).text();
    expect(chat).toContain('focusMessageId');
    expect(chat).toContain('fetchOlderMessages()');
    expect(chat).toContain('highlightedMessageId');
    expect(chat).toContain('if (isLoading) return;');
    expect(bubble).toContain('highlighted?: boolean');
  });

  test('keeps destructive confirmation and download feedback in the native preview layer', async () => {
    const gallery = await Bun.file(new URL('../../../app/chat/media.tsx', import.meta.url)).text();
    const preview = await Bun.file(new URL('../../components/ui/MediaPreviewModal.tsx', import.meta.url)).text();
    expect(gallery).not.toContain("openSheet('security-confirmation'");
    expect(preview).toContain('deleteCandidate');
    expect(preview).toContain('handleConfirmDelete');
    expect(preview).toContain('galleryConfirmationOverlay');
    expect(preview).toContain('<ToastViewport />');
    expect(preview).not.toContain('galleryActionNotice');
    expect(preview).toContain('Share.share');
  });

  test('passes attachment identity so View message can resolve and highlight the exact source', async () => {
    const gallery = await Bun.file(new URL('../../../app/chat/media.tsx', import.meta.url)).text();
    const chat = await Bun.file(new URL('../../screens/ChatScreen.tsx', import.meta.url)).text();
    expect(gallery).toContain('focusAttachmentId');
    expect(chat).toContain('focusAttachmentId');
    expect(chat).toContain('messageContainsAttachment');
  });

  test('bounds the horizontal filmstrip so the media viewport owns the remaining height', async () => {
    const preview = await Bun.file(new URL('../../components/ui/MediaPreviewModal.tsx', import.meta.url)).text();
    expect(preview).toContain('style={styles.galleryFilmstripList}');
    expect(preview).toContain('galleryFilmstripList:');
    expect(preview).toContain('flexGrow: 0');
    expect(preview).toContain('height: 68');
  });
});
