# 사이트 제품 언어 일관성 감사

작성일: 2026-07-16

## 감사 목적

공개 사이트가 Chromatics를 별도 제품 브랜드처럼 키우지 않고, in C 안의 악보
창작/편집 표면으로 설명하는지 점검한다.

## 기준

- in C는 클래식 읽기, 작품 탐색, 공연 배너/Community 맥락, 악보 창작을 연결하는
  상위 브랜드로 설명한다.
- Chromatics는 MusicXML과 단선율 사보를 담당하는 악보 창작/편집 표면으로 설명한다.
- 표면이 달라도 `열기`, `MusicXML 다운로드`, `PDF 변환` 같은 행동 이름은
  표면마다 다르게 쓰지 않는다.
- 신청, 결제, 예약, 운영 중인 공연 서비스처럼 보이는 표현은 실제 기능 전에는 쓰지 않는다.
- 후보 데이터, 프리뷰, 정보형 표면은 사용자에게 상태가 드러나야 한다.
- 한국어 UI 문구는 [`korean-product-language.md`](korean-product-language.md)를 따른다.

## 표면별 점검표

| 표면 | 점검 질문 | 상태 |
| --- | --- | --- |
| 홈 | 첫 화면이 Chromatics 단독 다운로드 페이지처럼 보이지 않는가 | 점검 필요 |
| 다운로드 | 서명, release, GitHub 우회 상태가 과장 없이 설명되는가 | 점검 필요 |
| Columns | 다음 행동이 작품/악보/공연 질문으로 이어지는가 | 점검 필요 |
| Compositions | PDF보다 MusicXML/Chromatics 열기 흐름이 우선인가 | 점검 필요 |
| Compositions | 작품 정보와 악보 상세가 한 화면 안에서 자연스럽게 이어지는가 | 점검 필요 |
| 공연 배너 | 실제 예매/예약 또는 운영 중인 광고 결제 기능으로 오해하지 않는가 | 점검 필요 |
| Community | 클래스/학습 후보가 신청·결제 기능으로 오해되지 않는가 | 점검 필요 |
| Footer | in C 설명이 Chromatics만이 아니라 읽기와 창작 전체를 가리키는가 | 점검 필요 |

## 권장 표현

| 상황 | 권장 | 피할 표현 |
| --- | --- | --- |
| Chromatics 소개 | "in C의 악보 창작/편집 표면" | "in C 앱 전체" |
| 공연 배너 | "배너 후보", "등록 UI 준비 중", "정보형 preview" | "예매", "예약 가능", "결제하기" |
| Community | "학습 후보", "대화 흐름", "파일럿 검토" | "신청하기", "결제하기" |
| 후보 데이터 | "후보", "프리뷰", "준비 중" | 실제 운영 중인 서비스처럼 보이는 문구 |
| 제한사항 | "현재 지원 범위", "아직 제한됨" | "완전 지원", "호환 보장" |

## 감사 기록 양식

| 날짜 | 표면 | 발견 | 수정 파일/이슈 | 검증 |
| --- | --- | --- | --- | --- |
| 2026-07-16 | 전체 | 기준 문서 추가 | #382 | `git diff --check` |

## 연결 문서

- [`korean-product-language.md`](korean-product-language.md)
- [`../site.md`](../site.md)
- [`../product/chromatics-ecosystem-metrics.md`](../product/chromatics-ecosystem-metrics.md)
- [`../quality/known-limitations.md`](../quality/known-limitations.md)

## GitHub 이슈 연결

- #382 브랜드·제품 언어의 사이트 표면 일관성 감사
- #267 Everyone's In C 브랜드 아트 방향 정리
- #323 사용자-facing 현재 지원 범위와 제한사항 페이지 추가
