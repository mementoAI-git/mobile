# Change Password Keyboard Implementation Plan

> **For agentic workers:** Execute inline with test-first development.

**Goal:** Resize Change Password around the keyboard and keep its focused input visible.

**Architecture:** Let Gorhom own sheet keyboard movement by registering every
field through `BottomSheetTextInput`. Configure Android resize behavior at the
shared modal boundary and remove the redundant native keyboard-avoiding wrapper.

**Tech Stack:** React Native, Expo, `@gorhom/bottom-sheet`, Bun tests.

## Constraints

- Apply only to Change Password.
- Preserve its existing form, validation, actions, and snap point.
- Keep all changes local and uncommitted.

### Task 1: Add keyboard-aware Change Password inputs

- [ ] Add a failing source regression test.
- [ ] Extend `PasswordInput` with an `InputComponent` prop.
- [ ] Use `BottomSheetTextInput` for all Change Password fields.
- [ ] Configure interactive, restore, and Android resize behavior.
- [ ] Remove `KeyboardAvoidingView` from Change Password.
- [ ] Run focused tests, typecheck, full verification, and `git diff --check`.

