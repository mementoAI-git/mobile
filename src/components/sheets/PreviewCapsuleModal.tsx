import React, { forwardRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { X } from 'lucide-react-native';
import { COLORS, FONTS } from '@/constants/tokens';
import { StylePicker } from '@/components/capsule/StylePicker';
import { getThemeById } from '@/constants/themes';
import type { IBeneficiary } from '@/types';
import { useUserStore } from '@/store';
import {TYPE} from '@/constants/typography';

interface PreviewCapsuleModalProps {
  title: string;
  body: string;
  themeId: string;
  setThemeId: (id: string) => void;
  bgColor: string;
  setBgColor: (color: string) => void;
  fontSize: string;
  setFontSize: (size: string) => void;
  recipientIds: string[];
  beneficiaries: IBeneficiary[];
}

export const PreviewCapsuleModal = forwardRef<BottomSheetModal, PreviewCapsuleModalProps>((props, ref) => {
  const {
    title,
    body,
    themeId,
    setThemeId,
    bgColor,
    setBgColor,
    fontSize,
    setFontSize,
    recipientIds,
    beneficiaries,
  } = props;

  const renderBackdrop = useCallback(
    (backdropProps: any) => (
      <BottomSheetBackdrop {...backdropProps} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.4} />
    ),
    []
  );

  const selectedTheme = getThemeById(themeId);
  const Background = selectedTheme.Background;
  const user = useUserStore((s) => s.user);

  // Format recipients string
  const recipientNames = recipientIds
    .map(id => {
      const b = beneficiaries.find(b => b._id === id);
      return b ? b.name : id; // fallback to raw id (email) if not a saved beneficiary
    })
    .filter(Boolean)
    .join(', ');

  const senderName = user ? `${user.first_name} ${user.last_name}`.trim() || user.email : 'You';

  const handleClose = () => {
    if (ref && 'current' in ref && ref.current) {
      ref.current.dismiss();
    }
  };

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      snapPoints={['95%']}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      handleIndicatorStyle={{ backgroundColor: COLORS.strokeStrong, opacity: 0.3 }}
      backgroundStyle={{ backgroundColor: COLORS.background }}
    >
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View className="px-5 pt-4 pb-4 flex-row items-center justify-between">
          <Text className="text-text-strong" style={TYPE.sectionTitle}>
            Preview Capsule
          </Text>
          <TouchableOpacity onPress={handleClose} className="p-1.5 bg-fill-weaker rounded-full">
            <X size={16} color={COLORS.textWeak} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <BottomSheetScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 16 }}>

          {/* Controls */}
          <View className="bg-fill-weaker rounded-2xl border border-stroke-weaker p-1 mb-2">
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

          {/* Letter Card */}
          <View
             className="w-full aspect-[560/697] rounded-2xl overflow-hidden border border-stroke-weaker shadow-sm relative"
             style={{ backgroundColor: selectedTheme.color }}
          >
             <Background width="100%" height="100%" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute' }} />

             <View className="absolute inset-0 p-6 pt-10">
                {/* To / From Header */}
                <View className="flex-row items-center justify-between mb-8 opacity-80">
                   {/* typography-exception: capsule-theme-preview */}
                   <Text style={[TYPE.eyebrow, /* typography-exception: capsule-theme-preview */ {fontFamily: selectedTheme.fonts.body, color: selectedTheme.textColor}]} numberOfLines={1}>
                     To: {recipientNames || 'Someone special'}
                   </Text>
                   {/* Decorative middle icon */}
                   <View className="size-3 rounded-full border items-center justify-center mx-2 shrink-0" style={{ borderColor: selectedTheme.headerColor }}>
                     <View className="size-1 rounded-full" style={{ backgroundColor: selectedTheme.headerColor }} />
                   </View>
                   {/* typography-exception: capsule-theme-preview */}
                   <Text style={[TYPE.eyebrow, /* typography-exception: capsule-theme-preview */ {fontFamily: selectedTheme.fonts.body, color: selectedTheme.textColor}]} numberOfLines={1}>
                     From: {senderName}
                   </Text>
                </View>

                {/* Message Content */}
                <Text
                  className="text-center mb-4 uppercase tracking-widest"
                  style={[TYPE.sectionTitle, /* typography-exception: capsule-theme-preview */ {fontFamily: selectedTheme.fonts.header,
                    color: selectedTheme.headerColor}]}>
                  {title || 'Your Title'}
                </Text>
                <Text
                  className="text-center opacity-80 leading-relaxed"
                  style={{
                    /* typography-exception: capsule-theme-preview */
                    fontFamily: selectedTheme.fonts.body,
                    color: selectedTheme.textColor,
                    /* typography-exception: capsule-theme-preview */
                    fontSize: fontSize === '1x' ? 12 : fontSize === '3x' ? 16 : 14,
                  }}
                  numberOfLines={10}
                >
                  {body || 'Your message preview'}
                </Text>
             </View>
          </View>

        </BottomSheetScrollView>
      </View>
    </BottomSheetModal>
  );
});

PreviewCapsuleModal.displayName = 'PreviewCapsuleModal';
