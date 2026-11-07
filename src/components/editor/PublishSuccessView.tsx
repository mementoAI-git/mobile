import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import Copy from 'lucide-react-native/icons/copy';
import Check from 'lucide-react-native/icons/check';
import { Button } from '@/components/ui/Button';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { useResolvedAppearance, useThemeColors } from '@/hooks/use-theme-colors';
import { TYPE } from '@/constants/typography';
import { PUBLISH_SUCCESS_ASSETS } from '@/features/editor/publish-success-assets';
import { toast } from '@/components/ui/Toast';
import { createPublishSuccessActions } from '@/features/editor/publish-success-actions';
import { SuccessRays } from './SuccessRays';

const successActions = createPublishSuccessActions({
  copyText: text => Clipboard.setStringAsync(text),
  openURL: url => Linking.openURL(url),
  notifyError: message => toast(message, 'error'),
});

const SOCIAL = [
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'x', label: 'X' },
] as const;

export function PublishSuccessView({ publishedUrl, onAddAnother, onDismiss }: {
  publishedUrl: string; onAddAnother: () => void; onDismiss: () => void;
}) {
  const colors = useThemeColors();
  const dark = useResolvedAppearance() === 'dark';
  const surface = colors.background === 'transparent' ? colors.card : colors.background;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [copied, setCopied] = useState(false);
  const mounted = useRef(true);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; clearTimeout(copyTimer.current); };
  }, []);
  const handleCopy = useCallback(async () => {
    void Haptics.selectionAsync();
    const didCopy = await successActions.copy(publishedUrl);
    if (!didCopy || !mounted.current) return;
    setCopied(true);
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => { if (mounted.current) setCopied(false); }, 2000);
  }, [publishedUrl]);
  const openSocial = useCallback((platform: typeof SOCIAL[number]['id']) => {
    void Haptics.selectionAsync();
    void successActions.share(platform, publishedUrl);
  }, [publishedUrl]);
  const scale = Math.min((width - 32) / 361, 1.15);
  return <View style={{ flex: 1, backgroundColor: surface }}>
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <SuccessRays width={width} />
      <View style={{ position: 'absolute', top: -33.4, left: (width - 451.354) / 2 }}><SvgXml xml={dark ? PUBLISH_SUCCESS_ASSETS.glowDark : PUBLISH_SUCCESS_ASSETS.glow} /></View>
    </View>
    <ScrollView bounces={false} showsVerticalScrollIndicator={false}
      contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16, paddingHorizontal: 16 }}>
      <View style={{ height: 300 * scale, alignItems: 'center' }}>
        <View style={{ width: 361, height: 300, transform: [{ scale }], transformOrigin: 'top center' }}>
          <View style={{ position: 'absolute', left: 50.23, top: 65.13, width: 49.852, height: 49.852, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '14.22deg' }] }}><SvgXml xml={PUBLISH_SUCCESS_ASSETS.planet} /></View>
          <View style={{ position: 'absolute', left: 180.5, top: 39.47 }}><SvgXml xml={PUBLISH_SUCCESS_ASSETS.smallCloud} /></View>
          <View style={{ position: 'absolute', left: 213.74, top: 24.53 }}><SvgXml xml={PUBLISH_SUCCESS_ASSETS.bigCloud} /></View>
          <View style={{ position: 'absolute', left: 90, top: 91.81 }}><SvgXml xml={PUBLISH_SUCCESS_ASSETS.surfer} /></View>
        </View>
      </View>
      <Text style={{ ...TYPE.publishSuccessTitle, color: colors.textStrong, textAlign: 'center', alignSelf: 'center', maxWidth: 250, marginTop: 16, marginBottom: 16 }}>
        {'Story published\nsuccessfully'}
      </Text>
      <View style={{ backgroundColor: colors.fillWeak, borderRadius: 20, padding: 16, gap: 16 }}>
        <Text style={{ ...TYPE.bodySmall, color: colors.textStrong }}>Share this story with friends</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.strokeWeak, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.fillWeaker }}>
          <Text numberOfLines={1} style={{ flex: 1, minWidth: 0, ...TYPE.body, color: colors.textStrong, paddingHorizontal: 12, paddingVertical: 10 }}>{publishedUrl}</Text>
          <TouchableOpacity accessibilityLabel="Copy story link" onPress={handleCopy} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, borderLeftWidth: 1, borderLeftColor: colors.strokeWeak, paddingHorizontal: 16 }}>
            {copied ? <Check size={20} color={colors.success} /> : <Copy size={20} color={colors.brand} />}
            <Text style={{ ...TYPE.buttonSmall, color: copied ? colors.success : colors.brand }}>{copied ? 'Copied' : 'Copy'}</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.strokeWeak }} />
          <Text style={{ ...TYPE.metadata, color: colors.textWeak }}>Or share on social media</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.strokeWeak }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 22, justifyContent: 'center' }}>
          {SOCIAL.map(({ id, label }) => <TouchableOpacity key={id} accessibilityLabel={`Share on ${label}`} onPress={() => openSocial(id)}
            style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.fillWeak, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
              <SvgXml xml={PUBLISH_SUCCESS_ASSETS[id].replaceAll('fill="white"', `fill="${colors.textStrong}"`)} />
            </View>
          </TouchableOpacity>)}
        </View>
      </View>
      <View style={{ flex: 1, minHeight: 40 }} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Button rounded="full" variant="ghost" onPress={onDismiss} style={{ flex: 0.45, minHeight: 52, paddingHorizontal: 12, backgroundColor: colors.fillWeaker }}>
          <Text style={{ ...TYPE.publishSuccessAction, color: colors.textStrong }}>Dismiss</Text>
        </Button>
        <Button rounded="full" variant="ghost" onPress={onAddAnother} style={{ flex: 0.55, minHeight: 52, paddingHorizontal: 12, backgroundColor: colors.activeFill }}>
          <Text style={{ ...TYPE.publishSuccessAction, color: colors.activeText }}>Add another story</Text>
        </Button>
      </View>
    </ScrollView>
  </View>;
}
