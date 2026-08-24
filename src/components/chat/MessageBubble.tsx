import React, { useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, Image, Linking, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { cn } from '@/lib/utils';
import type { IMessage } from '@/types';
import dayjs from 'dayjs';
import { COLORS, FONTS } from '@/constants/tokens';
import { CornerDownRight, FileText, Music, Play, ExternalLink, Copy } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { PreviewAttachment } from '@/components/ui/MediaPreviewModal';
import { VideoThumbnail } from '@/components/ui/VideoThumbnail';
import { useLinkPreview, type LinkPreviewData } from '@/hooks/use-link-preview';
import { Image as ExpoImage } from 'expo-image';
import { getMediaCategory, inferMediaMimeType } from '@/features/media/media-type';
import { getAttachmentPreviewKind } from '@/features/media/media-runtime-policy';

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

interface MessageBubbleProps {
  message: IMessage | {
    role: string;
    text: string;
    created_at?: string;
    ai_model?: string;
    _id?: string;
    replyTo?: { role: string; text: string };
    attatchments?: { url: string; name: string; type?: string; _id?: string }[];
  };
  onReply?: () => void;
  onScrollToOriginal?: () => void;
  onPreviewAttachments?: (request: ChatAttachmentPreviewRequest) => void;
  highlighted?: boolean;
  animated?: boolean;
}

// ─── Attachment helpers ────────────────────────────────────────────────────────

function toPreviewAttachment(a: { url: string; name: string; type?: string; _id?: string }, idx: number): PreviewAttachment {
  return {
    clientId: a._id ?? `att_${idx}`,
    uri: a.url,
    name: a.name,
    mimeType: inferMediaMimeType({ mimeType: a.type, name: a.name, uri: a.url }),
    thumbnailUrl: (a as any).thumbnail ?? null,
  };
}

// ─── Single file chip ──────────────────────────────────────────────────────────

function AttachmentTile({ attachment, onPress }: {
  attachment: { url: string; name: string; type?: string; _id?: string };
  onPress: () => void;
}) {
  const cat = getMediaCategory({ mimeType: attachment.type, name: attachment.name, uri: attachment.url });
  const previewKind = getAttachmentPreviewKind({ category: cat, uri: attachment.url });

  if (previewKind === 'image') {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        <Image source={{ uri: attachment.url }} style={{ width: 120, height: 120, borderRadius: 12 }} resizeMode="cover" />
      </TouchableOpacity>
    );
  }

  if (previewKind === 'video') {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        <View style={{ width: 120, height: 120, borderRadius: 12, backgroundColor: COLORS.textStrong, alignItems: 'center', justifyContent: 'center' }}>
          <Play size={28} color="#fff" fill="#fff" strokeWidth={0} style={{ marginLeft: 4 }} />
          <Text style={{ fontFamily: FONTS.sans, fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 4 }} numberOfLines={1}>{attachment.name}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  if (previewKind === 'placeholder') {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        <AttachmentPlaceholder name={attachment.name} width={120} height={120} borderRadius={12} />
      </TouchableOpacity>
    );
  }

  const Icon = cat === 'audio' ? Music : FileText;
  const shortName = attachment.name.length > 20 ? `${attachment.name.slice(0, 18)}…` : attachment.name;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: COLORS.fillWeak, borderWidth: 1, borderColor: COLORS.strokeWeaker, maxWidth: 200 }}>
        <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: `${COLORS.brand}12`, alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={COLORS.brand} strokeWidth={1.8} />
        </View>
        <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 12, color: COLORS.textStrong, flex: 1 }} numberOfLines={1}>{shortName}</Text>
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
        <Text style={{ fontFamily: FONTS.sansBold, fontSize: 11, color: 'white' }}>{letter}</Text>
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

function parseTextWithLinks(text: string, isUser: boolean) {
  const regex = /https?:\/\/[^\s]+/gi;
  const matches = text.match(regex);
  if (!matches) {
    return text;
  }

  const parts = [];
  let lastIndex = 0;
  let match;
  
  regex.lastIndex = 0;
  while ((match = regex.exec(text)) !== null) {
    let url = match[0];
    // Strip trailing sentence punctuation
    url = url.replace(/[.,!?;:)]+$/, '');
    const index = match.index;
    
    if (index > lastIndex) {
      parts.push(text.slice(lastIndex, index));
    }
    
    const shortened = shortenUrl(url);
    parts.push(
      <Text
        key={index}
        style={{
          color: COLORS.linkPreview,
          textDecorationLine: 'underline',
        }}
        onPress={() => Linking.openURL(url).catch(() => {})}
      >
        {shortened}
      </Text>
    );
    
    lastIndex = index + match[0].length; // Move index past the full matched URL including stripped punctuation
  }
  
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  
  return parts;
}

