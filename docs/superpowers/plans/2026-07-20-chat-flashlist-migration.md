# Chat FlashList Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the chat feed to FlashList v2 with stable message identities and recycling-safe attachment previews while preserving current behavior and visuals.

**Architecture:** Add pure message-list identity/type helpers, assign IDs when optimistic messages are created, and lift media-preview ownership from recycled cells to `ChatScreen`. Install Expo's compatible FlashList, update the imperative ref, and configure stable list props without changing the existing reversed-data plus inverted-list ordering.

**Tech Stack:** Expo SDK 56, React Native 0.85, React 19, `@shopify/flash-list` 2.0.2, TypeScript 6, Bun test.

## Global Constraints

- Only the `ChatScreen` message feed is migrated.
- Preserve inverted ordering, streaming header, prompt footer, reply/month jumps, composer behavior, animations, and visuals.
- Do not use index-based keys for chat messages.
- Render exactly one `MediaPreviewModal` for chat-message attachments.
- Reset recycled favicon failure state when its URL changes.
- Do not copy unsupported FlatList-only tuning props to FlashList v2.
- Run `bun run verify` after every completed task so the app is confirmed healthy at each checkpoint.

---

### Task 1: Stable chat message identity and recycler types

**Files:**
- Create: `src/features/chat/message-list.ts`
- Create: `src/features/chat/message-list.test.ts`
- Modify: `src/hooks/use-stream-chat.ts`

**Interfaces:**
- Produces: `createChatMessageIdFactory(sessionId?: string): () => string`
- Produces: `getChatMessageKey(message: ChatListMessage): string`
- Produces: `getChatMessageItemType(message: ChatListMessage): 'user' | 'user-attachments' | 'assistant' | 'assistant-attachments'`

- [ ] **Step 1: Write failing identity and type tests**

Test that a seeded factory returns distinct stable-format IDs, `_id` is preferred, immutable legacy fields produce a deterministic non-index key, and role/attachment combinations return all four recycler types. Add a source assertion proving `use-stream-chat.ts` assigns factory-created `_id` values to optimistic user, success, and error messages.

- [ ] **Step 2: Verify red**

Run `bun test src/features/chat/message-list.test.ts`. Expect failure because `message-list.ts` and optimistic IDs do not exist.

- [ ] **Step 3: Implement pure helpers**

Define a structural `ChatListMessage` type containing optional `_id`, role, text/content, timestamp, reply, and attachments. Implement a deterministic 32-bit hash for the legacy fingerprint. Implement the factory with a per-factory incrementing counter and a session prefix created once.

- [ ] **Step 4: Assign optimistic IDs at creation**

Extend `StreamMessage` with `_id: string`. Initialize one ID factory in a ref without recreating it on render. Assign IDs to the optimistic user message, completed assistant message, and error assistant message.

- [ ] **Step 5: Verify task and app health**

Run the focused test, `bun run verify`, and `git diff --check`. Inspect only the helper, test, and streaming-hook changes.

### Task 2: Recycling-safe attachment preview ownership

**Files:**
- Modify: `src/features/chat/message-list.test.ts`
- Modify: `src/components/chat/MessageBubble.tsx`
- Modify: `src/screens/ChatScreen.tsx`

**Interfaces:**
- Produces: `ChatAttachmentPreviewRequest = { attachments: PreviewAttachment[]; initialIndex: number }`
- Produces: `MessageBubbleProps.onPreviewAttachments?(request: ChatAttachmentPreviewRequest): void`
- Consumes: screen-level `MediaPreviewModal` with `visible`, `attachments`, `initialIndex`, and `onClose`.

- [ ] **Step 1: Write failing recycling-policy tests**

Add source assertions that `MessageBubble` does not import/render `MediaPreviewModal`, does not own `previewVisible` or `previewIndex`, exposes the preview callback, and resets `FaviconBadge` failure state in an effect keyed by URL. Assert that `ChatScreen` imports and renders exactly one `MediaPreviewModal` outside the list.

- [ ] **Step 2: Verify red**

Run the focused test. Expect failure on the existing per-bubble modal and preview state.

- [ ] **Step 3: Make message bubbles recycling-safe**

