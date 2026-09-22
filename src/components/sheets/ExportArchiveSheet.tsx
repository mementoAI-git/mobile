import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Share, Image } from 'react-native';
import { X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { Button } from '@/components/ui';
import { useStories } from '@/hooks/queries/use-memories';
import { useCapsules } from '@/hooks/queries/use-capsules';
import { useUserStore } from '@/store';
import { generateMemoirHtml } from '@/features/export/memoir-html-generator';
import type { IMemory, ICapsule } from '@/types';

const EMPTY_MEMORIES_IMG = require('../../../assets/images/illustrations/empty_memories.png');

interface ExportArchiveSheetProps {
  onClose?: () => void;
}

export function ExportArchiveSheet({ onClose }: ExportArchiveSheetProps) {
  const user = useUserStore((s) => s.user);
  const [isExporting, setIsExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [exportFormat, setExportFormat] = useState<'memoir' | 'text'>('memoir');

  const { data: storiesData, isLoading: storiesLoading } = useStories({ limit: 100 });
  const { data: capsulesData, isLoading: capsulesLoading } = useCapsules();

  const stories: IMemory[] = storiesData?.pages?.flatMap((p) => p?.docs ?? []) ?? [];
  const capsules: ICapsule[] = capsulesData?.pages?.flatMap((p) => p?.docs ?? []) ?? [];

  const totalWords = useMemo(() => {
    return stories.reduce((acc, s) => {
      const text = s.body?.replace(/<[^>]+>/g, '').trim() || '';
      return acc + (text ? text.split(/\s+/).length : 0);
    }, 0);
  }, [stories]);

  const compiledDocument = useMemo(() => {
    const lines: string[] = [];
    const exportDate = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    lines.push('====================================================');
    lines.push(`MEMENTO VAULT ARCHIVE EXPORT`);
    lines.push(`Owner: ${user?.first_name || 'Personal'} ${user?.last_name || 'Archive'}`);
    lines.push(`Exported on: ${exportDate}`);
    lines.push(`Stories: ${stories.length} | Words: ${totalWords}`);
    lines.push('====================================================\n');

    stories.forEach((story, idx) => {
      lines.push(`--- STORY ${idx + 1}: ${story.title || 'Untitled'} ---`);
      if (story.created_at) {
        lines.push(`Date: ${new Date(story.created_at).toDateString()}`);
      }
      if (story.tags && story.tags.length > 0) {
        lines.push(`Tags: #${story.tags.join(' #')}`);
      }
      lines.push('');
      lines.push(story.body || '');
      lines.push('\n');
    });

    if (capsules.length > 0) {
      lines.push('====================================================');
      lines.push('TIME CAPSULES RECORD');
      lines.push('====================================================\n');
      capsules.forEach((capsule: ICapsule, idx: number) => {
        lines.push(`[Capsule ${idx + 1}] ${capsule.title || 'Untitled'}`);
        lines.push(`Status: ${capsule.status}`);
        if (capsule.schedule_date) {
          lines.push(`Scheduled Delivery: ${new Date(capsule.schedule_date).toDateString()}`);
        }
        lines.push('');
      });
    }

    return lines.join('\n');
  }, [capsules, stories, totalWords, user]);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const messageToShare =
        exportFormat === 'memoir'
          ? generateMemoirHtml({ user, stories, capsules, totalWords })
          : compiledDocument;

      const title =
        exportFormat === 'memoir'
          ? `${user?.first_name || 'Memento'} Memoir Book`
          : `${user?.first_name || 'Memento'} Vault Archive`;

      const result = await Share.share({
        title,
        message: messageToShare,
      });

      if (result.action === Share.sharedAction) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setExported(true);
      }
    } catch {
      // User cancelled or share failed
    } finally {
      setIsExporting(false);
    }
  };

  const handleDismiss = () => {
    void Haptics.selectionAsync();
    onClose?.();
  };

  return (
    <View className="flex-grow px-5 pb-8 pt-2">
      {/* Top Bar with Badge & 44x44 Close Button */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center gap-1.5 bg-brand/10 rounded-full px-3 py-1">
          <View className="size-1.5 rounded-full bg-brand" />
          <Text className="text-brand uppercase tracking-wider" style={TYPE.metadata}>
            Vault Exporter
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleDismiss}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Close export sheet"
          className="size-11 rounded-full bg-fill-weaker items-center justify-center"
        >
          <X size={18} color={COLORS.textWeak} />
        </TouchableOpacity>
      </View>

      {/* Hero Illustration & Title */}
      <View className="mb-4 items-center">
        <Image
          source={EMPTY_MEMORIES_IMG}
          style={{ width: 88, height: 88, marginBottom: 12 }}
          resizeMode="contain"
        />
        <Text className="text-center text-text-strong mb-1.5" style={TYPE.sectionTitle}>
          Export Your Personal Archive
        </Text>
        <Text className="text-center text-text-weak px-2" style={TYPE.body}>
          Compile your complete vault — including all written reflections, stories, and capsules — into an enduring document you own forever.
        </Text>
      </View>

      {/* Format Selector Pills */}
      <View className="flex-row items-center gap-2 mb-4 bg-fill-weaker p-1 rounded-full border border-stroke-weaker">
        <TouchableOpacity
          onPress={() => {
            void Haptics.selectionAsync();
            setExportFormat('memoir');
          }}
          className={`flex-1 py-2 rounded-full items-center justify-center ${
            exportFormat === 'memoir' ? 'bg-white shadow-sm' : ''
          }`}
        >
          <Text
            style={{
              ...TYPE.buttonSmall,
              color: exportFormat === 'memoir' ? COLORS.brand : COLORS.textWeak,
            }}
          >
            Editorial Memoir (.html)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            void Haptics.selectionAsync();
            setExportFormat('text');
          }}
          className={`flex-1 py-2 rounded-full items-center justify-center ${
            exportFormat === 'text' ? 'bg-white shadow-sm' : ''
          }`}
        >
          <Text
            style={{
              ...TYPE.buttonSmall,
              color: exportFormat === 'text' ? COLORS.brand : COLORS.textWeak,
            }}
          >
            Plain Text (.txt)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Vault Statistics Card */}
      <View className="bg-fill-weaker rounded-3xl border border-stroke-weaker p-5 mb-6">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-text-muted uppercase tracking-wider" style={TYPE.metadata}>
            Archive Summary
          </Text>
          <View className="bg-success/15 px-2.5 py-0.5 rounded-full">
            <Text className="text-success uppercase tracking-wider" style={TYPE.metadata}>
              Encrypted Copy
            </Text>
          </View>
        </View>

        <View className="flex-row items-center justify-between">
          <View className="items-center flex-1">
            <Text className="text-text-strong mb-1" style={TYPE.stat}>
              {stories.length}
            </Text>
            <Text className="text-text-weak" style={TYPE.bodySmall}>
              Stories
            </Text>
          </View>

          <View className="w-px h-10 bg-stroke-weaker" />

          <View className="items-center flex-1">
            <Text className="text-text-strong mb-1" style={TYPE.stat}>
              {totalWords.toLocaleString()}
            </Text>
            <Text className="text-text-weak" style={TYPE.bodySmall}>
              Words
            </Text>
          </View>

          <View className="w-px h-10 bg-stroke-weaker" />

          <View className="items-center flex-1">
            <Text className="text-text-strong mb-1" style={TYPE.stat}>
              {capsules.length}
            </Text>
            <Text className="text-text-weak" style={TYPE.bodySmall}>
              Capsules
            </Text>
          </View>
        </View>
      </View>

      {/* Confirmation indicator if already exported */}
      {exported && (
        <View className="bg-success/10 border border-success/20 rounded-2xl p-4 mb-4">
          <Text className="text-success text-center" style={TYPE.bodySmall}>
            Archive compiled and shared successfully.
          </Text>
        </View>
      )}

      {/* Actions */}
      <View className="gap-3">
        <Button
          variant="primary"
          size="lg"
          className="h-14 w-full"
          loading={isExporting || storiesLoading || capsulesLoading}
          onPress={handleExport}
        >
          {exported ? 'Export Again' : 'Export & Share Archive'}
        </Button>
      </View>
    </View>
  );
}
