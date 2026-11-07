import { useThemeColors, useThemeStyles } from '@/hooks/use-theme-colors';
import React, { useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, Image, Linking, StyleSheet } from 'react-native';
import { Pressable, TouchableOpacity } from '@/components/ui/Touchable';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { cn } from '@/lib/utils';
import type { IMessage } from '@/types';
import dayjs from 'dayjs';
import { COLORS, FONTS, type ThemeColors } from '@/constants/tokens';
import { TYPE, TYPE_METRICS } from '@/constants/typography';
import { splitMessageBlocks, tokenizeMessageMarkdown } from '@/features/chat/message-markdown';
import { collectReplySources, mementoRoute, parseMementoPath, splitConfirmations } from '@/features/chat/memento-links';
import { ChatConfirmCard } from './ChatConfirmCard';
import { ChatDoneCard } from './ChatDoneCard';
import { ChatStoryCard } from './ChatStoryCard';
import { router } from 'expo-router';
import FileText from 'lucide-react-native/icons/file-text';
import Music from 'lucide-react-native/icons/music';
import Play from 'lucide-react-native/icons/play';
import ExternalLink from 'lucide-react-native/icons/external-link';
import { useMessageActions } from './MessageActionsProvider';
import { MESSAGE_LONG_PRESS_MS, getMessageReactionKey } from '@/features/chat/message-actions';
import { getChatMessageKey } from '@/features/chat/message-list';
import { useAuthStore } from '@/store/auth.store';
import { useMessageReactionsStore } from '@/store/message-reactions.store';
import type { PreviewAttachment } from '@/components/ui/MediaPreviewModal';
import { VideoThumbnail } from '@/components/ui/VideoThumbnail';
import { SignedAttachmentImage } from '@/components/ui/SignedAttachmentImage';
import { useLinkPreview, type LinkPreviewData } from '@/hooks/use-link-preview';
import { Image as ExpoImage } from 'expo-image';
import { getMediaCategory, inferMediaMimeType } from '@/features/media/media-type';
import { getAttachmentPreviewKind } from '@/features/media/media-runtime-policy';
import type { SignedMediaAccessMetadata } from '@/features/media/signed-media-access';
import { iconSize, radius, minTouchTarget, responsiveSpace, ms } from '@/constants/responsive';

// ─── Backward-compat helpers for old messages ────────────────────────────────

