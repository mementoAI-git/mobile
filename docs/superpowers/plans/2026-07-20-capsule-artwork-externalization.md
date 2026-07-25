# Capsule Artwork Externalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove seven embedded base64 PNG payloads from capsule SVG component source while preserving their exact bytes, rendering geometry, and theme API.

**Architecture:** Decode each data URI once into a Metro-managed PNG asset, reference it through a module-level `require`, and protect the migration with a source-and-hash regression test. No image is rasterized, recompressed, resized, or otherwise transformed.

**Tech Stack:** TypeScript 6, React Native SVG, Expo/Metro static assets, Bun test, Ruby for the one-time byte-for-byte extraction.

## Global Constraints

- Preserve every SVG element, identifier, dimension, transform, fill, clip path, and aspect-ratio setting.
- Preserve the public exports and capsule-theme mappings.
- Decode the original base64 bytes directly; do not process the PNGs through an image library.
- Keep image sources at module scope so renders do not repeat asset resolution work.
- Run focused tests and the full verification suite before reporting success.

### Task 1: Add a failing artwork policy test

**Files:**
- Create: `src/features/capsules/artwork-assets.test.ts`

- [ ] **Step 1: Encode the immutable asset manifest**

Add the seven expected target paths and SHA-256 values:

| Asset | Bytes | SHA-256 |
|---|---:|---|
| `bead-1.png` | 371571 | `9cdbda25c257978a6847501991a460068e802e94124150321abd78e392969471` |
| `bead-2.png` | 622937 | `bd457655b135c91910341cc1a8bebe16dc59e55b29303d369183f758dfb6f444` |
| `blush-1.png` | 157825 | `d1341e4b3a831ff3a0efb06b5abc4b9df5c380e57baa30b769ec08f52263b978` |
| `modern-1.png` | 1117705 | `491f2a5d078afbda38b7c026eef48055adeba75b9828419449e18dd823a57fa5` |
| `modern-2.png` | 344402 | `3106c69cdaf67cb82f91b9968b6eb8cfc67109d0a12828c405216541a4e58b45` |
| `paper-1.png` | 160797 | `f0d37d2933ccd1178e647825321766ddbd5fcaefc9eab339d47ebb7592a02263` |
| `sage-1.png` | 308759 | `14c15802d1e007fa916e1315a67f378b45a3e86ded7ef4cfac8eef5c3bf0bb1d` |

The test must assert that each file exists, has the expected byte count and SHA-256 digest, and that no `data:image/png;base64` remains in any file under `src/components/capsule/letters`.

- [ ] **Step 2: Protect component wiring**

Assert that Bead, Blush, Modern, Paper, and Sage source files contain their expected module-level PNG `require` paths. Assert that `src/components/capsule/letters/index.ts` still exports all six themes, including Dark.

- [ ] **Step 3: Verify red**

Run `bun test src/features/capsules/artwork-assets.test.ts`. Expect failure because the PNG assets do not exist and the source files still contain embedded base64 data.

### Task 2: Decode assets and rewire SVG image sources

**Files:**
- Create: `assets/images/capsule-themes/bead-1.png`
- Create: `assets/images/capsule-themes/bead-2.png`
- Create: `assets/images/capsule-themes/blush-1.png`
- Create: `assets/images/capsule-themes/modern-1.png`
- Create: `assets/images/capsule-themes/modern-2.png`
- Create: `assets/images/capsule-themes/paper-1.png`
- Create: `assets/images/capsule-themes/sage-1.png`
- Modify: `src/components/capsule/letters/Bead.tsx`
- Modify: `src/components/capsule/letters/Blush.tsx`
- Modify: `src/components/capsule/letters/Modern.tsx`
- Modify: `src/components/capsule/letters/Paper.tsx`
- Modify: `src/components/capsule/letters/Sage.tsx`

- [ ] **Step 1: Perform the one-time direct decode**

Use a narrowly scoped Ruby command to scan each named source file in occurrence order and write the decoded bytes to the explicit destination names above. The command must fail if any source has an unexpected payload count.

- [ ] **Step 2: Verify decoded bytes before source replacement**

Compute byte counts and SHA-256 hashes for the new files and compare them to the manifest. Stop if any value differs.

- [ ] **Step 3: Replace embedded sources**

Add module-level constants using `require('../../../../assets/images/capsule-themes/<name>.png')`. Replace only each `href="data:image/png;base64,..."` with the corresponding `href={CONSTANT}`. Do not alter surrounding SVG markup.

- [ ] **Step 4: Verify focused behavior**

Run `bun test src/features/capsules/artwork-assets.test.ts`, then TypeScript checking to confirm `react-native-svg` accepts the static asset sources.

### Task 3: Verify application health and migration value

**Files:**
- Inspect only the files listed above plus the test and plan.

- [ ] **Step 1: Run automated verification**

Run `bun run verify`, `git diff --check`, and a targeted search proving no capsule letter source contains `data:image/png;base64`.

- [ ] **Step 2: Measure source reduction**

Compare the aggregate byte size of the five modified TSX files before and after the migration. Report the extracted binary total separately so source reduction is not misrepresented as package-size reduction.

- [ ] **Step 3: Inspect diff integrity**

Confirm the only component changes are module-level asset constants and seven `href` substitutions. Confirm `Dark.tsx`, exports, mappings, and SVG geometry are unchanged.

- [ ] **Step 4: Record native visual follow-up**

Automated checks prove byte and wiring equivalence, but native rendering still requires opening each Bead, Blush, Modern, Paper, and Sage capsule theme on iOS or Android. Report this physical-device/simulator checklist explicitly rather than claiming it was performed.
