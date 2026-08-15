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
    expect(screen).toContain('Invite new Beneficiary');
    expect(screen).toContain('Create New Group');
    expect(screen).toContain("openSheet('add-beneficiary')");
    expect(screen).toContain("openSheet('create-group'");
  });

  test('opens beneficiary actions and edits groups through shared sheets', () => {
    expect(screen).toContain("openSheet('beneficiary-actions'");
    expect(screen).toContain("editData: group");
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

  test('uses the functional reference invite sheet with a fixed footer', () => {
    expect(manager).toContain("'add-beneficiary': { component: AddBeneficiarySheet, snapPoints: ['92%']");
    expect(manager).toContain("'create-memory', 'create-group', 'add-beneficiary'");
    expect(addBeneficiarySheet).toContain('ImagePicker.launchImageLibraryAsync');
    expect(addBeneficiarySheet).toContain('useGroups()');
    expect(addBeneficiarySheet).toContain('buildBeneficiaryInvitePayload');
    expect(addBeneficiarySheet).toContain('BottomSheetScrollView');
    expect(addBeneficiarySheet).toContain('{footer}');
  });
});
