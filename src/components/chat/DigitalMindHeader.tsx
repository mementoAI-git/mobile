import React, { useCallback, useMemo } from 'react';
import { Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Pressable } from '@/components/ui/Touchable';
import { DigitalMindAvatar } from './DigitalMindAvatar';
import { useAuthStore, useUserStore, useUiStore } from '@/store';
import { useDigitalMindStore } from '@/store/digital-mind.store';
import { normalizeDigitalMind } from '@/features/chat/digital-mind';
import { TYPE } from '@/constants/typography';

export function DigitalMindHeader() {
  const user = useUserStore(state => state.user);
  const authUser = useAuthStore(state => state.user);
  const account = user ?? authUser;
  const userId = account?._id ?? '';
  const saved = useDigitalMindStore(state => state.profiles[userId]);
  const profile = useMemo(() => normalizeDigitalMind(saved), [saved]);
  const customize = useCallback(() => {
    void Haptics.selectionAsync();
    useUiStore.getState().openSheet('digital-mind', { userId });
  }, [userId]);
  return <Pressable onPress={customize} accessibilityRole="button" accessibilityLabel={`Customize ${profile.name}`}
    className="flex-1 flex-row items-center gap-2 mx-2" style={{ minHeight: 44, minWidth: 0 }}>
    <DigitalMindAvatar profile={profile} userImage={account?.picture_url || account?.picture} userName={account?.fullname || account?.first_name} userSeed={account?.email || userId} />
    <Text numberOfLines={2} className="flex-1 text-text-strong" style={TYPE.dashboardTitleSmall}>{profile.name}</Text>
  </Pressable>;
}
