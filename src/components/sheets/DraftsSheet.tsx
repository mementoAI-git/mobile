import { useThemeColors } from '@/hooks/use-theme-colors';
/**
 * DraftsSheet — shows all saved story drafts (max 10).
 *
 * Props (via sheetProps):
 *   email       — user email, used to build the storage key
 *   onLoadDraft — callback(draft) called when user taps a draft row
 *
 * Drafts live on the device and on the server. All reads and writes go
 * through the draft store in src/features/drafts/story-drafts.ts, shared with
 * the editor's autosave, which keeps the two in step.
 */

import React, { useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Image } from 'expo-image';
import { useFonts } from 'expo-font';
import { getQuestionIdenticonUrl } from '@/features/explore/question-presentation';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import X from 'lucide-react-native/icons/x';
import * as Haptics from 'expo-haptics';
import { useUiStore } from '@/store';

import { FONTS } from '@/constants/tokens';
import { TYPE, getDraftTypography } from '@/constants/typography';
import dayjs from 'dayjs';
import NetInfo from '@react-native-community/netinfo';
import { get, post, put, del } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import type { IPagination, IMemory } from '@/types';
import { logger } from '@/lib/logger';
import {
  createDraftStore,
  MAX_DRAFTS,
  STORY_DRAFTS_KEY,
  type StoryDraft,
  type StoryDraftAttachment,
} from '@/features/drafts/story-drafts';

export { MAX_DRAFTS, STORY_DRAFTS_KEY };
export type { StoryDraft, StoryDraftAttachment };

// ─── Draft store wired to the device and the API ─────────────────────────────

function isNotFound(error: unknown): boolean {
  const status =
    (error as { status?: number })?.status ??
    (error as { response?: { status?: number } })?.response?.status;
  return status === 404;
}

const draftStore = createDraftStore({
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  isOnline: async () => !!(await NetInfo.fetch()).isConnected,
  listCloudDrafts: async () => {
    const res = await get<IPagination<IMemory>>(`${endpoint.stories}?status=draft&limit=20`);
    return (res.data?.docs || []).map((m) => ({
      id: m._id,
      title: m.title || '',
      body: m.body || '',
      updatedAt: m.updated_at ? new Date(m.updated_at).getTime() : Date.now(),
      attachments: (m.attachments || []).map((att: any) => ({
        fileId: att._id || att.id,
        uri: att.url,
        name: att.name || 'Attachment',
        mimeType: att.type || 'image/jpeg',
      })),
    }));
  },
  createCloudDraft: async (payload) => {
    const res = await post<IMemory>(endpoint.memories, payload);
    return res.data?._id;
  },
  updateCloudDraft: async (id, payload) => {
    await put<IMemory>(endpoint.memory.replace(':id', id), payload);
  },
  deleteCloudDraft: async (id) => {
    try {
      await del(endpoint.memory.replace(':id', id));
    } catch (error) {
      // Already gone on the server: the delete has done its job.
      if (!isNotFound(error)) throw error;
    }
  },
  log: (message, error) => logger.handledError(message, error),
});

/** Syncs with the server and returns the drafts to show. Offline, the device copy. */
export const loadDrafts = (email?: string | null) => draftStore.sync(email);

/** Drafts on this device, newest first, without touching the network. */
export const readLocalDrafts = (email?: string | null) => draftStore.readLocalDrafts(email);

/** Durable device checkpoint; never waits for network or a cloud-sync queue. */
export const saveLocalDraft = (email: string | null | undefined, draft: StoryDraft) =>
  draftStore.checkpoint(email, draft);

/** Saves one draft and returns its id, the server id once uploaded. */
export const upsertDraft = (email: string | null | undefined, draft: StoryDraft) =>
  draftStore.upsert(email, draft);

/** Removes a draft from the device now and from the server now or on a later sync. */
export const deleteDraft = (
  email: string | null | undefined,
  id: string,
  options?: { skipRemote?: boolean },
) => draftStore.remove(email, id, options);

// ─── Component ────────────────────────────────────────────────────────────────

