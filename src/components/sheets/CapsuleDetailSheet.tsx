import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { X, Calendar, Users, Edit3, Trash2, Clock, CheckCircle2, FileText, Download, Bookmark } from 'lucide-react-native';
import dayjs from 'dayjs';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS } from '@/constants/tokens';
import { getThemeById, getThemeByColor } from '@/constants/themes';
import { Badge, Button } from '@/components/ui';
import type { ICapsule } from '@/types';
import { useUiStore, useUserStore } from '@/store';
import { StylePicker } from '../capsule/StylePicker';
import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';



interface Props {
  onClose: () => void;
  capsule: ICapsule;
  previewOnly?: boolean;
}

export function CapsuleDetailSheet({ onClose, capsule: initialCapsule, previewOnly }: Props) {
  const openSheet = useUiStore(s => s.openSheet);
  const insets = useSafeAreaInsets();
  
  // Local state for live theme preview (parity with web's interactive preview)
  const [themeId, setThemeId] = useState(initialCapsule.style?.themeId || 'blush');
  const [bgColor, setBgColor] = useState(initialCapsule.style?.backgroundColor || '#FFE5D9');
  const [fontSize, setFontSize] = useState(initialCapsule.style?.fontSize || '2x');

  // Resolve the current theme object for pattern/typography tokens
  const currentTheme = getThemeById(themeId);

  const textColor = currentTheme.textColor;
  const headerColor = currentTheme.headerColor;

  const user = useUserStore((s) => s.user);
  const senderName = user?.name || user?.email || 'You';

  const recipientNames = initialCapsule.recipients
    .map((r: any) => r.name || r.first_name || r.email || r)
    .filter(Boolean)
    .join(', ');

  const handleEdit = () => {
    onClose();
    setTimeout(() => {
      // Carry over the selected style to the edit flow
      const updatedCapsule = {
        ...initialCapsule,
        style: {
          themeId,
          backgroundColor: bgColor,
          fontSize,
          textColor,
          headerColor,
        }
      };
      openSheet('create-capsule', { editData: updatedCapsule });
    }, 300);
  };

  const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
    draft: 'default',
    scheduled: 'info',
    delivered: 'success',
    failed: 'error',
    pause: 'warning',
  };

  const handleOpenFile = async (url?: string) => {
    if (url) {
      await WebBrowser.openBrowserAsync(url);
    }
  };


  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View className="px-6 pt-2 pb-4 flex-row items-center justify-between border-b border-stroke-weaker">
        <View>
          <Text className="text-xl text-text-strong" style={{ fontFamily: FONTS.serif }}>
            {previewOnly ? 'View Capsule' : 'Capsule Details'}
          </Text>
          <Text className="text-xs text-text-weak" style={{ fontFamily: FONTS.sans }}>
            Created {dayjs(initialCapsule.created_at).format('MMMM D, YYYY')}
          </Text>
        </View>
        <TouchableOpacity 
          onPress={onClose}
          className="size-10 rounded-full bg-fill-weaker items-center justify-center"
        >
          <X size={20} color={COLORS.textWeak} />
        </TouchableOpacity>
      </View>

      <BottomSheetScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom ? insets.bottom + 24 : 40 }}
      >
        {/* Themed Preview Card (Web Style - SVG Background like CapsulePreviewCard) */}
        <View className="p-6">
          <View 
            className="w-full aspect-[560/697] rounded-2xl overflow-hidden border border-stroke-weaker shadow-lg relative"
            style={{ backgroundColor: bgColor }}
          >
            {/* SVG Background Layer - mirrors web's currentTheme.Background usage */}
            <currentTheme.Background width="100%" height="100%" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute' }} />
            
            <View className="absolute inset-0 p-6 pt-10">
              {/* To / From Header */}
              <View className="flex-row items-center justify-between mb-8 opacity-80">
                <Text className="text-[10px]" style={{ fontFamily: currentTheme.fonts.body, color: textColor }} numberOfLines={1}>
                  To: {recipientNames || 'Someone special'}
                </Text>
                {/* Decorative middle icon */}
                <View className="size-3 rounded-full border items-center justify-center mx-2 shrink-0" style={{ borderColor: headerColor }}>
                  <View className="size-1 rounded-full" style={{ backgroundColor: headerColor }} />
                </View>
                <Text className="text-[10px]" style={{ fontFamily: currentTheme.fonts.body, color: textColor }} numberOfLines={1}>
                  From: {senderName}
                </Text>
              </View>

              {/* Message Content */}
              <Text 
                className="text-2xl text-center mb-4 uppercase tracking-widest" 
                style={{ 
                  fontFamily: currentTheme.fonts.header,
                  color: headerColor 
                }}
              >
                {initialCapsule.title || 'Your Title'}
              </Text>
              <Text 
                className="text-sm text-center opacity-80 leading-relaxed" 
                style={{ 
                  fontFamily: currentTheme.fonts.body,
                  color: textColor,
                  fontSize: fontSize === '1x' ? 12 : fontSize === '3x' ? 16 : 14,
                }}
                numberOfLines={10}
              >
                {initialCapsule.body || 'Your message preview...'}
              </Text>
            </View>
          </View>

          {/* Interactive Style Picker (Exact Web Parity) */}
          <View className="mt-6">
            <StylePicker 
              currentThemeId={themeId}
              fontSize={fontSize}
              onThemeSelect={(t) => {
                setThemeId(t.id);
                setBgColor(t.color);
              }}
              onSizeSelect={setFontSize}
            />
          </View>
        </View>

        {/* Details & Metadata */}
        {!previewOnly && (
          <View className="px-6 gap-6">
            <View className="bg-fill-weaker rounded-2xl p-5 gap-4 border border-stroke-weaker">
              <View className="flex-row items-center gap-4">
                <View className="size-10 rounded-full bg-white items-center justify-center border border-stroke-weaker">
                  <Calendar size={18} color={COLORS.brand} />
                </View>
                <View>
                  <Text className="text-xs text-text-weak uppercase tracking-wider font-bold" style={{ fontFamily: FONTS.sansBold }}>
                    Delivery Date
                  </Text>
                  <Text className="text-base text-text-strong" style={{ fontFamily: FONTS.sansMedium }}>
                    {initialCapsule.schedule_date 
                      ? dayjs(initialCapsule.schedule_date).format('dddd, MMMM D, YYYY')
                      : 'Not scheduled (Draft)'}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center gap-4">
                <View className="size-10 rounded-full bg-white items-center justify-center border border-stroke-weaker">
                  <Users size={18} color={COLORS.brand} />
                </View>
                <View>
                  <Text className="text-xs text-text-weak uppercase tracking-wider font-bold" style={{ fontFamily: FONTS.sansBold }}>
                    Recipients
                  </Text>
                  <Text className="text-base text-text-strong" style={{ fontFamily: FONTS.sansMedium }}>
                    {initialCapsule.recipients.length} {initialCapsule.recipients.length === 1 ? 'person' : 'people'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Attached Files & Memories */}
            {(initialCapsule.attachments?.length > 0 || initialCapsule.memories?.length > 0) && (
              <View className="bg-fill-weaker rounded-2xl p-5 gap-4 border border-stroke-weaker">
                {initialCapsule.memories && initialCapsule.memories.length > 0 && (
                  <View className="flex-row items-center gap-4 border-b border-stroke-weaker pb-4">
                    <View className="size-10 rounded-full bg-white items-center justify-center border border-stroke-weaker">
                      <Bookmark size={18} color={COLORS.brand} />
                    </View>
                    <View>
                      <Text className="text-xs text-text-weak uppercase tracking-wider font-bold" style={{ fontFamily: FONTS.sansBold }}>
                        Attached Memories
                      </Text>
                      <Text className="text-base text-text-strong" style={{ fontFamily: FONTS.sansMedium }}>
                        {initialCapsule.memories.length} {initialCapsule.memories.length === 1 ? 'memory' : 'memories'}
                      </Text>
                    </View>
                  </View>
                )}

                {initialCapsule.attachments && initialCapsule.attachments.length > 0 && (
                  <View className="gap-3">
                    <Text className="text-xs text-text-weak uppercase tracking-wider font-bold" style={{ fontFamily: FONTS.sansBold }}>
                      Attached Media ({initialCapsule.attachments.length})
                    </Text>
                    <View className="gap-2">
                      {initialCapsule.attachments.map((a: any, idx) => (
                        <TouchableOpacity
                          key={a._id || idx}
                          onPress={() => handleOpenFile(a.url)}
                          className="flex-row items-center justify-between bg-white border border-stroke-weaker p-3 rounded-xl"
                        >
                          <View className="flex-row items-center gap-3 flex-1">
                            <View className="size-8 bg-fill-weaker rounded border border-stroke-weaker items-center justify-center">
                              <FileText size={16} color={COLORS.textBase} />
                            </View>
                            <View className="flex-1">
                              <Text className="text-sm text-text-strong" numberOfLines={1} style={{ fontFamily: FONTS.sansMedium }}>
                                {a.name || 'Attachment'}
                              </Text>
                              <Text className="text-[10px] text-text-weak uppercase" style={{ fontFamily: FONTS.sans }}>
                                {a.type || 'FILE'}
                              </Text>
                            </View>
                          </View>
                          <Download size={16} color={COLORS.brand} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Quick Actions */}
            <View className="flex-row gap-3">
              <Button 
                variant="outline" 
                className="flex-1 h-14 rounded-2xl" 
                onPress={handleEdit}
              >
                <Edit3 size={18} color={COLORS.textBase} className="mr-2" />
                <Text className="font-bold" style={{ fontFamily: FONTS.sansBold }}>Edit</Text>
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 h-14 rounded-2xl border-error/20"
                onPress={() => {
                  onClose();
                  setTimeout(() => openSheet('capsule-actions', { capsule: initialCapsule }), 300);
                }}
              >
                <Trash2 size={18} color={COLORS.error} className="mr-2" />
                <Text className="font-bold text-error" style={{ fontFamily: FONTS.sansBold }}>Manage</Text>
              </Button>
            </View>
          </View>
        )}
      </BottomSheetScrollView>
    </View>
  );
}
