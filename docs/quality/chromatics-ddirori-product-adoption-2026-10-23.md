# Chromatics Ddirori product adoption

This continues the October 22 draft, not a release. Existing uncommitted App,
styles, notation, playback and test changes belong to the user's separate work.
Only the two appearance imports and the AppearanceSettings instance in App are
part of this design change. No engine, release version or iOS metadata changes.

## Product boundary

| Surface | Applied | Not claimed |
| --- | --- | --- |
| Toolbar / palette | Screen tokens, density, selected / disabled / focus styling on existing commands | Catalog command/state replacement or new notation features |
| Inspector | Existing single selection, span and measure controls receive theme styling | Generic multi-selection mixed-value editing |
| Dock | Existing controls and tabs receive theme; narrow screen prioritizes score | New docking engine or arbitrary floating panels |
| Settings / mixer / dialogs | Existing product flows styled, narrow dialog bounds corrected | Hardware audio quality or every part configuration |
| Appearance | Persisted light/dark and compact/comfortable, storage failure fallback | Preferences stored in score data or cloud sync |
| Print | Appearance UI excluded; music paper/geometry unchanged | A new PDF layout engine |

The shared token/font/palette files are unchanged copies from a21ddde, with the
original OFL notice preserved. Shared catalog React components and sample state
are not copied into the score engine. Further component substitution should keep
the current product command contracts and be validated separately.

## Verification of the design-only change

Independent worktree: `/private/tmp/chromatics-ddirori-verify-20261023`, based on
7fb8178 with only staged design changes. This is not the latest product source.

- TypeScript and `npm run build`: exit 0. Development compilation only.
- Entire suite: 840 passed, 1 skipped, 63 passed files / 1 skipped, exit 0.
- Electron: 118 checks, 9 captures, exit 0. Actual native preload, isolated
  userData, native file dialogs redirected only to per-run temporary files.
- Evidence run: `run-H39C8x` under the system temporary directory's
  `chromatics-ddirori-product-evidence`. Each run writes source hashes to report.json.
- Combined worktree Electron run `run-0DYcZS`: 118 checks, 9 captures, exit 0.
  Full combined-worktree regression is being assessed separately; the independent
  pass must not be substituted for it.

The verifier checks both toolbar entry-point versions, requires actual visible
controls, uses unique output directories, compares the complete parsed native
project after save/open/save-as, and checks modal viewport bounds and stacking.
The light/dark, density, 390/840/1440 width and 100/200% text matrix is automated.
Screenshots were inspected. Native PDF from run-QkuRt1 was rendered with Poppler:
music, beams, tuplets and title visible; no tool controls in the page.

Zod PURE-comment build warnings remain. No packaging, signing, upload, merge or
push. The font license's original trailing space is excluded from diff whitespace
validation; it is not normalized.

## Reproduce

Run in the product worktree:

```sh
npm run typecheck
npm test -- --reporter=dot
npm run build
DDIRORI_PLAYWRIGHT_PATH=/absolute/path/to/playwright/index.mjs node scripts/verify-ddirori-product.mjs
```

The optional Playwright variable can be omitted when `playwright` resolves from
the project. `DDIRORI_PRODUCT_EVIDENCE` selects a parent directory; the verifier
creates a new run directory so stale exports cannot pass a new check.
For interactive preview after compilation:

```sh
env -u ELECTRON_RUN_AS_NODE electron scripts/preview-ddirori.cjs
```

Use the local Electron executable (`node_modules/.bin/electron`) if it is not on
PATH. This opens the actual desktop renderer with a fresh isolated profile, not
a browser mock. User projects and the normal application profile are not used.
