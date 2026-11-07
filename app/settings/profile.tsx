import type { ThemeColors } from '@/constants/tokens';
import { useThemeColors, useThemeStyles } from '@/hooks/use-theme-colors';
import React, { useCallback } from 'react';
import {
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Button, ResponsiveScreen } from '@/components/ui';
import { SettingsSubpageHeader } from '@/components/settings/SettingsSubpageHeader';
import { TYPE } from '@/constants/typography';
import { COLORS } from '@/constants/tokens';
import { useProfile } from '@/hooks/queries/use-profile';
import { useUserContext } from '@/hooks/queries/use-persona';
import { useUiStore } from '@/store';

const PATTERN = require('../../assets/images/backgrounds/welcome_bg.png');

const DETAILS = [
  { key: 'email', label: 'Email address' },
  { key: 'nickname', label: 'Display name (Nickname)' },
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'dob', label: 'Birthday' },
  { key: 'phone_number', label: 'Phone' },
  { key: 'country', label: 'Country' },
  { key: 'location', label: 'City/Location' },
] as const;

function formatAboutMe(desc?: string | null): string {
  const trimmed = desc?.trim();
  if (!trimmed) return 'Add a few words about yourself.';
  if (/^(.)\1+$/i.test(trimmed) || trimmed.length < 3) {
    return 'Add a few words about yourself.';
  }
  return trimmed;
}

export default function PersonalInfoScreen() {
  const COLORS = useThemeColors();
  const styles = useThemeStyles(createStyles);
  const router = useRouter();
  const { data: profile } = useProfile();
  const { data: userContext } = useUserContext();
  const openSheet = useUiStore((state) => state.openSheet);

  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    if (router.canGoBack()) router.back();
    else router.replace('/settings');
  }, [router]);

  const handleEdit = useCallback(() => {
    openSheet('edit-profile');
  }, [openSheet]);

  const rawBio = profile?.context?.self_description ?? userContext?.self_description;
  const aboutMeText = formatAboutMe(rawBio);

  const getValue = useCallback((key: (typeof DETAILS)[number]['key']) => {
    const value = profile?.[key];
    if (key === 'dob' && value) {
      const parsed = dayjs(value);
      return parsed.isValid() ? parsed.format('DD/MM/YYYY') : String(value);
    }
    return String(value || 'Not added yet');
  }, [profile]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <SettingsSubpageHeader title="Personal information" onBack={handleBack} />

      <View className="flex-1">
        <ImageBackground
          source={PATTERN}
          className="absolute inset-0"
          style={{ opacity: 0.03 }}
          resizeMode="repeat"
        />

        <ResponsiveScreen maxWidth={720}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.aboutCard}>
            <Text style={{ ...TYPE.body, color: COLORS.textStrong }}>About me</Text>
            <Text style={{ ...TYPE.body, color: COLORS.textWeak, marginTop: 6, lineHeight: 22 }}>
              {aboutMeText}
            </Text>
          </View>

          <View style={styles.detailsHeader}>
            <Text style={{ ...TYPE.body, color: COLORS.textStrong }}>Profile details</Text>
            <Button
              variant="secondary"
              size="sm"
              className="h-10 px-4"
              onPress={handleEdit}
            >
              Edit Profile
            </Button>
          </View>

          <View style={styles.card}>
            {DETAILS.map((detail, index) => {
              const value = getValue(detail.key);
              const isPlaceholder = value === 'Not added yet';
              return (
                <View key={detail.key}>
                  {index > 0 && (
                    <View
                      style={{
                        height: 1,
                        backgroundColor: COLORS.strokeWeaker,
                        marginHorizontal: 20,
                      }}
                    />
                  )}
                  <View style={{ paddingHorizontal: 20, paddingVertical: 14, gap: 4 }}>
                    <Text style={{ ...TYPE.bodySmall, color: COLORS.textWeak }}>{detail.label}</Text>
                    <Text
                      style={[
                        TYPE.body,
                        { color: isPlaceholder ? COLORS.textMuted : COLORS.textStrong },
                      ]}
                    >
                      {value}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
        </ResponsiveScreen>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (COLORS: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingTop: 16, paddingBottom: 48 },
  aboutCard: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: COLORS.card,
  },
  detailsHeader: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    overflow: 'hidden',
  },
});
