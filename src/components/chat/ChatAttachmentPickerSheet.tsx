import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Dimensions,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetFooter,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import * as MediaLibrary from 'expo-media-library/legacy';
import * as Haptics from 'expo-haptics';
import {
  Camera,
  Check,
  FileText,
  Film,
  Image as ImageIcon,
  ImageOff,
  Music,
  Play,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PermissionRecoveryState } from '@/components/ui';
import { COLORS, FONTS } from '@/constants/tokens';
import {
  getPermissionRecoveryAction,
  isPermissionGranted,
  type PermissionLike,
} from '@/lib/permission-recovery';
import { getPickerAssetUploadUri } from '@/features/media/picker-assets';

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
  onAudio?: () => void;
  onConfirm: (assets: ChatPickerAsset[]) => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_COLUMNS = 4;
const GRID_GAP = 3;
const SHEET_HORIZONTAL = 16;
const TILE_SIZE = Math.floor((SCREEN_WIDTH - SHEET_HORIZONTAL * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS);
const PAGE_SIZE = 80;

// ─── Asset cache — bounded and short-lived to avoid retaining large media lists ────
const assetCache = new Map<PickerMode, { assets: MediaLibrary.Asset[]; cursor: string | null; hasNextPage: boolean; ts: number }>();
const CACHE_TTL_MS = 20_000; // 20 seconds

export function clearAssetCache() {
  assetCache.clear();
}

function getCachedAssets(mode: PickerMode) {
  const entry = assetCache.get(mode);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    assetCache.delete(mode);
    return null;
  }
  return entry;
}

