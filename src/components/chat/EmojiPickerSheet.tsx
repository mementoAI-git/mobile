import { useThemeStyles } from '@/hooks/use-theme-colors';
import React, { forwardRef, useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import type { ThemeColors } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import { getSheetBottomPadding, getSheetTopInset, SHEET_HEADER_HANDLE_STYLE } from '@/features/layout/sheet-safe-area';
import { EMOJI_CATEGORIES, type EmojiCategory } from '@/features/chat/emoji-data';

interface EmojiPickerSheetProps {
  onSelectEmoji: (emoji: string) => void;
  onClose?: () => void;
  managed?: boolean;
}

const NUM_COLUMNS = 7;

export const EmojiPickerSheet = forwardRef<BottomSheetModal, EmojiPickerSheetProps>(
  function EmojiPickerSheet({ onSelectEmoji, onClose, managed = false }, ref) {
  const styles = useThemeStyles(createStyles);
    const { width: windowWidth } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const emojiSize = useMemo(() => {
      const columns = Math.min(NUM_COLUMNS, Math.floor((windowWidth - 40) / 44));
      return Math.floor((windowWidth - 40) / Math.max(1, columns));
    }, [windowWidth]);
    const snapPoints = useMemo(() => ['42%', '65%'], []);
    const [activeCategoryId, setActiveCategoryId] = useState<string>(EMOJI_CATEGORIES[0].id);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.3}
        />
      ),
      []
    );

    const handleSelectEmoji = useCallback(
      (emoji: string) => {
        Haptics.selectionAsync();
        onSelectEmoji(emoji);
        if (managed) onClose?.();
      },
      [onSelectEmoji, managed, onClose]
    );

    const handleCategoryTab = useCallback((catId: string) => {
      Haptics.selectionAsync();
      setActiveCategoryId(catId);
    }, []);

    const activeCategory = useMemo(() => {
      return (
        EMOJI_CATEGORIES.find((c) => c.id === activeCategoryId) ??
        EMOJI_CATEGORIES[0]
      );
    }, [activeCategoryId]);

    const content = (
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Emoji</Text>
            {/* Category tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabContainer}
            >
              {EMOJI_CATEGORIES.map((cat) => {
                const isActive = cat.id === activeCategoryId;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    accessibilityRole="button"
                    accessibilityLabel={cat.name}
                    accessibilityState={{ selected: isActive }}
                    onPress={() => handleCategoryTab(cat.id)}
                    style={[styles.categoryTab, isActive && styles.categoryTabActive]}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.tabIcon}>{cat.icon}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Emoji Grid */}
          <BottomSheetScrollView
            contentContainerStyle={[styles.gridContent, {paddingBottom: getSheetBottomPadding(insets.bottom, 16)}]}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.categoryHeading}>{activeCategory.name}</Text>
            <View style={styles.emojiGrid}>
              {activeCategory.emojis.map((emoji, idx) => (
                <TouchableOpacity
                  key={`${emoji}-${idx}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Choose ${emoji}`}
                  onPress={() => handleSelectEmoji(emoji)}
                  style={[styles.emojiButton, { width: emojiSize, height: emojiSize }]}
                  activeOpacity={0.6}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </BottomSheetScrollView>
        </View>
    );

    if (managed) return content;

    return (
      <BottomSheetModal
        ref={ref}
        topInset={getSheetTopInset(insets.top)}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        handleStyle={SHEET_HEADER_HANDLE_STYLE}
        handleIndicatorStyle={styles.handleIndicator}
        backgroundStyle={styles.sheetBackground}
        onDismiss={onClose}
      >
        {content}
      </BottomSheetModal>
    );
  }
);

const createStyles = (COLORS: ThemeColors) => StyleSheet.create({
  sheetBackground: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicator: {
    backgroundColor: COLORS.strokeStrong,
    opacity: 0.3,
    width: 36,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 0,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.strokeWeaker,
    gap: 12,
  },
  title: {
    ...TYPE.cardTitle,
    color: COLORS.textStrong,
  },
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryTab: {
    width: 44,
    height: 44,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.fillWeaker,
  },
  categoryTabActive: {
    backgroundColor: COLORS.brandSubtle,
    borderWidth: 1,
    borderColor: COLORS.brand,
  },
  tabIcon: {
    ...TYPE.cardTitle,
  },
  gridContent: {
    paddingVertical: 12,
    paddingBottom: 32,
  },
  categoryHeading: {
    ...TYPE.eyebrow,
    color: COLORS.textWeak,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  emojiButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    ...TYPE.screenTitle,
  },
});
