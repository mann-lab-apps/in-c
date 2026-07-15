# Current State Report

기준일: 2026-07-15

## Document Control

| 항목 | 값 |
| --- | --- |
| 제품 상태 기준 commit | `f526ad7 Complete notation editing issue set` |
| initial evidence package commit | `7364290 Add quality evidence package` |
| quality follow-up 기준 commit | `6fb9698 Refine quality evidence follow-up` |
| documentation record commit | `25db95f Record quality follow-up commit` |
| 기준 branch | `main` |
| GitHub repository | `mann-lab-apps/in-c` |
| 상태 판정 | 조건부 가능 |
| 판정 범위 | Electron notation editor, static site, quality documentation |
| 판정 제외 | Supabase production backend, Windows native dev verification, full multi-voice/multi-part editing |

## Executive Summary

현재 `main`은 앱 핵심 편집기, MusicXML round-trip, notation renderer snapshot, 사이트
검증, analytics/SEO 정적 검증을 문서화된 명령으로 확인할 수 있는 상태다. 현재 열린
이슈는 `#322`, `#321`, `#316`, `#94`, `#93`, `#8`이며, 그중 `#316`, `#94`, `#93`,
`#8`은 제품 제한 또는 운영 리스크로 추적한다. `#321`과 `#322`는 이 evidence package
감사에서 분리된 문서/운영 정렬 후속 이슈다. `#320`은 닫혔고, 이 문서 세트의 원 작업
이슈로만 추적한다.

릴리즈 판단은 **조건부 가능**이다. 현재 앱/사이트 표면은 prerelease 또는 내부 QA 후보로
제시할 수 있지만, Supabase 기반 백엔드 운영 전환, Windows 개발 환경 감사 경고 확인,
다중성부/다중파트의 완성형 편집 UX는 출시 범위에서 제외하거나 known limitation으로
명시해야 한다.

핵심 검토 문서:

- [Risk Register](risk-register.md)
- [Release Readiness Checklist](release-readiness-checklist.md)
- [Known Limitations](known-limitations.md)

상세 근거:

- [Verification Matrix](verification-matrix.md)
- [Traceability Matrix](traceability-matrix.md)
- [Evidence Log](evidence-log.md)

## Product Surface Status

| 표면 | 현재 상태 | 판단 | 근거 |
| --- | --- | --- | --- |
| Electron notation editor | 단성부 편집, 주요 notation extension, MusicXML, PDF/export shell, playback 검증 경로 보유 | 조건부 가능 | [Verification Matrix](verification-matrix.md#app-and-core-verification), [Traceability Matrix](traceability-matrix.md#notation-editor) |
| MusicXML import/export | MVP subset과 최근 notation extension round-trip 테스트 보유 | 조건부 가능 | [Traceability Matrix](traceability-matrix.md#musicxml-and-notation-rendering) |
| Renderer visual regression | release QA fixture와 snapshot 검증 경로 보유 | 조건부 가능 | [Evidence Log](evidence-log.md#2026-07-15-run) |
| Static site | build/content/analytics/SEO 검증 명령 보유 | 조건부 가능 | [Verification Matrix](verification-matrix.md#site-verification) |
| Backend/Supabase | 설계 문서만 존재, 실제 project/schema/env/RLS 미적용 | 보류 | [Risk Register R-001](risk-register.md#r-001-supabase-backend-is-not-operational), #316 |
| Production deployment | production smoke 검증 명령은 있으나 이번 package에서 실제 production 전환은 수행하지 않음 | 미확인 | [Release Readiness Checklist](release-readiness-checklist.md#deployment-and-rollback) |
| Windows development environment | low severity esbuild/Vite advisory 영향 확인 필요 | 보류 | [Risk Register R-004](risk-register.md#r-004-windows-dev-server-advisory-remains-unverified), #8 |

## Open Issues And Release Impact

| 이슈 | 제목 | 영향 | 현재 판단 |
| --- | --- | --- | --- |
| #316 | Supabase 기반 백엔드 구축 | 서비스 backend, auth, RLS, env 운영 범위 미완료 | backend 포함 릴리즈 보류 |
| #94 | 여러 악기 파트와 합주보 스코어 구조 지원 | 여러 악기 파트 생성/편집/렌더링 완성 범위 미완료 | known limitation |
| #93 | 같은 오선 내 다중성부 입력·렌더링 모델 구현 | 같은 staff의 독립 voice 편집 UX 미완료 | known limitation |
| #8 | Windows 개발 환경에서 esbuild/Vite 감사 경고 확인 | Windows dev server advisory 영향 미확인 | Windows 개발 환경 확인 전 보류 |
| #321 | 제품 상태 문서와 feature map을 최신 notation 지원 상태와 동기화 | 제품 상태 문서가 quality traceability보다 뒤처질 수 있음 | 문서 정렬 후속 |
| #322 | CI와 quality evidence 검증 범위 정렬 | GitHub Actions 녹색 체크와 evidence package 전체 통과 범위가 다름 | 운영 검증 정렬 후속 |

닫힌 이슈 `#320`은 이 evidence package의 원 작업 이슈다. 현재 open inventory에는 포함하지
않으며, 후속 보완 결과만 #320 코멘트로 남긴다.

## Recent Closed Issue Context

2026-07-15에 notation extension 관련 이슈가 대량으로 닫혔다. 닫힌 기능은 현재
[Traceability Matrix](traceability-matrix.md)에 기능, 테스트, 문서 근거로 연결한다.
릴리즈 노트 작성 시 다음 영역을 사용자-facing 변경으로 묶을 수 있다.

- chord notes, harmony symbols, lyrics, grace notes, ornaments
- repeat barlines, octave shifts, clef changes, tremolo markings
- tempo beat unit/text와 positioned tempo events

## Current Decision

| 판정 | 설명 |
| --- | --- |
| 조건부 가능 | Electron editor와 static site는 현재 검증 명령이 통과하면 prerelease 후보로 볼 수 있다. |
| 조건 | release notes와 known limitations에 #316, #94, #93, #8을 명시한다. |
| 보류 범위 | backend 운영 전환, Windows dev-server advisory 검증, multi-voice/multi-part 완성 UX. |
| 다음 행동 | [Release Readiness Checklist](release-readiness-checklist.md)를 기준으로 release candidate 여부를 다시 판정한다. |

## Review Protocol

의사결정자는 먼저 이 문서, [Risk Register](risk-register.md),
[Release Readiness Checklist](release-readiness-checklist.md)를 읽는다. 특정 판단의 근거가
필요하면 [Verification Matrix](verification-matrix.md), [Traceability Matrix](traceability-matrix.md),
[Evidence Log](evidence-log.md)를 따라간다.
