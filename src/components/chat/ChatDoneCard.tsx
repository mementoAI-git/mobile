import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import Check from 'lucide-react-native/icons/check';
import Undo2 from 'lucide-react-native/icons/undo-2';
import { post } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { Pressable } from '@/components/ui/Touchable';
import { queryKeys } from '@/constants/query-keys';
import { TYPE } from '@/constants/typography';
import type { ThemeColors } from '@/constants/tokens';
import { invalidateMemoryQueries } from '@/features/memories/cache';
import type { ChatDone } from '@/features/chat/memento-links';
import { useThemeColors, useThemeStyles } from '@/hooks/use-theme-colors';

type DoneState = { kind: 'done' } | { kind: 'working' } | { kind: 'undone'; text: string } | { kind: 'failed'; text: string };

/** Something Memento did straight away, with Undo for half an hour. */
export function ChatDoneCard({ done }: { done: ChatDone }) {
  const COLORS = useThemeColors();
  const styles = useThemeStyles(createStyles);
  const queryClient = useQueryClient();
  const [state, setState] = useState<DoneState>(done.undone ? { kind: 'undone', text: 'Undone.' } : { kind: 'done' });

  const undo = useCallback(async () => {
    if (!done.action) return;
    setState({ kind: 'working' });
    try {
      const response = await post<{ done: boolean; text: string; effects: unknown[] }>(endpoint.chatUndo, {
        memory: done.memory,
        action: done.action,
      });
      const data = (response as { data?: { done?: boolean; text?: string; effects?: unknown[] } })?.data;
      for (const effect of (data?.effects ?? []) as { type?: string; what?: string }[]) {
        if (effect?.type !== 'refresh') continue;
        if (effect.what === 'profile') void queryClient.invalidateQueries({ queryKey: queryKeys.profile });
        else if (effect.what === 'memories') invalidateMemoryQueries(queryClient, { includeUserStats: true, includeAllStories: true });
        else if (effect.what === 'beneficiaries') void queryClient.invalidateQueries({ queryKey: queryKeys.beneficiaries });
        else if (effect.what === 'observations') {
          void queryClient.invalidateQueries({ queryKey: queryKeys.persona });
          void queryClient.invalidateQueries({ queryKey: queryKeys.userContext });
        }
      }
      const text = data?.text || 'Undone.';
      setState(data?.done ? { kind: 'undone', text } : { kind: 'failed', text });
    } catch (error) {
      setState({ kind: 'failed', text: (error as { message?: string } | null)?.message || "That didn't go through. Try again, or change it in the app." });
    }
  }, [done, queryClient]);

  const showUndo = Boolean(done.action) && (state.kind === 'done' || state.kind === 'working');
  return (
    <View style={styles.card} accessibilityLabel="What Memento did">
      {state.kind === 'undone' ? <Undo2 size={16} color={COLORS.textWeak} /> : <Check size={16} color={COLORS.textWeak} />}
      <Text style={[styles.text, state.kind === 'failed' && styles.failed, state.kind === 'undone' && styles.muted]} accessibilityLiveRegion="polite">
        {state.kind === 'done' || state.kind === 'working' ? done.text : state.text}
      </Text>
      {showUndo && (
        <Pressable
          onPress={() => void undo()}
          disabled={state.kind === 'working'}
          accessibilityRole="button"
          accessibilityLabel="Undo"
          style={styles.undo}
        >
          <Text style={styles.undoText}>{state.kind === 'working' ? 'Undoing…' : 'Undo'}</Text>
        </Pressable>
      )}
    </View>
  );
}

const createStyles = (COLORS: ThemeColors) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: COLORS.strokeWeak,
      backgroundColor: COLORS.fillWeaker,
    },
    text: { ...TYPE.body, color: COLORS.textStrong, flex: 1 },
    muted: { color: COLORS.textWeak },
    failed: { color: COLORS.error },
    undo: { minHeight: 32, paddingHorizontal: 8, justifyContent: 'center' },
    undoText: { ...TYPE.bodyStrong, color: COLORS.linkPreview },
  });
