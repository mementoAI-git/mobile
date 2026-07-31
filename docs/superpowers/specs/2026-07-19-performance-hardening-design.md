# Memento Mobile Performance Hardening Design

## Goal

Improve measurable runtime and startup performance through small, isolated changes while preserving existing behavior after every step.

## Scope

This phase addresses performance and unnecessary work only. Design-rule cleanup—colors, modal policy, haptic consistency, and other visual-language compliance—will follow in a separate phase unless a rule change is required to complete a performance improvement safely.

The work proceeds in this order:

1. Eliminate unnecessary network requests, beginning with the idle memory-search request.
2. Consolidate duplicated or manually managed query and pagination work where it causes redundant requests or stale state.
3. Defer unnecessary startup work, especially feature-specific fonts and pre-authentication notification registration.
4. Reduce JavaScript bundle weight from capsule theme artwork without changing its appearance.
5. Reduce masonry-grid layout churn and validate behavior with large memory collections.
6. Improve media caching and prevent duplicate thumbnail-generation work.
7. Remove dead performance-related work exposed while changing these paths.

## Architecture

Each improvement is an independently testable unit. Existing public hook and component behavior remains stable unless a narrower interface is required to prevent unnecessary work. Server state stays in TanStack Query; network writes remain mutation-driven; local UI state stays in Zustand or component state according to existing boundaries.

Performance changes must prefer explicit enablement, stable cache keys, bounded caches, deferred initialization, and deterministic layout work. Broad refactors are excluded unless the current boundary prevents an isolated fix.

## First Change: Idle Search Request

Opening the memory-search sheet with an empty query must issue no stories request. Searching with non-empty trimmed text must retain the existing 300 ms debounce and return the same paginated results.

The stories query hook will support an explicit enabled condition. Existing stories-feed consumers remain enabled by default. The search sheet will enable its query only when the debounced query contains non-whitespace text.

Unit coverage will prove both defaults: ordinary story queries remain enabled, while empty search queries are disabled.

## Verification Contract

After every implementation step:

1. Run the new or affected targeted tests.
2. Run `bun run lint`.
3. Run `bun run typecheck`.
4. Run the full `bun test` suite.
5. Run `bun run check:prod`.
6. Inspect the diff for unrelated changes and rule violations.
7. Perform an Expo/native smoke test when the change affects routing, startup, media, animation, or visible UI.

If any check fails, stop advancing. Diagnose and return the current step to a verified working state before starting the next step. Verification reports must distinguish automated checks from physical-device testing that could not be performed locally.

## Success Criteria

- Every targeted unnecessary operation is removed or measurably reduced.
- User-visible behavior remains unchanged unless explicitly approved.
- All repository verification commands pass after every step.
- Performance-sensitive changes have focused regression tests where the behavior can be tested without native instrumentation.
- Bundle, request, render, or timing improvements are reported with before/after evidence whenever tooling permits.

## Deferred Work

The following audit findings are explicitly deferred to the design-rule cleanup phase:

- Hardcoded non-token UI colors.
- React Native `Modal` policy inconsistencies.
- Missing haptics on interactions.
- Design-token and visual-language cleanup not required by a performance change.
