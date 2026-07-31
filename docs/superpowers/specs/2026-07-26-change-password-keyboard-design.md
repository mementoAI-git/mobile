# Change Password Keyboard Design

## Goal

Keep the focused Change Password field fully visible while the software
keyboard is open, especially on Android.

## Design

- Use `BottomSheetTextInput` for every Change Password input.
- Allow the shared `PasswordInput` to receive a custom native input component.
- Configure Change Password with `keyboardBehavior="interactive"`,
  `keyboardBlurBehavior="restore"`, and Android `adjustResize`.
- Remove the nested `KeyboardAvoidingView` so React Native and Gorhom do not
  apply competing keyboard offsets.
- Limit this experiment to Change Password.

## Verification

A focused regression test verifies the input components and modal keyboard
configuration. The full project verification suite must remain green.

