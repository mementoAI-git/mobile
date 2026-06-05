/**
 * HostChatEntryScreen — mirrors web/src/pages/dashboard/chat/main/host-chat-entry.tsx
 *
 * Resolves the single unified Host Chat thread from the user profile.
 * - If primary_conversation_id exists → navigate to /chat/:id
 * - If not → navigate to /chat/new (creates thread on first message)
 *
 * The user never sees a "list of chats" from this tab.
 * Past conversations are accessible via Memories tab.
 */
import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { MessageCircle, RefreshCw } from 'lucide-react-native';
import { useProfile } from '@/hooks/queries/use-profile';
import { useUserStore } from '@/store';
import { COLORS, FONTS } from '@/constants/tokens';
import { Spinner } from '@/components/ui';

export default function HostChatEntryScreen() {
  const router = useRouter();
  const { data: profile, isLoading, isError, refetch } = useProfile();
  const user = useUserStore((s) => s.user);

  useEffect(() => {
    // Wait for profile to load — then resolve the primary conversation
    if (isLoading) return;

    // Primary conversation ID from profile (fresh fetch) or cached user store
    const primaryId =
      (profile as any)?.primary_conversation_id ??
      user?.primary_conversation_id;

    if (primaryId) {
      router.replace({ pathname: '/chat/[id]', params: { id: primaryId } });
    } else {
      // No primary thread yet — go to /chat/new; first message creates one
      router.replace({ pathname: '/chat/[id]', params: { id: 'new' } });
    }
  }, [isLoading, profile, user?.primary_conversation_id]);

  // Error state — same pattern as web HostChatEntryPage
  if (isError) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        edges={['top']}
      >
        <Animated.View
          entering={FadeIn.duration(300)}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: COLORS.fillWeak,
              borderWidth: 1,
              borderColor: COLORS.strokeWeaker,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MessageCircle size={28} color={COLORS.textDisabled} strokeWidth={1.5} />
          </View>
          <View style={{ alignItems: 'center', gap: 6 }}>
            <Text style={{ fontFamily: FONTS.serif, fontSize: 20, color: COLORS.textStrong, textAlign: 'center' }}>
              Couldn't load your conversation
            </Text>
            <Text style={{ fontFamily: FONTS.sans, fontSize: 14, color: COLORS.textWeak, textAlign: 'center' }}>
              Check your connection and try again.
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => refetch()}
            activeOpacity={0.8}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              borderWidth: 1,
              borderColor: COLORS.strokeWeak,
              borderRadius: 999,
              paddingHorizontal: 20,
              paddingVertical: 10,
              marginTop: 4,
            }}
          >
            <RefreshCw size={14} color={COLORS.textBase} strokeWidth={2} />
            <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 14, color: COLORS.textStrong }}>
              Retry
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // Loading state — minimal centered spinner
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      edges={['top']}
    >
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size="large" color={COLORS.brand} />
      </View>
    </SafeAreaView>
  );
}
