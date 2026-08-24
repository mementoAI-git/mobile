/**
 * DraftsSheet — shows all saved story drafts (max 10).
 *
 * Props (via sheetProps):
 *   email       — user email, used to build the storage key
 *   onLoadDraft — callback(draft) called when user taps a draft row
 *
 * The sheet reads/writes `article_drafts_${email}` in AsyncStorage directly
 * so it stays in sync with the autosave logic in editor.tsx.
 */

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { X, FileText } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useUiStore, useOfflineQueueStore } from '@/store';
import { COLORS, FONTS } from '@/constants/tokens';
import dayjs from 'dayjs';
import NetInfo from '@react-native-community/netinfo';
import { get, post, put, del } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import type { IPagination, IMemory } from '@/types';
import { logger } from '@/lib/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StoryDraftAttachment {
  fileId: string;
  uri: string;
  name: string;
  mimeType: string;
  isVoice?: boolean;
  duration?: number;
}

export interface StoryDraft {
  id: string;
  title: string;
  body: string;
  updatedAt: number;
  /** Already-uploaded attachment references — restored when the draft is loaded */
  attachments?: StoryDraftAttachment[];
}

export const STORY_DRAFTS_KEY = (email?: string | null) =>
  `article_drafts_${email ?? 'anon'}`;

export const MAX_DRAFTS = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

export async function loadDrafts(email?: string | null): Promise<StoryDraft[]> {
  let localDrafts: StoryDraft[] = [];
  try {
    const raw = await AsyncStorage.getItem(STORY_DRAFTS_KEY(email));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) localDrafts = parsed as StoryDraft[];
    }
  } catch {}

  const netState = await NetInfo.fetch();
  if (netState.isConnected && email) {
    try {
      const res = await get<IPagination<IMemory>>(`${endpoint.stories}?status=draft&limit=20`);
      const cloudMemories = res.data?.docs || [];
      const cloudDrafts: StoryDraft[] = cloudMemories.map((m) => ({
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

      const mergedMap = new Map<string, StoryDraft>();
      cloudDrafts.forEach((d) => mergedMap.set(d.id, d));
      localDrafts.forEach((d) => {
        const existing = mergedMap.get(d.id);
        if (!existing || d.updatedAt > existing.updatedAt) {
          mergedMap.set(d.id, d);
        }
      });

      const merged = Array.from(mergedMap.values());
      merged.sort((a, b) => b.updatedAt - a.updatedAt);
      const sliced = merged.slice(0, MAX_DRAFTS);
      await AsyncStorage.setItem(STORY_DRAFTS_KEY(email), JSON.stringify(sliced));
      return sliced;
    } catch (err) {
      logger.error('Failed to sync cloud drafts:', err);
    }
  }

  return localDrafts;
}

export async function saveDrafts(
  email: string | null | undefined,
  drafts: StoryDraft[],
): Promise<void> {
  try {
    await AsyncStorage.setItem(STORY_DRAFTS_KEY(email), JSON.stringify(drafts));
  } catch {}
}

/** Upsert a draft into the stored array. Evicts oldest when at MAX_DRAFTS. */
export async function upsertDraft(
  email: string | null | undefined,
  draft: StoryDraft,
): Promise<void> {
  const drafts = await loadDrafts(email);
  
  const netState = await NetInfo.fetch();
  if (netState.isConnected && email) {
    try {
      const payload = {
        title: draft.title,
        body: draft.body,
        status: 'draft',
        attachments: draft.attachments?.map((a) => a.fileId) || [],
      };

      if (draft.id.startsWith('draft_')) {
        const res = await post<IMemory>(endpoint.memories, payload);
        const created = res.data;
        if (created?._id) {
          draft.id = created._id;
        }
      } else {
        await put<IMemory>(endpoint.memory.replace(':id', draft.id), payload);
      }
    } catch (err) {
      logger.error('Failed to save cloud draft:', err);
    }
  } else if (!netState.isConnected) {
    const queueStore = useOfflineQueueStore.getState();
    const payload = {
      title: draft.title,
      body: draft.body,
      status: 'draft',
      attachments: draft.attachments?.map((a) => a.fileId) || [],
    };
    if (draft.id.startsWith('draft_')) {
      await queueStore.enqueueMutation('create_memory', payload);
    } else {
      await queueStore.enqueueMutation('update_memory', { id: draft.id, ...payload });
    }
  }

  const idx = drafts.findIndex((d) => d.id === draft.id);
  if (idx >= 0) {
    drafts[idx] = draft;
  } else {
    if (drafts.length >= MAX_DRAFTS) {
      drafts.sort((a, b) => a.updatedAt - b.updatedAt);
      drafts.shift();
    }
    drafts.push(draft);
  }
  await saveDrafts(email, drafts);
}

/** Remove a draft by id from the stored array. */
export async function deleteDraft(
  email: string | null | undefined,
  id: string,
): Promise<StoryDraft[]> {
  const drafts = await loadDrafts(email);
  const updated = drafts.filter((d) => d.id !== id);
  await saveDrafts(email, updated);

  if (!id.startsWith('draft_')) {
    const netState = await NetInfo.fetch();
    if (netState.isConnected && email) {
      try {
        await del(endpoint.memory.replace(':id', id));
      } catch (err) {
        logger.error('Failed to delete cloud draft:', err);
      }
    }
  }
  return updated;
}

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

  // Seed from AsyncStorage on first open (editor may not have loaded yet)
  useEffect(() => {
    if (storeDrafts.length === 0) {
      loadDrafts(email).then((d) => {
        if (isMountedRef.current) setStoryDrafts(d);
      });
    }
  }, [email]); // eslint-disable-line react-hooks/exhaustive-deps

  const isMountedRef = useRef(true);
  useEffect(() => () => { isMountedRef.current = false; }, []);

  const handleLoad = useCallback(
    (draft: StoryDraft) => {
      Haptics.selectionAsync();
      onLoadDraft(draft);
      closeSheet();
    },
    [onLoadDraft, closeSheet],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const updated = await deleteDraft(email, id);
      setStoryDrafts(updated);
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
        <Text style={{ fontFamily: FONTS.serif, fontSize: 22, color: COLORS.textStrong }}>
          My Drafts
        </Text>
        <Text
          style={{
            fontFamily: FONTS.sansMedium,
            fontSize: 13,
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
              fontFamily: FONTS.serif,
              fontSize: 18,
              color: COLORS.textStrong,
              textAlign: 'center',
            }}
          >
            No drafts yet
          </Text>
          <Text
            style={{
              fontFamily: FONTS.sans,
              fontSize: 14,
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
                  fontFamily: FONTS.sansMedium,
                  fontSize: 15,
                  color: COLORS.textStrong,
                }}
                numberOfLines={1}
              >
                {draft.title?.trim() || 'Untitled'}
              </Text>
              {bodyPreview.length > 0 && (
                <Text
                  style={{
                    fontFamily: FONTS.sans,
                    fontSize: 13,
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
                  fontFamily: FONTS.sans,
                  fontSize: 11,
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
