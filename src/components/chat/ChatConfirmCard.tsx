import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import Check from 'lucide-react-native/icons/check';
import X from 'lucide-react-native/icons/x';
import { post } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { Button } from '@/components/ui/Button';
import { queryKeys } from '@/constants/query-keys';
import { TYPE } from '@/constants/typography';
import type { ThemeColors } from '@/constants/tokens';
import { invalidateMemoryQueries } from '@/features/memories/cache';
import type { ChatConfirmation } from '@/features/chat/memento-links';
import { useThemeColors, useThemeStyles } from '@/hooks/use-theme-colors';

type CardState =
  | { kind: 'waiting' }
  | { kind: 'working' }
  | { kind: 'done'; text: string }
  | { kind: 'cancelled' }
  | { kind: 'failed'; text: string };

/**
 * An action Memento will take once the host confirms it (delete a story,
 * share it, invite someone…). Nothing happens until Confirm is pressed.
 */
export function ChatConfirmCard({ card }: { card: ChatConfirmation }) {
  const COLORS = useThemeColors();
  const styles = useThemeStyles(createStyles);
  const queryClient = useQueryClient();
  const [state, setState] = useState<CardState>(
    card.confirmed ? { kind: 'done', text: 'Done.' } : { kind: 'waiting' },
  );

  const refresh = useCallback(
    (effects: unknown) => {
      if (!Array.isArray(effects)) return;
      for (const effect of effects as { type?: string; what?: string }[]) {
        if (effect?.type !== 'refresh') continue;
        if (effect.what === 'profile') void queryClient.invalidateQueries({ queryKey: queryKeys.profile });
        else if (effect.what === 'memories') invalidateMemoryQueries(queryClient, { includeUserStats: true });
        else if (effect.what === 'beneficiaries') void queryClient.invalidateQueries({ queryKey: queryKeys.beneficiaries });
        else if (effect.what === 'observations') {
          void queryClient.invalidateQueries({ queryKey: queryKeys.persona });
          void queryClient.invalidateQueries({ queryKey: queryKeys.userContext });
        }
      }
    },
    [queryClient],
  );

  const confirm = useCallback(async () => {
    setState({ kind: 'working' });
    try {
      const response = await post<{ done: boolean; text: string; effects: unknown[] }>(endpoint.chatAction(card.tool), {
        memory: card.memory,
        args: card.args,
      });
      const data = (response as { data?: { done?: boolean; text?: string; effects?: unknown[] } })?.data;
      refresh(data?.effects);
      const text = data?.text || 'Done.';
      setState(data?.done ? { kind: 'done', text } : { kind: 'failed', text });
    } catch (error) {
      const message = (error as { message?: string } | null)?.message;
      setState({ kind: 'failed', text: message || "That didn't go through. Try again, or do it in the app." });
    }
  }, [card, refresh]);

  const settled = state.kind === 'done' || state.kind === 'cancelled' || state.kind === 'failed';
  return (
    <View style={styles.card} accessibilityLabel="Confirm this action">
      <Text style={styles.text}>{card.text}</Text>
      {card.tool === 'edit_story' && card.args.mode === 'replace' && typeof card.args.text === 'string' && (
        <View style={styles.preview} accessibilityLabel="The new text">
          <Text style={styles.previewText} numberOfLines={12}>
            {card.args.text}
          </Text>
        </View>
      )}
      {settled ? (
        <View style={styles.statusRow} accessibilityLiveRegion="polite">
          {state.kind === 'done' && <Check size={16} color={COLORS.textWeak} />}
          {state.kind === 'cancelled' && <X size={16} color={COLORS.textWeak} />}
          <Text style={[styles.status, state.kind === 'failed' && styles.failed]}>
            {state.kind === 'cancelled' ? 'Cancelled. Nothing was changed.' : state.text}
          </Text>
        </View>
      ) : (
        <View style={styles.buttons}>
          <Button size="sm" onPress={() => void confirm()} loading={state.kind === 'working'} disabled={state.kind === 'working'}>
            Confirm
          </Button>
          <Button
            size="sm"
            variant="outline"
            onPress={() => setState({ kind: 'cancelled' })}
            disabled={state.kind === 'working'}
          >
            Cancel
          </Button>
        </View>
      )}
    </View>
  );
}

const createStyles = (COLORS: ThemeColors) =>
  StyleSheet.create({
    card: {
      gap: 8,
      marginTop: 8,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: COLORS.strokeWeak,
      backgroundColor: COLORS.fillWeaker,
    },
    text: { ...TYPE.body, color: COLORS.textStrong },
    buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    status: { ...TYPE.body, color: COLORS.textWeak, flexShrink: 1 },
    failed: { color: COLORS.error },
    preview: { borderLeftWidth: 3, borderLeftColor: COLORS.strokeWeak, paddingLeft: 8 },
    previewText: { ...TYPE.body, color: COLORS.textWeak },
  });
