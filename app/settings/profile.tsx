import React, { useCallback } from 'react';
import {
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

        <View style={{ gap: 22, marginTop: 18 }}>
          {DETAILS.map((detail) => (
            <View key={detail.key}>
              <Text style={SETTINGS_TYPE.supporting}>{detail.label}</Text>
              <Text style={[SETTINGS_TYPE.rowLabel, { marginTop: 7 }]}>{getValue(detail.key)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
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
    borderRadius: 16,
    padding: 12,
    backgroundColor: COLORS.fillWeak,
  },
  detailsHeader: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
});
