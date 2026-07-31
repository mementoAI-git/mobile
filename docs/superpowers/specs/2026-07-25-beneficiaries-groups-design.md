# Beneficiaries and Groups Settings Design

## Goal

Replace the current beneficiaries-only settings screen with the supplied People/Groups experience while preserving the existing beneficiary invitation, group management, and API infrastructure.

## Navigation and states

- Settings → Beneficiaries opens `/settings/beneficiaries`.
- The screen owns a local `people | groups` tab selection and shows live collection counts.
- Each tab has loading, empty, error, and populated states.
- People:
  - Empty CTA and footer CTA open the existing `add-beneficiary` sheet.
  - A person row opens a beneficiary actions sheet.
  - Pending invitations can be resent and any beneficiary can be removed after confirmation.
- Groups:
  - Empty CTA and footer CTA open the existing `create-group` sheet.
  - A group row opens the existing `create-group` sheet with `editData`.
  - The edit sheet continues to support editing group details and members.

## Architecture

Normalize array, paginated, and wrapped API responses in a small beneficiary feature helper so both queries render reliably. Keep data access in the existing query and mutation hooks. Build reusable list and empty-state components under `src/components/beneficiaries`, and use the global SheetManager for actions instead of local modals.

## Visual behavior

Follow the supplied references while using Memento tokens: warm background, centered serif screen title, rounded tab controls and cards, tokenized text, 44px minimum touch targets, and brand-orange primary actions. Reuse Avatar, Button, Spinner/Skeleton, and existing icon assets.

## Error handling

Query failures show an inline warm retry state. Mutations preserve the sheet on failure and use the existing toast system. Destructive beneficiary removal uses a styled shared-sheet confirmation, never a native Alert.

## Testing

Add source-contract tests for route/tab wiring and sheets, plus unit tests for response normalization and group-member extraction. Run focused tests first, then the full `bun run verify` suite.

