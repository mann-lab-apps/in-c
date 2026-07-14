# Brand Asset Inventory

작성일: 2026-07-14

## Current Assets

| asset | path | current decision |
| --- | --- | --- |
| App icon SVG | `build/icon.svg` | keep for alpha; readable as music/editor symbol |
| App icon PNG | `build/icon.png` | keep for Windows/Linux packaging |
| App icon ICNS | `build/icon.icns` | keep for macOS packaging |
| Site icon SVG | `site/assets/icon.svg` | keep and align with app icon direction |
| App preview SVG | `site/assets/app-preview.svg` | keep as product preview asset |
| Social preview PNG | `site/public/social-preview.png` | keep for current Open Graph/Twitter preview |

## Wordmark

No separate production wordmark file is required for the current alpha. The text
wordmark `in C` remains the canonical public label. A vector wordmark can be added
after the app/web naming decision stabilizes.

## Export Rules

- Source-like editable assets stay in `build/` or `site/assets/`.
- Generated packaging assets stay in `build/`.
- Public web preview assets stay in `site/public/`.
- Do not generate platform icons from screenshots.
- Re-export icons before a signed release if the app name or wordmark changes.

## Size Review

The current icon family is acceptable for alpha packaging and website preview use.
Before a signed release, check these sizes manually:

- 16px: favicon/taskbar recognition
- 32px: dock/taskbar recognition
- 128px: app launcher recognition
- 512px+: store/social preview contexts

