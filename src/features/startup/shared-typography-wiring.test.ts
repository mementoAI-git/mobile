import {describe, expect, test} from 'bun:test';
import {readFileSync} from 'node:fs';

const files = [
  'src/components/ui/Button.tsx',
  'src/components/ui/TextInput.tsx',
  'src/components/ui/DashboardHeader.tsx',
  'src/components/ui/Badge.tsx',
  'src/components/ui/EmptyState.tsx',
  'src/components/ui/Select.tsx',
  'src/components/ui/Tabs.tsx',
  'src/components/ui/MemTag.tsx',
  'src/components/ui/Toast.tsx',
  'src/components/ui/OfflineNotice.tsx',
  'src/components/ui/PermissionRecoveryState.tsx',
  'src/components/ui/RecordingStatus.tsx',
  'src/components/ui/StatCard.tsx',
  'src/components/ui/LinkPreview.tsx',
  'src/components/ui/EditorActionBar.tsx',
  'src/components/ui/MediaPickerMenu.tsx',
  'src/components/ui/ConfirmDialog.tsx',
  'src/components/ui/Avatar.tsx',
  'src/components/ui/Logo.tsx',
  'src/components/TabBar.tsx',
];

describe('shared component typography wiring', () => {
  test.each(files)('%s uses the global typography authority', (file) => {
    const source = readFileSync(file, 'utf8');
    expect(source).toContain("@/constants/typography");
    expect(source).not.toMatch(/fontWeight\s*:/);
  });

  test('core primitives own their semantic roles', () => {
    expect(readFileSync('src/components/ui/Button.tsx', 'utf8')).toMatch(/TYPE\.(?:button|buttonSmall)/);
    expect(readFileSync('src/components/ui/TextInput.tsx', 'utf8')).toContain('TYPE.input');
    expect(readFileSync('src/components/ui/DashboardHeader.tsx', 'utf8')).toContain('TYPE.screenTitle');
    const empty = readFileSync('src/components/ui/EmptyState.tsx', 'utf8');
    expect(empty).toContain('TYPE.cardTitle');
    expect(empty).toContain('TYPE.bodySmall');
    expect(readFileSync('src/components/TabBar.tsx', 'utf8')).toMatch(/TYPE\.(?:label|metadata)/);
  });
});
