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
import { View, Text, TouchableOpacity } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { X, FileText } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useUiStore } from '@/store';

import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
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
  log: (message, error) => logger.error(message, error),
});

/** Syncs with the server and returns the drafts to show. Offline, the device copy. */
export const loadDrafts = (email?: string | null) => draftStore.sync(email);

/** Drafts on this device, newest first, without touching the network. */
export const readLocalDrafts = (email?: string | null) => draftStore.readLocalDrafts(email);

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

export function DraftsSheet() {
  const sheetProps = useUiStore((s) => s.sheetProps);
  const closeSheet = useUiStore((s) => s.closeSheet);

  const email: string | null = sheetProps.email ?? null;
  const onLoadDraft: (draft: StoryDraft) => void = sheetProps.onLoadDraft ?? (() => {});

  // Read from unified store — shared with editor.tsx badge
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
    loadDrafts(email)
      .then((d) => {
        if (isMountedRef.current) setStoryDrafts(d);
      })
      .catch(() => undefined);
  }, [email, setStoryDrafts]);

  const handleLoad = useCallback(
    (draft: StoryDraft) => {
      Haptics.selectionAsync();
      onLoadDraft(draft);
      closeSheet();
    },
    [onLoadDraft, closeSheet],
  );

  // The row goes at once. The server delete runs in the background and is
  // retried on a later sync if it can't reach the server now.
  const handleDelete = useCallback(
    (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setStoryDrafts(useUiStore.getState().storyDrafts.filter((d) => d.id !== id));
      void deleteDraft(email, id).catch(() => undefined);
    },
    [email, setStoryDrafts],
  );

  // Strip HTML tags for the body preview
  const stripHtml = (html: string) =>
    html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();

  return (
    <BottomSheetScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* ── Header ── */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 16,
        }}
      >
        <Text style={{ ...TYPE.sectionTitle, color: COLORS.textStrong }}>
          My Drafts
        </Text>
        <Text
          style={{
            ...TYPE.bodySmall,
            color: COLORS.textMuted,
          }}
        >
          {drafts.length} / {MAX_DRAFTS}
        </Text>
      </View>

      {/* ── Empty state ── */}
      {drafts.length === 0 && (
        <View
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 60,
            paddingHorizontal: 32,
            gap: 12,
          }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: COLORS.fillWeak,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileText size={28} color={COLORS.textMuted} strokeWidth={1.5} />
          </View>
          <Text
            style={{
              ...TYPE.cardTitle,
              color: COLORS.textStrong,
              textAlign: 'center',
            }}
          >
            No drafts yet
          </Text>
          <Text
            style={{
              ...TYPE.label,
              color: COLORS.textBase,
              textAlign: 'center',
              lineHeight: 22,
            }}
          >
            Stories you start writing are automatically saved here so you can come back to them.
          </Text>
        </View>
      )}

      {/* ── Draft list ── */}
      {drafts.map((draft, index) => {
        const bodyPreview = stripHtml(draft.body);
        const dateLabel = dayjs(draft.updatedAt).format('MMM D · h:mm A');

        return (
          <TouchableOpacity
            key={draft.id}
            onPress={() => handleLoad(draft)}
            activeOpacity={0.8}
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              paddingHorizontal: 20,
              paddingVertical: 14,
              borderTopWidth: index === 0 ? 1 : 0,
              borderBottomWidth: 1,
              borderColor: COLORS.strokeWeaker,
              gap: 12,
            }}
          >
            {/* Content */}
            <View style={{ flex: 1, gap: 4 }}>
              <Text
                style={{
                  ...TYPE.body,
                  color: COLORS.textStrong,
                }}
                numberOfLines={1}
              >
                {draft.title?.trim() || 'Untitled'}
              </Text>
              {bodyPreview.length > 0 && (
                <Text
                  style={{
                    ...TYPE.bodySmall,
                    color: COLORS.textBase,
                    lineHeight: 19,
                  }}
                  numberOfLines={2}
                >
                  {bodyPreview}
                </Text>
              )}
              <Text
                style={{
                  ...TYPE.metadata,
                  color: COLORS.textMuted,
                  marginTop: 2,
                }}
              >
                {dateLabel}
              </Text>
            </View>

            {/* Delete button */}
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                handleDelete(draft.id);
              }}
              hitSlop={8}
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: COLORS.fillWeak,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 2,
              }}
              activeOpacity={0.7}
            >
              <X size={14} color={COLORS.textMuted} strokeWidth={2} />
            </TouchableOpacity>
          </TouchableOpacity>
        );
      })}
    </BottomSheetScrollView>
  );
}
