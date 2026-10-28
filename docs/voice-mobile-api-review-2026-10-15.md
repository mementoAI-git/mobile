# Mobile/API voice review — 2026-10-15

Scope: current voice tool orchestration, screen-control registration, server action deduplication, confirmation, undo, and associated focused tests. This is not an exhaustive review of unrelated app/API modules or a real-device audio certification.

Reviewed mobile HEAD `b9fadf3`, API HEAD `9b9772c`, plus current source. No application changes made. Existing untracked material was left untouched; credential contents were not inspected.

## Findings

### P1: Mobile never sends the idempotency key the API now accepts

`src/hooks/use-voice-mode.ts:1224` posts only `{args}`. `VoiceToolRelay` has Gemini's call ID but calls handlers with arguments alone. API `controller.ts:247` reads `req.body.call_id`; `voice/server-tools.ts` reserves a unique action only if this is supplied.

Consequently real mobile actions bypass the new deduplication branch. Repeated delivery can create another story/capsule or repeat an invitation. Propagate a typed invocation context through relay, handler, request, and API. Test the complete boundary with duplicate delivery rather than only calling the API function with an ID manually. Include session identity and payload/tool consistency in the key contract.

### P1: Disposed/canceled tools can still apply UI effects

`src/features/chat/voice-server-tools.ts` applies effects inside the handler, before `VoiceToolRelay` checks its disposed/canceled state. The hook's effect callback can navigate without checking the originating call identity.

Reproduced: start a deferred server tool, dispose the relay, then resolve an `open profile` effect. Navigation effect fires; the model response is correctly suppressed. This can move the user after hangup or interfere with a newer call.

Return effects as data and validate invocation/session liveness before navigation. Cache reconciliation for an already committed write may still be necessary; separate it from foreground navigation. Cancellation cannot promise rollback of an API mutation already executed.

### P1: Timeout is reported as definite failure even when a write may commit

`voice-server-tools.ts` bounds requests at eight seconds and returns “That did not go through … try again.” A local timeout does not establish whether the server committed. Combined with the missing idempotency key, retrying can duplicate a write.

Represent timeout as unknown outcome; reconcile by operation ID before inviting a retry. Test server commit followed by delayed/lost response. Aborting transport does not itself reverse the operation.

### P1: Undo can overwrite newer edits and is not scoped to the current call

`../api/src/module/api/ai/voice/undo.ts:94` selects the latest action for the user across a 30-minute window. There is no call/session filter. `reverse` restores saved before-values without checking the current values or document version.

Example: voice changes nickname A to B, user manually changes B to C, then “undo” restores A and destroys C. A separate device/call can also select the action. Store expected after-values/version, use conditional updates, and return a conflict when the target changed. Define whether cross-call undo is intended and communicate that scope.

### P1: Confirmation tokens prove possession, not user approval

`../api/src/module/api/ai/voice/confirmation.ts` signs user/tool/arguments/time. The initial tool response gives that token directly to the model; the model can immediately call again with it. The comment claiming this prevents skipping user confirmation overstates the guarantee.

The signature binds parameters and expiry, but there is no independent user-approval event. For actions requiring enforced approval, bind execution to an explicit client confirmation or a separately verified approval state. If spoken confirmation remains model-mediated, document that trust boundary honestly and test unauthorized consecutive calls.

### P2: Duplicate labels silently target the first control

`src/features/voice-control/registry.ts`, `activeButtons`, deduplicates labels before `press` checks ambiguity. Two active “Open” controls become one candidate.

Reproduced with two active targets: `press('Open')` returns success and invokes the first. Keep distinct targets and reject ambiguous labels, ideally with stable references and screen/layer identity.

### P2: Navigation focus does not enforce topmost sheet or visible viewport

`src/features/voice-control/hooks.ts`, `useIsScreenInFront`, checks navigator focus; components outside navigation are always active. Opening an overlay does not necessarily unfocus the underlying route. Mounted offscreen controls can also remain eligible.

The registry has no topmost-layer or visibility contract. Voice can target underlying controls when a sheet covers them. Add layer ownership and visibility/eligibility semantics; test identical labels across a screen and an open sheet. This finding is source-derived, not device-reproduced.

### P2: Action claim and business mutation are not atomic

`../api/src/module/api/ai/voice/server-tools.ts` creates a running claim, executes the business handler, then persists its result. A crash after the mutation leaves a running claim with no recoverable outcome. Replays time out saying it is on its way; the row can remain until TTL cleanup. Deleting a claim on a thrown handler also cannot establish that no partial side effect occurred.

After fixing mobile call IDs, add operation states and reconciliation. Use transactions for compatible database writes and an outbox/idempotent downstream operations for external effects. Do not claim exactly-once behavior merely because an index prevents concurrent claims.

## Verification

- Mobile: `bun test src/features/voice-control src/features/chat/voice-server-tools.test.ts src/features/chat/voice-tool-relay.test.ts` — 41 passed, 0 failed.
- API: `vitest run test/ai/voice-server-tools.test.ts test/ai/voice-undo.test.ts test/ai/voice-confirmation.test.ts test/contracts/voice-tools.contract.test.ts` — 38 passed, 0 failed. Initial sandbox run could not write Vitest's sibling-directory cache; approved rerun completed.
- Additional nonpersisted reproductions: duplicate labels choose the first target; deferred effects apply after relay disposal.
- No real provider calls, billing experiments, physical-device tests, or full-repository suite were run.

## Progress and next priorities

Independent tool responses, bounded requests, validated effect types, API action records, before-values, and focused tests are useful foundations. Their integrations need stronger lifecycle and ownership contracts.

Prioritize: invocation identity end-to-end; unknown-outcome reconciliation; session-bound effect application; conditional undo and approval boundary; registry ambiguity/top-layer fixes. Add cross-service integration tests and multi-step scenarios before expanding action coverage.

Production `eas.json` still disables speaker full duplex; this review does not resolve the reported Mac TestFlight speaker-route failure. The screen-snapshot/stable-reference design described in the intelligence plan is not implemented in the inspected registry.
