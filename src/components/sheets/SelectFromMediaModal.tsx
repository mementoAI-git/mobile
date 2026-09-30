import React, { forwardRef, useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, Image, useWindowDimensions } from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetTextInput, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { X, Search, Check, Play, Music, FileText } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { Button, Spinner, Skeleton } from '@/components/ui';
import { iconSize, radius, minTouchTarget } from '@/constants/responsive';
import { useFiles } from '@/hooks/queries/use-files';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getSheetTopInset } from '@/features/layout/sheet-safe-area';

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

export const SelectFromMediaModal = React.memo(
  forwardRef<BottomSheetModal, SelectFromMediaModalProps>((props, ref) => {
    const { selectedIds, onConfirm } = props;
    const { width: screenWidth } = useWindowDimensions();
    const itemWidth = useMemo(() => (screenWidth - 56) / 2, [screenWidth]);
    const insets = useSafeAreaInsets();

    const [localSelected, setLocalSelected] = useState<string[]>([]);
    const [query, setQuery] = useState('');

    const { data: mediaFiles = [], isLoading } = useFiles<MediaFileItem>({ limit: 100 });

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

    const renderItem = useCallback(({ item }: { item: MediaFileItem }) => {
      const id = item._id || item.id || '';
      const isSelected = selectedSet.has(id);
      const isVideo = item.type?.startsWith('video/') || item.name?.endsWith('.mp4');
      const isAudio = item.type?.startsWith('audio/') || item.name?.endsWith('.mp3') || item.name?.endsWith('.m4a');

      return (
        <TouchableOpacity
          onPress={() => toggleSelection(id)}
          activeOpacity={0.8}
          style={{ width: itemWidth, height: itemWidth, marginBottom: 16 }}
          className="relative rounded-2xl overflow-hidden border border-stroke-weaker bg-fill-weak"
        >
          {item.url || item.thumbnail ? (
            <Image
              source={{ uri: item.thumbnail || item.url }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <View className="flex-1 items-center justify-center bg-fill-weak">
              {isAudio ? (
                <Music size={32} color={COLORS.textWeak} />
              ) : (
                <FileText size={32} color={COLORS.textWeak} />
              )}
            </View>
          )}

          {isVideo && (
            <View className="absolute inset-0 items-center justify-center bg-black/25">
              <View className="bg-white/90 rounded-full p-2">
                <Play size={16} color={COLORS.textStrong} fill={COLORS.textStrong} />
              </View>
            </View>
          )}

          {isSelected && (
            <View className="absolute inset-0 bg-brand/10 border-2 border-brand rounded-2xl items-center justify-center">
              <View className="absolute top-2 right-2 bg-brand rounded-full p-1 shadow-sm">
                <Check size={12} color="white" strokeWidth={3} />
              </View>
            </View>
          )}
        </TouchableOpacity>
      );
    }, [itemWidth, selectedSet, toggleSelection]);

    return (
      <BottomSheetModal
        ref={ref}
        topInset={getSheetTopInset(insets.top)}
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
            <Text className="text-text-strong" style={TYPE.sectionTitle}>Select Media</Text>
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                handleClose();
              }}
              accessibilityRole="button"
              accessibilityLabel="Close select media"
              className="size-11 items-center justify-center rounded-full bg-fill-weaker"
              activeOpacity={0.7}
            >
              <X size={20} color={COLORS.textStrong} />
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View className="flex-row items-center bg-fill-weak border border-stroke-weaker rounded-full px-4 h-12 mb-4">
            <Search size={18} color={COLORS.textWeak} className="mr-2" />
            <BottomSheetTextInput
              placeholder="Search media files..."
              placeholderTextColor={COLORS.textMuted}
              value={query}
              onChangeText={setQuery}
              className="flex-1 text-text-strong p-0"
              style={TYPE.input}
            />
          </View>

          {/* List */}
          {isLoading ? (
            <View className="flex-row flex-wrap justify-between">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton
                  key={i}
                  style={{ width: itemWidth, height: itemWidth, marginBottom: 16 }}
                  className="rounded-2xl"
                />
              ))}
            </View>
          ) : (
            <BottomSheetFlatList
              data={results}
              keyExtractor={(item) => item._id || item.id || ''}
              renderItem={renderItem}
              numColumns={2}
              columnWrapperStyle={{ justifyContent: 'space-between' }}
              contentContainerStyle={{ paddingBottom: 80 }}
              showsVerticalScrollIndicator={false}
            />
          )}

          {/* Footer Actions */}
          <View className="absolute bottom-5 left-5 right-5 flex-row gap-4 bg-background pt-4 border-t border-stroke-weaker">
            <Button variant="outline" onPress={handleClose} className="flex-1 rounded-full border-stroke-weak bg-white">
              <Text className="text-text-strong" style={TYPE.buttonSmall}>Cancel</Text>
            </Button>
            <Button
              onPress={handleConfirm}
              className="flex-1 bg-brand rounded-full"
            >
              <Text className="text-white" style={TYPE.buttonSmall}>
                {localSelected.length > 0 ? `Select ${localSelected.length} items` : 'Select items'}
              </Text>
            </Button>
          </View>
        </View>
      </BottomSheetModal>
    );
  })
);

SelectFromMediaModal.displayName = 'SelectFromMediaModal';
