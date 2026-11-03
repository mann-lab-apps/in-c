# Studio alpha.38 release handoff — 2026-11-03

Published prerelease: https://github.com/mann-lab-apps/in-c/releases/tag/v0.1.0-alpha.38

- Immutable source/tag: `7732441ca6586672f3f1ad12794d6b3f6d6c5ce1`.
- Release workflow: https://github.com/mann-lab-apps/in-c/actions/runs/41581664095 — completed successfully, including all three package jobs and publication.
- Release branch: `release/studio-alpha38-final-20261103`. Post-tag evidence commits do not move the tag or alter published binaries.
- The original `in-c` workspace and other worktrees retain their existing changes. This release uses an isolated, scoped Studio snapshot; it does not imply that the original dirty workspace was committed or merged into main.

## Verification

`ci-summary.json` records full current-tag results: macOS/Windows each 352 files and 3,767 tests passed with one external opt-in skip; Linux 352 files and 3,745 tests passed with 23 skips, including unavailable optional external validators. Each platform also passed five Node-native tests, packaging verification and packaged native smoke. Skips are not external compatibility approval.

All six published assets were downloaded. Binary size, GitHub asset digest where supplied and every entry in SHA256SUMS.txt matched; see `publication.json`. `release-metadata.json` confirms authored notes and the peeled tag source.

The actual downloaded DMG was mounted read-only and detached successfully. Its app reports alpha.38, has arm64/x86_64 executables and retains `com.mannlab.inc`. Deep/strict codesign, stapler and Gatekeeper passed (`Notarized Developer ID`). The mounted app passed isolated native file/PDF/MIDI/backup smoke and muted 12-second offline piano graph/sample QA. See `published-mac.json` and local logs under `out/release-qa/published-mac/`. The piano capture was visually reviewed; generated notes, palette and playback ink are visible. This is not physical installation, listening or endurance approval.

## Website

Download metadata and fallbacks are committed as `b098bdca9a39774a652fc484e559f1ca88267aab` on `release/studio-download-alpha38-20261103`.

Draft PR: https://github.com/mann-lab-apps/in-c/pull/790

Only `site/download-manifest.json`, `site/main.js` and `site/chromatics.html` change. Published asset URLs, actual sizes and publication date are reflected. `npm run site:build`, `node scripts/verify-site-content.mjs` and `git diff --check` passed. Main merge/site deployment remains pending separate authorization under the earlier restriction. No production site update is claimed.

## Retained failures and limits

Alpha.35–37 candidates were not published. Their failure logs remain preserved: missing ignored piano assets, cross-platform newline/test scheduling issues and hidden-window frame waits. Alpha.38 includes the real licensed piano assets, byte-preserving pinned XSD policy, controlled test scheduler and visible owned smoke window. Assertions and normal tag release gates were retained. See earlier preflight/diagnosis records; historical pending observations are not overwritten by this final result.

Existing nested touch scrolling at 1400px, MuseScore transposition/nested-repeat differences and external process crashes remain unresolved. Windows is unsigned and can show SmartScreen. Physical IME, OS dialogs, screen reader, real devices and listening were not newly verified. No baseline changed. Commercial V1/RC is not declared complete.
