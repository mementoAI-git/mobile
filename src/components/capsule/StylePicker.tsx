import React, { useRef, useState } from 'react';
import { View, Text } from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import Check from 'lucide-react-native/icons/check';
import { SheetHeader } from '@/components/sheets/SheetHeader';
import { CAPSULE_THEMES, Theme } from '@/constants/themes';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { iconSize } from '@/constants/responsive';
import { SHEET_GROUP_GAP, getSheetActionsBottomPadding } from '@/features/layout/sheet-safe-area';
import { useCapsuleThemeFonts } from '@/hooks/use-capsule-theme-fonts';
import { useSheetChrome } from '@/components/sheets/use-sheet-chrome';

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
  useCapsuleThemeFonts();
  const insets = useSafeAreaInsets();
  const sheetChrome = useSheetChrome();
  const currentTheme = CAPSULE_THEMES.find(t => t.id === currentThemeId) || CAPSULE_THEMES[0];
  const sizes = ['1x', '2x', '3x'];

  const themeModalRef = useRef<BottomSheetModal>(null);
  const sizeModalRef = useRef<BottomSheetModal>(null);


  const handleStylePress = () => themeModalRef.current?.present();
  const handleSizePress = () => sizeModalRef.current?.present();

  return (
    <>
      <View className="bg-card rounded-2xl p-4 gap-4 border border-stroke-weaker shadow-sm w-full">
        <View className="flex-row items-end justify-between gap-4">
          {/* Theme Circles */}
          <View className="flex-1">
            <Text className="text-text-weak uppercase tracking-widest mb-2" style={TYPE.eyebrow}>
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
                    hitSlop={6}
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
                    {isSelected && <Check size={iconSize(14)} color={theme.headerColor} strokeWidth={3} />}
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
            <Text className="text-text-weak uppercase tracking-widest mb-2" style={TYPE.eyebrow}>
              Style
            </Text>
            <View className="h-10 px-3 rounded-lg bg-fill-weaker border border-stroke-weaker flex-row items-center justify-between">
              <Text className="text-text-strong" style={TYPE.metadata}>
                {currentTheme.name}
              </Text>
              <ChevronDown size={iconSize(14)} color={COLORS.textWeak} />
            </View>
          </TouchableOpacity>

          {/* Size Picker */}
          <TouchableOpacity
            className="w-16"
            onPress={handleSizePress}
            activeOpacity={0.7}
          >
            <Text className="text-text-weak uppercase tracking-widest mb-2" style={TYPE.eyebrow}>
              Size
            </Text>
            <View className="h-10 px-3 rounded-lg bg-fill-weaker border border-stroke-weaker flex-row items-center justify-center">
              <Text className="text-text-strong" style={TYPE.metadata}>
                {fontSize}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Theme Selection Modal */}
      <BottomSheetModal
        ref={themeModalRef}
        {...sheetChrome.props}
        snapPoints={sheetChrome.snapPoints(['50%'])}
      >
        <SheetHeader
          title="Choose a theme"
          onClose={() => themeModalRef.current?.dismiss()}
          style={{ paddingHorizontal: 20 }}
        />
        <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: SHEET_GROUP_GAP, paddingBottom: getSheetActionsBottomPadding(insets.bottom), gap: 12 }}>
          {CAPSULE_THEMES.map((theme) => {
            const isSelected = theme.id === currentThemeId;
            return (
              <TouchableOpacity
                key={theme.id}
                onPress={() => { onThemeSelect(theme); themeModalRef.current?.dismiss(); }}
                className={`p-4 rounded-xl flex-row items-center justify-between border ${isSelected ? 'border-brand bg-brand/5' : 'border-stroke-weaker bg-card'}`}
              >
                <View className="flex-row items-center gap-3">
                  <View className="size-8 rounded-full border border-stroke-weak" style={{ backgroundColor: theme.color }} />
                  <Text className={isSelected ? 'text-brand' : 'text-text-strong'} style={TYPE.label}>{theme.name}</Text>
                </View>
                {isSelected && <Check size={iconSize(20)} color={COLORS.brand} />}
              </TouchableOpacity>
            );
          })}
        </BottomSheetScrollView>
      </BottomSheetModal>

      {/* Size Selection Modal */}
      <BottomSheetModal
        ref={sizeModalRef}
        {...sheetChrome.props}
        snapPoints={sheetChrome.snapPoints(['40%'])}
      >
        <SheetHeader
          title="Choose a size"
          onClose={() => sizeModalRef.current?.dismiss()}
          style={{ paddingHorizontal: 20 }}
        />
        <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: SHEET_GROUP_GAP, paddingBottom: getSheetActionsBottomPadding(insets.bottom), gap: 12 }}>
          {sizes.map((size) => {
            const isSelected = size === fontSize;
            return (
              <TouchableOpacity
                key={size}
                onPress={() => { onSizeSelect(size); sizeModalRef.current?.dismiss(); }}
                className={`p-4 rounded-xl flex-row items-center justify-between border ${isSelected ? 'border-brand bg-brand/5' : 'border-stroke-weaker bg-card'}`}
              >
                <Text className={isSelected ? 'text-brand' : 'text-text-strong'} style={TYPE.label}>{size}</Text>
                {isSelected && <Check size={iconSize(20)} color={COLORS.brand} />}
              </TouchableOpacity>
            );
          })}
        </BottomSheetScrollView>
      </BottomSheetModal>
    </>
  );
}
