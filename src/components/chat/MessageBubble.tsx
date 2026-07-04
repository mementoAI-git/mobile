import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { cn } from '@/lib/utils';
import type { IMessage } from '@/types';
import dayjs from 'dayjs';
import { COLORS, FONTS } from '@/constants/tokens';
import { CornerDownRight, FileText, Music, Play } from 'lucide-react-native';
import { MediaPreviewModal, type PreviewAttachment } from '@/components/ui/MediaPreviewModal';

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
}

// ─── Attachment helpers ────────────────────────────────────────────────────────

function getMimeCategory(name?: string, type?: string): 'image' | 'video' | 'audio' | 'file' {
  const t = type?.toLowerCase() ?? '';
  if (t.startsWith('image/')) return 'image';
  if (t.startsWith('video/')) return 'video';
  if (t.startsWith('audio/')) return 'audio';
  // Infer from extension if no type
  const ext = name?.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext)) return 'image';
  if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'm4a', 'aac', 'ogg'].includes(ext)) return 'audio';
  return 'file';
}

// Converts API attachment to PreviewAttachment shape for MediaPreviewModal
function toPreviewAttachment(a: { url: string; name: string; type?: string; _id?: string }, idx: number): PreviewAttachment {
  return {
    clientId: a._id ?? `att_${idx}`,
    uri: a.url,
    name: a.name,
    mimeType: a.type ?? 'application/octet-stream',
  };
}

// ─── Single attachment tile ────────────────────────────────────────────────────

function AttachmentTile({ attachment, onPress }: {
  attachment: { url: string; name: string; type?: string; _id?: string };
  onPress: () => void;
}) {
  const cat = getMimeCategory(attachment.name, attachment.type);

  if (cat === 'image') {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        <Image
          source={{ uri: attachment.url }}
          style={{ width: 120, height: 120, borderRadius: 12 }}
          resizeMode="cover"
        />
      </TouchableOpacity>
    );
  }

  if (cat === 'video') {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        <View style={{ width: 120, height: 120, borderRadius: 12, backgroundColor: COLORS.textStrong, alignItems: 'center', justifyContent: 'center' }}>
          <Play size={28} color="#fff" fill="#fff" strokeWidth={0} style={{ marginLeft: 4 }} />
          <Text style={{ fontFamily: FONTS.sans, fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 4 }} numberOfLines={1}>
            {attachment.name}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  // Audio or other file — chip
  const Icon = cat === 'audio' ? Music : FileText;
  const shortName = attachment.name.length > 20 ? `${attachment.name.slice(0, 18)}…` : attachment.name;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: COLORS.fillWeak,
        borderWidth: 1,
        borderColor: COLORS.strokeWeaker,
        maxWidth: 200,
      }}>
        <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: `${COLORS.brand}12`, alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={COLORS.brand} strokeWidth={1.8} />
        </View>
        <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 12, color: COLORS.textStrong, flex: 1 }} numberOfLines={1}>
          {shortName}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Attachment grid ───────────────────────────────────────────────────────────

function AttachmentGrid({ attachments, onTap }: {
  attachments: { url: string; name: string; type?: string; _id?: string }[];
  onTap: (index: number) => void;
}) {
  if (attachments.length === 0) return null;

  // Split media (image/video) from files (audio/doc) for layout
  const mediaItems = attachments.filter(a => ['image', 'video'].includes(getMimeCategory(a.name, a.type)));
  const fileItems = attachments.filter(a => !['image', 'video'].includes(getMimeCategory(a.name, a.type)));

  return (
    <View style={{ gap: 6, marginBottom: 6 }}>
      {/* Media grid — 2-column wrap */}
      {mediaItems.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
          {mediaItems.map((a) => {
            const origIdx = attachments.indexOf(a);
            return (
              <AttachmentTile key={a._id ?? origIdx} attachment={a} onPress={() => onTap(origIdx)} />
            );
          })}
        </View>
      )}
      {/* File chips — vertical stack */}
      {fileItems.map((a) => {
        const origIdx = attachments.indexOf(a);
        return (
          <AttachmentTile key={a._id ?? origIdx} attachment={a} onPress={() => onTap(origIdx)} />
        );
      })}
    </View>
  );
}

// ─── MessageBubble ─────────────────────────────────────────────────────────────

export const MessageBubble = React.memo(function MessageBubble({ message, onReply }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const aiModel = (message as any).ai_model;
  const replyQuote = (message as any).replyTo;
  const rawAttachments: { url: string; name: string; type?: string; _id?: string }[] =
    (message as any).attatchments ?? [];

  // Don't render empty bubbles
  const content = message.text || (message as any).content || '';
  const hasContent = content.trim().length > 0 || rawAttachments.length > 0;
  if (!hasContent) return null;

  // MediaPreviewModal state
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
        <View
          className={cn(
            'px-5 py-3.5 rounded-[20px]',
            isUser ? 'bg-fill-weaker' : 'bg-white'
          )}
        >
          {/* Reply Quote Block */}
          {replyQuote && replyQuote.text && (
            <View className="mb-2.5 border-l-2 border-brand/50 pl-3 py-1 bg-brand/5 rounded-r-lg">
              <Text 
                className="text-[10px] text-brand font-bold uppercase tracking-wider mb-0.5"
                style={{ fontFamily: FONTS.sansBold }}
              >
                Replying to {replyQuote.role === 'user' ? 'your message' : 'Memento'}
              </Text>
              <Text 
                className="text-[12px] text-text-weak leading-relaxed"
                numberOfLines={2}
                style={{ fontFamily: FONTS.sans }}
              >
                {replyQuote.text}
              </Text>
            </View>
          )}

          {/* Attachment grid — above text */}
          {rawAttachments.length > 0 && (
            <AttachmentGrid attachments={rawAttachments} onTap={handleAttachmentTap} />
          )}

          {/* Message text */}
          {content.trim().length > 0 && (
            <Text
              className="text-[15px] leading-[23px] text-text-strong"
              style={{ fontFamily: FONTS.serif, letterSpacing: -0.03 }}
            >
              {content}
            </Text>
          )}
        </View>

        {/* Meta Info */}
        <View className={cn('flex-row items-center mt-1.5 px-2', isUser ? 'justify-end' : 'justify-start')}>
          {!isUser && (
            <View className="size-4 bg-brand/10 rounded-full items-center justify-center mr-1.5 border border-brand/5">
              <Text className="text-[9px]">🌱</Text>
            </View>
          )}
          {'created_at' in message && message.created_at && (
            <Text
              className="text-[9px] text-text-muted font-bold uppercase tracking-widest"
              style={{ fontFamily: FONTS.sansBold }}
            >
              {dayjs(message.created_at).format('h:mm A')}
            </Text>
          )}
          {!isUser && aiModel && (
            <View className="flex-row items-center ml-2 bg-brand/5 px-2 py-0.5 rounded-full border border-brand/10">
              <Text
                className="text-[8px] text-brand font-bold uppercase tracking-widest"
                style={{ fontFamily: FONTS.sansBold }}
              >
                {aiModel}
              </Text>
            </View>
          )}
          {onReply && (
            <TouchableOpacity 
              onPress={onReply}
              activeOpacity={0.7}
              className="flex-row items-center ml-3 bg-brand/5 px-2 py-0.5 rounded-full border border-brand/10"
            >
              <CornerDownRight size={10} color={COLORS.brand} style={{ marginRight: 3 }} />
              <Text 
                className="text-[8px] text-brand font-bold uppercase tracking-widest"
                style={{ fontFamily: FONTS.sansBold }}
              >
                Reply
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* Full-screen media preview */}
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
