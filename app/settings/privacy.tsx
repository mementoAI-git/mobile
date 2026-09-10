import React, { useCallback } from 'react';
import {
  ImageBackground,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { UiShieldTick } from '@/components/ui/icons/SettingsIcons';
import { useDeleteAccount } from '@/hooks/mutations/use-auth-mutations';
import { PRIVACY_URL, TERMS_URL } from '@/lib/env';
import { useUiStore } from '@/store';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';

const PATTERN = require('../../assets/images/backgrounds/welcome_bg.png');

function ComingSoonRow({ label }: { label: string }) {
  return (
    <View className="min-h-[68px] flex-row items-center justify-between gap-4">
      <Text className="flex-1" style={TYPE.label}>
        {label}
      </Text>
      <View className="min-h-11 items-center justify-center rounded-2xl border border-stroke-weak bg-fill-weaker px-4 opacity-50">
        <Text style={TYPE.bodySmall}>
          Coming soon
        </Text>
      </View>
    </View>
  );
}

export default function PrivacySettingsScreen() {
  const router = useRouter();
  const openSheet = useUiStore((state) => state.openSheet);
  const deleteAccount = useDeleteAccount();

  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    if (router.canGoBack()) router.back();
    else router.replace('/settings');
  }, [router]);

  const openLegalUrl = useCallback((url: string) => {
    Haptics.selectionAsync();
    Linking.openURL(url);
  }, []);

  const requestDeletion = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    openSheet('security-confirmation', {
      kind: 'delete-account',
      onConfirm: () => deleteAccount.mutateAsync(),
    });
  }, [deleteAccount, openSheet]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="h-[88px] flex-row items-center justify-between px-6">
        <TouchableOpacity
          onPress={handleBack}
          activeOpacity={0.78}
          className="size-11 items-center justify-center rounded-full bg-fill-weak"
        >
          <ArrowLeft size={23} color={COLORS.textBase} />
        </TouchableOpacity>
        <Text style={TYPE.screenTitle}>
          Privacy
        </Text>
        <View className="size-11" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 28, paddingBottom: 52 }}
      >
        <ImageBackground source={PATTERN} className="absolute inset-0" style={{ opacity: 0.03 }} resizeMode="repeat" />

        <Text style={TYPE.sectionTitle}>
          Manage your account privacy settings
        </Text>
        <Text className="mt-4" style={TYPE.body}>
          Memento AI believes in transparent data practices. Learn how your information is protected when using our products, and visit our{' '}
          <Text
            onPress={() => openLegalUrl(PRIVACY_URL)}
            className="text-brand"
            style={TYPE.bodyStrong}
          >
            Privacy Policy
          </Text>
          {' '}and{' '}
          <Text
            onPress={() => openLegalUrl(TERMS_URL)}
            className="text-brand"
            style={TYPE.bodyStrong}
          >
            Terms
          </Text>
          {' '}pages for more details.
        </Text>

        <View className="mt-7 rounded-[24px] border border-stroke-weak bg-card p-5">
          <View className="flex-row items-center gap-3">
            <View className="size-8 items-center justify-center rounded-xl bg-success">
              <UiShieldTick size={18} color={COLORS.textInverse} strokeWidth={2.2} />
            </View>
            <Text className="flex-1" style={TYPE.cardTitle}>
              How we protect your information
            </Text>
          </View>
          <Text className="mt-4" style={[TYPE.body, { color: COLORS.textStrong }]}>
            Memento AI employs industry-standard security measures to protect your data.
          </Text>
          <View className="mt-4 gap-1.5 pl-3">
            <Text className="text-text-strong" style={TYPE.body}>
              •  Memento AI encrypts your information and shared data in transit and at rest.
            </Text>
            <Text className="text-text-strong" style={TYPE.body}>
              •  You control your conversations and data, and can change your sharing preferences at any time.
            </Text>
            <Text className="text-text-strong" style={TYPE.body}>
              •  Memento AI deletes your account data when requested, subject to legal and safety obligations.
            </Text>
            <Text className="text-text-strong" style={TYPE.body}>
              •  Memento AI doesn’t sell your personal data to third parties.
            </Text>
          </View>
        </View>

        <View className="mt-6 rounded-[24px] border border-stroke-weak bg-card p-5">
          <Text className="mb-2" style={TYPE.cardTitle}>
            Privacy Settings
          </Text>
          <ComingSoonRow label="Export your information" />
          <ComingSoonRow label="Share stories" />
          <View className="min-h-[68px] flex-row items-center justify-between gap-4">
            <Text className="flex-1" style={TYPE.label}>
              Delete your account
            </Text>
            <TouchableOpacity
              onPress={requestDeletion}
              disabled={deleteAccount.isPending}
              activeOpacity={0.76}
              className="min-h-11 items-center justify-center rounded-2xl border border-error/20 bg-error/5 px-4"
            >
              <Text className="text-error" style={TYPE.buttonSmall}>
                Delete account
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
