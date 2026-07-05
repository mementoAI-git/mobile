import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { cn } from '@/lib/utils';
import type { IMessage } from '@/types';
import dayjs from 'dayjs';
import { COLORS, FONTS } from '@/constants/tokens';
import { CornerDownRight, FileText, Music, Play, ExternalLink, Copy } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { MediaPreviewModal, type PreviewAttachment } from '@/components/ui/MediaPreviewModal';
import { useLinkPreview, type LinkPreviewData } from '@/hooks/use-link-preview';

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
}

// ─── Attachment helpers ────────────────────────────────────────────────────────

function getMimeCategory(name?: string, type?: string): 'image' | 'video' | 'audio' | 'file' {
  const t = type?.toLowerCase() ?? '';
  if (t.startsWith('image/')) return 'image';
  if (t.startsWith('video/')) return 'video';
  if (t.startsWith('audio/')) return 'audio';
  const ext = name?.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext)) return 'image';
  if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'm4a', 'aac', 'ogg'].includes(ext)) return 'audio';
  return 'file';
}

function toPreviewAttachment(a: { url: string; name: string; type?: string; _id?: string }, idx: number): PreviewAttachment {
  return {
    clientId: a._id ?? `att_${idx}`,
    uri: a.url,
    name: a.name,
    mimeType: a.type ?? 'application/octet-stream',
  };
}

// ─── Single file chip ──────────────────────────────────────────────────────────

function AttachmentTile({ attachment, onPress }: {
  attachment: { url: string; name: string; type?: string; _id?: string };
  onPress: () => void;
}) {
  const cat = getMimeCategory(attachment.name, attachment.type);

  if (cat === 'image') {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        <Image source={{ uri: attachment.url }} style={{ width: 120, height: 120, borderRadius: 12 }} resizeMode="cover" />
      </TouchableOpacity>
    );
  }

  if (cat === 'video') {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        <View style={{ width: 120, height: 120, borderRadius: 12, backgroundColor: COLORS.textStrong, alignItems: 'center', justifyContent: 'center' }}>
          <Play size={28} color="#fff" fill="#fff" strokeWidth={0} style={{ marginLeft: 4 }} />
          <Text style={{ fontFamily: FONTS.sans, fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 4 }} numberOfLines={1}>{attachment.name}</Text>
        </View>
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

function LinkPreviewChip({ preview }: { preview: LinkPreviewData }) {
  const handlePress = () => { Linking.openURL(preview.url).catch(() => {}); };

  if (!preview.loaded) {
    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7} style={{ marginTop: 4 }}>
        <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: COLORS.brand, textDecorationLine: 'underline' }} numberOfLines={1}>
          {preview.url}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(300)}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: CHIP_BG }}
      >
        <FaviconBadge url={preview.faviconUrl} hostname={preview.hostname} />

        <Text style={{ flex: 1, fontFamily: FONTS.sansMedium, fontSize: 13, color: 'white' }} numberOfLines={1}>
          <Text style={{ fontFamily: FONTS.sansBold, color: 'white' }}>{preview.hostname}</Text>
          {preview.title ? <Text style={{ color: 'rgba(255,255,255,0.8)' }}> · {preview.title}</Text> : null}
        </Text>

        <ExternalLink size={14} color="rgba(255,255,255,0.85)" strokeWidth={2} style={{ flexShrink: 0 }} />
      </TouchableOpacity>
    </Animated.View>
  );
}

// Wrapper component that calls the hook (hooks can't be called inside render callbacks)
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
// 3+ images → three equal tiles, +N chip on 3rd for overflow

const BUBBLE_MAX_W = 260;
const GRID_GAP = 3;

