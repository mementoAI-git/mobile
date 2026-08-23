import React, { forwardRef, useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetTextInput, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { X, Search, Check } from 'lucide-react-native';
import { COLORS, FONTS } from '@/constants/tokens';
import { Button } from '@/components/ui';
import { useMemories } from '@/hooks/queries/use-memories';
import { MasonryMemoryCard } from '@/components/memory/MasonryMemoryCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { IMemory } from '@/types';

interface SelectFromMemoryModalProps {
  selectedIds: string[];
  onConfirm: (ids: string[]) => void;
}

export const SelectFromMemoryModal = React.memo(
  forwardRef<BottomSheetModal, SelectFromMemoryModalProps>((props, ref) => {
    const { selectedIds, onConfirm } = props;
    
    const [localSelected, setLocalSelected] = useState<string[]>([]);
    const [query, setQuery] = useState('');
    
    const { data } = useMemories();
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

    const renderBackdrop = useCallback(
      (backdropProps: any) => (
        <BottomSheetBackdrop {...backdropProps} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.4} />
      ),
      []
    );

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
                <Check size={12} color="white" strokeWidth={3} />
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
        snapPoints={['90%']}
        backdropComponent={renderBackdrop}
        onAnimate={(fromIndex, toIndex) => {
          if (fromIndex === -1 && toIndex === 0) {
            handlePresent();
          }
        }}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        handleIndicatorStyle={{ backgroundColor: COLORS.strokeStrong, opacity: 0.3 }}
        backgroundStyle={{ backgroundColor: COLORS.background }}
      >
        <View className="flex-1 px-5 pt-4 pb-8" style={{ paddingBottom: insets.bottom ? insets.bottom + 12 : 32 }}>
          {/* Header */}
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl text-text-strong" style={{ fontFamily: FONTS.serifMedium }}>Link Memory</Text>
            <TouchableOpacity onPress={handleClose}>
              <X size={20} color={COLORS.textWeak} />
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View className="flex-row items-center bg-fill-weak border border-stroke-weaker rounded-full px-4 h-12 mb-4">
            <Search size={18} color={COLORS.textWeak} className="mr-2" />
            <BottomSheetTextInput
              placeholder="Search memories..."
              placeholderTextColor={COLORS.textMuted}
              value={query}
              onChangeText={setQuery}
              className="flex-1 text-sm text-text-strong p-0"
              style={{ fontFamily: FONTS.sans }}
            />
          </View>

          {/* List */}
          <BottomSheetFlatList
            data={results}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            numColumns={2}
            columnWrapperStyle={{ justifyContent: 'space-between' }}
            contentContainerStyle={{ paddingBottom: 80 }}
            showsVerticalScrollIndicator={false}
          />

          {/* Footer Actions */}
          <View className="absolute bottom-5 left-5 right-5 flex-row gap-4 bg-background pt-4 border-t border-stroke-weaker">
            <Button variant="outline" onPress={handleClose} className="flex-1 rounded-full border-stroke-weak bg-white">
              <Text className="text-sm font-medium text-text-strong">Cancel</Text>
            </Button>
            <Button 
              onPress={handleConfirm} 
              className="flex-1 bg-brand rounded-full"
            >
              <Text className="text-sm font-medium text-white">
                {localSelected.length > 0 ? `Add ${localSelected.length} to capsule` : 'Add to capsule'}
              </Text>
            </Button>
          </View>
        </View>
      </BottomSheetModal>
    );
  })
);

SelectFromMemoryModal.displayName = 'SelectFromMemoryModal';
