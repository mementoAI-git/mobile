# Privacy Settings Design

## Goal

Replace the current privacy dashboard with the supplied transparency and privacy-management screen.

## Behavior

- Settings → Privacy continues to open `/settings/privacy`.
- Privacy Policy and Terms are inline links backed by `PRIVACY_URL` and `TERMS_URL`.
- “Export your information” and “Share stories” remain disabled and display “Coming soon.”
- “Delete account” opens a styled shared confirmation sheet.
- Confirming calls the existing account deletion mutation, which clears auth, user, and query state on success.

## UI

Use the supplied hierarchy and Memento tokens: centered serif title, warm background and texture, protection card, privacy-settings card, tokenized success and error colors, rounded controls, and 44px minimum tap targets.

## Testing

Add a source-contract test for legal links, disabled future actions, and sheet-based deletion. Run the focused test, TypeScript, lint, full verification, and diff checks.

