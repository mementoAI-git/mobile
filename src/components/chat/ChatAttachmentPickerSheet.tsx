import React, { forwardRef, useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import * as MediaLibrary from 'expo-media-library/legacy';
import * as Haptics from 'expo-haptics';
import { Camera, Check, FileText, Film, Image as ImageIcon, Music, Play, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS } from '@/constants/tokens';

type PickerMode = 'gallery' | 'videos' | 'audio';

export type ChatPickerAsset = {
  id: string;
  uri: string;
  uploadUri: string;
  name: string;
  mimeType: string;
  mediaType: 'photo' | 'video' | 'audio';
  duration?: number;
};

interface ChatAttachmentPickerSheetProps {
  onCamera: () => void;
  onDocs: () => void;
  onConfirm: (assets: ChatPickerAsset[]) => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_COLUMNS = 4;
const GRID_GAP = 8;
const SHEET_HORIZONTAL = 20;
const TILE_SIZE = Math.floor((SCREEN_WIDTH - SHEET_HORIZONTAL * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS);
const PAGE_SIZE = 80;

function getAssetMimeType(asset: MediaLibrary.Asset): string {
  const ext = asset.filename?.split('.').pop()?.toLowerCase() ?? '';
  if (asset.mediaType === MediaLibrary.MediaType.video) {
    if (ext === 'mov') return 'video/quicktime';
    if (ext === 'webm') return 'video/webm';
    return 'video/mp4';
  }
  if (asset.mediaType === MediaLibrary.MediaType.audio) {
    if (ext === 'wav') return 'audio/wav';
    if (ext === 'm4a') return 'audio/m4a';
    if (ext === 'aac') return 'audio/aac';
    return 'audio/mpeg';
  }
  if (ext === 'png') return 'image/png';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic') return 'image/heic';
  return 'image/jpeg';
}

function getSelectionLabel(assets: MediaLibrary.Asset[]): string {
  if (assets.length === 0) return 'photos';
  const allPhotos = assets.every(a => a.mediaType === MediaLibrary.MediaType.photo);
  const allVideos = assets.every(a => a.mediaType === MediaLibrary.MediaType.video);
  const allAudio = assets.every(a => a.mediaType === MediaLibrary.MediaType.audio);
  if (allPhotos) return assets.length === 1 ? 'photo' : 'photos';
  if (allVideos) return assets.length === 1 ? 'video' : 'videos';
  if (allAudio) return assets.length === 1 ? 'audio' : 'audio';
  return assets.length === 1 ? 'item' : 'items';
}

export const ChatAttachmentPickerSheet = forwardRef<BottomSheetModal, ChatAttachmentPickerSheetProps>(
  function ChatAttachmentPickerSheet({ onCamera, onDocs, onConfirm }, ref) {
    const insets = useSafeAreaInsets();
    const [mode, setMode] = useState<PickerMode>('gallery');
    const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
    const [selected, setSelected] = useState<Record<string, MediaLibrary.Asset>>({});
    const [loading, setLoading] = useState(false);
    const [resolving, setResolving] = useState(false);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [hasNextPage, setHasNextPage] = useState(false);
    const loadRequestIdRef = useRef(0);

    const selectedAssets = useMemo(() => Object.values(selected), [selected]);
    const selectedCount = selectedAssets.length;
    const selectionLabel = getSelectionLabel(selectedAssets);

    const dismiss = useCallback(() => {
      if (typeof ref !== 'function') ref?.current?.dismiss();
    }, [ref]);

    const handleDismiss = useCallback(() => {
      setSelected({});
    }, []);

    const loadAssets = useCallback(async (nextMode: PickerMode, after?: string | null) => {
      const requestId = ++loadRequestIdRef.current;
      setLoading(true);
      setPermissionDenied(false);
      try {
        const granularPermissions: MediaLibrary.GranularPermission[] =
          nextMode === 'videos' ? ['video'] : nextMode === 'audio' ? ['audio'] : ['photo'];
        const permission = await MediaLibrary.requestPermissionsAsync(false, granularPermissions);
        if (requestId !== loadRequestIdRef.current) return;
        if (!permission.granted) {
          setPermissionDenied(true);
          if (!after) setAssets([]);
          return;
        }

        const mediaType =
          nextMode === 'videos'
            ? MediaLibrary.MediaType.video
            : nextMode === 'audio'
            ? MediaLibrary.MediaType.audio
            : MediaLibrary.MediaType.photo;

        const page = await MediaLibrary.getAssetsAsync({
          first: PAGE_SIZE,
          after: after ?? undefined,
          mediaType,
          sortBy: [[MediaLibrary.SortBy.creationTime, false]],
        });

        if (requestId !== loadRequestIdRef.current) return;
        setAssets(prev => (after ? [...prev, ...page.assets] : page.assets));
        setNextCursor(page.endCursor);
        setHasNextPage(page.hasNextPage);
      } finally {
        if (requestId === loadRequestIdRef.current) {
          setLoading(false);
        }
      }
    }, []);

    const handleSheetChange = useCallback((index: number) => {
      if (index >= 0 && assets.length === 0 && !loading) {
        loadAssets(mode, null);
      }
    }, [assets.length, loadAssets, loading, mode]);

    const selectMode = useCallback((nextMode: PickerMode) => {
      if (nextMode === mode) return;
      Haptics.selectionAsync();
      setMode(nextMode);
      setAssets([]);
      setNextCursor(null);
      setHasNextPage(false);
      loadAssets(nextMode, null);
    }, [loadAssets, mode]);

    const handleCamera = useCallback(() => {
      Haptics.selectionAsync();
      dismiss();
      onCamera();
    }, [dismiss, onCamera]);

    const handleDocs = useCallback(() => {
      Haptics.selectionAsync();
      dismiss();
      onDocs();
    }, [dismiss, onDocs]);

    const toggleAsset = useCallback((asset: MediaLibrary.Asset) => {
      Haptics.selectionAsync();
      setSelected(prev => {
        const next = { ...prev };
        if (next[asset.id]) delete next[asset.id];
        else next[asset.id] = asset;
        return next;
      });
    }, []);

    const handleAddSelected = useCallback(async () => {
      if (selectedAssets.length === 0 || resolving) return;
      setResolving(true);
      try {
        const resolved = await Promise.all(selectedAssets.map(async (asset): Promise<ChatPickerAsset> => {
          const info = await MediaLibrary.getAssetInfoAsync(asset.id);
          return {
            id: asset.id,
            uri: asset.uri,
            uploadUri: info.localUri ?? info.uri ?? asset.uri,
            name: asset.filename || `${asset.mediaType}_${Date.now()}`,
            mimeType: getAssetMimeType(asset),
            mediaType: asset.mediaType as 'photo' | 'video' | 'audio',
            duration: asset.duration,
          };
        }));
        onConfirm(resolved);
        setSelected({});
        dismiss();
      } finally {
        setResolving(false);
      }
    }, [dismiss, onConfirm, resolving, selectedAssets]);

    const loadMore = useCallback(() => {
      if (!loading && hasNextPage && nextCursor) {
        loadAssets(mode, nextCursor);
      }
    }, [hasNextPage, loadAssets, loading, mode, nextCursor]);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.45}
          pressBehavior="close"
        />
      ),
      [],
    );

    const renderAsset = useCallback(({ item }: { item: MediaLibrary.Asset }) => {
      const isSelected = Boolean(selected[item.id]);
      const isVideo = item.mediaType === MediaLibrary.MediaType.video;
      const isAudio = item.mediaType === MediaLibrary.MediaType.audio;

      return (
        <TouchableOpacity
          onPress={() => toggleAsset(item)}
          activeOpacity={0.88}
          style={styles.assetTile}
        >
          {isAudio ? (
            <View style={styles.audioTile}>
              <Music size={28} color={COLORS.textInverse} strokeWidth={2} />
              <Text style={styles.audioLabel}>Audio</Text>
            </View>
          ) : (
            <Image source={{ uri: item.uri }} style={styles.assetImage} resizeMode="cover" />
          )}
          {isVideo && (
            <View style={styles.playOverlay}>
              <Play size={18} color={COLORS.textInverse} fill={COLORS.textInverse} strokeWidth={0} />
            </View>
          )}
          <View style={isSelected ? styles.selectedCheck : styles.unselectedDot}>
            {isSelected ? <Check size={13} color={COLORS.textStrong} strokeWidth={3} /> : null}
          </View>
        </TouchableOpacity>
      );
    }, [selected, toggleAsset]);

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={['72%', '94%']}
        backdropComponent={renderBackdrop}
        enablePanDownToClose
        onChange={handleSheetChange}
        onDismiss={handleDismiss}
        handleIndicatorStyle={styles.handle}
        backgroundStyle={styles.sheetBackground}
      >
        <BottomSheetView style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Attach media</Text>
            <TouchableOpacity onPress={dismiss} activeOpacity={0.8} style={styles.closeButton}>
              <X size={26} color={COLORS.textInverse} strokeWidth={2.2} />
            </TouchableOpacity>
          </View>

          <View style={styles.actionRow}>
            <PickerAction label="Camera" icon={<Camera size={36} color={COLORS.textInverse} strokeWidth={2} />} onPress={handleCamera} />
            <PickerAction label="Gallery" active={mode === 'gallery'} icon={<ImageIcon size={36} color={COLORS.textInverse} strokeWidth={2} />} onPress={() => selectMode('gallery')} />
            <PickerAction label="Videos" active={mode === 'videos'} icon={<Film size={36} color={COLORS.textInverse} strokeWidth={2} />} onPress={() => selectMode('videos')} />
            <PickerAction label="Audio" active={mode === 'audio'} icon={<Music size={36} color={COLORS.textInverse} strokeWidth={2} />} onPress={() => selectMode('audio')} />
            <PickerAction label="Docs" icon={<FileText size={36} color={COLORS.textInverse} strokeWidth={2} />} onPress={handleDocs} />
          </View>

          <View style={styles.divider} />

          {permissionDenied ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Media access needed</Text>
              <Text style={styles.emptyText}>Allow Memento to show your recent media here.</Text>
              <TouchableOpacity onPress={() => loadAssets(mode, null)} style={styles.permissionButton}>
                <Text style={styles.permissionButtonText}>Allow access</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <BottomSheetFlatList
              data={assets}
              keyExtractor={(item) => item.id}
              renderItem={renderAsset}
              numColumns={4}
              columnWrapperStyle={styles.gridRow}
              contentContainerStyle={[styles.gridContent, { paddingBottom: insets.bottom + 118 }]}
              onEndReached={loadMore}
              onEndReachedThreshold={0.6}
              ListFooterComponent={loading ? <ActivityIndicator color={COLORS.brand} style={styles.loader} /> : null}
            />
          )}

          <View style={[styles.footer, { paddingBottom: insets.bottom ? insets.bottom + 12 : 20 }]}>
            <TouchableOpacity onPress={dismiss} activeOpacity={0.86} style={styles.dismissButton}>
              <Text style={styles.dismissText}>Dismiss</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleAddSelected}
              disabled={selectedCount === 0 || resolving}
              activeOpacity={0.86}
              style={[styles.addButton, selectedCount === 0 && styles.addButtonDisabled]}
            >
              {resolving ? (
                <ActivityIndicator color={COLORS.textInverse} />
              ) : (
                <Text style={styles.addText}>Add {selectedCount} {selectionLabel}</Text>
              )}
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

