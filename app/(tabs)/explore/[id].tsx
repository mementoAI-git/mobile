import React from 'react';
import { View, FlatList, ImageBackground, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Inbox } from 'lucide-react-native';
import { Spinner, ExploreSkeleton, EmptyState } from '@/components/ui';
import { COLORS, FONTS } from '@/constants/tokens';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useCategoryPromptsLogic } from '@/hooks/use-category-prompts-logic';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import type { IPrompt } from '@/types';

const PATTERN = require('../../../assets/images/backgrounds/welcome_bg.png');
const QUESTION_ICON = require('../../../assets/images/question-2.png');

export default function CategoryPromptsScreen() {
  const {
    id,
    prompts,
    totalDocs,
    categoryMeta,
    activeTab,
    setActiveTab,
    isLoading,
    isRefetching,
    refetch,
    refetchIfStale,
    isPending,
    handlePromptPress,
    handleBack,
  } = useCategoryPromptsLogic();

  useFocusEffect(
    React.useCallback(() => {
      refetchIfStale();
    }, [refetchIfStale])
  );

  const renderPromptItem = React.useCallback(
    ({ item }: { item: IPrompt }) => (
      <View
        className="bg-card rounded-2xl p-5 border border-stroke-weaker shadow-sm gap-4 relative"
      >
        {/* Question Tag */}
        <View className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-brand/5 border border-brand/10">
          <Animated.Text className="text-[10px] text-brand font-bold capitalize" style={{ fontFamily: FONTS.sans }}>
            Question
          </Animated.Text>
        </View>

        {/* Main content: icon + question */}
        <View className="flex-row items-start gap-4 pr-12">
          <View className="size-14 items-center justify-center bg-fill-weaker rounded-2xl border border-stroke-weaker">
            <Image
              source={QUESTION_ICON}
              className="size-9"
              resizeMode="contain"
            />
          </View>
          <View className="flex-1 pt-1">
            <Animated.Text
              className="text-[17px] text-text-strong leading-relaxed"
              style={{ fontFamily: FONTS.serif }}
            >
              {item.title}
            </Animated.Text>
          </View>
        </View>

        {/* Action reply button */}
        <View className="flex-row pt-2">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handlePromptPress(item)}
            className="px-5 py-2 rounded-full border border-stroke-strong bg-white active:bg-fill-weaker"
          >
            <Animated.Text
              className="text-xs text-text-strong font-semibold"
              style={{ fontFamily: FONTS.sans }}
            >
              Reply question
            </Animated.Text>
          </TouchableOpacity>
        </View>
      </View>
    ),
    [handlePromptPress],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-6 py-4 border-b border-stroke-weaker bg-card shadow-sm">
        <TouchableOpacity
          onPress={handleBack}
          activeOpacity={0.7}
          className="size-10 rounded-full bg-fill-weaker border border-stroke-weaker items-center justify-center -ml-2"
        >
          <ChevronLeft size={20} color={COLORS.textBase} />
        </TouchableOpacity>
        <Animated.Text
          className="text-[22px] text-text-strong capitalize flex-1 pr-6"
          numberOfLines={1}
          style={{ fontFamily: FONTS.serif }}
        >
          {categoryMeta.title}
        </Animated.Text>
      </View>

      <View className="flex-1 relative">
        <ImageBackground source={PATTERN} className="absolute inset-0 opacity-30" />

        {isPending && (
          <View className="absolute inset-0 bg-black/10 items-center justify-center z-50">
            <View className="bg-white p-6 rounded-2xl shadow-lg border border-stroke-weaker items-center gap-3">
              <Spinner size="large" color={COLORS.brand} />
              <Animated.Text className="text-sm text-text-strong" style={{ fontFamily: FONTS.sansBold }}>Starting reflect session...</Animated.Text>
            </View>
          </View>
        )}

        {isLoading && !prompts.length ? (
          <View className="flex-1">
            <ExploreSkeleton />
          </View>
        ) : (
          <FlatList
            data={prompts}
            keyExtractor={(item, index) => item._id ?? `prompt-${index}`}
            contentContainerClassName="p-5 gap-5"
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.brand} />
            }
            ListHeaderComponent={
              <View className="gap-6 pb-2">
                {/* Category Card Info */}
                <View className="bg-card rounded-[32px] overflow-hidden border border-stroke-weaker p-5 gap-4 shadow-sm">
                  {categoryMeta.image && (
                    <View className="w-full h-44 rounded-2xl overflow-hidden bg-fill-weak">
                      <Image
                        source={categoryMeta.image}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    </View>
                  )}
                  <View className="gap-2">
                    <Animated.Text
                      className="text-[26px] text-text-strong leading-tight capitalize"
                      style={{ fontFamily: FONTS.serif }}
                    >
                      {categoryMeta.title}
                    </Animated.Text>
                    <Animated.Text
                      className="text-[14px] text-text-base leading-relaxed opacity-80"
                      style={{ fontFamily: FONTS.sans }}
                    >
                      {categoryMeta.subtitle}
                    </Animated.Text>
                  </View>
                  <View className="flex-row">
                    <View className="px-3 py-1.5 rounded-full bg-fill-weaker border border-stroke-weaker flex-row items-center gap-1.5">
                      <View className="size-2 rounded-full bg-brand" />
                      <Animated.Text className="text-xs text-text-strong font-medium" style={{ fontFamily: FONTS.sans }}>
                        {totalDocs} topics
                      </Animated.Text>
                    </View>
                  </View>
                </View>

                {/* Tabs selection */}
                <View className="flex-row border-b border-stroke-weaker mt-2">
                  {(['Uploaded', 'Answered', 'Unanswered'] as const).map((tab, idx) => {
                    const isActive = activeTab === idx;
                    return (
                      <TouchableOpacity
                        key={tab}
                        activeOpacity={0.7}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setActiveTab(idx as 0 | 1 | 2);
                        }}
                        className="flex-1 py-3 items-center relative"
                      >
                        <Animated.Text
                          className={`text-sm font-semibold ${isActive ? 'text-brand' : 'text-text-weak'}`}
                          style={{ fontFamily: FONTS.sans }}
                        >
                          {tab}
                        </Animated.Text>
                        {isActive && (
                          <Animated.View
                            className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-brand rounded-t-full"
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            }
            renderItem={renderPromptItem}
            ListEmptyComponent={
              <View className="items-center justify-center py-16 gap-3">
                <Inbox size={40} color={COLORS.textDisabled} strokeWidth={1.5} />
                <Animated.Text
                  className="text-base text-text-weak text-center"
                  style={{ fontFamily: FONTS.sans }}
                >
                  No prompts under this filter yet.
                </Animated.Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}
