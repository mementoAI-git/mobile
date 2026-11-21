import { useThemeColors } from '@/hooks/use-theme-colors';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import AlertTriangle from 'lucide-react-native/icons/triangle-alert';
import * as Haptics from 'expo-haptics';
import { AlertTriangleIcon, Button, ZapIcon } from '@/components/ui';
import { TYPE } from '@/constants/typography';
import { COLORS, FONTS } from '@/constants/tokens';

type ConfirmationKind =
  | 'delete-passkey'
  | 'delete-memory'
  | 'make-story-public'
  | 'disable-two-factor'
  | 'disable-biometric-fallback'
  | 'logout-all-devices'
  | 'logout-current-device'
  | 'remove-beneficiary'
  | 'remove-member';

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
  'make-story-public': {
    title: 'Make this story public?',
    description: 'Anyone with the link will be able to read it. You can make it private again from Who can see.',
    confirm: 'Make public',
    destructive: false,
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
    title: 'Remove this connection?',
    description: 'They will no longer have access to the memories and capsules you share.',
    confirm: 'Remove',
    destructive: true,
  },
  'remove-member': {
    title: 'Remove this member?',
    description: 'They will no longer belong to this group.',
    confirm: 'Remove',
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
  const COLORS = useThemeColors();
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
    <View style={{ paddingHorizontal: 20, paddingTop: 28 }}>
      <View style={{ alignItems: 'center' }}>
        {/* <AlertTriangle size={76} color={COLORS.warning} fill={COLORS.warning} /> */}
        <AlertTriangleIcon size={116} />
        <Text
          style={{
            maxWidth: 310,
            ...TYPE.sectionTitle,
            color: COLORS.textStrong,
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
            color: COLORS.textWeak,
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
          rounded="full"
          className="h-14 flex-1"
          onPress={onClose}
        >
          Go back
        </Button>
        <Button
          variant={copy?.destructive ? 'destructive' : 'primary'}
          size="lg"
          rounded="full"
          className="h-14 flex-1"
          loading={loading}
          onPress={confirm}
        >
          {confirmLabel || copy?.confirm}
        </Button>
      </View>
    </View>
  );
}
