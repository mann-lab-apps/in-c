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

현재 판정: **조건부 가능**. backend, Windows dev advisory, multi-voice/multi-part advanced
authoring, production smoke는 제한 또는 별도 검증 항목으로 남긴다.

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
| `npm run typecheck` | Pass | [Evidence Log](evidence-log.md#2026-07-15-run) |
| `npm test` | Pass | [Evidence Log](evidence-log.md#2026-07-15-run) |
| `npm run test:components` | Pass | [Evidence Log](evidence-log.md#2026-07-15-run) |
| `npm run verify:e2e` | Pass | [Evidence Log](evidence-log.md#2026-07-15-run) |
| `npm run verify:visual-regression` | Pass | [Evidence Log](evidence-log.md#2026-07-15-run) |
| packaged app smoke | Not run | [패키지 앱 운영체제별 smoke matrix](package-app-smoke-matrix.md) |
| PDF save/open manual check | Not run in this package | [Manual Score Completion QA](../releases/manual-score-completion-qa.md) |

## Site Checklist

| 체크 | 현재 상태 | 실행/근거 |
| --- | --- | --- |
| `npm run site:build` | Pass | [Evidence Log](evidence-log.md#2026-07-15-run) |
| `npm run verify:site-content` | Pass | [Evidence Log](evidence-log.md#2026-07-15-run) |
| `npm run verify:analytics` | Pass | [Evidence Log](evidence-log.md#2026-07-15-run) |
| `npm run verify:site-seo` | Pass | [Evidence Log](evidence-log.md#2026-07-15-run) |
| production smoke | Not run | Run only after production URL/deployment approval |
| Chrome·Safari·Firefox smoke | Not run | [브라우저 호환성 smoke 기준](browser-compatibility-smoke.md) |

## Documentation Checklist

| 체크 | 현재 상태 | 실행/근거 |
| --- | --- | --- |
| Current state report exists | Pass | [Current State Report](current-state-report.md) |
| Verification matrix exists | Pass | [Verification Matrix](verification-matrix.md) |
| Traceability matrix exists | Pass | [Traceability Matrix](traceability-matrix.md) |
| Risk register exists | Pass | [Risk Register](risk-register.md) |
| Known limitations exists | Pass | [Known Limitations](known-limitations.md) |
| Evidence log exists | Pass | [Evidence Log](evidence-log.md) |
| Release notes for user-facing changes | Not run in this package | Use [Saturday Release Routine](../releases/saturday-release-routine.md) |

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