export function DraftsSheet({ onClose }: { onClose?: () => void } = {}) {
  const COLORS = useThemeColors();
  const [fontsLoaded] = useFonts({ DraftsDMSans: require('../../../assets/images/drafts/dm-sans.ttf') });
  const draftFont = fontsLoaded ? 'DraftsDMSans' : FONTS.sans;
  const draftType = getDraftTypography(draftFont);
  const mutationVersion = useRef(0);
  const sheetProps = useUiStore((s) => s.sheetProps);
  const closeSheet = useUiStore((s) => s.closeSheet);

  const email: string | null = sheetProps.email ?? null;
  const onLoadDraft: (draft: StoryDraft) => void = sheetProps.onLoadDraft ?? (() => {});

  const dismiss = onClose ?? closeSheet;

  // Read from the unified store shared with the editor
  const storeDrafts = useUiStore((s) => s.storyDrafts);
  const setStoryDrafts = useUiStore((s) => s.setStoryDrafts);

  // Sorted newest-first for display
  const drafts = useMemo(
    () => [...storeDrafts].sort((a, b) => b.updatedAt - a.updatedAt),
    [storeDrafts],
  );

  const isMountedRef = useRef(true);
  useEffect(() => () => { isMountedRef.current = false; }, []);

  // Show what we have at once, then sync with the server on every open, so
  // the list and count match drafts saved, published or deleted elsewhere.
  useEffect(() => {
    const version = mutationVersion.current;
    loadDrafts(email)
      .then((d) => {
        if (isMountedRef.current && version === mutationVersion.current) setStoryDrafts(d);
      })
      .catch(() => undefined);
  }, [email, setStoryDrafts]);

  const handleLoad = useCallback(
    (draft: StoryDraft) => {
      Haptics.selectionAsync();
      onLoadDraft(draft);
      dismiss();
    },
    [onLoadDraft, dismiss],
  );

  // The row goes at once. The server delete runs in the background and is
  // retried on a later sync if it can't reach the server now.
  const handleDelete = useCallback(
    (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      mutationVersion.current += 1;
      setStoryDrafts(useUiStore.getState().storyDrafts.filter((d) => d.id !== id));
      void deleteDraft(email, id).catch(() => undefined);
    },
    [email, setStoryDrafts],
  );

  const handleClearAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    mutationVersion.current += 1;
    const ids = useUiStore.getState().storyDrafts.map((draft) => draft.id);
    setStoryDrafts([]);
    // The shared draft store serializes deletes and retries them when offline.
    for (const id of ids) void deleteDraft(email, id).catch(() => undefined);
  }, [email, setStoryDrafts]);

  const handleClose = useCallback(() => {
    Haptics.selectionAsync();
    dismiss();
  }, [dismiss]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingBottom: 10 }}>
        <Text style={{ ...TYPE.sheetTitle, color: COLORS.textStrong, flex: 1 }}>Drafts</Text>
        <Button variant="ghost" iconOnly onPress={handleClose} accessibilityLabel="Close drafts" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.fillWeaker }}>
          <X size={18} color={COLORS.textBase} />
        </Button>
      </View>
      <View style={{ height: 1, backgroundColor: COLORS.strokeWeak }}>
        <Image source={require('../../../assets/images/drafts/divider.svg')} contentFit="fill" tintColor={COLORS.textStrong} style={{ width: '100%', height: 1 }} />
      </View>
      {drafts.length > 0 && (
        <View style={{ alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
          <Button
            variant="ghost"
            onPress={handleClearAll}
            accessibilityLabel="Clear all drafts"
            style={{ minHeight: 44, paddingHorizontal: 12, gap: 4, borderRadius: 22, backgroundColor: `${COLORS.error}14`, borderWidth: 1, borderColor: `${COLORS.error}30` }}
            rightIcon={<Image source={require('../../../assets/images/drafts/clear-all.svg')} style={{ width: 16, height: 16 }} tintColor={COLORS.error} />}
          >
            <Text style={{ ...draftType.action, color: COLORS.error }}>Clear all</Text>
          </Button>
        </View>
      )}
      <BottomSheetScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 10, paddingBottom: 24, gap: 10 }}
      >
        {drafts.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 8 }}>
            <Text style={{ ...draftType.emptyTitle, color: COLORS.textStrong }}>Draft is empty</Text>
            <Text style={{ ...draftType.emptyDescription, color: COLORS.textBase, textAlign: 'center' }}>Your saved drafts will appear here.</Text>
          </View>
        )}
        {drafts.map((draft) => (
          <DraftRow key={draft.id} draft={draft} font={draftFont} onLoad={handleLoad} onDelete={handleDelete} />
        ))}
      </BottomSheetScrollView>
    </View>
  );
}

const DraftRow = React.memo(function DraftRow({ draft, font, onLoad, onDelete }: {
  draft: StoryDraft;
  font: string;
  onLoad: (draft: StoryDraft) => void;
  onDelete: (id: string) => void;
}) {
  const colors = useThemeColors();
  const draftType = getDraftTypography(font);
  const handleLoad = useCallback(() => onLoad(draft), [onLoad, draft]);
  const handleDelete = useCallback(() => onDelete(draft.id), [onDelete, draft.id]);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 4, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.strokeWeak }}>
      <Button variant="ghost" iconOnly onPress={handleLoad} accessibilityLabel={`Open draft: ${draft.title.trim() || 'Untitled draft'}`} style={{ flex: 1, justifyContent: 'flex-start', paddingHorizontal: 0, gap: 12, minHeight: 44 }}>
        <Image source={{ uri: getQuestionIdenticonUrl(draft.id, 'png') }} style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, backgroundColor: colors.fillWeak }} contentFit="cover" />
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Text numberOfLines={1} style={{ ...draftType.action, color: colors.textStrong }}>{draft.title.trim() || 'Untitled draft'}</Text>
          <Text numberOfLines={1} style={{ ...draftType.date, color: colors.textBase }}>{dayjs(draft.updatedAt).format('M/D/YYYY, h:mm A')}</Text>
        </View>
      </Button>
      <Button variant="ghost" onPress={handleDelete} accessibilityLabel={`Delete draft: ${draft.title.trim() || 'Untitled draft'}`} style={{ minHeight: 44, paddingHorizontal: 0 }}>
        <Text style={{ ...draftType.action, color: colors.textStrong }}>Delete</Text>
      </Button>
    </View>
  );
});
