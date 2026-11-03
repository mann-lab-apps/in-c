# Studio alpha.39 release preparation — 2026-11-03

User authorized commit, push and release of the verified desktop-brand/notation feedback snapshot. Existing alpha.38 assets/tag stay immutable. Work is isolated on feature/studio-desktop-brand-20261103; the original workspace and other worktrees are preserved. This authorization is not a main/site merge.

Feature checkpoint: 841b1ec7. Source and original validation evidence: ../studio-desktop-brand-20261103/handoff.md. The recorded uncommitted state and alpha.38 build version there are historical validation facts, not rewritten to claim alpha.39 binaries were tested then.

Local full feature gate: 364 files/3,811 tests PASS, one external opt-in skipped; five Node-native checks PASS,1,026 frozen inputs unchanged. alpha.39 changes package/lock versions and the version-preservation regression expectation only; actual alpha.39 full tests/packaging must run on the release workflow.

The first feature commit included a generated unified patch whose mandatory blank context lines triggered git diff --check. The command sequence did not stop before commit; the failure was observed and is not recorded as a pass. A single exact-path -whitespace attribute treats that evidence format correctly without disabling checks for product/source files or changing the original patch bytes.

Release plan: candidate branch publication → Linux/Windows packaged preflight without publication → immutable v0.1.0-alpha.39 tag → full macOS/Windows/Linux release jobs → signing/notarization/artifact/smoke gates → GitHub prerelease → download/digest/signed macOS verification. No local ad-hoc artifact is uploaded as a signed release.

Website PR790 and production download manifests are not changed by this release preparation. Native desktop changes do not require iOS metadata changes. Unavailable physical-device/listening/external-app checks remain explicit limitations.
