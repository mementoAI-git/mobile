import { useThemeColors } from '@/hooks/use-theme-colors';
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Share } from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import CheckCircle2 from 'lucide-react-native/icons/circle-check';
import Copy from 'lucide-react-native/icons/copy';
import ShareIcon from 'lucide-react-native/icons/share';
import Plus from 'lucide-react-native/icons/plus';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { Button, toast } from '@/components/ui';
import { useUiStore } from '@/store';
import { logger } from '@/lib/logger';
import { publishedPostUrl } from '@/lib/env';
import { SHEET_GROUP_GAP } from '@/features/layout/sheet-safe-area';
import { SheetHeader } from './SheetHeader';

export function ShareMemorySheet() {
  const COLORS = useThemeColors();
  const sheetProps = useUiStore((s) => s.sheetProps);
  const closeSheet = useUiStore((s) => s.closeSheet);
  const openSheet = useUiStore((s) => s.openSheet);
  const memoryId = sheetProps?.id;
  const [copied, setCopied] = useState(false);
  const mountedRef = useRef(true);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; clearTimeout(copyTimerRef.current); };
  }, []);

  const shareUrl = publishedPostUrl(typeof memoryId === 'string' ? memoryId : undefined);

  const handleCopy = async () => {
    Haptics.selectionAsync();
    try {
      await Clipboard.setStringAsync(shareUrl);
      if (!mountedRef.current) return;
      setCopied(true);
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => { if (mountedRef.current) setCopied(false); }, 2000);
    } catch (error) {
      logger.handledError('Could not copy story link', error);
      toast('We couldn’t copy the link. Please try again.', 'error');
    }
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `Check out this story on Memento: ${shareUrl}`,
        url: shareUrl,
      });
    } catch (error) {
      logger.handledError('Native share failed', error);
      toast('We couldn’t share this story. Please try again.', 'error');
    }
  };

  const handleAddAnother = () => {
    closeSheet();
    setTimeout(() => openSheet('create-memory'), 300);
  };

  return (
    <View className="flex-1 pb-8">
      <SheetHeader
        title="Story added"
        onClose={closeSheet}
        closeLabel="Close share"
        style={{ marginBottom: SHEET_GROUP_GAP }}
      />

      <BottomSheetScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: SHEET_GROUP_GAP }}>
        <View className="bg-fill-weaker border border-stroke-weaker rounded-2xl p-5 gap-6">
          {/* Link Copy Box */}
          <View className="gap-2">
            <Text className="text-text-strong" style={TYPE.label}>
              Share link
            </Text>
            <View className="flex-row items-stretch bg-card border border-stroke-weaker rounded-xl overflow-hidden h-12">
              <View className="flex-1 justify-center px-4">
                <Text className="text-text-strong truncate" numberOfLines={1} style={TYPE.body}>
                  {shareUrl}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleCopy}
                className="flex-row items-center justify-center gap-1.5 px-4 bg-fill-weaker border-l border-stroke-weaker"
              >
                {copied ? <CheckCircle2 size={16} color={COLORS.brand} /> : <Copy size={16} color={COLORS.brand} />}
                <Text className="text-brand" style={TYPE.buttonSmall}>
                  {copied ? 'Copied' : 'Copy'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Native Share Button */}
          <View className="gap-3">
            <View className="flex-row items-center gap-3">
              <View className="h-px flex-1 bg-stroke-weaker" />
              <Text className="text-text-weak" style={TYPE.metadata}>Or share natively</Text>
              <View className="h-px flex-1 bg-stroke-weaker" />
            </View>
            <Button variant="outline" onPress={handleShare} className="h-12 rounded-xl bg-card border-stroke-weak">
              <ShareIcon size={18} color={COLORS.textBase} className="mr-2" />
              <Text className="text-text-strong" style={TYPE.button}>Share Options...</Text>
            </Button>
          </View>
        </View>

        {/* Footer Actions */}
        <View className="flex-row gap-3">
          <Button variant="outline" size="lg" rounded="full" className="h-14 flex-1" onPress={closeSheet}>
            Dismiss
          </Button>
          <Button
            size="lg"
            rounded="full"
            className="h-14 flex-1"
            leftIcon={<Plus size={18} color={COLORS.textInverse} />}
            onPress={handleAddAnother}
          >
            Add Story
          </Button>
        </View>
      </BottomSheetScrollView>
    </View>
  );
}
