import { Alert, Linking } from 'react-native';
import {
  getPermissionRecoveryAction,
  type PermissionLike,
} from '@/lib/permission-recovery';

interface ShowPermissionRecoveryAlertOptions {
  permission: PermissionLike;
  title: string;
  description: string;
  settingsDescription?: string;
}

export function showPermissionRecoveryAlert({
  permission,
  title,
  description,
  settingsDescription,
}: ShowPermissionRecoveryAlertOptions) {
  const action = getPermissionRecoveryAction(permission);

  if (action === 'settings') {
    Alert.alert(
      title,
      settingsDescription ?? description,
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ],
    );
    return;
  }

  Alert.alert(title, description, [{ text: 'Got it' }]);
}
