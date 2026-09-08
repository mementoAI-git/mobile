# Tier-Aware Billing Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the supplied Billing screen as one tier-aware mobile experience backed by a safe, additive Polar billing-profile API.

**Architecture:** Add an authenticated API facade that normalizes Polar customer details and redacted payment methods, then consume it through mobile adapters and React Query. Presentational mobile components render live, unavailable, or explicitly enabled fixture states without owning network behavior; all billing mutations continue through Polar checkout or its hosted portal.

**Tech Stack:** Express, TypeScript, Axios, Mongoose, Vitest, Expo Router, React Native, NativeWind, TanStack Query, Bun test, Polar API.

**Spec:** `docs/superpowers/specs/2026-09-07-tier-aware-billing-screen-design.md`

## Global Constraints

- The API change is additive; existing `/billing/*` request and response contracts must remain unchanged.
- Never return, store, or log PAN, CVC, expiry secrets, customer-session tokens, or raw processor payloads.
- Billing detail and payment-method mutations remain in Polar’s hosted portal.
- Storage limits remain server-authoritative; compatibility limits are 200 MB for Free and 10 GB for Pro.
- The fixture is available only when `EXPO_PUBLIC_BILLING_PREVIEW === '1'`; it cannot silently impersonate production data.
- Use `COLORS` tokens and the warm Memento design system; no arbitrary color hex values or generic Tailwind greys.
- All touch targets are at least 44 points and fire the required haptic feedback.
- Preserve Expo Router safe-back behavior and the existing shared billing orchestration boundary.

## Task 9: Tier-aware plan management and cancellation

- [x] Replace the legacy three-tier pricing page with the supplied Free/Pro Manage Plan states.
- [x] Keep monthly/annual selection and Polar-hosted checkout on the existing billing flow.
- [x] Route downgrade and cancel actions through one global confirmation bottom sheet.
- [x] Collect a structured cancellation reason before calling the existing cancellation endpoint.
- [x] Add optional, backwards-compatible cancellation feedback fields to the API subscription record.
- [ ] Run full mobile and API verification and complete native-device visual QA.

---

## File Map

### API repository (`/Users/dev/Workspace/memento/api`)

- `src/module/api/billing/providers/polar.ts`: fetch and normalize provider customer/profile data.
- `src/module/api/billing/service.ts`: build the public billing-profile response and account fallback.
- `src/module/api/billing/controller.ts`: authenticated profile controller.
- `src/module/api/billing/routes.ts`: additive `GET /profile` route.
- `src/docs/billing.docs.ts`: OpenAPI documentation.
- `test/billing/polar-provider.test.ts`: provider parsing and secret-redaction tests.
- `test/billing/billing-lifecycle.test.ts`: service behavior for customer/no-customer/failure cases.
- `test/contracts/openapi.contract.test.ts`: exported contract coverage.

### Mobile repository (`/Users/dev/Workspace/memento/mobile/.worktrees/memory-audience-contract`)

- `src/api/endpoint.ts`: `billingProfile` endpoint.
- `src/constants/query-keys.ts`: stable `billingProfile` query key.
- `src/features/settings/billing-adapters.ts`: normalized billing-profile types and parser.
- `src/features/settings/billing-fixture.ts`: typed reference fixture guarded by preview configuration.
- `src/features/settings/billing-presentation.ts`: tier/banner and formatted display derivation.
- `src/hooks/queries/use-billing.ts`: profile query with old-API compatibility.
- `src/hooks/use-billing-settings-logic.ts`: tabs, profile state, refresh, upgrade, and portal actions.
- `src/components/billing/*.tsx`: focused, memoized presentation components.
- `app/settings/billing.tsx`: reference-matching composition.
- `src/features/settings/*.test.ts`: adapter, presentation, interaction, and wiring tests.

---

### Task 1: Add the safe Polar billing-profile provider contract

**Files:**
- Modify: `/Users/dev/Workspace/memento/api/src/module/api/billing/providers/polar.ts`
- Test: `/Users/dev/Workspace/memento/api/test/billing/polar-provider.test.ts`

**Interfaces:**
- Produces: `getPolarBillingProfile(externalCustomerId: string): Promise<PolarBillingProfile | null>`
- Produces: `PolarBillingProfile` containing only `email`, `name`, `billingAddress`, and redacted `paymentMethods`.

- [ ] **Step 1: Write failing provider tests**

