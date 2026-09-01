# Beneficiary and Group Sheet Redesign

## Goal

Replace the existing Invite Beneficiary and Create Group sheets with the supplied reference designs while keeping every visible control functional and preserving Memento's shared sheet, token, haptic, and mutation patterns.

## Invite Beneficiary

### Layout

- Present through `SheetManager` at approximately 92% screen height.
- Use a self-managed layout with a fixed header, scrollable keyboard-aware form body, and fixed bottom action bar.
- Header title is `Invite Beneficiary`; the close control is a 44-point circular touch target.
- Body horizontal padding is 20 points. Fields are vertically separated by 20–24 points.
- Footer contains equal-width `Dismiss` and `Send invite` pill buttons and respects the bottom safe area.
- Content must remain scrollable above the keyboard without hiding the focused field or footer.

### Fields and interactions

- Optional avatar: square rounded preview surface with an edit icon. Tapping opens the image library for one image. The selected image previews immediately and uploads before invite submission.
- Email address: required, trimmed, lowercased, email keyboard, no automatic capitalization.
- Beneficiary name: required and trimmed.
- Relationship: required free-text value matching the supplied reference.
- About: optional multiline description, trimmed.
- Add to group(s): searchable multi-select using the existing groups query. Selected groups remain visible as removable chips; the list filters by group name.
- Close, picker, group-selection, and removal presses fire `selectionAsync`; submission fires medium impact feedback.

### Submission

1. Validate name, email, relationship, and email format locally.
2. Upload a selected avatar through the existing file-upload service.
3. Submit one atomic beneficiary invite request.
4. Close only after the invite succeeds.
5. Preserve entered values when upload or invite submission fails and show the shared warm error toast.

Payload:

```json
{
  "email": "herrgroot@gmail.com",
  "name": "Nsiyy Uwem",
  "relationship": "Friend",
  "about": "A close friend from university.",
  "avatar_file_id": "file_123",
  "group_ids": ["group_1", "group_2"]
}
```

`about`, `avatar_file_id`, and `group_ids` are optional. Empty optional values are omitted rather than sent as empty strings.

## Create Group

### Layout

- Present through `SheetManager` at approximately 78% screen height.
- Use a self-managed layout with a fixed header, scrollable keyboard-aware body, and fixed bottom action bar.
- Header title is `Create Group` or `Edit Group`; do not use `Circle`.
- Footer contains equal-width `Dismiss` and `Create group`/`Save changes` pill buttons and respects the bottom safe area.
- Remove the current member-selection UI because membership is handled from Invite Beneficiary and group-detail flows.

### Fields and interactions

- Group name: required and trimmed.
- Description: optional multiline text, trimmed.
- Group colour: six selectable palette swatches matching the supplied reference. Selection is always explicit and displays a white checkmark.
- Edit mode preloads the persisted colour and updates the same fields.
- Close and colour-selection presses fire `selectionAsync`; submission fires medium impact feedback.

Payload:

```json
{
  "name": "Family",
  "description": "Immediate family members",
  "color": 1
}
```

The mobile contract uses a zero-based palette index from `0` through `5`. The initial selection is index `1`, the blue swatch shown in the reference. The backend must preserve and return this integer unchanged.

## Shared visual system

- Screen surfaces use `COLORS.background`; card/input surfaces use semantic fill and stroke tokens.
- Text uses the warm `COLORS.text*` tokens and Inter families shown in the supplied references.
- Inputs are 56 points high, softly rounded, and use shared focus/error behavior.
- Multiline inputs are 120–160 points high and top-aligned.
- Primary reference actions use `COLORS.textStrong` as the black-brown fill with inverse text; dismissal uses `COLORS.fillWeak`.
- No arbitrary gray or hardcoded semantic colours are introduced. The six group swatches are added as named beneficiary palette tokens.

## Backend requirements

### Beneficiary invite

- `POST /beneficiaries` accepts `name`, `email`, `relationship`, optional `about`, optional `avatar_file_id`, and optional `group_ids`.
- The endpoint validates ownership/access for every supplied group ID.
- Beneficiary creation, invite creation, and group membership creation are atomic.
- Duplicate email and invalid group errors return actionable 4xx responses without creating partial records.
- The response returns the created beneficiary, including `about`, resolved avatar URL/file metadata, group summaries, invitation status, and stable `_id`.
- Re-fetching `GET /beneficiaries` returns the same fields.

### Groups

- `POST /groups` and `PUT /groups/:id` accept `color` as an integer from `0` through `5`.
- Group list/detail responses return the same `color` value unchanged.
- Invalid colour values return a 400 response rather than being silently normalized.

### Avatar files

- The existing file upload endpoint accepts the chosen image and returns a stable file `_id`.
- The beneficiary endpoint verifies the file belongs to the current user and is an image.
- Returned avatar URLs are durable HTTPS URLs, never device-local paths.

## Testing and acceptance

- Form derivation tests cover trimming, lowercasing email, omission of empty optional fields, selected group IDs, avatar file ID, and colour index.
- Sheet layout tests protect fixed footer placement and keyboard-aware scrolling.
- Mutation tests protect the expanded beneficiary payload and group colour payload.
- `bun run verify` must pass.
- Manual verification covers short and small-screen simulators, keyboard focus on the last field, avatar selection, group filtering/selection, failed submission retention, group creation, and group editing.

## Local-only documentation

This specification and its implementation plan remain uncommitted, per the project owner's instruction.
