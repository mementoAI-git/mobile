# Settings Typography Blend

## Goal

Bring the complete Settings flow into the same warm, editorial typography system used by Memento’s onboarding and primary app surfaces. Settings should feel calm, premium, and cohesive without losing the scanability required by forms, security controls, and account management.

## Scope

Apply the typography blend to:

- Settings hub
- Personal information
- Security and two-factor authentication
- Privacy
- Beneficiaries and groups
- Billing
- Feedback
- Activities
- Settings-owned sheets and confirmations

Navigation, data behavior, colors, and interaction flows remain unchanged. Small spacing adjustments are allowed where required by the new font metrics.

## Typography Hierarchy

### Screen titles

- EB Garamond Regular
- 28px with a relaxed 34px line height
- Used consistently in every Settings header

### Section, card, empty-state, and confirmation headings

- EB Garamond Regular or Medium
- 20–22px
- Used for meaningful content hierarchy, not field labels or controls

### Names and identity

- EB Garamond Medium
- 20–22px
- Used for profile names, beneficiary names, and group names

### Navigation rows and field labels

- Inter Medium
- 15–16px
- Keeps controls direct and scannable without the visual hardness of Semibold or Bold

### Body and supporting copy

- Inter Regular
- 14–16px
- Relaxed line height of approximately 1.45–1.6
- Uses semantic warm-brown text tokens

### Buttons

- Inter Semibold
- Bold is reserved for unusually strong emphasis

### Stats and codes

- Inter Semibold for numeric statistics
- Azeret Mono remains limited to secrets and verification codes

### Utility labels

- Inter Medium or Semibold
- Uppercase and wide tracking are used only for true metadata or compact section markers
- Community and billing labels should not visually compete with page hierarchy

## Component Strategy

Introduce shared Settings typography styles rather than repeating ad hoc font choices in each screen. These styles will be consumed by the Settings hub rows, security rows, beneficiary rows, screen headers, and Settings-owned sheets.

The shared styles should remain token-based and should not create a parallel font system. They are semantic aliases over the existing `FONTS` and `COLORS` constants.

## Visual Rhythm

- Preserve the current screen structures and routes.
- Increase line height where serif titles or body paragraphs currently feel compressed.
- Add only the spacing required to prevent serif ascenders, descenders, or multiline text from crowding adjacent controls.
- Keep tap targets and accessibility behavior unchanged.
- Do not introduce new illustrations, colors, gradients, or decorative surfaces.

## Testing

- Add a source-contract test covering the shared Settings typography hierarchy.
- Verify Settings screens use the shared hierarchy for titles and primary row labels.
- Run the focused Settings tests, TypeScript, ESLint, the full test suite, and production-readiness checks.

## Constraints

- Reuse existing components and font assets.
- Do not alter user flows or API behavior.
- Do not commit this specification or the implementation unless explicitly requested.
- Preserve unrelated worktree changes.
