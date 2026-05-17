import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { BottomSheetTextInput, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Search, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { useUiStore } from '@/store';
import { useMemories } from '@/hooks/queries/use-memories';
import { FONTS } from '@/constants/tokens';

export function SearchMemorySheet() {
  const [query, setQuery] = useState('');
  const closeSheet = useUiStore((s) => s.closeSheet);

  // Basic implementation of search (relies on useMemories or a dedicated search hook)
  const { data } = useMemories();
  const memories = data?.pages.flatMap((p) => p.docs) ?? [];
  const results = query.trim() 
    ? memories.filter(m => m.title?.toLowerCase().includes(query.toLowerCase()) || m.body?.toLowerCase().includes(query.toLowerCase()))
    : [];

  return (
    <View className="px-5 pb-8 pt-2 h-[90%]">
      <View className="flex-row items-center bg-fill-weaker border border-stroke-weaker rounded-xl px-3 h-12 mb-4">
        <Search size={20} color="rgba(23,11,0,0.4)" />
        <BottomSheetTextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search your memories..."
          placeholderTextColor="rgba(23,11,0,0.4)"
          autoFocus
          className="flex-1 ml-2 text-base text-text-strong h-full"
          style={{ fontFamily: FONTS.sans }}
        />
      </View>

      <BottomSheetScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-2">
        {results.map((m) => (
          <TouchableOpacity
            key={m._id}
            onPress={() => {
              closeSheet();
              router.push(`/(tabs)/stories/${m._id}`);
            }}
            className="flex-row items-center justify-between p-4 border border-stroke-weaker bg-card rounded-xl"
          >
            <View className="flex-1 gap-1">
              <Text className="text-base text-text-strong" numberOfLines={1} style={{ fontFamily: FONTS.sansMedium }}>
                {m.title}
              </Text>
              {m.body && (
                <Text className="text-xs text-text-weak" numberOfLines={1} style={{ fontFamily: FONTS.sans }}>
                  {m.body}
                </Text>
              )}
            </View>
            <ChevronRight size={18} color="rgba(23,11,0,0.3)" />
          </TouchableOpacity>
        ))}
        {query.trim() && results.length === 0 && (
          <Text className="text-center text-text-weak mt-10" style={{ fontFamily: FONTS.sans }}>
            No results found for "{query}"
          </Text>
        )}
      </BottomSheetScrollView>
    </View>
  );
}
