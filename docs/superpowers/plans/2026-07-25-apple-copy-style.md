# Apple-Like Interface Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize operational copy without flattening Memento’s editorial voice.

**Architecture:** Copy-only edits remain at their current ownership sites. A focused source-contract test prevents regressions in authentication, security, settings, and status terminology.

**Tech Stack:** React Native source copy, Bun tests.

## Global Constraints

- Do not change API payload values while changing displayed labels.
- Preserve editorial em dashes in prompts and onboarding narratives.
- Keep specs and plans local and uncommitted.

---

### Task 1: Add failing copy contract

- [ ] Add `src/features/copy/apple-copy-style.test.ts` covering banned operational phrases.
- [ ] Run the focused test and verify RED.

### Task 2: Revise authentication and settings copy

- [ ] Standardize sign-in/log-out terminology and sentence case.
- [ ] Tighten security confirmations and two-factor authentication language.
- [ ] Remove UI em dashes and redundant success wording.
- [ ] Remove trailing three-dot punctuation from placeholders and use true ellipses for progress.
- [ ] Run the focused test and verify GREEN.

### Task 3: Verify

- [ ] Run TypeScript, lint, all tests, production readiness, and diff checks.

