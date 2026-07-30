import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { Button } from '@/components/ui';
import { useAcceptInviteLogic } from '@/hooks/use-accept-invite-logic';
import { COLORS, FONTS } from '@/constants/tokens';

export default function AcceptInviteScreen() {
  const {
    inviteData,
    fetching,
    fetchError,
    isPending,
    acceptError,
    isSuccess,
    handleAccept,
    token,
    router,
  } = useAcceptInviteLogic();

  if (fetching) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color={COLORS.brand} />
      </SafeAreaView>
    );
  }

  if (fetchError) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-8 gap-4">
        <Animated.Text className="text-4xl">⚠️</Animated.Text>
        <Animated.Text 
          className="text-xl font-semibold text-text-strong text-center"
          style={{ fontFamily: FONTS.sansSemi }}
        >
          Invite not found
        </Animated.Text>
        <Animated.Text 
          className="text-base text-text-weak text-center"
          style={{ fontFamily: FONTS.sans }}
        >
          {fetchError}
        </Animated.Text>
        <Button onPress={() => router.replace('/(auth)/login')} variant="outline" size="lg">
          Sign in
        </Button>
      </SafeAreaView>
    );
  }

  if (isSuccess) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-8 gap-4">
        <Animated.Text className="text-5xl">🎉</Animated.Text>
        <Animated.Text 
          className="text-2xl font-semibold text-text-strong text-center"
          style={{ fontFamily: FONTS.sansSemi }}
        >
          Invite accepted!
        </Animated.Text>
        <Animated.Text 
          className="text-base text-text-weak text-center leading-relaxed"
          style={{ fontFamily: FONTS.sans }}
        >
          You're now connected as a beneficiary.
        </Animated.Text>
        <Button
          onPress={() => token ? router.replace('/(tabs)/overview') : router.replace('/(auth)/login')}
          fullWidth
          size="lg"
        >
          {token ? 'Go to App' : 'Sign In'}
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background px-6">
      <View className="flex-1 justify-center gap-6">
        <Animated.Text className="text-5xl text-center">💌</Animated.Text>

        <View className="items-center gap-2">
          <Animated.Text 
            className="text-3xl text-text-strong text-center"
            style={{ fontFamily: FONTS.serif }}
          >
            You've been invited
          </Animated.Text>
          {inviteData?.from && (
            <Animated.Text 
              className="text-base text-text-weak text-center"
              style={{ fontFamily: FONTS.sans }}
            >
              {inviteData.from} wants to add you as a beneficiary.
            </Animated.Text>
          )}
        </View>

        {inviteData?.message && (
          <View className="bg-brand-subtle rounded-2xl p-5 border border-brand-weak/10">
            <Animated.Text 
              className="text-sm text-text-base leading-relaxed italic text-center"
              style={{ fontFamily: FONTS.sans }}
            >
              "{inviteData.message}"
            </Animated.Text>
          </View>
        )}

        {acceptError && (
          <View className="bg-error-tint border border-error-weak rounded-xl px-4 py-3">
            <Animated.Text 
              className="text-sm text-error-strong text-center"
              style={{ fontFamily: FONTS.sansMedium }}
            >
              {(acceptError as any).message ?? 'Couldn’t accept the invitation. Try again.'}
            </Animated.Text>
          </View>
        )}

        <View className="gap-3 mt-4">
          {!token && (
            <Animated.Text 
              className="text-sm text-text-weak text-center mb-2"
              style={{ fontFamily: FONTS.sans }}
            >
              You'll need to sign in or create an account to accept this invite.
            </Animated.Text>
          )}
          <Button
            onPress={handleAccept}
            loading={isPending}
            fullWidth
            size="lg"
          >
            {token ? 'Accept invite' : 'Sign in to accept'}
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
