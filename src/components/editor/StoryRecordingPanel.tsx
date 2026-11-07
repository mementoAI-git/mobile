import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import X from 'lucide-react-native/icons/x';
import Square from 'lucide-react-native/icons/square';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { useThemeColors, useThemeStyles } from '@/hooks/use-theme-colors';
import type { ThemeColors } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';

export function StoryRecordingPanel({ seconds, levels, starting, onCancel, onStop }: { seconds: number; levels: number[]; starting?: boolean; onCancel: () => void; onStop: () => void }) {
  const colors = useThemeColors();
  const styles = useThemeStyles(createStyles);
  return (
    <View style={styles.panel}>
      <View style={styles.heading}>
        <Text style={styles.title}>{starting ? 'Starting…' : 'Recording…'}</Text>
        <View style={styles.dot} />
        <Text style={styles.time}>{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}s</Text>
      </View>
      <View style={styles.controls}>
        <TouchableOpacity style={styles.control} onPress={onCancel} accessibilityRole="button" accessibilityLabel="Discard dictation"><X size={22} color={colors.textWeak} /></TouchableOpacity>
        <View style={styles.wave} accessible={false}>
          {levels.map((level, i) => <View key={i} style={[styles.bar, { height: 3 + level * 28 }]} />)}
        </View>
        <TouchableOpacity style={styles.control} onPress={onStop} accessibilityRole="button" accessibilityLabel="Finish dictation"><Square size={19} fill={colors.brand} color={colors.brand} /></TouchableOpacity>
      </View>
    </View>
  );
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  panel: { marginHorizontal: 8, marginBottom: 12, padding: 12, borderRadius: 14, backgroundColor: colors.fillWeak, borderColor: colors.strokeWeak, borderWidth: 1, gap: 12 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { ...TYPE.sectionTitleWeak, color: colors.textStrong },
  time: { ...TYPE.body, color: colors.textWeak },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  control: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.strokeStrong, alignItems: 'center', justifyContent: 'center' },
  wave: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 32, overflow: 'hidden' },
  bar: { width: 4, borderRadius: 2, backgroundColor: colors.textWeak },
});
