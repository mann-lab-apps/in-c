# Chromatics 무료 도구에서 in C 생태계 유입 지표

작성일: 2026-07-16

## 목적

Chromatics는 in C 안에서 MusicXML과 단선율 사보를 담당하는 무료 창작/편집 표면이다.
이 문서는 앱 내부 telemetry 없이 공개 사이트와 GitHub에서 볼 수 있는 간접
신호만으로 Chromatics가 Columns, Compositions, 공연 배너, Community로 이어지는지
확인하는 기준을 정한다.

## 간접 지표

| 질문 | 볼 수 있는 신호 | 해석 주의 |
| --- | --- | --- |
| Compositions에서 Chromatics로 이동하는가 | `open_in_chromatics`, `composition_download` | 다운로드가 많다고 앱 사용 성공은 아니다 |
| Chromatics 다운로드 뒤 다시 사이트를 탐색하는가 | 다운로드 후 동일 세션의 Columns/Compositions 이동 | GA 세션만으로 개인 행동을 단정하지 않는다 |
| 첫 악보 흐름에서 막힌 지점이 제보되는가 | `github_issue_link`, bug template | 제보가 적어도 문제가 없다는 뜻은 아니다 |
| 무료 도구가 작품 탐색으로 이어지는가 | Compositions 작품 상세/Columns 링크 클릭 | 관심 신호이지 구매 의도는 아니다 |
| 교육/파트너 대화로 이어지는가 | Community/공연 배너 클릭과 인터뷰 언급 | 계정 기능 전에는 정성 확인이 필요하다 |

## 후속 측정 필요성

| 단계 | 현재 가능 | 나중에 필요한 것 |
| --- | --- | --- |
| 공개 사이트 | GA4 공개 콘텐츠 이벤트 | 개인정보 고지 후 계정 기반 cohort 검토 |
| 데스크탑 앱 | GitHub release 다운로드 수 | 앱 내부 opt-in telemetry 여부 결정 |
| 사용성 | 관찰 테스트와 GitHub issue | 익명 crash/error report 정책 |
| 파트너 | 수동 인터뷰 | CRM 또는 intake 관리 도구 |

## 판단 기준

- Chromatics 유입 지표는 무료 도구의 가치 확인용이지 수익성 증명용이 아니다.
- 앱 내부 편집 행동을 수집하지 않는 동안에는 사용 성공을 관찰 테스트로 보완한다.
- in C 전체 설명에서는 Chromatics를 "악보 창작/편집 표면"으로 부르고, Columns와
  Compositions가 같은 첫 화면에서 보이게 유지한다.

## 연결 문서

- [`analytics-events.md`](analytics-events.md)
- [`positioning.md`](positioning.md)
- [`beta-success-metrics.md`](beta-success-metrics.md)

## GitHub 이슈 연결

- #381 Chromatics 무료 도구에서 in C 생태계 유입 지표 정의
- #330 사용자 여정별 피드백 질문과 노출 위치 확장
- #332 투자·지원·파트너용 현재 상태 one-pager 작성
