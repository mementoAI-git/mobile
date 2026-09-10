import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { decodeHtmlEntities, parseStoryHtmlBlocks, type StoryHtmlBlock } from '@/features/memories/story-html';

function renderInlineHtml(html: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let remaining = html;
  let index = 0;

  const tokenRegex = /<(strong|b|em|i|s|strike|u|a)([^>]*)>([\s\S]*?)<\/\1>|<br\s*\/?>/i;

  while (remaining.length > 0) {
    const match = remaining.match(tokenRegex);

    if (!match || match.index === undefined) {
      const text = decodeHtmlEntities(remaining);
      if (text) nodes.push(text);
      break;
    }

    const startIndex = match.index;
    if (startIndex > 0) {
      const textBefore = decodeHtmlEntities(remaining.slice(0, startIndex));
      if (textBefore) nodes.push(textBefore);
    }

    const full = match[0];
    if (/^<br/i.test(full)) {
      nodes.push('\n');
    } else {
      const tag = (match[1] ?? '').toLowerCase();
      const attributes = match[2] ?? '';
      const href = attributes.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
      const inner = match[3] ?? '';
      const childStyle = [styles.inlineBase, inlineStyles[tag as keyof typeof inlineStyles] ?? null];
      const child = renderInlineHtml(inner, `${keyPrefix}-${index}`);

      nodes.push(
        <Text
          key={`${keyPrefix}-${index}`}
          style={childStyle}
          onPress={tag === 'a' && href ? () => Linking.openURL(href).catch(() => {}) : undefined}
        >
          {child}
        </Text>,
      );
    }

    remaining = remaining.slice(startIndex + full.length);
    index += 1;
  }

  return nodes;
}

function renderBlock(block: StoryHtmlBlock, index: number) {
  switch (block.type) {
    case 'h1':
      return (
        <Text key={`h1-${index}`} style={styles.h1}>
          {renderInlineHtml(block.html, `h1-${index}`)}
        </Text>
      );
    case 'h2':
      return (
        <Text key={`h2-${index}`} style={styles.h2}>
          {renderInlineHtml(block.html, `h2-${index}`)}
        </Text>
      );
    case 'blockquote':
      return (
        <View key={`quote-${index}`} style={styles.blockquoteWrap}>
          <Text style={styles.blockquoteText}>
            {renderInlineHtml(block.html, `quote-${index}`)}
          </Text>
        </View>
      );
    case 'ul':
    case 'ol':
      return (
        <View key={`${block.type}-${index}`} style={styles.listWrap}>
          {block.items.map((item, itemIndex) => (
            <View key={`${block.type}-${index}-${itemIndex}`} style={styles.listRow}>
              <Text style={styles.listMarker}>{block.type === 'ol' ? `${itemIndex + 1}.` : '•'}</Text>
              <Text style={styles.paragraph}>
                {renderInlineHtml(item, `${block.type}-${index}-${itemIndex}`)}
              </Text>
            </View>
          ))}
        </View>
      );
    case 'paragraph':
    default:
      return (
        <Text key={`p-${index}`} style={styles.paragraph}>
          {renderInlineHtml(block.html, `p-${index}`)}
        </Text>
      );
  }
}

export function StoryHtmlBody({ html }: { html?: string | null }) {
  const blocks = React.useMemo(() => parseStoryHtmlBlocks(html), [html]);

  if (blocks.length === 0) return null;

  return <View>{blocks.map(renderBlock)}</View>;
}

const inlineStyles = {
  strong: {...TYPE.bodyStrong, color: COLORS.textStrong},
  b: {...TYPE.bodyStrong, color: COLORS.textStrong},
  em: { fontStyle: 'italic' as const },
  i: { fontStyle: 'italic' as const },
  s: { textDecorationLine: 'line-through' as const },
  strike: { textDecorationLine: 'line-through' as const },
  u: { textDecorationLine: 'underline' as const },
  a: { color: COLORS.brand, textDecorationLine: 'underline' as const },
};

const styles = StyleSheet.create({
  inlineBase: {
    ...TYPE.bodyLarge,
    color: COLORS.textStrong,
  },
  paragraph: {
    ...TYPE.bodyLarge,
    color: COLORS.textStrong,
    marginBottom: 14,
  },
  h1: {
    ...TYPE.screenTitle,
    color: COLORS.textStrong,
    marginBottom: 14,
  },
  h2: {
    ...TYPE.sectionTitle,
    color: COLORS.textStrong,
    marginBottom: 14,
  },
  blockquoteWrap: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.brand,
    paddingLeft: 12,
    marginBottom: 14,
  },
  blockquoteText: {
    ...TYPE.bodyLarge,
    color: COLORS.textWeak,
    fontStyle: 'italic',
  },
  listWrap: {
    marginBottom: 14,
    gap: 8,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  listMarker: {
    width: 18,
    ...TYPE.bodyStrong,
    color: COLORS.textStrong,
  },
});
