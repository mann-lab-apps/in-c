# 정적 콘텐츠 데이터 운영 규칙

이 문서는 Supabase 연동 전 공개 사이트 콘텐츠를 어디에서 고치고 어떤 순서로
검증할지 정한다. 현재 기준 데이터(source of truth)는 아래 세 파일이다. 생성된
`out/site/` 파일이나 화면의 HTML을 먼저 고치지 않는다.

## 파일별 책임

| 파일 | 책임 | 주요 연결 값 |
| --- | --- | --- |
| `site/product-data.js` | Works, Creators, Concerts, Classes의 설명과 관계 | `work:*`, `creator:*`, `concert:*`, `class:*` 형식의 `id`, 각 항목의 `slug` |
| `site/compositions-catalog.json` | 공개 악보의 상태, 출처, 저작권 설명, MusicXML 경로 | `slug`, `workId`, `relatedColumns` |
| `site/columns-data.js` | Columns 분류, 공개 상태, 본문과 관련 콘텐츠 | `columnMap[].columns`, `columns[].slug`, `relatedCompositions[].slug` |

MusicXML 원본은 `site/compositions/<slug>.musicxml`, 공개 Columns HTML은
`site/columns/<slug>.html`에 둔다. 데이터와 화면의 연결 방식은
[`docs/site.md`](../site.md)를 함께 본다.

## ID와 slug 규칙

- `id`는 `<종류>:<slug>` 형식을 쓴다. 종류는 `work`, `creator`, `concert`,
  `class` 중 하나다.
- `slug`는 영문 소문자, 숫자, 하이픈만 사용한다. 공개된 URL에 쓰이므로 이름을
  다듬는 목적으로 기존 값을 바꾸지 않는다.
- 새 값을 추가하기 전에 세 기준 파일에서 같은 `id`와 `slug`가 없는지 검색한다.
- 다른 파일이 참조하는 값은 대상의 `id` 또는 `slug`와 글자까지 같아야 한다.
  예를 들어 악보의 `workId`는 `product-data.js`의 work `id`를, Columns 연결은
  `columns-data.js`의 `slug`를 사용한다.
- 양쪽에서 관계를 적는 구조라면 두 방향을 함께 갱신한다. 예를 들어 work의
  `scores`와 composition의 `workId`, work의 `columns`와 column의 관련 항목이
  서로 어긋나지 않게 확인한다.

## 새 콘텐츠 추가 순서

### 작품과 악보

1. 저작권과 출처를 확인하고 `site/product-data.js`의 `works`에 작품을 추가한다.
2. `site/compositions/<slug>.musicxml`을 추가한다.
3. `site/compositions-catalog.json`에 같은 `slug`, 작품의 `workId`, MusicXML
   경로와 관련 Columns를 기록한다.
4. `product-data.js`의 `scores`, `columns`, Creators·Concerts 관계를 연결한다.
5. 아래 공통 검증을 실행한다.

### Columns

1. `site/columns-data.js`의 `columns`에 고유한 `slug`와 공개 상태를 기록한다.
2. 해당 `slug`를 `columnMap`의 알맞은 분류에 연결한다.
3. 공개할 글은 `site/columns/<slug>.html`을 추가하고, 관련 작품과 악보의 slug를
   실제 데이터에 맞춰 연결한다.
4. 작품에서도 Columns 관계를 표시한다면 `site/product-data.js`의 `columns`를
   함께 갱신한다.
5. 아래 공통 검증을 실행한다.

### Creator, Concert, Class

1. `site/product-data.js`의 해당 배열에 고유한 `id`와 `slug`를 추가한다.
2. 연결된 Works와 Creators 등의 관계를 양쪽에서 확인한다.
3. 후보·프리뷰·정보형 상태를 실제 운영 상태보다 강하게 표현하지 않는다.
4. 아래 공통 검증을 실행한다.

## 공통 검증

저장소 루트에서 다음 순서로 실행한다.

```bash
npm run site:build
npm run verify:site-content
npm run verify:site-seo
git diff --check
```

`verify:site-content`는 기준 파일 사이의 주요 관계와 MusicXML 파일 존재 여부를
확인한다. `verify:site-seo`는 검색·공유용 메타데이터와 사이트맵을 확인한다.
실패하면 생성 결과를 직접 고치지 말고 세 기준 파일과 원본 asset의 누락 또는
잘못된 참조를 먼저 수정한다.

## 변경 기록과 전환 경계

- PR에는 추가·변경한 콘텐츠, 출처 확인 결과, 실행한 검증과 결과를 짧게 남긴다.
- 정적 파일은 Supabase 전환 전까지 기준이다. 두 저장소를 동시에 기준으로 두지
  않는다.
- Supabase 스키마, 동기화, seed, 운영 전환은 이 문서의 범위가 아니며
  [#316](https://github.com/mann-lab-apps/in-c/issues/316)에서 별도로 결정한다.
- 전환할 때는 새 저장소의 책임자, 이관 기준 시점, 검증 방법을 먼저 합의한 뒤 이
  문서와 [`docs/site.md`](../site.md)의 기준 파일 설명을 함께 갱신한다.
