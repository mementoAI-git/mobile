import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const account = readFileSync('app/account.tsx', 'utf8');
const actions = readFileSync('src/components/account/QuickActions.tsx', 'utf8');
const manager = readFileSync('src/components/sheets/SheetManager.tsx', 'utf8');

test('account page carries the Quick tools actions plus Insights', () => {
  expect(actions).toContain('Quick actions');
  for (const label of ['Quick note', 'Add people', 'Insights']) expect(actions).toContain(`label="${label}"`);
  for (const icon of ['quick-note.png', 'add-people.png', 'insights.png']) expect(actions).toContain(icon);
  expect(account).toContain("openSheet('quick-capture')");
  expect(account).toContain("openSheet('add-beneficiary')");
  expect(account).toContain('onInsights={openInsights}');
  expect(account).not.toContain('View insights');
});

test('keeps the web action-card geometry and grid texture', () => {
  expect(actions).toContain('height: 85, padding: 12');
  expect(actions).toContain("borderRadius: 14, overflow: 'hidden'");
  expect(actions).toContain('width={32} height={32} patternUnits="userSpaceOnUse"');
  expect(actions).toContain('stroke={colors.strokeWeaker}');
});

test('retires the Quick tools sheet', () => {
  expect(manager).not.toContain('QuickToolsSheet');
});
