import React, { useEffect, useState } from 'react';
import { Text, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';
import { useUserStore } from '@/store/user.store';
import endpoint from '@/api/endpoint';
import { COLORS } from '@/constants/tokens';

const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export default function OAuthCallbackScreen() {
  const router = useRouter();
  const { provider, code } = useLocalSearchParams<{ provider: string; code: string }>();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setUser = useUserStore((s) => s.setUser);

  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const resolvedProvider = provider ?? 'google';

  useEffect(() => {
    if (!code) {
      router.replace('/(auth)/login');
      return;
    }
    exchangeCode();
  }, []);

  async function exchangeCode() {
    try {
      const res = await fetch(`${baseURL}${endpoint.oauth}${resolvedProvider}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const result = await res.json();

      if (!res.ok) {
        setError(result?.message ?? 'Sign in failed. Please try again.');
        return;
      }

      const data = result.data;
      const { user, access_token, refresh_token, expires_at, refresh_expires_at } = data;
      await setAuth({ access_token, refresh_token, expires_at, refresh_expires_at });
      setUser(user);
      setDone(true);

      const target = data.onboarding_status === 'never' ? '/(onboard)' : '/(tabs)/overview';
      router.replace(target as any);
    } catch {
      setError('Something went wrong. Please try again.');
    }
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
        <Text className="text-2xl font-serif text-text-strong mb-3">Sign in failed</Text>
        <Text className="text-base text-text-weak text-center mb-8">{error}</Text>
        <Button onPress={() => router.replace('/(auth)/login')} fullWidth size="lg">
          Back to login
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background items-center justify-center">
      <ActivityIndicator size="large" color={COLORS.brand} />
      <Text className="mt-4 text-base text-text-weak">
        {done ? 'Sign in successful. Redirecting…' : `Signing you in with ${resolvedProvider}…`}
      </Text>
    </SafeAreaView>
  );
}
