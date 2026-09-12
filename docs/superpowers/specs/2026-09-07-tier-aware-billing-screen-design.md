# Tier-Aware Billing Screen Design

**Date:** 2026-09-07  
**Status:** Approved for implementation planning  
**Repositories:** `mobile`, `api`

## Goal

Replace the current mobile billing settings presentation with the supplied Billing design while preserving the existing Polar checkout, portal, subscription, invoice, and storage-quota behavior. The two supplied references describe one screen whose data and actions vary by subscription tier; they are not separate screens.

The implementation must be backward compatible while the API and mobile releases roll out independently. It must never expose full payment credentials or make Memento responsible for processing card updates.

## User Experience

The screen has a centered Billing header, a safe back button, and two tabs: Overview and Recent invoices.

Overview contains:

1. A tier-aware plan banner.
2. A server-derived storage card.
3. Billing details.
4. Redacted payment-method summaries.

Recent invoices contains the existing Polar invoice data in the same visual language.

### Tier behavior

| Tier | Banner | Storage | Billing details and payment methods |
|---|---|---|---|
| Free | “Unlock more with Pro” and Upgrade | API quota, normally 200 MB | Real data when a Polar customer exists; otherwise an honest empty state |
| Pro | Pro plan/status and Manage plan | API quota, normally 10 GB | Real Polar-backed data with portal management actions |
| Legacy | Legacy plan/status and Manage plan | API-provided allowance | Real Polar-backed data with portal management actions |

Storage figures always come from `/billing/usage`. Mobile fallback limits remain compatibility safeguards only and must not override a non-zero server limit.

## Visual Structure

- Full-screen background uses `COLORS.background`.
- Header follows the reference geometry: circular back control and visually centered title.
- Tabs use a compact rounded segmented treatment; inactive and selected states use semantic warm tokens.
- The plan banner uses the approved information-blue token family and a translucent action pill.
- The storage surface is a rounded neutral fill with used/limit, progress, and available values.
- Billing details and payment methods are separated by subtle full-width dividers.
- All interactive controls have at least a 44-point target, selection or impact haptics, and accessible labels.
- Loading uses layout-preserving skeletons. Errors retain usable cached/fallback content and offer refresh where appropriate.

The reference fixture is used for component development and visual tests only. Production UI labels static fixture values as preview data if the compatibility fallback is deliberately enabled; it must not silently present sample addresses or cards as the signed-in user’s real data.

## Mobile Architecture

### Data contract

Add a billing-profile adapter with the following normalized model:

```ts
interface BillingProfile {
  email: string | null;
  name: string | null;
  address: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  } | null;
  paymentMethods: Array<{
    id: string;
    brand: string;
    last4: string;
    isDefault: boolean;
  }>;
  management: 'polar_portal';
}
```

Add `endpoint.billingProfile` and `useBillingProfile`. `useBillingSettingsLogic` remains the orchestration boundary and exposes tab state, refresh, profile data, invoices, storage, upgrade, and portal actions.

### Compatibility behavior

The client recognizes three profile states:

- `live`: normalized `/billing/profile` response.
- `fixture`: typed design fixture enabled only by an explicit development/preview flag.
- `unavailable`: no profile endpoint or customer data; render honest empty fields and portal/upgrade actions.

An older API returning 404 must not crash the screen. It becomes `unavailable`, while subscription, storage, invoices, checkout, and portal continue working. No production fallback may impersonate real billing information.

### Components

Split the screen into focused presentational components:

- `BillingTabs`
- `BillingPlanBanner`
- `BillingStorageCard`
- `BillingDetailsSection`
- `BillingPaymentMethodsSection`
- `BillingInvoicesPanel`

The screen owns composition and scrolling. Components receive normalized data and callbacks only; they do not fetch or mutate.

## API Architecture

Add authenticated `GET /billing/profile`.

The billing service resolves the user’s Polar customer by Memento user ID (`external_id`) and returns only display-safe fields:

- billing email
- billing name
- postal address
- card brand
- card last four digits
- default flag

If no Polar customer exists, return a successful response containing the user’s account email/name, `address: null`, and an empty `payment_methods` array. This keeps free-tier rendering deterministic without treating absence as an error.

Provider calls stay isolated in `billing/providers/polar.ts`. The controller and public API do not expose Polar’s raw payload, customer-session token, payment-method identifier unless it is an opaque action identifier, or processor metadata.

### Payment management

Edit billing details, Add new, and payment-method edit actions call the existing `/billing/portal` flow. Polar’s hosted portal remains responsible for changing payment methods, preserving PCI boundaries. Mobile refreshes billing profile, subscription, invoices, and usage after the browser returns.

## Data Flow

1. Mobile loads subscription, usage, and billing profile for Overview.
2. Invoice loading is enabled when Recent invoices is selected or when existing prefetch policy requests it.
3. Upgrade opens the existing Memento pricing route, which launches Polar checkout.
4. Manage/Edit/Add actions request a pre-authenticated Polar portal URL from the API.
5. On returning to the app, billing queries are invalidated and refetched.
6. The UI re-renders from normalized server data without changing its component structure.

## Error Handling

- Billing profile 404 from an older API is treated as capability unavailable, not as a fatal error.
- Polar 404 for a missing customer returns the account-derived empty profile.
- Polar authentication/configuration errors use the existing API error envelope and are logged without secrets.
- Portal creation failures use the existing warm toast copy.
- Malformed payment methods are discarded by adapters rather than rendered.
- Storage and invoices remain independently usable if the profile request fails.

## Security and Privacy

- Never return or store PAN, CVC, expiry secrets, customer-session tokens, or processor payloads.
- Only authenticated users can request their own billing profile and portal session.
- Redacted method data is limited to brand, last four digits, and default status.
- Address data is transmitted only to the authenticated owner and is not logged.
- All payment mutations remain hosted by Polar.

## Testing

### API

- Provider parsing tests for customer details and redacted payment methods.
- Service tests for paid customer, free user without a Polar customer, malformed provider data, and provider failure.
- Controller/route/OpenAPI contract tests for authentication and response shape.
- Regression tests for existing checkout, portal, invoice, subscription, and usage endpoints.

### Mobile

- Adapter tests for canonical, nested, missing, and malformed profile responses.
- Tier presentation tests for free, Pro, and Legacy.
- Storage presentation tests retain server-authoritative limits.
- Interaction tests verify Upgrade, portal-backed Edit/Add/Edit-card, tabs, safe back, refresh, and haptics.
- Screen consistency tests ensure no raw API access is introduced in the screen.
- Visual verification at the reference iPhone viewport, plus a compact iPhone and Android viewport.
- Full `bun run verify` and Expo Doctor before completion.

## Release Sequence

1. Deploy the additive API endpoint and documentation.
2. Verify it against Polar sandbox and users with and without customers.
3. Release mobile with the backward-compatible 404 behavior.
4. Confirm production telemetry and portal return refresh.
5. Keep the fixture preview behind an explicit development flag; never enable it for normal production sessions.

No existing endpoint or response field is removed or changed, so current web and mobile clients remain compatible.
