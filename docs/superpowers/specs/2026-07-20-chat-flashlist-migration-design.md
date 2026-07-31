# Chat FlashList Migration Design

## Goal

Replace the host and prompt chat feed's React Native `FlatList` with FlashList v2 while preserving message order, streaming, navigation, reply behavior, attachment previews, visual layout, and scroll commands. The migration must remove recycling hazards instead of performing a cosmetic component swap.

## Scope

This change covers only the list used by `ChatScreen`, its imperative list ref, optimistic chat-message identity, and attachment-preview state currently owned by each `MessageBubble`. Other lists remain unchanged.

The project uses Expo SDK 56, React Native 0.85, and React 19. Expo recommends `@shopify/flash-list` 2.0.2 for this SDK. FlashList v2 requires React Native's new architecture, which is the Expo SDK 56 default. The dependency will be installed with Expo's version-aware installer rather than by choosing an arbitrary package version.

## Architecture

### List and imperative ref

`ChatScreen` will import `FlashList` from `@shopify/flash-list`. `useChatLogic` will hold a `FlashListRef<ChatMessage>` rather than a React Native `FlatList` ref. Existing `scrollToIndex` calls for quoted messages and month jumps will retain their indices, animation, and view-position values because FlashList v2 exposes the same method parameters.

The feed will remain inverted and continue receiving the already reversed `allMessages` array. This deliberately avoids changing two ordering mechanisms in the same migration. FlashList's visible-content-position configuration will preserve the viewport during inserts and allow new index-zero content to remain visible when the user is near the live edge.

Unsupported FlatList-only tuning props will not be copied. FlashList v2 controls its own rendering window and does not support `initialNumToRender`, `maxToRenderPerBatch`, `windowSize`, or `onScrollToIndexFailed`.

### Stable message identity

Every item must have a unique, stable key before it reaches FlashList. Server messages will continue using their `_id`. Optimistic user and assistant messages will receive client-generated IDs at creation time and retain those IDs for their lifetime in `useStreamChat` state.

A pure `getChatMessageKey` helper will prefer `_id`, then a persisted client ID if legacy shapes require it. It will not use the current array index. Its final legacy fallback will hash the immutable role, creation timestamp, text, reply, and attachment identities. Newly created messages must never depend on that fallback.

The same identity helper will provide FlashList item types such as user, assistant, and attachment-bearing variants. This lets the recycler avoid treating substantially different cell layouts as interchangeable.

### Recycling-safe attachment previews

`MessageBubble` currently owns `previewVisible` and `previewIndex`. That local state is unsafe when FlashList reuses a cell for another message, and it also creates one `MediaPreviewModal` instance per rendered message.

The preview state and the single `MediaPreviewModal` will move to `ChatScreen`. `MessageBubble` will receive an optional attachment-preview callback and call it with its derived preview attachments and selected index. The modal will be rendered once outside FlashList. Closing it clears the active preview state. This makes message cells stateless with respect to preview ownership and prevents state leakage during recycling.

The favicon failure state remains local to `FaviconBadge`, but it will reset whenever its URL changes. This explicitly prevents a recycled badge's previous image error from hiding a valid favicon in its next message.

### Stable FlashList props

The following will have stable references across streaming-text renders:

- key extractor;
- item-type resolver;
- `renderItem`;
- visible-content-position configuration;
- content-container style;
- attachment-preview handler;
- empty-state component or memoized element.

`MessageBubble` remains memoized. Reply and quoted-message callbacks passed into a bubble must not be recreated solely because streaming text changes.

## Data Flow

1. `useStreamChat` creates optimistic messages with client IDs.
2. `useChatLogic` merges server and optimistic messages and reverses them exactly as today.
3. FlashList obtains each key and item type from pure helpers.
4. `renderItem` renders the memoized `MessageBubble`.
5. Selecting an attachment sends the preview array and index to `ChatScreen`.
6. The one screen-level media preview opens; closing it clears screen-level preview state.
7. Streaming text remains in the list header and does not alter persisted message identities.

## Error and Edge Handling

- Missing server IDs use the deterministic immutable-field fingerprint. Distinct legacy messages with the same role or text must still produce different keys when their timestamp, reply, or attachment identity differs. The backend contract requires unique `_id` values for persisted messages; an exact duplicate record with neither an ID nor any differing immutable field is invalid input and is outside this client migration.
- Empty messages remain filtered by `MessageBubble` as they are today.
- `scrollToIndex` calls stay guarded by ref and index checks. FlashList v2 does not expose `onScrollToIndexFailed`, so the unsupported no-op handler will be removed.
- Closing an attachment preview clears both the selected attachments and index so stale media cannot flash when another message opens.
- Aborted and failed streams retain their existing message behavior; their generated IDs remain stable.

## Testing

The implementation follows red-green-refactor.

Automated tests will verify:

- optimistic messages receive stable unique IDs;
- chat message keys prefer server/client identity and do not normally depend on array index;
- item types distinguish attachment-bearing and plain user/assistant cells;
- `ChatScreen` imports and renders FlashList, uses a `FlashListRef`, and does not retain the unsupported FlatList failure callback;
- attachment-preview state and the single modal live outside `MessageBubble`;
- `MessageBubble` forwards the selected attachment set and index;
- required memoized FlashList props and visible-position settings are present;
- all existing chat navigation, composer, streaming, and application tests continue to pass.

Full verification consists of `bun run verify`, `git diff --check`, dependency-lock inspection, and a production bundle/readiness check.

## Native and Performance Verification

Automated checks cannot prove native recycling behavior or performance. The native checklist is:

- open a long host conversation and a prompt conversation;
- verify newest messages remain at the bottom;
- send text, attachment-only, and reply messages;
- stream and stop an assistant response;
- open media from several distant messages after fast scrolling and confirm the correct media/index opens;
- jump by quoted reply and by month;
- scroll away from the live edge while a response arrives and confirm the viewport does not jump unexpectedly;
- repeat on iOS and Android where available.

Performance comparison must use release builds, not development mode. Capture at least initial long-chat render, rapid scrolling, and streaming-response behavior. The migration is accepted only if it introduces no visible blank cells or state leakage and does not regress these interactions.

## Non-Goals

- Migrating other application lists to FlashList.
- Changing message ordering or API response shapes.
- Redesigning chat bubbles, animations, composer layout, or media presentation.
- Adding pagination if the messages endpoint does not already expose it.
- Claiming a numeric performance improvement without release-build measurements.
