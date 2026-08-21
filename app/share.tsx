/**
 * app/share.tsx — Share Intent receiver
 *
 * This screen is opened by the OS when the user shares media to Memento
 * from their gallery, WhatsApp, Files, or any other app.
 *
 * Requires a native build (EAS / expo run:ios|android).
 * Not accessible via Expo Go.
 *
 * Flow:
 *   1. OS launches Memento with shared file(s)
 *   2. This screen receives the payload via expo-share-intent
 *   3. User sees a preview of the shared media
 *   4. Tapping "Save as memory" → navigates to /editor pre-loaded with the file
 *   5. Tapping "Quick capture" → navigates to /editor in quick-capture mode
 *   6. Dismissing → clears the intent and returns to the app
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Image, ScrollView,
  ActivityIndicator, ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useShareIntent } from 'expo-share-intent';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { X, FileText, Music, Video } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS } from '@/constants/tokens';
import { UiZapFast, UiDatabase01 } from '@/components/ui/icons/SettingsIcons';
import { NativeModalSafeAreaBoundary } from '@/components/system/NativeModalSafeAreaBoundary';

const PATTERN = require('../assets/images/backgrounds/welcome_bg.png');

// ─── File type helpers ────────────────────────────────────────────────────────

function getMimeCategory(mimeType?: string): 'image' | 'video' | 'audio' | 'file' {
  if (!mimeType) return 'file';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'file';
}

function FilePreview({ uri, mimeType, name }: { uri: string; mimeType?: string; name?: string }) {
  const cat = getMimeCategory(mimeType);

  if (cat === 'image') {
    return (
      <Image
        source={{ uri }}
        style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 20 }}
        resizeMode="cover"
      />
    );
  }

  const icons = {
    video: <Video size={40} color={COLORS.brand} strokeWidth={1.5} />,
    audio: <Music size={40} color={COLORS.brand} strokeWidth={1.5} />,
    file: <FileText size={40} color={COLORS.brand} strokeWidth={1.5} />,
  };

  return (
    <View style={{
      width: '100%',
      aspectRatio: 4 / 3,
      borderRadius: 20,
      backgroundColor: `${COLORS.brand}08`,
      borderWidth: 1,
      borderColor: `${COLORS.brand}15`,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    }}>
      {icons[cat]}
      {name ? (
        <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 14, color: COLORS.textWeak, textAlign: 'center', paddingHorizontal: 20 }} numberOfLines={2}>
          {name}
        </Text>
      ) : null}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ShareScreen() {
  return (
    <NativeModalSafeAreaBoundary>
      <ShareContent />
    </NativeModalSafeAreaBoundary>
  );
}

function ShareContent() {
  const router = useRouter();
  const { shareIntent, resetShareIntent, hasShareIntent } = useShareIntent();
  const [isProcessing, setIsProcessing] = useState(false);

  // If there's no share intent (e.g. navigated to directly), redirect home
  useEffect(() => {
    if (!hasShareIntent) {
      router.replace('/(tabs)/overview');
    }
  }, [hasShareIntent, router]);

  const handleDismiss = useCallback(() => {
    Haptics.selectionAsync();
    resetShareIntent();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/overview');
    }
  }, [resetShareIntent, router]);

  const handleSaveAsMemory = useCallback(async () => {
    if (!shareIntent?.files?.length && !shareIntent?.text) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsProcessing(true);

    try {
      // Build the initialData payload to pre-seed the editor
      const file = shareIntent.files?.[0];
      const initialAttachments = file ? [{
        url: file.path,
        name: file.fileName ?? 'shared_file',
        type: file.mimeType ?? 'application/octet-stream',
      }] : [];

      const initialText = shareIntent.text ?? '';

      // Encode and pass to editor
      const payload = encodeURIComponent(JSON.stringify({
        body: initialText,
        attachments: initialAttachments,
      }));

      resetShareIntent();
      router.replace({
        pathname: '/editor',
        params: { mode: 'story', initialData: payload, fromShare: 'true' },
      });
    } finally {
      setIsProcessing(false);
    }
  }, [shareIntent, resetShareIntent, router]);

  const handleQuickCapture = useCallback(async () => {
    if (!shareIntent?.files?.length && !shareIntent?.text) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsProcessing(true);

    try {
      const file = shareIntent.files?.[0];
      const initialAttachments = file ? [{
        url: file.path,
        name: file.fileName ?? 'shared_file',
        type: file.mimeType ?? 'application/octet-stream',
      }] : [];

      const payload = encodeURIComponent(JSON.stringify({
        body: shareIntent.text ?? '',
        attachments: initialAttachments,
      }));

      resetShareIntent();
      router.replace({
        pathname: '/editor',
        params: { mode: 'quick-capture', initialData: payload, fromShare: 'true' },
      });
    } finally {
      setIsProcessing(false);
    }
  }, [shareIntent, resetShareIntent, router]);

  if (!shareIntent) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.brand} />
      </SafeAreaView>
    );
  }

  const firstFile = shareIntent.files?.[0];
  const fileCount = shareIntent.files?.length ?? 0;
  const hasText = !!shareIntent.text?.trim();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top', 'bottom']}>
      <ImageBackground source={PATTERN} style={{ flex: 1 }} imageStyle={{ opacity: 0.03 }}>

        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12 }}>
          <Text style={{ fontFamily: FONTS.serif, fontSize: 22, color: COLORS.textStrong }}>
            Save to Memento
          </Text>
          <TouchableOpacity
            onPress={handleDismiss}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.fillWeak, borderWidth: 1, borderColor: COLORS.strokeWeaker, alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={16} color={COLORS.textBase} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40, gap: 20 }}>

          {/* File preview */}
          <Animated.View entering={FadeInDown.duration(400)}>
            {firstFile ? (
              <FilePreview
                uri={firstFile.path}
                mimeType={firstFile.mimeType}
                name={firstFile.fileName}
              />
            ) : null}
            {fileCount > 1 && (
              <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 13, color: COLORS.textWeak, marginTop: 8, textAlign: 'center' }}>
                +{fileCount - 1} more file{fileCount - 1 > 1 ? 's' : ''}
              </Text>
            )}
            {hasText && (
              <View style={{ marginTop: 12, backgroundColor: COLORS.fillWeak, borderRadius: 16, padding: 16 }}>
                <Text style={{ fontFamily: FONTS.sans, fontSize: 14, color: COLORS.textStrong, lineHeight: 20 }} numberOfLines={4}>
                  {shareIntent.text}
                </Text>
              </View>
            )}
          </Animated.View>

          {/* Context line */}
          <Animated.Text
            entering={FadeInDown.delay(100).duration(400)}
            style={{ fontFamily: FONTS.sans, fontSize: 14, color: COLORS.textWeak, lineHeight: 20, textAlign: 'center', paddingHorizontal: 8 }}
          >
            What would you like to do with this?
          </Animated.Text>

          {/* Action buttons */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)} style={{ gap: 12 }}>
            {/* Primary — full story */}
            <TouchableOpacity
              onPress={handleSaveAsMemory}
              disabled={isProcessing}
              activeOpacity={0.85}
              style={{
                height: 56,
                borderRadius: 999,
                backgroundColor: COLORS.brand,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                opacity: isProcessing ? 0.6 : 1,
              }}
            >
              {isProcessing
                ? <ActivityIndicator size="small" color="white" />
                : (
                  <>
                    <UiDatabase01 size={18} color="white" strokeWidth={2} />
                    <Text style={{ fontFamily: FONTS.sansBold, fontSize: 15, color: 'white' }}>
                      Write a story about this
                    </Text>
                  </>
                )
              }
            </TouchableOpacity>

            {/* Secondary — quick capture */}
            <TouchableOpacity
              onPress={handleQuickCapture}
              disabled={isProcessing}
              activeOpacity={0.8}
              style={{
                height: 52,
                borderRadius: 999,
                backgroundColor: COLORS.fillWeaker,
                borderWidth: 1,
                borderColor: COLORS.strokeWeaker,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                opacity: isProcessing ? 0.6 : 1,
              }}
            >
              <UiZapFast size={16} color={COLORS.textStrong} strokeWidth={2} />
              <Text style={{ fontFamily: FONTS.sansSemi, fontSize: 14, color: COLORS.textStrong }}>
                Quick capture
              </Text>
            </TouchableOpacity>

            {/* Cancel */}
            <TouchableOpacity
              onPress={handleDismiss}
              activeOpacity={0.7}
              style={{ paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ fontFamily: FONTS.sans, fontSize: 14, color: COLORS.textMuted }}>
                Not now
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </ImageBackground>
    </SafeAreaView>
  );
}
