# Memory Audience Release Smoke Test

Use this checklist against the deployed API on both iOS and Android before merging. Inspect the outgoing request and returned memory; do not infer success from the label alone.

## Setup

1. Sign in as an owner with one active beneficiary and one group.
2. Keep a second session for the beneficiary and an unaffiliated session for public-access checks.
3. Enable the development network inspector or API request logging without recording auth tokens or signed file URLs.
4. Prepare one existing Private story, one Everyone story, and one story shared with the beneficiary and group.

## Canonical requests

```json
{"visibility":"private","beneficiaries":[],"groups":[]}
{"visibility":"everyone","beneficiaries":[],"groups":[]}
{"visibility":"private","beneficiaries":["b1"],"groups":["g1"]}
```

Private and Everyone must clear both recipient arrays. Specific must stay API-private and contain at least one real identifier.

## Platform matrix

Record `PASS`, `FAIL`, or `BLOCKED` plus device/build/API evidence.

| Platform | Network | Operation | Transition | Expected request | Result | Evidence |
|---|---|---|---|---|---|---|
| iOS | online | create | default → Private | Private canonical request | NOT RUN | |
| iOS | online | create | Private → Everyone | Everyone canonical request | NOT RUN | |
| iOS | online | create | Everyone → Specific | Specific canonical request | NOT RUN | |
| iOS | online | edit | Everyone → Private | Private canonical request | NOT RUN | |
| iOS | online | edit | Specific → Everyone | Everyone canonical request | NOT RUN | |
| iOS | offline → replay | create | default → Private | replay preserves Private request | NOT RUN | |
| iOS | offline → replay | edit | Private → Specific | replay preserves Specific request | NOT RUN | |
| Android | online | create | default → Private | Private canonical request | NOT RUN | |
| Android | online | create | Private → Everyone | Everyone canonical request | NOT RUN | |
| Android | online | create | Everyone → Specific | Specific canonical request | NOT RUN | |
| Android | online | edit | Everyone → Private | Private canonical request | NOT RUN | |
| Android | online | edit | Specific → Everyone | Everyone canonical request | NOT RUN | |
| Android | offline → replay | create | default → Private | replay preserves Private request | NOT RUN | |
| Android | offline → replay | edit | Private → Specific | replay preserves Specific request | NOT RUN | |

Repeat any missing transition on either platform: `specific → private`, `everyone → specific`, and `specific → everyone`.

## Privacy-sheet behavior

Run on both platforms.

| Case | Expected | iOS | Android |
|---|---|---|---|
| X | closes and discards draft selection | NOT RUN | NOT RUN |
| Dismiss | closes and discards draft selection | NOT RUN | NOT RUN |
| Backdrop | closes and discards draft selection | NOT RUN | NOT RUN |
| Swipe down | closes and discards draft selection | NOT RUN | NOT RUN |
| Apply Private | commits Private and clears recipients | NOT RUN | NOT RUN |
| Apply Everyone | commits Everyone and clears recipients | NOT RUN | NOT RUN |
| Specific with none selected | Apply remains disabled | NOT RUN | NOT RUN |
| Loading | shows trusted-people loading copy | NOT RUN | NOT RUN |
| Query error | keeps Private and Everyone usable | NOT RUN | NOT RUN |
| Empty account | shows warm Settings guidance | NOT RUN | NOT RUN |
| One person | selects, applies, and persists the real ID | NOT RUN | NOT RUN |
| One group | selects, applies, and persists the real ID | NOT RUN | NOT RUN |
| Mixed | persists both arrays without duplicates | NOT RUN | NOT RUN |
| Search | filters real names/emails/groups only | NOT RUN | NOT RUN |

## Access verification

For every saved story, refresh from the API and verify:

- Owner can read Private, Everyone, and Specific stories.
- Unaffiliated session cannot read Private or Specific stories.
- Selected beneficiary/group member can read only the Specific stories shared with them.
- Everyone story follows the deployed public-access policy.
- Editing Everyone → Private revokes prior public access.
- Editing Specific → Private/Everyone removes stale beneficiary and group IDs.
- Quick Capture requests always contain `"visibility":"private"` and expose no audience picker.

## Automated evidence

Fill this immediately before review:

| Check | Result | Evidence |
|---|---|---|
| `bun run verify` | PASS | 2026-09-07: lint, TypeScript, 322 tests/0 failures, production readiness |
| `bun run doctor` | PASS | 2026-09-07: 21/21 checks after SDK 57 patch alignment |
| invented-recipient scan | PASS | 2026-09-07: no production-source matches |
| `git diff --check` | PASS | 2026-09-07: no whitespace errors |
