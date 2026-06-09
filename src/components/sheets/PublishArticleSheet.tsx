import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { X, Users, ChevronDown, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useUiStore } from '@/store';
import { useCreateMemory } from '@/hooks/mutations/use-memory-mutations';
import { useBeneficiaries } from '@/hooks/queries/use-beneficiaries';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/constants/query-keys';
import { COLORS, FONTS } from '@/constants/tokens';
import { useToast } from '@/components/ui/Toast';
import client from '@/api/client';
import endpoint from '@/api/endpoint';
import type { IBeneficiary } from '@/types';

interface Props {
  onClose?: () => void;
}

export function PublishArticleSheet({ onClose }: Props) {
  const closeSheet = useUiStore((s) => s.closeSheet);
  const sheetProps = useUiStore((s) => s.sheetProps) as {
    title?: string;
    subtitle?: string;
    body?: string;
  } | undefined;

  const [tags, setTags] = useState('');
  const [selectedBeneficiaryIds, setSelectedBeneficiaryIds] = useState<string[]>([]);
  const [beneficiaryMenuOpen, setBeneficiaryMenuOpen] = useState(false);
  const [isAutotagging, setIsAutotagging] = useState(false);

  const { mutate: createMemory, isPending } = useCreateMemory();
  const { data: beneficiariesRaw } = useBeneficiaries();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const beneficiaries: IBeneficiary[] = useMemo(() => {
    if (!beneficiariesRaw) return [];
    if (Array.isArray(beneficiariesRaw)) return beneficiariesRaw;
    if ((beneficiariesRaw as any)?.docs) return (beneficiariesRaw as any).docs;
    return [];
  }, [beneficiariesRaw]);

  const visibilityLabel = useMemo(() => {
    if (!selectedBeneficiaryIds.length) return 'Everyone';
    const names = beneficiaries
      .filter((b) => b._id && selectedBeneficiaryIds.includes(b._id))
      .map((b) => b.name).filter(Boolean);
    if (names.length === 1) return names[0];
    return `${names.length} beneficiaries`;
  }, [selectedBeneficiaryIds, beneficiaries]);

  const handleClose = useCallback(() => {
    Haptics.selectionAsync();
    if (onClose) onClose();
    else closeSheet();
  }, [onClose, closeSheet]);

  const handleAutotag = useCallback(async () => {
    const bodyText = [sheetProps?.title, sheetProps?.subtitle, sheetProps?.body]
      .filter(Boolean).join(' ').trim();
    if (!bodyText) return;
    setIsAutotagging(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await client.post(endpoint.generateTags, { body: bodyText });
      const generated: string[] = res.data?.data?.tags ?? res.data?.tags ?? [];
      if (generated.length) {
        setTags((prev) => {
          const existing = prev.split(',').map((t) => t.trim()).filter(Boolean);
          const merged = [...new Set([...existing, ...generated])];
          return merged.join(', ');
        });
      }
    } catch {
      toast('Could not generate tags', 'error');
    } finally {
      setIsAutotagging(false);
    }
  }, [sheetProps, toast]);

  const handlePost = useCallback(() => {
    const title = sheetProps?.title?.trim() || '';
    const body = [sheetProps?.subtitle, sheetProps?.body].filter(Boolean).join('\n\n').trim();
    if (!title && !body) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);

    createMemory(
      {
        title: title || 'Untitled',
        body,
        tags: tagList,
        status: 'save',
        beneficiaries: selectedBeneficiaryIds.length ? selectedBeneficiaryIds : undefined,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['stories'] });
          queryClient.invalidateQueries({ queryKey: queryKeys.memoriesStats });
          toast('Published! Your article is live.', 'success');
          if (onClose) onClose();
          else closeSheet();
        },
        onError: (err: any) => {
          toast(err?.message ?? 'Could not publish. Try again.', 'error');
        },
      }
    );
  }, [sheetProps, tags, selectedBeneficiaryIds, createMemory, queryClient, toast, onClose, closeSheet]);

  const toggleBeneficiary = useCallback((id: string) => {
    Haptics.selectionAsync();
    setSelectedBeneficiaryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const hasContent = !!(sheetProps?.title?.trim() || sheetProps?.body?.trim());

  return (
    <BottomSheetScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Publish post</Text>
        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
          <X size={16} color={COLORS.textBase} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Visibility card */}
      <View style={styles.visibilityCard}>
        <Text style={styles.visibilityTitle}>Who can see this story?</Text>
        <Text style={styles.visibilitySubtitle}>Stories are visible to all beneficiaries by default.</Text>

        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); setBeneficiaryMenuOpen((o) => !o); }}
          style={styles.visibilitySelector}
          activeOpacity={0.8}
        >
          <Users size={18} color={COLORS.textBase} strokeWidth={1.8} />
          <Text style={styles.visibilitySelectorText}>{visibilityLabel}</Text>
          <ChevronDown size={16} color={COLORS.textMuted} strokeWidth={2} />
        </TouchableOpacity>

        {beneficiaryMenuOpen && (
          <View style={styles.beneficiaryMenu}>
            <TouchableOpacity
              onPress={() => { setSelectedBeneficiaryIds([]); setBeneficiaryMenuOpen(false); Haptics.selectionAsync(); }}
              style={[styles.beneficiaryOption, !selectedBeneficiaryIds.length && styles.beneficiaryOptionActive]}
            >
              <Text style={[styles.beneficiaryOptionText, !selectedBeneficiaryIds.length && styles.beneficiaryOptionTextActive]}>
                Everyone
              </Text>
            </TouchableOpacity>
            {beneficiaries.map((b) => {
              if (!b._id) return null;
              const on = selectedBeneficiaryIds.includes(b._id);
              return (
                <TouchableOpacity
                  key={b._id}
                  onPress={() => toggleBeneficiary(b._id!)}
                  style={[styles.beneficiaryOption, on && styles.beneficiaryOptionActive]}
                >
                  <Text style={[styles.beneficiaryOptionText, on && styles.beneficiaryOptionTextActive]}>
                    {b.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* Tags section */}
      <View style={styles.tagsSection}>
        <View style={styles.tagsHeader}>
          <Text style={styles.tagsTitle}>Add Tags</Text>
          <TouchableOpacity
            onPress={handleAutotag}
            activeOpacity={0.8}
            style={styles.autotagBtn}
            disabled={isAutotagging}
          >
            {isAutotagging
              ? <ActivityIndicator size="small" color={COLORS.info} />
              : <Sparkles size={13} color={COLORS.info} strokeWidth={2} />
            }
            <Text style={styles.autotagText}>Autotag</Text>
          </TouchableOpacity>
        </View>

        <BottomSheetTextInput
          value={tags}
          onChangeText={setTags}
          placeholder="Manually enter tags or use the autotag button"
          placeholderTextColor={COLORS.textMuted}
          style={styles.tagInput}
          multiline={false}
          returnKeyType="done"
        />
      </View>

      {/* Post now CTA */}
      <TouchableOpacity
        onPress={handlePost}
        activeOpacity={0.85}
        style={[styles.postBtn, (!hasContent || isPending) && styles.postBtnDisabled]}
        disabled={!hasContent || isPending}
      >
        {isPending
          ? <ActivityIndicator color={COLORS.textInverse} />
          : <Text style={styles.postBtnText}>Post now</Text>
        }
      </TouchableOpacity>
    </BottomSheetScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 8,
  },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerTitle: {
    fontFamily: FONTS.serif, fontSize: 22, color: COLORS.textStrong,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.fillWeak, alignItems: 'center', justifyContent: 'center',
  },

  // Visibility card
  visibilityCard: {
    backgroundColor: COLORS.fillWeak,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  visibilityTitle: {
    fontFamily: FONTS.sansBold, fontSize: 15, color: COLORS.textStrong, marginBottom: 4,
  },
  visibilitySubtitle: {
    fontFamily: FONTS.sans, fontSize: 13, color: COLORS.textBase, marginBottom: 14,
  },
  visibilitySelector: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.card, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    borderWidth: 1, borderColor: COLORS.strokeWeaker,
  },
  visibilitySelectorText: {
    flex: 1, fontFamily: FONTS.sansMedium, fontSize: 14, color: COLORS.textStrong,
  },

  // Beneficiary menu
  beneficiaryMenu: {
    marginTop: 8, backgroundColor: COLORS.card,
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.strokeWeaker,
    paddingVertical: 4,
  },
  beneficiaryOption: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, marginHorizontal: 4,
  },
  beneficiaryOptionActive: { backgroundColor: `${COLORS.brand}12` },
  beneficiaryOptionText: { fontFamily: FONTS.sans, fontSize: 14, color: COLORS.textStrong },
  beneficiaryOptionTextActive: { color: COLORS.brand, fontFamily: FONTS.sansMedium },

  // Tags
  tagsSection: { marginBottom: 32 },
  tagsHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12,
  },
  tagsTitle: { fontFamily: FONTS.sansBold, fontSize: 15, color: COLORS.textStrong },
  autotagBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1, borderColor: `${COLORS.info}40`,
    backgroundColor: `${COLORS.info}08`,
  },
  autotagText: { fontFamily: FONTS.sansMedium, fontSize: 12, color: COLORS.info },
  tagInput: {
    backgroundColor: COLORS.card,
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.strokeWeaker,
    paddingHorizontal: 14, paddingVertical: 14,
    fontFamily: FONTS.sans, fontSize: 14, color: COLORS.textStrong,
    minHeight: 50,
  },

  // Post button
  postBtn: {
    height: 56, borderRadius: 999,
    backgroundColor: COLORS.brand,
    alignItems: 'center', justifyContent: 'center',
  },
  postBtnDisabled: { opacity: 0.45 },
  postBtnText: {
    fontFamily: FONTS.sansSemi, fontSize: 16, color: COLORS.textInverse,
  },
});
