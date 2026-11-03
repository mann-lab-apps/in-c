> 이 파일은 키보드/박자표/곡선 후속 전의 중간 체크포인트다. 최신 결과는 [handoff.md](handoff.md)를 따른다. 과거 실행 중 표기는 당시 상태로 보존한다.

# Studio desktop brand + user feedback checkpoint

Isolated worktree: `/Users/jaemankim/Desktop/privates/coding/worktrees/studio-desktop-brand-20261103`; branch `feature/studio-desktop-brand-20261103`; base `653497ac7a7fa692db430a1420040ed6fd6bf253`. All changes are uncommitted. No push, tag/version change, release, site update or notarization upload performed. Original workspace, user `/Applications/in-C.app` and other worktrees preserved.

## Implemented / verified so far

- `띠로리 Studio` in package productName, HTML/native title, preload display name, native app/About menu and native dialogs. Document title reflects committed score title/dirty state; draft edits and failed saves do not falsely change it.
- `appId=com.mannlab.inc`, package name, `.chromatics` schema, IPC names, preference keys, Linux desktopName and Windows/Linux executable identities remain stable. Runtime explicitly retains `appData/in-C` for userData/sessionData before ready. Isolated real Electron seed/relaunch retained existing file-origin localStorage, dock207/360, recovery, recent index, backups and source native bytes.
- Current original-workspace `assets/icon-studio.svg` copied verbatim; pinned source/manifest hash in icon-source.json. Build PNG/ICNS/ICO generated with resvg2.6.2/iconutil; ICO was explicitly unignored. No historical brand asset/manifest regeneration.
- Local macOS package initially crashed before JavaScript. Re-signing alone did not fix SIGTRAP. A normalization-only control made CFBundleName byte-identical to the builder's NFD helper/executable names and passed native smoke; production mac.extendInfo now preserves that relationship. Public display remains visibly 띠로리 Studio. Regression checks compare actual builder AppInfo.
- New score tempo draft keeps 1→12→120 and out-of-range999 instead of clamping to40/240. Enter/submit/blur validation, help, Escape, blank/fractional values and IME guard covered. Actual960/1400 native-input QA retained999, restored120 and created/saved80bpm.
- Visible grace attach/remove Alt+G and convert Alt+Shift+G. Approved conversion removes the selected timed single note, moves later events earlier in the same bar, adds trailing rests and keeps effective accidental inheritance. Unsupported attachments/ties/tuplets/chord/anchor cases explain why. Native undo/redo and native/XML/MIDI roundtrip tests pass. Existing model represents slashed eighth-shaped grace notes, not arbitrary grace durations.
- Existing safe duration edit remains primary. If it cannot consume a following note, an explicit confirmation can overwrite overlapping notes via existing voice/rhythm transactions. Cancel changes nothing; apply preserves the bar/other voices/unaffected positions, retains surviving accidental inheritance and undoes in one action. Partially overlapping notes are fully replaced and their uncovered tail becomes rests, as stated in the dialog. Protected ties/anchors/tuplets remain blocked with readable reasons instead of internal IDs.
- Expanded Help → 단축키 도움말 and docs/product/studio-user-guide.md explain modes, actual octave/diatonic/chromatic mappings, grace, voices, selection, file format save boundaries, draft/IME and playback. Keymap differences from MuseScore are explicit; keymap parity work is still queued.

## Actual evidence

- `out/brand-qa/focused-freeze-a.log`: nine files/27 tests passed. Typecheck/build passed. Earlier tool/test failures retained separately.
- `compat-integrated-a/current.json`, `compat-integrated-b/current.json`: real Electron main/preload/renderer, native pointer/editing commands,960/1400, project writes, each undo, duration cancel/apply and help; isolated appData and dialog adapters. Not physical OS dialog/IME approval.
- Two grace PDFs: three A4 pages each; every960/1400 raster pair identical. All three unique page rasters visually reviewed. Existing inherited fixture requests two pages but produces three with its ordinary layout warning; do not claim the target-page warning was fixed.
- `out/brand-qa/dmg-final.json`: local arm64 DMG mounted read-only, visible volume/app name, bundleID/version, icon hashes, deep/strict ad-hoc verification and mounted full packaged native smoke passed; detached. Not universal/Developer ID/notarization approval. Native smoke includes project/recovery/backups, MusicXML/MXL, MIDI and PDF/part-view assertions.
- `profile-a.log`, `fixed-a.log`: current Studio notation profile and fixed-canvas passes; no baseline change. Historical responsive failures are not converted into approvals.
- Full `npm run test:all` is running against `suite-input-a.json` (926 scoped inputs). Do not claim PASS until suite-result-a.json and final summaries exist. No product/test/QA edits or build/Electron runs during the full suite.

The first local `identity=-` CLI attempt unexpectedly selected a local Developer ID identity. That owned process was stopped; no notarization/upload. Subsequent local packages used identity=null and a separate offline `codesign --sign -` afterPack hook. The incomplete attempt is not a validated artifact. A later source-only help entry-point wording correction is recorded separately from earlier package source bytes.

## Remaining execution queue

See docs/product/studio-desktop-feedback-backlog-20261103.md. CURVE-01: actual current slur is a uniform1.6 stroke in #111827, while VexFlow ties are filled black curves; tapered profile/ink/endpoint/manual/cross-system QA pending. KEYMAP-01: confirmed MuseScore ↑/↓ semitone, Alt↑/↓ selection, AltShift↑/↓ diatonic and Cmd/Ctrl↑/↓ octave. Current Studio mapping differs; no local MuseScore GUI result claimed. Full suite results and any failures must be handled before the next code slice.

Windows/Linux actual runtime, physical Finder/Dock screenshot/installer interaction, real IME, screen reader, listening, external app MusicXML/MIDI comparison and physical devices remain unverified. No Commercial V1/RC completion claim.
