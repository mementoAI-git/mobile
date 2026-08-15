import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useMemory } from '@/hooks/queries/use-memories';
import { useBookmarkMemory, useDeleteMemory } from '@/hooks/mutations/use-memory-mutations';
import { useUiStore } from '@/store';
import { getMediaCategory, inferMediaMimeType } from '@/features/media/media-type';

export function useStoryDetailLogic() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: memory, isLoading } = useMemory(id);
  const { mutate: bookmark, isPending: bookmarking } = useBookmarkMemory();
  const { mutate: deleteMemory, isPending: deleting } = useDeleteMemory();
  const openSheet = useUiStore((s) => s.openSheet);

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    openSheet('security-confirmation', {
      kind: 'delete-memory',
      onConfirm: async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await new Promise<void>((resolve, reject) => {
          deleteMemory(memory!._id, {
            onSuccess: () => {
              // After delete, back stack may be empty if opened via deep link
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)/stories');
              }
              resolve();
            },
            onError: reject,
          });
        });
      },
    });
  };

  const handleBookmark = () => {
    Haptics.selectionAsync();
    bookmark({ id: memory!._id, bookmarked: !!memory!.bookmarked });
  };

  const handleEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Serialise the full memory into a single param so the editor can populate
    // title, body, tags, beneficiaries, and all existing attachments.
    const initialData = JSON.stringify({
      title: memory!.title ?? '',
      body: memory!.body ?? '',
      tags: memory!.tags ?? [],
      beneficiaries: (memory!.beneficiaries ?? []).map((b: any) =>
        typeof b === 'string' ? b : b._id
      ).filter(Boolean),
      attachments: (memory!.attachments ?? []).map((a: any) => ({
        id: a._id ?? '',
        url: a.url ?? '',
        type: a.type ?? 'image/jpeg',
        name: a.name ?? '',
      })),
    });
    router.push({
      pathname: '/editor',
      params: {
        mode: 'story',
        memoryId: memory!._id,
        initialData,
      },
    });
  };

  const handleOpenActions = () => {
    Haptics.selectionAsync();
    openSheet('memory-actions', { memory });
  };

  const normalizedAttachments = (memory?.attachments ?? []).map((attachment) => ({
    ...attachment,
    type: inferMediaMimeType({
      mimeType: attachment.type,
      name: attachment.name,
      uri: attachment.url,
    }),
  }));

  const imageAttachments = normalizedAttachments.filter((attachment) => {
    const category = getMediaCategory({
      mimeType: attachment.type,
      name: attachment.name,
      uri: attachment.url,
    });
    return category === 'image' || category === 'video';
  });

  // All audio attachments (voice recordings + uploaded MP3/WAV/AAC etc)
  // shown as tappable thumbnails that open MediaPreviewModal
  const audioAttachments = normalizedAttachments.filter((attachment) => (
    getMediaCategory({
      mimeType: attachment.type,
      name: attachment.name,
      uri: attachment.url,
    }) === 'audio'
  ));

  // Documents only — image, video, and audio all have dedicated sections
  const otherAttachments = normalizedAttachments.filter((attachment) => (
    getMediaCategory({
      mimeType: attachment.type,
      name: attachment.name,
      uri: attachment.url,
    }) === 'file'
  ));

  return {
    id,
    router,
    memory,
    isLoading,
    handleBookmark,
    handleDelete,
    handleEdit,
    handleOpenActions,
    bookmarking,
    deleting,
    imageAttachments,
    audioAttachments,
    otherAttachments,
  };
}
