import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Platform,
  ImageBackground,
} from 'react-native';
import { Pressable, TouchableOpacity } from '@/components/ui/Touchable';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import X from 'lucide-react-native/icons/x';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { Button } from '@/components/ui';
import {
  getDailyRitualSettings,
  scheduleDailyRitual,
  cancelDailyRitual,
  type DailyRitualSettings,
} from '@/features/rituals/ritual-scheduler';
import { useUserStore } from '@/store';

const PATTERN = require('../../../assets/images/backgrounds/welcome_bg.png');
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PresetOption = 'morning' | 'evening' | 'custom' | 'off';

interface DailyRitualSheetProps {
  onClose?: () => void;
  onSaved?: (settings: DailyRitualSettings) => void;
}

interface RitualChoiceCardProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
  children?: React.ReactNode;
}

function RitualChoiceCard({
  eyebrow,
  title,
  subtitle,
  selected,
  onPress,
  children,
}: RitualChoiceCardProps) {
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.98);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1);
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${eyebrow}, ${title}, ${subtitle}`}
      style={animatedStyle}
      className={`py-4.5 pb-6 border-t border-stroke-weaker`}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text
            className="uppercase tracking-widest text-text-weak mb-1"
            style={TYPE.eyebrow}
          >
            {eyebrow}
          </Text>
          <Text
            className={selected ? 'text-brand' : 'text-text-strong'}
            style={TYPE.buttonSmall}
          >
            {title}
          </Text>
          <Text className="text-text-weak mt-0.5" style={TYPE.bodySmall}>
            {subtitle}
          </Text>
        </View>

        {selected ? (
          <View className="px-3 py-1 rounded-full bg-brand shrink-0">
            <Text className="text-white uppercase tracking-wider" style={TYPE.eyebrow}>
              Active
            </Text>
          </View>
        ) : null}
      </View>

      {children}
    </AnimatedPressable>
  );
}

function formatRitualTime(date: Date): string {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutesStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${hours}:${minutesStr} ${ampm}`;
}

