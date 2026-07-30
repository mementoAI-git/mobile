# Apple-Like Interface Copy Design

## Goal

Make operational interface copy concise, direct, consistent, and sentence-cased while preserving Memento’s editorial voice in reflective prompts and onboarding narratives.

## Rules

- Use “sign in” and “log out” as verbs.
- Use sentence case for screen titles, fields, settings rows, and actions.
- Use direct action labels without “Yes,” “Are you sure,” or redundant “successfully.”
- Describe recoverable errors in plain language and name the action that failed.
- Spell out “two-factor authentication” in explanatory copy; use “Set up,” never “Setup,” as a verb.
- Avoid em dashes in controls, statuses, toasts, and compact settings descriptions.
- Preserve intentional em dashes in long-form reflective/editorial content.
- Use true ellipses only for genuine ongoing states; omit trailing punctuation from placeholders.

## Testing

Add a source contract that rejects the highest-risk legacy phrases across authentication and settings copy, then run full verification.