Export the preview request type. Keep attachment conversion inside the bubble, but send the full converted attachment list and selected index through `onPreviewAttachments`. Remove the bubble-level modal and its two state values. Add `useEffect(() => setFailed(false), [url])` to `FaviconBadge`.

- [ ] **Step 4: Add the single screen-level preview**

Store one nullable preview request in `ChatScreen`. Add stable open/close callbacks. Pass the open callback to message bubbles. Render one `MediaPreviewModal` after the chat list/composer hierarchy with empty attachments when closed, the selected index when open, and a close callback that clears the request.

- [ ] **Step 5: Verify task and app health**

Run the focused test, TypeScript checking, `bun run verify`, and `git diff --check`. Confirm message visuals and attachment conversion logic are otherwise unchanged.

### Task 3: Install and migrate to FlashList v2

**Files:**
- Modify: `package.json`
- Modify: `bun.lock`
- Modify: `src/features/chat/message-list.test.ts`
- Modify: `src/hooks/use-chat-logic.ts`
- Modify: `src/screens/ChatScreen.tsx`

**Interfaces:**
- Consumes: `getChatMessageKey` and `getChatMessageItemType` from Task 1.
- Produces: `FlashListRef<ChatListMessage>` through `useChatLogic.flatListRef`.

- [ ] **Step 1: Write the failing FlashList migration policy test**

Assert that package metadata contains `@shopify/flash-list`, `ChatScreen` imports/renders `FlashList`, the logic hook imports/uses `FlashListRef`, stable key and item-type helpers are passed, `maintainVisibleContentPosition` enables near-live-edge autoscroll, and unsupported `onScrollToIndexFailed` is absent.

- [ ] **Step 2: Verify red**

Run the focused test. Expect failure because the dependency and migration are absent.

- [ ] **Step 3: Install the Expo-compatible dependency**

Run `bunx expo install @shopify/flash-list`. Verify `package.json` resolves to Expo's compatible 2.0.2 range and `bun.lock` contains one resolved FlashList v2 package.

- [ ] **Step 4: Update the imperative ref**

Remove the React Native `FlatList` import from `use-chat-logic.ts`, import `FlashListRef`, import the structural chat list type, and change the ref to `useRef<FlashListRef<ChatListMessage>>(null)`.

- [ ] **Step 5: Migrate and stabilize the screen list**

Replace `FlatList` with `FlashList`. Use module-level or memoized stable values for content style and visible-position configuration. Pass stable `keyExtractor` and `getItemType` callbacks using the pure helpers. Remove `onScrollToIndexFailed`. Keep `inverted`, data, header, footer, empty state, scroll commands, and visual padding unchanged.

- [ ] **Step 6: Verify focused migration**

Run the focused test and TypeScript checking. Inspect installed package types if a prop or ref signature differs; adapt to the installed v2 API without weakening the design requirements.

- [ ] **Step 7: Verify task and app health**

Run `bun run verify`, `git diff --check`, and inspect the dependency diff for unrelated changes. Confirm all chat source-policy and behavior tests pass.

### Task 4: Final integrity and native handoff

**Files:**
- Inspect all files changed by Tasks 1–3.

**Interfaces:**
- Consumes: the completed FlashList chat feed.
- Produces: automated verification evidence and an explicit native checklist.

- [ ] **Step 1: Run final automated verification**

Run `bun run verify`, the focused chat tests, `git diff --check`, and `git status --short`. Confirm no test, lint, type, or production-readiness failure.

- [ ] **Step 2: Review migration invariants**

Search for the old chat `FlatList`, index fallback keys, per-bubble `MediaPreviewModal`, preview visibility state, unsupported FlashList props, and duplicate dependency versions. Confirm none remain in the migrated path.

- [ ] **Step 3: Inspect the exact diff**

Confirm no message ordering, composer behavior, API request, styling, or animation logic changed beyond optimistic IDs, preview ownership, favicon reset, list component/ref, and stable list props.

- [ ] **Step 4: Report native and release-build checks honestly**

Report automated results separately from the required native checklist: long host and prompt chats, newest-at-bottom ordering, text/attachment/reply sends, start/stop streaming, distant attachment previews after fast scrolling, quoted/month jumps, live-edge retention, and iOS/Android coverage. Do not claim release performance gains without release-build measurements.
