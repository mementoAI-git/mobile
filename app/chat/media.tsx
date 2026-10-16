import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Text, View, useWindowDimensions } from 'react-native';
import { Pressable } from '@/components/ui/Touchable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import FileText from 'lucide-react-native/icons/file-text';
import ImageIcon from 'lucide-react-native/icons/image';
import Link2 from 'lucide-react-native/icons/link-2';
import Music2 from 'lucide-react-native/icons/music-2';
import Play from 'lucide-react-native/icons/play';
import * as Haptics from 'expo-haptics';
import { MediaPreviewModal, type PreviewAttachment } from '@/components/ui/MediaPreviewModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { mapAttachmentsToShared, type SharedAttachment, type SharedLink } from '@/features/chat/shared-media';
import { useConversationAttachments } from '@/hooks/queries/use-memories';
import { useRemoveMemoryFile } from '@/hooks/mutations/use-memory-mutations';
import { SignedAttachmentImage } from '@/components/ui/SignedAttachmentImage';

type GalleryTab = 'media' | 'docs' | 'links';
type AssetType = 'all' | 'image' | 'video' | 'audio';

export default function ChatMediaScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ chatId?: string; tab?: GalleryTab; assetType?: AssetType }>();
  const chatId = params.chatId ?? '';
  const [tab, setTab] = useState<GalleryTab>(params.tab === 'docs' || params.tab === 'links' ? params.tab : 'media');
  const [assetType, setAssetType] = useState<AssetType>(params.assetType ?? 'all');
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set());

  const attachmentsQuery = useConversationAttachments(chatId);
  const removeFile = useRemoveMemoryFile(chatId);

  const rawAttachments = Array.isArray(attachmentsQuery.data) ? attachmentsQuery.data : attachmentsQuery.data?.attachments ?? [];
  const rawLinks = attachmentsQuery.data?.links ?? [];

  const allAttachments = useMemo(
    () => mapAttachmentsToShared(rawAttachments).filter((item) => !deletedIds.has(item.clientId)),
    [rawAttachments, deletedIds],
  );
  const media = useMemo(() => allAttachments.filter(({ category }) => {
    if (assetType === 'audio') return category === 'audio';
    if (assetType === 'image' || assetType === 'video') return category === assetType;
    return category === 'image' || category === 'video';
  }), [allAttachments, assetType]);
  const docs = useMemo(() => allAttachments.filter(({ category }) => category === 'file'), [allAttachments]);
  const links = useMemo(() => (rawLinks as SharedLink[]), [rawLinks]);

  const activeAttachments = tab === 'docs' ? docs : media;
  const gap = 3;
  const tileSize = Math.floor((width - gap * 3) / 4);

  const goBack = useCallback(() => {
    Haptics.selectionAsync();
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/chat');
  }, [router]);

  const renderVisualItem = useCallback(({ item, index }: { item: SharedAttachment; index: number }) => (
    <Pressable onPress={() => { Haptics.selectionAsync(); setPreviewIndex(index); }} style={{ width: tileSize, height: tileSize }}>
      <SignedAttachmentImage
        attachment={{
          _id: item.persistedFileId ?? item.clientId,
          url: item.uri,
          thumbnail: item.thumbnailUrl,
          access: item.access,
        }}
        preferThumbnail
        resizeMode="cover"
        style={{ width: '100%', height: '100%' }}
      />
      {item.category === 'video' ? <View className="absolute inset-0 items-center justify-center bg-black/15"><Play size={20} color={COLORS.textInverse} fill={COLORS.textInverse} /></View> : null}
    </Pressable>
  ), [tileSize]);

  const renderAttachmentItem = useCallback(({ item, index }: { item: SharedAttachment; index: number }) => {
    const Icon = item.category === 'audio' ? Music2 : FileText;
    return (
      <Pressable onPress={() => { Haptics.selectionAsync(); setPreviewIndex(index); }} className="mx-4 mb-3 min-h-16 flex-row items-center gap-3 rounded-2xl border border-stroke-weak bg-card px-4 py-3">
        <View className="size-11 items-center justify-center rounded-xl bg-fill-weak"><Icon size={22} color={COLORS.textStrong} /></View>
        <View className="flex-1">
          <Text numberOfLines={1} style={[TYPE.body, {color: COLORS.textStrong}]}>{item.name || (item.category === 'audio' ? 'Audio' : 'Document')}</Text>
          <Text style={{ ...TYPE.metadata, color: COLORS.textWeak }}>{item.category === 'audio' ? 'Audio' : 'Document'}</Text>
        </View>
      </Pressable>
    );
  }, []);

  const renderLinkItem = useCallback(({ item }: { item: SharedLink }) => (
    <Pressable onPress={() => { Haptics.selectionAsync(); void Linking.openURL(item.url); }} className="mx-4 mb-3 min-h-16 flex-row items-center gap-3 rounded-2xl border border-stroke-weak bg-card px-4 py-3">
      <View className="size-11 items-center justify-center rounded-xl bg-fill-weak"><Link2 size={22} color={COLORS.textStrong} /></View>
      <View className="flex-1">
        <Text numberOfLines={1} style={[TYPE.body, {color: COLORS.textStrong}]}>{item.url}</Text>
        <Text style={{ ...TYPE.metadata, color: COLORS.textWeak }}>Open link</Text>
      </View>
    </Pressable>
  ), []);

  const onViewMessage = useCallback((item: PreviewAttachment) => {
    if (!item.sourceMessageId && !item.persistedFileId) return;
    setPreviewIndex(null);
    router.replace({ pathname: '/chat/[id]', params: { id: chatId, focusMessageId: item.sourceMessageId, focusAttachmentId: item.persistedFileId } });
  }, [chatId, router]);

  const onDelete = useCallback(async (item: PreviewAttachment) => {
    if (!item.persistedFileId) return;
    await removeFile.mutateAsync(item.persistedFileId);
    setDeletedIds((current) => new Set(current).add(item.clientId));
  }, [removeFile]);

  const emptyCopy = assetType === 'image' ? 'Photos' : assetType === 'video' ? 'Videos' : 'Photos and videos';
  const listPerformance = { initialNumToRender: 8, maxToRenderPerBatch: 5, windowSize: 5 } as const;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-row items-center gap-3 px-4 py-3">
        <Pressable onPress={goBack} className="size-11 items-center justify-center rounded-full bg-fill-weaker"><ArrowLeft size={22} color={COLORS.textStrong} /></Pressable>
        {([['media', 'Media', ImageIcon], ['docs', 'Docs', FileText], ['links', 'Links', Link2]] as const).map(([id, label, Icon]) => {
          const active = tab === id;
          return (
            <Pressable key={id} onPress={() => { Haptics.selectionAsync(); setPreviewIndex(null); setTab(id); if (id !== 'media') setAssetType('all'); }} className="h-11 flex-1 flex-row items-center justify-center gap-2 rounded-xl" style={{ backgroundColor: active ? COLORS.textStrong : COLORS.fillWeak }}>
              <Icon size={18} color={active ? COLORS.textInverse : COLORS.textBase} />
              <Text style={[TYPE.buttonSmall, {color: active ? COLORS.textInverse : COLORS.textStrong}]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {attachmentsQuery.isLoading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color={COLORS.brand} /></View>
      ) : tab === 'links' ? (
        <FlatList data={links} renderItem={renderLinkItem} keyExtractor={(item, idx) => item.clientId || String(idx)} contentContainerStyle={{ flexGrow: 1, paddingTop: 8 }} {...listPerformance} removeClippedSubviews ListEmptyComponent={<EmptyState title="No shared links yet" description="Links from this conversation will collect here." />} />
      ) : tab === 'media' && assetType !== 'audio' ? (
        <FlatList key="visual-grid" data={media} renderItem={renderVisualItem} keyExtractor={(item) => item.clientId} numColumns={4} columnWrapperStyle={{ gap }} contentContainerStyle={{ gap, flexGrow: 1 }} {...listPerformance} removeClippedSubviews ListEmptyComponent={<EmptyState title="Your shared moments will appear here" description={`${emptyCopy} from this conversation will collect here.`} />} />
      ) : (
        <FlatList key="attachment-list" data={activeAttachments} renderItem={renderAttachmentItem} keyExtractor={(item) => item.clientId} contentContainerStyle={{ flexGrow: 1, paddingTop: 8 }} {...listPerformance} removeClippedSubviews ListEmptyComponent={<EmptyState title={tab === 'docs' ? 'No shared documents yet' : 'No shared audio yet'} description={`${tab === 'docs' ? 'Documents' : 'Audio'} from this conversation will collect here.`} />} />
      )}

      {previewIndex !== null && activeAttachments[previewIndex] ? (
        <MediaPreviewModal visible presentation="gallery" attachments={activeAttachments} initialIndex={previewIndex} memoryId={chatId} onClose={() => setPreviewIndex(null)} onViewMessage={onViewMessage} onDeletePersisted={onDelete} />
      ) : null}
    </SafeAreaView>
  );
}
