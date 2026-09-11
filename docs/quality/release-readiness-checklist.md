# Release Readiness Checklist

기준일: 2026-07-15

## Document Control

| 항목 | 값 |
| --- | --- |
| 제품 상태 기준 commit | `f526ad7 Complete notation editing issue set` |
| initial evidence package commit | `7364290 Add quality evidence package` |
| quality follow-up 기준 commit | `6fb9698 Refine quality evidence follow-up` |
| 기준 branch | `main` |

## Decision Categories

| 판정 | 기준 | 다음 행동 |
| --- | --- | --- |
| 출시 가능 | 자동 검증 통과, release notes/known limitations 준비, production smoke 또는 package smoke 완료 | tag/release 절차 진행 |
| 조건부 가능 | 핵심 자동 검증 통과, 일부 제한이 known limitation으로 설명 가능 | 제한사항을 릴리즈 노트에 포함하고 승인 후 진행 |
| 보류 | 핵심 테스트 실패, data/security/production risk 미해소, blocker issue open | blocker issue 처리 후 재판정 |

현재 Chromatics Desktop V1 웹 랜딩 공개 판정: **진행 가능**. 로컬 자동 검증과 macOS
unpacked packaged smoke는 최신 pass 상태이며, 제품 owner가 실제 수동 QA를 별도로 수행하기로
했다. Desktop app public RC signoff 자체는 실제 외부 앱 MusicXML export fixture, file dialog
기반 packaged app save/open/export, PDF/MIDI 외부 앱 열기, playback/mixer 청감 QA,
installer/DMG, Windows packaged smoke evidence가 채워진 뒤 판정한다. 이 항목은 professional
V1 blocker이므로 public V1 known limitation으로 옮기지 않는다. Linux는 V1 public release
target이 아니라 post-V1 follow-up target이다. Commercial V1 기준으로는 toolbar information
architecture 첫 slice가 들어갔지만, 전문 사보앱 수준의 최종 UI 분리는 아직 release
blocker로 남는다.

## Core Checklist

