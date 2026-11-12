import { useThemeColors } from '@/hooks/use-theme-colors';
import React, { forwardRef, useState, useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { BottomSheetModal, BottomSheetTextInput, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import Search from 'lucide-react-native/icons/search';
import Check from 'lucide-react-native/icons/check';
import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { iconSize } from '@/constants/responsive';
import { Button, Skeleton } from '@/components/ui';
import { useMemories } from '@/hooks/queries/use-memories';
import { MasonryMemoryCard } from '@/components/memory/MasonryMemoryCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { IMemory } from '@/types';
import { useSheetChrome } from '@/components/sheets/use-sheet-chrome';
import { SHEET_GROUP_GAP, getSheetActionsBottomPadding } from '@/features/layout/sheet-safe-area';
import { SheetHeader } from './SheetHeader';

interface SelectFromMemoryModalProps {
  selectedIds: string[];
  onConfirm: (ids: string[]) => void;
}

export const SelectFromMemoryModal = React.memo(
  forwardRef<BottomSheetModal, SelectFromMemoryModalProps>((props, ref) => {
  const COLORS = useThemeColors();
  const sheetChrome = useSheetChrome();
    const { selectedIds, onConfirm } = props;

    const [localSelected, setLocalSelected] = useState<string[]>([]);
    const [query, setQuery] = useState('');

    const { data, isLoading } = useMemories();
    const memories = useMemo(() => data?.pages.flatMap((p) => p.docs) ?? [], [data?.pages]);
    const selectedSet = useMemo(() => new Set(localSelected), [localSelected]);

    const results = useMemo(() => {
      if (!query.trim()) return memories;
      const normalizedQuery = query.trim().toLowerCase();
      return memories.filter(m => (
        m.title?.toLowerCase().includes(normalizedQuery) ||
        m.body?.toLowerCase().includes(normalizedQuery)
      ));
    }, [query, memories]);


    const handleClose = useCallback(() => {
      if (ref && 'current' in ref && ref.current) {
        ref.current.dismiss();
      }
    }, [ref]);

    const handlePresent = useCallback(() => {
      setLocalSelected(selectedIds);
    }, [selectedIds]);

    const toggleSelection = useCallback((id: string) => {
      setLocalSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    }, []);

    const handleConfirm = useCallback(() => {
      onConfirm(localSelected);
      handleClose();
    }, [handleClose, localSelected, onConfirm]);

    const renderItem = useCallback(
      ({ item }: { item: IMemory }) => {
        const isSelected = selectedSet.has(item._id);
        return (
          <TouchableOpacity
            onPress={() => toggleSelection(item._id)}
            activeOpacity={0.8}
            style={{ width: '48%' }}
            className={`rounded-xl border-2 mb-4 relative ${isSelected ? 'border-brand' : 'border-transparent'}`}
          >
            <View className="pointer-events-none flex-1">
              <MasonryMemoryCard memory={item} />
            </View>
            {isSelected && (
              <View className="absolute top-2 right-2 bg-brand rounded-full p-1 z-10 shadow-sm">
                <Check size={iconSize(12)} color="white" strokeWidth={3} />
              </View>
            )}
          </TouchableOpacity>
        );
      },
      [selectedSet, toggleSelection]
    );

    const insets = useSafeAreaInsets();

    return (
      <BottomSheetModal
        ref={ref}
        {...sheetChrome.props}
        snapPoints={sheetChrome.snapPoints(['90%'])}
        onAnimate={(fromIndex, toIndex) => {
          if (fromIndex === -1 && toIndex === 0) {
            handlePresent();
          }
        }}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
      >
        <View className="flex-1 px-5" style={{ paddingBottom: getSheetActionsBottomPadding(insets.bottom) }}>
          <SheetHeader
            title="Link memory"
            onClose={handleClose}
            closeLabel="Close link memory"
            style={{ marginBottom: SHEET_GROUP_GAP }}
          />

          {/* Search Input */}
          <View className="flex-row items-center bg-fill-weak border border-stroke-weaker rounded-lg px-4 h-12 mb-6">
            <Search size={iconSize(18)} color={COLORS.textWeak} className="mr-2" />
            <BottomSheetTextInput
              placeholder="Search memories..."
              placeholderTextColor={COLORS.textMuted}
              value={query}
              onChangeText={setQuery}
              className="flex-1 text-text-strong p-0"
              style={TYPE.input}
            />
          </View>

          {/* List */}
          <View style={{ flex: 1 }}>
          {isLoading && !memories.length ? (
            <View className="flex-row gap-4">
              <View className="flex-1 gap-4">
                <Skeleton className="h-[180px] w-full rounded-2xl" />
                <Skeleton className="h-[140px] w-full rounded-2xl" />
              </View>
              <View className="flex-1 gap-4">
                <Skeleton className="h-[140px] w-full rounded-2xl" />
                <Skeleton className="h-[180px] w-full rounded-2xl" />
              </View>
            </View>
          ) : (
            <BottomSheetFlatList
              data={results}
              keyExtractor={(item) => item._id}
              renderItem={renderItem}
              numColumns={2}
              columnWrapperStyle={{ justifyContent: 'space-between' }}
              contentContainerStyle={{ paddingBottom: 16 }}
              showsVerticalScrollIndicator={false}
            />
          )}
          </View>

          {/* Footer Actions */}
          <View className="flex-row gap-3 pt-4" style={{ backgroundColor: COLORS.sheet }}>
            <Button variant="outline" size="lg" rounded="full" className="h-14 flex-1" onPress={handleClose}>
              Cancel
            </Button>
            <Button size="lg" rounded="full" className="h-14 flex-1" onPress={handleConfirm}>
              {localSelected.length > 0 ? `Add ${localSelected.length} to capsule` : 'Add to capsule'}
            </Button>
          </View>
        </View>
      </BottomSheetModal>
    );
  })
);

SelectFromMemoryModal.displayName = 'SelectFromMemoryModal';
