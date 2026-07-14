# in C Design Tokens

작성일: 2026-07-14

이 문서는 앱과 공개 사이트가 공유할 수 있는 1차 semantic token을 정의한다. 목표는
전체 리디자인이 아니라 현재 UI의 색상과 상태를 이름 붙여 점진 이전할 수 있게 하는
것이다.

## Semantic Color Tokens

| token | value | role |
| --- | --- | --- |
| `--inc-color-background` | `#f4f0e7` | site page background |
| `--inc-color-app-background` | `#ece8dd` | desktop app workspace background |
| `--inc-color-surface` | `#fffdf8` | cards, panels, controls |
| `--inc-color-surface-muted` | `#faf7f0` | translucent header/panel base |
| `--inc-color-text` | `#111416` | primary text |
| `--inc-color-text-soft` | `#4d5b60` | secondary text and nav |
| `--inc-color-border` | `#d4cec1` | passive borders |
| `--inc-color-border-strong` | `#c7c0b3` | controls and panel borders |
| `--inc-color-accent` | `#b43d2f` | brand action/accent |
| `--inc-color-accent-contrast` | `#fffdf8` | text on accent |
| `--inc-color-focus` | `#47616c` | keyboard focus and selected affordance |
| `--inc-color-error` | `#a33125` | destructive/error text |
| `--inc-color-disabled-opacity` | `0.38` | disabled opacity |

## Shape And Density

| token | value | role |
| --- | --- | --- |
| `--inc-font-family-ui` | `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` | shared UI font stack |
| `--inc-font-size-label` | `0.78rem` | compact labels and eyebrows |
| `--inc-font-size-body` | `1rem` | body text |
| `--inc-font-size-control` | `0.95rem` | nav and control labels |
| `--inc-font-weight-strong` | `800` | headings, active controls |
| `--inc-radius-control` | `6px` | compact controls |
| `--inc-radius-card` | `8px` | cards and panels |
| `--inc-control-height` | `46px` | site CTA and larger commands |

## Contrast Review

Reviewed 2026-07-14 by static contrast calculation.

- `#111416` on `#f4f0e7`: AA pass for normal text.
- `#4d5b60` on `#f4f0e7`: AA pass for normal text.
- `#fffdf8` on `#b43d2f`: AA pass for normal text.
- `#a33125` on `#fffdf8`: AA pass for normal text.
- `#47616c` on `#fffdf8`: AA pass for non-text UI indicators and normal text.

## Adoption Boundary

- `site/styles.css` and `src/renderer/src/styles.css` define matching token names in
  `:root`.
- 1차 적용은 background, surface, text, border, accent, focus, error, disabled
  상태에 한정한다.
- Layout, information architecture, dark mode, animation, theming UI는 후속 범위다.

