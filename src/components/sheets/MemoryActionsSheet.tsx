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
import {
  X, Share2, Bookmark, BookmarkCheck,
  Users, ChevronDown, ChevronUp, Trash2, AlertTriangle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import {
  useDeleteMemory, useBookmarkMemory, useUpdateMemory,
} from '@/hooks/mutations/use-memory-mutations';
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

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const [selectedBeneficiaryIds, setSelectedBeneficiaryIds] = useState<string[]>(
    (memory.beneficiaries ?? [])
      .map((b: any) => (typeof b === 'string' ? b : b._id))
      .filter(Boolean)
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

  const handleClose = useCallback(() => {
    const hasTagChange =
      JSON.stringify(tags.slice().sort()) !==
      JSON.stringify((memory.tags ?? []).slice().sort());
    const origBeneficiaries = (memory.beneficiaries ?? [])
      .map((b: any) => (typeof b === 'string' ? b : b._id))
      .filter(Boolean);
    const hasVisibilityChange =
      JSON.stringify(selectedBeneficiaryIds.slice().sort()) !==
      JSON.stringify(origBeneficiaries.slice().sort());

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

  const handleConfirmDelete = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    deleteMemory(memory._id, {
      onSuccess: () => {
        toast('Item deleted successfully', 'success');
        onClose?.();
      },
      onError: () => {
        toast('Could not delete story', 'error');
      },
    });
  }, [memory, deleteMemory, onClose]);

  const toggleBeneficiary = useCallback((id: string) => {
    Haptics.selectionAsync();
    setSelectedBeneficiaryIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  const addTag = useCallback(() => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput('');
  }, [tagInput, tags]);

  const removeTag = useCallback((tag: string) => {
    Haptics.selectionAsync();
    setTags(prev => prev.filter(t => t !== tag));
  }, []);

  // ── Delete confirmation view ────────────────────────────────────────────────

  if (showDeleteConfirm) {
    return (
      <View style={{ alignItems: 'center', paddingTop: 16, paddingBottom: 24, paddingHorizontal: 4 }}>
        {/* Warning icon */}
        <View style={{ marginBottom: 24, marginTop: 8 }}>
          <AlertTriangle size={96} color="#F59E0B" fill="#F59E0B" strokeWidth={0} />
        </View>

        {/* Heading */}
        <Text style={{
          fontFamily: FONTS.sansBold, fontSize: 22, color: COLORS.textStrong,
          textAlign: 'center', lineHeight: 30, marginBottom: 10, paddingHorizontal: 16,
        }}>
          Are you sure you want to{'\n'}delete this story?
        </Text>

        {/* Subtext */}
        <Text style={{
          fontFamily: FONTS.sans, fontSize: 15, color: COLORS.textWeak,
          textAlign: 'center', marginBottom: 40,
        }}>
          This action cannot be reversed.
        </Text>

        {/* Buttons */}
        <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); setShowDeleteConfirm(false); }}
            activeOpacity={0.8}
            style={{
              flex: 1, height: 56, borderRadius: 999,
              backgroundColor: COLORS.fillWeak,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ fontFamily: FONTS.sansBold, fontSize: 16, color: COLORS.textStrong }}>
              Go back
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleConfirmDelete}
            disabled={isDeleting}
            activeOpacity={0.85}
            style={{
              flex: 1, height: 56, borderRadius: 999,
              backgroundColor: '#B71C1C',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            {isDeleting
              ? <ActivityIndicator color="#fff" />
              : <Text style={{ fontFamily: FONTS.sansBold, fontSize: 16, color: '#fff' }}>Yes, delete</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Actions list ────────────────────────────────────────────────────────────

  return (
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
        <Text style={s.visibilitySubtitle}>Stories are visible to all beneficiaries by default.</Text>
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); setVisibilityOpen(o => !o); }}
          style={s.visibilityTrigger} activeOpacity={0.8}
        >
          <Users size={16} color={COLORS.textBase} strokeWidth={1.8} />
          <Text style={s.visibilityLabel}>{visibilityLabel}</Text>
          {visibilityOpen
            ? <ChevronUp size={16} color={COLORS.textMuted} strokeWidth={2} />
            : <ChevronDown size={16} color={COLORS.textMuted} strokeWidth={2} />
          }
        </TouchableOpacity>
        {visibilityOpen && (
          <View style={s.dropdownList}>
            <TouchableOpacity
              onPress={() => { setSelectedBeneficiaryIds([]); Haptics.selectionAsync(); }}
              style={[s.dropdownOption, !selectedBeneficiaryIds.length && s.dropdownOptionActive]}
              activeOpacity={0.8}
            >
              <Text style={[s.dropdownOptionText, !selectedBeneficiaryIds.length && s.dropdownOptionTextActive]}>Everyone</Text>
            </TouchableOpacity>
            {beneficiaries.map(b => {
              if (!b._id) return null;
              const on = selectedBeneficiaryIds.includes(b._id);
              return (
                <TouchableOpacity key={b._id} onPress={() => toggleBeneficiary(b._id!)}
                  style={[s.dropdownOption, on && s.dropdownOptionActive]} activeOpacity={0.8}>
                  <Text style={[s.dropdownOptionText, on && s.dropdownOptionTextActive]}>{b.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* Tags */}
      <View style={s.tagsSection}>
        <Text style={s.tagsLabel}>Tags</Text>
        <View style={s.tagsArea}>
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

      {/* Delete — opens inline confirmation */}
      <TouchableOpacity
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowDeleteConfirm(true); }}
        style={s.deleteBtn} activeOpacity={0.8}
      >
        <Text style={s.deleteBtnText}>Delete story</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  header: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 20, paddingHorizontal: 2,
  },
  headerTitle: { fontFamily: FONTS.sansBold, fontSize: 18, color: COLORS.textStrong },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.fillWeak,
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  actionRow: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 14,
    padding: 16, backgroundColor: COLORS.card, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.strokeWeaker, marginBottom: 10,
  },
  actionLabel: { fontFamily: FONTS.sansMedium, fontSize: 16, color: COLORS.textStrong },
  visibilityCard: {
    backgroundColor: COLORS.fillWeak, borderRadius: 16, padding: 16, marginBottom: 16, gap: 12,
  },
  visibilityTitle: { fontFamily: FONTS.sansBold, fontSize: 15, color: COLORS.textStrong },
  visibilitySubtitle: {
    fontFamily: FONTS.sans, fontSize: 13, color: COLORS.textBase, marginTop: -8,
  },
  visibilityTrigger: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10,
    backgroundColor: COLORS.card, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    borderWidth: 1, borderColor: COLORS.strokeWeaker,
  },
  visibilityLabel: { flex: 1, fontFamily: FONTS.sansMedium, fontSize: 14, color: COLORS.textStrong },
  dropdownList: {
    backgroundColor: COLORS.card, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.strokeWeaker, paddingVertical: 4,
  },
  dropdownOption: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, marginHorizontal: 4 },
  dropdownOptionActive: { backgroundColor: `${COLORS.brand}12` },
  dropdownOptionText: { fontFamily: FONTS.sans, fontSize: 14, color: COLORS.textStrong },
  dropdownOptionTextActive: { color: COLORS.brand, fontFamily: FONTS.sansMedium },
  tagsSection: { marginBottom: 24, gap: 8 },
  tagsLabel: { fontFamily: FONTS.sansBold, fontSize: 15, color: COLORS.textStrong, paddingHorizontal: 2 },
  tagsArea: {
    backgroundColor: COLORS.card, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.strokeWeak, padding: 12, minHeight: 72, gap: 8,
  },
  tagPillsRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 6 },
  tagPill: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
    backgroundColor: COLORS.fillWeak, borderWidth: 1, borderColor: COLORS.strokeWeak,
  },
  tagPillText: { fontFamily: FONTS.sansMedium, fontSize: 13, color: COLORS.textStrong },
  tagInput: {
    fontFamily: FONTS.sans, fontSize: 14, color: COLORS.textStrong, padding: 0, minHeight: 20,
  },
  deleteBtn: {
    height: 56, borderRadius: 999,
    borderWidth: 1.5, borderColor: COLORS.error,
    backgroundColor: `${COLORS.error}06`,
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  deleteBtnText: { fontFamily: FONTS.sansMedium, fontSize: 16, color: COLORS.error },
};
