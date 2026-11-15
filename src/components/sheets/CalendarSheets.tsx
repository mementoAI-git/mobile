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
import { Button, EmptyState, Spinner } from '@/components/ui';
import { TYPE } from '@/constants/typography';
import { useThemeColors, useResolvedAppearance } from '@/hooks/use-theme-colors';
import { useCalendarStories } from '@/hooks/queries/use-calendar-stories';
import type { IMemory } from '@/types';
import { SheetActions, SHEET_FILL } from './SheetActions';
import { SheetHeader } from './SheetHeader';
import { SHEET_GROUP_GAP } from '@/features/layout/sheet-safe-area';

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
  return <View style={{ ...SHEET_FILL, gap: SHEET_GROUP_GAP }}>
    <SheetHeader title="Choose a date" onClose={onClose} closeLabel="Close date picker" />
    {choosingMonth ? <View style={{ gap: 16 }}>
      <Text style={[TYPE.button, { color: colors.brand }]}>{selected.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</Text>
      <MonthYearPicker value={selected} onChange={setSelected} />
    </View> : <DateTimePicker value={selected} mode="date" display={Platform.OS === 'ios' ? 'inline' : 'default'} onChange={change} themeVariant={appearance === 'light' ? 'light' : 'dark'} accentColor={colors.brand} />}
    {(choosingMonth || Platform.OS !== 'android') && <SheetActions><Button size="lg" rounded="full" className="h-14" onPress={apply}>Done</Button></SheetActions>}
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
      : <Image source={{ uri: getQuestionIdenticonUrl(story._id) }} style={imageStyle} contentFit="cover" />}
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
    <SheetHeader
      title={date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
      onClose={onClose ? () => onClose() : undefined}
      closeLabel="Close stories"
      style={{ marginBottom: SHEET_GROUP_GAP }}
    />
    <BottomSheetScrollView contentContainerStyle={{ gap: 8, paddingBottom: 24 }}>
      {isPending ? <Spinner /> : isError ? <EmptyState title="Your stories couldn’t load" description="Please try again." actionLabel="Try again" onAction={retry} /> : stories.length ? stories.map(story => <DayStoryRow key={story._id} story={story} onSelect={select} />) : <EmptyState title="A quiet day" description="No stories were added on this date." />}
    </BottomSheetScrollView>
  </View>;
}
