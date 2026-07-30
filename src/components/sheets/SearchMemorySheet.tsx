/**
 * SearchMemorySheet — full-featured search bottom sheet
 *
 * Empty state:  Suggested conversations (from overviewPrompts) + Recent searches + Clear all
 * Active state: Server-side search via useStories({ search }) with 300ms debounce
 *
 * Recent search history is persisted in SecureStore keyed by user email (max 8 entries).
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { BottomSheetView, BottomSheetTextInput, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Search, X, Clock, ChevronRight, Sparkles } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useUiStore, useUserStore } from '@/store';
import { useStories } from '@/hooks/queries/use-memories';
import { useOverviewPrompts } from '@/hooks/queries/use-prompts';
import { secureStorage } from '@/lib/secure-storage';
import { COLORS, FONTS } from '@/constants/tokens';
import { Skeleton } from '@/components/ui/Skeleton';

dayjs.extend(relativeTime);

// ── Search history helpers ─────────────────────────────────────────────────
const MAX_HISTORY = 8;

function historyKey(email?: string | null): string {
  return `search_history_${(email ?? 'anon').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
}

async function loadHistory(email?: string | null): Promise<string[]> {
  try {
    const raw = await secureStorage.getItem(historyKey(email));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveHistory(email: string | null | undefined, entries: string[]): Promise<void> {
  try {
    await secureStorage.setItem(historyKey(email), JSON.stringify(entries));
  } catch {
    // storage failure is non-fatal
  }
}

async function pushToHistory(email: string | null | undefined, query: string): Promise<void> {
  const trimmed = query.trim();
  if (!trimmed) return;
  const current = await loadHistory(email);
  // Remove existing entry if present (move to front)
  const deduped = current.filter((q) => q.toLowerCase() !== trimmed.toLowerCase());
  const next = [trimmed, ...deduped].slice(0, MAX_HISTORY);
  await saveHistory(email, next);
}

// ── Memory result row ──────────────────────────────────────────────────────
function MemoryRow({
  memory,
  onPress,
}: {
  memory: any;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.resultRow}
    >
      <View style={styles.resultContent}>
        <Text style={styles.resultTitle} numberOfLines={1}>
          {memory.title || 'Untitled memory'}
        </Text>
        {memory.body ? (
          <Text style={styles.resultBody} numberOfLines={1}>
            {memory.body}
          </Text>
        ) : null}
        <Text style={styles.resultDate}>
          {dayjs(memory.created_at).fromNow()}
        </Text>
      </View>
      <ChevronRight size={16} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
}

// ── Recent search pill ──────────────────────────────────────────────────────
function RecentPill({
  label,
  onPress,
  onRemove,
}: {
  label: string;
  onPress: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={styles.recentPill}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.recentPillText}>
        <Clock size={12} color={COLORS.textWeak} style={{ marginRight: 5 }} />
        <Text style={styles.recentLabel} numberOfLines={1}>{label}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onRemove} activeOpacity={0.7} style={styles.recentPillRemove}>
        <X size={11} color={COLORS.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export function SearchMemorySheet() {
  const closeSheet = useUiStore((s) => s.closeSheet);
  const email = useUserStore((s) => s.user?.email);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const inputRef = useRef<any>(null);

  // Load history on mount
  useEffect(() => {
    loadHistory(email).then(setHistory);
  }, [email]);

  // Debounce query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Server-side search — only fires when debouncedQuery has content
  const hasSearchQuery = debouncedQuery.trim().length > 0;
  const { data: searchData, isFetching } = useStories(
    hasSearchQuery ? { search: debouncedQuery, limit: 20 } : undefined,
    { enabled: hasSearchQuery },
  );
  const results = hasSearchQuery
    ? (searchData?.pages.flatMap((p) => p.docs) ?? [])
    : [];

  // Suggested conversations
  const { data: overviewPromptsData } = useOverviewPrompts();
  const suggestions = (overviewPromptsData ?? []).slice(0, 6);

  const isEmpty = hasSearchQuery ? !isFetching && results.length === 0 : false;

  // ── Navigate only after the keyboard has fully dismissed ──────────────
  // Calling router.push() while the keyboard is still animating down causes
  // the new screen to measure its layout against a keyboard-present window
  // height on Android, scattering the UI.
  // We listen for keyboardDidHide (fires after the animation completes)
  // rather than using a fixed setTimeout which races on slow devices.
  // A 600ms fallback covers the case where the keyboard was already hidden
  // (no event fires) or the user tapped without the input focused.
  const navigateAfterKeyboard = useCallback((navigate: () => void) => {
    let done = false;
    const run = () => {
      if (done) return;
      done = true;
      sub.remove();
      clearTimeout(fallback);
      navigate();
    };
    Keyboard.dismiss();
    const sub = Keyboard.addListener('keyboardDidHide', run);
    const fallback = setTimeout(run, 600);
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleResultPress = useCallback(async (memory: any) => {
    Haptics.selectionAsync();
    await pushToHistory(email, debouncedQuery);
    setHistory(await loadHistory(email));
    navigateAfterKeyboard(() => {
      closeSheet();
      router.push({ pathname: '/(tabs)/stories/[id]', params: { id: memory._id } });
    });
  }, [debouncedQuery, email, closeSheet, navigateAfterKeyboard]);

  const handleHistoryPress = useCallback((term: string) => {
    Haptics.selectionAsync();
    setQuery(term);
    setDebouncedQuery(term);
  }, []);

  const handleRemoveHistory = useCallback(async (term: string) => {
    Haptics.selectionAsync();
    const next = history.filter((h) => h !== term);
    setHistory(next);
    await saveHistory(email, next);
  }, [history, email]);

  const handleClearAll = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setHistory([]);
    await saveHistory(email, []);
  }, [email]);

  const handleSuggestionPress = useCallback((prompt: any) => {
    Haptics.selectionAsync();
    navigateAfterKeyboard(() => {
      closeSheet();
      router.push({ pathname: '/chat/[id]', params: { id: prompt._id, type: 'prompt', promptTitle: prompt.title } });
    });
  }, [closeSheet, navigateAfterKeyboard]);

  const handleClear = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <BottomSheetView style={styles.container}>
      {/* ── Search input ── */}
      <View style={styles.inputWrapper}>
        <Search size={18} color={COLORS.textWeak} />
        <BottomSheetTextInput
          ref={inputRef}
          value={query}
          onChangeText={setQuery}
          placeholder="Search your memories"
          placeholderTextColor={COLORS.textMuted}
          autoFocus
          style={styles.input}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={handleClear} activeOpacity={0.7} style={styles.clearBtn}>
            <X size={14} color={COLORS.textWeak} />
          </TouchableOpacity>
        )}
      </View>

      <BottomSheetScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── EMPTY QUERY: suggestions + history ── */}
        {!query.trim() && (
          <>
            {/* Suggested conversations */}
            {suggestions.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Sparkles size={13} color={COLORS.brand} />
                  <Text style={styles.sectionTitle}>Suggested for you</Text>
                </View>
                <View style={styles.suggestionList}>
                  {suggestions.map((s: any) => (
                    <TouchableOpacity
                      key={s._id}
                      onPress={() => handleSuggestionPress(s)}
                      activeOpacity={0.7}
                      style={styles.suggestionRow}
                    >
                      <Text style={styles.suggestionText} numberOfLines={2}>
                        {s.title}
                      </Text>
                      <ChevronRight size={14} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Recent searches */}
            {history.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recent searches</Text>
                  <TouchableOpacity onPress={handleClearAll} activeOpacity={0.7}>
                    <Text style={styles.clearAllText}>Clear all</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.pillRow}>
                  {history.map((term) => (
                    <RecentPill
                      key={term}
                      label={term}
                      onPress={() => handleHistoryPress(term)}
                      onRemove={() => handleRemoveHistory(term)}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* No history + no suggestions */}
            {suggestions.length === 0 && history.length === 0 && (
              <View style={styles.emptyCenter}>
                <Search size={32} color={COLORS.textDisabled} />
                <Text style={styles.emptyTitle}>Search your memories</Text>
                <Text style={styles.emptyBody}>
                  Type anything to search across all your stories and conversations.
                </Text>
              </View>
            )}
          </>
        )}

        {/* ── ACTIVE QUERY: loading / results / empty ── */}
        {query.trim() && (
          <>
            {isFetching ? (
              // Loading skeletons
              <View style={styles.section}>
                {[1, 2, 3, 4].map((i) => (
                  <View key={i} style={styles.skeletonRow}>
                    <View style={{ flex: 1, gap: 6 }}>
                      <Skeleton className="h-4 w-3/4 rounded-full" />
                      <Skeleton className="h-3 w-full rounded-full" />
                    </View>
                  </View>
                ))}
              </View>
            ) : isEmpty ? (
              <View style={styles.emptyCenter}>
                <Search size={32} color={COLORS.textDisabled} />
                <Text style={styles.emptyTitle}>Nothing found</Text>
                <Text style={styles.emptyBody}>
                  No memories match "{debouncedQuery}". Try different keywords.
                </Text>
              </View>
            ) : (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {results.length} {results.length === 1 ? 'result' : 'results'}
                </Text>
                {results.map((memory: any) => (
                  <MemoryRow
                    key={memory._id}
                    memory={memory}
                    onPress={() => handleResultPress(memory)}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </BottomSheetScrollView>
    </BottomSheetView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 8,
    paddingBottom: 32,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    height: 52,
    borderRadius: 999,
    backgroundColor: COLORS.fillWeak,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.strokeWeak,
    paddingHorizontal: 16,
    gap: 10,
  },
  input: {
    flex: 1,
    fontFamily: FONTS.sans,
    fontSize: 15,
    color: COLORS.textStrong,
  },
  clearBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.fillWeak,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  section: {
    marginBottom: 24,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  sectionTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 11,
    color: COLORS.textWeak,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  clearAllText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 12,
    color: COLORS.brand,
  },

  // Suggestions
  suggestionList: {
    gap: 2,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.fillWeaker,
    borderRadius: 14,
    gap: 8,
  },
  suggestionText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 14,
    color: COLORS.textBase,
    flex: 1,
    lineHeight: 20,
  },

  // Recent search pills
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.fillWeak,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.strokeWeaker,
    borderRadius: 999,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 4,
    maxWidth: 200,
  },
  recentPillText: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  recentLabel: {
    fontFamily: FONTS.sansMedium,
    fontSize: 13,
    color: COLORS.textBase,
    flexShrink: 1,
  },
  recentPillRemove: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  // Results
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.strokeWeaker,
    gap: 8,
    marginBottom: 4,
  },
  resultContent: {
    flex: 1,
    gap: 3,
  },
  resultTitle: {
    fontFamily: FONTS.sansMedium,
    fontSize: 14,
    color: COLORS.textStrong,
  },
  resultBody: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    color: COLORS.textWeak,
  },
  resultDate: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  // Skeleton placeholder row
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.strokeWeaker,
  },

  // Empty state
  emptyCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: FONTS.serif,
    fontSize: 20,
    color: COLORS.textStrong,
    marginTop: 8,
  },
  emptyBody: {
    fontFamily: FONTS.sans,
    fontSize: 14,
    color: COLORS.textWeak,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 20,
  },
});
