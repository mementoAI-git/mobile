import React, { useCallback } from 'react';
import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import MoreHorizontal from 'lucide-react-native/icons/ellipsis';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { TYPE } from '@/constants/typography';
import { getQuestionIdenticonUrl } from '@/features/explore/question-presentation';
import type { ObservationItem } from '@/features/insights/insights-model';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useUiStore } from '@/store';
import { INSIGHTS_RADIUS, InsightsPressable } from './InsightsPrimitives';

const ObservationCard = React.memo(function ObservationCard({
  item,
  onOpen,
}: {
  item: ObservationItem;
  onOpen: (item: ObservationItem) => void;
}) {
  const colors = useThemeColors();
  const open = useCallback(() => onOpen(item), [item, onOpen]);
  const openOptions = useCallback(() => {
    Haptics.selectionAsync();
    useUiStore.getState().openSheet('observation-note', { item, onOpenSources: onOpen });
  }, [item, onOpen]);

  return (
    <InsightsPressable
      onPress={open}
      accessibilityLabel={item.title}
      style={{
        minHeight: 84,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 16,
        paddingVertical: 20,
        paddingLeft: 16,
        paddingRight: 8,
        borderRadius: INSIGHTS_RADIUS,
        backgroundColor: colors.fillWeak,
      }}
    >
      <Image
        source={{ uri: getQuestionIdenticonUrl(item.id) }}
        style={{ width: 40, height: 40, borderRadius: 6, backgroundColor: colors.fillWeak }}
        contentFit="cover"
        accessibilityElementsHidden
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[TYPE.bodyStrong, { color: colors.textStrong }]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={[TYPE.bodySmall, { color: colors.textBase, marginTop: 4 }]} numberOfLines={1}>
          {item.detail}
        </Text>
      </View>
      <TouchableOpacity
        onPress={openOptions}
        accessibilityRole="button"
        accessibilityLabel={`Options for ${item.title}`}
        hitSlop={4}
        style={{ width: 40, height: 40, marginTop: -8, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}
      >
        <MoreHorizontal size={20} color={colors.textBase} />
      </TouchableOpacity>
    </InsightsPressable>
  );
});

/** Web `observation-list.tsx`: notes and preferences, each with Sources, Edit and Forget. */
export function ObservationList({
  items,
  onOpen,
}: {
  items: ObservationItem[];
  onOpen: (item: ObservationItem) => void;
}) {
  return (
    <View style={{ gap: 16 }}>
      {items.map((item) => (
        <ObservationCard key={item.id} item={item} onOpen={onOpen} />
      ))}
    </View>
  );
}
