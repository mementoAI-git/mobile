import React, { useCallback, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import dayjs from 'dayjs';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import MoreVertical from 'lucide-react-native/icons/ellipsis-vertical';
import Mic from 'lucide-react-native/icons/mic';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { SignedAttachmentImage } from '@/components/ui/SignedAttachmentImage';
import { TYPE } from '@/constants/typography';
import { getQuestionIdenticonUrl } from '@/features/explore/question-presentation';
import { getMediaCategory } from '@/features/media/media-type';
import { canRenderAttachmentUri } from '@/features/media/media-runtime-policy';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useUiStore } from '@/store';
import type { IMemory } from '@/types';

const THUMBNAIL_SIZE = 40;
const THUMBNAIL_STYLE = { width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE, borderRadius: 8 } as const;

/** The story's own image (or a video's poster) when it has one; otherwise null. */
export function findStoryThumbnail(memory: IMemory) {
  return memory.attachments?.find((attachment) => {
    if (attachment.thumbnail) return true;
    return canRenderAttachmentUri(attachment.url)
      && getMediaCategory({ mimeType: attachment.type, name: attachment.name, uri: attachment.url }) === 'image';
  }) ?? null;
}

/** Story thumbnail first; the DiceBear identicon seeded by the story id otherwise, or if the image fails. */
const StoryThumbnail = React.memo(function StoryThumbnail({ memory }: { memory: IMemory }) {
  const COLORS = useThemeColors();
  const attachment = useMemo(() => findStoryThumbnail(memory), [memory]);
  const [failed, setFailed] = useState(false);
  const handleError = useCallback(() => setFailed(true), []);
  const background = { backgroundColor: COLORS.fillWeak };

  if (attachment && !failed) {
    return (
      <SignedAttachmentImage
        attachment={attachment}
        context={{ memory_id: memory._id }}
        preferThumbnail
        resizeMode="cover"
        style={[THUMBNAIL_STYLE, background]}
        onError={handleError}
      />
    );
  }
  return (
    <Image
      source={{ uri: getQuestionIdenticonUrl(memory._id) }}
      style={[THUMBNAIL_STYLE, background]}
      contentFit="cover"
      cachePolicy="disk"
      accessibilityIgnoresInvertColors
    />
  );
});

/** Recordings (voice notes and recorded conversations) carry an audio attachment. */
export function hasAudioAttachment(memory: IMemory) {
  return Boolean(memory.attachments?.some((attachment) =>
    getMediaCategory({ mimeType: attachment.type, name: attachment.name, uri: attachment.url }) === 'audio'));
}

function getStoryRowTitle(memory: IMemory): string {
  const promptText = (memory as IMemory & { prompt_text?: string }).prompt_text?.trim();
  if (memory.prompt_type && promptText) return promptText;
  return memory.title?.trim() || 'Untitled story';
}

export const StoryListRow = React.memo(function StoryListRow({ memory, onOpen }: {
  memory: IMemory;
  onOpen: (id: string) => void;
}) {
  const COLORS = useThemeColors();
  const title = getStoryRowTitle(memory);
  const date = memory.created_at ? dayjs(memory.created_at).format('MMM DD, YYYY') : '';
  const isRecording = useMemo(() => hasAudioAttachment(memory), [memory]);

  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const handlePressIn = useCallback(() => { scale.value = withSpring(0.97); }, [scale]);
  const handlePressOut = useCallback(() => { scale.value = withSpring(1); }, [scale]);

  const handlePress = useCallback(() => {
    Haptics.selectionAsync();
    onOpen(memory._id);
  }, [onOpen, memory._id]);

  const handleActions = useCallback(() => {
    Haptics.selectionAsync();
    useUiStore.getState().openSheet('memory-actions', { memory });
  }, [memory]);

  return (
    <Animated.View
      style={[animStyle, {
        backgroundColor: COLORS.fillWeak,
        borderColor: COLORS.strokeWeak,
        borderWidth: 1,
        borderRadius: 16,
      }]}
    >
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={`Story: ${title}${date ? `, ${date}` : ''}${isRecording ? ', recording' : ''}`}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingRight: 64, minHeight: 74 }}
      >
        <StoryThumbnail memory={memory} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text numberOfLines={1} style={[TYPE.bodyStrong, { color: COLORS.textStrong }]}>
            {title}
          </Text>
          {date || isRecording ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {date ? (
                <Text style={[TYPE.metadata, { color: COLORS.textWeak }]} className="uppercase tracking-widest">
                  {date}
                </Text>
              ) : null}
              {/* Recordings: a mic after the date, separated by a dot. */}
              {isRecording ? (
                <>
                  {date ? <Text style={[TYPE.metadata, { color: COLORS.textWeak }]}>·</Text> : null}
                  <Mic size={12} color={COLORS.textWeak} strokeWidth={2} accessibilityLabel="Recording" />
                </>
              ) : null}
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={handleActions}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel={`Options for ${title}`}
        style={{
          position: 'absolute',
          right: 12,
          top: '50%',
          marginTop: -22,
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MoreVertical size={18} color={COLORS.textStrong} />
      </TouchableOpacity>
    </Animated.View>
  );
});
