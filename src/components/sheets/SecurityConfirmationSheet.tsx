import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { AlertTriangleIcon, Button, ZapIcon } from '@/components/ui';
import { TYPE } from '@/constants/typography';
import { COLORS, FONTS } from '@/constants/tokens';

type ConfirmationKind =
  | 'delete-passkey'
  | 'delete-memory'
  | 'disable-two-factor'
  | 'disable-biometric-fallback'
  | 'logout-all-devices'
  | 'logout-current-device'
  | 'remove-beneficiary'
  | 'delete-account';

interface SecurityConfirmationSheetProps {
  kind: ConfirmationKind;
  onConfirm?: () => void | Promise<unknown>;
  onClose?: () => void;
  subjectName?: string;
  title?: string;
  description?: string;
  confirmLabel?: string;
}

const COPY: Record<ConfirmationKind, {
  title: string;
  description: string;
  confirm: string;
  destructive: boolean;
}> = {
  'delete-passkey': {
    title: 'Delete this passkey?',
    description: 'This action can\'t be undone.',
    confirm: 'Delete passkey',
    destructive: true,
  },
  'delete-memory': {
    title: 'Delete this story?',
    description: 'This action can\'t be undone.',
    confirm: 'Delete story',
    destructive: true,
  },
  'disable-two-factor': {
    title: 'Remove two-factor authentication?',
    description: 'New sign-ins will no longer require an authenticator code.',
    confirm: 'Remove',
    destructive: true,
  },
  'disable-biometric-fallback': {
    title: 'Remove biometric fallback?',
    description: 'Face ID or Touch ID quick sign-in will be disabled on this device.',
    confirm: 'Remove',
    destructive: true,
  },
  'logout-all-devices': {
    title: 'Log out of all other devices?',
    description: 'You’ll stay signed in on this device.',
    confirm: 'Log out',
    destructive: false,
  },
  'logout-current-device': {
    title: 'Log out of this device?',
    description: 'You’ll need to sign in again to access your account.',
    confirm: 'Log out',
    destructive: false,
  },
  'remove-beneficiary': {
    title: 'Remove this beneficiary?',
    description: 'They will no longer have access to the memories and capsules you share.',
    confirm: 'Remove',
    destructive: true,
  },
  'delete-account': {
    title: 'Delete your account permanently?',
    description: 'Your access ends immediately and deletion cannot be undone. Secure cleanup may finish in the background. Capsules already delivered can remain with their recipients, without a link to your profile.',
    confirm: 'Delete account',
    destructive: true,
  },
};

export function SecurityConfirmationSheet({
  kind,
  onConfirm,
  onClose,
  subjectName,
  title,
  description,
  confirmLabel,
}: SecurityConfirmationSheetProps) {
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const copy = COPY[kind];

  const confirm = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (kind === 'logout-all-devices' && !onConfirm) {
      setUnavailable(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setLoading(true);
    try {
      await onConfirm?.();
      onClose?.();
    } catch {
      // Keep the sheet open when an async confirmation fails so upstream screen
      // error state can remain visible and the user can try again intentionally.
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: 20 }}>
      <View style={{ alignItems: 'center' }}>
        {/* <AlertTriangle size={76} color={COLORS.warning} fill={COLORS.warning} /> */}
        <AlertTriangleIcon size={116} />
        <Text
          style={{
            maxWidth: 310,
            ...TYPE.cardTitle,
            textAlign: 'center',
            marginTop: 30,
          }}
        >
          {title || (kind === 'remove-beneficiary' && subjectName
            ? `Remove ${subjectName}?`
            : copy?.title)}
        </Text>
        <Text
          style={{
            maxWidth: 320,
            ...TYPE.body,
            textAlign: 'center',
            marginTop: 12,
          }}
        >
          {description || copy?.description}
        </Text>
        {unavailable && (
          <Text
            style={{
              color: COLORS.warning,
              ...TYPE.metadata,
              lineHeight: 18,
              textAlign: 'center',
              marginTop: 12,
            }}
          >
            Session revocation is not available yet. This device remains signed in and no other session was changed.
          </Text>
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: 12, marginTop: 34 }}>
        <Button
          variant="secondary"
          size="lg"
          className="h-14 flex-1"
          onPress={onClose}
        >
          Go back
        </Button>
        <Button
          variant={copy?.destructive ? 'destructive' : 'primary'}
          size="lg"
          className={copy?.destructive ? 'h-14 flex-1' : 'h-14 flex-1 bg-text-strong'}
          loading={loading}
          onPress={confirm}
        >
          {confirmLabel || copy?.confirm}
        </Button>
      </View>
    </View>
  );
}
