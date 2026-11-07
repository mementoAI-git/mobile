import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import dayjs from 'dayjs';
import BookOpen from 'lucide-react-native/icons/book-open';
import MessageCircle from 'lucide-react-native/icons/message-circle';
import { Pressable } from '@/components/ui/Touchable';
import { SignedAttachmentImage } from '@/components/ui/SignedAttachmentImage';
import { TYPE } from '@/constants/typography';
import type { ThemeColors } from '@/constants/tokens';
import { mementoRoute, type MementoLink } from '@/features/chat/memento-links';
import { useMemory } from '@/hooks/queries/use-memories';
import { useThemeColors, useThemeStyles } from '@/hooks/use-theme-colors';

type Source = MementoLink & { label: string };

type Attachment = { _id?: string; url?: string; thumbnail?: string | null; type?: string; access?: never };

/** The first picture on a story, for its thumbnail. */
function pictureOf(attachments: unknown): Attachment | null {
  if (!Array.isArray(attachments)) return null;
  for (const file of attachments as Attachment[]) {
    if (file && typeof file === 'object' && file.url && (file.thumbnail || file.type?.startsWith('image'))) return file;
  }
  return null;
}

function OpenIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path
        d="M6 6H10V10M10 6L6 10M14.667 8A6.667 6.667 0 1 1 1.333 8a6.667 6.667 0 0 1 13.334 0Z"
        stroke={color}
        strokeWidth={1.333}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** A story or conversation a reply pointed to, as a card that opens it. */
export function ChatStoryCard({ source }: { source: Source }) {
  const COLORS = useThemeColors();
  const styles = useThemeStyles(createStyles);
  const { data } = useMemory(source.kind === 'story' ? source.id : '');
  const memory = data as { title?: string; created_at?: string; attachments?: unknown } | undefined;
  const picture = pictureOf(memory?.attachments);
  const title = memory?.title?.trim() || source.label;
  const kind = source.kind === 'story' ? 'Story' : 'Conversation';
  const date = memory?.created_at && dayjs(memory.created_at).isValid() ? dayjs(memory.created_at).format('MMM D, YYYY') : null;
  const Icon = source.kind === 'story' ? BookOpen : MessageCircle;
  return (
    <Pressable
      onPress={() => router.push(mementoRoute(source))}
      accessibilityRole="link"
      accessibilityLabel={`Open ${kind.toLowerCase()}: ${title}`}
      style={styles.card}
    >
      <View style={styles.thumb}>
        {picture ? (
          <SignedAttachmentImage
            attachment={{ _id: picture._id ?? picture.url!, url: picture.url!, thumbnail: picture.thumbnail, access: picture.access }}
            preferThumbnail
            style={styles.picture}
            resizeMode="cover"
          />
        ) : (
          <Icon size={16} color={COLORS.textWeak} strokeWidth={1.8} />
        )}
      </View>
      <View style={styles.words}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {date ? `${kind} · ${date}` : kind}
        </Text>
      </View>
      <OpenIcon color={COLORS.textStrong} />
    </Pressable>
  );
}

const createStyles = (COLORS: ThemeColors) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      width: 236,
      maxWidth: '100%',
      height: 56,
      padding: 8,
      paddingRight: 12,
      borderRadius: 12,
      backgroundColor: COLORS.fillWeak,
    },
    thumb: {
      width: 40,
      height: 40,
      borderRadius: 6,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.fillWeak,
    },
    picture: { width: 40, height: 40 },
    words: { flex: 1, minWidth: 0 },
    title: { ...TYPE.bodyStrong, color: COLORS.textStrong },
    subtitle: { ...TYPE.metadata, color: COLORS.textWeak },
  });
