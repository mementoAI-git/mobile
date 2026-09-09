import React, { forwardRef, useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { X } from 'lucide-react-native';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { EMOJI_CATEGORIES, type EmojiCategory } from '@/features/chat/emoji-data';

interface EmojiPickerSheetProps {
  onSelectEmoji: (emoji: string) => void;
  onClose?: () => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const NUM_COLUMNS = 7;
const EMOJI_SIZE = Math.floor((SCREEN_WIDTH - 40) / NUM_COLUMNS);

export const EmojiPickerSheet = forwardRef<BottomSheetModal, EmojiPickerSheetProps>(
  function EmojiPickerSheet({ onSelectEmoji, onClose }, ref) {
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
      },
      [onSelectEmoji]
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

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={styles.handleIndicator}
        backgroundStyle={styles.sheetBackground}
        onDismiss={onClose}
      >
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
            contentContainerStyle={styles.gridContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.categoryHeading}>{activeCategory.name}</Text>
            <View style={styles.emojiGrid}>
              {activeCategory.emojis.map((emoji, idx) => (
                <TouchableOpacity
                  key={`${emoji}-${idx}`}
                  onPress={() => handleSelectEmoji(emoji)}
                  style={[styles.emojiButton, { width: EMOJI_SIZE, height: EMOJI_SIZE }]}
                  activeOpacity={0.6}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </BottomSheetScrollView>
        </View>
      </BottomSheetModal>
    );
  }
);

const styles = StyleSheet.create({
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
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
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
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.fillWeaker,
  },
  categoryTabActive: {
    backgroundColor: `${COLORS.brand}1A`,
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
