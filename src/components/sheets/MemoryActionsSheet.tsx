/**
 * MemoryActionsSheet — story detail actions bottom sheet
 *
 * Two views:
 *  1. Actions list: Share now | Add/Remove bookmark | Who can see | Tags | Delete
 *  2. Delete confirmation: warning icon + heading + Go back / Yes, delete
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, Share,
  ScrollView, TextInput, ActivityIndicator,
} from 'react-native';
import X from 'lucide-react-native/icons/x';
import Share2 from 'lucide-react-native/icons/share-2';
import Bookmark from 'lucide-react-native/icons/bookmark';
import BookmarkCheck from 'lucide-react-native/icons/bookmark-check';
import Users from 'lucide-react-native/icons/users';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import Trash2 from 'lucide-react-native/icons/trash';
import AlertTriangle from 'lucide-react-native/icons/triangle-alert';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import {
  useDeleteMemory, useBookmarkMemory, useUpdateMemory,
} from '@/hooks/mutations/use-memory-mutations';
import { IMemory } from '@/types';

import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { toast } from '@/components/ui/Toast';
import { publishedPostUrl } from '@/lib/env';
import { PublishPrivacySheet, type PrivacyMode } from './PublishPrivacySheet';
import {
  buildMemoryAudiencePayload,
  deriveMemoryAudience,
  formatMemoryAudienceLabel,
  type MemoryAudienceSelection,
} from '@/features/memories/memory-audience';

interface Props {
  memory: IMemory;
  onClose?: () => void;
}

const MemoTagPill = React.memo(function MemoTagPill({
  tag,
  onRemove,
}: {
  tag: string;
  onRemove: (tag: string) => void;
}) {
  const handleRemove = useCallback(() => onRemove(tag), [tag, onRemove]);
  return (
    <View style={s.tagPill}>
      <Text style={s.tagPillText}>{tag}</Text>
      <TouchableOpacity onPress={handleRemove} hitSlop={14} style={{ marginLeft: 4 }}>
        <X size={11} color={COLORS.textBase} strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  );
});

export function MemoryActionsSheet({ memory, onClose }: Props) {

  const { mutate: deleteMemory, isPending: isDeleting } = useDeleteMemory();
  const { mutate: toggleBookmark, isPending: isBookmarking } = useBookmarkMemory();
  const { mutate: updateMemory } = useUpdateMemory(memory._id);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const originalAudience = useMemo(() => deriveMemoryAudience(memory), [memory]);
  const [audience, setAudience] = useState<MemoryAudienceSelection>(() => deriveMemoryAudience(memory));
  const privacySheetRef = React.useRef<BottomSheetModal>(null);
  const [tags, setTags] = useState<string[]>(memory.tags ?? []);
  const [tagInput, setTagInput] = useState('');

  const visibilityLabel = useMemo(() => formatMemoryAudienceLabel(audience), [audience]);

  const handleClose = useCallback(() => {
    const hasTagChange =
      JSON.stringify(tags.slice().sort()) !==
      JSON.stringify((memory.tags ?? []).slice().sort());
    const hasVisibilityChange =
      JSON.stringify(buildMemoryAudiencePayload(audience)) !==
      JSON.stringify(buildMemoryAudiencePayload(originalAudience));

    if (hasTagChange || hasVisibilityChange) {
      updateMemory(
        {
          tags,
          ...(hasVisibilityChange ? buildMemoryAudiencePayload(audience) : {}),
        },
        {
          onSuccess: () => toast('Story updated', 'success'),
          onError: () => toast('Could not save changes', 'error'),
        }
      );
    }
    Haptics.selectionAsync();
    onClose?.();
  }, [tags, audience, originalAudience, memory.tags, updateMemory, onClose]);

  const handleShare = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `${memory.title || 'Check out my story'}\n\n${publishedPostUrl(memory._id)}`,
      });
    } catch {}
    onClose?.();
  }, [memory, onClose]);

  const handleBookmark = useCallback(() => {
    Haptics.selectionAsync();
    toggleBookmark({ id: memory._id, bookmarked: !!memory.bookmarked });
    onClose?.();
  }, [memory, toggleBookmark, onClose]);

  const handleConfirmDelete = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    deleteMemory(memory._id, {
      onSuccess: () => {
        toast('Story deleted.', 'success');
        onClose?.();
      },
      onError: () => {
        toast('Could not delete story', 'error');
      },
    });
  }, [memory, deleteMemory, onClose]);

  const toggleBeneficiary = useCallback((id: string) => {
    setAudience((current) => ({
      ...current,
      beneficiaryIds: current.beneficiaryIds.includes(id)
        ? current.beneficiaryIds.filter((value) => value !== id)
        : [...current.beneficiaryIds, id],
    }));
  }, []);

  const toggleGroup = useCallback((id: string) => {
    setAudience((current) => ({
      ...current,
      groupIds: current.groupIds.includes(id)
        ? current.groupIds.filter((value) => value !== id)
        : [...current.groupIds, id],
    }));
  }, []);

  const addTag = useCallback(() => {
    const parts = tagInput.split(/[\s,]+/).map(p => p.trim().toLowerCase()).filter(Boolean);
    if (parts.length > 0) {
      setTags(prev => {
        const next = [...prev];
        for (const p of parts) {
          if (!next.includes(p)) next.push(p);
        }
        return next;
      });
    }
    setTagInput('');
  }, [tagInput]);

  const handleTagInputChange = useCallback((text: string) => {
    if (text.includes(' ') || text.includes(',')) {
      const parts = text.split(/[\s,]+/).map(p => p.trim().toLowerCase()).filter(Boolean);
      if (parts.length > 0) {
        setTags(prev => {
          const next = [...prev];
          for (const p of parts) {
            if (!next.includes(p)) next.push(p);
          }
          return next;
        });
      }
      setTagInput('');
    } else {
      setTagInput(text);
    }
  }, []);

  const removeTag = useCallback((tag: string) => {
    Haptics.selectionAsync();
    setTags(prev => prev.filter(t => t !== tag));
  }, []);

  const handleGoBack = useCallback(() => {
    Haptics.selectionAsync();
    setShowDeleteConfirm(false);
  }, []);

  const handleToggleVisibility = useCallback(() => {
    Haptics.selectionAsync();
    privacySheetRef.current?.present();
  }, []);

  // ── Delete confirmation view ────────────────────────────────────────────────

  if (showDeleteConfirm) {
    return (
      <View style={{ alignItems: 'center', paddingTop: 16, paddingBottom: 24, paddingHorizontal: 4 }}>
        {/* Warning icon */}
        <View style={{ marginBottom: 24, marginTop: 8 }}>
          <AlertTriangle size={96} color={COLORS.warning} fill={COLORS.warning} strokeWidth={0} />
        </View>

        {/* Heading */}
        <Text style={{
          ...TYPE.sectionTitle, color: COLORS.textStrong,
          textAlign: 'center', lineHeight: 30, marginBottom: 10, paddingHorizontal: 16,
        }}>
          Delete this story?
        </Text>

        {/* Subtext */}
        <Text style={{
          ...TYPE.body, color: COLORS.textWeak,
          textAlign: 'center', marginBottom: 40,
        }}>
          This action can’t be undone.
        </Text>

        {/* Buttons */}
        <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
          <TouchableOpacity
            onPress={handleGoBack}
            activeOpacity={0.8}
            style={{
              flex: 1, height: 56, borderRadius: 999,
              backgroundColor: COLORS.fillWeak,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ ...TYPE.button, color: COLORS.textStrong }}>
              Go back
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleConfirmDelete}
            disabled={isDeleting}
            activeOpacity={0.85}
            style={{
              flex: 1, height: 56, borderRadius: 999,
              backgroundColor: COLORS.error,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            {isDeleting
              ? <ActivityIndicator color={COLORS.textInverse} />
              : <Text style={{ ...TYPE.button, color: COLORS.textInverse }}>Yes, delete</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Actions list ────────────────────────────────────────────────────────────

  return (
    <>
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Actions</Text>
        <TouchableOpacity onPress={handleClose} style={s.closeBtn} activeOpacity={0.7}>
          <X size={16} color={COLORS.textBase} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Share now */}
      <TouchableOpacity onPress={handleShare} style={s.actionRow} activeOpacity={0.8}>
        <Share2 size={20} color={COLORS.textBase} strokeWidth={1.8} />
        <Text style={s.actionLabel}>Share now</Text>
      </TouchableOpacity>

      {/* Bookmark */}
      <TouchableOpacity onPress={handleBookmark} disabled={isBookmarking} style={s.actionRow} activeOpacity={0.8}>
        {memory.bookmarked
          ? <BookmarkCheck size={20} color={COLORS.textBase} strokeWidth={1.8} />
          : <Bookmark size={20} color={COLORS.textBase} strokeWidth={1.8} />
        }
        <Text style={s.actionLabel}>{memory.bookmarked ? 'Remove bookmark' : 'Add bookmark'}</Text>
      </TouchableOpacity>

      {/* Who can see? */}
      <View style={s.visibilityCard}>
        <Text style={s.visibilityTitle}>Who can see this story?</Text>
        <Text style={s.visibilitySubtitle}>This story stays private unless you choose otherwise.</Text>
        <TouchableOpacity
          onPress={handleToggleVisibility}
          style={s.visibilityTrigger} activeOpacity={0.8}
        >
          <Users size={16} color={COLORS.textBase} strokeWidth={1.8} />
          <Text style={s.visibilityLabel}>{visibilityLabel}</Text>
          <ChevronDown size={16} color={COLORS.textMuted} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Tags */}
      <View style={s.tagsSection}>
        <Text style={s.tagsLabel}>Tags</Text>
        <View style={s.tagsArea}>
          <View style={s.tagPillsRow}>
            {tags.map(tag => (
              <MemoTagPill key={tag} tag={tag} onRemove={removeTag} />
            ))}
          </View>
          <TextInput
            value={tagInput}
            onChangeText={handleTagInputChange}
            onSubmitEditing={addTag}
            onBlur={addTag}
            placeholder="Add a tag…"
            placeholderTextColor={COLORS.textMuted}
            returnKeyType="done"
            style={s.tagInput}
            blurOnSubmit={false}
          />
        </View>
      </View>

      {/* Delete — opens inline confirmation */}
      <TouchableOpacity
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowDeleteConfirm(true); }}
        style={s.deleteBtn} activeOpacity={0.8}
      >
        <Text style={s.deleteBtnText}>Delete story</Text>
      </TouchableOpacity>
    </ScrollView>
    <PublishPrivacySheet
      ref={privacySheetRef}
      mode={audience.mode === 'everyone' ? 'all' : audience.mode}
      selectedBeneficiaryIds={audience.beneficiaryIds}
      selectedGroupIds={audience.groupIds}
      onModeChange={(mode: PrivacyMode) => setAudience((current) => ({ ...current, mode: mode === 'all' ? 'everyone' : mode }))}
      onToggleBeneficiary={toggleBeneficiary}
      onToggleGroup={toggleGroup}
      onApply={(mode, beneficiaryIds, groupIds) => {
        setAudience({ mode: mode === 'all' ? 'everyone' : mode, beneficiaryIds, groupIds });
        privacySheetRef.current?.dismiss();
      }}
      onClose={() => privacySheetRef.current?.dismiss()}
    />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  header: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 20, paddingHorizontal: 2,
  },
  headerTitle: { ...TYPE.sectionTitle, color: COLORS.textStrong },
  closeBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.fillWeak,
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  actionRow: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 14,
    padding: 16, backgroundColor: COLORS.card, borderRadius: 16,
    marginBottom: 10,
  },
  actionLabel: { ...TYPE.body, color: COLORS.textStrong },
  visibilityCard: {
    backgroundColor: COLORS.fillWeak, borderRadius: 16, padding: 16, marginBottom: 16, gap: 12,
  },
  visibilityTitle: { ...TYPE.body, color: COLORS.textStrong },
  visibilitySubtitle: {
    ...TYPE.bodySmall, color: COLORS.textBase, marginTop: -8,
  },
  visibilityTrigger: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10,
    backgroundColor: COLORS.card, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
  },
  visibilityLabel: { flex: 1, ...TYPE.label, color: COLORS.textStrong },
  tagsSection: { marginBottom: 24, gap: 8 },
  tagsLabel: { ...TYPE.body, color: COLORS.textStrong, paddingHorizontal: 2 },
  tagsArea: {
    backgroundColor: COLORS.card, borderRadius: 16,
    padding: 12, minHeight: 72, gap: 8,
  },
  tagPillsRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 6 },
  tagPill: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
    backgroundColor: COLORS.fillWeak,
  },
  tagPillText: { ...TYPE.bodySmall, color: COLORS.textStrong },
  tagInput: {
    ...TYPE.label, color: COLORS.textStrong, padding: 0, minHeight: 20,
  },
  deleteBtn: {
    height: 56, borderRadius: 999,
    backgroundColor: `${COLORS.error}10`,
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  deleteBtnText: { ...TYPE.button, color: COLORS.error },
};
