/**
 * MemoryActionsSheet — story detail actions bottom sheet
 *
 * Layout matches design spec:
 *  Header:  "Actions" + X close
 *  Row 1:   Share now
 *  Row 2:   Add / Remove bookmark
 *  Card:    Who can see this story? + beneficiary dropdown
 *  Section: Tags (editable pills)
 *  Footer:  Delete story (destructive rounded-full button)
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, Share,
  ScrollView, TextInput, Alert,
} from 'react-native';
import {
  X, Share2, Bookmark, BookmarkCheck,
  Users, ChevronDown, ChevronUp, Trash2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import {
  useDeleteMemory, useBookmarkMemory,
} from '@/hooks/mutations/use-memory-mutations';
import { useUpdateMemory } from '@/hooks/mutations/use-memory-mutations';
import { useBeneficiaries } from '@/hooks/queries/use-beneficiaries';
import { IMemory, IBeneficiary } from '@/types';
import { COLORS, FONTS } from '@/constants/tokens';
import { toast } from '@/components/ui/Toast';

interface Props {
  memory: IMemory;
  onClose?: () => void;
}

const PUBLISHED_BASE = 'https://app.mymemento.io/post';

export function MemoryActionsSheet({ memory, onClose }: Props) {
  const { mutate: deleteMemory, isPending: isDeleting } = useDeleteMemory();
  const { mutate: toggleBookmark, isPending: isBookmarking } = useBookmarkMemory();
  const { mutate: updateMemory } = useUpdateMemory(memory._id);
  const { data: beneficiariesRaw } = useBeneficiaries();

  const beneficiaries: IBeneficiary[] = useMemo(() => {
    if (!beneficiariesRaw) return [];
    if (Array.isArray(beneficiariesRaw)) return beneficiariesRaw;
    if ((beneficiariesRaw as any)?.docs) return (beneficiariesRaw as any).docs;
    return [];
  }, [beneficiariesRaw]);

  // Local state
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const [selectedBeneficiaryIds, setSelectedBeneficiaryIds] = useState<string[]>(
    (memory.beneficiaries ?? []).map((b: any) => (typeof b === 'string' ? b : b._id)).filter(Boolean)
  );
  const [tags, setTags] = useState<string[]>(memory.tags ?? []);
  const [tagInput, setTagInput] = useState('');

  const visibilityLabel = useMemo(() => {
    if (!selectedBeneficiaryIds.length) return 'Everyone';
    const names = beneficiaries
      .filter(b => b._id && selectedBeneficiaryIds.includes(b._id))
      .map(b => b.name)
      .filter(Boolean);
    return names.length === 1 ? names[0] : `${names.length} people`;
  }, [selectedBeneficiaryIds, beneficiaries]);

  // Persist changes when closing
  const handleClose = useCallback(() => {
    const hasTagChange = JSON.stringify(tags.slice().sort()) !== JSON.stringify((memory.tags ?? []).slice().sort());
    const hasVisibilityChange = JSON.stringify(selectedBeneficiaryIds.slice().sort()) !==
      JSON.stringify(((memory.beneficiaries ?? []).map((b: any) => (typeof b === 'string' ? b : b._id)).filter(Boolean)).slice().sort());

    if (hasTagChange || hasVisibilityChange) {
      updateMemory(
        { tags, beneficiaries: selectedBeneficiaryIds },
        {
          onSuccess: () => toast('Story updated', 'success'),
          onError: () => toast('Could not save changes', 'error'),
        }
      );
    }
    onClose?.();
  }, [tags, selectedBeneficiaryIds, memory, updateMemory, onClose]);

  const handleShare = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `${memory.title || 'Check out my story'}\n\n${PUBLISHED_BASE}/${memory._id}`,
      });
    } catch {}
    onClose?.();
  }, [memory, onClose]);

  const handleBookmark = useCallback(() => {
    Haptics.selectionAsync();
    toggleBookmark({ id: memory._id, bookmarked: !!memory.bookmarked });
    onClose?.();
  }, [memory, toggleBookmark, onClose]);

  const handleDelete = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert('Delete story', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => {
          deleteMemory(memory._id);
          onClose?.();
        },
      },
    ]);
  }, [memory, deleteMemory, onClose]);

  const toggleBeneficiary = useCallback((id: string) => {
    Haptics.selectionAsync();
    setSelectedBeneficiaryIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  const addTag = useCallback(() => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      setTags(prev => [...prev, t]);
    }
    setTagInput('');
  }, [tagInput, tags]);

  const removeTag = useCallback((tag: string) => {
    Haptics.selectionAsync();
    setTags(prev => prev.filter(t => t !== tag));
  }, []);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Actions</Text>
        <TouchableOpacity onPress={handleClose} style={s.closeBtn} activeOpacity={0.7}>
          <X size={16} color={COLORS.textBase} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* ── Share now ── */}
      <TouchableOpacity onPress={handleShare} style={s.actionRow} activeOpacity={0.8}>
        <Share2 size={20} color={COLORS.textBase} strokeWidth={1.8} />
        <Text style={s.actionLabel}>Share now</Text>
      </TouchableOpacity>

      {/* ── Bookmark ── */}
      <TouchableOpacity
        onPress={handleBookmark}
        disabled={isBookmarking}
        style={s.actionRow}
        activeOpacity={0.8}
      >
        {memory.bookmarked
          ? <BookmarkCheck size={20} color={COLORS.textBase} strokeWidth={1.8} />
          : <Bookmark size={20} color={COLORS.textBase} strokeWidth={1.8} />
        }
        <Text style={s.actionLabel}>{memory.bookmarked ? 'Remove bookmark' : 'Add bookmark'}</Text>
      </TouchableOpacity>

      {/* ── Who can see? ── */}
      <View style={s.visibilityCard}>
        <Text style={s.visibilityTitle}>Who can see this story?</Text>
        <Text style={s.visibilitySubtitle}>Stories are visible to all beneficiaries by default.</Text>

        {/* Dropdown trigger */}
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); setVisibilityOpen(o => !o); }}
          style={s.visibilityDropdownTrigger}
          activeOpacity={0.8}
        >
          <Users size={16} color={COLORS.textBase} strokeWidth={1.8} />
          <Text style={s.visibilityDropdownLabel}>{visibilityLabel}</Text>
          {visibilityOpen
            ? <ChevronUp size={16} color={COLORS.textMuted} strokeWidth={2} />
            : <ChevronDown size={16} color={COLORS.textMuted} strokeWidth={2} />
          }
        </TouchableOpacity>

        {/* Expanded options */}
        {visibilityOpen && (
          <View style={s.dropdownList}>
            <TouchableOpacity
              onPress={() => { setSelectedBeneficiaryIds([]); Haptics.selectionAsync(); }}
              style={[s.dropdownOption, !selectedBeneficiaryIds.length && s.dropdownOptionActive]}
              activeOpacity={0.8}
            >
              <Text style={[s.dropdownOptionText, !selectedBeneficiaryIds.length && s.dropdownOptionTextActive]}>
                Everyone
              </Text>
            </TouchableOpacity>
            {beneficiaries.map(b => {
              if (!b._id) return null;
              const on = selectedBeneficiaryIds.includes(b._id);
              return (
                <TouchableOpacity
                  key={b._id}
                  onPress={() => toggleBeneficiary(b._id!)}
                  style={[s.dropdownOption, on && s.dropdownOptionActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[s.dropdownOptionText, on && s.dropdownOptionTextActive]}>{b.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* ── Tags ── */}
      <View style={s.tagsSection}>
        <Text style={s.tagsLabel}>Tags</Text>
        <View style={s.tagsArea}>
          {/* Existing tag pills */}
          <View style={s.tagPillsRow}>
            {tags.map(tag => (
              <View key={tag} style={s.tagPill}>
                <Text style={s.tagPillText}>{tag}</Text>
                <TouchableOpacity onPress={() => removeTag(tag)} hitSlop={8} style={{ marginLeft: 4 }}>
                  <X size={11} color={COLORS.textBase} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Tag input */}
          <TextInput
            value={tagInput}
            onChangeText={setTagInput}
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

      {/* ── Delete ── */}
      <TouchableOpacity
        onPress={handleDelete}
        disabled={isDeleting}
        style={s.deleteBtn}
        activeOpacity={0.8}
      >
        <Text style={s.deleteBtnText}>{isDeleting ? 'Deleting…' : 'Delete story'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 20,
    paddingHorizontal: 2,
  },
  headerTitle: {
    fontFamily: FONTS.sansBold, fontSize: 18, color: COLORS.textStrong,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.fillWeak,
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },

  // Action rows
  actionRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 14,
    padding: 16,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.strokeWeaker,
    marginBottom: 10,
  },
  actionLabel: {
    fontFamily: FONTS.sansMedium, fontSize: 16, color: COLORS.textStrong,
  },

  // Visibility card
  visibilityCard: {
    backgroundColor: COLORS.fillWeak,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  visibilityTitle: {
    fontFamily: FONTS.sansBold, fontSize: 15, color: COLORS.textStrong,
  },
  visibilitySubtitle: {
    fontFamily: FONTS.sans, fontSize: 13, color: COLORS.textBase,
    marginTop: -8,
  },
  visibilityDropdownTrigger: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    borderWidth: 1, borderColor: COLORS.strokeWeaker,
  },
  visibilityDropdownLabel: {
    flex: 1, fontFamily: FONTS.sansMedium, fontSize: 14, color: COLORS.textStrong,
  },
  dropdownList: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.strokeWeaker,
    paddingVertical: 4,
  },
  dropdownOption: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 8, marginHorizontal: 4,
  },
  dropdownOptionActive: {
    backgroundColor: `${COLORS.brand}12`,
  },
  dropdownOptionText: {
    fontFamily: FONTS.sans, fontSize: 14, color: COLORS.textStrong,
  },
  dropdownOptionTextActive: {
    color: COLORS.brand, fontFamily: FONTS.sansMedium,
  },

  // Tags
  tagsSection: {
    marginBottom: 24, gap: 8,
  },
  tagsLabel: {
    fontFamily: FONTS.sansBold, fontSize: 15, color: COLORS.textStrong,
    paddingHorizontal: 2,
  },
  tagsArea: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.strokeWeak,
    padding: 12, minHeight: 72, gap: 8,
  },
  tagPillsRow: {
    flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 6,
  },
  tagPill: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: COLORS.fillWeak,
    borderWidth: 1, borderColor: COLORS.strokeWeak,
  },
  tagPillText: {
    fontFamily: FONTS.sansMedium, fontSize: 13, color: COLORS.textStrong,
  },
  tagInput: {
    fontFamily: FONTS.sans, fontSize: 14, color: COLORS.textStrong,
    padding: 0, minHeight: 20,
  },

  // Delete
  deleteBtn: {
    height: 56, borderRadius: 999,
    borderWidth: 1.5, borderColor: COLORS.error,
    backgroundColor: `${COLORS.error}06`,
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  deleteBtnText: {
    fontFamily: FONTS.sansMedium, fontSize: 16, color: COLORS.error,
  },
};