function AttachmentGrid({ attachments, onTap }: {
  attachments: { url: string; name: string; type?: string; _id?: string }[];
  onTap: (index: number) => void;
}) {
  if (attachments.length === 0) return null;

  const mediaItems = attachments.filter(a => ['image', 'video'].includes(getMimeCategory(a.name, a.type)));
  const fileItems = attachments.filter(a => !['image', 'video'].includes(getMimeCategory(a.name, a.type)));
  const count = mediaItems.length;
  const fullW = BUBBLE_MAX_W;

  let imageSection: React.ReactNode = null;

  if (count === 1) {
    // Single image — full width, 4:3
    const a = mediaItems[0];
    const origIdx = attachments.indexOf(a);
    imageSection = (
      <TouchableOpacity onPress={() => onTap(origIdx)} activeOpacity={0.85} style={{ position: 'relative' }}>
        <Image source={{ uri: a.url }} style={{ width: fullW, height: Math.round(fullW * (3 / 4)), borderRadius: 12 }} resizeMode="cover" />
        {getMimeCategory(a.name, a.type) === 'video' && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            <Play size={32} color="#fff" fill="#fff" strokeWidth={0} style={{ marginLeft: 4 }} />
          </View>
        )}
      </TouchableOpacity>
    );
  } else if (count <= 3) {
    // 2-3 images — horizontal strip, equal square tiles
    const tileW = Math.floor((fullW - GRID_GAP * (count - 1)) / count);
    const tileH = Math.round(tileW * (3 / 4));
    imageSection = (
      <View style={{ flexDirection: 'row', gap: GRID_GAP }}>
        {mediaItems.map((a, i) => {
          const origIdx = attachments.indexOf(a);
          const isLast = i === count - 1;
          const cat = getMimeCategory(a.name, a.type);
          return (
            <TouchableOpacity key={a._id ?? origIdx} onPress={() => onTap(origIdx)} activeOpacity={0.85} style={{ position: 'relative' }}>
              <Image source={{ uri: a.url }} style={{ width: tileW, height: tileH, borderRadius: 10 }} resizeMode="cover" />
              {cat === 'video' && (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                  <Play size={18} color="#fff" fill="#fff" strokeWidth={0} style={{ marginLeft: 2 }} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  } else {
    // 4+ images — 2×2 grid, first 4 visible, +N chip on 4th tile
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
              const cat = getMimeCategory(a.name, a.type);
              return (
                <TouchableOpacity key={a._id ?? origIdx} onPress={() => onTap(origIdx)} activeOpacity={0.85} style={{ position: 'relative' }}>
                  <Image source={{ uri: a.url }} style={{ width: tileW, height: tileH, borderRadius: 10 }} resizeMode="cover" />
                  {cat === 'video' && !showOverlay && (
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                      <Play size={18} color="#fff" fill="#fff" strokeWidth={0} style={{ marginLeft: 2 }} />
                    </View>
                  )}
                  {showOverlay && (
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.48)', alignItems: 'center', justifyContent: 'center' }}>
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

export const MessageBubble = React.memo(function MessageBubble({ message, onReply, onScrollToOriginal }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const aiModel = (message as any).ai_model;
  const rawAttachments: { url: string; name: string; type?: string; _id?: string }[] =
    (message as any).attatchments ?? [];

  const rawContent = message.text || (message as any).content || '';
  const replyQuote: { role: string; text: string } | null =
    (message as any).replyTo ?? (isUser ? extractReplyQuote(rawContent) : null);
  const content = isUser ? stripReplyWrapper(rawContent) : rawContent;

  const hasContent = content.trim().length > 0 || rawAttachments.length > 0;
  if (!hasContent) return null;

  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const previewAttachments: PreviewAttachment[] = rawAttachments.map(toPreviewAttachment);

  const handleAttachmentTap = (index: number) => {
    setPreviewIndex(index);
    setPreviewVisible(true);
  };

  return (
    <>
      <Animated.View
        entering={FadeInDown.duration(450).springify()}
        className={cn('mb-5 max-w-[85%]', isUser ? 'self-end' : 'self-start')}
      >
        <View className={cn('px-5 py-3.5 rounded-[20px]', isUser ? 'bg-fill-weaker' : 'bg-white')}>

          {/* Reply quote */}
          {replyQuote && replyQuote.text && (
            <TouchableOpacity
              onPress={onScrollToOriginal}
              activeOpacity={onScrollToOriginal ? 0.7 : 1}
              className="mb-2.5 border-l-2 border-brand/50 pl-3 py-1 bg-brand/5 rounded-r-lg"
            >
              <Text className="text-[12px] text-text-weak leading-relaxed" numberOfLines={2} style={{ fontFamily: FONTS.sans, fontStyle: 'italic' }}>
                {replyQuote.text}
              </Text>
            </TouchableOpacity>
          )}

          {/* Attachments */}
          {rawAttachments.length > 0 && (
            <AttachmentGrid attachments={rawAttachments} onTap={handleAttachmentTap} />
          )}

          {/* Message text */}
          {content.trim().length > 0 && (
            <Text
              className="text-[15px] leading-[23px] text-text-strong"
              style={{ fontFamily: FONTS.serif, letterSpacing: -0.03, marginTop: rawAttachments.length > 0 ? 4 : 0 }}
            >
              {content}
            </Text>
          )}

          {/* Link preview chips */}
          {content.trim().length > 0 && <LinkPreviews text={content} />}
        </View>

        {/* Meta row */}
        <View className={cn('flex-row items-center mt-1.5 px-2', isUser ? 'justify-end' : 'justify-start')}>
          {!isUser && (
            <View className="size-4 bg-brand/10 rounded-full items-center justify-center mr-1.5 border border-brand/5">
              <Text className="text-[9px]">🌱</Text>
            </View>
          )}
          {'created_at' in message && message.created_at && (
            <Text className="text-[9px] text-text-muted font-bold uppercase tracking-widest" style={{ fontFamily: FONTS.sansBold }}>
              {dayjs(message.created_at).format('h:mm A')}
            </Text>
          )}
          {!isUser && aiModel && (
            <View className="flex-row items-center ml-2 bg-brand/5 px-2 py-0.5 rounded-full border border-brand/10">
              <Text className="text-[8px] text-brand font-bold uppercase tracking-widest" style={{ fontFamily: FONTS.sansBold }}>
                {aiModel}
              </Text>
            </View>
          )}
          {content.trim().length > 0 && (
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                Clipboard.setStringAsync(content.trim()).catch(() => {});
              }}
              activeOpacity={0.7}
              className="ml-2 bg-brand/5 p-1 rounded-full border border-brand/10"
            >
              <Copy size={10} color={COLORS.brand} strokeWidth={2} />
            </TouchableOpacity>
          )}
          {onReply && (
            <TouchableOpacity onPress={onReply} activeOpacity={0.7} className="flex-row items-center ml-2 bg-brand/5 px-2 py-0.5 rounded-full border border-brand/10">
              <CornerDownRight size={10} color={COLORS.brand} style={{ marginRight: 3 }} />
              <Text className="text-[8px] text-brand font-bold uppercase tracking-widest" style={{ fontFamily: FONTS.sansBold }}>Reply</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {previewAttachments.length > 0 && (
        <MediaPreviewModal
          visible={previewVisible}
          attachments={previewAttachments}
          initialIndex={previewIndex}
          onClose={() => setPreviewVisible(false)}
        />
      )}
    </>
  );
});
