import { MonthYearPicker } from '@/components/overview/MonthYearPicker';
import { Image } from 'expo-image';
import dayjs from 'dayjs';
import { SignedAttachmentImage } from '@/components/ui/SignedAttachmentImage';
import { getQuestionIdenticonUrl } from '@/features/explore/question-presentation';
import { calendarStoryThumbnail, storiesOnDay } from '@/features/overview/story-calendar';
import React, { useCallback, useMemo, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import X from 'lucide-react-native/icons/x';
import { Button, EmptyState, Spinner } from '@/components/ui';
import { TYPE } from '@/constants/typography';
import { useThemeColors, useResolvedAppearance } from '@/hooks/use-theme-colors';
import { useCalendarStories } from '@/hooks/queries/use-calendar-stories';
import type { IMemory } from '@/types';

export function CalendarDateSheet({ date, onSelect, onClose }: { date: Date; onSelect: (date: Date) => void; onClose?: () => void }) {
  const colors = useThemeColors();
  const appearance = useResolvedAppearance();
  const [selected, setSelected] = useState(date);
  const [choosingMonth, setChoosingMonth] = useState(true);
  const change = useCallback((event: DateTimePickerEvent, value?: Date) => {
    if (event.type === 'dismissed') { if (Platform.OS === 'android') onClose?.(); return; }
    if (value) {
      setSelected(value);
      if (Platform.OS === 'android') { onSelect(value); onClose?.(); }
    }
  }, [onClose, onSelect]);
  const apply = useCallback(() => {
    Haptics.selectionAsync();
    if (choosingMonth) { setChoosingMonth(false); return; }
    onSelect(selected); onClose?.();
  }, [choosingMonth, selected, onSelect, onClose]);
  return <View className="gap-4 pb-4">
    <Text style={[TYPE.sectionTitle, { color: colors.textStrong }]}>Choose a date</Text>
    {choosingMonth ? <>
      <Text style={[TYPE.button, { color: colors.brand }]}>{selected.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</Text>
      <MonthYearPicker value={selected} onChange={setSelected} />
    </> : <DateTimePicker value={selected} mode="date" display={Platform.OS === 'ios' ? 'inline' : 'default'} onChange={change} themeVariant={appearance === 'light' ? 'light' : 'dark'} accentColor={colors.brand} />}
    {(choosingMonth || Platform.OS !== 'android') && <Button onPress={apply}>Done</Button>}
  </View>;
}

const DayStoryRow = React.memo(function DayStoryRow({ story, onSelect }: { story: IMemory; onSelect: (id: string) => void }) {
  const colors = useThemeColors();
  const [imageFailed, setImageFailed] = useState(false);
  const thumbnail = calendarStoryThumbnail(story);
  const failImage = useCallback(() => setImageFailed(true), []);
  const press = useCallback(() => onSelect(story._id), [onSelect, story._id]);
  const imageStyle = { width: 40, height: 40, borderRadius: 10, flexShrink: 0, backgroundColor: colors.fillWeak };
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.strokeWeak }}>
    {thumbnail && !imageFailed
      ? <SignedAttachmentImage attachment={thumbnail} context={{ memory_id: story._id }} preferThumbnail style={imageStyle} resizeMode="cover" onError={failImage} />
      : <Image source={{ uri: getQuestionIdenticonUrl(story._id, 'png') }} style={imageStyle} contentFit="cover" />}
    <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
      <Text numberOfLines={1} style={[TYPE.buttonSmall, { color: colors.textStrong }]}>{story.title?.trim() || 'Untitled story'}</Text>
      <Text numberOfLines={1} style={[TYPE.metadata, { color: colors.textBase }]}>{dayjs(story.created_at).format('M/D/YYYY, h:mm A')}</Text>
    </View>
    <Button variant="ghost" onPress={press} accessibilityLabel={`View ${story.title?.trim() || 'Untitled story'}`} style={{ minHeight: 44, paddingHorizontal: 0 }}>View</Button>
  </View>;
});

export function CalendarStoriesSheet({ date, onClose }: { date: Date; onClose?: (afterDismiss?: () => void) => void }) {
  const colors = useThemeColors();
  const router = useRouter();
  const { data, isPending, isError, refetch } = useCalendarStories();
  const stories = useMemo(() => storiesOnDay(data ?? [], date), [data, date]);
  const select = useCallback((id: string) => {
    Haptics.selectionAsync();
    const navigate = () => router.push({ pathname: '/(tabs)/stories/[id]', params: { id } });
    if (onClose) onClose(navigate); else navigate();
  }, [onClose, router]);
  const retry = useCallback(() => { void refetch(); }, [refetch]);
  return <View className="flex-1 px-5 pb-8">
    <View className="flex-row items-center justify-between mb-4">
      <Text style={[TYPE.sectionTitle, { color: colors.textStrong }]}>{date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</Text>
      <Button variant="ghost" iconOnly onPress={onClose} accessibilityLabel="Close stories"><X size={20} color={colors.textBase} /></Button>
    </View>
    <BottomSheetScrollView contentContainerStyle={{ gap: 8, paddingBottom: 24 }}>
      {isPending ? <Spinner /> : isError ? <EmptyState title="Your stories couldn’t load" description="Please try again." actionLabel="Try again" onAction={retry} /> : stories.length ? stories.map(story => <DayStoryRow key={story._id} story={story} onSelect={select} />) : <EmptyState title="A quiet day" description="No stories were added on this date." />}
    </BottomSheetScrollView>
  </View>;
}
