# Evidence Log

기준일: 2026-07-15

## Document Control

| 항목 | 값 |
| --- | --- |
| 제품 상태 기준 commit | `f526ad7 Complete notation editing issue set` |
| evidence package commit | `QUALITY_PACKAGE_COMMIT_PENDING` |
| 기준 branch | `main` |
| 실행 환경 | macOS local workspace, Asia/Seoul |

## GitHub State

2026-07-15 기준 `gh issue list --repo mann-lab-apps/in-c --state open --limit 100`로
확인한 열린 이슈:

| 이슈 | 제목 | 품질 문서 연결 |
| --- | --- | --- |
| #320 | 현재 상태 검사 QA 워크플로우 고도화 | 이 evidence package 작성 대상 |
| #316 | Supabase 기반 백엔드 구축 | [Risk R-001](risk-register.md#r-001-supabase-backend-is-not-operational) |
| #94 | 여러 악기 파트와 합주보 스코어 구조 지원 | [Risk R-003](risk-register.md#r-003-multi-part-ensemble-editing-is-not-complete) |
| #93 | 같은 오선 내 다중성부 입력·렌더링 모델 구현 | [Risk R-002](risk-register.md#r-002-multi-voice-editing-is-not-complete) |
| #8 | Windows 개발 환경에서 esbuild/Vite 감사 경고 확인 | [Risk R-004](risk-register.md#r-004-windows-dev-server-advisory-remains-unverified) |

## 2026-07-15 Run

| 순서 | 명령 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | `npm run typecheck` | Pass | `tsc --noEmit` 성공 |
| 2 | `npm test` | Pass | 22 files / 249 tests passed |
| 3 | `npm run test:components` | Pass | 1 file / 4 tests passed |
| 4 | `npm run verify:visual-regression` | Pass | MusicXML + system-layout tests, build, notation snapshots 포함 |
| 5 | `npm run verify:e2e` | Pass | build 후 Electron single-voice MVP verification 성공 |
| 6 | `npm audit --audit-level=moderate` | Pass with known low advisory | moderate+ 실패 없음. esbuild Windows dev-server low advisory는 #8에서 추적 |
| 7 | `git diff --check` | Pass | whitespace error 없음 |
| 8 | `npm run site:build` | Pass | Vite static site build 성공 |
| 9 | `npm run verify:site-content` | Pass | site content verification 성공 |
| 10 | `npm run verify:analytics` | Pass | analytics config/privacy/docs guard 성공 |
| 11 | `npm run verify:site-seo` | Pass | SEO metadata verification 성공 |
| 12 | `rg` quality docs path checks | Pass | 주요 상대 링크 대상 존재 확인 |

## Not Run In This Package

| 항목 | 이유 | 후속 기준 |
| --- | --- | --- |
| `npm run verify:site-production` | 실제 production URL/배포 상태 확인은 external state에 의존한다. | 배포 승인 후 실행 |
| packaged app install/open smoke | package artifact 생성과 OS별 설치 확인은 release candidate 단계의 manual QA다. | [Manual Score Completion QA](../releases/manual-score-completion-qa.md) |
| Windows dev server advisory check | 현재 실행 환경은 macOS다. | #8에서 Windows 환경 확인 |
| Supabase backend live verification | project/env/schema/RLS는 외부 운영 변경이다. | #316에서 사용자 승인 후 실행 |

## Evidence Retention Rules

- 명령 결과는 이 문서에 요약하고, 실패가 있으면 GitHub issue에 원문 로그 또는 핵심 error를 남긴다.
- release candidate마다 이 표를 복사하거나 날짜별 섹션을 추가한다.
- 외부 운영 변경이 필요한 검증은 승인 없이 Pass로 기록하지 않는다.