| 영역 | 체크 | 현재 상태 | Evidence |
| --- | --- | --- | --- |
| 기준 commit 고정 | release 대상 commit과 branch가 명시되어 있다. | Pass | [Current State Report](current-state-report.md#document-control) |
| 열린 이슈 검토 | release blocker와 limitation을 구분했다. | Pass | [Current State Report](current-state-report.md#open-issues-and-release-impact) |
| 앱 검증 | typecheck/test/component/E2E/visual regression이 통과했다. | Pass | [Evidence Log](evidence-log.md#2026-07-15-run) |
| 사이트 검증 | site build/content/analytics/SEO가 통과했다. | Pass | [Evidence Log](evidence-log.md#2026-07-15-run) |
| audit/security | moderate+ audit가 통과했고 low advisory가 추적된다. | Pass with known risk | [Risk R-004](risk-register.md#r-004-windows-dev-server-advisory-remains-unverified) |
| known limitations | 사용자-facing 제한사항이 문서화되어 있다. | Pass | [Known Limitations](known-limitations.md) |
| risk register | open risks가 owner issue와 연결되어 있다. | Pass | [Risk Register](risk-register.md) |
| traceability | 주요 기능, 이슈, 검증, 문서 근거가 연결되어 있다. 남은 제품 상태/CI 정렬은 #321/#322에서 추적한다. | Pass with tracked follow-ups | [Traceability Matrix](traceability-matrix.md) |

## App Release Checklist

| 체크 | 현재 상태 | 실행/근거 |
| --- | --- | --- |
| `npm run typecheck` | Pass | [Evidence Log](evidence-log.md#2026-09-03-pdf-page-setup-renderer-contract-run) |
| `npm test` | Pass | Latest sweep: [Evidence Log](evidence-log.md#2026-09-03-automatable-v1-gate-sweep) |
| `npm run test:components` | Pass | [Evidence Log](evidence-log.md#2026-07-15-run) |
| Commercial V1 toolbar context | Partial | 현재 작업/입력/part-staff-voice/음가/재생 상태 context strip과 compact panel layout 첫 slice 완료. 최종 palette/inspector/work mode 분리는 남음. Latest evidence: [Evidence Log](evidence-log.md#2026-09-04-commercial-v1-toolbar-information-architecture-slice) |
| `npm run verify:e2e` | Pass | Latest sweep: [Evidence Log](evidence-log.md#2026-09-03-automatable-v1-gate-sweep) |
| `npm run verify:visual-regression` | Pass | Latest sweep: [Evidence Log](evidence-log.md#2026-09-03-automatable-v1-gate-sweep); collision and dense lane evidence: [Evidence Log](evidence-log.md#2026-09-03-engraving-collision-span-lane-run), [Evidence Log](evidence-log.md#2026-09-03-engraving-dense-upper-annotation-lane-run) |
| `npm run verify:musicxml-fixtures` | Partial | Compatibility seed fixture QA, manifest metadata gate, supported notation expectation, and warning path snapshot pass; real MuseScore/Dorico/Sibelius/Finale app-export fixture collection remains required in [External MusicXML Fixture QA](external-musicxml-fixture-qa.md#real-app-export-fixtures-required-before-public-rc). Latest automated evidence: [Evidence Log](evidence-log.md#2026-09-03-automatable-v1-gate-sweep) |
| `npm run verify:midi-fixtures` | Pass | Latest sweep: [Evidence Log](evidence-log.md#2026-09-03-automatable-v1-gate-sweep); playback/mixer slice evidence: [Evidence Log](evidence-log.md#2026-09-03-playback-mixer-qa-run) |
| packaged app smoke | Partial | macOS arm64 unpacked app `npm run package:dir` and `npm run verify:package` passed on 2026-09-03, including preload bridges, start screen/actions, string quartet score workspace/title/notation SVG, smoke-only MusicXML file write/recent reopen, score PDF structure, Cello part view page/title metadata, visible event part id, compact parts page setup metadata, PDF target/write/structure, MIDI type-1 tempo/note track structure, and autosave round-trip; OS/install/manual matrix remains in [패키지 앱 운영체제별 smoke matrix](package-app-smoke-matrix.md). Latest evidence: [Evidence Log](evidence-log.md#2026-09-03-packaged-compact-part-page-setup-metadata-run) |
| PDF save/open manual check | Not run in this package | Automated part view/PDF renderer target coverage includes import-origin annotation filtering and page setup metadata contract checks; actual file dialog save/open visual review remains in [Manual Score Completion QA](../releases/manual-score-completion-qa.md) |
| RC manual/external QA | Not run | 2026-09-03 environment audit found no MuseScore/Dorico/Sibelius/Finale app installs under `/Applications`; GarageBand 10.4.12 is present but MIDI open/listening QA was not performed because it requires a human-operated GUI session. Latest audit: [Evidence Log](evidence-log.md#2026-09-03-rc-manual-external-qa-availability-audit) |
| Linux package policy | Post-V1 | V1 desktop package gate targets macOS and Windows. Linux AppImage smoke is a post-V1 follow-up unless a Linux artifact is explicitly promoted before release. |
| V1 web landing release | Pass | Chromatics landing copy and download manifest are prepared for Mac/Windows V1 public web release; Linux is shown as post-V1. Latest evidence: [Evidence Log](evidence-log.md#2026-09-03-chromatics-v1-web-landing-release-prep) |

## Site Checklist

| 체크 | 현재 상태 | 실행/근거 |
| --- | --- | --- |
| `npm run site:build` | Pass | [Evidence Log](evidence-log.md#2026-07-15-run) |
| `npm run verify:site-content` | Pass | Latest sweep: [Evidence Log](evidence-log.md#2026-09-03-automatable-v1-gate-sweep) |
| `npm run verify:analytics` | Pass | [Evidence Log](evidence-log.md#2026-07-15-run) |
| `npm run verify:site-seo` | Pass | [Evidence Log](evidence-log.md#2026-07-15-run) |
| production smoke | Not run | Run only after production URL/deployment approval |
| Chrome·Safari·Firefox smoke | Not run | [브라우저 호환성 smoke 기준](browser-compatibility-smoke.md) |
| 사이트 접근성 수동 QA | Not run | [사이트 접근성 수동 QA](site-accessibility-manual-qa.md) |

## Documentation Checklist

| 체크 | 현재 상태 | 실행/근거 |
| --- | --- | --- |
| Current state report exists | Pass | [Current State Report](current-state-report.md) |
| Verification matrix exists | Pass | [Verification Matrix](verification-matrix.md) |
| Traceability matrix exists | Pass | [Traceability Matrix](traceability-matrix.md) |
| Risk register exists | Pass | [Risk Register](risk-register.md) |
| Known limitations exists | Pass | [Known Limitations](known-limitations.md) |
| Evidence log exists | Pass | [Evidence Log](evidence-log.md) |
| Release notes for user-facing changes | Drafted for V1 save policy | [Chromatics V1 Release Notes Draft](../releases/chromatics-v1-release-notes-draft.md); final notes remain gated by [Saturday Release Routine](../releases/saturday-release-routine.md) and unresolved professional blockers |

## Deployment And Rollback

| 체크 | 현재 상태 | 기준 |
| --- | --- | --- |
| Production URL smoke | Not run | Run `npm run verify:site-production` after deployment approval. |
| DNS/hosting change | Not run | Requires explicit approval before external operation. |
| GitHub Pages disable or host migration | Not run | Requires explicit approval and rollback checklist. |
| Rollback path | Manual | Follow [Production Playbook](../operations/production-playbook.md). |
| Release tag | Not run | Use release checklist under `docs/releases/checklists/`. |

## Blocker Rules

새 실패가 발생하면 다음 기준으로 처리한다.

- data loss, save/open failure, app crash, security moderate+ failure: release blocker issue 생성.
- visual clipping or layout regression: renderer regression issue 생성, blocker 여부는 affected workflow로 판단.
- production URL, DNS, hosting, backend env failure: operations issue 생성, release 보류.
- manual QA wording/minor docs issue: known issue 또는 release note task로 분류.