Add Axios-mocked cases proving the function resolves a customer by external ID, maps address fields, accepts only valid `brand`/`last4` values, marks the default method, returns `null` on customer 404, and never returns raw processor fields.

```ts
expect(await getPolarBillingProfile('user-1')).toEqual({
  email: 'owner@example.com',
  name: 'Owner Name',
  billingAddress: {
    line1: '25 Effiong Close',
    city: 'Uyo',
    postalCode: '520231',
    country: 'NG',
  },
  paymentMethods: [
    {id: 'pm_1', brand: 'mastercard', last4: '1312', isDefault: true},
  ],
});
expect(JSON.stringify(result)).not.toContain('client_secret');
```

- [ ] **Step 2: Run the targeted test and confirm RED**

Run: `yarn test test/billing/polar-provider.test.ts`

Expected: FAIL because `getPolarBillingProfile` is not exported.

- [ ] **Step 3: Implement the provider facade**

Define narrow provider types and request Polar’s customer-by-external-ID endpoint. Resolve display-safe payment data only where Polar’s response supplies it; discard entries whose `last4` is not exactly four digits.

```ts
export type PolarBillingProfile = {
  email: string | null;
  name: string | null;
  billingAddress: PolarBillingAddress | null;
  paymentMethods: Array<{
    id: string;
    brand: string;
    last4: string;
    isDefault: boolean;
  }>;
};

export async function getPolarBillingProfile(
  externalCustomerId: string,
): Promise<PolarBillingProfile | null>;
```

Treat Axios 404 as `null`; propagate configuration, authorization, timeout, and server errors through the existing error handling.

- [ ] **Step 4: Run provider tests and confirm GREEN**

Run: `yarn test test/billing/polar-provider.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the provider unit**

```bash
git add src/module/api/billing/providers/polar.ts test/billing/polar-provider.test.ts
git commit -m "feat(api): read redacted Polar billing profile"
```

---

### Task 2: Expose the additive authenticated API endpoint

**Files:**
- Modify: `/Users/dev/Workspace/memento/api/src/module/api/billing/service.ts`
- Modify: `/Users/dev/Workspace/memento/api/src/module/api/billing/controller.ts`
- Modify: `/Users/dev/Workspace/memento/api/src/module/api/billing/routes.ts`
- Modify: `/Users/dev/Workspace/memento/api/src/docs/billing.docs.ts`
- Test: `/Users/dev/Workspace/memento/api/test/billing/billing-lifecycle.test.ts`
- Test: `/Users/dev/Workspace/memento/api/test/contracts/openapi.contract.test.ts`

**Interfaces:**
- Consumes: `getPolarBillingProfile(externalCustomerId)` from Task 1.
- Produces: `GET /billing/profile` with snake-case transport shape.

- [ ] **Step 1: Write failing service and contract tests**

Cover a paid customer, a user without a Polar customer, missing optional address fields, authenticated routing, and the documented response schema.

```ts
expect(result.data).toEqual({
  email: 'owner@example.com',
  name: 'Owner Name',
  address: expect.objectContaining({postal_code: '520231'}),
  payment_methods: [
    {id: 'pm_1', brand: 'mastercard', last4: '1312', is_default: true},
  ],
  management: 'polar_portal',
});
```

For no Polar customer, assert account-derived identity, `address: null`, and `payment_methods: []`.

- [ ] **Step 2: Run the targeted tests and confirm RED**

Run: `yarn test test/billing/billing-lifecycle.test.ts test/contracts/openapi.contract.test.ts`

Expected: FAIL because the service and route do not exist.

- [ ] **Step 3: Implement service, controller, and route**

Add:

```ts
export async function getBillingProfile(userId: string) {
  const user = await User.findById(userId, {
    email: 1,
    first_name: 1,
    last_name: 1,
  }).lean();
  if (!user) throw new NotFoundException('User not found');
  const polar = await getPolarBillingProfile(userId);
  return {
    message: 'Billing profile fetched',
    data: mapBillingProfile(user, polar),
  };
}
```

Register `router.get('/profile', gaurd, ctrl.profile)` without modifying existing route semantics.

- [ ] **Step 4: Document the exact public schema**

Add `/billing/profile` to `billing.docs.ts`, including nullable address, redacted method fields, `management: polar_portal`, 200, 401, and 500 responses. Do not document raw Polar types.

- [ ] **Step 5: Run API checks and confirm GREEN**

Run: `yarn test test/billing/billing-lifecycle.test.ts test/contracts/openapi.contract.test.ts`

Run: `yarn compile`

Expected: all pass.

- [ ] **Step 6: Commit the API endpoint**

```bash
git add src/module/api/billing/service.ts src/module/api/billing/controller.ts src/module/api/billing/routes.ts src/docs/billing.docs.ts test/billing/billing-lifecycle.test.ts test/contracts/openapi.contract.test.ts
git commit -m "feat(api): expose billing profile summary"
```

---

### Task 3: Add mobile billing-profile adapters and preview fixture

**Files:**
- Modify: `src/api/endpoint.ts`
- Modify: `src/constants/query-keys.ts`
- Modify: `src/features/settings/billing-adapters.ts`
- Create: `src/features/settings/billing-fixture.ts`
- Modify: `src/features/settings/billing-adapters.test.ts`

**Interfaces:**
- Produces: `BillingProfile`, `BillingProfileSource`, and `normalizeBillingProfile(payload)`.
- Produces: `getBillingPreviewFixture(): BillingProfile | null`.

- [ ] **Step 1: Write failing adapter and fixture tests**

```ts
expect(normalizeBillingProfile({data: {
  email: 'owner@example.com',
  address: {postal_code: '520231'},
  payment_methods: [{id: 'pm_1', brand: 'mastercard', last4: '1312', is_default: true}],
  management: 'polar_portal',
}})).toMatchObject({
  address: {postalCode: '520231'},
  paymentMethods: [{last4: '1312', isDefault: true}],
});
```

Also assert malformed cards are discarded and the fixture is unavailable unless the preview flag is exactly `1`.

- [ ] **Step 2: Run tests and confirm RED**

Run: `bun test src/features/settings/billing-adapters.test.ts`

Expected: FAIL because the profile adapter and fixture do not exist.

- [ ] **Step 3: Implement normalized mobile types**

```ts
export interface BillingProfile {
  email: string | null;
  name: string | null;
  address: BillingAddress | null;
  paymentMethods: BillingPaymentMethod[];
  management: 'polar_portal';
}

