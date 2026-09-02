import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useMemory } from '@/hooks/queries/use-memories';
import { useBookmarkMemory, useDeleteMemory } from '@/hooks/mutations/use-memory-mutations';
import { useUiStore } from '@/store';
import { getMediaCategory, inferMediaMimeType } from '@/features/media/media-type';
import { useCallback, useMemo } from 'react';

export function useStoryDetailLogic() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const router = useRouter();
  const { data: memory, isLoading } = useMemory(id);
  const { mutate: bookmark, isPending: bookmarking } = useBookmarkMemory();
  const { mutate: deleteMemory, isPending: deleting } = useDeleteMemory();
  const openSheet = useUiStore((s) => s.openSheet);

  const handleDelete = useCallback(() => {
    if (!memory) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    openSheet('security-confirmation', {
      kind: 'delete-memory',
      onConfirm: async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await new Promise<void>((resolve, reject) => {
          deleteMemory(memory._id, {
            onSuccess: () => {
              // After delete, back stack may be empty if opened via deep link
              if (from === 'overview') {
                router.replace('/(tabs)/overview');
              } else if (router.canGoBack()) {
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
  }, [memory, openSheet, deleteMemory, from, router]);

  const handleBookmark = useCallback(() => {
    if (!memory) return;
    Haptics.selectionAsync();
    bookmark({ id: memory._id, bookmarked: !!memory.bookmarked });
  }, [memory, bookmark]);

  const handleEdit = useCallback(() => {
    if (!memory) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Serialise the full memory into a single param so the editor can populate
    // title, body, tags, beneficiaries, and all existing attachments.
    const initialData = JSON.stringify({
      title: memory.title ?? '',
      body: memory.body ?? '',
      tags: memory.tags ?? [],
      beneficiaries: (memory.beneficiaries ?? []).map((b: any) =>
        typeof b === 'string' ? b : b._id
      ).filter(Boolean),
      attachments: (memory.attachments ?? []).map((a: any) => ({
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
        memoryId: memory._id,
        initialData,
      },
    });
  }, [memory, router]);

  const handleOpenActions = useCallback(() => {
    Haptics.selectionAsync();
    openSheet('memory-actions', { memory });
  }, [memory, openSheet]);

  const normalizedAttachments = useMemo(() => {
    return (memory?.attachments ?? []).map((attachment) => ({
      ...attachment,
      type: inferMediaMimeType({
        mimeType: attachment.type,
        name: attachment.name,
        uri: attachment.url,
      }),
    }));
  }, [memory?.attachments]);

  const imageAttachments = useMemo(() => {
    return normalizedAttachments.filter((attachment) => {
      const category = getMediaCategory({
        mimeType: attachment.type,
        name: attachment.name,
        uri: attachment.url,
      });
      return category === 'image' || category === 'video';
    });
  }, [normalizedAttachments]);

  const audioAttachments = useMemo(() => {
    return normalizedAttachments.filter((attachment) => (
      getMediaCategory({
        mimeType: attachment.type,
        name: attachment.name,
        uri: attachment.url,
      }) === 'audio'
    ));
  }, [normalizedAttachments]);

  const otherAttachments = useMemo(() => {
    return normalizedAttachments.filter((attachment) => (
      getMediaCategory({
        mimeType: attachment.type,
        name: attachment.name,
        uri: attachment.url,
      }) === 'file'
    ));
  }, [normalizedAttachments]);

  return useMemo(
    () => ({
      id,
      returnToOverview: from === 'overview',
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
    }),
    [
      id,
      from,
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
    ],
  );
}
