import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

test('Stories uses the simple empty state: icon, title and an inverse CTA', () => {
  const screen = readFileSync('app/(tabs)/stories/index.tsx', 'utf8');
  const empty = readFileSync('src/components/ui/EmptyState.tsx', 'utf8');
  expect(screen).not.toContain('EMPTY_MEMORIES_IMG');
  for (const title of ["'No matches found'", "'No bookmarks yet'", "'Nothing deleted'", "'Your story begins here'"]) expect(screen).toContain(title);
  expect(screen).toContain('icon={emptyCopy.icon}');
  expect(screen).toContain('actionTone="inverse"');
  expect(empty).toContain("actionTone === 'inverse' ? COLORS.activeFill");
  expect(empty).toContain("actionTone === 'inverse' ? COLORS.activeText");
});