function LinkPreviewChip({ preview }: { preview: LinkPreviewData }) {
  const handlePress = useCallback(() => {
    Linking.openURL(preview.url).catch(() => {});
  }, [preview.url]);

  if (!preview.loaded) {
    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7} style={{ marginTop: 4 }}>
        <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: COLORS.linkPreview, textDecorationLine: 'underline' }} numberOfLines={1}>
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
            <Text style={{ fontFamily: FONTS.sansBold, fontSize: 10, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.5 }} numberOfLines={1}>
              {preview.hostname}
            </Text>
          </View>
          <Text style={{ fontFamily: FONTS.sansSemi, fontSize: 12, color: '#ffffff' }} numberOfLines={1}>
            {preview.title || 'Link'}
          </Text>
          {preview.description && (
            <Text style={{ fontFamily: FONTS.sans, fontSize: 10, color: 'rgba(255,255,255,0.9)' }} numberOfLines={2}>
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

// ─── Image strip grid (always horizontal, max 3 visible) ─────────────────────
//
// 1 image  → full bubble width, 4:3
// 2 images → two equal tiles side-by-side
// 3+ images → grid tiles, +N counter on the final darkened tile for overflow

const BUBBLE_MAX_W = 260;
const GRID_GAP = 3;

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
      <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 10, color: COLORS.textWeak, textAlign: 'center' }} numberOfLines={2}>
        {name || 'Preview unavailable'}
      </Text>
    </View>
  );
}

// Pure helper — module-level so it is never recreated on each AttachmentGrid render
function renderMediaPreview(
  a: { url: string; name: string; type?: string; _id?: string },
  width: number,
  height: number,
  borderRadius: number,
  onPress: () => void,
) {
  const category = getMediaCategory({ mimeType: a.type, name: a.name, uri: a.url });
  const previewKind = getAttachmentPreviewKind({ category, uri: a.url });

  if (previewKind === 'placeholder') {
    return <AttachmentPlaceholder name={a.name} width={width} height={height} borderRadius={borderRadius} />;
  }

  if (previewKind === 'video') {
    return (
      <VideoThumbnail
        uri={a.url}
        thumbnailUrl={(a as any).thumbnail}
        width={width}
        height={height}
        borderRadius={borderRadius}
        onPress={onPress}
      />
    );
  }

  return <Image source={{ uri: a.url }} style={{ width, height, borderRadius }} resizeMode="cover" />;
}