function setCachedAssets(mode: PickerMode, assets: MediaLibrary.Asset[], cursor: string | null, hasNextPage: boolean) {
  assetCache.set(mode, { assets, cursor, hasNextPage, ts: Date.now() });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function getGranularPermissions(mode: PickerMode): MediaLibrary.GranularPermission[] {
  return mode === 'videos' ? ['video'] : mode === 'audio' ? ['audio'] : ['photo'];
}

// ─── Main component ───────────────────────────────────────────────────────────

export const ChatAttachmentPickerSheet = forwardRef<BottomSheetModal, ChatAttachmentPickerSheetProps>(
  function ChatAttachmentPickerSheet({ onCamera, onDocs, onAudio, onConfirm }, ref) {
    const insets = useSafeAreaInsets();
    const [mode, setMode] = useState<PickerMode>('gallery');
    const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
    const [selected, setSelected] = useState<Record<string, MediaLibrary.Asset>>({});
    const [loading, setLoading] = useState(false);
    const [resolving, setResolving] = useState(false);
    const [permissionIssue, setPermissionIssue] = useState<PermissionLike | null>(null);
    const [isOpen, setIsOpen] = useState(false);
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
      clearAssetCache();
      setSelected({});
      setIsOpen(false);
    }, []);

    const loadAssets = useCallback(async (nextMode: PickerMode, after?: string | null) => {
      // Use cache for first page loads (after === null/undefined) if available
      if (!after) {
        const cached = getCachedAssets(nextMode);
        if (cached) {
          setAssets(cached.assets);
          setNextCursor(cached.cursor);
          setHasNextPage(cached.hasNextPage);
          setPermissionIssue(null);
          return;
        }
      }

      const requestId = ++loadRequestIdRef.current;
      setLoading(true);
      setPermissionIssue(null);
      try {
        const granularPermissions = getGranularPermissions(nextMode);
        const permission = await MediaLibrary.requestPermissionsAsync(false, granularPermissions);
        if (requestId !== loadRequestIdRef.current) return;
        if (!isPermissionGranted(permission)) {
          setPermissionIssue(permission);
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

        const filteredNewAssets = page.assets.filter((a) => {
          if (nextMode === 'videos') return a.mediaType === MediaLibrary.MediaType.video;
          if (nextMode === 'audio') return a.mediaType === MediaLibrary.MediaType.audio;
          return a.mediaType === MediaLibrary.MediaType.photo;
        });

        const nextAssets = after ? [...assets, ...filteredNewAssets] : filteredNewAssets;
        setAssets(nextAssets);
        setNextCursor(page.endCursor);
        setHasNextPage(page.hasNextPage);

        // Cache first-page results
        if (!after) {
          setCachedAssets(nextMode, nextAssets, page.endCursor, page.hasNextPage);
        }
      } finally {
        if (requestId === loadRequestIdRef.current) {
          setLoading(false);
        }
      }
    }, [assets]);

    const handleSheetChange = useCallback((index: number) => {
      const opening = index >= 0;
      setIsOpen(opening);
      if (opening && assets.length === 0 && !loading) {
        loadAssets(mode, null);
      }
    }, [assets.length, loadAssets, loading, mode]);

    // Re-check permission if user returns from Settings
    useEffect(() => {
      if (!isOpen || !permissionIssue) return undefined;

      const subscription = AppState.addEventListener('change', async (state) => {
        if (state !== 'active') return;
        const permission = await MediaLibrary.getPermissionsAsync(false, getGranularPermissions(mode));
        if (isPermissionGranted(permission)) {
          setPermissionIssue(null);
          loadAssets(mode, null);
        } else {
          setPermissionIssue(permission);
        }
      });

      return () => subscription.remove();
    }, [isOpen, loadAssets, mode, permissionIssue]);

    const permissionRecoveryAction = getPermissionRecoveryAction(permissionIssue);
    const permissionCopy = useMemo(() => {
      const noun = mode === 'videos' ? 'videos' : mode === 'audio' ? 'audio' : 'photos';
      return {
        title: `${noun[0].toUpperCase()}${noun.slice(1)} are tucked away`,
        description:
          permissionRecoveryAction === 'settings'
            ? `Memento cannot see your ${noun} because access is turned off in Settings. Turn it back on to attach them here.`
            : `Allow Memento to show your recent ${noun} so you can attach them without leaving the chat.`,
      };
    }, [mode, permissionRecoveryAction]);

    const handlePermissionAction = useCallback(() => {
      if (permissionRecoveryAction === 'settings') {
        Linking.openSettings();
        return;
      }
      loadAssets(mode, null);
    }, [loadAssets, mode, permissionRecoveryAction]);

    const selectMode = useCallback((nextMode: PickerMode) => {
      if (nextMode === mode) return;
      Haptics.selectionAsync();
      setMode(nextMode);
      // Check cache first — if available, no loading state needed
      const cached = getCachedAssets(nextMode);
      if (cached) {
        setAssets(cached.assets);
        setNextCursor(cached.cursor);
        setHasNextPage(cached.hasNextPage);
        setPermissionIssue(null);
      } else {
        setAssets([]);
        setNextCursor(null);
        setHasNextPage(false);
        loadAssets(nextMode, null);
      }
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

    const handleAudio = useCallback(() => {
      Haptics.selectionAsync();
      if (Platform.OS === 'ios' && onAudio) {
        dismiss();
        onAudio();
      } else {
        selectMode('audio');
      }
    }, [dismiss, onAudio, selectMode]);

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
          const uploadUri = await getPickerAssetUploadUri(asset, MediaLibrary.getAssetInfoAsync);
          return {
            id: asset.id,
            uri: asset.uri,
            uploadUri,
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

    const keyExtractor = useCallback((item: MediaLibrary.Asset) => item.id, []);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.3}
          pressBehavior="close"
        />
      ),
      [],
    );

    const renderAsset = useCallback(({ item }: { item: MediaLibrary.Asset }) => (
      <AssetTile
        asset={item}
        isSelected={Boolean(selected[item.id])}
        onToggle={toggleAsset}
      />
    ), [selected, toggleAsset]);

    const renderFooter = useCallback((props: BottomSheetFooterProps) => (
      <BottomSheetFooter
        {...props}
        bottomInset={0}
        style={styles.footerContainer}
      >
        <View style={[styles.footerContent, { paddingBottom: insets.bottom ? insets.bottom + 12 : 16 }]}>
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
              <Text style={styles.addText}>
                {selectedCount > 0 ? `Add ${selectedCount} ${selectionLabel}` : 'Select to add'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </BottomSheetFooter>
    ), [dismiss, handleAddSelected, insets.bottom, resolving, selectedCount, selectionLabel]);

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={['60%', '92%']}
        enableDynamicSizing={false}
        backdropComponent={renderBackdrop}
        footerComponent={renderFooter}
        enablePanDownToClose
        onChange={handleSheetChange}
        onDismiss={handleDismiss}
        handleIndicatorStyle={styles.handle}
        backgroundStyle={styles.sheetBackground}
      >
        <BottomSheetView style={styles.container}>
          {/* ── Header ── */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Attach media</Text>
              {selectedCount > 0 && (
                <Text style={styles.subtitle}>{selectedCount} {selectionLabel} selected</Text>
              )}
            </View>
            <TouchableOpacity onPress={dismiss} activeOpacity={0.8} style={styles.closeButton}>
              <X size={18} color={COLORS.textBase} strokeWidth={2.2} />
            </TouchableOpacity>
          </View>

          {/* ── Action row ── */}
          <View style={styles.actionRow}>
            <PickerAction
              label="Camera"
              icon={<Camera size={20} color={COLORS.textBase} strokeWidth={1.8} />}
              onPress={handleCamera}
            />
            <PickerAction
              label="Gallery"
              active={mode === 'gallery'}
              icon={<ImageIcon size={20} color={mode === 'gallery' ? COLORS.brand : COLORS.textBase} strokeWidth={1.8} />}
              onPress={() => selectMode('gallery')}
            />
            <PickerAction
              label="Videos"
              active={mode === 'videos'}
              icon={<Film size={20} color={mode === 'videos' ? COLORS.brand : COLORS.textBase} strokeWidth={1.8} />}
              onPress={() => selectMode('videos')}
            />
            <PickerAction
              label="Audio"
              active={mode === 'audio'}
              icon={<Music size={20} color={mode === 'audio' ? COLORS.brand : COLORS.textBase} strokeWidth={1.8} />}
              onPress={handleAudio}
            />
            <PickerAction
              label="Docs"
              icon={<FileText size={20} color={COLORS.textBase} strokeWidth={1.8} />}
              onPress={handleDocs}
            />
          </View>

          <View style={styles.divider} />

          {/* ── Content ── */}
          <View style={styles.contentArea}>
            {permissionIssue ? (
              <View style={styles.emptyState}>
                <PermissionRecoveryState
                  icon={ImageOff}
                  title={permissionCopy.title}
                  description={permissionCopy.description}
                  actionLabel={permissionRecoveryAction === 'settings' ? 'Open Settings' : 'Allow access'}
                  onAction={handlePermissionAction}
                  secondaryLabel="Dismiss"
                  onSecondary={dismiss}
                  tone="light"
                />
              </View>
            ) : (
              <BottomSheetFlatList
                data={assets}
                keyExtractor={keyExtractor}
                renderItem={renderAsset}
                extraData={selected}
                numColumns={4}
                style={styles.assetList}
                columnWrapperStyle={styles.gridRow}
                contentContainerStyle={styles.gridContent}
                onEndReached={loadMore}
                onEndReachedThreshold={0.6}
                enableFooterMarginAdjustment
                initialNumToRender={24}
                maxToRenderPerBatch={12}
                windowSize={5}
                removeClippedSubviews
                ListEmptyComponent={
                  loading ? null : mode === 'audio' && Platform.OS === 'ios' ? (
                    <View style={styles.emptyState}>
                      <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: `${COLORS.brand}12`, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                        <Music size={26} color={COLORS.brand} strokeWidth={1.8} />
                      </View>
                      <Text style={[styles.emptyText, { marginBottom: 14 }]}>Audio is stored in device Files</Text>
                      {onAudio && (
                        <TouchableOpacity
                          onPress={handleAudio}
                          activeOpacity={0.8}
                          style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999, backgroundColor: COLORS.brand }}
                        >
                          <Text style={{ fontFamily: FONTS.sansBold, fontSize: 13, color: COLORS.textInverse }}>Browse Audio Files</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyText}>No {mode === 'gallery' ? 'photos' : mode} found</Text>
                    </View>
                  )
                }
                ListFooterComponent={loading ? <ActivityIndicator color={COLORS.brand} style={styles.loader} /> : null}
              />
            )}
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

// ─── Asset tile ───────────────────────────────────────────────────────────────

const AssetTile = React.memo(function AssetTile({
  asset,
  isSelected,
  onToggle,
}: {
  asset: MediaLibrary.Asset;
  isSelected: boolean;
  onToggle: (asset: MediaLibrary.Asset) => void;
}) {
  const isVideo = asset.mediaType === MediaLibrary.MediaType.video;
  const isAudio = asset.mediaType === MediaLibrary.MediaType.audio;

  const handlePress = useCallback(() => {
    onToggle(asset);
  }, [asset, onToggle]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.88}
      style={styles.assetTile}
    >
      {isAudio ? (
        <View style={styles.audioTile}>
          <Music size={22} color={COLORS.textWeak} strokeWidth={1.8} />
          <Text style={styles.audioLabel} numberOfLines={1}>{asset.filename?.replace(/\.[^.]+$/, '') || 'Audio'}</Text>
        </View>
      ) : (
        <Image source={{ uri: asset.uri }} style={styles.assetImage} contentFit="cover" />
      )}
      {isVideo && (
        <View style={styles.playOverlay}>
          <Play size={14} color={COLORS.textInverse} fill={COLORS.textInverse} strokeWidth={0} />
        </View>
      )}
      {/* Selection indicator */}
      <View style={isSelected ? styles.selectedCheck : styles.unselectedDot}>
        {isSelected && <Check size={11} color={COLORS.textInverse} strokeWidth={3} />}
      </View>
      {/* Selection overlay tint */}
      {isSelected && <View style={styles.selectedOverlay} />}
    </TouchableOpacity>
  );
});

// ─── Picker action tile ───────────────────────────────────────────────────────

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
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      style={[styles.actionTile, active && styles.actionTileActive]}
    >
      {icon}
      <Text style={[styles.actionLabel, active && styles.actionLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.strokeStrong,
    opacity: 0.3,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    paddingHorizontal: SHEET_HORIZONTAL,
    paddingTop: 18,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: FONTS.serif,
    fontSize: 22,
    color: COLORS.textStrong,
  },
  subtitle: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    color: COLORS.textWeak,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.fillWeak,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.strokeWeaker,
  },

  // Action row
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: SHEET_HORIZONTAL,
    gap: 8,
  },
  actionTile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 14,
    backgroundColor: COLORS.fillWeaker,
    borderWidth: 1,
    borderColor: COLORS.strokeWeaker,
    gap: 5,
    minHeight: 64,
  },
  actionTileActive: {
    backgroundColor: `${COLORS.brand}08`,
    borderColor: `${COLORS.brand}30`,
  },
  actionLabel: {
    fontFamily: FONTS.sansMedium,
    fontSize: 10,
    color: COLORS.textWeak,
    textAlign: 'center',
  },
  actionLabelActive: {
    color: COLORS.brand,
    fontFamily: FONTS.sansSemi,
  },

  // Divider
  divider: {
    marginHorizontal: SHEET_HORIZONTAL,
    marginTop: 16,
    marginBottom: 12,
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.strokeWeaker,
  },

  // Grid
  contentArea: {
    flex: 1,
    minHeight: 0,
  },
  assetList: {
    flex: 1,
  },
  gridContent: {
    paddingHorizontal: SHEET_HORIZONTAL,
    paddingBottom: 16,
  },
  gridRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  assetTile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: COLORS.fillWeak,
  },
  assetImage: {
    width: '100%',
    height: '100%',
  },
  audioTile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.fillWeak,
    paddingHorizontal: 4,
    gap: 4,
  },
  audioLabel: {
    fontFamily: FONTS.sansMedium,
    fontSize: 9,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  playOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  selectedCheck: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 2,
  },
  unselectedDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: `${COLORS.brand}18`,
  },

  // Empty / loading
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontFamily: FONTS.sans,
    fontSize: 14,
    color: COLORS.textWeak,
  },
  loader: {
    paddingVertical: 24,
  },

  // Footer
  footerContainer: {
    backgroundColor: COLORS.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.strokeWeaker,
  },
  footerContent: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
    paddingHorizontal: SHEET_HORIZONTAL,
    backgroundColor: COLORS.background,
  },
  dismissButton: {
    flex: 1,
    height: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.fillWeak,
    borderWidth: 1,
    borderColor: COLORS.strokeWeak,
  },
  dismissText: {
    fontFamily: FONTS.sansSemi,
    fontSize: 15,
    color: COLORS.textBase,
  },
  addButton: {
    flex: 2,
    height: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.brand,
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  addButtonDisabled: {
    opacity: 0.45,
  },
  addText: {
    fontFamily: FONTS.sansBold,
    fontSize: 15,
    color: COLORS.textInverse,
  },
});
