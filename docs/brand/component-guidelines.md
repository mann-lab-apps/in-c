# Component State And Accessibility Guidelines

작성일: 2026-07-14

## Shared Rules

- Button text must describe the command. Icon-only buttons need `aria-label` and
  tooltip/title text.
- `focus-visible` must be visually stronger than hover.
- Disabled controls keep their layout size and use opacity rather than removing
  labels or icons.
- Selected state must not depend on color alone; use `aria-pressed`,
  `aria-current`, `.is-active`, or an equivalent state marker.
- Error text uses `--inc-color-error` and should include the failed action and the
  next possible recovery step.

## Component States

| component | default | hover/focus | selected/active | disabled/error |
| --- | --- | --- | --- | --- |
| Site CTA | surface or accent fill | focus ring plus border contrast | current nav uses accent text | disabled CTAs are avoided on the public site |
| App icon button | compact surface or transparent | focus ring and stronger border | `aria-pressed=true`, active class | opacity token, cursor not-allowed |
| Segmented control | equal-size options | focus ring around option | active option has border/fill change | disabled option remains visible |
| Input/select | border token, readable label | focus ring | value text stays primary | error message below field |
| Slider | label, input, numeric output | focus ring on thumb/control | not applicable | disabled opacity only |
| Tabs/nav | text label | focus ring and underline/border | `aria-current` or active class | hidden tabs are not rendered |
| Status message | neutral text | not interactive | polite live region for editor status | error tone with clear action |

## Score State Colors

Score editing states are separate from brand accent.

- Selection/focus: `--inc-color-focus`
- Playback: use playback-specific styling rather than brand accent
- Error: `--inc-color-error`
- Brand action: `--inc-color-accent`

This prevents the user from confusing selected note, currently playing, and
primary action states.

