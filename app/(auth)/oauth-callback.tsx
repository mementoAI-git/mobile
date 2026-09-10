import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Spinner } from '@/components/ui';
import endpoint from '@/api/endpoint';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { API_BASE_URL } from '@/lib/env';
import { establishSession, restoreSessionWithCredentials } from '@/features/auth/session-coordinator';
import { completeAuthResponse } from '@/features/auth/auth-completion';
import { getMementoClientHeaders } from '@/api/client-runtime-metadata';

export default function OAuthCallbackScreen() {
  const router = useRouter();
  const { provider, code } = useLocalSearchParams<{ provider: string; code: string }>();
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const resolvedProvider = provider ?? 'google';

  const params = useLocalSearchParams<any>();

  useEffect(() => {
    if (params.access_token) {
      directLogin();
      return;
    }
    if (!code) {
      router.replace('/(auth)/login');
      return;
    }
    exchangeCode();
  }, []);

  async function directLogin() {
    try {
      const getSingleParam = (val: any): string | undefined => {
        if (Array.isArray(val)) return val[0];
        return typeof val === 'string' ? val : undefined;
      };

      const { access_token, refresh_token, expires_at, refresh_expires_at, onboarding_status, user } = params;
      
      let parsedUser = user;
      const userStr = getSingleParam(user);
      if (userStr) {
        try {
          parsedUser = JSON.parse(userStr);
        } catch {}
      }

      const token = getSingleParam(access_token);
      const refresh = getSingleParam(refresh_token);
      
      const credentials = {
        access_token: token ?? '',
        refresh_token: refresh ?? '',
        expires_at: getSingleParam(expires_at) ?? '',
        refresh_expires_at: getSingleParam(refresh_expires_at) ?? '',
      };
      
      if (parsedUser && typeof parsedUser !== 'string') {
        const completion = await completeAuthResponse(
          { data: { ...credentials, user: parsedUser } },
          establishSession,
        );
        if (completion.kind !== 'session') throw new Error('Missing OAuth session');
      } else {
        await restoreSessionWithCredentials(credentials);
      }
      
      setDone(true);
    } catch {
      setError('Authentication failed. Please try again.');
    }
  }

  async function exchangeCode() {
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint.oauth}${resolvedProvider}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getMementoClientHeaders(),
        },
        body: JSON.stringify({ code }),
      });
      const result = await res.json();

      if (!res.ok) {
        setError(result?.message ?? 'Sign in failed. Please try again.');
        return;
      }

      const completion = await completeAuthResponse(result, establishSession);
      if (completion.kind !== 'session') {
        setError('Sign in failed. Please try again.');
        return;
      }
      setDone(true);
    } catch {
      setError('Something went wrong. Please try again.');
    }
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
        <Text className="text-text-strong mb-3" style={TYPE.screenTitle}>Sign in failed</Text>
        <Text className="text-text-weak text-center mb-8" style={TYPE.bodyLarge}>{error}</Text>
        <Button onPress={() => router.replace('/(auth)/login')} fullWidth size="lg">
          Back to sign in
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background items-center justify-center">
      <Spinner size="large" />
      <Text className="mt-4 text-text-weak" style={TYPE.bodyLarge}>
        {done ? 'Sign in successful. Redirecting…' : `Signing you in with ${resolvedProvider}…`}
      </Text>
    </SafeAreaView>
  );
}
