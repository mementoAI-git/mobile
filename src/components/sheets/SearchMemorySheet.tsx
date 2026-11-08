/**
 * SearchMemorySheet — mobile port of web's phone search sheet
 * (Web/memento-web/src/components/modal/memory/search/search-modal-v2.tsx).
 *
 * - One search field in a divided header (8px input radius, no title).
 * - Empty field: "Recently opened" memories (the last five opened).
 * - With a query: description search via /memories/search, falling back to a
 *   word search, with a status line and "Memories · N results".
 * - Rows: picture (or DiceBear art), title and preview with matches marked, date.
 */
import type { ThemeColors } from '@/constants/tokens';
import { useThemeColors, useThemeStyles } from '@/hooks/use-theme-colors';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, StyleSheet, Text, View } from 'react-native';
import { BottomSheetScrollView, BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import dayjs from 'dayjs';
import Search from 'lucide-react-native/icons/search';
import X from 'lucide-react-native/icons/x';
import CalendarDays from 'lucide-react-native/icons/calendar-days';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { Button } from '@/components/ui/Button';
import { SignedAttachmentImage } from '@/components/ui/SignedAttachmentImage';
import { INPUT_RADIUS } from '@/components/ui/TextInput';
import { TYPE } from '@/constants/typography';
import { useUiStore, useUserStore } from '@/store';
import { useMemorySearch } from '@/hooks/queries/use-memory-search';
import { getRecentMemories, type RecentMemory } from '@/features/memories/recent-memories';
import { getQuestionIdenticonUrl } from '@/features/explore/question-presentation';
import { stripHtml } from '@/features/memories/strip-html';
import { searchHighlightParts, searchPictureOf, searchStatusText } from '@/features/memories/search-presentation';

export { stripHtml };

type SearchMemory = Pick<RecentMemory, '_id' | 'title' | 'type' | 'attachments' | 'body' | 'created_at'> & { _id: string };

function Highlighted({ text, term, style, markStyle }: { text: string; term: string; style: any; markStyle: any }) {
  const parts = searchHighlightParts(text, term);
  return (
    <Text style={style} numberOfLines={1}>
      {parts.map((part, index) => (part.match
        ? <Text key={index} style={markStyle}>{part.text}</Text>
        : part.text))}
    </Text>
  );
}

const SearchRow = React.memo(function SearchRow({
  memory,
  term,
  onSelect,
}: {
  memory: SearchMemory;
  term: string;
  onSelect: (memory: SearchMemory) => void;
}) {
  const styles = useThemeStyles(createStyles);
  const COLORS = useThemeColors();
  const picture = searchPictureOf(memory.attachments);
  const [pictureFailed, setPictureFailed] = useState(false);
  const previewBody = stripHtml(memory.body);
  const handlePress = useCallback(() => onSelect(memory), [memory, onSelect]);
  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Open ${memory.title || 'memory'}`}
      style={styles.row}
    >
      {picture && !pictureFailed ? (
        <SignedAttachmentImage
          attachment={{ _id: picture._id ?? picture.url, url: picture.url, thumbnail: picture.thumbnail, access: picture.access }}
          preferThumbnail
          style={styles.picture}
          resizeMode="cover"
          onError={() => setPictureFailed(true)}
        />
      ) : (
        <Image source={{ uri: getQuestionIdenticonUrl(memory._id) }} style={styles.picture} contentFit="cover" accessibilityElementsHidden />
      )}
      <View style={styles.rowWords}>
        <Highlighted text={memory.title || 'Untitled memory'} term={term} style={[TYPE.buttonSmall, styles.rowTitle]} markStyle={styles.mark} />
        {previewBody ? (
          <Highlighted text={previewBody} term={term} style={[TYPE.bodySmall, styles.rowBody]} markStyle={styles.mark} />
        ) : null}
      </View>
      {memory.created_at ? (
        <View style={styles.rowDate}>
          <CalendarDays size={14} color={COLORS.textMuted} />
          <Text style={[TYPE.metadata, styles.rowDateText]}>{dayjs(memory.created_at).format('MMM DD')}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
});

export function SearchMemorySheet() {
  const COLORS = useThemeColors();
  const styles = useThemeStyles(createStyles);
  const closeSheet = useUiStore((s) => s.closeSheet);
  const email = useUserStore((s) => s.user?.email);
  const inputRef = useRef<any>(null);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [recent, setRecent] = useState<RecentMemory[]>([]);

  useEffect(() => {
    void getRecentMemories(email).then(setRecent);
  }, [email]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data, isLoading, isFetching, error, refetch } = useMemorySearch(debouncedQuery);
  const showRecent = !query.trim();
  const queryChanging = query.trim() !== debouncedQuery;
  const searchError = !showRecent && !queryChanging && Boolean(error);
  const isSearching = !showRecent && (queryChanging || isLoading || isFetching);
  const results = useMemo(() => (data?.docs ?? []) as SearchMemory[], [data?.docs]);
  const visible: SearchMemory[] = showRecent ? recent : queryChanging || isLoading ? [] : results;
  const showEmpty = !isSearching && !searchError && visible.length === 0;
  const term = showRecent ? '' : query.trim();

  // Navigate once the keyboard is down, so the next screen lays out at full height.
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

  const handleSelect = useCallback((memory: SearchMemory) => {
    Haptics.selectionAsync();
    navigateAfterKeyboard(() => {
      closeSheet();
      if (memory.type === 'conversation') router.push({ pathname: '/chat/[id]', params: { id: memory._id } });
      else router.push({ pathname: '/(tabs)/stories/[id]', params: { id: memory._id } });
    });
  }, [closeSheet, navigateAfterKeyboard]);

  const handleClear = useCallback(() => {
    Haptics.selectionAsync();
    setQuery('');
    setDebouncedQuery('');
    inputRef.current?.focus();
  }, []);

  const heading = showRecent
    ? 'Recently opened'
    : `Memories · ${results.length} ${results.length === 1 ? 'result' : 'results'}`;
  const status = showRecent ? null : searchStatusText({ isSearching, failed: searchError, search: data?.search });

  return (
    <BottomSheetView style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.field, focused && styles.fieldFocused]}>
          <Search size={16} color={COLORS.textWeak} />
          <BottomSheetTextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Describe a memory, or search its words…"
            placeholderTextColor={COLORS.textMuted}
            maxLength={200}
            autoFocus
            returnKeyType="search"
            autoCorrect={false}
            textContentType="none"
            autoComplete="off"
            accessibilityLabel="Search memories"
            selectionColor={COLORS.brand}
            cursorColor={COLORS.brand}
            style={[TYPE.input, styles.input]}
          />
          {isSearching ? (
            <ActivityIndicator size="small" color={COLORS.textWeak} />
          ) : query ? (
            <TouchableOpacity onPress={handleClear} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search" style={styles.clear}>
              <X size={14} color={COLORS.textWeak} strokeWidth={1.75} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {status ? (
        <Text accessibilityLiveRegion="polite" style={[TYPE.bodySmall, styles.status]}>{status}</Text>
      ) : null}
      {searchError ? (
        <View style={styles.retry}>
          <Button variant="outline" onPress={() => { void refetch(); }} disabled={isSearching}>Retry search</Button>
        </View>
      ) : null}

      <BottomSheetScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {showEmpty ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Search size={32} color={COLORS.textWeak} />
            </View>
            <Text style={[TYPE.button, styles.emptyTitle]}>
              {showRecent ? 'No recent memories' : data?.search?.mode === 'keyword' ? 'No word matches' : 'No memories found'}
            </Text>
            <Text style={[TYPE.bodySmall, styles.emptyBody]}>
              {showRecent ? 'Your recently opened memories will appear here.' : 'Try a different description, name, or word.'}
            </Text>
          </View>
        ) : visible.length > 0 ? (
          <View>
            <Text style={[TYPE.eyebrow, styles.groupHeading]}>{heading.toUpperCase()}</Text>
            <View style={styles.rows}>
              {visible.map((memory) => (
                <SearchRow key={memory._id} memory={memory} term={term} onSelect={handleSelect} />
              ))}
            </View>
          </View>
        ) : null}
      </BottomSheetScrollView>
    </BottomSheetView>
  );
}

const createStyles = (COLORS: ThemeColors) => StyleSheet.create({
  container: { flex: 1 },
  // Web: border-b, px-3 py-4.
  header: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.strokeWeak,
  },
  // Web CommandInput: h-11, 8px radius. Inputs never use pill corners.
  field: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: INPUT_RADIUS,
    borderWidth: 1,
    borderColor: COLORS.strokeWeaker,
    backgroundColor: COLORS.fillWeaker,
  },
  fieldFocused: { borderColor: COLORS.brand },
  input: {
    flex: 1,
    color: COLORS.textStrong,
    padding: 0,
    margin: 0,
  },
  clear: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  status: { color: COLORS.textWeak, paddingHorizontal: 24, paddingTop: 12 },
  retry: { paddingHorizontal: 24, paddingVertical: 16 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 24 },
  groupHeading: {
    color: COLORS.textWeak,
    letterSpacing: 0.6,
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 8,
  },
  rows: { gap: 12 },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  picture: { width: 44, height: 44, borderRadius: 8, backgroundColor: COLORS.fillWeak },
  rowWords: { flex: 1, minWidth: 0, gap: 2 },
  rowTitle: { color: COLORS.textStrong },
  rowBody: { color: COLORS.textWeak },
  mark: { backgroundColor: COLORS.brandTint, color: COLORS.textStrong },
  rowDate: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  rowDateText: { color: COLORS.textMuted },
  empty: { minHeight: 256, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyIcon: { marginBottom: 12, padding: 12, borderRadius: 999, backgroundColor: COLORS.fillWeaker },
  emptyTitle: { color: COLORS.textStrong, marginBottom: 8, textAlign: 'center' },
  emptyBody: { color: COLORS.textWeak, maxWidth: 280, textAlign: 'center' },
});
