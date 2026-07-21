# Product Relationship Model

작성일: 2026-07-13

## 목적

Columns, Compositions, 공연 배너, Community, Chromatics가 기능 모음으로 흩어지지
않도록 작품 중심의 관계 모델을 정의한다. 초기에는 서버 DB가 아니라 `site/*.js`와 JSON에서
관리 가능한 정적 데이터 구조로 시작한다.

## ID 정책

| 엔티티 | ID 예시 | 원칙 |
| --- | --- | --- |
| 작품 | `work:mozart-k545-i` | 작곡가, 작품번호, 악장 또는 통용 제목을 안정적으로 조합 |
| 작곡가 | `person:wolfgang-amadeus-mozart` | Creator와 구분하되 같은 person namespace 사용 가능 |
| Creator | `creator:kim-example` | 공개 프로필 slug 기준 |
| 공연 | `concert:2026-07-suwon-recital` | 날짜와 지역/공연 slug 조합 |
| Column | `column:listen-with-one-question` | 기존 column slug 사용 |
| Class | `class:intro-listening-2026-07` | 주제와 기간 조합 |
| 악보/파일 | `score:amazing-grace-melody` | Compositions catalog slug와 연결 |

## 핵심 관계

| 관계 | 의미 | 예시 |
| --- | --- | --- |
| `work.composers[]` | 작품과 작곡가 | 작품 -> Mozart |
| `work.scores[]` | 작품과 악보/Chromatics 원본 | 작품 -> MusicXML/PDF |
| `work.columns[]` | 작품과 읽을거리/질문 | 작품 -> Columns |
| `work.concerts[]` | 작품이 포함된 공연 | 작품 -> 공연 |
| `creator.concerts[]` | Creator의 공연 | 연주자 -> 공연 |
| `creator.classes[]` | Creator의 클래스 | 강사/해설자 -> 클래스 |
| `class.works[]` | 클래스에서 다루는 작품 | 클래스 -> 작품 |

## 정적 데이터 최소 스키마

```json
{
  "works": [
    {
      "id": "work:example",
      "title": "Example Work",
      "composers": ["person:example-composer"],
      "scores": ["score:example"],
      "columns": ["column:example"],
      "concerts": ["concert:example"]
    }
  ],
  "creators": [
    {
      "id": "creator:example",
      "name": "Example Creator",
      "roles": ["performer", "teacher"],
      "concerts": ["concert:example"],
      "classes": ["class:example"]
    }
  ]
}
```

## 사용자 흐름

- 작품 페이지에서 악보, Columns, 공연 배너 후보, 관련 인물을 한 번에 본다.
- Compositions의 `Open in Chromatics`는 `score:*`를 열고 다시 작품 페이지로 돌아올 수
  있어야 한다.
- 공연 배너는 공연만 보여주지 않고 포함 작품과 관련 인물 메타데이터를 함께 연결한다.
- Community 학습 후보는 관련 인물과 작품을 연결해 감상 흐름이 Columns/공연 배너로 이어지게 한다.

## 현재 공개 범위

- Creator의 독립 공개 프로필과 비공개 연락처는 현재 공개 MVP에 포함하지 않는다.
- Community의 클래스는 학습 후보 정보이며 신청이나 결제 기능으로 표시하지 않는다.

## 적용 대상

- `site/compositions-catalog.json`
- `site/columns-data.js`
- `site/product-data.js`
- 향후 `site/creators-data.js`, `site/concerts-data.js`, `site/classes-data.js`
- `docs/product/feature-map-data.js`
- `docs/product/acceptance/*.feature`

2026-07-14 기준으로 `site/product-data.js`가 works, creators, concerts, classes의
정적 MVP source of truth를 맡는다. Supabase 전환 시에도 ID prefix와 관계 이름은 이
문서 기준을 유지한다.
