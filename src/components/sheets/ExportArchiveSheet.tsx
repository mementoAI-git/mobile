import { useThemeColors } from '@/hooks/use-theme-colors';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import { Image, Text, View } from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import X from 'lucide-react-native/icons/x';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {COLORS} from '@/constants/tokens';
import {TYPE} from '@/constants/typography';
import {Button, toast} from '@/components/ui';
import {get, post} from '@/api/mutations';
import endpoint from '@/api/endpoint';

const EMPTY_MEMORIES_IMG = require('../../../assets/images/illustrations/empty_memories.webp');

type ExportStatus = 'pending' | 'processing' | 'complete' | 'failed' | 'expired';

interface ArchiveExportStatus {
  id: string;
  status: ExportStatus;
  progress: {
    stories_total: number;
    stories_exported: number;
    capsules_total: number;
    capsules_exported: number;
    attachments_total: number;
    attachments_exported: number;
  };
  warnings: string[];
  error?: string | null;
}

interface ExportArchiveSheetProps {
  onClose?: () => void;
}

const wait = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export function ExportArchiveSheet({onClose}: ExportArchiveSheetProps) {
  const COLORS = useThemeColors();
  const [isExporting, setIsExporting] = useState(false);
  const [status, setStatus] = useState<ArchiveExportStatus | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => () => {
    isMountedRef.current = false;
  }, []);

  const handleDismiss = useCallback(() => {
    void Haptics.selectionAsync();
    onClose?.();
  }, [onClose]);

  const pollUntilComplete = useCallback(async (exportId: string) => {
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const response = await get<ArchiveExportStatus>(
        endpoint.archiveExportById.replace(':id', exportId),
      );
      const next = response.data;
      if (isMountedRef.current) setStatus(next);
      if (next.status === 'complete') return next;
      if (next.status === 'failed' || next.status === 'expired') {
        throw new Error(next.error || 'Archive export could not be completed.');
      }
      await wait(2000);
    }
    throw new Error('Archive export is taking longer than expected. Please try again.');
  }, []);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const created = await post<ArchiveExportStatus>(endpoint.archiveExport, {});
      if (isMountedRef.current) setStatus(created.data);
      const complete = await pollUntilComplete(created.data.id);
      const download = await post<{url: string; filename: string}>(
        endpoint.archiveExportDownload.replace(':id', complete.id),
        {},
      );
      if (!FileSystem.cacheDirectory) {
        throw new Error('Archive downloads are unavailable on this device.');
      }
      const destination = `${FileSystem.cacheDirectory}${download.data.filename}`;
      const file = await FileSystem.downloadAsync(download.data.url, destination);
      if (!(await Sharing.isAvailableAsync())) {
        throw new Error('Sharing is unavailable on this device.');
      }
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/zip',
        dialogTitle: 'Share your Memento archive',
        UTI: 'public.zip-archive',
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (complete.warnings.length > 0) {
        toast(
          `Archive ready with ${complete.warnings.length} attachment warning${complete.warnings.length === 1 ? '' : 's'}.`,
          'info',
        );
      } else {
        toast('Your complete archive is ready.', 'success');
      }
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : 'Could not export your archive. Please try again.',
        'error',
      );
    } finally {
      if (isMountedRef.current) setIsExporting(false);
    }
  }, [pollUntilComplete]);

  const progress = status?.progress;
  const total = progress
    ? progress.stories_total + progress.capsules_total + progress.attachments_total
    : 0;
  const completed = progress
    ? progress.stories_exported + progress.capsules_exported + progress.attachments_exported
    : 0;

  return (
    <View className="flex-grow pb-8 pt-2">
      <View className="mb-4 flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1">
          <View className="size-1.5 rounded-full bg-brand" />
          <Text className="uppercase tracking-wider text-brand" style={TYPE.metadata}>
            Vault Exporter
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleDismiss}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Close export sheet"
          className="size-11 items-center justify-center rounded-full bg-fill-weaker"
        >
          <X size={18} color={COLORS.textWeak} />
        </TouchableOpacity>
      </View>

      <View className="mb-5 items-center">
        <Image
          source={EMPTY_MEMORIES_IMG}
          style={{width: 88, height: 88, marginBottom: 12}}
          resizeMode="contain"
        />
        <Text className="mb-1.5 text-center text-text-strong" style={TYPE.sectionTitle}>
          Export Your Personal Archive
        </Text>
        <Text className="px-2 text-center text-text-weak" style={TYPE.body}>
          Create a complete ZIP with every story, capsule, and readable attachment in your vault.
        </Text>
      </View>

      <View className="mb-6 rounded-3xl border border-stroke-weaker bg-fill-weaker p-5">
        <Text className="uppercase tracking-wider text-text-muted" style={TYPE.metadata}>
          {status ? status.status : 'Ready to prepare'}
        </Text>
        <Text className="mt-2 text-text-strong" style={TYPE.bodyStrong}>
          {status
            ? `${completed} of ${total || '—'} archive items prepared`
            : 'Your export runs securely in the background.'}
        </Text>
        <Text className="mt-2 text-text-weak" style={TYPE.bodySmall}>
          The download link expires after 24 hours. Any unavailable attachments are listed as warnings in the export status.
        </Text>
      </View>

      <Button
        variant="primary"
        size="lg"
        className="h-14 w-full"
        loading={isExporting}
        onPress={handleExport}
      >
        {status?.status === 'complete' ? 'Export Again' : 'Create & Share Archive'}
      </Button>
    </View>
  );
}
