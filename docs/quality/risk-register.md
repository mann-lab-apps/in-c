# Risk Register

기준일: 2026-07-15

## Document Control

| 항목 | 값 |
| --- | --- |
| 제품 상태 기준 commit | `f526ad7 Complete notation editing issue set` |
| initial evidence package commit | `7364290 Add quality evidence package` |
| quality follow-up 기준 commit | `6fb9698 Refine quality evidence follow-up` |
| documentation record commit | `25db95f Record quality follow-up commit` |
| 기준 branch | `main` |

## Scoring

| 값 | 영향도 | 가능성 |
| --- | --- | --- |
| High | 출시, 데이터, 보안, 핵심 사용자 흐름을 막을 수 있음 | 자주 발생하거나 현재 미검증 |
| Medium | 특정 표면 또는 고급 기능에 영향 | 조건부 발생 |
| Low | 운영 문서, 개발 환경, 제한된 workflow에 영향 | 드묾 또는 우회 가능 |

## R-001 Supabase Backend Is Not Operational

| 항목 | 내용 |
| --- | --- |
| 연결 이슈 | #316 |
| 영향도 | High |
| 가능성 | High |
| 상태 | Open |
| 설명 | Supabase project 생성, schema 적용, env 등록, RLS/auth 확인이 외부 운영 변경으로 남아 있다. |
| 현재 완화책 | backend 포함 기능을 출시 범위에서 제외하고 [Supabase Backend Plan](../product/supabase-backend-plan.md)을 설계 근거로 유지한다. |
| 출시 영향 | backend/auth/community data flow를 포함한 릴리즈는 보류한다. |
| 다음 행동 | 사용자 승인 후 Supabase project/schema/env/RLS를 실제 환경에서 검증한다. |

## R-002 Multi-Voice Editing Is Not Complete

| 항목 | 내용 |
| --- | --- |
| 연결 이슈 | #93 |
| 영향도 | Medium |
| 가능성 | Medium |
| 상태 | Open |
| 설명 | 같은 staff 내 여러 voice 모델/playback 일부는 있으나, voice switching, collision layout, MusicXML backup/forward 완성 UX가 남아 있다. |
| 현재 완화책 | 단성부 및 chord-note workflow를 지원 범위로 명시하고 multi-voice를 known limitation으로 둔다. |
| 출시 영향 | 합창/피아노 복합 성부 사용자는 제한을 받는다. |
| 다음 행동 | #93에서 voice editing UX와 MusicXML backup/forward를 마무리한다. |

## R-003 Multi-Part Ensemble Editing Is Not Complete

| 항목 | 내용 |
| --- | --- |
| 연결 이슈 | #94 |
| 영향도 | Medium |
| 가능성 | Medium |
| 상태 | Open |
| 설명 | multi-part playback addressing은 있으나, 여러 악기 파트 생성/삭제/이름 변경, 독립 staff 렌더링, MusicXML multi-part 완성 workflow가 남아 있다. |
| 현재 완화책 | 단일 part score를 지원 범위로 명시하고 ensemble score authoring을 known limitation으로 둔다. |
| 출시 영향 | 합주보/앙상블 사보 목적의 사용자에게 제한이 있다. |
| 다음 행동 | #94에서 part management command와 renderer/MusicXML fixture를 완성한다. |

## R-004 Windows Dev Server Advisory Remains Unverified

| 항목 | 내용 |
| --- | --- |
| 연결 이슈 | #8 |
| 영향도 | Medium |
| 가능성 | Medium |
| 상태 | Open |
| 설명 | `npm audit --audit-level=moderate`는 통과하지만 esbuild/Vite low severity Windows dev-server advisory가 남아 있고 실제 Windows 환경 확인이 필요하다. |
| 현재 완화책 | macOS build/test/package 흐름에서는 차단하지 않으며 [Windows Dev Audit](../security/windows-dev-audit.md)에 현재 상태를 문서화한다. |
| 출시 영향 | Windows 개발자 onboarding 또는 dev server 사용 안내에 주의가 필요하다. |
| 다음 행동 | Windows에서 `npm run dev`, `npm run build`, `npm audit --audit-level=moderate`를 확인한다. |

## R-005 Production Deployment Smoke Not Run In This Package

| 항목 | 내용 |
| --- | --- |
| 연결 이슈 | 후속 이슈 필요 시 생성 |
| 영향도 | Medium |
| 가능성 | Medium |
| 상태 | Watch |
| 설명 | 이번 evidence package는 production URL 전환이나 DNS/hosting 변경을 수행하지 않았다. `npm run verify:site-production`도 실행하지 않았다. |
| 현재 완화책 | production 배포 전 [Release Readiness Checklist](release-readiness-checklist.md#deployment-and-rollback)를 따른다. |
| 출시 영향 | 실제 production release 전에는 별도 smoke evidence가 필요하다. |
| 다음 행동 | 배포 승인 후 production URL 기준 smoke test를 실행하고 evidence-log에 추가한다. |

## R-006 Manual Score Completion QA Not Run In This Package

| 항목 | 내용 |
| --- | --- |
| 연결 이슈 | 후속 QA issue 필요 시 생성 |
| 영향도 | Medium |
| 가능성 | Medium |
| 상태 | Watch |
| 설명 | 자동 E2E와 visual regression은 통과했지만, 패키징된 앱으로 사람이 작은 악보를 완성하는 수동 QA는 이번 package에서 실행하지 않았다. |
| 현재 완화책 | [Manual Score Completion QA](../releases/manual-score-completion-qa.md)를 release candidate 직전에 실행한다. |
| 출시 영향 | RC 전 수동 확인이 없으면 UX regression을 놓칠 수 있다. |
| 다음 행동 | release candidate마다 manual QA 기록용 이슈 또는 체크리스트를 만든다. |

## R-007 Product Status Docs May Lag Behind Quality Traceability

| 항목 | 내용 |
| --- | --- |
| 연결 이슈 | #321 |
| 영향도 | Low |
| 가능성 | Medium |
| 상태 | Watch |
| 설명 | `docs/product/system-status-panel.md`와 `docs/product/feature-map-data.js` 같은 제품 상태 문서가 quality traceability보다 뒤처질 수 있다. |
| 현재 완화책 | current state와 known limitations에서는 #321을 후속 이슈로 연결하고, 릴리즈 판단 시 quality 문서를 우선 근거로 사용한다. |
| 출시 영향 | 사용자-facing release notes 또는 status panel이 실제 지원 범위와 다르게 보일 수 있다. |
| 다음 행동 | #321에서 제품 상태 문서와 feature map을 최신 notation 지원 범위와 동기화한다. |

## R-008 CI Coverage Differs From Quality Evidence Run

| 항목 | 내용 |
| --- | --- |
| 연결 이슈 | #322 |
| 영향도 | Low |
| 가능성 | Medium |
| 상태 | Watch |
| 설명 | GitHub Actions CI가 보장하는 명령과 local quality evidence run에 포함된 명령의 범위가 다르다. |
| 현재 완화책 | [Verification Matrix](verification-matrix.md)에 CI, local evidence, manual, external coverage를 구분한다. |
| 출시 영향 | GitHub Actions 녹색 체크만으로 evidence package 전체 통과를 의미한다고 오해할 수 있다. |
| 다음 행동 | #322에서 CI에 올릴 항목과 local/manual로 유지할 항목을 정리한다. |