function PickerAction({
  label,
  icon,
  onPress,
  active,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.86} style={[styles.actionTile, active && styles.actionTileActive]}>
      {icon}
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: COLORS.textStrong,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  handle: {
    width: 96,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.textStrong,
  },
  header: {
    paddingHorizontal: SHEET_HORIZONTAL,
    paddingTop: 22,
    paddingBottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: FONTS.sansBold,
    fontSize: 30,
    color: COLORS.textInverse,
  },
  closeButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: SHEET_HORIZONTAL,
    gap: 8,
  },
  actionTile: {
    flex: 1,
    height: 128,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  actionTileActive: {
    borderColor: `${COLORS.brand}99`,
    backgroundColor: 'rgba(255,255,255,0.11)',
  },
  actionLabel: {
    fontFamily: FONTS.sansMedium,
    fontSize: 16,
    color: COLORS.textInverse,
  },
  divider: {
    marginHorizontal: SHEET_HORIZONTAL,
    marginTop: 30,
    marginBottom: 32,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  gridContent: {
    paddingHorizontal: SHEET_HORIZONTAL,
  },
  gridRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  assetTile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  assetImage: {
    width: '100%',
    height: '100%',
  },
  audioTile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  audioLabel: {
    marginTop: 8,
    fontFamily: FONTS.sansBold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.68)',
  },
  playOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  selectedCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unselectedDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.78)',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 160,
  },
  emptyTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 18,
    color: COLORS.textInverse,
  },
  emptyText: {
    marginTop: 8,
    fontFamily: FONTS.sans,
    fontSize: 14,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.68)',
  },
  permissionButton: {
    marginTop: 18,
    height: 48,
    paddingHorizontal: 22,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.brand,
  },
  permissionButtonText: {
    fontFamily: FONTS.sansBold,
    fontSize: 14,
    color: COLORS.textInverse,
  },
  loader: {
    paddingVertical: 24,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 24,
    paddingTop: 32,
    paddingHorizontal: SHEET_HORIZONTAL,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.16)',
    backgroundColor: COLORS.textStrong,
  },
  dismissButton: {
    flex: 1,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  dismissText: {
    fontFamily: FONTS.sansBold,
    fontSize: 18,
    color: COLORS.textInverse,
  },
  addButton: {
    flex: 1,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.brand,
  },
  addButtonDisabled: {
    opacity: 0.45,
  },
  addText: {
    fontFamily: FONTS.sansBold,
    fontSize: 18,
    color: COLORS.textInverse,
  },
});
