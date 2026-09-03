import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { MailX, CheckCircle2 } from 'lucide-react-native';
import { Button, EmptyState, Spinner } from '@/components/ui';
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
    return <Spinner fullScreen size="large" />;
  }

  if (fetchError) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <EmptyState
          icon={MailX}
          title="Invite not found"
          description={fetchError}
          actionLabel="Sign in"
          onAction={() => router.replace('/(auth)/login')}
        />
      </SafeAreaView>
    );
  }

  if (isSuccess) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <EmptyState
          icon={CheckCircle2}
          title="Invite accepted!"
          description="You're now connected as a beneficiary."
          actionLabel={token ? 'Go to App' : 'Sign in'}
          onAction={() => (token ? router.replace('/(tabs)/overview') : router.replace('/(auth)/login'))}
        />
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
