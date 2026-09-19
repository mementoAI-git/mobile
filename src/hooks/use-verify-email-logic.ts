import { useState, useEffect, useCallback } from 'react';
import { Linking, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  useVerifyRegistrationEmail,
  useResendRegistrationCode,
} from '@/hooks/mutations/use-email-verification-mutations';
import {
  normalizeOtpInput,
  isCompleteOtp,
  getResendSecondsRemaining,
} from '@/features/auth/email-verification';

export async function openMailApp(): Promise<boolean> {
  try {
    if (Platform.OS === 'ios') {
      const mailUrl = 'message://';
      const canOpen = await Linking.canOpenURL(mailUrl);
      if (canOpen) {
        await Linking.openURL(mailUrl);
        return true;
      }
    }
    const mailtoUrl = 'mailto:';
    const canOpenMailto = await Linking.canOpenURL(mailtoUrl);
    if (canOpenMailto) {
      await Linking.openURL(mailtoUrl);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function useVerifyEmailLogic() {
  const router = useRouter();
  const { email = '', token: initialToken = '', mode = '' } = useLocalSearchParams<{
    email?: string;
    token?: string;
    mode?: string;
  }>();

  const [code, setCode] = useState(() => normalizeOtpInput(initialToken));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendNotice, setResendNotice] = useState<string | null>(null);

  // Sync token if received via deep link while mounted
  useEffect(() => {
    if (initialToken) {
      const normalized = normalizeOtpInput(initialToken);
      if (normalized) {
        setCode(normalized);
      }
    }
  }, [initialToken]);

  // Initialize resend cooldown timer (30s) if user just arrived from registration
  const [sentAtMs, setSentAtMs] = useState<number | null>(() => (email ? Date.now() : null));
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() =>
    getResendSecondsRemaining(sentAtMs, Date.now()),
  );

  const verificationType = mode === 'reset-password' ? ('reset' as const) : ('verify' as const);
  const {
    mutate: verify,
    isPending: isVerifying,
    isSuccess,
  } = useVerifyRegistrationEmail({ email, type: verificationType });

  const {
    mutate: resend,
    isPending: isResending,
  } = useResendRegistrationCode();

  // Update countdown timer every second
  useEffect(() => {
    if (sentAtMs === null) {
      setSecondsRemaining(0);
      return;
    }

    const updateTimer = () => {
      const remaining = getResendSecondsRemaining(sentAtMs, Date.now());
      setSecondsRemaining(remaining);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [sentAtMs]);

  const handleVerify = useCallback(
    (codeToVerify?: string) => {
      const targetCode = (codeToVerify ?? code).trim();
      if (!isCompleteOtp(targetCode)) return;

      setErrorMessage(null);
      setResendNotice(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      verify(targetCode, {
        onSuccess: (completion) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          if (mode === 'reset-password') {
            router.push({
              pathname: '/(auth)/set-password',
              params: { token: targetCode, email },
            });
            return;
          }
          // If the API response did not automatically establish a session, fallback to login
          if (completion.kind !== 'session') {
            router.replace('/(auth)/login');
          }
        },
        onError: (err: any) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setErrorMessage(err?.message ?? 'Incorrect code. Please check and try again.');
        },
      });
    },
    [code, verify, router],
  );

  const handleResend = useCallback(() => {
    if (secondsRemaining > 0 || isResending || !email) return;

    setErrorMessage(null);
    setResendNotice(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    resend(email, {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSentAtMs(Date.now());
        setResendNotice('A new verification code was sent to your email.');
      },
      onError: (err: any) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setErrorMessage(err?.message ?? 'Couldn’t resend code. Please try again.');
      },
    });
  }, [secondsRemaining, isResending, email, resend]);

  const handleCodeChange = (newCode: string) => {
    setErrorMessage(null);
    setCode(newCode);
  };

  const handleOpenMailbox = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await openMailApp();
  }, []);

  return {
    email,
    code,
    setCode: handleCodeChange,
    isVerifying,
    isResending,
    errorMessage,
    resendNotice,
    isSuccess,
    secondsRemaining,
    handleVerify,
    handleResend,
    handleOpenMailbox,
    mode,
    router,
  };
}
