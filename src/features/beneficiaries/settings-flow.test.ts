// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const screen = readFileSync('app/settings/beneficiaries.tsx', 'utf8');
const manager = readFileSync('src/components/sheets/SheetManager.tsx', 'utf8');
const store = readFileSync('src/store/ui.store.ts', 'utf8');
const logic = readFileSync('src/hooks/use-beneficiaries-settings-logic.ts', 'utf8');
const beneficiaryMutations = readFileSync('src/hooks/mutations/use-beneficiary-mutations.ts', 'utf8');
const addBeneficiarySheet = readFileSync('src/components/sheets/AddBeneficiarySheet.tsx', 'utf8');

describe('Beneficiaries settings flow', () => {
  test('provides People and Groups tabs with empty and populated actions', () => {
    expect(screen).toContain("'people'");
    expect(screen).toContain("'groups'");
    expect(screen).toContain('Invite person');
    expect(screen).toContain('New group');
    expect(screen).toContain("openSheet('add-beneficiary')");
    expect(screen).toContain("openSheet('create-group'");
  });

  test('opens beneficiary actions and edits groups through shared sheets', () => {
    expect(screen).toContain("openSheet('beneficiary-actions'");
    expect(readFileSync('app/settings/group/[id].tsx', 'utf8')).toContain('editData: group');
    expect(store).toContain("| 'beneficiary-actions'");
    expect(manager).toContain("'beneficiary-actions'");
  });

  test('uses sheet confirmation instead of a native removal alert', () => {
    expect(logic).not.toContain("Alert.alert(");
    expect(logic).toContain("kind: 'remove-beneficiary'");
  });

  test('submits the shared expanded beneficiary invite contract', () => {
    expect(beneficiaryMutations).toContain('CreateBeneficiaryBody');
    expect(beneficiaryMutations).toContain('payload: CreateBeneficiaryBody');
  });

  test('invite sheet matches web Invite person: name, email, relationship and groups only', () => {
    expect(manager).toContain("'add-beneficiary': { component: AddBeneficiarySheet, snapPoints: ['92%']");
    expect(manager).toContain("'create-memory', 'create-group', 'add-beneficiary'");
    expect(addBeneficiarySheet).toContain('useGroups()');
    expect(addBeneficiarySheet).toContain('buildBeneficiaryInvitePayload');
    expect(addBeneficiarySheet).toContain('BottomSheetScrollView');
    expect(addBeneficiarySheet).toContain('Add to groups');
    expect(addBeneficiarySheet).toContain('Send invite');
    for (const removed of ['VAULT_ACCESS_OPTIONS', 'Vault access level', 'ImagePicker', 'About', 'Search group name']) {
      expect(addBeneficiarySheet).not.toContain(removed);
    }
  });

  test('primary sheet buttons use the brand fill, not a dark override', () => {
    for (const file of ['AddBeneficiarySheet', 'CreateGroupSheet', 'AddMemberToGroupSheet', 'SecurityConfirmationSheet']) {
      const source = readFileSync(`src/components/sheets/${file}.tsx`, 'utf8');
      expect(source).not.toContain('bg-fill-strong');
      expect(source).not.toContain('bg-media-surface');
    }
  });
});
