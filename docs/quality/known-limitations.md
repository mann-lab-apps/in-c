# Known Limitations

기준일: 2026-07-15

## Document Control

| 항목 | 값 |
| --- | --- |
| 제품 상태 기준 commit | `f526ad7 Complete notation editing issue set` |
| initial evidence package commit | `7364290 Add quality evidence package` |
| quality follow-up 기준 commit | `6fb9698 Refine quality evidence follow-up` |
| documentation record commit | `25db95f Record quality follow-up commit` |
| 기준 branch | `main` |

## Purpose

이 문서는 사용자, QA 담당자, 운영자가 현재 제품의 의도적 미지원 범위와 미완성 기능을
구분하도록 돕는다. 아래 항목은 release notes 또는 prerelease 안내에 필요한 경우
요약해서 포함한다.

## Backend Is Not Live

| 항목 | 내용 |
| --- | --- |
| 유형 | 미완성 기능 |
| 연결 이슈 | #316 |
| 제한 | Supabase project, schema, RLS/auth, env가 실제 운영 환경에 적용되지 않았다. |
| 사용자 영향 | 계정, 커뮤니티 데이터, 서버 CRUD가 필요한 기능은 현재 제품 범위 밖이다. |
| 문서 근거 | [Supabase Backend Plan](../product/supabase-backend-plan.md), [Risk R-001](risk-register.md#r-001-supabase-backend-is-not-operational) |

## Multi-Voice Editing Is Not Complete

| 항목 | 내용 |
| --- | --- |
| 유형 | 부분 지원 |
| 연결 이슈 | #93 |
| 제한 | 같은 staff 안에서 여러 독립 voice를 완전하게 입력/전환/편집하는 UX가 남아 있다. |
| 사용자 영향 | 복잡한 피아노/합창/대위적 악보 작성은 제한된다. |
| 현재 가능 | 단성부, chord notes, 일부 internal voice model/playback test. |
| 문서 근거 | [Risk R-002](risk-register.md#r-002-multi-voice-editing-is-not-complete) |

## Multi-Part Ensemble Editing Is Not Complete

| 항목 | 내용 |
| --- | --- |
| 유형 | 부분 지원 |
| 연결 이슈 | #94 |
| 제한 | 여러 악기 파트를 추가/삭제/이름 변경하고 독립 staff로 완성 렌더링하는 workflow가 남아 있다. |
| 사용자 영향 | 합주보/앙상블 score authoring은 아직 안정 지원으로 보지 않는다. |
| 현재 가능 | 단일 part 중심 workflow, multi-part playback addressing 일부. |
| 문서 근거 | [Risk R-003](risk-register.md#r-003-multi-part-ensemble-editing-is-not-complete) |

## Windows Dev Server Advisory Is Unverified

| 항목 | 내용 |
| --- | --- |
| 유형 | 보안/개발 환경 미확인 |
| 연결 이슈 | #8 |
| 제한 | esbuild/Vite low severity advisory의 Windows dev server 영향이 실제 Windows에서 확인되지 않았다. |
| 사용자 영향 | production app build보다는 Windows 개발자 환경 안내에 영향이 있다. |
| 현재 가능 | macOS 기준 `npm audit --audit-level=moderate`는 통과한다. |
| 문서 근거 | [Windows Dev Audit](../security/windows-dev-audit.md), [Risk R-004](risk-register.md#r-004-windows-dev-server-advisory-remains-unverified) |

## Advanced Notation Exclusions

| 항목 | 내용 |
| --- | --- |
| 유형 | 의도적 미지원/후속 확장 |
| 연결 이슈 | #321에서 사용자-facing 상태 문서와 feature map 동기화 |
| 제한 | 최근 notation extension은 지원되지만, 일부 고급 해석은 현재 안정 지원 범위 밖이다. |
| 사용자 영향 | 고급 사보 파일을 가져오거나 재생할 때 일부 표시는 보존되더라도 전문 engraving/playback까지 완전하다고 보장하지 않는다. |
| 현재 제외 | repeat first/second endings, text-only tempo curve playback, octave-shift playback pitch transposition, actual repeated oscillator tremolo playback, two-note tremolo, mid-measure clef changes. |
| 현재 가능 | repeat barline/count 입력, positioned tempo event BPM 입력/삭제와 playback 반영, octave-shift 표시/MusicXML 보존, single-note tremolo slash 입력/표시/MusicXML 보존. |
| 문서 근거 | [Traceability Matrix](traceability-matrix.md#notation-editor), [Notation Extension Roadmap](../architecture/notation-extension-roadmap.md) |

## Production Deployment Smoke Is Separate

| 항목 | 내용 |
| --- | --- |
| 유형 | 운영 검증 미실행 |
| 연결 이슈 | 필요 시 후속 이슈 |
| 제한 | 이 package는 production URL, DNS, hosting 전환, GitHub Pages 비활성화 등을 수행하지 않는다. |
| 사용자 영향 | 실제 production release 전에는 별도 smoke evidence가 필요하다. |
| 문서 근거 | [Release Readiness Checklist](release-readiness-checklist.md#deployment-and-rollback), [Production Playbook](../operations/production-playbook.md) |

## Manual QA Is Still Required For Release Candidates

| 항목 | 내용 |
| --- | --- |
| 유형 | 수동 확인 |
| 연결 이슈 | 필요 시 QA 기록 이슈 |
| 제한 | 자동 E2E는 핵심 흐름을 검증하지만, 패키징된 앱에서 사람이 작은 악보를 완성하는 수동 QA를 대체하지 않는다. |
| 사용자 영향 | release candidate 전 UX/문구/파일 저장 흐름 확인이 필요하다. |
| 문서 근거 | [Manual Score Completion QA](../releases/manual-score-completion-qa.md) |
