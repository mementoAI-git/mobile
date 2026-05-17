import React, { useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { ChevronDown, Check, X } from 'lucide-react-native';
import { CAPSULE_THEMES, Theme } from '@/constants/themes';
import { COLORS, FONTS } from '@/constants/tokens';

interface StylePickerProps {
  currentThemeId?: string;
  onThemeSelect: (theme: Theme) => void;
  fontSize: string;
  onSizeSelect: (size: string) => void;
}

export function StylePicker({
  currentThemeId,
  onThemeSelect,
  fontSize,
  onSizeSelect
}: StylePickerProps) {
  const currentTheme = CAPSULE_THEMES.find(t => t.id === currentThemeId) || CAPSULE_THEMES[0];
  const sizes = ['1x', '2x', '3x'];

  const themeModalRef = useRef<BottomSheetModal>(null);
  const sizeModalRef = useRef<BottomSheetModal>(null);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.4} pressBehavior="close" />
    ),
    []
  );

  const handleStylePress = () => themeModalRef.current?.present();
  const handleSizePress = () => sizeModalRef.current?.present();

  return (
    <>
      <View className="bg-white rounded-2xl p-4 gap-4 border border-stroke-weaker shadow-sm w-full">
        <View className="flex-row items-end justify-between gap-4">
          {/* Theme Circles */}
          <View className="flex-1">
            <Text className="text-[10px] text-text-weak uppercase tracking-widest font-bold mb-2" style={{ fontFamily: FONTS.sansBold }}>
              Theme
            </Text>
            <View className="flex-row items-center h-10">
              {CAPSULE_THEMES.map((theme, index) => {
                const isSelected = currentTheme.id === theme.id;
                return (
                  <TouchableOpacity
                    key={theme.id}
                    onPress={() => onThemeSelect(theme)}
                    activeOpacity={0.8}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: theme.color,
                      borderWidth: 2,
                      borderColor: '#FFFFFF',
                      marginLeft: index === 0 ? 0 : -16,
                      zIndex: isSelected ? 20 : 10 - index,
                      transform: [{ scale: isSelected ? 1.15 : 1 }],
                    }}
                    className="items-center justify-center shadow-sm"
                  >
                    {isSelected && <Check size={14} color={theme.headerColor} strokeWidth={3} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Style Dropdown */}
          <TouchableOpacity
            className="flex-1"
            onPress={handleStylePress}
            activeOpacity={0.7}
          >
            <Text className="text-[10px] text-text-weak uppercase tracking-widest font-bold mb-2" style={{ fontFamily: FONTS.sansBold }}>
              Style
            </Text>
            <View className="h-10 px-3 rounded-lg bg-fill-weaker border border-stroke-weaker flex-row items-center justify-between">
              <Text className="text-xs text-text-strong font-medium" style={{ fontFamily: FONTS.sansMedium }}>
                {currentTheme.name}
              </Text>
              <ChevronDown size={14} color={COLORS.textWeak} />
            </View>
          </TouchableOpacity>

          {/* Size Picker */}
          <TouchableOpacity
            className="w-16"
            onPress={handleSizePress}
            activeOpacity={0.7}
          >
            <Text className="text-[10px] text-text-weak uppercase tracking-widest font-bold mb-2" style={{ fontFamily: FONTS.sansBold }}>
              Size
            </Text>
            <View className="h-10 px-3 rounded-lg bg-fill-weaker border border-stroke-weaker flex-row items-center justify-center">
              <Text className="text-xs text-text-strong font-medium" style={{ fontFamily: FONTS.sansMedium }}>
                {fontSize}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Theme Selection Modal */}
      <BottomSheetModal
        ref={themeModalRef}
        snapPoints={['50%']}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: COLORS.strokeStrong, opacity: 0.3 }}
      >
        <View className="px-5 py-4 border-b border-stroke-weaker flex-row justify-between items-center">
          <Text className="text-lg font-bold" style={{ fontFamily: FONTS.sansBold }}>Select Theme</Text>
          <TouchableOpacity onPress={() => themeModalRef.current?.dismiss()}>
            <X size={20} color={COLORS.textWeak} />
          </TouchableOpacity>
        </View>
        <BottomSheetScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
          {CAPSULE_THEMES.map((theme) => {
            const isSelected = theme.id === currentThemeId;
            return (
              <TouchableOpacity
                key={theme.id}
                onPress={() => { onThemeSelect(theme); themeModalRef.current?.dismiss(); }}
                className={`p-4 rounded-xl flex-row items-center justify-between border ${isSelected ? 'border-brand bg-brand/5' : 'border-stroke-weaker bg-white'}`}
              >
                <View className="flex-row items-center gap-3">
                  <View className="size-8 rounded-full border border-stroke-weak" style={{ backgroundColor: theme.color }} />
                  <Text className={`text-base font-medium ${isSelected ? 'text-brand' : 'text-text-strong'}`} style={{ fontFamily: FONTS.sansMedium }}>{theme.name}</Text>
                </View>
                {isSelected && <Check size={20} color={COLORS.brand} />}
              </TouchableOpacity>
            );
          })}
        </BottomSheetScrollView>
      </BottomSheetModal>

      {/* Size Selection Modal */}
      <BottomSheetModal
        ref={sizeModalRef}
        snapPoints={['40%']}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: COLORS.strokeStrong, opacity: 0.3 }}
      >
        <View className="px-5 py-4 border-b border-stroke-weaker flex-row justify-between items-center">
          <Text className="text-lg font-bold" style={{ fontFamily: FONTS.sansBold }}>Select Size</Text>
          <TouchableOpacity onPress={() => sizeModalRef.current?.dismiss()}>
            <X size={20} color={COLORS.textWeak} />
          </TouchableOpacity>
        </View>
        <BottomSheetScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
          {sizes.map((size) => {
            const isSelected = size === fontSize;
            return (
              <TouchableOpacity
                key={size}
                onPress={() => { onSizeSelect(size); sizeModalRef.current?.dismiss(); }}
                className={`p-4 rounded-xl flex-row items-center justify-between border ${isSelected ? 'border-brand bg-brand/5' : 'border-stroke-weaker bg-white'}`}
              >
                <Text className={`text-base font-medium ${isSelected ? 'text-brand' : 'text-text-strong'}`} style={{ fontFamily: FONTS.sansMedium }}>{size}</Text>
                {isSelected && <Check size={20} color={COLORS.brand} />}
              </TouchableOpacity>
            );
          })}
        </BottomSheetScrollView>
      </BottomSheetModal>
    </>
  );
}
