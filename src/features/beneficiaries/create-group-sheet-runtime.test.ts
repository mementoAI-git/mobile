import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const createGroupSheet = readFileSync('src/components/sheets/CreateGroupSheet.tsx', 'utf8');
const groupMutations = readFileSync('src/hooks/mutations/use-group-mutations.ts', 'utf8');
const manager = readFileSync('src/components/sheets/SheetManager.tsx', 'utf8');

describe('create group sheet runtime safety', () => {
  test('avoids the shared UI barrel and dynamic require calls inside the sheet', () => {
    expect(createGroupSheet).toContain("from '@/components/ui/Button'");
    expect(createGroupSheet).not.toContain("from '@/components/ui';");
    expect(createGroupSheet).not.toContain("require('@/api/mutations')");
    expect(createGroupSheet).not.toContain("require('@/api/endpoint')");
  });

  test('uses the imperative toast singleton instead of a render-time toast hook', () => {
    expect(createGroupSheet).toContain("import { toast } from '@/components/ui/Toast';");
    expect(createGroupSheet).not.toContain('useToast(');
    expect(groupMutations).toContain("import { toast } from '@/components/ui/Toast';");
    expect(groupMutations).not.toContain('useToast(');
  });

  test('uses the 78 percent reference sheet with a fixed footer', () => {
    expect(manager).toContain("'create-group': { component: CreateGroupSheet, snapPoints: ['78%']");
    expect(createGroupSheet).toContain('BottomSheetScrollView');
    expect(createGroupSheet).toContain('{footer}');
  });

  test('uses Group copy and the functional persisted colour palette without member selection', () => {
    expect(createGroupSheet).toContain('GROUP_COLOR_PALETTE');
    expect(createGroupSheet).toContain('buildGroupPayload');
    expect(createGroupSheet).toContain('Create group');
    expect(createGroupSheet).not.toContain('Select Members');
    expect(createGroupSheet).not.toContain('useBeneficiaries');
    expect(createGroupSheet).not.toContain('Create Circle');
  });
});