export type BillingProfileSource = 'live' | 'fixture' | 'unavailable';
```

Normalize both canonical `{data: ...}` and one-layer legacy `{data: {data: ...}}` envelopes. Require a four-digit `last4`, a non-empty opaque ID, and a non-empty brand.

- [ ] **Step 4: Add the explicit preview fixture**

Use the reference values in a frozen typed object, returning it only from:

```ts
export function getBillingPreviewFixture(): BillingProfile | null {
  return process.env.EXPO_PUBLIC_BILLING_PREVIEW === '1'
    ? BILLING_PREVIEW_FIXTURE
    : null;
}
```

- [ ] **Step 5: Add endpoint and query key**

Add `billingProfile: '/billing/profile'` and `billingProfile: ['billing-profile'] as const`.

- [ ] **Step 6: Run tests and commit**

Run: `bun test src/features/settings/billing-adapters.test.ts`

Expected: PASS.

```bash
git add src/api/endpoint.ts src/constants/query-keys.ts src/features/settings/billing-adapters.ts src/features/settings/billing-fixture.ts src/features/settings/billing-adapters.test.ts
git commit -m "feat(mobile): add billing profile contract"
```

---

### Task 4: Integrate the profile query and tier presentation

**Files:**
- Modify: `src/hooks/queries/use-billing.ts`
- Create: `src/features/settings/billing-presentation.ts`
- Create: `src/features/settings/billing-presentation.test.ts`
- Modify: `src/hooks/use-billing-settings-logic.ts`
- Modify: `src/features/settings/billing-consistency.test.ts`

**Interfaces:**
- Produces: `useBillingProfile()` returning `{profile, source}` without throwing for an old-API 404.
- Produces: `getBillingTierPresentation(summary, storage)`.
- Extends `useBillingSettingsLogic()` with `activeTab`, `setActiveTab`, `profile`, `profileSource`, `handleUpgrade`, and portal-backed management callbacks.

- [ ] **Step 1: Write failing query/presentation/wiring tests**

Test Free, Pro, and Legacy banner copy; server-authoritative storage; 404-to-unavailable behavior; preview-fixture selection; invoice lazy enablement; and query invalidation after portal return.

```ts
expect(getBillingTierPresentation({tier: 'free'}, storage)).toMatchObject({
  title: 'Unlock more with Pro',
  actionLabel: 'Upgrade',
  action: 'upgrade',
});
expect(getBillingTierPresentation({tier: 'pro'}, storage)).toMatchObject({
  actionLabel: 'Manage plan',
  action: 'portal',
});
```

- [ ] **Step 2: Run tests and confirm RED**

Run: `bun test src/features/settings/billing-presentation.test.ts src/features/settings/billing-consistency.test.ts`

Expected: FAIL on missing presentation/query behavior.

- [ ] **Step 3: Implement the compatibility query**

Fetch `/billing/profile`, normalize valid responses, and classify a 404 as unavailable. Select the explicit preview fixture only when enabled. All other errors remain observable through query error state.

- [ ] **Step 4: Centralize screen behavior in the logic hook**

Use `useState<'overview' | 'invoices'>('overview')`. Enable invoices when the invoice tab is selected or the current compatibility policy requires them. `handleUpgrade` navigates to `/pricing`; Edit/Add/Edit-card call `handlePortal`. Refresh invalidates subscription, usage, profile, and invoices.

- [ ] **Step 5: Run tests and commit**

Run: `bun test src/features/settings/billing-presentation.test.ts src/features/settings/billing-consistency.test.ts`

Expected: PASS.

```bash
git add src/hooks/queries/use-billing.ts src/features/settings/billing-presentation.ts src/features/settings/billing-presentation.test.ts src/hooks/use-billing-settings-logic.ts src/features/settings/billing-consistency.test.ts
git commit -m "feat(mobile): orchestrate tier-aware billing data"
```

---

### Task 5: Build the reference billing components

**Files:**
- Create: `src/components/billing/BillingTabs.tsx`
- Create: `src/components/billing/BillingPlanBanner.tsx`
- Create: `src/components/billing/BillingStorageCard.tsx`
- Create: `src/components/billing/BillingDetailsSection.tsx`
- Create: `src/components/billing/BillingPaymentMethodsSection.tsx`
- Create: `src/components/billing/BillingInvoicesPanel.tsx`
- Create: `src/components/billing/index.ts`
- Create: `src/features/settings/billing-components.test.ts`

**Interfaces:**
- Consumes normalized values and callbacks from Task 4.
- Produces memoized visual components with no data fetching.

- [ ] **Step 1: Write failing component contract tests**

Assert component files use semantic tokens, `React.memo`, minimum 44-point controls, accessibility labels, haptic-owning callbacks supplied by the screen logic, and no direct calls to `get`, `post`, or Polar.

- [ ] **Step 2: Run tests and confirm RED**

Run: `bun test src/features/settings/billing-components.test.ts`

Expected: FAIL because the components do not exist.

- [ ] **Step 3: Implement header-adjacent tabs and plan banner**

Match the 786×2022 reference proportions responsively: 32-point horizontal page inset, 64-point segmented controls, 32-point banner radius, strong sans title, and information-blue gradient via `expo-linear-gradient`. The action uses a 44-point translucent pill.

- [ ] **Step 4: Implement storage presentation**

Render `used / limit Used`, a rounded progress track, available storage, and warning copy only when derived by `getStoragePresentation`. Clamp visual width to 0–100%.

- [ ] **Step 5: Implement details and payment sections**

Render only normalized data. Fixture mode visibly labels the section `Preview`. Live empty methods render warm empty copy plus a portal action; never repeat or invent cards to fill space. Brand marks use code-native shapes/tokens and accessible text rather than unlicensed bitmap assets.

- [ ] **Step 6: Implement invoices panel**

Reuse the real invoice URL behavior, format amount/date/status where present, and render loading and empty states without changing the tab layout.

- [ ] **Step 7: Run tests and commit**

Run: `bun test src/features/settings/billing-components.test.ts`

Expected: PASS.

```bash
git add src/components/billing src/features/settings/billing-components.test.ts
git commit -m "feat(mobile): build billing presentation components"
```

---

### Task 6: Compose the pixel-accurate tier-aware screen

**Files:**
- Modify: `app/settings/billing.tsx`
- Modify: `src/features/settings/billing-consistency.test.ts`
- Create: `src/features/settings/billing-screen.test.ts`

**Interfaces:**
- Consumes all Task 4 hook values and Task 5 components.
- Produces the final `/settings/billing` route.

- [ ] **Step 1: Write failing screen composition tests**

Assert safe back, centered title, Overview/Recent invoices tabs, tier-aware banner, storage card, details/payment sections, invoice panel, pull-to-refresh, and retained cancellation/resume behavior through a secondary manage-plan area or Polar portal.

- [ ] **Step 2: Run tests and confirm RED**

Run: `bun test src/features/settings/billing-screen.test.ts src/features/settings/billing-consistency.test.ts`

Expected: FAIL against the old card-stack screen.

- [ ] **Step 3: Replace screen composition**

Use `SafeAreaView`, warm background, reference header, pattern at 0.03 opacity, and a single `ScrollView` whose content changes by active tab. Keep all hooks above conditional rendering. Use `RefreshControl` with `COLORS.brand` and stable memoized callbacks.

- [ ] **Step 4: Preserve subscription controls**

Do not discard cancel/resume/promo capabilities. Place plan-management operations behind the Manage plan/portal experience or a compact, visually subordinate section consistent with the reference. Existing confirmation behavior remains functional.

- [ ] **Step 5: Run screen tests and commit**

Run: `bun test src/features/settings/billing-screen.test.ts src/features/settings/billing-consistency.test.ts`

Expected: PASS.

```bash
git add app/settings/billing.tsx src/features/settings/billing-screen.test.ts src/features/settings/billing-consistency.test.ts
git commit -m "feat(mobile): integrate tier-aware billing screen"
```

---

### Task 7: Verify API and mobile as a release pair

**Files:**
- Modify if generated: `/Users/dev/Workspace/memento/api/openapi.json`
- Create: `docs/testing/tier-aware-billing-release-checklist.md`

**Interfaces:**
- Consumes the completed API and mobile contracts.
- Produces reproducible release evidence and rollout order.

- [ ] **Step 1: Run the complete API suite**

Run in `/Users/dev/Workspace/memento/api`:

```bash
yarn verify
yarn contracts:check
```

Expected: lint, compile, tests, and canonical OpenAPI checks pass.

- [ ] **Step 2: Run the complete mobile suite**

Run in the mobile worktree:

```bash
bun run verify:full
```

Expected: lint, typecheck, all tests, production readiness, and Expo Doctor pass.

- [ ] **Step 3: Verify visual states manually**

At the reference iPhone viewport and one compact iPhone/Android viewport, capture and compare:

- Free with no Polar customer.
- Free preview fixture with `EXPO_PUBLIC_BILLING_PREVIEW=1`.
- Pro with live details and at least one method.
- Legacy with live details.
- Recent invoices loading, populated, and empty.
- Storage below 80%, warning, and full.

Confirm back, tabs, Upgrade, Edit, Add new, card edit, invoice links, refresh, cancel, and resume all fire haptics and reach the correct existing flow.

- [ ] **Step 4: Write the rollout checklist**

Document: deploy API first; smoke-test `/billing/profile`; verify secrets are absent from logs/responses; release mobile; observe 404 compatibility and portal-return refresh; disable preview configuration in production.

- [ ] **Step 5: Commit verification documentation**

```bash
git add docs/testing/tier-aware-billing-release-checklist.md
git commit -m "docs(mobile): add billing release verification"
```

---

## Plan Self-Review

- Every spec section maps to at least one task: API facade (Tasks 1–2), compatibility and fixtures (Tasks 3–4), visual components (Task 5), route integration (Task 6), and security/release verification (Task 7).
- The transport uses snake_case while the mobile normalized model uses camelCase consistently.
- No task stores or mutates payment credentials in Memento.
- The static fixture is explicit, labeled, and production-disabled.
- Existing checkout, portal, invoices, storage, cancel, resume, and promo behavior remains in scope.

---

### Task 8: Complete the attached billing interactions

**Files:**
- Modify: `src/components/billing/BillingInvoicesPanel.tsx`
- Create: `src/components/sheets/EditBillingDetailsSheet.tsx`
- Create: `src/components/sheets/AddPaymentMethodSheet.tsx`
- Modify: `src/components/sheets/SheetManager.tsx`
- Modify: `src/store/ui.store.ts`
- Modify: `src/hooks/use-billing-settings-logic.ts`
- Modify: `app/settings/billing.tsx`
- Create: `src/features/settings/billing-interactions.test.ts`

- [x] Render real invoices as the attached two-column ledger with status badges, localized date, and formatted amount.
- [x] Open a pixel-matched billing-details sheet from Edit and persist only non-sensitive customer fields through the billing profile API.
- [x] Open a pixel-matched payment-method sheet from Add new/card edit and hand off actual card or PayPal entry to Polar's hosted PCI flow.
- [x] Register both sheets through the global SheetManager, preserve haptics and 44-point targets, and refresh billing data after hosted return.
- [x] Verify focused tests, then rerun the complete mobile/API release pair.