function AttachmentGrid({ attachments, onTap }: {
  attachments: { url: string; name: string; type?: string; _id?: string }[];
  onTap: (index: number) => void;
}) {
  if (attachments.length === 0) return null;

  const mediaItems = attachments.filter(a => ['image', 'video'].includes(getMediaCategory({ mimeType: a.type, name: a.name, uri: a.url })));
  const fileItems = attachments.filter(a => !['image', 'video'].includes(getMediaCategory({ mimeType: a.type, name: a.name, uri: a.url })));
  const count = mediaItems.length;
  const fullW = BUBBLE_MAX_W;

  let imageSection: React.ReactNode = null;

  if (count === 1) {
    // Single image/video — full width, 4:3
    const a = mediaItems[0];
    const origIdx = attachments.indexOf(a);
    imageSection = (
      <TouchableOpacity onPress={() => onTap(origIdx)} activeOpacity={0.85} style={{ position: 'relative' }}>
        {renderMediaPreview(a, fullW, Math.round(fullW * (3 / 4)), 12, () => onTap(origIdx))}
      </TouchableOpacity>
    );
  } else if (count <= 3) {
    // 2-3 media items — horizontal strip, equal tiles
    const tileW = Math.floor((fullW - GRID_GAP * (count - 1)) / count);
    const tileH = Math.round(tileW * (3 / 4));
    imageSection = (
      <View style={{ flexDirection: 'row', gap: GRID_GAP }}>
        {mediaItems.map((a, i) => {
          const origIdx = attachments.indexOf(a);
          return (
            <TouchableOpacity key={a._id ?? origIdx} onPress={() => onTap(origIdx)} activeOpacity={0.85} style={{ position: 'relative' }}>
              {renderMediaPreview(a, tileW, tileH, 10, () => onTap(origIdx))}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  } else {
    // 4+ images — 2×2 grid, first 4 visible, +N counter on the 4th tile overlay
    const tileW = Math.floor((fullW - GRID_GAP) / 2);
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
                  {renderMediaPreview(a, tileW, tileH, 10, () => onTap(origIdx))}
                  {showOverlay && (
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.62)', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontFamily: FONTS.sansBold, fontSize: 18, color: '#fff' }}>+{overflow}</Text>
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
  const isUser = message.role === 'user';
  const rawAttachments: { url: string; name: string; type?: string; _id?: string }[] =
    (message as any).attachments ?? (message as any).attatchments ?? [];

  const rawContent = message.text || (message as any).content || '';
  const replyQuote: { role: string; text: string } | null =
    (message as any).replyTo ?? (isUser ? extractReplyQuote(rawContent) : null);
  const content = isUser ? stripReplyWrapper(rawContent) : rawContent;
  const responseTime = 'created_at' in message && message.created_at
    ? dayjs(message.created_at).format('h:mma')
    : null;

  const previewAttachments: PreviewAttachment[] = useMemo(
    () => rawAttachments.map(toPreviewAttachment),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rawAttachments.length, (message as any)._id],
  );

  const hasContent = content.trim().length > 0 || rawAttachments.length > 0;
  const isOnlyUrl = content.trim().length > 0 && isMessageOnlyUrl(content);

  // Must be declared before any early return (Rules of Hooks)
  const handleAttachmentTap = useCallback((index: number) => {
    onPreviewAttachments?.({ attachments: previewAttachments, initialIndex: index });
  }, [onPreviewAttachments, previewAttachments]);

  if (!hasContent) return null;


  const Container = animated ? Animated.View : View;
  const containerProps = animated
    ? { entering: FadeInDown.duration(300).springify() }
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
        <View
          style={[
            styles.messageSurface,
            isUser ? styles.userSurface : styles.assistantSurface,
            isOnlyUrl && { backgroundColor: 'transparent', paddingHorizontal: 0, paddingVertical: 0 }
          ]}
        >

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
          {rawAttachments.length > 0 && (
            <AttachmentGrid attachments={rawAttachments} onTap={handleAttachmentTap} />
          )}

          {/* Message text */}
          {content.trim().length > 0 && !isOnlyUrl && (
            <Text
              style={[styles.messageText, { marginTop: rawAttachments.length > 0 ? 4 : 0 }]}
              numberOfLines={isMessageOnlyUrl(content) ? 1 : undefined}
            >
              {parseTextWithLinks(content, isUser)}
            </Text>
          )}

          {/* Link preview chips */}
          {content.trim().length > 0 && <LinkPreviews text={content} />}
        </View>

        {/* Meta row */}
        <View style={[styles.metaRow, isUser ? styles.metaRowUser : styles.metaRowAssistant]}>
          {responseTime && <Text style={styles.timeLabel}>{responseTime}</Text>}
          {content.trim().length > 0 && (
            <TouchableOpacity
              accessibilityLabel="Copy message"
              accessibilityRole="button"
              onPress={() => {
                Haptics.selectionAsync();
                Clipboard.setStringAsync(content.trim()).catch(() => {});
              }}
              activeOpacity={0.7}
              style={styles.metaIconButton}
            >
              <Copy size={17} color={COLORS.textStrong} strokeWidth={2} />
            </TouchableOpacity>
          )}
          {onReply && (
            <TouchableOpacity
              accessibilityLabel="Reply to message"
              accessibilityRole="button"
              onPress={onReply}
              activeOpacity={0.7}
              style={styles.replyButton}
            >
              <CornerDownRight size={18} color={COLORS.textStrong} strokeWidth={2} />
              <Text style={styles.replyLabel}>Reply</Text>
            </TouchableOpacity>
          )}
        </View>
    </Container>
  );
});

const styles = StyleSheet.create({
  messageContainer: { marginBottom: 14 },
  messageContainerHighlighted: {
    backgroundColor: COLORS.brandSubtle,
    borderColor: COLORS.brandTint,
    borderRadius: 12,
    borderWidth: 1,
    padding: 6,
  },
  userMessageContainer: { alignSelf: 'flex-end', maxWidth: '64%' },
  userAttachmentContainer: { maxWidth: '78%' },
  assistantMessageContainer: { alignSelf: 'stretch' },
  messageSurface: { overflow: 'hidden' },
  userSurface: {
    backgroundColor: COLORS.fillWeak,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  assistantSurface: { backgroundColor: COLORS.background },
  messageText: {
    color: COLORS.textStrong,
    fontFamily: FONTS.chatBody,
    fontSize: 15,
    lineHeight: 20,
  },
  replyQuote: {
    backgroundColor: COLORS.strokeWeaker,
    borderLeftColor: COLORS.info,
    borderLeftWidth: 2,
    borderRadius: 4,
    marginBottom: 6,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  replyQuoteText: {
    color: COLORS.textStrong,
    fontFamily: FONTS.serif,
    fontSize: 14,
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
    fontFamily: FONTS.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  metaIconButton: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  replyButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    minHeight: 24,
  },
  replyLabel: {
    color: COLORS.textStrong,
    fontFamily: FONTS.sans,
    fontSize: 13,
    lineHeight: 18,
  },
});
