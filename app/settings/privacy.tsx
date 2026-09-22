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
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { SettingsSubpageHeader } from '@/components/settings/SettingsSubpageHeader';
import { UiShieldTick } from '@/components/ui/icons/SettingsIcons';
import { useDeleteAccount } from '@/hooks/mutations/use-auth-mutations';
import { PRIVACY_URL, TERMS_URL } from '@/lib/env';
import { useUiStore } from '@/store';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';

const PATTERN = require('../../assets/images/backgrounds/welcome_bg.png');

function ComingSoonRow({ label }: { label: string }) {
  return (
    <View className="min-h-[64px] flex-row items-center justify-between gap-4">
      <Text className="flex-1" style={{ ...TYPE.body, color: COLORS.textStrong }}>
        {label}
      </Text>
      <View className="h-8 items-center justify-center rounded-full bg-fill-weaker px-3.5">
        <Text style={{ ...TYPE.metadata, color: COLORS.textMuted }}>
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
      <SettingsSubpageHeader title="Privacy" onBack={handleBack} />

      <View className="flex-1">
        <ImageBackground source={PATTERN} className="absolute inset-0" style={{ opacity: 0.03 }} resizeMode="repeat" />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48 }}
        >
          <Text style={{ ...TYPE.body, color: COLORS.textWeak }}>
            Memento AI believes in transparent data practices. Learn how your information is protected when using our products, and visit our{' '}
            <Text
              onPress={() => openLegalUrl(PRIVACY_URL)}
              style={{ ...TYPE.body, color: COLORS.brand }}
            >
              Privacy Policy
            </Text>
            {' '}and{' '}
            <Text
              onPress={() => openLegalUrl(TERMS_URL)}
              style={{ ...TYPE.body, color: COLORS.brand }}
            >
              Terms
            </Text>
            {' '}pages for more details.
          </Text>

          <View className="mt-6 rounded-[24px] bg-card p-5">
            <View className="flex-row items-center gap-3">
              <View className="size-9 items-center justify-center rounded-full bg-success/10">
                <UiShieldTick size={20} color={COLORS.success} strokeWidth={2.2} />
              </View>
              <Text className="flex-1" style={{ ...TYPE.body, color: COLORS.textStrong }}>
                How we protect your information
              </Text>
            </View>
            <Text className="mt-3.5" style={{ ...TYPE.bodySmall, color: COLORS.textWeak, lineHeight: 20 }}>
              Memento AI employs industry-standard security measures to protect your data.
            </Text>
            <View className="mt-4 gap-2.5 pl-1">
              <Text style={{ ...TYPE.bodySmall, color: COLORS.textWeak, lineHeight: 20 }}>
                •  Memento AI encrypts your information and shared data in transit and at rest.
              </Text>
              <Text style={{ ...TYPE.bodySmall, color: COLORS.textWeak, lineHeight: 20 }}>
                •  You control your conversations and data, and can change your sharing preferences at any time.
              </Text>
              <Text style={{ ...TYPE.bodySmall, color: COLORS.textWeak, lineHeight: 20 }}>
                •  Memento AI deletes your account data when requested, subject to legal and safety obligations.
              </Text>
              <Text style={{ ...TYPE.bodySmall, color: COLORS.textWeak, lineHeight: 20 }}>
                •  Memento AI doesn’t sell your personal data to third parties.
              </Text>
            </View>
          </View>

          <View className="mt-6 rounded-[24px] bg-card p-5">
            <Text className="mb-2" style={{ ...TYPE.body, color: COLORS.textStrong }}>
              Privacy Settings
            </Text>
            <TouchableOpacity
              onPress={() => {
                void Haptics.selectionAsync();
                openSheet('export-archive');
              }}
              activeOpacity={0.76}
              className="min-h-[64px] flex-row items-center justify-between gap-4"
            >
              <Text className="flex-1" style={{ ...TYPE.body, color: COLORS.textStrong }}>
                Export your archive
              </Text>
              <View className="h-8 items-center justify-center rounded-full bg-brand/10 px-3.5">
                <Text style={{ ...TYPE.metadata, color: COLORS.brand }}>
                  Export
                </Text>
              </View>
            </TouchableOpacity>
            <View className="h-px bg-stroke-weaker" />
            <ComingSoonRow label="Share stories" />
            <View className="h-px bg-stroke-weaker" />
            <View className="min-h-[64px] flex-row items-center justify-between gap-4">
              <Text className="flex-1" style={{ ...TYPE.body, color: COLORS.textStrong }}>
                Delete your account
              </Text>
              <TouchableOpacity
                onPress={requestDeletion}
                disabled={deleteAccount.isPending}
                activeOpacity={0.76}
                className="h-10 items-center justify-center rounded-full bg-error/5 px-4"
              >
                <Text style={{ ...TYPE.buttonSmall, color: COLORS.error }}>
                  Delete account
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
