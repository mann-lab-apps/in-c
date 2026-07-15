# Verification Matrix

기준일: 2026-07-15

## Document Control

| 항목 | 값 |
| --- | --- |
| 제품 상태 기준 commit | `f526ad7 Complete notation editing issue set` |
| evidence package commit | `QUALITY_PACKAGE_COMMIT_PENDING` |
| 기준 branch | `main` |
| evidence log | [Evidence Log](evidence-log.md) |

## Result Terms

| 상태 | 의미 |
| --- | --- |
| Pass | 이번 evidence run에서 명령이 성공했다. |
| Not run | 이번 evidence run에서 실행하지 않았다. |
| Manual | 사람이 문서 또는 UI로 확인해야 한다. |
| Blocked | 외부 환경, 계정, 비용, 운영 변경 또는 OS가 필요하다. |
| Known risk | 통과하더라도 추적 중인 제한 또는 리스크가 있다. |

## App And Core Verification

| 영역 | 검증 | 종류 | 현재 결과 | Evidence | 실패 시 연결 |
| --- | --- | --- | --- | --- | --- |
| TypeScript | `npm run typecheck` | 자동 | Pass | [2026-07-15 run](evidence-log.md#2026-07-15-run) | 새 bug issue |
| Unit/integration tests | `npm test` | 자동 | Pass | [2026-07-15 run](evidence-log.md#2026-07-15-run) | 새 bug issue |
| React component shell | `npm run test:components` | 자동 | Pass | [2026-07-15 run](evidence-log.md#2026-07-15-run) | 새 bug issue |
| Editor E2E smoke | `npm run verify:e2e` | 자동/Electron | Pass | [2026-07-15 run](evidence-log.md#2026-07-15-run) | 새 bug issue |
| Notation visual regression | `npm run verify:visual-regression` | 자동/Electron | Pass | [2026-07-15 run](evidence-log.md#2026-07-15-run) | 새 renderer regression issue |
| Notation snapshots | `npm run verify:notation-snapshots` | 자동/Electron | Pass via visual regression | [2026-07-15 run](evidence-log.md#2026-07-15-run) | 새 snapshot regression issue |
| Manual score completion flow | [Manual Score Completion QA](../releases/manual-score-completion-qa.md) | Manual | Not run in this package | [Manual QA](../releases/manual-score-completion-qa.md) | 새 QA failure issue |

## Site Verification

| 영역 | 검증 | 종류 | 현재 결과 | Evidence | 실패 시 연결 |
| --- | --- | --- | --- | --- | --- |
| Static site build | `npm run site:build` | 자동 | Pass | [2026-07-15 run](evidence-log.md#2026-07-15-run) | 새 site build issue |
| Site content | `npm run verify:site-content` | 자동 | Pass | [2026-07-15 run](evidence-log.md#2026-07-15-run) | 새 content issue |
| Analytics guard | `npm run verify:analytics` | 자동 | Pass | [2026-07-15 run](evidence-log.md#2026-07-15-run) | 새 analytics issue |
| SEO metadata | `npm run verify:site-seo` | 자동 | Pass | [2026-07-15 run](evidence-log.md#2026-07-15-run) | 새 SEO issue |
| Production site smoke | `npm run verify:site-production` | 자동/network | Not run in this package | [Release checklist](release-readiness-checklist.md#deployment-and-rollback) | deployment issue |

## Security And Dependency Verification

| 영역 | 검증 | 종류 | 현재 결과 | Evidence | 실패 시 연결 |
| --- | --- | --- | --- | --- | --- |
| npm audit moderate+ | `npm audit --audit-level=moderate` | 자동 | Pass; one low severity esbuild Windows advisory remains | [2026-07-15 run](evidence-log.md#2026-07-15-run) | #8 or security issue |
| Windows advisory impact | Windows `npm run dev`, `npm run build`, audit | Manual/OS-specific | Blocked on Windows environment | [Risk R-004](risk-register.md#r-004-windows-dev-server-advisory-remains-unverified) | #8 |
| Secret handling | Supabase/env not configured in repo | Manual | Not applicable for current static/editor package | [Risk R-001](risk-register.md#r-001-supabase-backend-is-not-operational) | #316 |

## Documentation And Issue Verification

| 영역 | 검증 | 종류 | 현재 결과 | Evidence | 실패 시 연결 |
| --- | --- | --- | --- | --- | --- |
| Markdown path sanity | `rg` path checks for quality docs | 자동/manual hybrid | Pass | [2026-07-15 run](evidence-log.md#2026-07-15-run) | #320 follow-up |
| Open issue inventory | `gh issue list --state open` | 자동/GitHub | Pass | [Evidence Log](evidence-log.md#github-state) | #320 follow-up |
| Risk linkage | open issues linked in risk/known limitation docs | Manual | Pass | [Risk Register](risk-register.md), [Known Limitations](known-limitations.md) | #320 follow-up |

## Manual Verification Boundary

수동 확인으로 남기는 항목:

- packaged app install/open on each OS
- Windows dev server advisory impact
- production deployment URL smoke test after an actual deployment
- Supabase project/RLS/env behavior after user-approved external setup
- human review of release notes and known limitations wording

수동 항목은 통과로 추정하지 않는다. 실행 전까지 `Not run`, `Blocked`, 또는 `Manual`로 유지한다.

