import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Share,
} from 'react-native';
import {
  Trash2,
  Download,
  Layers,
  BarChart2,
  ChevronRight,
  ChevronDown,
  X,
} from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useUiStore } from '@/store';
import { useDeleteMemory } from '@/hooks/mutations/use-memory-mutations';
import { COLORS, FONTS } from '@/constants/tokens';
import {
  ENRICHMENT_CATEGORY_OPTIONS,
  dimensionLabel,
  type UserStatsData,
  type ChatMode,
  type LifeDimension,
} from '@/constants/enrichment';
import { Progress } from '@/components/ui/Progress';
import { Separator } from '@/components/ui/Separator';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface ChatActionsSheetProps {
  onClose: () => void;
}

export function ChatActionsSheet({ onClose }: ChatActionsSheetProps) {
  const closeSheet = useUiStore((s) => s.closeSheet);
  const sheetProps = useUiStore((s) => s.sheetProps);
  const { mutate: deleteMemory, isPending } = useDeleteMemory();
  const [showEnrichment, setShowEnrichment] = useState(false);
  const [showDeepDiveSelector, setShowDeepDiveSelector] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  const chatId: string = sheetProps?.chatId ?? '';
  const chatMode: ChatMode = sheetProps?.chatMode ?? 'open';
  const deepDiveDimension: LifeDimension | null = sheetProps?.deepDiveDimension ?? null;
  const enrichmentStats: UserStatsData | null = sheetProps?.enrichmentStats ?? null;
  const onSetChatMode: ((mode: ChatMode, dim?: LifeDimension | null) => void) | undefined =
    sheetProps?.onSetChatMode;

  // ── Export conversation ───────────────────────────────────────────────────
  const handleExport = async () => {
    Haptics.selectionAsync();
    // We don't have full message text here — direct to a Share of the conversation link
    // For now, share a simple text export placeholder
    try {
      await Share.share({
        message: `Memento conversation — open in the app to view the full thread.`,
        title: 'Export Conversation',
      });
    } catch {
      // user cancelled
    }
  };

  // ── Delete conversation ───────────────────────────────────────────────────
  const handleDelete = () => {
    if (!chatId) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setDeleteConfirmVisible(true);
  };

  const confirmDelete = () => {
    setDeleteConfirmVisible(false);
    deleteMemory(chatId, {
      onSuccess: () => {
        closeSheet();
        router.replace('/(tabs)/chat');
      },
    });
  };

  // ── Deep dive selector ────────────────────────────────────────────────────
  const handleSelectDimension = (dim: LifeDimension) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSetChatMode?.('deep_dive', dim);
    onClose();
  };

  const handleExitDeepDive = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSetChatMode?.('open', null);
    onClose();
  };

  const categoryScores = enrichmentStats?.category_scores ?? [];

  return (
    <ScrollView showsVerticalScrollIndicator={false} className="gap-0">
      {/* Title */}
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-xl text-text-strong" style={{ fontFamily: FONTS.serif }}>
          Conversation
        </Text>
        <TouchableOpacity
          onPress={onClose}
          activeOpacity={0.7}
          className="size-8 rounded-full bg-fill-weaker items-center justify-center"
        >
          <X size={14} color={COLORS.textWeak} />
        </TouchableOpacity>
      </View>

      <Separator className="mb-4" />

      {/* ── Current mode indicator ─────────────────────────────────── */}
      {chatMode === 'deep_dive' && deepDiveDimension && (
        <View className="flex-row items-center gap-3 p-4 rounded-2xl bg-brand/5 border border-brand/15 mb-3">
          <Layers size={18} color={COLORS.brand} strokeWidth={2} />
          <View className="flex-1">
            <Text style={{ fontFamily: FONTS.sansSemi, fontSize: 13, color: COLORS.brand }}>
              Deep dive active
            </Text>
            <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: COLORS.textWeak }}>
              {dimensionLabel(deepDiveDimension)}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleExitDeepDive}
            activeOpacity={0.7}
            className="border border-brand/30 rounded-full px-3 py-1"
          >
            <Text style={{ fontFamily: FONTS.sansSemi, fontSize: 11, color: COLORS.brand }}>
              Exit
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Actions ───────────────────────────────────────────────── */}
      <View className="gap-2">

        {/* Deep Dive Selector */}
        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync();
            setShowDeepDiveSelector((v) => !v);
            setShowEnrichment(false);
          }}
          activeOpacity={0.8}
          className="flex-row items-center gap-4 p-4 rounded-[20px] bg-white border border-stroke-weaker"
        >
          <View className="size-10 rounded-xl items-center justify-center bg-brand/10">
            <Layers size={18} color={COLORS.brand} strokeWidth={1.5} />
          </View>
          <View className="flex-1">
            <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 14, color: COLORS.textStrong }}>
              {chatMode === 'deep_dive' ? 'Change deep dive topic' : 'Start deep dive'}
            </Text>
            <Text style={{ fontFamily: FONTS.sans, fontSize: 11, color: COLORS.textWeak }}>
              Focus on a specific life dimension
            </Text>
          </View>
          {showDeepDiveSelector ? (
            <ChevronDown size={16} color={COLORS.textWeak} />
          ) : (
            <ChevronRight size={16} color={COLORS.textWeak} />
          )}
        </TouchableOpacity>

        {/* Deep Dive Dimension List */}
        {showDeepDiveSelector && (
          <View className="bg-white border border-stroke-weaker rounded-2xl overflow-hidden">
            {ENRICHMENT_CATEGORY_OPTIONS.map((option, i) => (
              <React.Fragment key={option.value}>
                <TouchableOpacity
                  onPress={() => handleSelectDimension(option.value)}
                  activeOpacity={0.7}
                  className="flex-row items-center gap-3 px-4 py-3"
                >
                  <Text style={{ fontSize: 20 }}>{option.icon}</Text>
                  <View className="flex-1">
                    <Text
                      style={{
                        fontFamily:
                          deepDiveDimension === option.value ? FONTS.sansSemi : FONTS.sans,
                        fontSize: 13,
                        color:
                          deepDiveDimension === option.value
                            ? COLORS.brand
                            : COLORS.textStrong,
                      }}
                    >
                      {option.label}
                    </Text>
                  </View>
                  {deepDiveDimension === option.value && (
                    <View className="size-4 rounded-full bg-brand items-center justify-center">
                      <View className="size-1.5 rounded-full bg-white" />
                    </View>
                  )}
                </TouchableOpacity>
                {i < ENRICHMENT_CATEGORY_OPTIONS.length - 1 && (
                  <Separator />
                )}
              </React.Fragment>
            ))}
          </View>
        )}

        {/* Enrichment Scores */}
        {categoryScores.length > 0 && (
          <>
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                setShowEnrichment((v) => !v);
                setShowDeepDiveSelector(false);
              }}
              activeOpacity={0.8}
              className="flex-row items-center gap-4 p-4 rounded-[20px] bg-white border border-stroke-weaker"
            >
              <View className="size-10 rounded-xl items-center justify-center bg-success/10">
                <BarChart2 size={18} color={COLORS.success} strokeWidth={1.5} />
              </View>
              <View className="flex-1">
                <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 14, color: COLORS.textStrong }}>
                  Enrichment breakdown
                </Text>
                <Text style={{ fontFamily: FONTS.sans, fontSize: 11, color: COLORS.textWeak }}>
                  {enrichmentStats?.enrichment_score ?? 0}% overall score
                </Text>
              </View>
              {showEnrichment ? (
                <ChevronDown size={16} color={COLORS.textWeak} />
              ) : (
                <ChevronRight size={16} color={COLORS.textWeak} />
              )}
            </TouchableOpacity>

            {showEnrichment && (
              <View className="bg-white border border-stroke-weaker rounded-2xl px-4 py-3 gap-3">
                {categoryScores.map((cat) => {
                  const option = ENRICHMENT_CATEGORY_OPTIONS.find((o) => o.value === cat.key);
                  return (
                    <View key={cat.key} className="gap-1">
                      <View className="flex-row items-center justify-between">
                        <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: COLORS.textBase }}>
                          {option?.icon} {cat.label}
                        </Text>
                        <Text
                          style={{
                            fontFamily: FONTS.sansSemi,
                            fontSize: 11,
                            color: cat.unlocked ? COLORS.success : COLORS.textWeak,
                          }}
                        >
                          {cat.score}%
                        </Text>
                      </View>
                      <Progress
                        value={cat.score}
                        height={4}
                        color={cat.unlocked ? COLORS.success : COLORS.strokeWeak}
                      />
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}

        {/* Export */}
        <TouchableOpacity
          onPress={handleExport}
          activeOpacity={0.8}
          className="flex-row items-center gap-4 p-4 rounded-[20px] bg-white border border-stroke-weaker"
        >
          <View className="size-10 rounded-xl items-center justify-center bg-fill-weak">
            <Download size={18} color={COLORS.textBase} strokeWidth={1.5} />
          </View>
          <View className="flex-1">
            <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 14, color: COLORS.textStrong }}>
              Share conversation
            </Text>
            <Text style={{ fontFamily: FONTS.sans, fontSize: 11, color: COLORS.textWeak }}>
              Export or share this thread
            </Text>
          </View>
          <ChevronRight size={16} color={COLORS.textWeak} />
        </TouchableOpacity>

        {/* Delete */}
        <TouchableOpacity
          onPress={handleDelete}
          disabled={isPending}
          activeOpacity={0.8}
          className="flex-row items-center gap-4 p-4 rounded-[20px] bg-white border border-stroke-weaker"
          style={{ borderColor: `${COLORS.error}20` }}
        >
          <View
            className="size-10 rounded-xl items-center justify-center"
            style={{ backgroundColor: `${COLORS.error}10` }}
          >
            <Trash2 size={18} color={COLORS.error} strokeWidth={1.5} />
          </View>
          <View className="flex-1">
            <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 14, color: COLORS.error }}>
              Delete Conversation
            </Text>
            <Text style={{ fontFamily: FONTS.sans, fontSize: 11, color: COLORS.textWeak }}>
              Permanently remove this chat
            </Text>
          </View>
        </TouchableOpacity>
      </View>
      <ConfirmDialog
        visible={deleteConfirmVisible}
        title="Delete conversation?"
        message="This conversation will be permanently removed. This cannot be undone."
        onClose={() => setDeleteConfirmVisible(false)}
        buttons={[
          { label: 'Delete', variant: 'destructive', onPress: confirmDelete },
          { label: 'Keep it', variant: 'ghost', onPress: () => setDeleteConfirmVisible(false) },
        ]}
      />
    </ScrollView>
  );
}
