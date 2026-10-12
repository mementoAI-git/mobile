import React, { useState } from 'react';
import { View, Text, Share } from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import X from 'lucide-react-native/icons/x';
import CheckCircle2 from 'lucide-react-native/icons/circle-check';
import Copy from 'lucide-react-native/icons/copy';
import ShareIcon from 'lucide-react-native/icons/share';
import Plus from 'lucide-react-native/icons/plus';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { Button } from '@/components/ui';
import { useUiStore } from '@/store';
import { logger } from '@/lib/logger';
import { publishedPostUrl } from '@/lib/env';

export function ShareMemorySheet() {
  const sheetProps = useUiStore((s) => s.sheetProps);
  const closeSheet = useUiStore((s) => s.closeSheet);
  const openSheet = useUiStore((s) => s.openSheet);
  const memoryId = sheetProps?.id;
  const [copied, setCopied] = useState(false);

  const shareUrl = publishedPostUrl(typeof memoryId === 'string' ? memoryId : undefined);

  const handleCopy = async () => {
    Haptics.selectionAsync();
    await Clipboard.setStringAsync(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `Check out this story on Memento: ${shareUrl}`,
        url: shareUrl,
      });
    } catch (error) {
      logger.error('Native share failed', error);
    }
  };

  const handleAddAnother = () => {
    closeSheet();
    setTimeout(() => openSheet('create-memory'), 300);
  };

  return (
    <View className="flex-1 px-5 pb-8 pt-2">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-text-strong" style={TYPE.sectionTitle}>
          Story added
        </Text>
        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync();
            closeSheet();
          }}
          accessibilityRole="button"
          accessibilityLabel="Close share"
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: COLORS.fillWeak,
          }}
          activeOpacity={0.7}
        >
          <X size={20} color={COLORS.textStrong} />
        </TouchableOpacity>
      </View>

      <BottomSheetScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 24 }}>
        <View className="gap-2">
          <Text className="text-text-weak" style={TYPE.bodySmall}>
            You have added a new story to your Memento. You can share it with others using the link below.
          </Text>
        </View>

        <View className="bg-fill-weaker border border-stroke-weaker rounded-2xl p-5 gap-6">
          {/* Link Copy Box */}
          <View className="gap-2">
            <Text className="text-text-strong" style={TYPE.label}>
              Share link
            </Text>
            <View className="flex-row items-stretch bg-white border border-stroke-weaker rounded-xl overflow-hidden h-12">
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
            <Button variant="outline" onPress={handleShare} className="h-12 rounded-xl bg-white border-stroke-weak">
              <ShareIcon size={18} color={COLORS.textBase} className="mr-2" />
              <Text className="text-text-strong" style={TYPE.button}>Share Options...</Text>
            </Button>
          </View>
        </View>

        {/* Footer Actions */}
        <View className="flex-row gap-3 pt-2">
          <Button variant="outline" className="flex-1 h-12 rounded-full border-stroke-weak" onPress={closeSheet}>
            <Text className="text-text-strong" style={TYPE.button}>Dismiss</Text>
          </Button>
          <Button className="flex-1 h-12 bg-brand rounded-full" onPress={handleAddAnother}>
            <Plus size={18} color="white" className="mr-1" />
            <Text className="text-white" style={TYPE.button}>Add Story</Text>
          </Button>
        </View>
      </BottomSheetScrollView>
    </View>
  );
}
