import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS } from '@/constants/tokens';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface PromptReflectionHeaderProps {
  title: string;
  category?: string;
  hasHistory?: boolean;
}

export function PromptReflectionHeader({
  title,
  category,
}: PromptReflectionHeaderProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleToggle = useCallback(() => {
    Haptics.selectionAsync();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded((prev) => !prev);
  }, []);

  const formattedCategory = category
    ? category.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : "Today's reflection";

  if (!title) return null;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={handleToggle}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`Topic question: ${title}. Tap to ${isExpanded ? 'collapse' : 'expand'}.`}
    >
      {isExpanded ? (
        <View style={styles.expandedContent}>
          <View style={styles.expandedTopRow}>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryText}>{formattedCategory}</Text>
            </View>
            <View style={styles.chevronButton}>
              <ChevronUp size={16} color={COLORS.textWeak} />
            </View>
          </View>
          <Text style={styles.expandedTitle}>{title}</Text>
        </View>
      ) : (
        <View style={styles.collapsedRow}>
          <View style={styles.categoryPillCompact}>
            <Text style={styles.categoryTextCompact}>{formattedCategory}</Text>
          </View>
          <Text numberOfLines={1} style={styles.collapsedTitle}>
            {title}
          </Text>
          <View style={styles.chevronButtonCompact}>
            <ChevronDown size={14} color={COLORS.textWeak} />
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginHorizontal: 0,
    marginTop: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.strokeWeaker,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  } as ViewStyle,
  expandedContent: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 10,
  } as ViewStyle,
  expandedTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.brandSubtle,
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  } as ViewStyle,
  categoryText: {
    fontFamily: FONTS.sansBold,
    fontSize: 10,
    color: COLORS.brand,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  } as TextStyle,
  chevronButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.fillWeaker,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  expandedTitle: {
    fontFamily: FONTS.serif,
    fontSize: 18,
    lineHeight: 25,
    color: COLORS.textStrong,
  } as TextStyle,
  collapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  } as ViewStyle,
  categoryPillCompact: {
    backgroundColor: COLORS.brandSubtle,
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    flexShrink: 0,
  } as ViewStyle,
  categoryTextCompact: {
    fontFamily: FONTS.sansBold,
    fontSize: 9,
    color: COLORS.brand,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  } as TextStyle,
  collapsedTitle: {
    flex: 1,
    fontFamily: FONTS.serif,
    fontSize: 14,
    color: COLORS.textStrong,
  } as TextStyle,
  chevronButtonCompact: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.fillWeaker,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
});
