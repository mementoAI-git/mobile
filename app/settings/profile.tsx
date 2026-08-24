import React, { useCallback } from 'react';
import {
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import dayjs from 'dayjs';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/ui';
import { SETTINGS_TYPE } from '@/components/settings/settings-typography';
import { COLORS, FONTS } from '@/constants/tokens';
import { useProfile } from '@/hooks/queries/use-profile';
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

export default function PersonalInfoScreen() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const openSheet = useUiStore((state) => state.openSheet);

  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    if (router.canGoBack()) router.back();
    else router.replace('/settings');
  }, [router]);

  const handleEdit = useCallback(() => {
    openSheet('edit-profile');
  }, [openSheet]);

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
      <View style={{ flex: 1 }}>
        <ImageBackground
          source={PATTERN}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          imageStyle={{ opacity: 0.03 }}
          resizeMode="repeat"
        />

        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBack}
            activeOpacity={0.78}
            accessibilityRole="button"
            style={styles.backButton}
          >
            <ArrowLeft size={22} color={COLORS.textBase} />
          </TouchableOpacity>
          <Text style={SETTINGS_TYPE.screenTitle}>Personal information</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.aboutCard}>
            <Text style={SETTINGS_TYPE.cardTitle}>About me</Text>
            <Text style={[SETTINGS_TYPE.body, { color: COLORS.textStrong, marginTop: 6 }]}>
              {profile?.context?.self_description?.trim() || 'Add a few words about yourself.'}
            </Text>
          </View>

          <View style={styles.detailsHeader}>
            <Text style={SETTINGS_TYPE.sectionTitle}>Profile details</Text>
            <Button
              variant="secondary"
              size="lg"
              className="h-10 px-4"
              textClassName="text-sm font-bold"
              onPress={handleEdit}
            >
              Edit Profile
            </Button>
          </View>

          <View
            style={{
              backgroundColor: COLORS.card,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: COLORS.strokeWeaker,
              overflow: 'hidden',
              marginTop: 18,
            }}
          >
            {DETAILS.map((detail, index) => (
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
                <View style={{ paddingHorizontal: 20, paddingVertical: 18, gap: 4 }}>
                  <Text style={SETTINGS_TYPE.supporting}>{detail.label}</Text>
                  <Text style={SETTINGS_TYPE.rowLabel}>{getValue(detail.key)}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  header: {
    minHeight: 62,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.fillWeak,
  },
  content: { paddingHorizontal: 16, paddingTop: 28, paddingBottom: 40 },
  aboutCard: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.strokeWeaker,
  },
  detailsHeader: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
});
