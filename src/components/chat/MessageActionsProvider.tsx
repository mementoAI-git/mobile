import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { AccessibilityInfo, BackHandler, Keyboard, Platform, StyleSheet, Text, View, findNodeHandle, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';
import Copy from 'lucide-react-native/icons/copy';
import Reply from 'lucide-react-native/icons/corner-up-left';
import Plus from 'lucide-react-native/icons/plus';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/ui/Button';
import { Pressable } from '@/components/ui/Touchable';
import { useUiStore } from '@/store/ui.store';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { TYPE } from '@/constants/typography';
import { getMessageMenuPosition, QUICK_MESSAGE_REACTIONS } from '@/features/chat/message-actions';
import { useMessageReactionsStore } from '@/store/message-reactions.store';
import { toast } from '@/components/ui/Toast';

interface MessageActionTarget {
  view: View;
  text: string;
  reactionKey: string;
  onReply?: () => void;
}

const MessageActionsContext = createContext<((target: MessageActionTarget) => void) | null>(null);
export const useMessageActions = () => useContext(MessageActionsContext);

export function MessageActionsProvider({ children }: PropsWithChildren) {
  const colors = useThemeColors();
  const viewport = useWindowDimensions();
  const rootRef = useRef<View>(null);
  const menuRef = useRef<View>(null);
  const emojiTargetRef = useRef<MessageActionTarget | null>(null);
  const mountedRef = useRef(true);
  const [menu, setMenu] = useState<(MessageActionTarget & { x: number; y: number; width: number; height: number; viewport: { width: number; height: number } }) | null>(null);
  const [menuHeight, setMenuHeight] = useState(172);
  const react = useMessageReactionsStore((state) => state.react);
  const selectedReaction = useMessageReactionsStore((state) => menu ? state.reactions[menu.reactionKey] : undefined);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  const closeMenu = useCallback(() => {
    setMenu(null);
    if (menu?.view) {
      if (Platform.OS === 'web') menu.view.focus();
      else {
        const node = findNodeHandle(menu.view);
        if (node) AccessibilityInfo.setAccessibilityFocus(node);
      }
    }
  }, [menu]);
  const dismiss = useCallback(() => { Haptics.selectionAsync(); closeMenu(); }, [closeMenu]);

  const openMenu = useCallback((target: MessageActionTarget) => {
    target.view.measureInWindow((x, y, width, height) => {
      rootRef.current?.measureInWindow((rootX, rootY, rootWidth, rootHeight) => {
        if (!mountedRef.current) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setMenu({ ...target, x: x - rootX, y: y - rootY, width, height, viewport: { width: rootWidth, height: rootHeight } });
      });
    });
  }, []);

  useEffect(() => {
    if (!menu) return;
    const frame = requestAnimationFrame(() => {
      if (Platform.OS === 'web') menuRef.current?.focus();
      else {
        const node = findNodeHandle(menuRef.current);
        if (node) AccessibilityInfo.setAccessibilityFocus(node);
      }
    });
    const back = BackHandler.addEventListener('hardwareBackPress', () => { closeMenu(); return true; });
    const keyboard = Keyboard.addListener('keyboardDidShow', closeMenu);
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') closeMenu(); };
    if (Platform.OS === 'web') document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(frame);
      back.remove();
      keyboard.remove();
      if (Platform.OS === 'web') document.removeEventListener('keydown', onKey);
    };
  }, [menu, closeMenu]);

  useEffect(() => { setMenu(null); }, [viewport.width, viewport.height]);

  const handleReply = useCallback(() => { closeMenu(); menu?.onReply?.(); }, [closeMenu, menu]);
  const handleCopy = useCallback(() => {
    if (!menu) return;
    Clipboard.setStringAsync(menu.text.trim()).catch(() => toast('Couldn’t copy your message. Please try again.', 'error'));
    closeMenu();
  }, [closeMenu, menu]);
  const handleReaction = useCallback((emoji: string) => {
    if (menu) react(menu.reactionKey, emoji);
    closeMenu();
  }, [closeMenu, menu, react]);
  const handleSelectEmoji = useCallback((emoji: string) => {
    const target = emojiTargetRef.current;
    if (target) react(target.reactionKey, emoji);
    emojiTargetRef.current = null;
  }, [react]);
  const handleMoreEmoji = useCallback(() => {
    emojiTargetRef.current = menu;
    closeMenu();
    useUiStore.getState().openSheet('emoji-picker', { managed: true, onSelectEmoji: handleSelectEmoji });
  }, [closeMenu, menu, handleSelectEmoji]);
  const position = useMemo(() => menu ? getMessageMenuPosition(menu, menu.viewport, menuHeight) : null, [menu, menuHeight]);

  return (
    <MessageActionsContext.Provider value={openMenu}>
      <View ref={rootRef} collapsable={false} className="flex-1">
        <View className="flex-1" accessibilityElementsHidden={Boolean(menu)} importantForAccessibility={menu ? 'no-hide-descendants' : 'auto'}>
          {children}
        </View>
        {menu && position && (
          <View style={[StyleSheet.absoluteFill, { zIndex: 100 }]}>
            <Pressable accessibilityLabel="Dismiss message actions" accessibilityRole="button" onPress={dismiss} style={StyleSheet.absoluteFill} />
            <Animated.View
              key={menu.reactionKey}
              onLayout={(event) => setMenuHeight(event.nativeEvent.layout.height)}
              entering={FadeIn.duration(150).reduceMotion(ReduceMotion.System)}
              exiting={FadeOut.duration(150).reduceMotion(ReduceMotion.System)}
              style={[{ position: 'absolute', ...position, backgroundColor: colors.cardRaised, borderColor: colors.strokeWeak, borderWidth: 1, borderRadius: 14, padding: 8, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 16, elevation: 3 }]}
            >
              <View ref={menuRef} accessibilityLabel="Message actions" accessibilityViewIsModal onAccessibilityEscape={dismiss}>
                <Button variant="ghost" size="menu" fullWidth className="justify-start" onPress={handleReply} disabled={!menu.onReply} leftIcon={<Reply size={18} color={colors.textWeak} />}>
                  Reply
                </Button>
                <Button variant="ghost" size="menu" fullWidth className="justify-start" onPress={handleCopy} disabled={!menu.text.trim()} leftIcon={<Copy size={18} color={colors.textWeak} />}>
                  Copy
                </Button>
                <View className="flex-row items-center justify-between border-t border-stroke-weak pt-2 mt-1">
                  {QUICK_MESSAGE_REACTIONS.map((emoji) => (
                    <QuickReaction key={emoji} emoji={emoji} selected={selectedReaction === emoji} onReact={handleReaction} />
                  ))}
                  <Button variant="ghost" size="sm" iconOnly accessibilityLabel="More reactions" onPress={handleMoreEmoji} style={{ width: 44, minHeight: 44 }}>
                    <Plus size={22 * 0.8} color={colors.textWeak} />
                  </Button>
                </View>
              </View>
            </Animated.View>
          </View>
        )}
      </View>
    </MessageActionsContext.Provider>
  );
}

function QuickReaction({ emoji, selected, onReact }: { emoji: string; selected: boolean; onReact: (emoji: string) => void }) {
  const colors = useThemeColors();
  const handlePress = useCallback(() => onReact(emoji), [emoji, onReact]);
  return (
    <Button variant="ghost" size="sm" iconOnly accessibilityLabel={`${selected ? 'Remove' : 'React with'} ${emoji}`} onPress={handlePress} style={{ width: 44, minHeight: 44, backgroundColor: selected ? colors.fillWeak : 'transparent' }}>
      <Text style={[TYPE.uiTitle, { transform: [{ scale: 0.8 }] }]}>{emoji}</Text>
    </Button>
  );
}
