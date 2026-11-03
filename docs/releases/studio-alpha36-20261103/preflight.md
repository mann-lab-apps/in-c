# Studio alpha.36 release preparation

alpha.35 remains immutable and unpublished. Its Linux job passed the full test gate (352 files, 3745 tests passed, 23 skipped, Node-native 5 passed), then failed immediately because the piano runtime bank was present locally but ignored by Git. The initial release preparation did not verify a fresh checkout build. The original failure tail is retained in the alpha.35 worktree output; its hash and exact failure excerpt are in alpha35-failure.json.

alpha.36 versions the existing validated 120 OGG samples (13.03 MiB), manifest, CC BY 3.0 license and attribution. Raw WAV/cache files remain ignored. Audio bytes and engine behavior are unchanged. Release CI now verifies the pinned bank before the long test gate, while build retains the same verification.

The full-test command adds Vitest's documented `--silent=passed-only` reporting option. This suppresses console output from successful tests while retaining failed-test logs, every existing assertion, test count and timeout. The alpha.35 Linux job generated approximately 160 MB of repeated no-Canvas diagnostics. No assertion is removed and no latency/timeout limit is increased.

The next candidate is tested from a newly created checkout containing only committed files, with a fresh npm ci, before tag publication. Existing alpha.35 source, version and validation commits are preserved. The alpha.36 version-only commit and tag are separate from this packaging correction. macOS signing/notarization settings and the existing application identity remain unchanged.
