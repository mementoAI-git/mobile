import React, { forwardRef, useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetTextInput, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { X, Search } from 'lucide-react-native';
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

export const SelectFromMemoryModal = forwardRef<BottomSheetModal, SelectFromMemoryModalProps>((props, ref) => {
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

  const keyExtractor = useCallback((item: IMemory) => item._id, []);

  const renderMemoryItem = useCallback(({ item: memory }: { item: IMemory }) => {
    const isSelected = selectedSet.has(memory._id);

    return (
      <TouchableOpacity
        onPress={() => toggleSelection(memory._id)}
        activeOpacity={0.8}
        className={`w-[48%] rounded-xl border-2 ${isSelected ? 'border-brand' : 'border-transparent'}`}
      >
        <View className="pointer-events-none flex-1">
          <MasonryMemoryCard memory={memory} />
        </View>
        {isSelected && (
          <View className="absolute top-2 right-2 bg-brand rounded-full p-1 z-10 shadow-sm">
            <X size={12} color="white" style={{ transform: [{ rotate: '45deg' }] }} />
          </View>
        )}
      </TouchableOpacity>
    );
  }, [selectedSet, toggleSelection]);

  const renderEmptyState = useCallback(() => (
    <Text className="text-center text-text-weak mt-10" style={{ fontFamily: FONTS.sans }}>
      No memories found.
    </Text>
  ), []);

  const insets = useSafeAreaInsets();

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      snapPoints={['90%']}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      onChange={(index) => {
        if (index === 0) handlePresent();
      }}
      handleIndicatorStyle={{ backgroundColor: COLORS.strokeStrong, opacity: 0.3 }}
      backgroundStyle={{ backgroundColor: COLORS.background }}
    >
      <View className="flex-1">
        {/* Header */}
        <View className="px-5 pt-4 pb-4 flex-row items-center justify-between">
          <Text className="text-xl text-text-strong" style={{ fontFamily: FONTS.serif }}>
            Select item from memory {memories.length > 0 ? `(${results.length})` : ''}
          </Text>
          <TouchableOpacity onPress={handleClose} className="p-1.5 bg-fill-weaker rounded-full">
            <X size={16} color={COLORS.textWeak} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View className="px-5 mb-4">
          <View className="flex-row items-center bg-fill-weaker border border-stroke-weaker rounded-xl px-3 h-11">
            <Search size={18} color={COLORS.textWeak} />
            <BottomSheetTextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search memory"
              placeholderTextColor={COLORS.textWeak}
              className="flex-1 ml-2 text-sm text-text-strong h-full"
              style={{ fontFamily: FONTS.sans }}
            />
          </View>
        </View>

        <BottomSheetFlatList
          data={results}
          keyExtractor={keyExtractor}
          renderItem={renderMemoryItem}
          numColumns={2}
          initialNumToRender={6}
          maxToRenderPerBatch={4}
          windowSize={5}
          removeClippedSubviews
          columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 16 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          ListEmptyComponent={renderEmptyState}
        />

        {/* Footer (Sticky) */}
        <View 
          className="flex-row gap-3 px-5 pt-4 border-t border-stroke-weaker bg-white/95"
          style={{ paddingBottom: insets.bottom ? insets.bottom + 8 : 16 }}
        >
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
});

SelectFromMemoryModal.displayName = 'SelectFromMemoryModal';
