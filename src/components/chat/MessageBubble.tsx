import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Linking } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { cn } from '@/lib/utils';
import type { IMessage } from '@/types';
import dayjs from 'dayjs';
import { COLORS, FONTS } from '@/constants/tokens';
import { CornerDownRight, FileText, Music, Play, ExternalLink } from 'lucide-react-native';
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
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: `${COLORS.success}10`, borderWidth: 1, borderColor: `${COLORS.success}25` }}
      >
        {preview.faviconUrl ? (
          <Image source={{ uri: preview.faviconUrl }} style={{ width: 20, height: 20, borderRadius: 4, flexShrink: 0 }} resizeMode="contain" />
        ) : (
          <View style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: `${COLORS.success}20`, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ExternalLink size={12} color={COLORS.success} strokeWidth={2} />
          </View>
        )}
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={{ fontFamily: FONTS.sansBold, fontSize: 10, color: COLORS.success, textTransform: 'uppercase', letterSpacing: 0.5 }} numberOfLines={1}>
            {preview.hostname}
          </Text>
          {preview.title ? (
            <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 12, color: COLORS.textStrong }} numberOfLines={2}>
              {preview.title}
            </Text>
          ) : null}
        </View>
        <ExternalLink size={14} color={COLORS.success} strokeWidth={2} style={{ flexShrink: 0 }} />
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

// ─── WhatsApp-style attachment grid ───────────────────────────────────────────

const BUBBLE_MAX_W = 260;
const GRID_GAP = 3;

function ImageTile({ attachment, size, onPress, borderRadius = 12, overlay }: {
  attachment: { url: string; name: string; type?: string; _id?: string };
  size: number;
  onPress: () => void;
  borderRadius?: number;
  overlay?: React.ReactNode;
}) {
  const cat = getMimeCategory(attachment.name, attachment.type);
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={{ position: 'relative' }}>
      <Image source={{ uri: attachment.url }} style={{ width: size, height: size, borderRadius }} resizeMode="cover" />
      {cat === 'video' && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', borderRadius }}>
          <Play size={22} color="#fff" fill="#fff" strokeWidth={0} style={{ marginLeft: 3 }} />
        </View>
      )}
      {overlay}
    </TouchableOpacity>
  );
}

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
    const a = mediaItems[0];
    const origIdx = attachments.indexOf(a);
    imageSection = (
      <TouchableOpacity onPress={() => onTap(origIdx)} activeOpacity={0.85}>
        <Image source={{ uri: a.url }} style={{ width: fullW, height: Math.round(fullW * (3 / 4)), borderRadius: 12 }} resizeMode="cover" />
        {getMimeCategory(a.name, a.type) === 'video' && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            <Play size={32} color="#fff" fill="#fff" strokeWidth={0} style={{ marginLeft: 4 }} />
          </View>
        )}
      </TouchableOpacity>
    );
  } else if (count <= 3) {
    const tileW = Math.floor((fullW - GRID_GAP * (count - 1)) / count);
    imageSection = (
      <View style={{ flexDirection: 'row', gap: GRID_GAP }}>
        {mediaItems.map((a) => {
          const origIdx = attachments.indexOf(a);
          return <ImageTile key={a._id ?? origIdx} attachment={a} size={tileW} onPress={() => onTap(origIdx)} />;
        })}
      </View>
    );
  } else {
    const tileW = Math.floor((fullW - GRID_GAP) / 2);
    const visible = mediaItems.slice(0, 4);
    const overflow = count - 4;
    imageSection = (
      <View style={{ gap: GRID_GAP }}>
        <View style={{ flexDirection: 'row', gap: GRID_GAP }}>
          {visible.slice(0, 2).map((a) => {
            const origIdx = attachments.indexOf(a);
            return <ImageTile key={a._id ?? origIdx} attachment={a} size={tileW} onPress={() => onTap(origIdx)} />;
          })}
        </View>
        <View style={{ flexDirection: 'row', gap: GRID_GAP }}>
          {visible.slice(2, 4).map((a, i) => {
            const origIdx = attachments.indexOf(a);
            const isLast = i === 1;
            return (
              <ImageTile
                key={a._id ?? origIdx}
                attachment={a}
                size={tileW}
                onPress={() => onTap(origIdx)}
                overlay={isLast && overflow > 0 ? (
                  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: FONTS.sansBold, fontSize: 20, color: '#fff' }}>+{overflow}</Text>
                  </View>
                ) : undefined}
              />
            );
          })}
        </View>
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
          {onReply && (
            <TouchableOpacity onPress={onReply} activeOpacity={0.7} className="flex-row items-center ml-3 bg-brand/5 px-2 py-0.5 rounded-full border border-brand/10">
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