export function DailyRitualSheet({ onClose, onSaved }: DailyRitualSheetProps) {
  const user = useUserStore((s) => s.user);
  const [settings, setSettings] = useState<DailyRitualSettings>({
    enabled: true,
    hour: 20,
    minute: 30,
  });
  const [selectedPreset, setSelectedPreset] = useState<PresetOption>('evening');
  const [customDate, setCustomDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(20, 30, 0, 0);
    return d;
  });
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    getDailyRitualSettings().then((s) => {
      setSettings(s);
      if (!s.enabled) {
        setSelectedPreset('off');
      } else if (s.hour === 8 && s.minute === 0) {
        setSelectedPreset('morning');
      } else if (s.hour === 20 && s.minute === 30) {
        setSelectedPreset('evening');
      } else {
        setSelectedPreset('custom');
      }
      const d = new Date();
      d.setHours(s.hour, s.minute, 0, 0);
      setCustomDate(d);
    });
  }, []);

  const handleSelectPreset = useCallback((preset: PresetOption) => {
    void Haptics.selectionAsync();
    setSelectedPreset(preset);

    if (preset === 'morning') {
      setSettings({ enabled: true, hour: 8, minute: 0 });
    } else if (preset === 'evening') {
      setSettings({ enabled: true, hour: 20, minute: 30 });
    } else if (preset === 'custom') {
      setSettings({
        enabled: true,
        hour: customDate.getHours(),
        minute: customDate.getMinutes(),
      });
    } else if (preset === 'off') {
      setSettings((prev) => ({ ...prev, enabled: false }));
    }
  }, [customDate]);

  const handleCustomTimeChange = useCallback((_event: DateTimePickerEvent, date?: Date) => {
    if (date) {
      setCustomDate(date);
      setSettings({
        enabled: true,
        hour: date.getHours(),
        minute: date.getMinutes(),
      });
    }
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (selectedPreset === 'off' || !settings.enabled) {
        await cancelDailyRitual();
      } else {
        await scheduleDailyRitual(
          settings.hour,
          settings.minute,
          user?.first_name || user?.nickname
        );
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSaved?.(settings);
      onClose?.();
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = useCallback(() => {
    void Haptics.selectionAsync();
    onClose?.();
  }, [onClose]);

  return (
    <View className="flex-grow px-5 pb-8 pt-2">
      <View pointerEvents="none" className="absolute inset-0">
        <ImageBackground
          source={PATTERN}
          className="flex-1"
          style={{ opacity: 0.03 }}
          resizeMode="repeat"
        />
      </View>

      {/* Header Row: Editorial Serif Title & Standard Circular Close Button */}
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-text-strong" style={TYPE.sectionTitle}>
          Daily Reflection Ritual
        </Text>

        <TouchableOpacity
          onPress={handleClose}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Close daily ritual sheet"
          className="size-11 rounded-full bg-fill-weaker items-center justify-center"
        >
          <X size={18} color={COLORS.textWeak} />
        </TouchableOpacity>
      </View>

      {/* Warm Companion Subtitle */}
      <Text className="text-text-weak mb-6" style={TYPE.body}>
        Choose a quiet moment each day to pause, reflect, and capture what matters most.
      </Text>

      {/* Choice Options List - Plain Smooth Cards */}
      <View className="gap-3 mb-6">
        {/* Morning Preset */}
        <RitualChoiceCard
          eyebrow="Morning"
          title="8:00 AM · Morning Coffee"
          subtitle="Start your day with a calm moment of reflection"
          selected={selectedPreset === 'morning'}
          onPress={() => handleSelectPreset('morning')}
        />

        {/* Evening Preset */}
        <RitualChoiceCard
          eyebrow="Evening · Recommended"
          title="8:30 PM · Evening Wind-Down"
          subtitle="Wind down and preserve what mattered today"
          selected={selectedPreset === 'evening'}
          onPress={() => handleSelectPreset('evening')}
        />

        {/* Custom Preset */}
        <RitualChoiceCard
          eyebrow="Custom Schedule"
          title="Choose Reflection Hour"
          subtitle="Set a daily reminder tailored to your routine"
          selected={selectedPreset === 'custom'}
          onPress={() => handleSelectPreset('custom')}
        >
          {selectedPreset === 'custom' && (
            <View className="mt-3 pt-3 border-t border-stroke-weaker flex-row items-center justify-between">
              <Text className="text-text-weak" style={TYPE.bodySmall}>
                Reminder time
              </Text>

              {Platform.OS === 'ios' ? (
                <DateTimePicker
                  value={customDate}
                  mode="time"
                  display="compact"
                  onChange={handleCustomTimeChange}
                  themeVariant="light"
                  accentColor={COLORS.brand}
                />
              ) : (
                <TouchableOpacity
                  onPress={() => setShowAndroidPicker(true)}
                  className="px-3 py-1 rounded-full bg-brand/10"
                >
                  <Text className="text-brand" style={TYPE.buttonSmall}>
                    {formatRitualTime(customDate)}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </RitualChoiceCard>

        {showAndroidPicker && Platform.OS !== 'ios' && (
          <DateTimePicker
            value={customDate}
            mode="time"
            display="default"
            onChange={(event, date) => {
              setShowAndroidPicker(false);
              if (date) handleCustomTimeChange(event, date);
            }}
          />
        )}

        {/* Calm Non-Destructive Off Option */}
        <RitualChoiceCard
          eyebrow="Flexible"
          title="Reflect on My Own"
          subtitle="No daily nudges · Capture memories whenever inspired"
          selected={selectedPreset === 'off'}
          onPress={() => handleSelectPreset('off')}
        />
      </View>

      {/* Primary Companion CTA */}
      <Button
        variant="primary"
        size="lg"
        className="h-14 w-full"
        loading={isSaving}
        onPress={handleSave}
      >
        Save Daily Ritual
      </Button>
    </View>
  );
}