const REPLY_WRAPPER_RE = /^\[The user is repl[^[]*\n---\]\n\n/s;
const REPLY_EXTRACT_RE = /^\[The user is replying to ([^\n]+):\n---\n([\s\S]*?)\n---\]\n\n/;

function stripReplyWrapper(text: string): string {
  return text.replace(REPLY_WRAPPER_RE, '').trim();
}

function extractReplyQuote(text: string): { role: string; text: string } | null {
  const m = text.match(REPLY_EXTRACT_RE);
  if (!m) return null;
  return { role: m[1].toLowerCase().includes('user') ? 'user' : 'ai', text: m[2].trim() };
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ChatAttachmentPreviewRequest {
  attachments: PreviewAttachment[];
  initialIndex: number;
}

type ChatAttachment = {
  url: string;
  name: string;
  type?: string;
  _id?: string;
  thumbnail?: string | null;
  access?: SignedMediaAccessMetadata;
};

interface MessageBubbleProps {
  message: IMessage | {
    role: string;
    text: string;
    created_at?: string;
    ai_model?: string;
    _id?: string;
    replyTo?: { role: string; text: string };
    attatchments?: ChatAttachment[];
  };
  onReply?: () => void;
  onScrollToOriginal?: () => void;
  onPreviewAttachments?: (request: ChatAttachmentPreviewRequest) => void;
  highlighted?: boolean;
  animated?: boolean;
}

// ─── Attachment helpers ────────────────────────────────────────────────────────

function toPreviewAttachment(a: ChatAttachment, idx: number): PreviewAttachment {
  return {
    clientId: a._id ?? `att_${idx}`,
    uri: a.url,
    name: a.name,
    mimeType: inferMediaMimeType({ mimeType: a.type, name: a.name, uri: a.url }),
    thumbnailUrl: a.thumbnail ?? null,
    persistedFileId: a._id,
    access: a.access,
  };
}

// ─── Single file chip ──────────────────────────────────────────────────────────

function AttachmentTile({ attachment, onPress }: {
  attachment: ChatAttachment;
  onPress: () => void;
}) {
  const COLORS = useThemeColors();
  const cat = getMediaCategory({ mimeType: attachment.type, name: attachment.name, uri: attachment.url });
  const previewKind = getAttachmentPreviewKind({ category: cat, uri: attachment.url });

  if (previewKind === 'image') {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        <SignedAttachmentImage
          attachment={{
            _id: attachment._id ?? attachment.url,
            url: attachment.url,
            thumbnail: attachment.thumbnail,
            access: attachment.access,
          }}
          style={{ width: ms(120, 0.2), height: ms(120, 0.2), borderRadius: radius(12) }}
          resizeMode="cover"
        />
      </TouchableOpacity>
    );
  }

  if (previewKind === 'video') {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        <View style={{ width: ms(120, 0.2), height: ms(120, 0.2), borderRadius: radius(12), backgroundColor: COLORS.textStrong, alignItems: 'center', justifyContent: 'center' }}>
          <Play size={iconSize(28)} color="#fff" fill="#fff" strokeWidth={0} style={{ marginLeft: 4 }} />
          <Text style={{ ...TYPE.eyebrow, color: 'rgba(255,255,255,0.7)', marginTop: 4 }} numberOfLines={1}>{attachment.name}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  if (previewKind === 'placeholder') {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        <AttachmentPlaceholder name={attachment.name} width={ms(120, 0.2)} height={ms(120, 0.2)} borderRadius={radius(12)} />
      </TouchableOpacity>
    );
  }

  const Icon = cat === 'audio' ? Music : FileText;
  const shortName = attachment.name.length > 20 ? `${attachment.name.slice(0, 18)}…` : attachment.name;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: responsiveSpace(8), paddingHorizontal: responsiveSpace(12), paddingVertical: responsiveSpace(8), borderRadius: radius(12), backgroundColor: COLORS.fillWeak, borderWidth: 1, borderColor: COLORS.strokeWeaker, maxWidth: 200 }}>
        <View style={{ width: ms(32, 0.2), height: ms(32, 0.2), borderRadius: radius(8), backgroundColor: `${COLORS.brand}12`, alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={iconSize(16)} color={COLORS.brand} strokeWidth={1.8} />
        </View>
        <Text style={{ ...TYPE.metadata, color: COLORS.textStrong, flex: 1 }} numberOfLines={1}>{shortName}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Link preview chip ─────────────────────────────────────────────────────────

const CHIP_BG = COLORS.linkPreview;

function FaviconBadge({ url, hostname }: { url: string; hostname: string }) {
  const [failed, setFailed] = React.useState(false);
  const letter = hostname.charAt(0).toUpperCase();

  useEffect(() => setFailed(false), [url]);

  if (!url || failed) {
    return (
      <View style={{ width: 22, height: 22, borderRadius: 5, backgroundColor: 'rgba(0,0,0,0.15)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Text style={{ ...TYPE.metadata, color: 'white' }}>{letter}</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: url }}
      style={{ width: 22, height: 22, borderRadius: 5, flexShrink: 0, backgroundColor: 'rgba(255,255,255,0.15)' }}
      resizeMode="contain"
      onError={() => setFailed(true)}
    />
  );
}

function shortenUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    const path = parsed.pathname;
    if (path.length > 20) {
      return `${host}${path.slice(0, 15)}…`;
    }
    return `${host}${path}`;
  } catch {
    return url.length > 35 ? `${url.slice(0, 32)}…` : url;
  }
}

function isMessageOnlyUrl(text: string): boolean {
  const trimmed = text.trim();
  const regex = /^https?:\/\/[^\s]+$/i;
  return regex.test(trimmed);
}

export function parseFormattedMessage(text: string, isUser?: boolean, styles = createStyles(COLORS)): React.ReactNode[] {
  const tokens = tokenizeMessageMarkdown(text);
  if (tokens.length === 0) {
    return [text];
  }

  return tokens.map((token, index) => {
    switch (token.type) {
      case 'text':
        return token.text;

      case 'italic':
        return (
          <Text key={index} style={styles.markdownItalic}>
            {token.text}
          </Text>
        );

      case 'bold':
        return (
          <Text key={index} style={[styles.markdownBold, isUser && TYPE_METRICS.bodyLarge]}>
            {token.text}
          </Text>
        );

      case 'bold_italic':
        return (
          <Text key={index} style={[styles.markdownBoldItalic, isUser && TYPE_METRICS.bodyLarge]}>
            {token.text}
          </Text>
        );

      case 'code':
        return (
          <Text key={index} style={[styles.markdownCode, isUser && TYPE_METRICS.bodyLarge]}>
            {token.text}
          </Text>
        );

      case 'strikethrough':
        return (
          <Text key={index} style={styles.markdownStrikethrough}>
            {token.text}
          </Text>
        );

      case 'highlight':
        return (
          <Text key={index} style={styles.markdownHighlight}>
            {token.text}
          </Text>
        );

      case 'link': {
        const memento = parseMementoPath(token.url);
        return (
          <Text
            key={index}
            style={memento ? styles.mementoLink : styles.markdownLink}
            accessibilityRole="link"
            accessibilityLabel={memento ? `Open ${memento.kind}: ${token.label}` : undefined}
            onPress={() =>
              memento ? router.push(mementoRoute(memento)) : Linking.openURL(token.url).catch(() => {})
            }
          >
            {token.label}
          </Text>
        );
      }

      case 'url': {
        const shortened = shortenUrl(token.url);
        return (
          <Text
            key={index}
            style={styles.markdownLink}
            onPress={() => Linking.openURL(token.url).catch(() => {})}
          >
            {shortened}
          </Text>
        );
      }

      default:
        return null;
    }
  });
}

const parseTextWithLinks = parseFormattedMessage;

type BubbleStyles = ReturnType<typeof createStyles>;

/** A message as Markdown blocks: paragraphs, headings, lists and quotes. */
function FormattedMessage({
  content,
  isUser,
  styles,
  textStyle,
  numberOfLines,
}: {
  content: string;
  isUser: boolean;
  styles: BubbleStyles;
  textStyle: React.ComponentProps<typeof Text>['style'];
  numberOfLines?: number;
}) {
  const blocks = splitMessageBlocks(content);
  if (blocks.length <= 1 && (!blocks[0] || blocks[0].type === 'paragraph')) {
    return (
      <Text style={textStyle} numberOfLines={numberOfLines}>
        {parseFormattedMessage(content, isUser, styles)}
      </Text>
    );
  }
  return (
    <View style={styles.blocks}>
      {blocks.map((block, index) => {
        const inline = parseFormattedMessage(block.text, isUser, styles);
        switch (block.type) {
          case 'heading':
            return (
              <Text key={index} accessibilityRole="header" style={[textStyle, styles.markdownBold, block.level <= 2 && styles.heading]}>
                {inline}
              </Text>
            );
          case 'bullet':
          case 'ordered':
            return (
              <View key={index} style={[styles.listRow, { paddingLeft: block.depth * 14 }]}>
                <Text style={[textStyle, styles.listMarker]} accessibilityElementsHidden importantForAccessibility="no">
                  {block.type === 'bullet' ? '\u2022' : block.marker}
                </Text>
                <Text style={[textStyle, styles.listText]}>{inline}</Text>
              </View>
            );
          case 'quote':
            return (
              <View key={index} style={styles.quoteBlock}>
                <Text style={[textStyle, styles.markdownItalic]}>{inline}</Text>
              </View>
            );
          default:
            return (
              <Text key={index} style={textStyle}>
                {inline}
              </Text>
            );
        }
      })}
    </View>
  );
}

/** The stories and conversations a reply pointed to, as cards under it. */
function ReplySources({ text, styles }: { text: string; styles: BubbleStyles }) {
  const sources = collectReplySources(text);
  if (!sources.length) return null;
  return (
    <View style={styles.sourcesRow} accessibilityLabel="Sources">
      {sources.map((source) => (
        <ChatStoryCard key={source.id} source={source} />
      ))}
    </View>
  );
}

function LinkPreviewChip({ preview }: { preview: LinkPreviewData }) {
  const COLORS = useThemeColors();
  const handlePress = useCallback(() => {
    Linking.openURL(preview.url).catch(() => {});
  }, [preview.url]);

  if (!preview.loaded) {
    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7} style={{ marginTop: 4 }}>
        <Text style={{ ...TYPE.metadata, color: COLORS.linkPreview, textDecorationLine: 'underline' }} numberOfLines={1}>
          {shortenUrl(preview.url)}
        </Text>
      </TouchableOpacity>
    );
  }

  const hasImage = Boolean(preview.imageUrl);

  return (
    <View style={{ marginTop: 4 }}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.85}
        style={{
          borderRadius: 14,
          backgroundColor: COLORS.linkPreview,
          overflow: 'hidden',
          flexDirection: hasImage ? 'row' : 'column',
          padding: 8,
          gap: 6,
        }}
      >
        {hasImage && (
          <ExpoImage
            source={{ uri: preview.imageUrl! }}
            style={{ width: 64, height: 64, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)' }}
            contentFit="cover"
          />
        )}
        <View style={{ flexShrink: 1, justifyContent: 'center', gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <FaviconBadge url={preview.faviconUrl} hostname={preview.hostname} />
            <Text style={{ ...TYPE.eyebrow, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.5 }} numberOfLines={1}>
              {preview.hostname}
            </Text>
          </View>
          <Text style={{ ...TYPE.metadata, color: '#ffffff' }} numberOfLines={1}>
            {preview.title || 'Link'}
          </Text>
          {preview.description && (
            <Text style={{ ...TYPE.eyebrow, color: 'rgba(255,255,255,0.9)' }} numberOfLines={2}>
              {preview.description}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

// Wrapper component that calls the hook
function LinkPreviews({ text }: { text: string }) {
  const previews = useLinkPreview(text);
  if (previews.length === 0) return null;
  return (
    <View style={{ gap: 2 }}>
      {previews.map(p => <LinkPreviewChip key={p.url} preview={p} />)}
    </View>
  );
}

// ─── Chat media layouts ──────────────────────────────────────────────────────
//
// 1-3 images or videos → tilted stack outside the bubble, first item in front
// 4+ images → 2×2 grid in the bubble, +N counter on the final darkened tile

const BUBBLE_MAX_W = 260;
const GRID_GAP = 3;
const MAX_STACKED_MEDIA = 3;
const STACK_W = 240;
const STACK_TILE_SIZE = Math.round(STACK_W * 0.58);
const STACK_TILE_RADIUS = 18;
const SINGLE_TILE_W = 220;

// Offsets are fractions of the stack size. They leave room for the rotated corners.
const STACK_LAYOUTS: Record<number, { height: number; slots: { left: number; top: number; rotate: string }[] }> = {
  2: {
    height: STACK_W,
    slots: [
      { left: 0.05, top: 0.36, rotate: '-6deg' },
      { left: 0.37, top: 0.05, rotate: '8deg' },
    ],
  },
  3: {
    height: Math.round(STACK_W * (4 / 3)),
    slots: [
      { left: 0.05, top: 0.26, rotate: '-6deg' },
      { left: 0.37, top: 0.03, rotate: '8deg' },
      { left: 0.36, top: 0.52, rotate: '8deg' },
    ],
  },
};

function isVisualAttachment(attachment: ChatAttachment) {
  return ['image', 'video'].includes(getMediaCategory({ mimeType: attachment.type, name: attachment.name, uri: attachment.url }));
}

function getStackedMedia(attachments: ChatAttachment[]) {
  const media = attachments.filter(isVisualAttachment);
  return media.length <= MAX_STACKED_MEDIA ? media : [];
}

function AttachmentPlaceholder({
  name,
  width,
  height,
  borderRadius,
}: {
  name: string;
  width: number;
  height: number;
  borderRadius: number;
}) {
  const COLORS = useThemeColors();
  return (
    <View style={{
      width,
      height,
      borderRadius,
      backgroundColor: COLORS.fillWeak,
      borderWidth: 1,
      borderColor: COLORS.strokeWeaker,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
      gap: 6,
    }}>
      <FileText size={22} color={COLORS.textWeak} strokeWidth={1.8} />
      <Text style={{ ...TYPE.eyebrow, color: COLORS.textWeak, textAlign: 'center' }} numberOfLines={2}>
        {name || 'Preview unavailable'}
      </Text>
    </View>
  );
}

const MediaPreviewTile = React.memo(function MediaPreviewTile({
  attachment: a,
  width,
  height,
  borderRadius,
  onPress,
}: {
  attachment: ChatAttachment;
  width: number,
  height: number,
  borderRadius: number,
  onPress: () => void,
}) {
  const category = getMediaCategory({ mimeType: a.type, name: a.name, uri: a.url });
  const previewKind = getAttachmentPreviewKind({ category, uri: a.url });

  if (previewKind === 'placeholder') {
    return <AttachmentPlaceholder name={a.name} width={width} height={height} borderRadius={borderRadius} />;
  }

  if (previewKind === 'video') {
    return (
      <VideoThumbnail
        uri={a.url}
        attachment={{
          _id: a._id ?? a.url,
          url: a.url,
          thumbnail: a.thumbnail,
          access: a.access,
        }}
        thumbnailUrl={a.thumbnail}
        width={width}
        height={height}
        borderRadius={borderRadius}
        onPress={onPress}
      />
    );
  }

  return (
    <SignedAttachmentImage
      attachment={{
        _id: a._id ?? a.url,
        url: a.url,
        thumbnail: a.thumbnail,
        access: a.access,
      }}
      style={{ width, height, borderRadius }}
      resizeMode="cover"
    />
  );
});

function StackTile({
  attachment,
  width,
  height,
  rotate,
  position,
  zIndex,
  onPress,
}: {
  attachment: ChatAttachment;
  width: number;
  height: number;
  rotate: string;
  position?: { left: number; top: number };
  zIndex?: number;
  onPress: () => void;
}) {
  const styles = useThemeStyles(createStyles);
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Open ${attachment.name || 'attachment'}`}
      style={[
        styles.stackTile,
        { width, height, transform: [{ rotate }] },
        position && { position: 'absolute', ...position, zIndex, elevation: zIndex ? 6 : 3 },
      ]}
    >
      <MediaPreviewTile attachment={attachment} width={width} height={height} borderRadius={STACK_TILE_RADIUS} onPress={onPress} />
      <View pointerEvents="none" style={styles.stackTileEdge} />
    </TouchableOpacity>
  );
}

function AttachmentStack({ attachments, onTap }: {
  attachments: ChatAttachment[];
  onTap: (index: number) => void;
}) {
  const media = getStackedMedia(attachments);
  if (media.length === 0) return null;

  if (media.length === 1) {
    const origIdx = attachments.indexOf(media[0]);
    return (
      <View style={{ padding: 8 }}>
        <StackTile
          attachment={media[0]}
          width={SINGLE_TILE_W}
          height={Math.round(SINGLE_TILE_W * (3 / 4))}
          rotate="-2deg"
          onPress={() => onTap(origIdx)}
        />
      </View>
    );
  }

  const layout = STACK_LAYOUTS[media.length];
  return (
    <View style={{ width: STACK_W, height: layout.height }}>
      {media.map((a, i) => {
        const origIdx = attachments.indexOf(a);
        const slot = layout.slots[i];
        return (
          <StackTile
            key={a._id ?? origIdx}
            attachment={a}
            width={STACK_TILE_SIZE}
            height={STACK_TILE_SIZE}
            rotate={slot.rotate}
            position={{ left: slot.left * STACK_W, top: slot.top * layout.height }}
            zIndex={i === 0 ? 1 : 0}
            onPress={() => onTap(origIdx)}
          />
        );
      })}
    </View>
  );
}

function AttachmentGrid({ attachments, onTap }: {
  attachments: ChatAttachment[];
  onTap: (index: number) => void;
}) {
  const mediaItems = attachments.filter(isVisualAttachment);
  const fileItems = attachments.filter(a => !isVisualAttachment(a));
  const count = mediaItems.length;
  const showGrid = count > MAX_STACKED_MEDIA;
  if (!showGrid && fileItems.length === 0) return null;

  let imageSection: React.ReactNode = null;

  if (showGrid) {
    // 4+ images — 2×2 grid, first 4 visible, +N counter on the 4th tile overlay
    const tileW = Math.floor((BUBBLE_MAX_W - GRID_GAP) / 2);
    const tileH = Math.round(tileW * (3 / 4));
    const visible = mediaItems.slice(0, 4);
    const overflow = count - 4;
    const rows = [visible.slice(0, 2), visible.slice(2, 4)];
    imageSection = (
      <View style={{ gap: GRID_GAP }}>
        {rows.map((row, rowIdx) => (
          <View key={rowIdx} style={{ flexDirection: 'row', gap: GRID_GAP }}>
            {row.map((a, colIdx) => {
              const globalIdx = rowIdx * 2 + colIdx;
              const origIdx = attachments.indexOf(a);
              const isLast = globalIdx === 3;
              const showOverlay = isLast && overflow > 0;
              return (
                <TouchableOpacity key={a._id ?? origIdx} onPress={() => onTap(origIdx)} activeOpacity={0.85} style={{ position: 'relative' }}>
                  <MediaPreviewTile attachment={a} width={tileW} height={tileH} borderRadius={10} onPress={() => onTap(origIdx)} />
                  {showOverlay && (
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.62)', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ ...TYPE.uiTitle, color: '#fff' }}>+{overflow}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={{ gap: 4, marginBottom: 4 }}>
      {imageSection}
      {fileItems.map((a) => {
        const origIdx = attachments.indexOf(a);
        return <AttachmentTile key={a._id ?? origIdx} attachment={a} onPress={() => onTap(origIdx)} />;
      })}
    </View>
  );
}

// ─── MessageBubble ─────────────────────────────────────────────────────────────

export const MessageBubble = React.memo(function MessageBubble({
  message,
  onReply,
  onScrollToOriginal,
  onPreviewAttachments,
  highlighted = false,
  animated = false,
}: MessageBubbleProps) {
  const COLORS = useThemeColors();
  const styles = useThemeStyles(createStyles);
  const isUser = message.role === 'user';
  const rawAttachments: ChatAttachment[] =
    (message as any).attachments ?? (message as any).attatchments ?? [];

  const rawContent = message.text || (message as any).content || '';
  const replyQuote: { role: string; text: string } | null =
    (message as any).replyTo ?? (isUser ? extractReplyQuote(rawContent) : null);
  // Memento's confirmation cards are shown as buttons, not as text.
  const { text: content, cards, dones } = useMemo(
    () => (isUser ? { text: stripReplyWrapper(rawContent), cards: [], dones: [] } : splitConfirmations(rawContent)),
    [isUser, rawContent],
  );
  const surfaceRef = useRef<View>(null);
  const openActions = useMessageActions();
  const userId = useAuthStore((state) => state.user?._id ?? 'guest');
  const reactionKey = getMessageReactionKey(userId, getChatMessageKey({ ...message, text: rawContent }));
  const reaction = useMessageReactionsStore((state) => state.reactions[reactionKey]);
  const handleOpenActions = useCallback(() => {
    if (!surfaceRef.current) return;
    openActions?.({ view: surfaceRef.current, text: content, reactionKey, onReply });
  }, [content, onReply, openActions, reactionKey]);
  const handleAccessibilityAction = useCallback((event: { nativeEvent: { actionName: string } }) => {
    if (event.nativeEvent.actionName === 'activate' || event.nativeEvent.actionName === 'longpress') handleOpenActions();
  }, [handleOpenActions]);
  const responseTime = 'created_at' in message && message.created_at
    ? dayjs(message.created_at).format('h:mma')
    : null;

  const previewAttachments: PreviewAttachment[] = useMemo(
    () => rawAttachments.map(toPreviewAttachment),
    [rawAttachments],
  );

  const hasContent = content.trim().length > 0 || rawAttachments.length > 0 || cards.length > 0 || dones.length > 0;
  const isOnlyUrl = content.trim().length > 0 && isMessageOnlyUrl(content);

  // Must be declared before any early return (Rules of Hooks)
  const handleAttachmentTap = useCallback((index: number) => {
    onPreviewAttachments?.({ attachments: previewAttachments, initialIndex: index });
  }, [onPreviewAttachments, previewAttachments]);

  if (!hasContent) return null;

  const stackedMedia = getStackedMedia(rawAttachments);
  const hasStack = stackedMedia.length > 0;
  const hasInlineAttachments = rawAttachments.length > stackedMedia.length;
  const surfaceStyle = [
    styles.messageSurface,
    isUser ? styles.userSurface : styles.assistantSurface,
    isOnlyUrl && isUser && { backgroundColor: 'transparent', paddingHorizontal: 0, paddingVertical: 0 },
  ];
  const showSurface = !hasStack || Boolean(replyQuote?.text) || hasInlineAttachments || content.trim().length > 0 || cards.length > 0 || dones.length > 0;


  const Container = animated ? Animated.View : View;
  const containerProps = animated
    ? { entering: FadeIn.duration(150) }
    : {};

  return (
    <Container
      {...containerProps}
      style={[
        styles.messageContainer,
        highlighted && styles.messageContainerHighlighted,
        isUser ? styles.userMessageContainer : styles.assistantMessageContainer,
        isUser && rawAttachments.length > 0 && styles.userAttachmentContainer,
      ]}
    >
        <Pressable
          ref={surfaceRef}
          collapsable={false}
          accessible={Boolean(onReply)}
          accessibilityLabel={content || 'Message attachment'}
          onLongPress={onReply ? handleOpenActions : undefined}
          delayLongPress={MESSAGE_LONG_PRESS_MS}
          accessibilityHint="Touch and hold for reply, copy, and reactions"
          accessibilityActions={[{ name: 'longpress', label: 'Message actions' }]}
          onAccessibilityAction={handleAccessibilityAction}
          style={hasStack ? [styles.stackSurface, isUser ? styles.stackSurfaceUser : styles.stackSurfaceAssistant] : surfaceStyle}
        >
          {hasStack && <AttachmentStack attachments={rawAttachments} onTap={handleAttachmentTap} />}

          {showSurface && (
          <View style={hasStack ? surfaceStyle : undefined}>
          {/* Reply quote */}
          {replyQuote && replyQuote.text && (
            <TouchableOpacity
              onPress={onScrollToOriginal}
              activeOpacity={onScrollToOriginal ? 0.7 : 1}
              style={styles.replyQuote}
            >
              <Text numberOfLines={2} style={styles.replyQuoteText}>
                {replyQuote.text}
              </Text>
            </TouchableOpacity>
          )}

          {/* Attachments */}
          {hasInlineAttachments && (
            <AttachmentGrid attachments={rawAttachments} onTap={handleAttachmentTap} />
          )}

          {/* Message text */}
          {content.trim().length > 0 && !isOnlyUrl && (
            <View style={{ marginTop: hasInlineAttachments ? 4 : 0 }}>
              <FormattedMessage
                content={content}
                isUser={isUser}
                styles={styles}
                textStyle={[styles.messageText, isUser && TYPE.bodyLarge]}
                numberOfLines={isMessageOnlyUrl(content) ? 1 : undefined}
              />
            </View>
          )}

          {/* Link preview chips */}
          {content.trim().length > 0 && <LinkPreviews text={content} />}

          {dones.map((done, index) => (
            <ChatDoneCard key={done.action ?? `${done.tool}:${index}`} done={done} />
          ))}

          {cards.map((card) => (
            <ChatConfirmCard key={String(card.args.confirmation ?? card.text)} card={card} />
          ))}
          </View>
          )}
        </Pressable>

        {!isUser && content.trim().length > 0 && <ReplySources text={content} styles={styles} />}

        {reaction && (
          <Pressable
            onPress={handleOpenActions}
            accessibilityRole="button"
            accessibilityLabel={`Your reaction ${reaction}. Change reaction`}
            style={{ alignSelf: isUser ? 'flex-end' : 'flex-start', minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.fillWeak, borderRadius: 10, marginTop: 4 }}
          >
            <Text style={[TYPE.uiTitle, { transform: [{ scale: 0.8 }] }]}>{reaction}</Text>
          </Pressable>
        )}

        {/* Meta row */}
        <View style={[styles.metaRow, isUser ? styles.metaRowUser : styles.metaRowAssistant]}>
          {responseTime && <Text style={styles.timeLabel}>{responseTime}</Text>}
        </View>
    </Container>
  );
});

const createStyles = (COLORS: ThemeColors) => StyleSheet.create({
  messageContainer: { marginBottom: 14 },
  messageContainerHighlighted: {
    backgroundColor: COLORS.brandSubtle,
    borderColor: COLORS.brandTint,
    borderRadius: radius(12),
    borderWidth: 1,
    padding: 6,
  },
  userMessageContainer: { alignSelf: 'flex-end', maxWidth: '64%' },
  userAttachmentContainer: { maxWidth: '78%' },
  assistantMessageContainer: { alignSelf: 'flex-start', maxWidth: '88%' },
  messageSurface: { overflow: 'hidden' },
  stackSurface: { gap: 6 },
  stackSurfaceUser: { alignItems: 'flex-end' },
  stackSurfaceAssistant: { alignItems: 'flex-start' },
  stackTile: {
    borderRadius: STACK_TILE_RADIUS,
    backgroundColor: COLORS.background,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 3,
  },
  stackTileEdge: {
    ...StyleSheet.absoluteFill,
    borderColor: COLORS.strokeWeaker,
    borderRadius: STACK_TILE_RADIUS,
    borderWidth: 1,
  },
  userSurface: {
    backgroundColor: COLORS.fillChatUser,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  assistantSurface: { backgroundColor: COLORS.fillWeak, borderRadius: 14, padding: 10 },
  messageText: {
    color: COLORS.textStrong,
    ...TYPE.body,
    lineHeight: 20,
  },
  markdownItalic: {
    fontStyle: 'italic',
  },
  markdownBold: {
    ...TYPE.bodyStrong,
  },
  markdownBoldItalic: {
    ...TYPE.bodyStrong,
    fontStyle: 'italic',
  },
  markdownCode: {
    ...TYPE.mono,
    backgroundColor: COLORS.fillWeak,
    color: COLORS.brand,
  },
  markdownStrikethrough: {
    textDecorationLine: 'line-through',
  },
  markdownHighlight: {
    backgroundColor: 'rgba(233, 130, 70, 0.18)',
  },
  markdownLink: {
    color: COLORS.linkPreview,
    textDecorationLine: 'underline',
  },
  mementoLink: {
    ...TYPE.bodyStrong,
    color: COLORS.linkPreview,
    textDecorationLine: 'underline',
  },
  blocks: { gap: 6 },
  heading: { ...TYPE.bodyStrong },
  listRow: { flexDirection: 'row', gap: 6 },
  listMarker: { minWidth: 14 },
  listText: { flex: 1 },
  quoteBlock: { borderLeftWidth: 3, borderLeftColor: COLORS.strokeWeak, paddingLeft: 8 },
  sourcesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6, maxWidth: '100%' },
  replyQuote: {
    backgroundColor: COLORS.strokeWeaker,
    borderLeftColor: COLORS.info,
    borderLeftWidth: 2,
    borderRadius: radius(4),
    marginBottom: 6,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  replyQuoteText: {
    color: COLORS.textStrong,
    ...TYPE.bodySmall,
    lineHeight: 18,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
    marginTop: 6,
    minHeight: 24,
  },
  metaRowUser: { justifyContent: 'flex-end' },
  metaRowAssistant: { justifyContent: 'flex-start' },
  timeLabel: {
    color: COLORS.textStrong,
    ...TYPE.bodySmall,
    lineHeight: 18,
  },

});
