# Traceability Matrix

기준일: 2026-07-15

## Document Control

| 항목 | 값 |
| --- | --- |
| 제품 상태 기준 commit | `f526ad7 Complete notation editing issue set` |
| evidence package commit | `QUALITY_PACKAGE_COMMIT_PENDING` |
| 기준 branch | `main` |

## Notation Editor

| 기능/요구사항 | GitHub 이슈 | 검증 | 문서 근거 | 현재 상태 |
| --- | --- | --- | --- | --- |
| 새 악보 생성, metadata, tempo 기본값 | 닫힌 MVP 이슈군 | `npm run verify:e2e`, `npm run test:components` | [Manual QA](../releases/manual-score-completion-qa.md) | 지원 |
| 단성부 음표/쉼표 입력 | 닫힌 MVP 이슈군 | `npm run verify:e2e`, `npm test` | [Agent Workflow](../product/agent-workflow.md) | 지원 |
| 음가 변경, dots, range copy/paste/delete | 닫힌 MVP 이슈군 | `npm run verify:e2e`, `npm test` | [Manual QA](../releases/manual-score-completion-qa.md) | 지원 |
| ties, tuplets, articulation, fermata, breath marks | 닫힌 MVP/extension 이슈군 | `npm run verify:e2e`, `npm test` | [Notation Extension Roadmap](../architecture/notation-extension-roadmap.md) | 지원 |
| chord notes | #34 closed | `npm test`, `npm run verify:visual-regression` | [Notation Extension Roadmap](../architecture/notation-extension-roadmap.md#chord-notes) | 지원 |
| harmony symbols | #35 closed | `npm test`, `npm run test:components` | [Notation Extension Roadmap](../architecture/notation-extension-roadmap.md#harmony-symbols) | 지원 |
| lyrics | #36 closed | `npm test`, `npm run test:components` | [Notation Extension Roadmap](../architecture/notation-extension-roadmap.md#lyrics) | 지원 |
| repeats | #92 closed | `npm test`, `npm run verify:visual-regression` | [Notation Extension Roadmap](../architecture/notation-extension-roadmap.md#repeats-and-endings) | 지원, first/second endings excluded |
| grace notes and ornaments | #101 closed | `npm test`, `npm run test:components` | [Notation Extension Roadmap](../architecture/notation-extension-roadmap.md#grace-notes-and-ornaments) | 지원 |
| positioned tempo map | #211 closed | `npm test`, `npm run verify:visual-regression` | [Notation Extension Roadmap](../architecture/notation-extension-roadmap.md#tempo-marking-and-tempo-map) | 지원, text-only curves excluded |
| tempo beat unit/text | #229 closed | `npm test`, `npm run test:components` | [Notation Extension Roadmap](../architecture/notation-extension-roadmap.md#tempo-marking-and-tempo-map) | 지원 |
| octave shifts | #264 closed | `npm test`, `npm run verify:visual-regression` | [Notation Extension Roadmap](../architecture/notation-extension-roadmap.md#octave-lines) | 지원, playback pitch shift excluded |
| clef changes | #265 closed | `npm test`, `npm run test:components` | [Notation Extension Roadmap](../architecture/notation-extension-roadmap.md#clef-editing) | 지원 |
| tremolo | #266 closed | `npm test`, `npm run test:components` | [Notation Extension Roadmap](../architecture/notation-extension-roadmap.md#tremolo) | 지원, actual repeated oscillator playback excluded |
| multi-voice same staff | #93 open | `npm test` partial | [Known Limitations](known-limitations.md#multi-voice-editing-is-not-complete) | 부분 지원 |
| multiple parts/ensemble score | #94 open | `npm test` partial | [Known Limitations](known-limitations.md#multi-part-ensemble-editing-is-not-complete) | 부분 지원 |

## MusicXML And Notation Rendering

| 기능/요구사항 | GitHub 이슈 | 검증 | 문서 근거 | 현재 상태 |
| --- | --- | --- | --- | --- |
| MusicXML MVP parse/export | MVP issue history | `npm test` | [MusicXML MVP](../musicxml-mvp.md) | 지원 subset |
| Release QA MusicXML fixture | #237 closed | `npm run verify:visual-regression` | [Release QA Visual Regression](../testing/release-qa-visual-regression.md) | 지원 |
| Snapshot baseline | #237 closed | `npm run verify:notation-snapshots` | [Notation Snapshot Baseline](../testing/notation-snapshot-baseline.json) | 지원 |
| VexFlow renderer behavior | renderer architecture | `npm run verify:visual-regression` | [Renderer Choice](../architecture/renderer-choice.md) | 지원 |

## Site, Analytics, And SEO

| 기능/요구사항 | GitHub 이슈 | 검증 | 문서 근거 | 현재 상태 |
| --- | --- | --- | --- | --- |
| Static site build | closed site issue history | `npm run site:build` | [Site Docs](../site.md) | 지원 |
| Site content integrity | closed site issue history | `npm run verify:site-content` | [Composition Pipeline](../product/compositions/collection-pipeline.md) | 지원 |
| Analytics instrumentation guard | closed analytics issue history | `npm run verify:analytics` | [Analytics Events](../product/analytics-events.md), [Analytics Operations](../product/analytics-operations.md) | 지원 |
| SEO metadata | closed SEO issue history | `npm run verify:site-seo` | [Site Docs](../site.md) | 지원 |
| Production smoke | deployment issue history | `npm run verify:site-production` | [Production Playbook](../operations/production-playbook.md) | 미확인 in this package |

## Backend And Operations

| 기능/요구사항 | GitHub 이슈 | 검증 | 문서 근거 | 현재 상태 |
| --- | --- | --- | --- | --- |
| Supabase schema/auth/RLS/env | #316 open | Not run; external setup required | [Supabase Backend Plan](../product/supabase-backend-plan.md) | 보류 |
| Hosting/backend strategy | #319 closed, #316 open | Manual review | [Hosting And Backend Strategy](../operations/hosting-and-backend-strategy.md) | 전략 문서 있음, backend 미운영 |
| Release routine | #320 | Manual plus automated commands | [Saturday Release Routine](../releases/saturday-release-routine.md), [Release Readiness Checklist](release-readiness-checklist.md) | 이 package로 고도화 |
| Windows advisory | #8 open | Windows manual run required | [Windows Dev Audit](../security/windows-dev-audit.md) | 보류 |

## Traceability Rules

- `지원`은 관련 command가 있거나 이번 evidence run에서 통과했고, 사용자-facing limitation이 문서화된 상태다.
- `부분 지원`은 모델/test 일부가 존재하지만 사용자-facing workflow 또는 edge case가 열린 이슈로 남은 상태다.
- `보류`는 외부 승인, 운영 계정, OS 환경, 비용, DNS, production 변경이 필요한 상태다.
- 새 실패는 기존 open issue가 정확히 맞으면 연결하고, 아니면 새 bug/release-blocker issue를 만든다.

