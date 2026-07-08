import React, { forwardRef, useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, Image, Dimensions } from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetTextInput, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { X, Search, Check, Play, Music, FileText } from 'lucide-react-native';
import { COLORS, FONTS } from '@/constants/tokens';
import { Button, Spinner } from '@/components/ui';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: screenWidth } = Dimensions.get('window');
const itemWidth = (screenWidth - 56) / 2;

interface SelectFromMediaModalProps {
  selectedIds: string[];
  onConfirm: (ids: string[]) => void;
}

type MediaFileItem = {
  _id?: string;
  id?: string;
  name?: string;
  title?: string;
  type?: string;
  url?: string;
  thumbnail?: string;
};

export const SelectFromMediaModal = forwardRef<BottomSheetModal, SelectFromMediaModalProps>((props, ref) => {
  const { selectedIds, onConfirm } = props;
  const insets = useSafeAreaInsets();
  
  const [localSelected, setLocalSelected] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  
  const { data: mediaFiles = [], isLoading } = useQuery({
    queryKey: ['all-files'],
    queryFn: () => get<any>(`${endpoint.files}?limit=100`).then((r) => r.data?.docs || []),
  });
  
  const selectedSet = useMemo(() => new Set(localSelected), [localSelected]);

  const results = useMemo(() => {
    if (!query.trim()) return mediaFiles;
    const normalizedQuery = query.trim().toLowerCase();
    return mediaFiles.filter((m: MediaFileItem) => (
      m.name?.toLowerCase().includes(normalizedQuery) ||
      m.title?.toLowerCase().includes(normalizedQuery)
    ));
  }, [query, mediaFiles]);

  const renderBackdrop = useCallback(
    (backdropProps: any) => (
      <BottomSheetBackdrop {...backdropProps} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.4} pressBehavior="close" />
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

  const keyExtractor = useCallback((item: MediaFileItem, index: number) => (
    item._id || item.id || item.url || item.name || `media-${index}`
  ), []);

  const renderMediaItem = useCallback(({ item: m }: { item: MediaFileItem }) => {
    const mediaId = m._id || m.id;
    if (!mediaId) return null;

    const isSelected = selectedSet.has(mediaId);

    return (
      <TouchableOpacity
        onPress={() => toggleSelection(mediaId)}
        activeOpacity={0.8}
        style={{ width: itemWidth, height: itemWidth }}
        className={`bg-fill-weaker rounded-xl border-2 ${isSelected ? 'border-brand' : 'border-transparent'} shadow-sm overflow-hidden items-center justify-center relative`}
      >
        {m.type?.includes('image') && (m.url || m.thumbnail) ? (
          <Image source={{ uri: m.url || m.thumbnail }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : m.type?.includes('video') ? (
          <View className="size-full items-center justify-center relative">
            {m.thumbnail || m.url ? (
              <Image source={{ uri: m.thumbnail || m.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <View className="size-full bg-fill-weak" />
            )}
            <View className="absolute inset-0 items-center justify-center bg-black/10">
              <View className="w-10 h-10 rounded-full bg-white/90 items-center justify-center shadow-md">
                <Play size={16} color="#000000" fill="#000000" style={{ marginLeft: 2 }} />
              </View>
            </View>
          </View>
        ) : m.type?.includes('audio') ? (
          <View className="size-full bg-fill-weaker items-center justify-center">
            <Music size={28} color={COLORS.textWeak} />
            <Text className="text-[9px] uppercase tracking-wider text-text-weak font-bold mt-2" style={{ fontFamily: FONTS.sansBold }}>Audio</Text>
          </View>
        ) : (
          <View className="size-full bg-fill-weaker items-center justify-center">
            <FileText size={28} color={COLORS.textWeak} />
            <Text className="text-[9px] uppercase tracking-wider text-text-weak font-bold mt-2" style={{ fontFamily: FONTS.sansBold }}>
              {m.type?.toUpperCase() || 'FILE'}
            </Text>
          </View>
        )}

        {isSelected && (
          <View className="absolute inset-0 bg-brand/10 items-start justify-end p-2.5">
            <View className="size-5 rounded-full bg-brand items-center justify-center shadow-sm">
              <Check size={12} color="white" strokeWidth={3} />
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  }, [selectedSet, toggleSelection]);

  const renderEmptyState = useCallback(() => (
    <View className="py-10 items-center justify-center">
      {isLoading ? (
        <Spinner />
      ) : (
        <Text className="text-center text-text-weak" style={{ fontFamily: FONTS.sans }}>
          No media found.
        </Text>
      )}
    </View>
  ), [isLoading]);

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
            Select item from Media {mediaFiles.length > 0 ? `(${results.length})` : ''}
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
              placeholder="Search media files"
              placeholderTextColor={COLORS.textWeak}
              className="flex-1 ml-2 text-sm text-text-strong h-full"
              style={{ fontFamily: FONTS.sans }}
            />
          </View>
        </View>

        <BottomSheetFlatList
          data={isLoading ? [] : results}
          keyExtractor={keyExtractor}
          renderItem={renderMediaItem}
          numColumns={2}
          initialNumToRender={8}
          maxToRenderPerBatch={6}
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
              {localSelected.length > 0 ? `Select ${localSelected.length} items` : 'Select items'}
            </Text>
          </Button>
        </View>
      </View>
    </BottomSheetModal>
  );
});

SelectFromMediaModal.displayName = 'SelectFromMediaModal';
