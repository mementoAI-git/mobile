import React, { useCallback, useRef } from 'react';
import { Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

import { TYPE } from '@/constants/typography';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { changeCalendarMonth } from '@/features/overview/calendar-selection';

const ROW = 32;
const MONTHS = Array.from({ length: 12 }, (_, month) => new Date(2000, month).toLocaleString('en-US', { month: 'long' }));
const YEARS = Array.from({ length: 301 }, (_, index) => String(1900 + index));

function Wheel({ values, index, label, onChange }: { values: string[]; index: number; label: string; onChange: (index: number) => void }) {
  const colors = useThemeColors();
  const initialIndex = useRef(index).current;
  const lastIndex = useRef(index);
  const scroll = useRef<ScrollView>(null);
  const interacting = useRef(false);
  const initialize = useCallback(() => {
    if (!interacting.current) scroll.current?.scrollTo({ y: initialIndex * ROW, animated: false });
  }, [initialIndex]);
  const beginDrag = useCallback(() => { interacting.current = true; }, []);
  const change = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!interacting.current) return;
    const next = Math.max(0, Math.min(values.length - 1, Math.round(event.nativeEvent.contentOffset.y / ROW)));
    if (next !== lastIndex.current) {
      lastIndex.current = next;
      Haptics.selectionAsync();
      onChange(next);
    }
  }, [onChange, values.length]);
  return <ScrollView ref={scroll} onLayout={initialize} onContentSizeChange={initialize} onScrollBeginDrag={beginDrag} contentInsetAdjustmentBehavior="never" style={{ flex: 1, height: ROW * 7 }} contentContainerStyle={{ paddingVertical: ROW * 3 }} contentOffset={{ x: 0, y: initialIndex * ROW }} snapToInterval={ROW} decelerationRate="fast" showsVerticalScrollIndicator={false} onScroll={change} scrollEventThrottle={16} accessibilityLabel={label}>
    {values.map((value, itemIndex) => <View key={value} style={{ height: ROW, alignItems: 'center', justifyContent: 'center' }}><Text style={{ ...TYPE.calendarWheel, color: itemIndex === index ? colors.textStrong : colors.textWeak, opacity: Math.max(0.08, 1 - Math.abs(itemIndex - index) * 0.28), transform: [{ perspective: 300 }, { rotateX: `${Math.max(-75, Math.min(75, (itemIndex - index) * 23))}deg` }, { scale: Math.max(0.75, 1 - Math.abs(itemIndex - index) * 0.05) }] }}>{value}</Text></View>)}
  </ScrollView>;
}

export function MonthYearPicker({ value, onChange }: { value: Date; onChange: (date: Date) => void }) {
  const colors = useThemeColors();
  const month = useCallback((index: number) => onChange(changeCalendarMonth(value, value.getFullYear(), index)), [onChange, value]);
  const year = useCallback((index: number) => onChange(changeCalendarMonth(value, 1900 + index, value.getMonth())), [onChange, value]);
  return <View style={{ flexDirection: 'row', height: ROW * 7, marginVertical: 24 }}>
    <View pointerEvents="none" style={{ position: 'absolute', top: ROW * 3, height: ROW, left: 0, right: 0, borderRadius: 24, backgroundColor: colors.fillWeak }} />
    <Wheel values={MONTHS} index={value.getMonth()} label="Choose month" onChange={month} />
    <Wheel values={YEARS} index={value.getFullYear() - 1900} label="Choose year" onChange={year} />
  </View>;
}
