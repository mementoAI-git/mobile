# Task 1 report: registration and OTP policies

## Files changed

- `src/features/auth/registration-policy.test.ts`
- `src/features/auth/registration-policy.ts`
- `src/features/auth/email-verification.test.ts`
- `src/features/auth/email-verification.ts`

The password policy requires at least eight characters, an ASCII number, an uppercase letter, and a symbol, returning the exact brief-specified message for invalid values. OTP normalization keeps ASCII digits, strips noise, and truncates to six digits; completeness requires exactly six ASCII digits; resend cooldown uses a 30-second default and returns remaining seconds rounded up.

## RED evidence

- `bun test src/features/auth/registration-policy.test.ts` failed as expected with `Cannot find module './registration-policy'`; 0 pass, 1 fail, 1 error.
- `bun test src/features/auth/email-verification.test.ts` failed as expected with `Cannot find module './email-verification'`; 0 pass, 1 fail, 1 error.

## GREEN evidence

- `bun test src/features/auth/registration-policy.test.ts src/features/auth/email-verification.test.ts`: 11 pass, 0 fail, 19 expect() calls.
- `bun run typecheck`: passed with exit code 0.
- `bun run lint`: passed with exit code 0.
- Commit hook `bun run verify`: all checks passed, including 480 tests across 128 files and production readiness checks.

## Commit

`6d32673e4cc2e4e106eec58f62222413dcf1e3f2` — `feat(auth): define registration and otp policies`

## Self-review

- Implementation is pure and has no UI, network, or state dependencies.
- Unicode digits are intentionally rejected because normalization and completeness use ASCII digit matching.
- Cooldown values are clamped at zero and use ceiling rounding so partial seconds remain visible.
- Tests cover the specified password examples, exact validation message, OTP noise stripping, Unicode rejection, truncation, completeness, null/expired cooldown, and the specified 30-second example.

## Concerns

None.
