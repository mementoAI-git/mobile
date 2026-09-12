# Tier-aware billing release checklist

## Rollout order

1. Deploy API branch `codex/tier-aware-billing` first.
2. Confirm `GET /billing/profile` returns only email, name, address, redacted payment methods, and `management`.
3. Confirm `PATCH /billing/profile` updates a paid Polar customer and creates a Polar customer for a free user without one.
4. Confirm neither API responses nor logs contain card numbers, CVV values, provider secrets, or raw provider metadata.
5. Release mobile branch `codex/memory-audience-contract` after the API smoke checks pass.

## Native visual verification

Use the supplied 393-point iPhone references and one compact Android viewport.

- Overview: header, tabs, plan banner, storage, billing details, and payment rows align with the reference.
- Invoices: active label reads `Invoices`; rows show plan, status, localized date, and minor-unit amount converted to display currency.
- Edit Billing Details: sheet height, handle, close control, fields, and fixed footer match the reference; Save persists and refreshes the profile.
- Add Payment Method: sheet anatomy matches the reference; no raw payment input is accepted by Memento; paid users continue to Polar's portal and free users continue to checkout.
- Verify Dismiss/X, tab changes, Edit, Add new, payment edit, Save Changes, invoice links, and hosted handoff all provide haptic feedback.

## Automated evidence

- Mobile: lint, TypeScript, production readiness, and 335 tests pass; Expo Doctor passes 21/21.
- API: lint and TypeScript pass; 47 test files and 230 tests pass; OpenAPI artifacts are current.

## Known test-environment limitation

The Expo web preview currently fails before route rendering because of existing NativeWind color-scheme and Expo SecureStore web-runtime errors. Complete the final pixel comparison in the native development build; this does not affect the billing implementation's mobile compile or test gates.
